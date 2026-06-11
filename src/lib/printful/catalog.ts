// Printful Product Catalog
// Real Printful catalog product IDs, variant IDs, wholesale pricing, and
// per-color product photos — verified against the live Printful API
// (GET https://api.printful.com/products/{id}, public, June 2026).
//
// IMPORTANT: imageUrl / variant image URLs are Printful CDN catalog photos
// (files.cdn.printful.com) which serve `access-control-allow-origin: *`,
// so they are safe to draw onto the design canvas and export (no taint).

export type ProductCategory =
  | "apparel"
  | "drinkware"
  | "accessories"
  | "wall-art"
  | "home-living";

/** Print-area rectangle in the canvas's virtual 1000x1000 coordinate space. */
export type CanvasPrintArea = { x: number; y: number; w: number; h: number };

export type PrintfulProduct = {
  id: string;
  printfulId: number;
  name: string;
  category: ProductCategory;
  description: string;
  basePriceCents: number; // Printful wholesale (cheapest variant)
  imageUrl: string;
  mockupImages: {
    front: string;
    back?: string;
  };
  variants: ProductVariant[];
  printAreas: {
    front: { width: number; height: number; x: number; y: number };
    back?: { width: number; height: number; x: number; y: number };
  };
  /** Where the design sits on the mockup photo, virtual 1000x1000 coords. */
  canvasPrintArea: CanvasPrintArea;
};

export type ProductVariant = {
  id: number; // REAL Printful variant_id — used for order placement
  name: string;
  color?: string;
  colorName?: string;
  size?: string;
  additionalPriceCents?: number;
  /** Color-specific product photo (Printful CDN, CORS-safe). */
  image?: string;
};

// Markup tiers by product type
export const PRODUCT_MARKUP: Record<ProductCategory, { multiplier: number; shippingBufferCents: number }> = {
  apparel: { multiplier: 2.6, shippingBufferCents: 500 },
  drinkware: { multiplier: 2.8, shippingBufferCents: 400 },
  accessories: { multiplier: 2.8, shippingBufferCents: 300 },
  "wall-art": { multiplier: 3.0, shippingBufferCents: 800 },
  "home-living": { multiplier: 2.7, shippingBufferCents: 600 },
};

export function calculateRetailPrice(product: PrintfulProduct, variant?: ProductVariant): number {
  const markup = PRODUCT_MARKUP[product.category];
  const baseWithVariant = product.basePriceCents + (variant?.additionalPriceCents || 0);
  return Math.round(baseWithVariant * markup.multiplier) + markup.shippingBufferCents;
}

export function calculateProfit(basePriceCents: number, retailPriceCents: number, printfulShippingCents: number): number {
  const totalCost = basePriceCents + printfulShippingCents;
  return retailPriceCents - totalCost;
}

// ============================================================================
// PRODUCT CATALOG — verified live against Printful API 2026-06
// ============================================================================

const CDN = "https://files.cdn.printful.com";

