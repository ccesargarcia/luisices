# 🎨 Design System & Visual Constitution — Luisices

Este documento consolida as diretrizes estéticas, arquitetura de componentes, tokens de design, identidade visual e regras de experiência (UX/UI) do ecossistema **Luisices (Papelaria de Afeto & Gestão de Ateliê)**.

Utilize este arquivo como contexto mestre para o **Stitch (ou outros agentes de design e frontend)** gerar componentes, telas e insights com consistência visual e acabamento refinado.

Revisão de diretrizes de UI: **11/10/2026**. Antes de alterar uma tela, consulte este guia e os componentes compartilhados em [`src/app/components/ui`](src/app/components/ui). As regras são critérios de implementação e revisão; não representam uma auditoria de conformidade de todas as telas existentes.

---

## 🏛️ 1. Filosofia de Design & Identidade da Marca

### ✨ "Papelaria de Afeto & Luxo Artesanal"
* **Conceito Visual:** Combina a delicadeza tátil do papel (camadas 3D, relevos, texturas foscas e brilho sutil de *Lamicote Dourado/Rosé*) com a modernidade fluida do **Liquid Glassmorphism** (vidro fosco com desfoque atmosférico).
* **Sensação:** Acolhedor, sofisticado, profissional, limpo e emocional.
* **Anti-Padrões (O que NUNCA fazer):**
  - ❌ Não usar estética corporativa genérica (azuis frios de banco, cinzas metálicos sem vida).
  - ❌ Não usar cantos retos duros (`rounded-none`).
  - ❌ Não usar gradientes gritantes de neon ou estilo "crypto/dashboard genérico".
  - ❌ Não sobrecarregar a interface com bordas pesadas e sombras pretas duras.

---

## 🎨 2. Paleta de Cores & Tokens Semânticos

A fonte executável dos tokens e temas é [`src/styles/theme.css`](src/styles/theme.css). Use classes semânticas como `bg-background`, `text-foreground`, `bg-primary` e `text-primary-foreground`, respeitando o tema e a personalização do usuário. Os exemplos abaixo representam a identidade padrão; não substitua temas alternativos nem copie valores hexadecimais para componentes de aplicação.

### ☀️ Modo Claro (Light Theme) — *Tons de Papel Seda, Argila e Lavanda*
| Token | Cor Hex / RGB | Uso / Significado |
| :--- | :--- | :--- |
| `--background` | `#FFF8F7` | Fundo principal (papel de algodão suave) |
| `--foreground` | `#221A1A` | Texto principal de alto contraste e legibilidade |
| `--primary` | `#613D3E` (Rosewood Escuro) | Ações principais, botões CTA, títulos de destaque |
| `--primary-foreground` | `#FFFFFF` | Texto sobre elementos primários |
| `--secondary` | `#5D5C76` (Índigo Lavanda) | Ações secundárias, abas e chips complementares |
| `--accent` | `#E2DFFF` (Lilás Suave) | Destaques, badges de IA e tags temáticas |
| `--muted` | `rgba(255, 240, 240, 0.65)` | Fundos de cards neutros e inputs |
| `--muted-foreground`| `#504444` | Subtítulos, rótulos e textos secundários |
| `--card` | `rgba(255, 255, 255, 0.55)` | Superfícies com efeito de vidro fosco (Glass) |
| `--glass-border` | `rgba(255, 255, 255, 0.45)` | Borda sutil de reflexo luminoso |
| `--destructive` | `#BA1A1A` | Ações de perigo, exclusão e alertas críticos |

### 🌙 Modo Escuro (Dark Theme) — *Aveludado Rose & Grafite Noturno*
| Token | Cor Hex / RGB | Uso / Significado |
| :--- | :--- | :--- |
| `--background` | `#161214` | Fundo grafite com leve matiz amadeirado |
| `--foreground` | `#E8E0E3` | Texto claro e suave |
| `--primary` | `#F4B7B9` (Rose Blush) | Ações principais e destaques luminosos |
| `--primary-foreground` | `#4C2527` | Texto escuro sobre botão primário claro |
| `--secondary` | `#B9B5D4` (Lavanda Suave) | Elementos secundários e ícones |
| `--card` | `rgba(31, 25, 27, 0.86)` | Cards escuros aveludados com vidro |
| `--glass-border` | `rgba(235, 205, 205, 0.18)` | Borda translúcida suave |

---

