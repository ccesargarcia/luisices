# Prompt para Antigravity — Gemini Pro 3.1
## Correções de voz e reformulação visual do módulo Alexa

Trabalhe no repositório Luisices, no módulo Alexa de criação de pedidos. Analise o estado atual e implemente as melhorias em etapas pequenas, preservando segurança, precisão, baixo custo e baixa latência.

### Sintomas relatados

1. Valores decimais falados ainda não são aceitos de forma confiável.
2. Quando a Alexa pergunta a quantidade, “30” falha, mas “30 itens” funciona.
3. A interface em telas grandes e touch, especialmente Echo Show 15, está ruim e exibe imagem quebrada. A composição visual provavelmente precisa ser refeita.
4. O commit local 91f19b9 já alterou parser decimal, amostras de quantidade e viewport APL, mas os sintomas persistem. Não repita essas alterações sem descobrir por que não resolveram.

### Objetivo

Corrigir o caminho real entre fala, intent/slots, diálogo, rascunho e confirmação. Tornar as telas APL legíveis e utilizáveis no Echo Show 15, touch e TV, com imagens confiáveis e fallback. Manter fluxo completo por voz em dispositivos sem suporte APL. Não gravar pedidos com quantidade ou valores ambíguos.

### Regras de trabalho

- Primeiro confira branch, git status, commits recentes e instruções locais, incluindo AGENTS.md. Preserve alterações existentes.
- Inspecione pelo menos functions/alexa/dialog.js, index.js, apl.js, orderService.js, alexa/skill-package/interactionModels/custom/pt-BR.json, testes em tests/unit/alexa e a origem das imagens do APL.
- Trace o fluxo de ponta a ponta antes de editar: modelo de interação → intent e slots → envelope → parsing e expectedInput → draft → confirmação → persistência.
- Separe fatos de código, testes simulados, relatos do usuário e hipóteses sobre Alexa física.
- Não faça deploy, publicação do modelo, alterações no console, secrets ou contas.
- Não registre payload completo, transcrição, nomes, dados do pedido, IDs brutos de pessoa/dispositivo/sessão ou tokens. Se instrumentar, use correlação opaca e metadados mínimos.
- Mantenha autenticação, autorização, validação e política de confirmação no backend. Nunca confie em valores enviados pela tela.
- Não adicione Gemini/IA remota ao fluxo de pedido. Prefira parsing determinístico, sem custo de inferência e latência de rede.
- Não force APL quando o dispositivo não anuncia suporte. O Echo Spot 2024 deve continuar funcional por voz.
- Evite novas dependências, download de imagem em runtime e aumento de minInstances/memória sem evidência.

### Etapa 1 — diagnosticar as falhas de voz

Antes de mexer no parser, descubra qual dado chega ao backend. Para cada cenário disponível, identifique intent, nomes dos slots, expectedInput persistido, valor normalizado, resultado da validação e revisão da Function, quando houver. Não invente exemplos reais se só existirem testes simulados.

Para “30” e “30 itens”, compare o caminho recebido. O modelo local contém amostra com o slot quantity isolado e o parser local aceita dígitos puros; isso não comprova que a Alexa física escolha a intent e preencha o slot. Se o backend recebe quantity com “30”, procure bug no diálogo. Se chega em outro slot, confira o remapeamento contextual. Se não chega slot, a falha ocorre antes do parser: ajuste modelo/reprompt e registre a limitação de validação física.

Para preços, compare “3,50”, “3.50”, “três reais e cinquenta”, “três e cinquenta” e “cinquenta centavos”. Verifique se a NLU retorna número, string diferente, slot alternativo ou nenhum slot. Verifique também a diferença entre preço unitário e preço total. Use expectedInput persistido no Firestore como autoridade e não aceite qualquer número sem contexto.

Crie uma tabela de diagnóstico com: sintoma, intent, slots sanitizados, estado esperado, parser e causa confirmada/hipótese. Só inclua observações realmente capturadas.

### Etapa 2 — corrigir decimais e quantidade

Aceite com precisão centesimal, sem arredondamento inesperado:

- 3,50; 3.50; 3,5; 3.5;
- “dez reais e cinquenta centavos”;
- “três reais e cinquenta” e “três e cinquenta”;
- “cinquenta centavos”;
- preço unitário, por exemplo “R$ 2,75 cada”;
- total, por exemplo “o pedido fica em R$ 27,50 no total”.

