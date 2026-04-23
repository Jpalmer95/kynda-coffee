export const metadata = {
  title: "Menu | Kynda Coffee",
  description: "Organic specialty coffee and scratch kitchen in Horseshoe Bay, Texas. Order for pickup or dine in.",
};

interface MenuItem {
  name: string;
  description: string;
  price: string;
  tags?: string[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU: MenuSection[] = [
  {
    title: "Espresso Bar",
    items: [
      { name: "Kynda Espresso", description: "Double shot, rich crema, chocolate finish", price: "$3.50", tags: ["Hot"] },
      { name: "Cortado", description: "Equal parts espresso and steamed milk", price: "$4.00", tags: ["Hot"] },
      { name: "Cappuccino", description: "Espresso with velvety microfoam", price: "$4.50", tags: ["Hot"] },
      { name: "Latte", description: "Espresso with steamed milk and light foam", price: "$5.00", tags: ["Hot", "Iced"] },
      { name: "Flat White", description: "Silky steamed milk over double espresso", price: "$4.75", tags: ["Hot"] },
      { name: "Americano", description: "Espresso diluted with hot water", price: "$3.75", tags: ["Hot", "Iced"] },
      { name: "Macchiato", description: "Espresso marked with a dollop of foam", price: "$3.75", tags: ["Hot"] },
    ],
  },
  {
    title: "Cold Drinks",
    items: [
      { name: "Cold Brew", description: "Slow-steeped for 18 hours, smooth and bold", price: "$4.50", tags: ["Iced"] },
      { name: "Nitro Cold Brew", description: "Infused with nitrogen for a creamy pour", price: "$5.50", tags: ["Iced", "Nitro"] },
      { name: "Kynda Shakerato", description: "Espresso shaken over ice with simple syrup", price: "$5.00", tags: ["Iced"] },
      { name: "Iced Latte", description: "Espresso and milk over ice", price: "$5.50", tags: ["Iced"] },
      { name: "Iced Chai", description: "House-made chai over ice with milk of choice", price: "$5.00", tags: ["Iced", "Non-Coffee"] },
      { name: "Lavender Honey Oat Latte", description: "Seasonal favorite with local honey", price: "$6.00", tags: ["Hot", "Iced", "Seasonal"] },
    ],
  },
  {
    title: "Specialty",
    items: [
      { name: "Pour Over", description: "Single-origin rotating selection", price: "$5.50", tags: ["Hot"] },
      { name: "Chemex", description: "Clean, bright brew for two", price: "$7.50", tags: ["Hot"] },
      { name: "Affogato", description: "Espresso poured over vanilla gelato", price: "$5.50", tags: ["Dessert"] },
      { name: "Golden Milk", description: "Turmeric, ginger, cinnamon, oat milk", price: "$5.00", tags: ["Hot", "Non-Coffee"] },
      { name: "Matcha Latte", description: "Ceremonial grade matcha with steamed milk", price: "$5.50", tags: ["Hot", "Iced", "Non-Coffee"] },
    ],
  },
  {
    title: "Scratch Kitchen",
    items: [
      { name: "Avocado Toast", description: "Sourdough, everything seasoning, chili flakes", price: "$9.50", tags: ["Vegan"] },
      { name: "Breakfast Burrito", description: "Eggs, cheddar, salsa, potatoes, flour tortilla", price: "$10.00", tags: [] },
      { name: "Kynda Bowl", description: "Quinoa, roasted veg, tahini, microgreens", price: "$11.00", tags: ["Vegan", "GF"] },
      { name: "Pastry Selection", description: "Rotating daily bakes from our kitchen", price: "$4.50", tags: ["Daily"] },
      { name: "Seasonal Scone", description: "Buttery, flaky, made in-house every morning", price: "$4.00", tags: ["Daily"] },
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  Hot: "bg-rust/10 text-rust",
  Iced: "bg-blue-50 text-blue-600",
  Nitro: "bg-purple-50 text-purple-600",
  "Non-Coffee": "bg-green-50 text-green-600",
  Seasonal: "bg-amber-50 text-amber-600",
  Vegan: "bg-sage/10 text-sage",
  GF: "bg-orange-50 text-orange-600",
  Daily: "bg-mocha/10 text-mocha",
  Dessert: "bg-pink-50 text-pink-600",
};

export default function MenuPage() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mb-12 text-center">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso">
            Our Menu
          </h1>
          <p className="mt-3 text-base sm:text-lg text-mocha max-w-2xl mx-auto">
            Organic specialty coffee and scratch kitchen — everything made with care in Horseshoe Bay.
          </p>
        </div>

        <div className="space-y-12">
          {MENU.map((section) => (
            <div key={section.title}>
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-espresso mb-4">
                {section.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-xl border border-latte/20 bg-white p-4 transition-all hover:shadow-md hover:border-latte/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium text-espresso">{item.name}</h3>
                      <span className="font-semibold text-espresso whitespace-nowrap">{item.price}</span>
                    </div>
                    <p className="mt-1 text-sm text-mocha">{item.description}</p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${TAG_STYLES[tag] || "bg-latte/20 text-mocha"}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Order CTA */}
        <div className="mt-12 rounded-2xl bg-espresso p-6 sm:p-8 text-center">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-cream">
            Ready to Order?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-latte/80">
            Order ahead for pickup or scan the QR code in-store.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="https://squareup.com/appointments/book/kynda-coffee"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-accent"
            >
              Order for Pickup
            </a>
            <a href="tel:+15122196781" className="btn-secondary bg-white/10 text-cream border-white/20 hover:bg-white/20">
              Call (512) 219-6781
            </a>
          </div>
        </div>

        {/* Dietary Note */}
        <p className="mt-8 text-center text-xs text-mocha">
          GF = Gluten-Free option available. Non-dairy milks: Oat, Almond, Coconut.
          Ask your barista about allergens.
        </p>
      </div>
    </section>
  );
}
