/**
 * Handlers dos Endpoints de IA com Injeção de Dependências - Luisices
 */

const { getCallerScope, validateAiAccess, validateGalleryAccess } = require('./authorization');
const { TOOLS_DECLARATIONS, COPILOT_SYSTEM_INSTRUCTION, GALLERY_VISION_PROMPT, STORE_PRODUCT_VISION_PROMPT } = require('./schemas');
const { INPUT_LIMITS, TIMEOUTS, MODEL_CONFIG, TOOL_LIMITS } = require('./config');
const { recordAiUsage, getAiUsageSummary } = require('./usage');

function cleanAiOutput(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<(thought|reasoning|think)>[\s\S]*?<\/\1>/gi, '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function settleFailedReservation(budgetManager, reservation, error, knownTokens = 0, attempts = []) {
  if (!budgetManager || !reservation) return;
  if (knownTokens > 0) {
    await budgetManager.reconcileBudget(reservation, knownTokens);
  } else if (error?.providerAttempted || attempts.length > 0) {
    // Sem metadados após uma chamada, mantém a reserva estimada como custo conservador.
    await budgetManager.reconcileBudget(reservation, reservation.reservedTokens || 0);
  } else {
    await budgetManager.releaseBudget(reservation);
  }
}

/**
 * Validação rigorosa de URL segura para prevenir SSRF (Server-Side Request Forgery)
 * Bloqueia IPv6 (incluindo ::1, fc00::, fe80::, ::ffff:), IPv4 privadas/locais/hex/octal,
 * portas não-padrão, credenciais em URL e metadados de nuvem.
 */
function isSafeImageUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;

  try {
    const parsed = new URL(urlStr.trim());
    
    // 1. Apenas protocolos HTTP e HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // 2. Não permite credenciais embutidas na URL
    if (parsed.username || parsed.password) {
      return false;
    }

    // 3. Apenas porta HTTPS padrão (URL normaliza :443 para string vazia).
    if (parsed.port) {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Somente origens usadas pelo próprio produto. Uma denylist pública falha
    // contra DNS rebinding e novas formas de IP; a allowlist reduz esse espaço.
    const allowedHosts = INPUT_LIMITS.ALLOWED_IMAGE_HOSTS || [];
    if (!allowedHosts.includes(host)) return false;

    // 4. Bloqueia qualquer literal IPv6 (ex: [::1], [fc00::1], [::ffff:127.0.0.1], [fe80::1])
    if (host.startsWith('[') || host.endsWith(']') || host.includes(':')) {
      return false;
    }

    // 5. Bloqueia hostnames locais e de metadados
    if (
      host === 'localhost' ||
      host === '0.0.0.0' ||
      host === 'metadata.google.internal' ||
      host === '169.254.169.254' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.lan') ||
      host.endsWith('.home') ||
      host.endsWith('.corp') ||
      host.endsWith('.invalid') ||
      host.endsWith('.test')
    ) {
      return false;
    }

    // 6. Detecção de literais IPv4 (decimais, octais, hexadecimais ou inteiros puros)
    // Bloqueia representações inteiras/hexadecimais/octais como 0x7f000001, 2130706433, 0177.0.0.1
    if (/^(0x[0-9a-f]+|\d+)$/i.test(host)) {
      return false;
    }

    const ipParts = host.split('.');
    if (ipParts.length === 4 && ipParts.every((p) => /^\d+$/.test(p))) {
      // Rejeita octais com zero à esquerda
      if (ipParts.some((p) => p.length > 1 && p.startsWith('0'))) {
        return false;
      }

      const p0 = parseInt(ipParts[0], 10);
      const p1 = parseInt(ipParts[1], 10);
      const p2 = parseInt(ipParts[2], 10);
      const p3 = parseInt(ipParts[3], 10);

      if (p0 > 255 || p1 > 255 || p2 > 255 || p3 > 255) return false;

      // 0.0.0.0/8 (Broadcast/This network)
      if (p0 === 0) return false;
      // 10.0.0.0/8 (Private)
      if (p0 === 10) return false;
      // 127.0.0.0/8 (Loopback)
      if (p0 === 127) return false;
      // 100.64.0.0/10 (Shared Address Space / CGNAT)
      if (p0 === 100 && p1 >= 64 && p1 <= 127) return false;
      // 169.254.0.0/16 (Link Local & Cloud Metadata)
      if (p0 === 169 && p1 === 254) return false;
      // 172.16.0.0/12 (Private: 172.16.x a 172.31.x)
      if (p0 === 172 && p1 >= 16 && p1 <= 31) return false;
      // 192.168.0.0/16 (Private)
      if (p0 === 192 && p1 === 168) return false;
      // 198.18.0.0/15 (Benchmark testing)
      if (p0 === 198 && (p1 === 18 || p1 === 19)) return false;
      // 224.0.0.0/4 (Multicast)
      if (p0 >= 224 && p0 <= 239) return false;
      // 240.0.0.0/4 (Reserved)
      if (p0 >= 240) return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Helper para download seguro de imagens com proteção SSRF, streaming com limite progressivo e timeout (R02, R06, R12, P1)
 */
async function downloadImageAsBase64(imageUrl, maxBytes = INPUT_LIMITS.MAX_IMAGE_DOWNLOAD_BYTES, timeoutMs = TIMEOUTS.IMAGE_DOWNLOAD_MS, fetchFn = globalThis.fetch) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('URL da imagem não informada.');
  }

  if (!isSafeImageUrl(imageUrl)) {
    throw new Error('URL de imagem inválida ou bloqueada por políticas de segurança (SSRF).');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetchFn(imageUrl.trim(), {
      signal: controller.signal,
      redirect: 'error',
    });

    if (!resp.ok) {
      throw new Error(`Falha ao baixar imagem (HTTP ${resp.status})`);
    }

    const rawContentLength = resp.headers.get('content-length');
    if (rawContentLength) {
      const contentLength = parseInt(rawContentLength, 10);
      if (!isNaN(contentLength) && contentLength > maxBytes) {
        throw new Error(`Imagem excede o limite máximo permitido de ${Math.round(maxBytes / (1024 * 1024))}MB.`);
      }
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const cleanMime = contentType.split(';')[0].trim().toLowerCase();

    if (!INPUT_LIMITS.ALLOWED_IMAGE_MIMES.includes(cleanMime)) {
      throw new Error(`Tipo de imagem não suportado: ${cleanMime}`);
    }

    let buffer;
    if (resp.body && typeof resp.body.getReader === 'function') {
      const reader = resp.body.getReader();
      const chunks = [];
      let totalReceived = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.length > 0) {
          totalReceived += value.length;
          if (totalReceived > maxBytes) {
            try { await reader.cancel(); } catch {}
            throw new Error(`Imagem excede o limite máximo permitido de ${Math.round(maxBytes / (1024 * 1024))}MB.`);
          }
          chunks.push(Buffer.from(value));
        }
      }
      buffer = Buffer.concat(chunks);
    } else {
      throw new Error('O servidor de imagens não forneceu um stream seguro para leitura limitada.');
    }

    if (!buffer || buffer.length === 0) {
      throw new Error('A resposta da imagem está vazia.');
    }

    return {
      base64Image: buffer.toString('base64'),
      mimeType: cleanMime,
      sizeBytes: buffer.length,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cria o handler para aiAgentChat (R01, R03, R06, R09, R10, R15)
 */
function createAiAgentChatHandler(deps = {}) {
  const {
    geminiClient,
    repositories,
    toolsExecutor,
    budgetManager,
    cache,
    db,
  } = deps;

  return async function handleAiAgentChat(request) {
    const callerUid = request?.auth?.uid;
    if (!callerUid) {
      const err = new Error('É necessário estar autenticado.');
      err.code = 'unauthenticated';
      throw err;
    }

    // 1. Autorização e Escopo
    const callerProfile = request?.authProfile || (db ? (await db.doc(`userProfiles/${callerUid}`).get().then(d => d.exists ? d.data() : null)) : null);
    const scope = getCallerScope(callerUid, callerProfile);
    validateAiAccess(scope);

    // 2. Validação da Mensagem
    const { message, history = [], image = null } = request.data || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      const err = new Error('Mensagem é obrigatória.');
      err.code = 'invalid-argument';
      throw err;
    }

    const cleanMessage = message.trim();
    if (cleanMessage.length > INPUT_LIMITS.MAX_MESSAGE_CHARS) {
      const err = new Error(`Mensagem excede o limite máximo de ${INPUT_LIMITS.MAX_MESSAGE_CHARS} caracteres.`);
      err.code = 'invalid-argument';
      throw err;
    }

    // 3. Verificação Symmetrical de Cache (R06)
    const hasHistory = Array.isArray(history) && history.length > 0;
    const hasImage = Boolean(image && image.base64);
    const cacheKey = cache ? cache.buildKey({
      userId: scope.uid,
      action: 'copilot_chat',
      prompt: cleanMessage,
      schemaVersion: 'v2',
      extraKey: `${scope.role}:${hasHistory ? 'hist' : 'nohist'}:${hasImage ? 'img' : 'noimg'}`,
    }) : null;

    if (cache && !hasImage && !hasHistory) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // 4. Reserva de Orçamento Distribuído (R10)
    let reservation = null;
    if (budgetManager) {
      reservation = await budgetManager.reserveBudget(scope.uid, 2000);
    }

    const startTime = Date.now();
    let totalTokensConsumed = 0;
    let promptTokensConsumed = 0;
    let candidatesTokensConsumed = 0;
    let reasoningTokensConsumed = 0;
    let usedModel = MODEL_CONFIG.PRIMARY_CHAT_MODEL;
    let geminiAttempts = [];

    try {
      // 5. Carrega contexto dinâmico autorizado (R05)
      const catalogContext = await repositories.getCatalogKnowledge(scope);

      // Prepara ferramentas ativas
      let activeDeclarations = TOOLS_DECLARATIONS;
      if (!scope.isAdmin) {
        activeDeclarations = activeDeclarations.filter((t) => t.name !== 'get_user_summary');
      }

      // Prepara histórico com limite total de caracteres (R15)
      const contents = [];
      let totalHistoryChars = 0;

      if (hasHistory) {
        const rawHistory = history.slice(-INPUT_LIMITS.MAX_HISTORY_MESSAGES);
        let lastRole = null;
        for (const item of rawHistory) {
          if (!item || !item.text || typeof item.text !== 'string' || !item.text.trim()) continue;
          const text = item.text.trim();
          if (totalHistoryChars + text.length > INPUT_LIMITS.MAX_HISTORY_CHARS) break;
          totalHistoryChars += text.length;

          const normalizedRole = item.role === 'user' ? 'user' : 'model';
          if (normalizedRole === lastRole) {
            if (contents.length > 0) {
              contents[contents.length - 1].parts[0].text += `\n${text}`;
            }
          } else {
            contents.push({
              role: normalizedRole,
              parts: [{ text }],
            });
            lastRole = normalizedRole;
          }
        }
        if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
          contents.pop();
        }
      }

      // Prepara partes da mensagem do usuário
      const userParts = [];
      if (hasImage) {
        let { base64, mimeType } = image;
        if (base64 && typeof base64 === 'string') {
          if (base64.includes(',')) base64 = base64.split(',')[1];
          const effectiveMime = INPUT_LIMITS.ALLOWED_IMAGE_MIMES.includes(mimeType) ? mimeType : 'image/jpeg';
          if (base64.length <= INPUT_LIMITS.MAX_IMAGE_BASE64_BYTES) {
            userParts.push({
              inlineData: {
                mimeType: effectiveMime,
                data: base64,
              },
            });
          } else {
            const err = new Error('Imagem excede o limite máximo permitido de 10MB.');
            err.code = 'invalid-argument';
            throw err;
          }
        }
      }
      userParts.push({ text: cleanMessage });
      contents.push({ role: 'user', parts: userParts });

      const geminiPayload = {
        system_instruction: { parts: [{ text: COPILOT_SYSTEM_INSTRUCTION + (catalogContext || '') }] },
        contents,
        tools: [{ function_declarations: activeDeclarations }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1536 },
      };

      // 6. Executa chamada ao Gemini
      let geminiResp = await geminiClient.generateContent(geminiPayload, {
        totalTimeoutMs: TIMEOUTS.CHAT_TOTAL_MS,
      });
      geminiAttempts = geminiResp.attempts || [];

      usedModel = geminiResp.modelUsed;
      totalTokensConsumed = geminiResp.tokens.totalTokens;
      promptTokensConsumed = geminiResp.tokens.promptTokens;
      candidatesTokensConsumed = geminiResp.tokens.candidatesTokens;
      reasoningTokensConsumed = geminiResp.tokens.reasoningTokens;

      const candidate = geminiResp.data?.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const functionCalls = parts.filter((p) => p.functionCall).map((p) => p.functionCall).slice(0, TOOL_LIMITS.MAX_TOOL_CALLS_PER_REQUEST);

      const answers = [];
      let extractedDraft = null;
      let extractedWhatsApp = null;
      let extractedPricing = null;
      let extractedGalleryItems = null;

      if (functionCalls.length > 0) {
        for (const call of functionCalls) {
          const { name, args = {} } = call;

          if (name === 'extract_order_draft') {
            extractedDraft = await toolsExecutor.executeExtractOrderDraft(args, scope);
            answers.push(`Identifiquei os dados do pedido para **${extractedDraft.customerName || 'o cliente'}**! Você pode conferir os detalhes e carregar diretamente no formulário de pedido abaixo.`);
          } else if (name === 'generate_whatsapp_message') {
            extractedWhatsApp = await toolsExecutor.executeGenerateWhatsAppMessage(args, scope);
            answers.push(`Gerei o rascunho da mensagem para **${extractedWhatsApp.recipientName || 'o cliente'}**${extractedWhatsApp.recipientPhone ? ` (${extractedWhatsApp.recipientPhone})` : ''}. Você pode revisar o texto e enviar diretamente para o WhatsApp abaixo:`);
          } else if (name === 'query_customers') {
            const result = await toolsExecutor.executeQueryCustomers(args, scope);
            const customersList = result.customers || [];
            if (customersList.length === 0) {
              answers.push(`🔍 **Nenhum cliente localizado:**\n\nNão encontrei clientes correspondentes aos critérios informados na sua base (${result.totalScoped} cadastrados).`);
            } else {
              const list = customersList.map((c) => `• **${c.name}** | 📱 ${c.phone || 'Sem fone'} | 🏙️ ${c.city || 'Não informada'}`).join('\n');
              answers.push(`👥 **Base de Clientes (${result.totalFiltered} encontrado(s)):**\n\n${list}`);
            }
          } else if (name === 'calculate_pricing_estimate') {
            extractedPricing = await toolsExecutor.executePricingEstimate(args, scope);
            const unitFmt = extractedPricing.suggestedUnitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const totalFmt = extractedPricing.suggestedTotalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            answers.push(`📊 **Estimativa de Precificação:**\n\n• **Produto:** ${extractedPricing.productName} (${extractedPricing.quantity} un)\n• **Custo Base Unitário:** R$ ${extractedPricing.unitCost.toFixed(2)}\n• **Preço Unitário Sugerido:** ${unitFmt}\n• **Valor Total Sugerido:** ${totalFmt} *(Margem: ${extractedPricing.profitMarginPercent}%*)\n\nVocê pode gerar um orçamento oficial com esses valores a qualquer momento.`);
          } else if (name === 'daily_briefing') {
            const briefing = await toolsExecutor.executeDailyBriefing(args, scope);
            let text = `📋 **Raio-X Operacional do Dia (${briefing.todayDate}):**\n\n`;
            if (briefing.delayedCount > 0) {
              text += `⚠️ **Atenção: ${briefing.delayedCount} pedido(s) atrasados!**\n`;
            } else {
              text += `✅ **Nenhum pedido em atraso no momento!**\n\n`;
            }
            text += `📦 **Entregas Hoje:** ${briefing.todayDeliveriesCount}\n🔄 **Em Produção:** ${briefing.inProgressCount}\n💰 **Pendente a Receber:** R$ ${briefing.pendingPaymentTotal.toFixed(2)}`;
            answers.push(text);
          } else if (name === 'get_financial_summary') {
            const fin = await toolsExecutor.executeFinancialSummary(args, scope);
            if (fin.collaboratorNotFound) {
              answers.push(`🔍 **Colaborador não localizado:**\n\nNão encontrei registros para "${args.userIdentifier}".`);
            } else {
              const fatFmt = Number(fin.faturamentoRealizado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              const recFmt = Number(fin.totalRecebido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              const penFmt = Number(fin.totalPendenteReceber || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              answers.push(`💰 **Resumo Financeiro (${fin.period}):**\n\n• **Faturamento Realizado:** ${fatFmt} (${fin.pedidosConcluidos} concluídos)\n• **Total Recebido:** ${recFmt}\n• **Pendente:** ${penFmt}\n• **Ticket Médio:** R$ ${fin.ticketMedio.toFixed(2)}`);
            }
          } else if (name === 'query_orders_view') {
            const result = await toolsExecutor.executeQueryOrdersView(args, scope);
            const orders = result.orders || [];
            if (orders.length === 0) {
              answers.push('🔍 Não encontrei nenhum pedido correspondente na base de dados.');
            } else {
              const list = orders.map((o) => `• **${o.orderNumber}** — ${o.customerName} (${o.productName || o.productSummary}) | R$ ${o.totalPrice.toFixed(2)} | Status: ${o.status}`).join('\n');
              answers.push(`📦 **Encontrei ${orders.length} pedido(s):**\n\n${list}${result.hasMore ? `\n\n*(Exibindo ${orders.length} de ${result.totalFound} pedidos)*` : ''}`);
            }
          } else if (name === 'search_gallery_portfolio') {
            const galleryResult = await toolsExecutor.executeSearchGalleryPortfolio(args, scope);
            const items = Array.isArray(galleryResult) ? galleryResult : (galleryResult.items || []);
            extractedGalleryItems = items;
            if (items.length === 0) {
              answers.push('🔍 Não encontrei nenhuma arte correspondente na galeria.');
            } else {
              answers.push(`🎨 Encontrei **${galleryResult.totalFound ?? items.length} modelo(s)** no acervo da galeria${galleryResult.hasMore ? ` (exibindo ${items.length}; há mais resultados)` : ''}:`);
            }
          } else if (name === 'get_user_summary') {
            const summary = await toolsExecutor.executeUserSummary(args, scope);
            if (!summary.authorized) {
              answers.push('🔒 **Acesso Restrito:** Apenas administradores podem consultar relatórios de outros membros.');
            } else if (!summary.found) {
              answers.push(`🔍 Colaborador "${args.userIdentifier}" não localizado.`);
            } else {
              answers.push(`👤 **Auditoria do Colaborador:** **${summary.user.name}**\n• Pedidos: ${summary.metrics.totalOrders}\n• Faturamento: R$ ${summary.metrics.realizedRevenue.toFixed(2)}`);
            }
          }
        }

        // Em consultas que exigem mais de uma ferramenta, permita uma rodada
        // curta de síntese. Consultas simples continuam sem a chamada extra,
        // reduzindo latência e custo. O resultado determinístico acima segue
        // como fallback caso a síntese falhe.
        if (functionCalls.length > 1 && TOOL_LIMITS.MAX_MODEL_ROUNDS > 1 && answers.length > 1) {
          const remainingMs = TIMEOUTS.CHAT_TOTAL_MS - (Date.now() - startTime);
          if (remainingMs > 1000) {
            let synthesisContextChars = 8000;
            const functionResponseParts = functionCalls.slice(0, answers.length).map((call, index) => {
              const result = answers[index].slice(0, synthesisContextChars);
              synthesisContextChars -= result.length;
              return {
              functionResponse: {
                name: call.name,
                response: { result },
              },
              };
            });
            const synthesisPayload = {
              system_instruction: {
                parts: [{
                  text: `${COPILOT_SYSTEM_INSTRUCTION}\n\nVocê está na rodada final de síntese. Use somente os resultados das ferramentas fornecidos nesta conversa. Preserve nomes, datas e valores exatamente; não recalcule nem invente dados. Responda diretamente ao pedido e destaque divergências ou limitações.`,
                }],
              },
              contents: [
                ...contents,
                { ...candidate.content, role: 'model' },
                { role: 'user', parts: functionResponseParts },
              ],
              generationConfig: { temperature: 0.1, maxOutputTokens: 768 },
            };

            try {
              const synthesisResp = await geminiClient.generateContent(synthesisPayload, {
                totalTimeoutMs: remainingMs,
              });
              totalTokensConsumed += synthesisResp.tokens.totalTokens;
              promptTokensConsumed += synthesisResp.tokens.promptTokens;
              candidatesTokensConsumed += synthesisResp.tokens.candidatesTokens;
              reasoningTokensConsumed += synthesisResp.tokens.reasoningTokens;
              geminiAttempts = [...geminiAttempts, ...(synthesisResp.attempts || [])];
              usedModel = synthesisResp.modelUsed || usedModel;
              const synthesisParts = synthesisResp.data?.candidates?.[0]?.content?.parts || [];
              const synthesizedAnswer = cleanAiOutput(synthesisParts.map((part) => part.text).filter(Boolean).join('\n'));
              if (synthesizedAnswer) answers.splice(0, answers.length, synthesizedAnswer);
            } catch (synthesisError) {
              // A síntese é uma melhoria opcional; preserve os resultados reais
              // das ferramentas e registre a tentativa para orçamento/telemetria.
              geminiAttempts = [...geminiAttempts, ...(synthesisError.attempts || [])];
            }
          }
        }
      } else {
        answers.push(cleanAiOutput(parts.map((p) => p.text).filter(Boolean).join('\n')) || 'Como posso ajudar você hoje?');
      }

      const finalAnswer = answers.join('\n\n');

      const responsePayload = {
        success: true,
        reply: finalAnswer,
        orderDraft: extractedDraft,
        whatsappDraft: extractedWhatsApp,
        pricingEstimate: extractedPricing,
        galleryItems: extractedGalleryItems,
      };

      const executedAnyTool = functionCalls && functionCalls.length > 0;
      const hasDynamicData = Boolean(executedAnyTool || extractedDraft || extractedWhatsApp || extractedPricing || (extractedGalleryItems && extractedGalleryItems.length > 0));

      // 7. Salva no cache APENAS respostas puramente estáticas e informativas (sem tools/dados mutáveis)
      if (cache && cacheKey && !hasHistory && !hasImage && !hasDynamicData) {
        cache.set(cacheKey, responsePayload);
      }

      // 8. Reconcilia orçamento e registra telemetria (R01 & R10)
      if (budgetManager && reservation) {
        await budgetManager.reconcileBudget(reservation, totalTokensConsumed);
      }

      if (db) {
        await recordAiUsage(db, {
          userId: scope.uid,
          action: 'copilot_chat',
          requestedModel: MODEL_CONFIG.PRIMARY_CHAT_MODEL,
          usedModel,
          promptTokens: promptTokensConsumed,
          candidatesTokens: candidatesTokensConsumed,
          reasoningTokens: reasoningTokensConsumed,
          totalTokens: totalTokensConsumed,
          attempts: geminiAttempts,
          durationMs: Date.now() - startTime,
          status: 'success',
        });
      }

      return responsePayload;
    } catch (error) {
      geminiAttempts = error.attempts || geminiAttempts;
      await settleFailedReservation(budgetManager, reservation, error, totalTokensConsumed, geminiAttempts);
      if (db) {
        await recordAiUsage(db, {
          userId: scope.uid,
          action: 'copilot_chat',
          requestedModel: MODEL_CONFIG.PRIMARY_CHAT_MODEL,
          usedModel,
          reasoningTokens: geminiAttempts.reduce((sum, attempt) => sum + (attempt.reasoningTokens || 0), 0),
          totalTokens: totalTokensConsumed,
          attempts: geminiAttempts,
          durationMs: Date.now() - startTime,
          status: 'error',
          errorMessage: error.message,
        });
      }
      throw error;
    }
  };
}

/**
 * Cria o handler para getAiUsage
 */
function createGetAiUsageHandler(deps = {}) {
  const { db } = deps;

  return async function handleGetAiUsage(request) {
    const callerUid = request?.auth?.uid;
    if (!callerUid) {
      const err = new Error('Usuário não autenticado.');
      err.code = 'unauthenticated';
      throw err;
    }

    const callerProfile = request?.authProfile || (db ? (await db.doc(`userProfiles/${callerUid}`).get().then(d => d.exists ? d.data() : null)) : null);
    const scope = getCallerScope(callerUid, callerProfile);
    if (!scope.isAdmin) {
      const err = new Error('Acesso restrito a administradores.');
      err.code = 'permission-denied';
      throw err;
    }

    return getAiUsageSummary(db);
  };
}

/**
 * Cria o handler para enrichGalleryItemWithAi (R02 & R10)
 */
function createEnrichGalleryItemHandler(deps = {}) {
  const { geminiClient, db, budgetManager } = deps;

  return async function handleEnrichGalleryItemWithAi(request) {
    const callerUid = request?.auth?.uid;
    if (!callerUid) {
      const err = new Error('É necessário estar autenticado.');
      err.code = 'unauthenticated';
      throw err;
    }

    const callerProfile = request?.authProfile || (db ? (await db.doc(`userProfiles/${callerUid}`).get().then(d => d.exists ? d.data() : null)) : null);
    const scope = getCallerScope(callerUid, callerProfile);

    const { itemId } = request.data || {};
    if (!itemId || typeof itemId !== 'string') {
      const err = new Error('ID da arte é obrigatório.');
      err.code = 'invalid-argument';
      throw err;
    }

    if (!db) {
      const err = new Error('Banco de dados não disponível.');
      err.code = 'internal';
      throw err;
    }

    const itemRef = db.doc(`gallery/${itemId}`);
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      const err = new Error('Item da galeria não encontrado.');
      err.code = 'not-found';
      throw err;
    }

    const itemData = itemSnap.data();
    validateGalleryAccess(scope, itemData);

    if (!itemData.imageUrl) {
      const err = new Error('O item não possui imagem para análise.');
      err.code = 'invalid-argument';
      throw err;
    }

    // 1. Reserva de Orçamento (R10)
    let reservation = null;
    if (budgetManager) {
      reservation = await budgetManager.reserveBudget(scope.uid, 2000);
    }

    const startTime = Date.now();
    let totalTokens = 0;
    let usedModel = MODEL_CONFIG.PRIMARY_VISION_MODEL;
    let geminiAttempts = [];

    try {
      // 2. Download e Validação Real da Imagem (R02)
      const { base64Image, mimeType } = await downloadImageAsBase64(itemData.imageUrl);

      const payload = {
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            { text: `${GALLERY_VISION_PROMPT}\nTítulo informado: "${itemData.title || ''}"\nDescrição atual: "${itemData.description || ''}"` },
          ],
        }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      };

      const resp = await geminiClient.generateContent(payload, { totalTimeoutMs: TIMEOUTS.VISION_TOTAL_MS });
      geminiAttempts = resp.attempts || [];
      usedModel = resp.modelUsed;
      totalTokens = resp.tokens.totalTokens;

      const rawText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!rawText.trim()) {
        throw new Error('A API Gemini não retornou conteúdo para a análise da imagem.');
      }

      let parsed;
      try {
        parsed = JSON.parse(cleanAiOutput(rawText));
      } catch (jsonErr) {
        throw new Error(`Falha ao decodificar JSON da visão computacional: ${jsonErr.message}`);
      }

      const updates = {
        aiDescription: parsed.aiDescription || '',
        aiTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
        productType: parsed.productType || '',
        colors: Array.isArray(parsed.colors) ? parsed.colors : [],
        aiAnalyzedAt: new Date().toISOString(),
      };

      await itemRef.update(updates);

      // Reconciliação e Telemetria (R10)
      if (budgetManager && reservation) {
        await budgetManager.reconcileBudget(reservation, totalTokens);
      }

      await recordAiUsage(db, {
        userId: scope.uid,
        action: 'gallery_vision_enrichment',
        requestedModel: MODEL_CONFIG.PRIMARY_VISION_MODEL,
        usedModel,
        promptTokens: resp.tokens.promptTokens,
        candidatesTokens: resp.tokens.candidatesTokens,
        reasoningTokens: resp.tokens.reasoningTokens,
        totalTokens,
        attempts: geminiAttempts,
        durationMs: Date.now() - startTime,
        status: 'success',
        itemId,
      });

      return {
        success: true,
        itemId,
        ...updates,
        titleSuggested: parsed.titleSuggested || itemData.title,
      };
    } catch (error) {
      geminiAttempts = error.attempts || geminiAttempts;
      await settleFailedReservation(budgetManager, reservation, error, totalTokens, geminiAttempts);
      await recordAiUsage(db, {
        userId: scope.uid,
        action: 'gallery_vision_enrichment',
        requestedModel: MODEL_CONFIG.PRIMARY_VISION_MODEL,
        usedModel,
        reasoningTokens: geminiAttempts.reduce((sum, attempt) => sum + (attempt.reasoningTokens || 0), 0),
        totalTokens,
        attempts: geminiAttempts,
        durationMs: Date.now() - startTime,
        status: 'error',
        errorMessage: error.message,
        itemId,
      });
      throw error;
    }
  };
}