export const PRINTFUL_CATALOG: PrintfulProduct[] = [
  // ===== APPAREL =====
  {
    id: "unisex-tee",
    printfulId: 71, // Bella + Canvas 3001 — Unisex Staple T-Shirt
    name: "Unisex Jersey Tee",
    category: "apparel",
    description: "Soft, premium Bella+Canvas 3001 cotton tee. Perfect for everyday wear.",
    basePriceCents: 1169,
    imageUrl: `${CDN}/o/upload/product-catalog-img/20/2079a3ee4cc472ad952fe16654f274cd_l`,
    mockupImages: {
      front: `${CDN}/products/71/4011_1752236284.jpg`,
    },
    variants: [
      // White
      { id: 4011, name: "White / S", colorName: "White", color: "#FFFFFF", size: "S", image: `${CDN}/products/71/4011_1752236284.jpg` },
      { id: 4012, name: "White / M", colorName: "White", color: "#FFFFFF", size: "M", image: `${CDN}/products/71/4011_1752236284.jpg` },
      { id: 4013, name: "White / L", colorName: "White", color: "#FFFFFF", size: "L", image: `${CDN}/products/71/4011_1752236284.jpg` },
      { id: 4014, name: "White / XL", colorName: "White", color: "#FFFFFF", size: "XL", image: `${CDN}/products/71/4011_1752236284.jpg` },
      { id: 4015, name: "White / 2XL", colorName: "White", color: "#FFFFFF", size: "2XL", additionalPriceCents: 200, image: `${CDN}/products/71/4011_1752236284.jpg` },
      // Black
      { id: 4016, name: "Black / S", colorName: "Black", color: "#0c0c0c", size: "S", image: `${CDN}/products/71/4016_1752236278.jpg` },
      { id: 4017, name: "Black / M", colorName: "Black", color: "#0c0c0c", size: "M", image: `${CDN}/products/71/4016_1752236278.jpg` },
      { id: 4018, name: "Black / L", colorName: "Black", color: "#0c0c0c", size: "L", image: `${CDN}/products/71/4016_1752236278.jpg` },
      { id: 4019, name: "Black / XL", colorName: "Black", color: "#0c0c0c", size: "XL", image: `${CDN}/products/71/4016_1752236278.jpg` },
      { id: 4020, name: "Black / 2XL", colorName: "Black", color: "#0c0c0c", size: "2XL", additionalPriceCents: 200, image: `${CDN}/products/71/4016_1752236278.jpg` },
      // Navy
      { id: 4111, name: "Navy / S", colorName: "Navy", color: "#212642", size: "S", image: `${CDN}/products/71/4111_1752236282.jpg` },
      { id: 4112, name: "Navy / M", colorName: "Navy", color: "#212642", size: "M", image: `${CDN}/products/71/4111_1752236282.jpg` },
      { id: 4113, name: "Navy / L", colorName: "Navy", color: "#212642", size: "L", image: `${CDN}/products/71/4111_1752236282.jpg` },
      { id: 4114, name: "Navy / XL", colorName: "Navy", color: "#212642", size: "XL", image: `${CDN}/products/71/4111_1752236282.jpg` },
      { id: 4115, name: "Navy / 2XL", colorName: "Navy", color: "#212642", size: "2XL", additionalPriceCents: 200, image: `${CDN}/products/71/4111_1752236282.jpg` },
      // Athletic Heather
      { id: 6948, name: "Athletic Heather / S", colorName: "Athletic Heather", color: "#cececc", size: "S", image: `${CDN}/products/71/6948_1752236278.jpg` },
      { id: 6949, name: "Athletic Heather / M", colorName: "Athletic Heather", color: "#cececc", size: "M", image: `${CDN}/products/71/6948_1752236278.jpg` },
      { id: 6950, name: "Athletic Heather / L", colorName: "Athletic Heather", color: "#cececc", size: "L", image: `${CDN}/products/71/6948_1752236278.jpg` },
      { id: 6951, name: "Athletic Heather / XL", colorName: "Athletic Heather", color: "#cececc", size: "XL", image: `${CDN}/products/71/6948_1752236278.jpg` },
      { id: 6952, name: "Athletic Heather / 2XL", colorName: "Athletic Heather", color: "#cececc", size: "2XL", additionalPriceCents: 200, image: `${CDN}/products/71/6948_1752236278.jpg` },
    ],
    printAreas: {
      front: { width: 12, height: 16, x: 50, y: 30 },
      back: { width: 12, height: 16, x: 50, y: 30 },
    },
    canvasPrintArea: { x: 330, y: 250, w: 340, h: 440 },
  },
  {
    id: "hoodie",
    printfulId: 380, // Cotton Heritage M2580 — Unisex Premium Pullover Hoodie
    name: "Unisex Hoodie",
    category: "apparel",
    description: "Cozy premium fleece pullover hoodie. Warm, comfortable, classic fit.",
    basePriceCents: 2729,
    imageUrl: `${CDN}/o/upload/product-catalog-img/0e/0e62ae87da7d32dfb60d6dadc3744346_l`,
    mockupImages: {
      front: `${CDN}/products/380/10779_1759916354.jpg`,
    },
    variants: [
      // Black
      { id: 10779, name: "Black / S", colorName: "Black", color: "#080808", size: "S", image: `${CDN}/products/380/10779_1759916354.jpg` },
      { id: 10780, name: "Black / M", colorName: "Black", color: "#080808", size: "M", image: `${CDN}/products/380/10779_1759916354.jpg` },
      { id: 10781, name: "Black / L", colorName: "Black", color: "#080808", size: "L", image: `${CDN}/products/380/10779_1759916354.jpg` },
      { id: 10782, name: "Black / XL", colorName: "Black", color: "#080808", size: "XL", image: `${CDN}/products/380/10779_1759916354.jpg` },
      { id: 10783, name: "Black / 2XL", colorName: "Black", color: "#080808", size: "2XL", additionalPriceCents: 200, image: `${CDN}/products/380/10779_1759916354.jpg` },
      // Charcoal Heather
      { id: 11481, name: "Charcoal Heather / S", colorName: "Charcoal Heather", color: "#463e3d", size: "S", image: `${CDN}/products/380/11481_1759916354.jpg` },
      { id: 11482, name: "Charcoal Heather / M", colorName: "Charcoal Heather", color: "#463e3d", size: "M", image: `${CDN}/products/380/11481_1759916354.jpg` },
      { id: 11483, name: "Charcoal Heather / L", colorName: "Charcoal Heather", color: "#463e3d", size: "L", image: `${CDN}/products/380/11481_1759916354.jpg` },
      { id: 11484, name: "Charcoal Heather / XL", colorName: "Charcoal Heather", color: "#463e3d", size: "XL", image: `${CDN}/products/380/11481_1759916354.jpg` },
      { id: 11485, name: "Charcoal Heather / 2XL", colorName: "Charcoal Heather", color: "#463e3d", size: "2XL", additionalPriceCents: 200, image: `${CDN}/products/380/11481_1759916354.jpg` },
      // Bone
      { id: 20284, name: "Bone / S", colorName: "Bone", color: "#f5e8ce", size: "S", image: `${CDN}/products/380/20284_1759916354.jpg` },
      { id: 20285, name: "Bone / M", colorName: "Bone", color: "#f5e8ce", size: "M", image: `${CDN}/products/380/20284_1759916354.jpg` },
      { id: 20286, name: "Bone / L", colorName: "Bone", color: "#f5e8ce", size: "L", image: `${CDN}/products/380/20284_1759916354.jpg` },
      { id: 20287, name: "Bone / XL", colorName: "Bone", color: "#f5e8ce", size: "XL", image: `${CDN}/products/380/20284_1759916354.jpg` },
      { id: 20288, name: "Bone / 2XL", colorName: "Bone", color: "#f5e8ce", size: "2XL", additionalPriceCents: 200, image: `${CDN}/products/380/20284_1759916354.jpg` },
    ],
    printAreas: {
      front: { width: 14, height: 18, x: 50, y: 35 },
      back: { width: 14, height: 18, x: 50, y: 35 },
    },
    canvasPrintArea: { x: 350, y: 300, w: 300, h: 340 },
  },
  {
    id: "snapback-hat",
    printfulId: 99, // Yupoong 6089M — Classic Snapback (embroidery)
    name: "Classic Snapback",
    category: "apparel",
    description: "Structured snapback hat with flat brim. Adjustable fit. Embroidered design.",
    basePriceCents: 1689,
    imageUrl: `${CDN}/products/99/4792_1586154802.jpg`,
    mockupImages: {
      front: `${CDN}/products/99/4792_1586154802.jpg`,
    },
    variants: [
      { id: 4792, name: "Black", colorName: "Black", color: "#2a2a2a", size: "One Size", image: `${CDN}/products/99/4792_1586154802.jpg` },
      { id: 4797, name: "Dark Grey", colorName: "Dark Grey", color: "#666061", size: "One Size", image: `${CDN}/products/99/4797_1586154846.jpg` },
      { id: 4798, name: "Dark Navy", colorName: "Dark Navy", color: "#15293a", size: "One Size", image: `${CDN}/products/99/4798_1586154944.jpg` },
      { id: 7836, name: "Heather Grey", colorName: "Heather Grey", color: "#A8A59E", size: "One Size", image: `${CDN}/products/99/7836_1586155081.jpg` },
    ],
    printAreas: {
      front: { width: 3, height: 2.5, x: 50, y: 40 },
    },
    canvasPrintArea: { x: 370, y: 330, w: 260, h: 190 },
  },

  // ===== DRINKWARE =====
  {
    id: "ceramic-mug",
    printfulId: 19, // White Glossy Mug
    name: "Classic Ceramic Mug",
    category: "drinkware",
    description: "Glossy white ceramic mug. Dishwasher and microwave safe.",
    basePriceCents: 595,
    imageUrl: `${CDN}/o/upload/product-catalog-img/8c/8c4ac4a450b8485bc8a6e041a5a23666_l`,
    mockupImages: {
      front: `${CDN}/products/19/1320_1663762583.jpg`,
    },
    variants: [
      { id: 1320, name: "11 oz", colorName: "White", color: "#FFFFFF", size: "11 oz", image: `${CDN}/products/19/1320_1663762583.jpg` },
      { id: 4830, name: "15 oz", colorName: "White", color: "#FFFFFF", size: "15 oz", additionalPriceCents: 200, image: `${CDN}/products/19/1320_1663762583.jpg` },
      { id: 16586, name: "20 oz", colorName: "White", color: "#FFFFFF", size: "20 oz", additionalPriceCents: 355, image: `${CDN}/products/19/1320_1663762583.jpg` },
    ],
    printAreas: {
      front: { width: 3.5, height: 3.5, x: 50, y: 50 },
    },
    canvasPrintArea: { x: 300, y: 330, w: 400, h: 340 },
  },
  {
    id: "travel-mug",
    printfulId: 585, // Stainless Steel Tumbler 20oz
    name: "Stainless Steel Tumbler",
    category: "drinkware",
    description: "20oz double-wall vacuum insulated tumbler. Keeps drinks hot/cold for hours.",
    basePriceCents: 2137,
    imageUrl: `${CDN}/o/upload/product-catalog-img/cf/cf742bc2278471fa6e9a74aeb76192d9_l`,
    mockupImages: {
      front: `${CDN}/products/585/15004_1651745397.jpg`,
    },
    variants: [
      { id: 15004, name: "Black / 20 oz", colorName: "Black", color: "#121214", size: "20 oz", image: `${CDN}/products/585/15004_1651745397.jpg` },
      { id: 15005, name: "White / 20 oz", colorName: "White", color: "#FFFFFF", size: "20 oz", image: `${CDN}/products/585/15005_1651745409.jpg` },
    ],
    printAreas: {
      front: { width: 4, height: 6, x: 50, y: 50 },
    },
    canvasPrintArea: { x: 340, y: 280, w: 320, h: 430 },
  },

  // ===== ACCESSORIES =====
  {
    id: "tote-bag",
    printfulId: 367, // Econscious EC8000 — Eco Tote Bag
    name: "Eco Tote Bag",
    category: "accessories",
    description: "Durable organic cotton tote. Perfect for groceries, books, gym gear.",
    basePriceCents: 1556,
    imageUrl: `${CDN}/o/upload/product-catalog-img/96/965d2ac3d059e6ec8e9a040ba30e97e4_l`,
    mockupImages: {
      front: `${CDN}/products/367/10458_1642499411.jpg`,
    },
    variants: [
      { id: 10458, name: "Oyster", colorName: "Oyster", color: "#edcea5", size: "One Size", image: `${CDN}/products/367/10458_1642499411.jpg` },
      { id: 10457, name: "Black", colorName: "Black", color: "#101010", size: "One Size", image: `${CDN}/products/367/10457_1582200790.jpg` },
    ],
    printAreas: {
      front: { width: 14, height: 16, x: 50, y: 50 },
    },
    canvasPrintArea: { x: 310, y: 330, w: 380, h: 400 },
  },
  {
    id: "phone-case",
    printfulId: 601, // Tough Case for iPhone (matte)
    name: "Tough Phone Case",
    category: "accessories",
    description: "Impact-resistant dual-layer case with matte finish. iPhone models.",
    basePriceCents: 1395,
    imageUrl: `${CDN}/o/upload/product-catalog-img/e8/e8137cb9510f23d9b446cfce126c2f58_l`,
    mockupImages: {
      front: `${CDN}/o/upload/product-catalog-img/e8/e8137cb9510f23d9b446cfce126c2f58_l`,
    },
    variants: [
      { id: 20306, name: "iPhone 16", size: "iPhone 16" },
      { id: 20308, name: "iPhone 16 Pro", size: "iPhone 16 Pro" },
      { id: 20309, name: "iPhone 16 Pro Max", size: "iPhone 16 Pro Max" },
      { id: 17715, name: "iPhone 15", size: "iPhone 15" },
      { id: 17719, name: "iPhone 15 Pro", size: "iPhone 15 Pro" },
      { id: 17721, name: "iPhone 15 Pro Max", size: "iPhone 15 Pro Max" },
      { id: 16125, name: "iPhone 14", size: "iPhone 14" },
    ],
    printAreas: {
      front: { width: 3.5, height: 7, x: 50, y: 50 },
    },
    canvasPrintArea: { x: 370, y: 200, w: 260, h: 600 },
  },

  // ===== WALL ART =====
  {
    id: "poster",
    printfulId: 1, // Enhanced Matte Paper Poster (in)
    name: "Premium Poster",
    category: "wall-art",
    description: "Museum-quality, acid-free matte paper. Vivid colors, sharp details.",
    basePriceCents: 1139,
    imageUrl: `${CDN}/o/products/1/product_1613463122.jpg`,
    mockupImages: {
      front: `${CDN}/o/products/1/product_1613463122.jpg`,
    },
    variants: [
      { id: 3876, name: '12" × 18"', size: '12" × 18"' },
      { id: 1, name: '18" × 24"', size: '18" × 24"', additionalPriceCents: 150 },
      { id: 2, name: '24" × 36"', size: '24" × 36"', additionalPriceCents: 650 },
    ],
    printAreas: {
      front: { width: 18, height: 24, x: 50, y: 50 },
    },
    canvasPrintArea: { x: 180, y: 130, w: 640, h: 740 },
  },
  {
    id: "framed-poster",
    printfulId: 2, // Enhanced Matte Paper Framed Poster (in), black frame
    name: "Framed Poster",
    category: "wall-art",
    description: "Museum-quality print in a sleek black wood frame. Ready to hang.",
    basePriceCents: 3213,
    imageUrl: `${CDN}/o/products/2/product_1613463227.jpg`,
    mockupImages: {
      front: `${CDN}/o/products/2/product_1613463227.jpg`,
    },
    variants: [
      { id: 4398, name: '12" × 18" / Black frame', size: '12" × 18"' },
      { id: 3, name: '18" × 24" / Black frame', size: '18" × 24"', additionalPriceCents: 1326 },
      { id: 4, name: '24" × 36" / Black frame', size: '24" × 36"', additionalPriceCents: 4228 },
    ],
    printAreas: {
      front: { width: 18, height: 24, x: 50, y: 50 },
    },
    canvasPrintArea: { x: 220, y: 170, w: 560, h: 660 },
  },

  // ===== HOME & LIVING =====
  {
    id: "throw-pillow",
    printfulId: 83, // All-Over Print Basic Pillow
    name: "Throw Pillow",
    category: "home-living",
    description: "All-over printed pillow with insert. Soft, durable polyester.",
    basePriceCents: 1525,
    imageUrl: `${CDN}/o/products/83/product_1573737219.jpg`,
    mockupImages: {
      front: `${CDN}/o/products/83/product_1573737219.jpg`,
    },
    variants: [
      { id: 9513, name: '20" × 12"', size: '20" × 12"' },
      { id: 4532, name: '18" × 18"', size: '18" × 18"', additionalPriceCents: 102 },
      { id: 11075, name: '22" × 22"', size: '22" × 22"', additionalPriceCents: 306 },
    ],
    printAreas: {
      front: { width: 18, height: 18, x: 50, y: 50 },
      back: { width: 18, height: 18, x: 50, y: 50 },
    },
    canvasPrintArea: { x: 230, y: 230, w: 540, h: 540 },
  },
];

