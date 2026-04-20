import { ModuleData } from "./modules-01-04";

export const modules9to12: ModuleData[] = [
  {
    title: "Baking Essentials & Pastry Knowledge",
    slug: "baking-essentials",
    description: "Understanding our baked goods — handling, displaying, freshness, and basic baking principles for café service.",
    sort_order: 9,
    is_required: true,
    lessons: [
      {
        title: "Pastry Handling, Display & Freshness",
        slug: "pastry-handling",
        content: `A beautiful pastry case is an invitation. It tells customers: "We care about the details." Every item in that case should look its best.

Freshness rotation (FIFO — First In, First Out):
- New deliveries go behind existing stock. Always.
- Check dates on every item before displaying. Yesterday's croissants come out before today's go in.
- Discard anything past its display window — a stale pastry does more reputational damage than throwing it away.
- Items baked in-house: label with time baked. Most items have a 4-6 hour optimal window.

Display rules:
- Arrange items with space between them — they should look abundant, not crammed.
- Use risers or tiers to create visual depth.
- Place bestsellers at eye level.
- Keep the case clean: wipe crumbs between customers, clean glass daily.
- Temperature: pastries at room temperature. Never refrigerate croissants or muffins (kills texture).
- Use tongs or gloves when handling — never bare hands.

Upselling naturally: "Our almond croissant just came out of the oven 20 minutes ago" is more effective than "Would you like anything to eat?" Specific, enthusiastic, honest.

If a customer asks about ingredients or allergens, check the label or recipe card. Never guess.`,
        video_url: null,
        video_title: null,
        sort_order: 1,
        lesson_type: "text",
      },
      {
        title: "Baking Fundamentals: What Makes Good Pastry",
        slug: "baking-fundamentals",
        content: `Even if you're not baking from scratch, understanding baking fundamentals helps you talk knowledgeably about our products and troubleshoot issues.

Key concepts:

Flour: Provides structure. Too much flour = dry, tough pastry. Different flours (bread flour, pastry flour, AP flour) have different protein levels that affect texture.

Fat (butter, oil, shortening): Creates tenderness and flakiness. In croissants, the laminated layers of butter and dough create the signature flaky texture. Cold butter = flaky. Melted butter = chewy.

Sugar: Sweetness, browning, moisture retention. Sugar also affects texture — more sugar means a more tender, cakey product.

Eggs: Structure, richness, leavening. Egg wash on top of pastries creates that golden, shiny finish.

Leavening (yeast, baking powder, baking soda): Creates rise and airiness. Yeast (slow, fermented flavor in breads and some pastries). Baking powder/soda (quick chemical rise in muffins, scones).

Temperature matters enormously: cold butter for flaky pastry, room temperature eggs for even mixing, proper oven temperature for correct rise and browning. Even 10°C off can ruin a batch.

When customers ask "What's fresh?" or "What do you recommend?" your understanding of these principles lets you answer with confidence: "Our croissants are laminated by hand each morning — the layers come from folding cold butter into the dough multiple times." That's the kind of knowledge that elevates Kynda.`,
        video_url: "https://www.youtube.com/embed/wq0Vd5Yw1H0",
        video_title: "Baking Basics Explained",
        sort_order: 2,
        lesson_type: "mixed",
      },
    ],
    quizzes: [
      {
        question: "What does FIFO stand for in inventory management?",
        options: [
          "Fast In, Fast Out",
          "First In, First Out",
          "Fill In, Fill Out",
          "Fresh Items, Fresh Orders",
        ],
        correct_index: 1,
        explanation: "FIFO (First In, First Out) means the oldest stock gets used or sold first. This ensures freshness and prevents waste. New deliveries go behind existing stock.",
        sort_order: 1,
      },
      {
        question: "What creates the flaky layers in a croissant?",
        options: [
          "Extra sugar in the dough",
          "Laminated layers of cold butter folded into the dough",
          "Baking at a very high temperature",
          "Adding baking powder to the recipe",
        ],
        correct_index: 1,
        explanation: "Croissant flakiness comes from lamination — folding cold butter into the dough multiple times, creating alternating layers. When baked, the water in the butter creates steam that separates the layers into the characteristic flaky texture.",
        sort_order: 2,
      },
    ],
  },
  {
    title: "Mise en Place, Kitchen Etiquette & FIFO",
    slug: "mise-en-place",
    description: "The French principle of 'everything in its place' — workspace organization, cleanliness standards, and the discipline of preparation.",
    sort_order: 10,
    is_required: true,
    lessons: [
      {
        title: "Mise en Place: Everything in Its Place",
        slug: "mise-en-place",
        content: `"Mise en place" is French for "everything in its place." It's a philosophy borrowed from professional kitchens that applies perfectly to specialty coffee.

Before service begins, your station should be completely set up:
- Milk pitchers clean and positioned
- Espresso cups warmed and stacked
- Portafilters clean and dry
- Syrups, powders, and toppings within arm's reach
- Towels clean and positioned (one dry, one damp)
- Knockbox empty and clean
- Grinder hopper filled with today's beans

During service, maintain mise en place constantly:
- Wipe the steam wand after EVERY drink
- Clear spent pucks from portafilters immediately
- Restock cups when the stack gets low — not when it's empty
- Keep your workspace organized as you work, not just at the end

The philosophy behind mise en place is deeper than cleanliness. It's about respect — for your craft, your coworkers, and your customers. When your station is organized, your mind is organized. You make fewer mistakes, you move faster, and you produce better drinks.

The opposite of mise en place is chaos: cluttered stations, missing supplies, dirty equipment. Chaos leads to mistakes, stress, and poor quality. At Kynda, we choose mise en place.

Ask yourself at the start of every shift: "Is my station ready for the busiest hour of the day?" If not, you're not ready to open.`,
        video_url: "https://www.youtube.com/embed/9Ijs/reframe",
        video_title: null,
        sort_order: 1,
        lesson_type: "text",
      },
      {
        title: "Cleanliness Standards & Sanitation",
        slug: "cleanliness-standards",
        content: `Cleanliness is non-negotiable. It affects food safety, customer perception, and equipment longevity.

Daily cleaning checklist (you should know these by heart):
- Wipe all counters and surfaces with sanitizer
- Clean espresso machine: wipe exterior, backflush with detergent, clean drip tray
- Clean steam wand: purge, wipe with damp cloth after every use, deep clean at end of day
- Clean grinder: brush out retained grounds, wipe exterior
- Empty and clean knockbox
- Wash and sanitize all pitchers, spoons, and tools
- Sweep and mop the floor behind the bar
- Clean the pastry case glass
- Empty trash and recycling
- Restock napkins, sugar, stirrers

Weekly deep cleaning:
- Descale espresso machine (follow manufacturer instructions)
- Deep clean grinder burrs
- Clean behind and under all equipment
- Sanitize all storage containers
- Check and clean refrigerator shelves

Clean as you go. This is the golden rule. Don't let messes accumulate. A 10-second wipe now saves a 10-minute cleanup later. If you have a free moment during slow periods, use it to clean.

Customers notice cleanliness. A spotless bar signals professionalism and care. A dirty bar — even if the coffee is excellent — undermines trust.`,
        video_url: "https://www.youtube.com/embed/O4VF_3RzUq4",
        video_title: "Barista Cleaning Routine",
        sort_order: 2,
        lesson_type: "mixed",
      },
      {
        title: "FIFO & Inventory Discipline",
        slug: "fifo-inventory",
        content: `FIFO — First In, First Out — is one of the most important operational principles at Kynda.

For coffee beans: new bags go behind existing bags. Always check roast dates. Use the oldest beans first. If a bag is past its prime, pull it — don't serve it hoping no one will notice.

For milk: newer jugs go behind older ones. Check use-by dates daily. Opened milk gets a time/date label and is used within our safe window.

For pastries and food: same principle. New deliveries get stocked behind. Display cases rotate from back to front. Items past their quality window get removed, even if they're technically still safe to eat.

For syrups and sauces: label with date opened. Follow shelf-life guidelines. If something looks, smells, or tastes off — trust your senses and replace it.

Inventory discipline also means knowing what you have:
- Conduct regular counts of key items (beans, milk, cups, lids)
- Communicate low stock to management BEFORE you run out
- Track waste — if you're throwing away the same product repeatedly, the order quantity needs adjusting

FIFO protects our customers and our reputation. It prevents waste. It ensures every product we serve is at its best. Make it a habit, not an afterthought.`,
        video_url: null,
        video_title: null,
        sort_order: 3,
        lesson_type: "text",
      },
    ],
    quizzes: [
      {
        question: "What should you do first when you arrive for your shift?",
        options: [
          "Check your phone for messages",
          "Start making drinks immediately",
          "Set up your station with everything you need (mise en place)",
          "Chat with coworkers about the previous shift",
        ],
        correct_index: 2,
        explanation: "Mise en place — setting up your entire station before service begins — is the foundation of a smooth shift. Everything in its place means fewer mistakes, faster service, and better quality.",
        sort_order: 1,
      },
    ],
  },
  {
    title: "Product Consistency & Quality Control",
    slug: "product-consistency",
    description: "Ensuring every drink meets the same standard, every time — recipes, tasting, and the discipline of excellence.",
    sort_order: 11,
    is_required: true,
    lessons: [
      {
        title: "Consistency: Why Every Cup Matters the Same",
        slug: "consistency-philosophy",
        content: `A customer orders a cappuccino on Monday and it's perfect. They come back Wednesday and it's different. They come back Friday and it's different again. What happens? They stop coming back.

Consistency is the foundation of trust in a café. Customers return because they know what they're going to get. Your job is to make sure what they get is always excellent and always the same.

Recipe adherence:
Every drink on our menu has a specific recipe — exact doses, ratios, milk quantities, and techniques. These recipes exist for a reason. They represent the taste profile that Kynda has decided is our standard.

Don't freestyle on recipes during service. Save experimentation for training time or your own drinks. When a customer orders a latte, they should get the same latte regardless of which barista is working and regardless of what day it is.

Calibration checks throughout the day:
- Taste a shot every 1-2 hours during service
- If it drifts, adjust the grind
- Check milk temperature with a thermometer until you can judge by touch reliably

The consistency mindset: approach your 100th drink of the day with the same care as your first. This is hard. It requires discipline. But it's what separates professionals from amateurs.`,
        video_url: null,
        video_title: null,
        sort_order: 1,
        lesson_type: "text",
      },
      {
        title: "Cupping & Developing Your Palate",
        slug: "cupping-palate",
        content: `Cupping is the professional method for evaluating coffee. It's how roasters, buyers, and quality control teams assess coffee, and it's how you'll develop your palate.

Basic cupping protocol:
1. Grind coffee to a medium-coarse setting (coarser than espresso, finer than French press)
2. Place 8.25g of ground coffee in each cupping bowl
3. Pour 150ml of water at 93°C directly over the grounds
4. Let steep for 4 minutes
5. Break the crust with a spoon and inhale the aroma
6. Skim off the floating grounds
7. Slurp from the spoon — the slurp aerates the coffee across your entire palate

Evaluate: aroma, flavor, aftertaste, acidity, body, balance, sweetness, and defects.

Developing your palate is a lifelong practice. Start by identifying broad categories:
- Fruity (citrus, berry, stone fruit, tropical)
- Nutty (almond, hazelnut, peanut)
- Chocolatey (dark chocolate, milk chocolate, cocoa)
- Floral (jasmine, rose, lavender)
- Spicy (cinnamon, clove, black pepper)

As you taste more, your vocabulary expands. You'll go from "fruity" to "bright, juicy Kenyan with blackcurrant and grapefruit acidity."

Taste everything: coffees, teas, juices, foods. The more you taste, the more reference points you have, and the better you can describe and evaluate what's in the cup.`,
        video_url: "https://www.youtube.com/embed/kEZZCQTaQbs",
        video_title: "How to Cup Coffee",
        sort_order: 2,
        lesson_type: "mixed",
      },
      {
        title: "Quality Control Rituals",
        slug: "quality-control",
        content: `Quality control isn't a one-time check — it's a continuous practice woven into every shift.

Pre-shift QC:
- Pull and taste a test shot before opening
- Verify grinder setting is producing the target recipe
- Check that milk is fresh and properly stored
- Confirm all equipment is clean and functioning

In-shift QC:
- Taste a shot every 1-2 hours (or whenever something feels off)
- Visually inspect every drink before handing off — is the presentation right?
- Check milk temperature on steamed drinks until you can reliably judge by touch
- Monitor your own performance: are you rushing? Getting sloppy?

End-of-shift QC:
- Clean and backflush the espresso machine
- Report any equipment issues to management
- Check that the closing checklist is complete
- Note anything that needs attention for the next shift

Self-assessment questions:
- "Would I be proud to serve this to the owner?"
- "Is this drink what the customer ordered and expects?"
- "Am I following the recipe precisely?"

Never serve a drink you wouldn't be proud of. If something goes wrong — a bad shot, a burnt milk, a wrong pour — remake it. The cost of wasted ingredients is nothing compared to the cost of a lost customer.`,
        video_url: null,
        video_title: null,
        sort_order: 3,
        lesson_type: "text",
      },
    ],
    quizzes: [
      {
        question: "Why is consistency important in a café?",
        options: [
          "It makes the barista's job easier",
          "Customers return because they know what they're going to get",
          "It reduces the amount of coffee used",
          "It's required by health regulations",
        ],
        correct_index: 1,
        explanation: "Consistency builds trust. When a customer knows their cappuccino will taste the same every visit, regardless of who's working, they feel confident returning. Inconsistency erodes trust and drives customers away.",
        sort_order: 1,
      },
    ],
  },
  {
    title: "Leadership, Growth & The Love of Learning",
    slug: "leadership-growth",
    description: "Developing as a professional, mentoring others, and cultivating the curiosity and love of learning that defines excellence.",
    sort_order: 12,
    is_required: true,
    lessons: [
      {
        title: "Leading by Example: Every Barista Is a Leader",
        slug: "leading-by-example",
        content: `You don't need a title to be a leader. Every barista at Kynda is a leader because your actions set the standard for everyone around you.

Leading by example means:
- Arriving on time, every time
- Maintaining your station in perfect mise en place without being asked
- Cleaning up after yourself AND helping others
- Staying positive during the rush when stress is high
- Treating every customer with genuine warmth
- Giving honest, kind feedback to teammates

When a new team member sees you consistently practicing great habits, they learn by watching. When they see you cutting corners, they learn that too. You are always being observed — by coworkers, by customers, by management.

Mentorship: If you've mastered a skill, teach it. Show the new barista how to tamp. Walk them through dialing in. Share the knowledge freely. A team where everyone hoards their skills is weaker than a team where everyone shares.

Growth mindset: Treat every mistake as a lesson, not a failure. A bad shot teaches you more about extraction than a perfect one. A difficult customer teaches you more about service than an easy one. Lean into challenges — they're how you grow.

The best baristas are lifelong learners. They read about coffee. They experiment with new techniques. They attend cuppings. They ask "why?" relentlessly. This curiosity isn't just good for your career — it's good for your soul.`,
        video_url: "https://www.youtube.com/embed/SW9IEଘbEo",
        video_title: null,
        sort_order: 1,
        lesson_type: "text",
      },
      {
        title: "The Love of Learning: Curiosity as a Superpower",
        slug: "love-of-learning",
        content: `This is perhaps the most important lesson in this entire training, and it goes far beyond coffee.

The people who thrive — in any field, in life generally — are the ones who never stop being curious. They ask questions. They read. They experiment. They're not afraid to say "I don't know, but I want to find out."

At Kynda, we don't just want employees who follow recipes. We want team members who understand WHY the recipe works. Who can troubleshoot when something goes wrong because they understand the principles. Who can innovate because they've built a deep foundation of knowledge.

How to cultivate curiosity:
- Ask "why?" five times a day. Why does grinding finer slow the shot? Why does milk get sweeter when heated? Why do we serve water with espresso?
- Read about coffee, food, hospitality, science. Knowledge compounds.
- Try new coffees, new methods, new flavors. Expand your palate and your mind.
- Listen to customers. They have stories, knowledge, and perspectives you can learn from.
- Teach others. Teaching forces you to understand deeply.
- Embrace being a beginner. Every expert was once a beginner who refused to quit.

The love of learning is what turns a job into a career, a career into a calling, and a calling into a life well-lived. It's what makes you someone who doesn't just work at a coffee shop but becomes an ambassador for an entire craft.

At Kynda, we believe that by nurturing curiosity in our team, we're not just making better baristas — we're making people who will contribute positively to the world, in whatever they do. That's the real mission behind the coffee.`,
        video_url: null,
        video_title: null,
        sort_order: 2,
        lesson_type: "text",
      },
      {
        title: "Kindness as a Business Strategy (and a Way of Life)",
        slug: "kindness-strategy",
        content: `Here's a secret that the best businesses in the world understand: kindness is not soft. Kindness is powerful.

Kindness with customers: genuine warmth, patience, going the extra mile. This creates loyalty that no marketing budget can buy. A customer who feels genuinely cared for becomes an advocate. They tell their friends. They come back. They forgive mistakes.

Kindness with coworkers: supporting each other during rushes, offering help without being asked, giving constructive feedback with care, celebrating each other's wins. A kind team is a strong team. Toxicity is the fastest way to lose good people.

Kindness with yourself: learning takes time. You will make mistakes. You will have bad days. Don't beat yourself up. Acknowledge the mistake, learn from it, and move forward. Self-compassion is not weakness — it's the foundation of resilience.

Kindness with the world: every cup of fairly traded coffee supports a farmer. Every reusable cup reduces waste. Every smile sent into the world has a ripple effect you'll never see but that matters nonetheless.

At Kynda, we believe that businesses should make the world better, not just extract value from it. By treating people well — customers, coworkers, farmers, the community — we create something that matters beyond the bottom line.

This is the Kynda way. It's not just about making great coffee. It's about making great humans, one interaction at a time.

Welcome to the team. We're glad you're here. Now let's go make some amazing coffee.`,
        video_url: null,
        video_title: null,
        sort_order: 3,
        lesson_type: "text",
      },
    ],
    quizzes: [
      {
        question: "According to Kynda's philosophy, what turns a job into a career and eventually a calling?",
        options: [
          "Getting promoted to management",
          "Earning the highest salary possible",
          "Cultivating a genuine love of learning and curiosity",
          "Working the most hours",
        ],
        correct_index: 2,
        explanation: "The love of learning is what transforms a job into something meaningful. When you're genuinely curious and always growing, your work becomes a craft you're proud of — not just something you do for a paycheck.",
        sort_order: 1,
      },
      {
        question: "Why is kindness described as 'powerful' in a business context?",
        options: [
          "Because it's required by labor laws",
          "Because it creates customer loyalty and strong teams that no marketing budget can replicate",
          "Because it's easier than being strict",
          "Because it reduces employee turnover costs",
        ],
        correct_index: 1,
        explanation: "Kindness creates deep loyalty — customers who feel genuinely cared for become advocates, and coworkers who support each other form strong teams. This organic loyalty is more powerful and lasting than any marketing strategy.",
        sort_order: 2,
      },
    ],
  },
];
