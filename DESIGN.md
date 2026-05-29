# Kynda Coffee Design System v2 — Modern Artisan

This document is the **single source of truth** for the Kynda Coffee platform's visual identity. All colors, typography, spacing, and component rules are defined here.

## 1. Brand Philosophy

Kynda Coffee is a premium specialty coffee shop in Horseshoe Bay, TX. The digital platform reflects:

- **Warmth & Craft** — Heirloom cream surfaces, earthy accents
- **Precision** — Clean geometric typography, consistent spacing
- **Nature** — Deep forest green, sage accents, organic shapes
- **Sophistication** — Charcoal dark mode, refined palette (no neon)

The aesthetic avoids industrial "roaster" vibes. Instead: elegant, earthy, welcoming.

---

## 2. Color Palette

All colors are defined as CSS custom properties (bare RGB triplets) in `src/styles/globals.css`, consumed by Tailwind via `rgb(var(--token) / <alpha-value>)`.

### 2.1 Light Mode — "Organic Minimalism"

Heirloom Cream base with Deep Forest Green accents. Evokes specialty coffee precision with cozy café warmth.

| Semantic Token       | Tailwind Class              | Hex       | Description                          | Contrast |
|:---------------------|:----------------------------|:----------|:-------------------------------------|:---------|
| `background`         | `bg-background`             | `#FBF9F5` | Main page background (Heirloom Cream)| N/A      |
| `foreground`         | `text-foreground`           | `#1B1C1A` | Main body text                       | 16.3:1 ✓ |
| `card`               | `bg-card`                   | `#F5F3EF` | Card surfaces                        | N/A      |
| `card-foreground`    | `text-card-foreground`      | `#1B1C1A` | Text on cards                        | 15.1:1 ✓ |
| `popover`            | `bg-popover`                | `#FFFFFF` | Dropdowns, modals                    | N/A      |
| `primary`            | `bg-primary`                | `#061B0E` | Deep Forest Green (CTAs)             | N/A      |
| `primary-foreground` | `text-primary-foreground`   | `#FFFFFF` | Text on primary                      | 17.9:1 ✓ |
| `secondary`          | `bg-secondary`              | `#645E53` | Roasted Earth secondary              | N/A      |
| `secondary-foreground`| `text-secondary-foreground`| `#FFFFFF` | Text on secondary                    | 6.7:1 ✓  |
| `muted`              | `bg-muted`                  | `#EAE8E4` | Subtle backgrounds                   | N/A      |
| `muted-foreground`   | `text-muted-foreground`     | `#434843` | Helper text, subdued content         | 8.9:1 ✓  |
| `accent`             | `bg-accent`                 | `#8C7851` | Roasted Earth accent                 | N/A      |
| `accent-foreground`  | `text-accent-foreground`    | `#FFFFFF` | Text on accent                       | 4.9:1 ✓  |
| `destructive`        | `bg-destructive`            | `#BA1A1A` | Error states                         | N/A      |
| `border`             | `border-border`             | `#737973` | Default borders                      | N/A      |
| `input`              | `border-input`              | `#C3C8C1` | Input field borders                  | N/A      |
| `ring`               | `ring-ring`                 | `#061B0E` | Focus rings                          | N/A      |

### 2.2 Dark Mode — "Clean Charcoal"

Sophisticated pure-charcoal base (no green tint) with sage green accents. Mature, modern, readable.

