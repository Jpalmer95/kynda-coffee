Dark Mode
---
name: Kynda Coffee Dark Noir
colors:
  surface: '#0e150f'
  surface-dim: '#0e150f'
  surface-bright: '#333b34'
  surface-container-lowest: '#09100a'
  surface-container-low: '#161d17'
  surface-container: '#1a211b'
  surface-container-high: '#242c25'
  surface-container-highest: '#2f372f'
  on-surface: '#dde5da'
  on-surface-variant: '#bccabb'
  inverse-surface: '#dde5da'
  inverse-on-surface: '#2b322b'
  outline: '#869486'
  outline-variant: '#3d4a3e'
  surface-tint: '#4de082'
  primary: '#6bfb9a'
  on-primary: '#003919'
  primary-container: '#4ade80'
  on-primary-container: '#005e2d'
  inverse-primary: '#006d36'
  secondary: '#c5c7c4'
  on-secondary: '#2e312f'
  secondary-container: '#474a47'
  on-secondary-container: '#b7b9b6'
  tertiary: '#7df6c5'
  on-tertiary: '#003827'
  tertiary-container: '#5fd9aa'
  on-tertiary-container: '#005d42'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6dfe9c'
  primary-fixed-dim: '#4de082'
  on-primary-fixed: '#00210c'
  on-primary-fixed-variant: '#005227'
  secondary-fixed: '#e1e3df'
  secondary-fixed-dim: '#c5c7c4'
  on-secondary-fixed: '#191c1a'
  on-secondary-fixed-variant: '#454745'
  tertiary-fixed: '#80f9c8'
  tertiary-fixed-dim: '#62dcad'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#00513a'
  background: '#0e150f'
  on-background: '#dde5da'
  surface-variant: '#2f372f'
  background-base: '#121513'
  surface-card: '#1A1D1B'
  surface-sidebar: '#161A17'
  on-surface-muted: rgba(255, 255, 255, 0.6)
  emerald-glow: rgba(74, 222, 128, 0.2)
  border-subtle: rgba(74, 222, 128, 0.1)
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Montserrat // Uses body font config
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Montserrat // Uses body font config
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-mobile: 16px
  margin-desktop: 40px
  gutter: 24px
  base: 8px
  section-padding: 80px
  container-max: 1280px
---

## Brand & Style

Kynda Coffee embodies a "Dark Noir" aesthetic that blends artisanal craftsmanship with a premium, high-tech edge. The brand personality is sophisticated, nocturnal, and focused on the ritual of coffee roasting. 

The design style is a hybrid of **Minimalism** and **Tactile Glassmorphism**. It utilizes an abyssal dark palette punctuated by vibrant "Emerald Glow" accents. A subtle digital noise texture is applied globally to the background to evoke a sense of physical material and depth, moving away from "flat" digital surfaces toward something that feels like an upscale, dimly lit espresso bar. The UI should feel precise yet organic, mirroring the balance between the science of roasting and the art of brewing.

## Colors

The color palette is built on a foundation of deep, layered blacks and forest greens to create a true "Dark Mode" experience that avoids pure #000000.

