# 🎨 Design System & Visual Constitution — Luisices

Este documento consolida as diretrizes estéticas, arquitetura de componentes, tokens de design, identidade visual e regras de experiência (UX/UI) do ecossistema **Luisices (Papelaria de Afeto & Gestão de Ateliê)**.

Utilize este arquivo como contexto mestre para o **Stitch (ou outros agentes de design e frontend)** gerar componentes, telas e insights com consistência visual e acabamento refinado.

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

### ☀️ Modo Claro (Light Theme) — *Tons de Papel Seda, Argila e Lavanda*
| Token | Cor Hex / RGB | Uso / Significado |
| :--- | :--- | :--- |
| `--background` | `#FFF8F7` | Fundo principal (papel de algodão suave) |
| `--foreground` | `#221A1A` | Texto principal de alto contraste e legibilidade |
| `--primary` | `#613D3E` (Rosewood Escuro) | Ações principais, botões CTA, títulos de destaque |
| `--primary-hover` | `#4E3031` | Estado hover de botões primários |
| `--primary-foreground` | `#FFFFFF` | Texto sobre elementos primários |
| `--secondary` | `#5D5C76` (Índigo Lavanda) | Ações secundárias, abas e chips complementares |
| `--accent` | `#E2DFFF` (Lilás Suave) | Destaques, badges de IA e tags temáticas |
| `--muted` | `rgba(255, 240, 240, 0.70)` | Fundos de cards neutros e inputs |
| `--muted-foreground`| `#504444` | Subtítulos, rótulos e textos secundários |
| `--card` | `rgba(255, 255, 255, 0.65)` | Superfícies com efeito de vidro fosco (Glass) |
| `--glass-border` | `rgba(255, 255, 255, 0.55)` | Borda sutil de reflexo luminoso |
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
- **Border Radius:** `rounded-xl` (12px a 16px).
- **Estilo:** Fundo `var(--primary)`, texto `var(--primary-foreground)`, sombra suave (`shadow-md`).
- **Animação / Feedback:** Transição de opacidade no hover e `active:scale-95` no clique.

### 2. Cards de Produtos & Galeria
- **Aspect Ratio de Imagem:** `aspect-[4/3]` ou `aspect-square`.
- **Comportamento da Foto:** `object-cover`, cantos arredondados, leve zoom suave no hover (`group-hover:scale-105 duration-300`).
- **Overlay & Ações:** Badges no topo com backdrop-blur escuro (`bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md`).
- **Tags de Insumos:** Chips compactos com `#tag` estilizados.

### 3. Painel Lateral do Copiloto IA (Sheet)
- **Cabeçalho:** Ícone de robô/faísca com badge de status do modelo (`Gemini 3.8 Flash`).
- **Mensagens da IA:** Fundo de card sutil, tipografia estruturada com tópicos curtos e sem links quebrados.
- **Micro-ferramentas Interativas:** Cards embutidos no chat para criação rápida de rascunhos de pedidos, orçamentos e galeria de fotos.

---

## 📱 6. Regras de Responsividade & Mobile-First
1. **Áreas de Toque Mínimas:** Botões e ícones clicáveis no celular com no mínimo `44px x 44px`.
2. **Espaçamento Lateral:** `p-4` em mobile e `p-6 sm:p-7` em desktop.
3. **Barra de Ações Fixa ou Elevada:** Nunca sobrepor elementos de navegação móvel ao rodapé da tela.
4. **Scroll Suave:** Listas com `overflow-y-auto` e barra de rolagem estilizada e discreta.

---

## 💡 7. Perguntas / Prompts Prontos para Enviar ao Stitch

Quando for solicitar insights e novos componentes ao Stitch, envie este documento junto com perguntas como:

1. *"Com base nas regras de design system do Luisices em `design.md`, desenhe um componente de 'Ficha de Produção para Corte na Silhouette' com visual Glassmorphism e botões para exportar SVG."*
2. *"Como podemos aprimorar a tela de Galeria e Lojinha para destacar melhor as texturas de Lamicote Dourado e fotos em alta resolução seguindo a paleta Rosewood e Lavanda?"*
3. *"Crie uma proposta de layout mobile-first para o checkout da vitrine pública respeitando a estética de papelaria de afeto e micro-interações táteis."*
4. *"Gere um componente de 'Resumo Financeiro & Precificação' com cards estatísticos translúcidos, gráficos sutis e badges de margem de lucro."*