// Helper to get product by ID
export function getProductById(id: string): PrintfulProduct | undefined {
  return PRINTFUL_CATALOG.find((p) => p.id === id);
}

// Helper to filter by category
export function getProductsByCategory(category: ProductCategory): PrintfulProduct[] {
  return PRINTFUL_CATALOG.filter((p) => p.category === category);
}

// ============================================================================
// VARIANT HELPERS — products carry a full size × color matrix of REAL
// Printful variant IDs; these helpers let the UI present color and size
// pickers and resolve the actual variant for ordering.
// ============================================================================

export function getUniqueColors(product: PrintfulProduct): { colorName: string; color: string; image?: string }[] {
  const seen = new Map<string, { colorName: string; color: string; image?: string }>();
  for (const v of product.variants) {
    if (v.colorName && !seen.has(v.colorName)) {
      seen.set(v.colorName, { colorName: v.colorName, color: v.color || "#ccc", image: v.image });
    }
  }
  return [...seen.values()];
}

export function getUniqueSizes(product: PrintfulProduct): string[] {
  const seen = new Set<string>();
  for (const v of product.variants) {
    if (v.size) seen.add(v.size);
  }
  return [...seen];
}

/** Resolve the concrete Printful variant for a (size, color) selection. */
export function resolveVariant(
  product: PrintfulProduct,
  size?: string | null,
  colorName?: string | null
): ProductVariant | undefined {
  return (
    product.variants.find(
      (v) =>
        (!size || v.size === size) && (!colorName || v.colorName === colorName)
    ) ?? product.variants[0]
  );
}

