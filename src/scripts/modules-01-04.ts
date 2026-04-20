export interface ModuleData {
  title: string;
  slug: string;
  description: string;
  sort_order: number;
  is_required: boolean;
  lessons: {
    title: string;
    slug: string;
    content: string;
    video_url: string | null;
    video_title: string | null;
    sort_order: number;
    lesson_type: "text" | "video" | "mixed";
  }[];
  quizzes: {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
    sort_order: number;
  }[];
}

export const modules1to4: ModuleData[] = [
  {
    title: "Coffee Origins & The Seed-to-Cup Journey",
    slug: "coffee-origins",
    description: "Where coffee comes from, how geography shapes flavor, and the remarkable journey from cherry to cup.",
    sort_order: 1,
    is_required: true,
    lessons: [
      {
        title: "Where Coffee Grows: The Bean Belt",
        slug: "bean-belt",
        content: `Coffee grows in a narrow band around the equator called the "Bean Belt," roughly between the Tropics of Cancer and Capricorn. The two commercially important species are Arabica (about 60-70% of world production) and Robusta (30-40%).

Arabica thrives at higher altitudes (800-2,200 meters), prefers cooler temperatures, and produces more complex, nuanced flavors with higher acidity and less caffeine. Robusta grows at lower altitudes, tolerates heat, and delivers bolder, more bitter flavors with nearly double the caffeine.

The major growing regions each bring something unique: Ethiopian coffees often have bright, fruity, floral notes — Ethiopia is the birthplace of coffee after all. Colombian beans tend toward balanced sweetness with caramel and nutty undertones. Kenyan coffees are prized for their bold, wine-like acidity and blackcurrant notes. Brazilian beans are the workhorse — smooth, chocolatey, low acidity, and often used in espresso blends.

Understanding these origins helps you explain to customers why their Ethiopian Yirgacheffe tastes so different from a Brazilian Santos. Every cup tells the story of where it was grown.`,
        video_url: "https://www.youtube.com/embed/ZBb2bM8VtPY",
        video_title: "Where Does Coffee Come From?",
        sort_order: 1,
        lesson_type: "mixed",
      },
      {
        title: "Processing Methods: Washed, Natural, and Honey",
        slug: "processing-methods",
        content: `After cherries are picked, the coffee must be processed to remove the fruit and dry the seed (the "bean"). The method used profoundly affects the final cup.

Washed (Wet) Process: The fruit is removed mechanically before drying. This produces clean, bright, consistent flavors that showcase the bean's inherent characteristics. Most specialty coffees from Central America and East Africa use this method.

Natural (Dry) Process: The entire cherry is dried intact, then the dried fruit is removed later. This gives coffee intense fruit-forward sweetness, heavy body, and sometimes a wine-like or fermented quality. Ethiopian naturals are famous for their blueberry and strawberry notes.

Honey Process: A hybrid where some but not all of the fruit mucilage is left on the bean during drying. This creates a spectrum from white honey (less mucilage, cleaner) to black honey (most mucilage, sweetest and fruitiest). Popular in Costa Rica and El Salvador.

As a barista, knowing the processing method helps you predict and explain flavor. A natural processed coffee will taste different from a washed one even if grown on the same farm. This knowledge sets Kynda apart — we can tell our customers the story behind what they're drinking.`,
        video_url: "https://www.youtube.com/embed/kiM9M0oNvPk",
        video_title: "Coffee Processing Methods Explained",
        sort_order: 2,
        lesson_type: "mixed",
      },
      {
        title: "Specialty vs Commodity Coffee: What Makes It Special",
        slug: "specialty-vs-commodity",
        content: `The Specialty Coffee Association (SCA) defines specialty coffee as scoring 80 or above on a 100-point cupping scale. Commodity coffee is bought and sold based on market price with little regard to quality.

What makes specialty different? It starts at the farm — selective hand-picking of only ripe cherries, careful processing, proper drying to exact moisture content, and meticulous sorting to remove defects. Every step of the chain is traceable.

At Kynda, we serve specialty coffee because our customers deserve better than commodity. When you can tell a customer that their coffee was grown by a specific farmer in Guatemala at 1,600 meters elevation, picked at peak ripeness, and washed and dried with care — that transforms a $5 latte into an experience worth paying for.

Specialty coffee also means fair compensation for farmers. When quality commands a premium, farmers can invest in better practices, pay fair wages, and sustain their communities. Every cup we serve is connected to a global chain of people who care about quality.`,
        video_url: null,
        video_title: null,
        sort_order: 3,
        lesson_type: "text",
      },
    ],
    quizzes: [
      {
        question: "What is the 'Bean Belt'?",
        options: [
          "A conveyor belt in coffee processing facilities",
          "The geographic region around the equator where coffee is grown",
          "A type of coffee grinder adjustment mechanism",
          "The strip of land where coffee is roasted",
        ],
        correct_index: 1,
        explanation: "The Bean Belt is the tropical region roughly between the Tropics of Cancer and Capricorn, where coffee thrives due to the ideal combination of altitude, rainfall, and temperature.",
        sort_order: 1,
      },
      {
        question: "Which processing method tends to produce the most fruit-forward, sweet coffees?",
        options: ["Washed (Wet)", "Natural (Dry)", "Honey", "Monsooned"],
        correct_index: 1,
        explanation: "Natural processing dries the whole cherry on the bean, allowing sugars and fruit flavors to penetrate the seed. This creates intense fruit-forward sweetness, as seen in Ethiopian naturals with blueberry notes.",
        sort_order: 2,
      },
    ],
  },
  {
    title: "The Supply Chain: Farm to Roaster",
    slug: "supply-chain",
    description: "Understanding quality control from the farm through importing, roasting, and proper storage for freshness.",
    sort_order: 2,
    is_required: true,
    lessons: [
      {
        title: "Ethical Sourcing & Direct Trade",
        slug: "ethical-sourcing",
        content: `The coffee supply chain is long and complex: farmer, wet mill, dry mill, exporter, importer, roaster, café. At each step, quality can be gained or lost, and at each step, fair compensation matters.

Direct trade means the roaster buys directly from the farmer or cooperative, bypassing traditional commodity channels. This allows for higher prices paid to farmers, better quality control, and relationship-building that spans years.

At Kynda, we care about traceability. When we know our coffee comes from Finca La Esperanza in Honduras, managed by Maria Garcia, and that she uses organic practices and pays her pickers above minimum wage — we can share that story with confidence.

As a barista, you are the final link in this chain. The farmer's months of work, the careful processing, the precise roasting — all of it culminates in your hands. That responsibility should inspire you to pull every shot with care.`,
        video_url: "https://www.youtube.com/embed/jNTx8Mux6Rc",
        video_title: "Coffee Supply Chain Explained",
        sort_order: 1,
        lesson_type: "mixed",
      },
      {
        title: "Roasting: Transforming Green to Brown",
        slug: "roasting",
        content: `Green coffee beans are dense, grassy, and taste nothing like the coffee you know. Roasting is where the magic happens — heat transforms raw seeds into the aromatic, flavorful beans we grind and brew.

The roast progresses through stages: drying (removing moisture), Maillard reaction (browning and flavor development), first crack (beans expand and crack audibly — this is a light roast), development time (continued flavor development), and potentially second crack (darker roast with oil on the surface).

Light roasts preserve origin characteristics — you'll taste the terroir, the processing method, the specific variety. Medium roasts balance origin flavors with roast-developed sweetness and body. Dark roasts emphasize roast character — chocolate, caramel, smoky notes — at the expense of origin nuance.

At Kynda, we typically use medium to medium-light roasts to highlight the unique qualities of our carefully sourced beans. Understanding our roast approach helps you dial in the grinder and explain our flavor profile to customers.`,
        video_url: "https://www.youtube.com/embed/N6uCF1Cq_ps",
        video_title: "How Coffee Is Roasted",
        sort_order: 2,
        lesson_type: "mixed",
      },
      {
        title: "Freshness & Proper Storage",
        slug: "freshness-storage",
        content: `Freshness is the difference between good coffee and great coffee. Roasted coffee releases CO2 for the first 24-72 hours (degassing), then begins a gradual oxidation process that diminishes flavor.

Peak flavor window: 5-21 days post-roast for espresso, 3-14 days for filter. Before 5 days, excess CO2 causes uneven extraction. After 21 days, stale flavors begin to dominate.

Storage rules at Kynda: keep beans in airtight containers, away from light, heat, and moisture. Never refrigerate — condensation damages beans. Never freeze unless for long-term storage of sealed bags. Always check roast dates. If a bag is more than 4 weeks old, flag it for replacement.

For the grinder hopper: fill only what you'll use in a day's service. Empty and clean hoppers at close. This ensures every customer gets coffee at its best. Your attention to freshness is one of the simplest ways to maintain Kynda's quality standard.`,
        video_url: null,
        video_title: null,
        sort_order: 3,
        lesson_type: "text",
      },
    ],
    quizzes: [
      {
        question: "When is the peak flavor window for espresso beans after roasting?",
        options: [
          "Immediately after roasting",
          "1-3 days post-roast",
          "5-21 days post-roast",
          "30-60 days post-roast",
        ],
        correct_index: 2,
        explanation: "5-21 days post-roast is the sweet spot for espresso. Before 5 days, excess CO2 causes channeling and uneven extraction. After 21 days, oxidation creates stale, papery flavors.",
        sort_order: 1,
      },
    ],
  },
  {
    title: "Grinding & Dialing In",
    slug: "grinding-dialing-in",
    description: "Mastering the grinder — particle size, calibration, and the daily ritual of dialing in espresso.",
    sort_order: 3,
    is_required: true,
    lessons: [
      {
        title: "How Grinders Work: Burr Types & Particle Size",
        slug: "grinder-mechanics",
        content: `The grinder is arguably the most important piece of equipment in the café. A great grinder paired with a good machine will outperform a great machine with a mediocre grinder every time.

Burr grinders (which we use) crush beans between two abrasive surfaces at a consistent distance. Flat burrs produce very uniform particles and tend toward clarity in the cup. Conical burrs create a slightly wider distribution and can produce more body. Both are excellent when properly maintained.

Grind size directly controls extraction: finer particles = more surface area = faster/more extraction. Coarser particles = less surface area = slower/less extraction. This is the primary variable you'll adjust daily.

Key maintenance: clean burrs weekly to remove coffee oils that go rancid and contaminate flavor. Check burr alignment periodically. Replace burrs based on manufacturer guidelines (typically every 500-1,000 kg of coffee). A worn burr produces inconsistent particle sizes and poor extraction.

Your grinder is your best friend. Learn its quirks, maintain it religiously, and it will produce beautiful coffee every time.`,
        video_url: "https://www.youtube.com/embed/HT5gM_kLaNE",
        video_title: "How Coffee Grinders Work",
        sort_order: 1,
        lesson_type: "mixed",
      },
      {
        title: "The Daily Dial-In: Getting Espresso Right",
        slug: "dialing-in",
        content: `Every morning, before service begins, you must "dial in" — adjusting the grind to produce a balanced espresso shot with the current beans in current conditions.

Here is the Kynda dial-in process:

1. Pull a test shot with yesterday's grind setting.
2. Check the dose (weight of dry coffee in the portafilter) — aim for our standard recipe (typically 18g in).
3. Time the shot and measure the yield (weight of liquid out — typically 36g out for a 1:2 ratio).
4. Target: 25-30 seconds total extraction time for a balanced shot.
5. Taste it. Is it sour (under-extracted)? Grind finer. Is it bitter/astringent (over-extracted)? Grind coarser.
6. Adjust one small notch at a time. Pull another shot. Taste again.
7. Once dialed in, note the setting. Environmental factors (humidity, temperature, bean age) will shift it through the day.

The dial-in ritual is meditative. It requires patience, attention, and trust in your palate. Don't rush it. A well-dialed shot is the foundation of every drink you'll make all day.

Grind adjustment protocol: make small changes. One notch finer or coarser, then test. Big adjustments waste coffee and time.`,
        video_url: "https://www.youtube.com/embed/AIk0VciaVsE",
        video_title: "How to Dial In Espresso",
        sort_order: 2,
        lesson_type: "mixed",
      },
      {
        title: "Distribution & Tamping: Even Extraction Starts Here",
        slug: "distribution-tamping",
        content: `Even after perfect dialing in, your shot can fail if the coffee bed isn't evenly distributed and tamped. Channeling — where water finds the path of least resistance through the puck — is the enemy of even extraction.

Distribution: Before tamping, ensure coffee is evenly spread in the portafilter. Use a WDT tool (Weiss Distribution Technique — a fine needle tool) to break up clumps. Then use a distribution tool or gentle tap-and-spin to level the bed.

Tamping: Apply firm, level pressure (about 15 kg / 30 lbs of force) straight down. The tamp must be perfectly level — a tilted tamp creates an uneven bed where water flows faster through the thin side.

Common mistakes:
- Tamping unevenly (most common beginner error)
- Skipping distribution and going straight to tamp
- Using too much or too little force (consistency matters more than exact pressure)
- Not cleaning the portafilter rim (grounds on the rim prevent a proper seal)

Practice this until it's muscle memory. Your distribution and tamp are the last things you control before the water hits the coffee. Make them count.`,
        video_url: "https://www.youtube.com/embed/VS0tVgGpBPk",
        video_title: "Espresso Distribution & Tamping",
        sort_order: 3,
        lesson_type: "mixed",
      },
    ],
    quizzes: [
      {
        question: "If your espresso tastes sour, what adjustment should you make?",
        options: [
          "Grind coarser",
          "Grind finer",
          "Increase the dose",
          "Decrease the water temperature",
        ],
        correct_index: 1,
        explanation: "Sourness indicates under-extraction — the water hasn't had enough contact with the coffee to extract all the desirable flavors. Grinding finer increases surface area and slows the shot, allowing more extraction.",
        sort_order: 1,
      },
      {
        question: "What is 'channeling' in espresso extraction?",
        options: [
          "The sound the machine makes during extraction",
          "Water finding paths of least resistance through an uneven coffee puck",
          "The flow rate of water through the group head",
          "A cleaning technique for the portafilter",
        ],
        correct_index: 1,
        explanation: "Channeling occurs when water bypasses the evenly distributed coffee and rushes through gaps or weak spots in the puck. This causes over-extraction in the channel and under-extraction everywhere else, producing an unbalanced, often bitter shot.",
        sort_order: 2,
      },
    ],
  },
  {
    title: "Espresso Extraction Science",
    slug: "extraction-science",
    description: "The physics and chemistry of turning ground coffee into liquid gold — pressure, temperature, ratios, and troubleshooting.",
    sort_order: 4,
    is_required: true,
    lessons: [
      {
        title: "The Variables: Pressure, Temperature, Ratio, Time",
        slug: "extraction-variables",
        content: `Espresso extraction is controlled by four key variables. Understanding them gives you the power to diagnose and fix any shot.

Pressure: Our machines brew at 9 bars (about 130 psi). This pressure forces water through the finely ground coffee, extracting oils, sugars, acids, and solids that create espresso's concentrated, complex flavor. Too little pressure = weak, under-extracted. Too much = bitter, over-extracted.

Temperature: The ideal brew temperature is 90-96°C (194-205°F). Higher temps extract more quickly and can pull bitter compounds. Lower temps under-extract, producing sour, thin shots. Temperature stability is why high-end machines use PID controllers.

Ratio: The relationship between dry coffee in and liquid out. Our standard is 1:2 (e.g., 18g in, 36g out). A shorter ratio (1:1.5) produces a more concentrated, intense shot. A longer ratio (1:2.5) is lighter and more extracted. Different beans may call for different ratios.

Time: Shot time is the result of grind size, dose, and ratio working together. 25-30 seconds is a guideline, not a rule. A beautiful shot might pull in 22 seconds or 35 seconds — what matters is how it tastes. Time is a diagnostic tool, not a target in isolation.`,
        video_url: "https://www.youtube.com/embed/u33DJEv7fEI",
        video_title: "Espresso Extraction Variables",
        sort_order: 1,
        lesson_type: "mixed",
      },
      {
        title: "Troubleshooting: Over, Under, and Everything Between",
        slug: "troubleshooting",
        content: `When shots go wrong, systematic troubleshooting saves the day.

Sour, thin, fast shot (under-extracted):
- Grind finer
- Increase dose slightly
- Increase water temperature
- Check distribution and tamp for channeling

Bitter, harsh, astringent shot (over-extracted):
- Grind coarser
- Decrease dose slightly
- Decrease water temperature
- Check for old beans (over-aged beans can taste bitter)

Inconsistent shots (some good, some bad):
- Improve distribution technique (use WDT)
- Check tamp consistency (level, even pressure)
- Clean grinder burrs
- Verify dose weight with a scale, not volume

Gushing, blonding early:
- Grind much finer — the coffee is too coarse
- Check if beans are too fresh (less than 3 days post-roast)
- Verify portafilter basket isn't damaged

Crema assessment: good crema is golden-brown, thick, and persistent. Thin, pale crema = under-extracted. Dark, patchy crema = over-extracted. No crema = stale beans or very poor extraction.

Remember: always change one variable at a time. If you change grind AND dose AND temperature simultaneously, you'll never know what fixed it.`,
        video_url: "https://www.youtube.com/embed/XIiCmJBq_fc",
        video_title: "Espresso Troubleshooting Guide",
        sort_order: 2,
        lesson_type: "mixed",
      },
      {
        title: "Water Quality: The Forgotten Ingredient",
        slug: "water-quality",
        content: `Coffee is 98% water. The quality of your water directly determines the quality of your coffee.

Too soft (distilled/reverse osmosis with no mineral content): Water can't extract coffee compounds effectively. Flat, lifeless cups.

Too hard (high mineral content): Over-extraction, scale buildup in machines, metallic or chalky tastes.

The Specialty Coffee Association recommends water with these characteristics:
- TDS (Total Dissolved Solids): 75-250 mg/L (ideal: 150 mg/L)
- Calcium hardness: 68 mg/L
- pH: 6.5-7.5
- No chlorine taste or odor

At Kynda, we use a water filtration system designed for coffee. The filter removes chlorine and contaminants while preserving the mineral content needed for proper extraction. Never use unfiltered tap water — chlorine destroys delicate coffee aromatics.

Maintenance: water filters must be changed on schedule. A saturated filter stops working and can release trapped contaminants. Note filter change dates and follow manufacturer replacement schedules.

This is one of those invisible quality factors that separates great cafles from mediocre ones. Customers will never notice good water, but they'll definitely notice bad water.`,
        video_url: null,
        video_title: null,
        sort_order: 3,
        lesson_type: "text",
      },
    ],
    quizzes: [
      {
        question: "What is the standard espresso ratio used at Kynda?",
        options: ["1:1", "1:2", "1:3", "1:4"],
        correct_index: 1,
        explanation: "Our standard 1:2 ratio (e.g., 18g dry coffee in, 36g liquid espresso out) provides the ideal balance of concentration and extraction for most of our coffees.",
        sort_order: 1,
      },
      {
        question: "What should you do FIRST when you notice your espresso shots are inconsistent?",
        options: [
          "Change the grind setting",
          "Replace the beans",
          "Check distribution and tamp technique",
          "Adjust the machine temperature",
        ],
        correct_index: 2,
        explanation: "Inconsistent shots are most commonly caused by uneven distribution and tamping. Before changing grind or other variables, ensure your puck prep is clean and consistent — use WDT, level tamp, even pressure.",
        sort_order: 2,
      },
    ],
  },
];