| Semantic Token       | Tailwind Class              | Hex       | Description                          | Contrast |
|:---------------------|:----------------------------|:----------|:-------------------------------------|:---------|
| `background`         | `bg-background`             | `#131313` | Clean Charcoal base                   | N/A      |
| `foreground`         | `text-foreground`           | `#E5E2E1` | Warm Cream text                      | 14.4:1 ✓ |
| `card`               | `bg-card`                   | `#1C1B1B` | Slightly raised charcoal             | N/A      |
| `card-foreground`    | `text-card-foreground`      | `#E5E2E1` | Text on cards                        | 13.1:1 ✓ |
| `popover`            | `bg-popover`                | `#262626` | Elevated charcoal                    | N/A      |
| `primary`            | `bg-primary`                | `#B4CDB8` | Sage Green (softer forest)           | N/A      |
| `primary-foreground` | `text-primary-foreground`   | `#203527` | Dark green on sage buttons           | 7.7:1 ✓  |
| `secondary`          | `bg-secondary`              | `#C8C6C3` | Subdued button backgrounds           | N/A      |
| `secondary-foreground`| `text-secondary-foreground`| `#30312E` | Dark text on secondary               | 10.7:1 ✓ |
| `muted`              | `bg-muted`                  | `#2A2A2A` | Subtle dark surfaces                 | N/A      |
| `muted-foreground`   | `text-muted-foreground`     | `#C3C8C1` | Subdued text                         | 10.9:1 ✓ |
| `accent`             | `bg-accent`                 | `#B6CCBA` | Muted sage accent                    | N/A      |
| `accent-foreground`  | `text-accent-foreground`    | `#223528` | Text on accent                       | 8.0:1 ✓  |
| `destructive`        | `bg-destructive`            | `#FFB4AB` | Error states                         | N/A      |
| `border`             | `border-border`             | `#8D928C` | Default borders                      | N/A      |
| `input`              | `border-input`              | `#434843` | Input field borders                  | N/A      |
| `ring`               | `ring-ring`                 | `#B4CDB8` | Focus rings                          | N/A      |

### 2.3 Legacy Token Compatibility

The following legacy Tailwind class names remain available and map to the semantic tokens above. New code should prefer the semantic names.

| Legacy Class    | Maps To (Light) | Maps To (Dark)  | Notes                           |
|:----------------|:----------------|:----------------|:--------------------------------|
| `bg-cream`      | background      | background      | Page background                 |
| `text-espresso` | foreground      | foreground      | Primary text                    |
| `bg-surface`    | primary-cont.   | dark charcoal   | Dark container (headers/CTAs)   |
| `text-sand`     | white           | warm cream      | Text on dark surfaces           |
| `border-latte`  | border          | border          | Default borders                 |
| `text-mocha`    | muted-fg        | muted-fg        | Secondary text                  |
| `bg-forest`     | forest green    | sage green      | Primary accent color            |
| `bg-sage`       | sage            | sage            | Secondary accent                |
| `text-sand`     | white           | warm cream      | Light text on dark containers   |
| `bg-card`       | card            | card            | Card surfaces                   |

---

## 3. Typography

### Heading Font: EB Garamond (Serif)

Classic, elegant serif for headlines. Conveys the precision of specialty coffee craft.

```
font-heading → EB Garamond, Georgia, serif
```

- Used for: `h1`, `h2`, `h3`, display text, hero titles
- Weights: 400, 500, 600, 700, 800

### Body Font: Plus Jakarta Sans (Geometric Sans)

Clean, rounded geometric sans-serif. Modern, friendly, highly readable.

```
font-body → Plus Jakarta Sans, system-ui, sans-serif
```

- Used for: paragraphs, buttons, navigation, labels, form inputs
- Weights: 400, 500, 600, 700

### Type Scale

| Role        | Size (rem) | Weight | Tracking  | Use Case                         |
|:------------|:-----------|:-------|:----------|:---------------------------------|
| Display     | 3.5–4.5    | 700    | -0.02em   | Hero headlines                   |
| H1          | 2.5–3.0    | 700    | -0.01em   | Page titles                      |
| H2          | 2.0–2.25   | 600    | -0.01em   | Section headings                 |
| H3          | 1.5–1.75   | 600    | normal    | Card titles                      |
| Body        | 1.0        | 400    | normal    | Paragraphs                       |
| Body Small  | 0.875      | 400    | normal    | Helper text, captions            |
| Label       | 0.75–0.875 | 600    | 0.05em    | Buttons, tags, badges            |

---

## 4. Radii / Shapes

Soft edges reflecting ceramic cups and natural forms.

| Token      | Value     | Use Case                     |
|:-----------|:----------|:-----------------------------|
| `radius-sm`  | 0.25rem (4px)  | Small elements (badges)      |
| `radius-md`  | 0.5rem (8px)   | Buttons, inputs              |
| `radius-lg`  | 0.75rem (12px) | Cards                        |
| `radius-xl`  | 1rem (16px)    | Feature images, modals       |