// ============================================================================
// DEFAULT KYNDA MERCH DESIGNS (Pre-made gallery)
// ============================================================================

export type DefaultDesign = {
  id: string;
  name: string;
  description: string;
  imageUrl: string; // Hosted in /public/images/default-designs/
  productId: string; // Which product it's designed for
  style: string; // Style category for filtering
  trending?: boolean;
  seasonal?: boolean;
};

export const DEFAULT_DESIGNS: DefaultDesign[] = [
  {
    id: "kynda-logo-classic",
    name: "Kynda Classic",
    description: "The official Kynda Coffee logo. Clean, timeless.",
    imageUrl: "/images/default-designs/kynda-logo-classic.png",
    productId: "unisex-tee",
    style: "logo",
    trending: true,
  },
  {
    id: "hill-country-sunrise",
    name: "Hill Country Sunrise",
    description: "Texas Hill Country silhouette with a warm sunrise. Organic, earthy.",
    imageUrl: "/images/default-designs/hill-country-sunrise.png",
    productId: "unisex-tee",
    style: "nature",
    trending: true,
  },
  {
    id: "minimal-coffee-cup",
    name: "Minimal Coffee Cup",
    description: "Clean line art of a coffee cup with steam. Modern, sophisticated.",
    imageUrl: "/images/default-designs/minimal-coffee-cup.png",
    productId: "ceramic-mug",
    style: "minimal",
  },
  {
    id: "vintage-roaster",
    name: "Vintage Roaster",
    description: "Retro-style coffee roaster illustration. Nostalgic, artisan.",
    imageUrl: "/images/default-designs/vintage-roaster.png",
    productId: "poster",
    style: "vintage",
    seasonal: false,
  },
  {
    id: "typography-coffee-first",
    name: "Coffee First",
    description: "Bold serif typography: 'Coffee First, Questions Later'.",
    imageUrl: "/images/default-designs/coffee-first.png",
    productId: "tote-bag",
    style: "typography",
    trending: true,
  },
  {
    id: "seasonal-pumpkin-spice",
    name: "Pumpkin Spice Season",
    description: "Autumn-themed pumpkin spice latte illustration.",
    imageUrl: "/images/default-designs/pumpkin-spice.png",
    productId: "travel-mug",
    style: "seasonal",
    seasonal: true,
  },
  {
    id: "abstract-coffee-beans",
    name: "Abstract Coffee Beans",
    description: "Scattered coffee beans in a modern abstract composition.",
    imageUrl: "/images/default-designs/abstract-beans.png",
    productId: "throw-pillow",
    style: "abstract",
  },
  {
    id: "texas-map-coffee",
    name: "Texas Coffee Trail",
    description: "Texas state outline with coffee bean path from Horseshoe Bay.",
    imageUrl: "/images/default-designs/texas-coffee-trail.png",
    productId: "poster",
    style: "nature",
    trending: true,
  },
];

