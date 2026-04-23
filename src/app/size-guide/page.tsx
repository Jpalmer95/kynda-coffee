import Link from "next/link";
import { Ruler, Shirt, Coffee, Package } from "lucide-react";

export const metadata = {
  title: "Size Guide | Kynda Coffee",
  description: "Find the perfect fit for Kynda apparel, mugs, and glassware.",
};

export default function SizeGuidePage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-3xl">
        <div className="text-center">
          <Ruler className="mx-auto h-10 w-10 text-rust" aria-hidden="true" />
          <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-espresso">
            Size Guide
          </h1>
          <p className="mt-3 text-base text-mocha">
            Find your perfect fit before you order.
          </p>
        </div>

        {/* Apparel */}
        <div className="mt-10 rounded-2xl border border-latte/20 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Shirt className="h-5 w-5 text-rust" />
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Apparel (T-Shirts & Hoodies)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-latte/20 text-left text-xs font-medium uppercase tracking-wider text-mocha">
                  <th className="pb-3 pr-4">Size</th>
                  <th className="pb-3 pr-4">Chest (in)</th>
                  <th className="pb-3 pr-4">Length (in)</th>
                  <th className="pb-3">Fits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/10">
                {[
                  { size: "XS", chest: "34-36", length: "27", fit: "Slim" },
                  { size: "S", chest: "36-38", length: "28", fit: "Slim/Regular" },
                  { size: "M", chest: "38-40", length: "29", fit: "Regular" },
                  { size: "L", chest: "40-42", length: "30", fit: "Regular/Relaxed" },
                  { size: "XL", chest: "42-46", length: "31", fit: "Relaxed" },
                  { size: "2XL", chest: "46-50", length: "32", fit: "Relaxed" },
                  { size: "3XL", chest: "50-54", length: "33", fit: "Relaxed" },
                ].map((row) => (
                  <tr key={row.size}>
                    <td className="py-3 pr-4 font-medium text-espresso">{row.size}</td>
                    <td className="py-3 pr-4 text-mocha">{row.chest}</td>
                    <td className="py-3 pr-4 text-mocha">{row.length}</td>
                    <td className="py-3 text-mocha">{row.fit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-mocha">
            Our tees are pre-shrunk unisex fit. For a looser fit, size up. Hoodies run slightly oversized for comfort.
          </p>
        </div>

        {/* Mugs */}
        <div className="mt-6 rounded-2xl border border-latte/20 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Coffee className="h-5 w-5 text-rust" />
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Mugs & Glassware
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "Ceramic Mug", volume: "11 oz", dims: "3.2\" × 3.8\"", note: "Dishwasher & microwave safe" },
              { name: "Camp Mug", volume: "12 oz", dims: "3.5\" × 3.2\"", note: "Enamel-coated steel, hand wash" },
              { name: "Glass Tumbler", volume: "16 oz", dims: "3.4\" × 5.9\"", note: "Borosilicate glass with bamboo lid" },
              { name: "Whiskey Glass", volume: "10 oz", dims: "3.2\" × 3.5\"", note: "Heavy base, dishwasher safe" },
            ].map((item) => (
              <div key={item.name} className="rounded-xl border border-latte/20 bg-cream p-4">
                <p className="font-medium text-espresso">{item.name}</p>
                <p className="mt-1 text-sm text-mocha">{item.volume} · {item.dims}</p>
                <p className="mt-1 text-xs text-mocha/70">{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Totes */}
        <div className="mt-6 rounded-2xl border border-latte/20 bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Package className="h-5 w-5 text-rust" />
            <h2 className="font-heading text-xl font-semibold text-espresso">
              Tote Bags
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-latte/20 text-left text-xs font-medium uppercase tracking-wider text-mocha">
                  <th className="pb-3 pr-4">Style</th>
                  <th className="pb-3 pr-4">Dimensions</th>
                  <th className="pb-3">Material</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-latte/10">
                {[
                  { style: "Standard Tote", dims: "15\" × 16\"", material: "100% cotton canvas" },
                  { style: "Large Tote", dims: "18\" × 18\"", material: "Heavyweight cotton canvas" },
                ].map((row) => (
                  <tr key={row.style}>
                    <td className="py-3 pr-4 font-medium text-espresso">{row.style}</td>
                    <td className="py-3 pr-4 text-mocha">{row.dims}</td>
                    <td className="py-3 text-mocha">{row.material}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-mocha">
            Questions about sizing?{" "}
            <Link href="/contact" className="text-rust hover:underline">
              Contact us
            </Link>{" "}
            and we&apos;ll help you find the right fit.
          </p>
        </div>
      </div>
    </section>
  );
}
