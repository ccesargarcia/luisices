# Brief técnico — validação de arquivos em todos os uploads

**Destinatário:** Antigravity  
**Repositório:** `luisices`  
**Base da análise:** `develop` em `5b93903` (`fix(security): priorizar socket.remoteAddress e validar magic bytes no backend de anexos`)

## Objetivo

Aplicar validação consistente a todos os fluxos de upload do aplicativo e à leitura server-side de anexos para e-mail. O aplicativo deve validar bytes antes de gravar; o backend deve revalidar o conteúdo baixado antes de transmitir. Firebase Storage Rules controlam autenticação, caminho, tamanho e MIME, mas não conseguem inspecionar os bytes reais.

## Estado atual

- Todos os uploads do app passam por `src/services/firebaseStorageService.ts`, incluindo fotos, produtos, loja, galeria, thumbnails e anexos com progresso. Cada gravação deve passar pela validação central imediatamente antes da escrita.
- `functions/email/attachments.js`, em `prepareAttachments`, baixa o objeto de uma geração específica e valida os bytes antes de enviá-lo.
- Antes desta alteração, o detector server-side aceitava formatos com base principalmente em prefixos, e as regras permitiam qualquer `image/*` em algumas pastas.
- `functions/email/index.js` já encaminha o campo `contentType` do anexo para o provedor; a correção deve preencher esse campo a partir dos bytes detectados.
- A validação client-side melhora a segurança e a experiência no fluxo normal, mas não é uma barreira contra clientes que chamem o Firebase Storage diretamente.

## Trabalho solicitado

1. **Cobertura de uploads:** audite todos os usos do SDK de Storage e encaminhe cada gravação do app por uma única barreira de validação; preserve as rotas e metadados funcionais. Restrinja as regras a MIME raster explicitamente suportado e PDF apenas nas pastas que aceitam documentos. Remova SVG da allowlist até haver sanitização segura.
2. **Detector server-side:** mantenha uma allowlist explícita (`image/png`, `image/jpeg`, `image/gif`, `image/webp`, `application/pdf`) e faça o detector retornar o MIME identificado ou um erro tipado. Rejeite buffers curtos/truncados e assinaturas apenas parciais. Para formatos que exijam mais que uma assinatura inicial, use validação estrutural apropriada ou documente claramente o limite da checagem.
3. **Nome e MIME de saída:** associe uma extensão canônica ao MIME detectado. Preserve um nome-base seguro, mas substitua ou rejeite extensões incompatíveis. Passe ao provedor de e-mail o MIME detectado se o SDK/API instalado oferecer esse campo; confirme a forma suportada no código e tipos locais, sem presumir o formato do payload.
4. **Limites e concorrência:** preserve o limite agregado de 18 MB, máximo de 10 anexos, autorização existente por usuário/pedido e o download fixado por `generation`. A validação deve ocorrer no buffer daquela geração antes de qualquer envio.
5. **Erros:** mensagens retornadas ao usuário devem indicar formato inválido/não suportado sem expor caminhos internos, dados do bucket ou detalhes sensíveis.

## Testes e critérios de aceite

- Aceitar arquivos válidos de cada formato suportado e confirmar MIME/extensão final coerentes.
- Rejeitar executável (`MZ`), texto/HTML, buffer vazio, assinatura truncada e arquivo com assinatura parcial.
- Cobrir nome com extensão incompatível com os bytes; resultado deve normalizar ou rejeitar conforme a decisão implementada.
- Manter os testes existentes de autorização, URL/bucket, limite agregado e fixação da geração.
- Garantir que arquivo rejeitado não seja enviado ao provedor de e-mail.
- Executar os testes unitários relevantes e relatar comandos e resultados. Se houver emulador necessário, indicar claramente qualquer verificação que não pôde ser executada.

## Limites

- Todo cliente autenticado ainda pode chamar o SDK diretamente e forjar `contentType`. As regras não validam bytes. Para uma garantia server-side antes da disponibilização, a arquitetura precisaria mudar para upload em quarentena e promoção após validação; este brief não afirma que a validação do cliente impeça clientes maliciosos.
- Não declarar que checagens estruturais equivalem a decodificação completa ou provam que o arquivo é seguro. Descrever o nível real de parsing.
- Não alterar o fluxo de extração de IP.

## Arquivos principais

- `src/services/firebaseStorageService.ts`
- `storage.rules`
- `functions/email/attachments.js`
- `functions/email/index.js`
- `tests/unit/email-attachments.test.ts`
- `tests/unit/security-hardening.test.ts`