// Style categories for filtering
export const STYLE_CATEGORIES = [
  { id: "logo", label: "☕ Logo", emoji: "☕" },
  { id: "nature", label: "🌿 Nature", emoji: "🌿" },
  { id: "minimal", label: "⬜ Minimal", emoji: "⬜" },
  { id: "vintage", label: "📻 Vintage", emoji: "📻" },
  { id: "typography", label: "✏️ Typography", emoji: "✏️" },
  { id: "abstract", label: "🎨 Abstract", emoji: "🎨" },
  { id: "seasonal", label: "🍂 Seasonal", emoji: "🍂" },
];

// Kynda Logo (for easy addition to any design)
export const KYND_LOGO = {
  id: "kynda-logo-sticker",
  name: "Kynda Logo",
  url: "/images/logos/kynda-logo-black.png",
  type: "sticker" as const,
};

// ============================================================================
// PRODUCT IMAGE RESOLUTION
// ============================================================================

const SUPABASE_STORAGE_BASE = "https://svfuuvaaynmcofyrkwus.supabase.co/storage/v1/object/public/mockups";

/**
 * Legacy: Supabase-hosted mockup URL (populated by /api/admin/mockups/sync).
 * Kept for back-compat; getBestProductImage no longer depends on it.
 */
export function getHostedMockupUrl(productId: string, view: "front" | "back" = "front"): string {
  return `${SUPABASE_STORAGE_BASE}/${productId}-${view}.jpg`;
}

