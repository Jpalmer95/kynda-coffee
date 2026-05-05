import Link from "next/link";
import { Coffee, Heart, Award, MapPin, Phone, Clock, Flame } from "lucide-react";

export const metadata = {
  title: "Our Story | Kynda Coffee",
  description: "Kynda Coffee is a family-owned specialty coffee shop in Horseshoe Bay, Texas. Organic beans, scratch kitchen, and a whole lot of heart since 2020.",
};

export default function AboutPage() {
  return (
    <section className="section-padding">
      <div className="container-max">
        <div className="mx-auto max-w-3xl">
          {/* Hero */}
          <div className="text-center mb-10">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-espresso">
              Our Story
            </h1>
            <p className="mt-3 text-base sm:text-lg text-mocha">
              Built from the ground up with grit, gratitude, and great coffee.
            </p>
          </div>

          {/* Etymology Block */}
          <div className="rounded-2xl bg-espresso p-6 sm:p-8 text-center mb-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/20 mb-4">
              <Flame className="h-6 w-6 text-cream" aria-hidden="true" />
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cream tracking-wide">
              KYNDA <span className="text-latte/70 font-normal italic">/KEN-DUH/</span>
            </h2>
            <p className="mt-3 text-base sm:text-lg text-latte/80 max-w-xl mx-auto">
              To light or tend a fire. To heat a room. To kindle a flame.
            </p>
          </div>

          {/* Story Content */}
          <div className="prose prose-lg prose-espresso max-w-none text-mocha space-y-4">
            <p>
              Welcome to Kynda Coffee, a family-owned and operated specialty coffee shop
              in Horseshoe Bay, Texas. Our name, Kynda, means &ldquo;to light or tend a
              fire, to heat a room, to kindle a flame.&rdquo; It&apos;s a name that represents
              the warmth and gathering of the community coming together, and nods toward
              our Norwegian heritage. We believe that our coffee shop is more than just a
              place to grab a cup of coffee or a pastry &ndash; it&apos;s a space where people
              can come together, relax, and kindle the flame of their own growth.
            </p>
            <p>
              At Kynda Coffee, our mission is to bring the community together around the
              best possible coffee and scratch baked goods. We&apos;re passionate about
              providing a warm and comfortable atmosphere for our customers to work, relax,
              and come together in our shop each day. Whether you&apos;re here for a quick
              caffeine fix, a morning pastry, or a leisurely afternoon with friends, we
              strive to make every visit to Kynda Coffee a pleasant and memorable experience.
            </p>
            <p>
              Our commitment to quality is evident in every cup of coffee we serve. We take
              quality seriously, which is why we only use the top 5% of coffee beans in the
              world for our hand-selected micro-lot roasts. We roast our beans fresh every
              week to ensure that you always enjoy a delicious and aromatic cup of coffee.
              Our commitment to freshness means that you&apos;ll taste the full flavor and
              richness of our carefully selected beans in every sip.
            </p>
            <p>
              We offer a wide range of coffee options to suit every taste, including our
              signature blends and handpicked single origin coffees. From bold and full-bodied
              roasts to smooth and mellow blends, we have something for everyone. Our expert
              baristas take pride in their craft, and they&apos;re always happy to help you find
              the perfect coffee for your taste buds.
            </p>
            <p>
              In addition to our coffee, we also offer scratch baked goods that are made with
              the same commitment to quality as our coffee. Our breakfast and lunch paninis,
              jumbo muffins, and kolaches are made fresh every day, and our famous chocolate
              chip cookies are always a hit. We even offer gluten-free scratch baked cookies
              and paninis for our customers with dietary restrictions.
            </p>
            <p>
              If you&apos;re in the mood for something sweet, we have a wide variety of milkshakes,
              ice cream cookie sandwiches, and fruit smoothies to choose from. And for those who
              want something refreshing, our organic teas and fresh squeezed lemonade are the
              perfect option.
            </p>
            <p>
              At Kynda Coffee, we&apos;re more than just a coffee shop &ndash; we&apos;re a community.
              We believe in the power of coffee and baked goods to bring people together, to
              kindle the flame of growth in our community, and to create a warm and welcoming
              atmosphere for all. So come on in, grab a cup of coffee, and stay awhile. We
              can&apos;t wait to see you!
            </p>
          </div>

          {/* Hashtag */}
          <div className="mt-8 text-center">
            <span className="inline-block rounded-full bg-rust/10 px-4 py-2 text-sm font-semibold tracking-widest text-rust uppercase">
              #FUELYOURFIRE
            </span>
          </div>

          {/* Values */}
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-latte/20 bg-white p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/10">
                <Coffee className="h-6 w-6 text-rust" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-heading text-base font-semibold text-espresso">Organic & Specialty</h3>
              <p className="mt-1 text-sm text-mocha">Top 5% of beans, roasted locally</p>
            </div>
            <div className="rounded-xl border border-latte/20 bg-white p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/10">
                <Heart className="h-6 w-6 text-rust" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-heading text-base font-semibold text-espresso">Community First</h3>
              <p className="mt-1 text-sm text-mocha">Locally owned, community built</p>
            </div>
            <div className="rounded-xl border border-latte/20 bg-white p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rust/10">
                <Award className="h-6 w-6 text-rust" aria-hidden="true" />
              </div>
              <h3 className="mt-3 font-heading text-base font-semibold text-espresso">Zero Outside Funding</h3>
              <p className="mt-1 text-sm text-mocha">Bootstrapped with hard work</p>
            </div>
          </div>

          {/* Visit Card */}
          <div className="mt-12 rounded-2xl bg-espresso p-6 sm:p-8 text-center">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-cream">
              Visit Us in Horseshoe Bay
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 text-left sm:text-center">
              <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                <MapPin className="h-5 w-5 text-latte/70 flex-shrink-0" />
                <address className="not-italic text-sm text-latte/80">
                  <p>4315 FM 2147</p>
                  <p>Horseshoe Bay, TX 78657</p>
                </address>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                <Phone className="h-5 w-5 text-latte/70 flex-shrink-0" />
                <p className="text-sm text-latte/80">
                  <a href="tel:+15122196781" className="hover:text-cream transition-colors">
                    (512) 219-6781
                  </a>
                </p>
              </div>
              <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                <Clock className="h-5 w-5 text-latte/70 flex-shrink-0" />
                <div className="text-sm text-latte/80">
                  <p>Mon – Fri: 6:30 AM – 5:00 PM</p>
                  <p>Sat – Sun: 7:00 AM – 5:00 PM</p>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <a
                href="https://maps.google.com/?q=4315+FM+2147+Horseshoe+Bay+TX+78657"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-accent"
              >
                Get Directions
              </a>
              <Link href="/contact" className="btn-secondary bg-white/10 text-cream border-white/20 hover:bg-white/20">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
