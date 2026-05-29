// Printful Product Catalog
// Real Printful product IDs, pricing, and variants for Kynda Coffee merch

export type ProductCategory = 
  | "apparel" 
  | "drinkware" 
  | "accessories" 
  | "wall-art" 
  | "home-living";

export type PrintfulProduct = {
  id: string;
  printfulId: number;
  name: string;
  category: ProductCategory;
  description: string;
  basePriceCents: number; // Printful wholesale cost
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
};

export type ProductVariant = {
  id: number;
  name: string;
  color?: string;
  colorName?: string;
  size?: string;
  additionalPriceCents?: number;
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
// PRODUCT CATALOG
// Real Printful product IDs (as of 2026-05)
// ============================================================================

export const PRINTFUL_CATALOG: PrintfulProduct[] = [
  // ===== APPAREL =====
  {
    id: "unisex-tee",
    printfulId: 586, // Bella + Canvas 3001
    name: "Unisex Jersey Tee",
    category: "apparel",
    description: "Soft, premium cotton tee. Perfect for everyday wear.",
    basePriceCents: 1280,
    imageUrl: "https://files.cdn.printful.com/products/586/product_1713344858.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/586/white-front.png",
      back: "https://files.cdn.printful.com/mockup-generator-cdn/586/white-back.png",
    },
    variants: [
      // Sizes
      { id: 4012, name: "S", size: "S" },
      { id: 4013, name: "M", size: "M" },
      { id: 4014, name: "L", size: "L" },
      { id: 4015, name: "XL", size: "XL" },
      { id: 4016, name: "2XL", size: "2XL" },
      // Colors
      { id: 4012, name: "White", color: "#FFFFFF", colorName: "White" },
      { id: 4017, name: "Black", color: "#000000", colorName: "Black" },
      { id: 4018, name: "Heather Grey", color: "#B8B8B8", colorName: "Heather Grey" },
      { id: 4019, name: "Navy", color: "#1E2A3A", colorName: "Navy" },
    ],
    printAreas: {
      front: { width: 12, height: 16, x: 50, y: 30 },
      back: { width: 12, height: 16, x: 50, y: 30 },
    },
  },
  {
    id: "hoodie",
    printfulId: 380, // Gildan 18500
    name: "Unisex Hoodie",
    category: "apparel",
    description: "Cozy fleece hoodie. Warm, comfortable, classic fit.",
    basePriceCents: 2850,
    imageUrl: "https://files.cdn.printful.com/products/380/product_1713262884.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/380/black-front.png",
      back: "https://files.cdn.printful.com/mockup-generator-cdn/380/black-back.png",
    },
    variants: [
      { id: 6330, name: "S", size: "S" },
      { id: 6332, name: "M", size: "M" },
      { id: 6334, name: "L", size: "L" },
      { id: 6335, name: "XL", size: "XL" },
      { id: 6336, name: "2XL", size: "2XL" },
      { id: 6332, name: "Black", color: "#000000", colorName: "Black" },
      { id: 6333, name: "Navy", color: "#1E2A3A", colorName: "Navy" },
      { id: 6337, name: "Heather Grey", color: "#B8B8B8", colorName: "Heather Grey" },
    ],
    printAreas: {
      front: { width: 14, height: 18, x: 50, y: 35 },
      back: { width: 14, height: 18, x: 50, y: 35 },
    },
  },
  {
    id: "snapback-hat",
    printfulId: 505, // Yupoong 6089M
    name: "Classic Snapback",
    category: "apparel",
    description: "Structured snapback hat with flat brim. Adjustable fit.",
    basePriceCents: 1450,
    imageUrl: "https://files.cdn.printful.com/products/505/product_1713263226.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/505/black-front.png",
    },
    variants: [
      { id: 13574, name: "One Size", size: "One Size" },
      { id: 13574, name: "Black", color: "#000000", colorName: "Black" },
      { id: 13575, name: "Navy", color: "#1E2A3A", colorName: "Navy" },
      { id: 13576, name: "White", color: "#FFFFFF", colorName: "White" },
    ],
    printAreas: {
      front: { width: 3, height: 2.5, x: 50, y: 40 },
    },
  },

  // ===== DRINKWARE =====
  {
    id: "ceramic-mug",
    printfulId: 19, // 11oz Ceramic Mug
    name: "Classic Ceramic Mug",
    category: "drinkware",
    description: "11oz glossy ceramic mug. Dishwasher and microwave safe.",
    basePriceCents: 820,
    imageUrl: "https://files.cdn.printful.com/products/19/product_1713258927.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/19/white-front.png",
    },
    variants: [
      { id: 13354, name: "11oz", size: "11oz" },
      { id: 13354, name: "White", color: "#FFFFFF", colorName: "White" },
      { id: 13355, name: "Black", color: "#000000", colorName: "Black" },
    ],
    printAreas: {
      front: { width: 3.5, height: 3.5, x: 50, y: 50 },
    },
  },
  {
    id: "travel-mug",
    printfulId: 657, // 20oz Stainless Steel Tumbler
    name: "Stainless Steel Tumbler",
    category: "drinkware",
    description: "20oz double-wall vacuum insulated tumbler. Keeps drinks hot/cold for hours.",
    basePriceCents: 1850,
    imageUrl: "https://files.cdn.printful.com/products/657/product_1713264012.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/657/silver-front.png",
    },
    variants: [
      { id: 17330, name: "20oz", size: "20oz" },
      { id: 17330, name: "Silver", color: "#C0C0C0", colorName: "Silver" },
      { id: 17331, name: "Black", color: "#000000", colorName: "Black" },
    ],
    printAreas: {
      front: { width: 4, height: 6, x: 50, y: 50 },
    },
  },

  // ===== ACCESSORIES =====
  {
    id: "tote-bag",
    printfulId: 69, // Spun-Poly Tote
    name: "Canvas Tote Bag",
    category: "accessories",
    description: "Durable spun-polyester tote. Perfect for groceries, books, gym gear.",
    basePriceCents: 1250,
    imageUrl: "https://files.cdn.printful.com/products/69/product_1713266092.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/69/white-front.png",
    },
    variants: [
      { id: 4750, name: "One Size", size: "One Size" },
      { id: 4750, name: "White", color: "#FFFFFF", colorName: "White" },
      { id: 4751, name: "Black", color: "#000000", colorName: "Black" },
    ],
    printAreas: {
      front: { width: 14, height: 16, x: 50, y: 50 },
    },
  },
  {
    id: "phone-case",
    printfulId: 191, // Tough Phone Case
    name: "Tough Phone Case",
    category: "accessories",
    description: "Impact-resistant polycarbonate case with TPU inner shell.",
    basePriceCents: 1050,
    imageUrl: "https://files.cdn.printful.com/products/191/product_1713266234.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/191/iphone-15-pro-front.png",
    },
    variants: [
      { id: 9716, name: "iPhone 15 Pro", size: "iPhone 15 Pro" },
      { id: 9717, name: "iPhone 14 Pro", size: "iPhone 14 Pro" },
      { id: 9718, name: "Samsung Galaxy S24", size: "Samsung Galaxy S24" },
    ],
    printAreas: {
      front: { width: 3.5, height: 7, x: 50, y: 50 },
    },
  },

  // ===== WALL ART =====
  {
    id: "poster",
    printfulId: 1, // Premium Matte Poster
    name: "Premium Poster",
    category: "wall-art",
    description: "Museum-quality, acid-free matte paper. Vivid colors, sharp details.",
    basePriceCents: 980,
    imageUrl: "https://files.cdn.printful.com/products/1/product_1713258827.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/1/18x24-front.png",
    },
    variants: [
      { id: 2700, name: '18" × 24"', size: '18" × 24"' },
      { id: 2701, name: '12" × 18"', size: '12" × 18"' },
      { id: 2702, name: '24" × 36"', size: '24" × 36"' },
    ],
    printAreas: {
      front: { width: 18, height: 24, x: 50, y: 50 },
    },
  },
  {
    id: "framed-poster",
    printfulId: 213, // Premium Framed Poster
    name: "Framed Poster",
    category: "wall-art",
    description: "Museum-quality print in a sleek wood frame. Ready to hang.",
    basePriceCents: 3850,
    imageUrl: "https://files.cdn.printful.com/products/213/product_1713263234.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/213/18x24-black-frame-front.png",
    },
    variants: [
      { id: 9206, name: '18" × 24" / Black', size: '18" × 24"' },
      { id: 9207, name: '12" × 18" / Black', size: '12" × 18"' },
      { id: 9208, name: '24" × 36" / Black', size: '24" × 36"' },
    ],
    printAreas: {
      front: { width: 18, height: 24, x: 50, y: 50 },
    },
  },

  // ===== HOME & LIVING =====
  {
    id: "throw-pillow",
    printfulId: 229, // Premium Pillow Case
    name: "Throw Pillow",
    category: "home-living",
    description: "18\" × 18\" printed pillow case. Soft, durable polyester.",
    basePriceCents: 1450,
    imageUrl: "https://files.cdn.printful.com/products/229/product_1713263226.jpg",
    mockupImages: {
      front: "https://files.cdn.printful.com/mockup-generator-cdn/229/white-front.png",
      back: "https://files.cdn.printful.com/mockup-generator-cdn/229/white-back.png",
    },
    variants: [
      { id: 10102, name: '18" × 18"', size: '18" × 18"' },
      { id: 10102, name: "White", color: "#FFFFFF", colorName: "White" },
      { id: 10103, name: "Beige", color: "#F5F5DC", colorName: "Beige" },
    ],
    printAreas: {
      front: { width: 18, height: 18, x: 50, y: 50 },
      back: { width: 18, height: 18, x: 50, y: 50 },
    },
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
// DEFAULT KYMDA MERCH DESIGNS (Pre-made gallery)
// ============================================================================

export type DefaultDesign = {
  id: string;
  name: string;
  description: string;
  imageUrl: string; // Hosted on GitHub or Supabase Storage
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