---

## 5. Elevation & Shadows

| Token       | Value                                    | Use Case            |
|:------------|:-----------------------------------------|:--------------------|
| `shadow-soft` | `0 2px 10px rgba(0, 0, 0, 0.06)`      | Cards at rest       |
| `shadow-hover`| `0 10px 25px rgba(0, 0, 0, 0.08)`     | Cards on hover      |
| `shadow-glow` | `0 0 20px rgba(180, 205, 184, 0.15)`  | Dark mode accent glow |

---

## 6. Component Patterns

### Buttons

- **Primary (`.btn-primary`)**: `bg-surface` (dark green/charcoal) + `text-sand` (white/cream). Solid, high-contrast.
- **Secondary (`.btn-secondary`)**: Transparent with `border-latte` border + `text-espresso`. Hover reveals forest tint.
- **Accent (`.btn-accent`)**: `bg-forest` (forest green/sage) + white text (light) or dark green text (dark). For CTAs and key actions.
- **Ghost (`.btn-ghost`)**: No background, `text-mocha`. Subtle interactions.

All buttons: `min-height: 44px`, `rounded-md`, 44px touch target minimum.

### Cards

- Background: `bg-card` (`bg-cream-100` in legacy)
- Border: `border border-latte/20` (subtle)
- Radius: `rounded-lg`
- Shadow: `shadow-soft` at rest, `shadow-hover` on interaction
- Hover: `card-lift` utility class adds subtle Y translation

### Navigation

- Glassmorphism: `glass-nav` class — 90% opacity background + 12px backdrop blur
- Border: `glass-nav-border` — subtle bottom divider
- Fixed top, z-index layered

---

## 7. Accessibility

All color combinations meet **WCAG 2.2 AA**:

- Normal text (<18px): ≥4.5:1 contrast ratio
- Large text (≥18px or ≥14px bold): ≥3:1 contrast ratio  
- UI components / icons: ≥3:1 contrast ratio
- Touch targets: ≥44px minimum
- Focus indicators: 2px solid ring with 2px offset
- `prefers-reduced-motion`: all animations disabled

---

## 8. Implementation Architecture

### Theme Switching

JavaScript-driven via `ThemeProvider` context:
1. Sets `.dark` class + `data-theme="dark"` attribute on `<html>`
2. CSS variables in `globals.css` respond to both selectors
3. Persists to `localStorage` as `kynda-theme`
4. Inline script in `<head>` prevents FOUC

### Tailwind Integration

All colors mapped in `tailwind.config.ts` using `rgb(var(--token) / <alpha-value>)` pattern, enabling opacity modifiers:

```
bg-primary/90  →  90% opacity primary background
text-foreground/75  →  75% opacity text
border-border/50  →  50% opacity border
```

### Email Templates

Email clients do NOT read CSS variables. All email colors must be hardcoded hex:
- Forest green accents: `#1B3022`
- Text: `#1B1C1A`
- Secondary text: `#434843`
- Backgrounds: `#F5F3EF`

**Never use deprecated brown/beige hex colors** from the old theme.

---

## 9. Migration Guide

When updating existing components from legacy to semantic tokens:

| Old Pattern                   | New Pattern                        |
|:------------------------------|:-----------------------------------|
| `bg-cream`                    | `bg-background`                    |
| `text-espresso`               | `text-foreground`                  |
| `bg-card` (unchanged)         | `bg-card`                          |
| `bg-surface`                  | `bg-surface` (keep — special case) |
| `text-sand`                   | `text-sand` (keep — special case)  |
| `border-latte`                | `border-border`                    |
| `text-mocha`                  | `text-muted-foreground`            |
| `bg-forest`                   | `bg-primary`                       |
| `bg-cream-200`                | `bg-muted`                         |

**Note**: `bg-surface` and `text-sand` are intentionally kept as-is because they serve a special purpose (always-dark containers that don't invert in either mode).

---

*Last updated: 2026-05-29*