Use centavos inteiros para multiplicação e persistência. Valide limites e overflow. Rejeite valores negativos, mais de duas casas decimais, malformados ou acima do limite, pedindo esclarecimento sem gravar. A confirmação falada deve repetir quantidade, preço unitário se aplicável e total calculado.

Aceite “30”, “trinta”, “30 itens” e “30 unidades” quando o sistema estiver aguardando quantidade. Considere número em slot quantity, número em slot alternativo e resposta após timeout/nova sessão, sempre recuperando draft e estado autorizado. Se o diálogo espera preço, interprete número como preço somente com base nesse estado. Em caso ambíguo entre quantidade e dinheiro, pergunte.

Inclua regressões que exercitem processAlexaEnvelope e o resultado salvo no draft, não apenas funções isoladas. Cubra intent/slots observados, quantidade inválida, decimal na quantidade, slot ausente e remapeamento contextual. Não adicione exemplos redundantes ao modelo; mantenha nomes de slots/intents coerentes. Documente que o JSON local precisa ser sincronizado/publicado separadamente.

### Etapa 3 — refazer visual para Echo Show 15, touch e TV

O ajuste de viewport do commit 91f19b9 não demonstra que o design esteja bom. Reavalie os documentos APL e crie composição adequada a telas grandes, mantendo experiência própria para telas compactas.

- Use src/styles/theme.css como fonte da paleta. Centralize tokens APL e remova cores desconexas.
- Não dependa de imagem fixa de 260dp para todos os tamanhos. Use layout adaptável ao viewport.
- Em tela grande, dê prioridade a produto, cliente, quantidade, entrega e total, com ações em posição clara.
- Para touch: alvos grandes, espaçamento, contraste e estados visuais claros.
- Para Fire TV: ações navegáveis pelo controle remoto com foco visível.
- Trate nomes longos sem sobreposição e não esconda conteúdo essencial em texto pequeno.
- Confira a versão APL/runtime declarada antes de usar propriedades ou componentes.
- Trate imagem ausente, URL inválida e falha de carregamento com fallback que não dependa da mesma URL.
- Use apenas imagem HTTPS pública estável; não use host de desenvolvimento para skill de produção nem URL assinada.
- Valide tipo, tamanho e proporção. Não faça fetch de URLs arbitrárias; evite SSRF e reutilize allowlist existente.
- Não tente ativar APL no Echo Spot 2024.

Valide estrutura e viewports com testes apropriados e simulador se disponível. Registre que hardware físico não foi testado quando for o caso. Teste visual no Echo Show 15 continua necessário antes de declarar resolvido.

### Etapa 4 — segurança e custo

Preserve verificação da Alexa, autorização e confirmação atual. Garanta que eventos de toque sejam vinculados ao draft e à revisão apresentados e que a autorização seja revalidada no servidor. Conflitos entre preço unitário e total devem pedir esclarecimento. Não grave pedido com valores incompletos ou inconsistentes. Evite consultas Firestore extras por turno, chamadas externas, logs com PII e alterações de custo fixo sem medição.

### Etapa 5 — validação e entrega

Execute apenas verificações adequadas às mudanças: testes direcionados de parser e diálogo, regressões de envelope, validação JSON do modelo, sintaxe/lint/build aplicáveis e validação dos documentos APL. Informe comandos e resultados reais. Testes locais não comprovam ASR/NLU, deploy nem renderização física.

Trabalhe em quatro blocos revisáveis, sem criar commits Git:

1. Diagnóstico reproduzível e testes de regressão.
2. Correções de parsing, roteamento contextual e modelo local.
3. Origem/fallback de imagem e nova composição APL.
4. Validação final e plano de publicação/teste físico.

Em cada bloco informe arquivos alterados, causa confirmada, correção, checks executados, risco remanescente e artefato externo que precisa de atualização. Não declare resolvido o comportamento físico sem teste no aparelho.

### Resposta final esperada

Responda em português e cubra:

1. Causa confirmada de cada sintoma; marque hipóteses como hipóteses.
2. Alterações por etapa e principais arquivos.
3. Testes executados e resultados.
4. O que precisa de publicação separada: Function, modelo Alexa ou imagem/site.
5. Roteiro de teste com decimal, “30” isolado, pedido unitário com entrega, Echo Show 15 e voz no Echo Spot 2024.
6. Limitações restantes de ASR/NLU e hardware físico.

