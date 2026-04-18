import Link from "next/link";
import { Coffee, Instagram, Facebook } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-latte/30 bg-espresso text-cream">
      <div className="container-max px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Coffee className="h-8 w-8 text-rust" />
              <span className="font-heading text-2xl font-bold">Kynda</span>
            </Link>
            <p className="mt-4 text-sm text-latte/70">
              Organic specialty coffee, locally roasted in the Texas Hill Country.
              Every cup tells a story.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-heading text-lg font-semibold">Explore</h4>
            <ul className="space-y-2 text-sm text-latte/70">
              <li><Link href="/menu" className="hover:text-cream transition-colors">Menu</Link></li>
              <li><Link href="/shop" className="hover:text-cream transition-colors">Shop</Link></li>
              <li><Link href="/studio" className="hover:text-cream transition-colors">Design Studio</Link></li>
              <li><Link href="/catering" className="hover:text-cream transition-colors">Catering</Link></li>
              <li><Link href="/blog" className="hover:text-cream transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="mb-4 font-heading text-lg font-semibold">Visit Us</h4>
            <address className="not-italic text-sm text-latte/70">
              <p>4315 FM 2147</p>
              <p>Horseshoe Bay, TX 78657</p>
              <p className="mt-2">
                <a href="tel:+15122196781" className="hover:text-cream transition-colors">
                  (512) 219-6781
                </a>
              </p>
              <p>
                <a href="mailto:kyndacoffee@gmail.com" className="hover:text-cream transition-colors">
                  kyndacoffee@gmail.com
                </a>
              </p>
            </address>
          </div>

          {/* Newsletter + Social */}
          <div>
            <h4 className="mb-4 font-heading text-lg font-semibold">Stay Connected</h4>
            <p className="mb-3 text-sm text-latte/70">
              Join Kynda Coffee Mail for exclusive deals and 10% off your first order.
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 rounded-lg bg-cream/10 px-3 py-2 text-sm text-cream placeholder:text-latte/50 focus:outline-none focus:ring-2 focus:ring-rust"
              />
              <button type="submit" className="btn-accent rounded-lg px-4 py-2 text-sm">
                Join
              </button>
            </form>
            <div className="mt-4 flex gap-3">
              <a
                href="https://instagram.com/kyndacoffee"
                target="_blank"
                rel="noopener noreferrer"
                className="text-latte/70 transition-colors hover:text-cream"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com/kyndacoffee"
                target="_blank"
                rel="noopener noreferrer"
                className="text-latte/70 transition-colors hover:text-cream"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-latte/20 pt-8 text-center text-xs text-latte/50">
          <p>&copy; {new Date().getFullYear()} Kynda Coffee. All rights rights reserved.</p>
          <p className="mt-1">4315 FM 2147, Horseshoe Bay, TX 78657</p>
        </div>
      </div>
    </footer>
  );
}