/**
 * Build a product-scoped placeholder data-URI when no real image is available.
 */
export function getProductPlaceholderSvg(product: PrintfulProduct): string {
  const colors: Record<ProductCategory, { bg: string; accent: string }> = {
    apparel: { bg: "%232D3436", accent: "%23B4CDB8" },
    drinkware: { bg: "%231A1A2E", accent: "%23B4CDB8" },
    accessories: { bg: "%23353B48", accent: "%23B4CDB8" },
    "wall-art": { bg: "%232C3A47", accent: "%23B4CDB8" },
    "home-living": { bg: "%232F3542", accent: "%23B4CDB8" },
  };
  const c = colors[product.category];

  const icons: Record<ProductCategory, string> = {
    apparel: `<path d="M15 6l-3 3-3-3M9 6V3h6v3M6 9l3-3v15H6V9zm12 0l-3-3v15h3V9z" fill="none" stroke="${c.accent}" stroke-width="1.5"/>`,
    drinkware: `<rect x="7" y="5" width="10" height="14" rx="1" fill="none" stroke="${c.accent}" stroke-width="1.5"/><path d="M17 8h2a2 2 0 010 4h-2" fill="none" stroke="${c.accent}" stroke-width="1.5"/>`,
    accessories: `<path d="M6 8h12l-1 12H7L6 8z" fill="none" stroke="${c.accent}" stroke-width="1.5"/><path d="M9 8V5a3 3 0 016 0v3" fill="none" stroke="${c.accent}" stroke-width="1.5"/>`,
    "wall-art": `<rect x="4" y="4" width="16" height="16" rx="1" fill="none" stroke="${c.accent}" stroke-width="1.5"/><path d="M4 15l4-4 3 3 4-4 5 5" fill="none" stroke="${c.accent}" stroke-width="1.2"/>`,
    "home-living": `<rect x="4" y="8" width="16" height="10" rx="2" fill="none" stroke="${c.accent}" stroke-width="1.5"/><path d="M8 8V5M16 8V5" fill="none" stroke="${c.accent}" stroke-width="1.5"/>`,
  };

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24"><rect width="24" height="24" fill="${c.bg}"/>${icons[product.category]}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/%25/g, "%").replace(/%23/g, "#").replace(/#/g, "%23"))}`;
}

/**
 * Returns the best available image URL for a product:
 * 1. Color-matched variant photo (Printful CDN, verified live + CORS-safe)
 * 2. Product catalog photo
 */
export function getBestProductImage(
  product: PrintfulProduct,
  variant?: ProductVariant | null
): string {
  return variant?.image ?? product.mockupImages.front ?? product.imageUrl;
}
