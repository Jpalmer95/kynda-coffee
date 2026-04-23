import Link from "next/link";
import { Calendar, Clock, ArrowRight, Coffee } from "lucide-react";

export const metadata = {
  title: "Kynda Blog — Coffee Culture, Brewing Guides & Stories",
  description: "Explore coffee brewing techniques, origin stories, and the latest from Kynda Coffee Roasters.",
};

const POSTS = [
  {
    slug: "brewing-the-perfect-pour-over",
    title: "Brewing the Perfect Pour Over",
    excerpt: "Master the art of pour over coffee with our step-by-step guide to achieving a clean, flavorful cup every time.",
    date: "2026-04-15",
    readTime: "6 min read",
    category: "Brewing Guides",
    image: "/images/coffee-beans.jpg",
  },
  {
    slug: "ethiopian-yirgacheffe-origin-story",
    title: "The Origin Story: Ethiopian Yirgacheffe",
    excerpt: "Journey to the birthplace of coffee and discover why Ethiopian Yirgacheffe remains the crown jewel of single-origin beans.",
    date: "2026-04-08",
    readTime: "8 min read",
    category: "Origin Stories",
    image: "/images/coffee-beans.jpg",
  },
  {
    slug: "understanding-coffee-roast-levels",
    title: "Understanding Coffee Roast Levels",
    excerpt: "From light to dark, learn how roasting transforms green coffee beans into the aromatic flavors you love.",
    date: "2026-03-28",
    readTime: "5 min read",
    category: "Education",
    image: "/images/coffee-beans.jpg",
  },
  {
    slug: "home-espresso-setup-guide",
    title: "Building Your Home Espresso Setup",
    excerpt: "Everything you need to know about choosing an espresso machine, grinder, and accessories for your home bar.",
    date: "2026-03-20",
    readTime: "10 min read",
    category: "Gear Guides",
    image: "/images/coffee-beans.jpg",
  },
  {
    slug: "sustainability-in-coffee",
    title: "Sustainability in Coffee: From Farm to Cup",
    excerpt: "How direct trade, shade-grown farming, and sustainable packaging are reshaping the coffee industry.",
    date: "2026-03-10",
    readTime: "7 min read",
    category: "Sustainability",
    image: "/images/coffee-beans.jpg",
  },
  {
    slug: "cold-brew-vs-iced-coffee",
    title: "Cold Brew vs Iced Coffee: What's the Difference?",
    excerpt: "Learn the brewing methods, flavor profiles, and caffeine content differences between these two summer favorites.",
    date: "2026-02-28",
    readTime: "4 min read",
    category: "Brewing Guides",
    image: "/images/coffee-beans.jpg",
  },
];

export default function BlogPage() {
  return (
    <section className="section-padding">
      <div className="container-max max-w-4xl">
        {/* Hero */}
        <div className="text-center">
          <Coffee className="mx-auto h-10 w-10 text-rust" />
          <h1 className="mt-4 font-heading text-3xl sm:text-4xl font-bold text-espresso">
            The Kynda Journal
          </h1>
          <p className="mt-2 text-base sm:text-lg text-mocha max-w-xl mx-auto">
            Coffee culture, brewing guides, origin stories, and everything in between.
          </p>
        </div>

        {/* Featured Post */}
        <div className="mt-10 sm:mt-12">
          <Link
            href={`/blog/${POSTS[0].slug}`}
            className="group block overflow-hidden rounded-2xl border border-latte/20 bg-white transition-all hover:shadow-lg"
          >
            <div className="grid sm:grid-cols-2">
              <div className="aspect-video sm:aspect-auto bg-gradient-to-br from-amber-800 to-stone-900">
                <img
                  src={POSTS[0].image}
                  alt={POSTS[0].title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <span className="inline-flex w-fit rounded-full bg-rust/10 px-3 py-1 text-xs font-medium text-rust">
                  {POSTS[0].category}
                </span>
                <h2 className="mt-3 font-heading text-xl sm:text-2xl font-bold text-espresso group-hover:text-rust transition-colors">
                  {POSTS[0].title}
                </h2>
                <p className="mt-2 text-sm text-mocha line-clamp-3">
                  {POSTS[0].excerpt}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-mocha/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(POSTS[0].date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {POSTS[0].readTime}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Post Grid */}
        <div className="mt-10 sm:mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {POSTS.slice(1).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-latte/20 bg-white transition-all hover:shadow-lg"
            >
              <div className="aspect-video bg-gradient-to-br from-amber-800 to-stone-900 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="inline-flex w-fit rounded-full bg-latte/20 px-2.5 py-0.5 text-xs font-medium text-mocha">
                  {post.category}
                </span>
                <h3 className="mt-2 font-heading text-base font-semibold text-espresso group-hover:text-rust transition-colors line-clamp-2">
                  {post.title}
                </h3>
                <p className="mt-1 text-sm text-mocha line-clamp-2 flex-1">
                  {post.excerpt}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-mocha/60">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(post.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {post.readTime}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-12 sm:mt-16 rounded-2xl bg-espresso p-6 sm:p-10 text-center">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-cream">
            Never Miss a Post
          </h2>
          <p className="mt-2 text-sm text-latte/70 max-w-md mx-auto">
            Subscribe to get brewing tips, new roast announcements, and exclusive offers delivered to your inbox.
          </p>
          <Link
            href="/account/notifications"
            className="btn-accent mt-6 inline-flex items-center gap-2"
          >
            Manage Notifications
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