- **Primary Emerald (#4ADE80):** Used for primary actions, active states, and brand highlights. It often carries a glow effect to simulate light in a dark environment.
- **Abyssal Neutrals:** The background starts at `#121513`, with container surfaces stepping up to `#161A17` and `#1A1D1B` to create hierarchy through tonal depth rather than heavy shadows.
- **Typography Colors:** Primary text is off-white for high legibility without harshness. Secondary text uses a reduced opacity (60%) or muted emerald tints to maintain the moody atmosphere.

## Typography

The system uses a sophisticated pairing of a serif and a geometric sans-serif:

- **Playfair Display (Headlines):** Provides a literary, premium feel. It should be used for branding, page titles, and product names. High-contrast strokes add elegance to the dark background.
- **Montserrat (Body & UI):** A clean, geometric sans-serif that ensures high readability for descriptions, navigation, and technical data. 
- **Character:** Labels and buttons utilize uppercase styling with increased letter spacing to create a modern, "terminal-like" aesthetic.

## Layout & Spacing

The layout utilizes a **Fixed Grid** approach for the main content area to maintain a controlled editorial feel.

- **Grid:** On desktop, a standard 12-column grid is used within a `1280px` container.
- **Sidebar:** A fixed `256px` (64rem) sidebar persists on the left for navigation, providing a stable anchor for the application.
- **Rhythm:** An 8px base unit drives all spacing. Sections are separated by generous padding (`80px`) to allow the high-quality imagery and typography to breathe.
- **Responsive:** On mobile, margins shrink to `16px`, the sidebar transforms into a top-header with a hamburger menu, and product grids collapse to a single column.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Luminescent Borders** rather than traditional drop shadows.

- **Surface Tiers:** The furthest back layer is the noise-textured background. Navigation sidebars and cards sit one "tier" above this with slightly lighter hex values.
- **Emerald Glow:** Active elements or hovered cards use a soft emerald glow (`0 0 15px rgba(74, 222, 128, 0.2)`). This simulates neon-like lighting.
- **Borders:** Thin, low-opacity borders (`0.5px` or `1px`) are used to define shapes. Primary borders use `#4ADE80` at 15-30% opacity to maintain a crisp, technical look.
- **Noise Overlay:** A global `0.05` opacity fractal noise filter is layered over the entire UI to prevent "banding" on dark gradients and add a tactile, grainy texture.

## Shapes

The shape language is "Subtly Softened." While the brand is technical and sharp, the use of rounded corners prevents it from feeling aggressive or cold.

- **Containers:** Product cards and main surface areas use a `0.75rem` (12px) radius.
- **Buttons:** Primary action buttons use a sharper `0.25rem` (4px) radius to emphasize their functional, "tool-like" nature.
- **Images:** Always follow the container's rounding to maintain a unified silhouette.

## Components

### Buttons
- **Primary Ghost:** Outlined with `#4ADE80`, uppercase text. On hover, they fill with the primary color and transition text to the darkest neutral.
- **Active Tab:** Indicated by an emerald bottom border and full-opacity text.

### Cards
- **Product Card:** Features a `dark-surface` background, an image with an aspect-ratio of 1:1, and a floating price tag in a semi-transparent dark pill.
- **Hover State:** Cards should translate `-4px` on the Y-axis and gain the "Emerald Glow" effect.

### Navigation
- **Sidebar Links:** High-contrast icons (Material Symbols) paired with Montserrat body text. Active states use a solid background fill with the primary color.
- **Mobile Header:** A backdrop-blur (90% opacity) is used to maintain legibility as the user scrolls through images.

### Chips/Badges
- Small, uppercase labels with thin borders. Used for pricing, categories, or status indicators.

Light Mode:
---
name: Forest & Sand
colors:
  surface: '#fbf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#fbf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#eae8e5'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#434843'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f0ed'
  outline: '#737973'
  outline-variant: '#c3c8c1'
  surface-tint: '#4d6453'
  primary: '#061b0e'
  on-primary: '#ffffff'
  primary-container: '#1b3022'
  on-primary-container: '#819986'
  inverse-primary: '#b4cdb8'
  secondary: '#5e5e5c'
  on-secondary: '#ffffff'
  secondary-container: '#e1dfdc'
  on-secondary-container: '#636360'
  tertiary: '#1a1711'
  on-tertiary: '#ffffff'
  tertiary-container: '#2f2b24'
  on-tertiary-container: '#989289'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d0e9d4'
  primary-fixed-dim: '#b4cdb8'
  on-primary-fixed: '#0b2013'
  on-primary-fixed-variant: '#364c3c'
  secondary-fixed: '#e4e2df'
  secondary-fixed-dim: '#c8c6c3'
  on-secondary-fixed: '#1b1c1a'
  on-secondary-fixed-variant: '#474745'
  tertiary-fixed: '#eae1d7'
  tertiary-fixed-dim: '#cdc5bc'
  on-tertiary-fixed: '#1f1b15'
  on-tertiary-fixed-variant: '#4b463f'
  background: '#fbf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter // Uses body font config
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
This design system embodies an **Organic-Tech** aesthetic, merging the warmth of natural materials with the precision of modern digital interfaces. It targets a premium, health-conscious, and environmentally aware audience who values quality and heritage. 

The visual style is a blend of **Minimalism** and **Tactile** design. It uses generous whitespace to create a sense of calm (Forest) while utilizing subtle tonal layering to represent physical surfaces (Sand). The emotional response should be one of refined tranquility and reliable craftsmanship.

## Colors
The palette is centered on high-contrast natural tones. 
- **Surface-Canvas (#FBF9F6):** The primary backdrop, providing a clean, warm foundation.
- **Surface-Sand (#F5F3F0):** Used for secondary containers, cards, and subtle UI differentiation.
- **Brand-Forest (#1B3022):** The primary color for branding, high-level headings, and primary action states.
- **Accents:** Use muted earth tones for status or secondary indicators, ensuring they never compete with the core Forest/Sand relationship.

## Typography
The typographic system pairs the authoritative, literary feel of **Playfair Display** with the functional clarity of **Inter**. 
- **Serif (Headlines):** Use Playfair Display for all major headings and brand moments to evoke a premium, editorial feel.
- **Sans-Serif (UI/Body):** Use Inter for all functional elements, descriptions, and labels to ensure maximum legibility and a "tech" precision.
- **Hierarchy:** Maintain clear contrast between heading sizes. Labels should often use uppercase with slight letter spacing to differentiate from body prose.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy on desktop to maintain an editorial, magazine-like composition, transitioning to a fluid model on mobile.
- **Grid:** A 12-column grid system with 24px gutters. 
- **Rhythm:** Spacing follows an 8px base unit. Use generous vertical "stack" spacing (32px+) between major sections to emphasize the minimalist aesthetic.
- **Sidebars:** Functional sidebars (like cart or filters) should use the Surface-Sand color to visually separate from the Surface-Canvas main content area.

## Elevation & Depth
This system avoids heavy shadows in favor of **Tonal Layers** and **Low-contrast Outlines**.
- **Stacking:** Depth is conveyed by placing Surface-Sand elements over Surface-Canvas. 
- **Outlines:** Use 1px borders in a slightly darker shade than the surface (e.g., #E8E4E0) to define boundaries without adding visual weight.
- **Shadows:** If used for high-importance modals, employ a very soft, highly diffused ambient shadow with a hint of the Forest tint: `0px 12px 32px rgba(27, 48, 34, 0.05)`.

## Shapes
Shapes are disciplined and "Soft." 
- **Radius:** Standard UI elements like buttons and input fields use a 0.25rem (4px) radius. Larger containers like cards use 0.5rem (8px).
- **Hard Edges:** Use sharp 0px edges for full-width sections or footer blocks to ground the layout.
- **Consistency:** Avoid pill-shapes for functional buttons; keep them rectangular with soft corners to maintain the sophisticated, architectural tone.

## Components
- **Buttons:** Primary buttons are solid Brand-Forest with white Inter text. Secondary buttons use a Brand-Forest outline or Surface-Sand background.
- **Cards:** Product cards use the Surface-Sand background with no border, or a thin subtle outline. Images should have a consistent aspect ratio and slightly softened corners.
- **Chips/Filters:** Use a "capsule" shape for active filters to distinguish them from standard buttons. Active state is Brand-Forest; inactive is Surface-Sand.
- **Inputs:** Clean, bottom-border only or light-outlined fields with Inter labels. Focus states should clearly use the Brand-Forest color.
- **Lists:** Use generous padding between list items. Use thin dividers in the tertiary color (#D9D1C7) to maintain structure without clutter.