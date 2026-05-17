# Kynda Coffee: The Modern Artisan Master Schema

A premium, high-fidelity design system for a next-generation specialty coffee brand. This schema bridges the tactile world of organic coffee with a cutting-edge, mobile-optimized digital experience.

## 1. Visual Strategy & Color Theory
The "Modern Artisan" palette is grounded in an "Organic-Tech" philosophy—using earth-toned neutrals to provide warmth, paired with high-precision greens for digital clarity.

### Light Mode: "Forest & Sand"
- **Surface-Canvas:** `#FBF9F6` — A warm, non-pure white that reduces digital eye strain and feels like artisanal paper.
- **Surface-Sand:** `#F5F3F0` — Used for secondary containers and subtle grouping.
- **Brand-Forest (Primary):** `#1B3022` — Deep, commanding green for typography and primary UI elements.
- **Accent-Bronze:** `#A67C52` — For specialty highlights, award ribbons, and premium roasts.

### Dark Mode: "Backlit Emerald"
- **Surface-Midnight:** `#121A14` — A deep charcoal-green that provides better depth than true black.
- **Surface-Deep:** `#1A251D` — For cards and elevated containers.
- **Brand-Luminous:** `#4ADE80` — A vibrant, glow-enabled emerald used for active states and CTAs to create a "backlit" effect.
- **Glassmorphism:** Use `80%` opacity with a `12px` backdrop-blur on navigation and floating elements.

## 2. Typography & Hierarchy
- **Headings (Serif):** *Playfair Display*
    - Style: Semi-bold to Bold.
    - Intent: Conveys heritage, craft, and premium authority.
- **Body & Functional UI (Sans-Serif):** *Inter* (or system-default sans-serif)
    - Style: Regular to Medium.
    - Intent: High readability for menu items, pricing, and administrative data.

## 3. Theme Transition Logic
To ensure a premium feel, theme swaps must be fluid and intentional.
- **Duration:** `300ms`
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`
- **Crossfade:** Elements should smoothly transition color properties rather than snapping. Background gradients should use a 500ms transition to maintain the "organic" feel.

## 4. Component Architecture

### Specialty Product Cards
- **Shape:** `8px` corner radius (`round-four`).
- **Interaction:** `1.02x` scale on hover with a subtle `2px` vertical lift.
- **Lighting:** In Light mode, use soft, diffused shadows. In Dark mode, use a subtle inner emerald border (`0.5px`) to simulate rim lighting.
- **Imagery:** Product photography must remain natural and true-to-color. No thematic green overlays or filters should be applied to food and beverage assets.

### Navigation & Command Bars
- **Admin Sidebar:** Solid surfaces with high-contrast active states using `Brand-Forest` backgrounds.
- **Customer Header:** Transparent on hero sections, transitioning to a blurred `Surface-Canvas/90` or `Surface-Midnight/90` on scroll.

## 5. PWA & Next-Gen UX
- **Mobile-First Touch Targets:** Minimum `44px x 44px` for all interactive elements.
- **Haptic Feedback:** Integrated triggers for "Add to Bag" and "Order Success" actions.
- **Offline Mode:** Cache the Menu and Location pages for instant loading in low-connectivity areas.
- **Micro-interactions:** 
    - Quantity selectors (`+`/`-`) use spring animations for tactile feedback.
    - Page transitions use a "Slide & Fade" pattern to feel like a native app.

## 6. Accessibility & Inclusivity
- **Contrast:** All text-on-surface pairings must exceed WCAG 2.2 AA standards (4.5:1 ratio). Special attention to footer text in Light Mode and sidebar navigation in Dark Mode.
- **Focus States:** Use a high-visibility `2px` solid ring of `Brand-Luminous` or `Brand-Forest` for keyboard navigation.
- **Labels:** All iconic actions (Shopping Bag, User Profile) must include descriptive aria-labels for screen readers.

## 7. Rationale
This system rejects the "sterile tech" aesthetic. By prioritizing texture, warm neutrals, and serif typography, Kynda Coffee communicates that its product is grown in soil, not in a server—while its lightning-fast PWA features prove its commitment to modern convenience.