/**
 * Cria o handler para enrichStoreProductWithAi (R10 & R12)
 */
function createEnrichStoreProductHandler(deps = {}) {
  const { geminiClient, db, budgetManager } = deps;

  return async function handleEnrichStoreProductWithAi(request) {
    const callerUid = request?.auth?.uid;
    if (!callerUid) {
      const err = new Error('É necessário estar autenticado.');
      err.code = 'unauthenticated';
      throw err;
    }

    const callerProfile = request?.authProfile || (db ? (await db.doc(`userProfiles/${callerUid}`).get().then(d => d.exists ? d.data() : null)) : null);
    const scope = getCallerScope(callerUid, callerProfile);
    validateAiAccess(scope);

    const { imageBase64, imageUrl, mimeType = 'image/jpeg', currentName, currentCategory, currentDescription } = request.data || {};

    let effectiveBase64 = '';
    let effectiveMime = mimeType;

    // 1. Suporte a URL e base64 com detecção de MIME real (R12)
    if (imageBase64 && typeof imageBase64 === 'string') {
      let raw = imageBase64;
      if (raw.includes(',')) {
        const header = raw.split(',')[0];
        if (header.includes('image/webp')) effectiveMime = 'image/webp';
        else if (header.includes('image/png')) effectiveMime = 'image/png';
        raw = raw.split(',')[1];
      }
      effectiveBase64 = raw;
    } else if (imageUrl) {
      const downloaded = await downloadImageAsBase64(imageUrl);
      effectiveBase64 = downloaded.base64Image;
      effectiveMime = downloaded.mimeType;
    } else {
      const err = new Error('Imagem (base64 ou URL) é obrigatória para análise de produto.');
      err.code = 'invalid-argument';
      throw err;
    }

    // 2. Reserva de Orçamento (R10)
    let reservation = null;
    if (budgetManager) {
      reservation = await budgetManager.reserveBudget(scope.uid, 2000);
    }

    const startTime = Date.now();
    let totalTokens = 0;
    let usedModel = MODEL_CONFIG.PRIMARY_VISION_MODEL;
    let geminiAttempts = [];

    try {
      const promptText = `${STORE_PRODUCT_VISION_PROMPT}\nNome atual: "${currentName || ''}"\nCategoria atual: "${currentCategory || ''}"\nDescrição atual: "${currentDescription || ''}"`;
      const payload = {
        contents: [{
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: effectiveMime,
                data: effectiveBase64,
              },
            },
            { text: promptText },
          ],
        }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      };

      const resp = await geminiClient.generateContent(payload, { totalTimeoutMs: TIMEOUTS.VISION_TOTAL_MS });
      geminiAttempts = resp.attempts || [];
      usedModel = resp.modelUsed;
      totalTokens = resp.tokens.totalTokens;

      const rawText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!rawText.trim()) {
        throw new Error('A API Gemini não retornou conteúdo para o produto.');
      }

      let parsed;
      try {
        parsed = JSON.parse(cleanAiOutput(rawText));
      } catch (jsonErr) {
        throw new Error(`Falha ao decodificar JSON do produto: ${jsonErr.message}`);
      }

      if (budgetManager && reservation) {
        await budgetManager.reconcileBudget(reservation, totalTokens);
      }

      if (db) {
        await recordAiUsage(db, {
          userId: scope.uid,
          action: 'store_product_vision_enrichment',
          requestedModel: MODEL_CONFIG.PRIMARY_VISION_MODEL,
          usedModel,
          promptTokens: resp.tokens.promptTokens,
          candidatesTokens: resp.tokens.candidatesTokens,
          reasoningTokens: resp.tokens.reasoningTokens,
          totalTokens,
          attempts: geminiAttempts,
          durationMs: Date.now() - startTime,
          status: 'success',
        });
      }

      return {
        success: true,
        name: parsed.name || currentName || '',
        category: parsed.category || currentCategory || '',
        description: parsed.description || '',
        leadTimeDays: typeof parsed.leadTimeDays === 'number' ? parsed.leadTimeDays : 5,
        badge: parsed.badge || '',
        suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
      };
    } catch (error) {
      geminiAttempts = error.attempts || geminiAttempts;
      await settleFailedReservation(budgetManager, reservation, error, totalTokens, geminiAttempts);
      if (db) {
        await recordAiUsage(db, {
          userId: scope.uid,
          action: 'store_product_vision_enrichment',
          requestedModel: MODEL_CONFIG.PRIMARY_VISION_MODEL,
          usedModel,
          reasoningTokens: geminiAttempts.reduce((sum, attempt) => sum + (attempt.reasoningTokens || 0), 0),
          totalTokens,
          attempts: geminiAttempts,
          durationMs: Date.now() - startTime,
          status: 'error',
          errorMessage: error.message,
        });
      }
      throw error;
    }
  };
}

/**
 * Cria o handler para generateStoreCustomizationCopy (R15)
 */
function createStoreCustomizationCopyHandler(deps = {}) {
  const { geminiClient } = deps;

  return async function handleStoreCustomizationCopy(prompt) {
    const payload = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 3000, responseMimeType: 'application/json' },
    };

    const resp = await geminiClient.generateContent(payload, { totalTimeoutMs: TIMEOUTS.STORE_COPY_TOTAL_MS });
    const rawText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return cleanAiOutput(rawText);
  };
}

module.exports = {
  createAiAgentChatHandler,
  createGetAiUsageHandler,
  createEnrichGalleryItemHandler,
  createEnrichStoreProductHandler,
  createStoreCustomizationCopyHandler,
  downloadImageAsBase64,
  cleanAiOutput,
};
