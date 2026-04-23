import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, Share2, Bookmark } from "lucide-react";

const POSTS: Record<string, {
  title: string;
  date: string;
  readTime: string;
  category: string;
  content: string[];
  tags: string[];
}> = {
  "brewing-the-perfect-pour-over": {
    title: "Brewing the Perfect Pour Over",
    date: "2026-04-15",
    readTime: "6 min read",
    category: "Brewing Guides",
    content: [
      "The pour over method is beloved by coffee enthusiasts for its clarity and ability to highlight the nuanced flavors of single-origin beans. Unlike immersion brewing, where coffee steeps in water, pour over is a percolation method that creates a clean, tea-like cup.",
      "## What You Need",
      "To get started, you'll need a few key pieces of equipment: a pour over dripper (V60 or Kalita Wave), a gooseneck kettle for precise water control, a burr grinder, a digital scale, and freshly roasted coffee beans.",
      "## The Recipe",
      "Start with a 1:16 coffee-to-water ratio. For one cup, use 20g of coffee to 320g of water. Grind your beans to a medium-fine consistency, similar to sea salt. Heat your water to 200°F (93°C).",
      "## The Technique",
      "Place your dripper on your mug or server, insert the filter, and rinse it with hot water to remove paper taste and preheat the vessel. Discard the rinse water, add your ground coffee, and zero the scale.",
      "Begin with a 40g bloom pour, gently saturating all grounds. Wait 30 seconds for the coffee to degas. Then pour in slow, concentric circles, avoiding the very edges of the filter. Complete your pour by 2 minutes, and let it draw down until 3 minutes total.",
      "## Troubleshooting",
      "If your coffee tastes sour or under-extracted, try a finer grind or higher water temperature. If it's bitter or over-extracted, coarsen your grind or lower the temperature slightly. The beauty of pour over is the control it gives you.",
    ],
    tags: ["pour over", "brewing", "guide", "v60", "specialty coffee"],
  },
  "ethiopian-yirgacheffe-origin-story": {
    title: "The Origin Story: Ethiopian Yirgacheffe",
    date: "2026-04-08",
    readTime: "8 min read",
    category: "Origin Stories",
    content: [
      "Ethiopia is widely considered the birthplace of coffee. According to legend, a goat herder named Kaldi discovered coffee when he noticed his goats dancing with energy after eating berries from a particular tree.",
      "## The Yirgacheffe Region",
      "Located in the Gedeo Zone of the Sidamo region, Yirgacheffe sits at elevations between 1,700 and 2,200 meters above sea level. The high altitude, combined with rich volcanic soil and consistent rainfall, creates ideal conditions for growing exceptional Arabica coffee.",
      "## Flavor Profile",
      "Yirgacheffe coffees are renowned for their bright acidity, medium body, and complex floral and citrus notes. You might taste jasmine, lemon, bergamot, or stone fruit, depending on the specific washing station and processing method.",
      "## Processing Methods",
      "Most Yirgacheffe coffees are washed (wet-processed), which highlights the bean's inherent clarity and tea-like qualities. Natural-processed Yirgacheffes offer more intense fruit flavors and a heavier body.",
    ],
    tags: ["ethiopia", "yirgacheffe", "origin", "single origin", "africa"],
  },
  "understanding-coffee-roast-levels": {
    title: "Understanding Coffee Roast Levels",
    date: "2026-03-28",
    readTime: "5 min read",
    category: "Education",
    content: [
      "Roasting is where green coffee beans are transformed into the aromatic brown beans we know and love. The roast level dramatically affects flavor, body, acidity, and caffeine content.",
      "## Light Roast",
      "Light roasts are stopped shortly after the first crack, typically at internal temperatures between 356°F and 401°F. They retain the origin characteristics of the bean, offering bright acidity, floral and fruity notes, and a lighter body.",
      "## Medium Roast",
      "Medium roasts reach temperatures between 410°F and 428°F, ending before the second crack. They balance origin flavors with caramelization sweetness, offering more body and reduced acidity.",
      "## Dark Roast",
      "Dark roasts extend through or past the second crack, reaching 437°F to 446°F. The roast character dominates, with smoky, chocolate, and caramel flavors. Origin characteristics are largely masked.",
    ],
    tags: ["roasting", "education", "light roast", "dark roast", "flavor"],
  },
};

export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = POSTS[params.slug];
  if (!post) return { title: "Not Found" };
  return {
    title: `${post.title} — Kynda Journal`,
    description: post.content[0],
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = POSTS[params.slug];
  if (!post) return notFound();

  return (
    <article className="section-padding">
      <div className="container-max max-w-3xl">
        {/* Back Link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-mocha hover:text-espresso transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>

        {/* Header */}
        <header className="mt-6">
          <span className="inline-flex rounded-full bg-rust/10 px-3 py-1 text-xs font-medium text-rust">
            {post.category}
          </span>
          <h1 className="mt-3 font-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-espresso">
            {post.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-mocha">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(post.date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.readTime}
            </span>
          </div>
        </header>

        {/* Hero Image */}
        <div className="mt-8 aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-amber-800 to-stone-900">
          <img
            src="/images/coffee-beans.jpg"
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="mt-8 prose prose-lg max-w-none">
          {post.content.map((paragraph, i) => {
            if (paragraph.startsWith("## ")) {
              return (
                <h2 key={i} className="mt-8 mb-4 font-heading text-xl sm:text-2xl font-bold text-espresso">
                  {paragraph.replace("## ", "")}
                </h2>
              );
            }
            return (
              <p key={i} className="mb-4 text-base sm:text-lg text-mocha leading-relaxed">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Tags */}
        <div className="mt-8 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-latte/20 px-3 py-1 text-xs font-medium text-mocha capitalize"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center gap-3 border-t border-latte/20 pt-6">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-latte/20 px-4 py-2 text-sm font-medium text-mocha hover:bg-latte/10 transition-colors"
            aria-label="Share this article"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-latte/20 px-4 py-2 text-sm font-medium text-mocha hover:bg-latte/10 transition-colors"
            aria-label="Bookmark this article"
          >
            <Bookmark className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </article>
  );
}
