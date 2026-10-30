---
name: luisices-design-system
description: >-
  Use this skill whenever designing, building, reviewing, or refactoring frontend
  UI components, pages, modals, or styles in Luisices. Enforces the Visual Constitution,
  Liquid Glassmorphism, semantic Tailwind tokens, multi-theme compatibility (including
  Deep Ocean, Forest Glow, and Sunset Amber), and component reuse.
---

# Luisices Design System & Visual Constitution Runbook

Guidelines for maintaining visual harmony, luxury craftsmanship, emotional connection, and strict token hygiene across all Luisices interfaces.

**Full Reference Document:** [`design.md`](../../design.md)  
**Semantic Theme Tokens:** [`src/styles/theme.css`](../../src/styles/theme.css)  
**Shared UI Components:** [`src/app/components/ui/`](../../src/app/components/ui/)

---

## 🏛️ 1. Aesthetic Identity: "Papelaria de Afeto & Luxo Artesanal"

Luisices blends the tactile, warm sensation of fine handmade stationery (cotton paper, gold foil, embossed textures) with the modern fluidity of **Liquid Glassmorphism** (translucent frosted glass, subtle borders, soft ambient lighting).

---

## 🚫 2. The Hardcoded HEX Anti-Pattern (Zero-Tolerance)

Never hardcode raw hexadecimal colors directly in React JSX or Tailwind classes (e.g. `bg-[#fff8f7]`, `text-[#221a1a]`, `dark:bg-[#1f191b]`).

### Why this is forbidden:
`src/styles/theme.css` supports multiple dynamic user themes:
* Light (`default`)
* Dark (`dark`)
* Deep Ocean (`deep-ocean`)
* Forest Glow (`forest-glow`)
* Sunset Amber (`sunset-amber`)

Hardcoded hex classes bypass the CSS variables and cause components to look completely broken when the user switches to themes like Deep Ocean or Forest Glow.

### 🔄 Hex to Semantic Token Translation Table:

| Hardcoded Anti-Pattern | Correct Semantic Tailwind Class | Theme Variable |
| :--- | :--- | :--- |
| `bg-[#fff8f7]`, `dark:bg-[#1f191b]` | `bg-background` | `var(--background)` |
| `text-[#221a1a]`, `dark:text-[#e8e0e3]` | `text-foreground` | `var(--foreground)` |
| `text-[#613d3e]`, `text-[#f4b7b9]`, `text-[var(--store-primary,...)]` | `text-primary` | `var(--primary)` |
| `bg-[#613d3e]`, `bg-[#f4b7b9]` | `bg-primary text-primary-foreground` | `var(--primary)` |
| `bg-white/80`, `dark:bg-[#261f22]` | `bg-card` | `var(--card)` |
| `border-stone-200`, `dark:border-[#ebcdcd]/...` | `border-glass-border` | `var(--glass-border)` |
| `text-[#504444]`, `text-stone-500` | `text-muted-foreground` | `var(--muted-foreground)` |
| `bg-stone-100`, `dark:bg-[#161214]` | `bg-muted` | `var(--muted)` |
| `bg-[#10B981]`, `bg-emerald-600` (Success/WhatsApp) | `bg-emerald-600 text-white` (or dedicated utility) | Custom status |
| `bg-[#ba1a1a]`, `bg-red-600` | `bg-destructive text-destructive-foreground` | `var(--destructive)` |

---

## 🪟 3. Implementing Liquid Glassmorphism

When creating cards, floating controls, dialogs, or panels:

```tsx
<div className="bg-card/70 backdrop-blur-md border border-glass-border rounded-2xl shadow-sm p-6">
  <h3 className="text-lg font-semibold text-foreground">Título do Card</h3>
  <p className="text-sm text-muted-foreground mt-1">Subtítulo com descrição clara.</p>
</div>
```

* **Border radius:** Always use organic rounded corners (`rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`). Never use `rounded-none`.
* **Shadows:** Soft ambient drop shadows (`shadow-sm`, `shadow-md`, `shadow-2xs`), never harsh pitch-black drop shadows.

---

## 🧩 4. Mandatory Reuse of UI Primitives

Before creating custom modal divs or drawers with manual overlays:
Inspect and reuse the 45+ accessible primitives in [`src/app/components/ui/`](../../src/app/components/ui/):

* **Drawers / Sidepanels:** Use `<Sheet>` or `<Drawer>` (handles mobile drag gestures and safe-area insets automatically).
* **Modals & Dialogs:** Use `<Dialog>` or `<ResponsiveDialog>`.
* **Buttons:** Use `<Button variant="default|secondary|outline|ghost|destructive">`.
* **Badges:** Use `<Badge variant="outline|secondary|destructive">`.
* **Form Inputs:** Use `<Input>`, `<Select>`, `<Checkbox>`, and `<Switch>`.

---

## 📱 5. Mobile Ergonomics & Safe Areas

For mobile-first touch interfaces:
* Always respect iOS/Android safe area insets: `pb-[max(1.25rem,env(safe-area-inset-bottom))]`.
* Minimum touch target for actionable buttons: `min-h-[44px]` on mobile.
* Prevent horizontal layout overflow on narrow mobile viewports (360px).