## 🪟 3. Efeito Atmosférico & Liquid Glassmorphism

### Fundo Gradiente Atmosférico
A aplicação utiliza uma iluminação difusa de 3 pontos no `body` simulando luz de estúdio artesanal:
```css
background-image: 
  radial-gradient(circle at 8% 8%, rgb(247 214 208 / 80%) 0, transparent 34%),
  radial-gradient(circle at 52% 38%, rgb(209 196 233 / 65%) 0, transparent 38%),
  radial-gradient(circle at 92% 82%, rgb(187 222 251 / 60%) 0, transparent 36%),
  linear-gradient(135deg, #fceee9 0%, #fff8f7 52%, #ede7f6 100%);
background-attachment: fixed;
```

### Classes Utilitárias Centrais
```css
/* Card de Vidro com Desfoque */
.luisices-glass {
  background: var(--card);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid var(--glass-border);
  box-shadow: 0 8px 32px rgba(230, 180, 180, 0.16), 0 2px 8px rgba(0, 0, 0, 0.04);
}

/* Inputs & Seletores Translúcidos */
.luisices-glass-input {
  background: var(--input);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
}

/* Chips & Badges */
.luisices-chip {
  background: color-mix(in srgb, var(--card) 85%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
}
```

---

## 🔤 4. Tipografia & Hierarquia

* **Família Primária (Sans-serif):** `Manrope`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
  - Alta legibilidade em telas móveis e desktop, traços limpos e modernos.
* **Família Display / Editorial (Opcional para Títulos):** `EB Garamond` ou `Manrope Bold`
  - Traz o toque nobre e editorial dos convites e papelaria fina.

### Escalas e Pesos Recomendados
- **Títulos de Seção (H1 / H2):** `text-lg` ou `text-xl`, `font-bold`, `tracking-tight`
- **Subtítulos & Seções:** `text-sm`, `font-bold`, `text-[var(--foreground)]`
- **Rótulos de Campo (Labels):** `text-xs`, `font-semibold`, `uppercase`, `tracking-wider`, `text-[var(--muted-foreground)]`
- **Textos de Apoio / Metadados:** `text-[11px]` ou `text-xs`, `text-[var(--muted-foreground)]`
- **Micro-Badges & Tags:** `text-[9px]` ou `text-[10px]`, `font-bold`

---

## 🧱 5. Anatomia de Componentes Padrão

### 1. Botão Principal (CTA)
- **Implementação:** Reutilizar [`Button`](src/app/components/ui/button.tsx) e suas variantes. A exclusão usa `variant="destructive"`; ações secundárias usam `outline` ou `ghost`. Não recriar estilos e estados de interação em cada tela.
- **Border Radius:** Seguir a variante de `Button` (`rounded-lg` no padrão, `rounded-md` em tamanhos compactos), evitando sobrescrever todos os botões de uma tela.
- **Estilo:** Fundo `var(--primary)`, texto `var(--primary-foreground)` e sombra definidos pela variante compartilhada.
- **Animação / Feedback:** Preservar os estados de hover, clique, foco, desabilitado e feedback tátil do componente compartilhado.

### 2. Cards de Produtos & Galeria
- **Aspect Ratio de Imagem:** `aspect-[4/3]` ou `aspect-square`.
- **Comportamento da Foto:** `object-cover`, cantos arredondados, leve zoom suave no hover (`group-hover:scale-105 duration-300`).
- **Overlay & Ações:** Badges no topo com backdrop-blur escuro (`bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md`).
- **Tags de Insumos:** Chips compactos com `#tag` estilizados.

### 3. Painel Lateral do Copiloto IA (Sheet)
- **Cabeçalho:** Ícone de robô/faísca com badge de status do modelo configurado, quando disponível; não fixar uma versão de modelo na diretriz visual.
- **Mensagens da IA:** Fundo de card sutil, tipografia estruturada com tópicos curtos e sem links quebrados.
- **Micro-ferramentas Interativas:** Cards embutidos no chat para criação rápida de rascunhos de pedidos, orçamentos e galeria de fotos.

### 4. Diálogos, Campos e Camadas
- Usar [`Dialog`](src/app/components/ui/dialog.tsx) com `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogBody` e `DialogFooter`. Definir a largura pela propriedade `size`; usar `noPadding` quando a composição controlar os espaçamentos.
- Em diálogos com corpo rolável, compor `DialogContent` com `flex flex-col overflow-hidden`; deixar a rolagem em `DialogBody`, preservando cabeçalho e ações. O diálogo inteiro pode rolar em composições simples, desde que não haja disputa entre duas áreas verticais para o mesmo conteúdo.
- Usar [`ResponsiveDialog`](src/app/components/ui/responsive-dialog.tsx) quando a jornada pedir drawer no celular e diálogo no desktop. A adaptação desse componente ocorre em `768px`; não impor um segundo breakpoint conflitante à composição.
- Em modais com formulários ou prévias de dados, usar fundo opaco `bg-background` e bordas `border-border`; o conteúdo da página atrás não pode prejudicar a leitura. No celular, preferir cartões com campos identificados para prévias extensas. No desktop, manter a tabela com rolagem horizontal própria quando necessário, deixando a rolagem vertical no `DialogBody`.
- Reutilizar `Input`, `Textarea`, `Select`, `Checkbox`, `DropdownMenu` e demais componentes compartilhados. Preservar rótulos, foco visível, navegação por teclado e estados de carregamento/desabilitado.
- Para camadas, usar os tokens definidos em `theme.css`, como `z-modal`, `z-popover` e `z-floating-bar`. Conferir a interação com a navegação móvel e com o botão Voltar do dispositivo.

---

## 📱 6. Regras de Responsividade & Mobile-First
1. **Áreas de Toque Mínimas:** Botões e ícones clicáveis no celular com no mínimo `44px x 44px`.
2. **Espaçamento Lateral:** `p-4` em mobile e `p-6 sm:p-7` em desktop.
3. **Barra de Ações Fixa ou Elevada:** Nunca sobrepor elementos de navegação móvel ao rodapé da tela.
4. **Rolagem Nativa:** Listas com `overflow-y-auto`, `min-h-0` em cadeias flexíveis e barra de rolagem estilizada e discreta. `scroll-behavior: smooth` não corrige travamentos de rolagem por toque ou roda do mouse.
5. **Largura do Painel:** Em layouts flex/grid, usar `min-w-0` nos itens que precisam encolher. O breakpoint da viewport não garante espaço no painel: considerar sidebar, colunas de leitura e largura do modal.
6. **Cabeçalhos e Metadados:** A identificação pode truncar para preservar ações essenciais. Assuntos e endereços longos devem quebrar com `overflow-wrap:anywhere`; a data pode ocupar outra linha quando faltar espaço.
7. **Barras de Ações:** Usar `flex-wrap` no grupo e nos controles quando necessário. Contagem de seleção e botões devem permanecer dentro do painel, inclusive ao selecionar todas as mensagens. Manter a ordem de leitura e deixar a exclusão acessível, sem depender de rolagem horizontal da página.
8. **Cabeçalho Global no Celular:** Manter logo e ações essenciais em uma única linha. Agrupar busca, copiloto e filtro de equipe em um menu de ações secundárias quando faltar espaço, respeitando permissões e personalização. Não colocar o logo sozinho em uma linha nem espalhar os controles com `justify-between`. Verificar a composição visual além da ausência de overflow.
9. **Ícones Compactos:** Ao ocultar o texto de uma ação, fornecer nome acessível (`aria-label`). Preservar o alvo de toque mínimo de 44px em mobile; um ícone visual de 16px não exige uma área clicável de 16px.

---

## 📧 7. Conteúdo HTML Externo & Fluidez da Rolagem

E-mails recebidos têm estilos e dimensões definidos pelo remetente. Esse conteúdo precisa preservar sua formatação sem participar do documento da aplicação.

- Reutilizar [`EmailHtmlViewer`](src/app/components/emails/EmailHtmlViewer.tsx) para mensagens recebidas, enviadas e prévias. Não inserir HTML de terceiros diretamente no DOM principal com `dangerouslySetInnerHTML`.
- Sanitizar o conteúdo e manter o frame isolado com sandbox sem `allow-scripts`, CSP restritiva e política de referência. O isolamento de CSS não substitui a sanitização.
- A superfície branca e a tipografia própria do conteúdo do e-mail pertencem ao documento externo; cabeçalhos, botões e metadados da aplicação continuam usando tokens do tema.
- O painel de leitura controla a rolagem vertical. O frame cresce com o conteúdo e evita uma segunda área vertical rolável; conteúdo largo deve ficar contido no visualizador, sem alargar a página ou cortar suas ações.
- Reutilizar [`observeEmailFrameSize`](src/app/utils/emailFrameSizing.ts): agrupar notificações de tamanho em `requestAnimationFrame`, medir antes de escrever e alterar a altura apenas quando mudar. Desconectar o observador e cancelar trabalho pendente ao fechar ou substituir o documento.
- Não atualizar estado React a cada medição de altura ou evento de scroll. Preservar a instância do visualizador quando o HTML não mudou e permitir novos ajustes quando imagens carregarem ou a largura do painel mudar.
- Aplicar blur e sombras com moderação em superfícies roláveis. Se houver travamentos, medir recálculos de layout e pintura no navegador antes de aumentar efeitos ou aplicar `will-change` globalmente.

---

## ✅ 8. Critérios de Revisão de UI

| Cenário | Critério de aprovação |
| :--- | :--- |
| Celular em 320px, 360px e 393px; paisagem | Cabeçalho, avatar e ações acessíveis, sem overflow horizontal da página |
| Desktop com sidebar e painel estreito | Textos e botões se adaptam à largura real do painel |
| E-mail longo, imagens tardias e CSS genérico do remetente | Tema e cabeçalho preservados; conteúdo completo; rolagem contínua após o carregamento |
| Selecionar todas no atendimento | Contagem e botão de apagar dentro da barra, sem cortar controles |
| Modal com conteúdo longo e teclado móvel | Cabeçalho e ações acessíveis; foco visível; fechamento e navegação funcionando |
| Claro, escuro e tema personalizado | Contraste legível e uso dos tokens semânticos |

Validação técnica: executar `npm run typecheck` / `npm run build` e os testes pertinentes à mudança. Para o visualizador, consultar [`email-html-isolation.test.tsx`](tests/unit/email-html-isolation.test.tsx) e [`email-frame-sizing.test.ts`](tests/unit/email-frame-sizing.test.ts).

Validação visual: testar no navegador e no dispositivo afetado, usando o mesmo e-mail antes e depois. Para investigar fluidez, comparar a rolagem sobre o HTML e sobre os metadados e inspecionar o painel Performance do navegador. Testes unitários de isolamento e dimensionamento não comprovam desempenho, ausência de overflow ou conforto de toque em um dispositivo real. Registrar separadamente **implementado**, **testado automaticamente** e **validado visualmente**; declarar a validação visual pendente quando ela não foi executada.

---

## 💡 9. Perguntas / Prompts Prontos para Enviar ao Stitch

Quando for solicitar insights e novos componentes ao Stitch, envie este documento junto com perguntas como:

1. *"Com base nas regras de design system do Luisices em `design.md`, desenhe um componente de 'Ficha de Produção para Corte na Silhouette' com visual Glassmorphism e botões para exportar SVG."*
2. *"Como podemos aprimorar a tela de Galeria e Lojinha para destacar melhor as texturas de Lamicote Dourado e fotos em alta resolução seguindo a paleta Rosewood e Lavanda?"*
3. *"Crie uma proposta de layout mobile-first para o checkout da vitrine pública respeitando a estética de papelaria de afeto e micro-interações táteis."*
4. *"Gere um componente de 'Resumo Financeiro & Precificação' com cards estatísticos translúcidos, gráficos sutis e badges de margem de lucro."*

Checagem do cabeçalho: após `npm run build`, executar `node scripts/check-header-responsiveness.mjs` com Chromium do Playwright instalado. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` aceita um executável alternativo. A checagem usa os componentes reais com dados de conta simulados e verifica altura, overflow, alvos de toque e abertura de ações secundárias, com e sem logo e com permissões reduzidas. Conferir também a composição visual; testes geométricos não comprovam qualidade visual.

Checagem da seleção de e-mails: após `npm run build`, executar `node scripts/check-email-toolbar-responsiveness.mjs` com Chromium do Playwright instalado. A checagem usa o JSX da barra real com dados simulados, testa colunas estreitas em viewport desktop e dispositivos com toque, e verifica overflow, sobreposição e acesso à confirmação de exclusão. Não executa exclusões reais.

Checagem da importação de pedidos: após `npm run build`, executar `node scripts/check-import-dialog-responsiveness.mjs` com Chromium do Playwright instalado. A checagem usa o modal real com parsing e gravação simulados, verifica nomes longos, filtros, limites do modal e acesso às ações em telas pequenas e desktop nos temas claro, escuro e Deep Ocean. Não importa pedidos reais.
