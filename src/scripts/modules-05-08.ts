import { ModuleData } from "./modules-01-04";

export const modules5to8: ModuleData[] = [
  {
    title: "Milk Science & Latte Art",
    slug: "milk-latte-art",
    description: "Understanding milk chemistry, mastering the steam wand, and creating beautiful latte art that delights every customer.",
    sort_order: 5,
    is_required: true,
    lessons: [
      {
        title: "The Science of Milk: Proteins, Fats, and Sugars",
        slug: "milk-science",
        content: `Milk is not just a white liquid — it's a complex emulsion of water, proteins, fats, sugars, and minerals. Understanding its chemistry is the foundation of great latte art.

Proteins (primarily casein and whey) are what create foam. When you introduce steam, the proteins unfold and form a web that traps air bubbles. This is called "stretching." Whole milk (3.5% fat) creates the richest, most stable microfoam because the fat rounds out the bubbles.

Lactose (milk sugar) becomes more perceptible as milk heats. This is why properly steamed milk tastes sweeter than cold milk — you're not adding sugar, you're revealing what's already there. The ideal temperature for this sweetness is 55-65°C (130-150°F).

Above 70°C (158°F), whey proteins denature and break down. This destroys the foam structure and creates a thin, bubbly texture. It also produces a burnt, cooked flavor. This is why we never steam milk above 65°C at Kynda.

Temperature target: 60-65°C (140-150°F). At this range, the milk is sweet, the foam is silky, and the proteins are stable. If you can't comfortably hold the pitcher for 3 seconds, it's too hot.`,
        video_url: "https://www.youtube.com/embed/x5nOFirDRQk",
        video_title: "The Science of Steaming Milk",
        sort_order: 1,
        lesson_type: "mixed",
      },
      {
        title: "Steaming Technique: Stretch, Spin, and Polish",
        slug: "steaming-technique",
        content: `Great latte art starts with great steamed milk. Here's the three-phase technique we use at Kynda:

Phase 1 — Stretching (introducing air):
Submerge the steam tip just below the surface. Open the steam fully. You should hear a gentle "tsss tsss" sound — this is air being incorporated. For a latte, stretch for 2-3 seconds. For a cappuccino, stretch for 4-5 seconds. The sound should be consistent, not screeching or silent.

Phase 2 — Spinning (texturing):
Once you've introduced enough air, lower the pitcher slightly so the tip is deeper. Position the pitcher at an angle to create a vortex — a whirlpool that folds the foam into the milk. This vortex is critical. It breaks up large bubbles and creates microfoam — the velvety, paint-like texture that latte art requires.

Phase 3 — Polishing:
When the pitcher is too hot to hold (about 60-65°C), shut off the steam. Tap the pitcher on the counter to pop any visible bubbles. Swirl the milk — it should look like wet white paint with a glossy sheen. If it looks like bubble bath, you stretched too much. If it looks like plain milk, you didn't stretch enough.

Practice drill: Steam milk without making a drink. Just practice the sound and texture. Do this 10 times and you'll develop the muscle memory you need.`,
        video_url: "https://www.youtube.com/embed/6YMgB61WyvE",
        video_title: "How to Steam Milk Perfectly",
        sort_order: 2,
        lesson_type: "mixed",
      },
      {
        title: "Pouring Latte Art: Heart, Rosetta, and Tulip",
        slug: "latte-art-pouring",
        content: `Latte art is the visual proof that you care about your craft. It's also the moment customers see your skill. Here are the three foundational patterns:

THE HEART (start here):
1. Start pouring from high (6 inches) to build a brown base.
2. When the cup is half full, bring the pitcher close to the surface.
3. A white dot will appear. Gently wiggle the pitcher while slowly moving backward.
4. To finish: lift the pitcher high and cut through the center with a thin stream.

THE ROSETTA:
1. Start high to build the base.
2. Lower the pitcher and begin a side-to-side wiggle as you pour.
3. The wiggle creates the "leaf" pattern. Keep it rhythmic and steady.
4. Slowly move backward while wiggling.
5. Finish by cutting through the center from back to front.

THE TULIP:
1. Pour a dot at the back of the cup. Stop.
2. Push through that dot slightly and pour a second dot.
3. Repeat — 3 to 5 layers of dots.
4. Finish by cutting through all the dots from back to front.

Key principles:
- The pitcher must be close to the surface for white to appear
- Consistent flow rate is more important than speed
- The cup should be tilted toward you, then leveled as you pour
- Practice with water and dish soap first to save milk

Latte art takes hundreds of reps to master. Every cup is a practice opportunity. Don't get discouraged — even imperfect art shows care.`,
        video_url: "https://www.youtube.com/embed/SGbO5b5pGsA",
        video_title: "Latte Art Tutorial: Heart, Rosetta, Tulip",
        sort_order: 3,
        lesson_type: "mixed",
      },
    ],
    quizzes: [
      {
        question: "At what temperature does milk protein begin to break down, ruining foam quality?",
        options: ["50°C (122°F)", "60°C (140°F)", "70°C (158°F)", "80°C (176°F)"],
        correct_index: 2,
        explanation: "Above 70°C (158°F), whey proteins denature and break down, destroying the foam structure and creating a thin, bubbly texture with a burnt taste. Our target is 60-65°C.",
        sort_order: 1,
      },
      {
        question: "What creates the 'vortex' when steaming milk?",
        options: [
          "Pouring milk from a height",
          "Angling the pitcher so the steam creates a whirlpool",
          "Holding the pitcher completely level",
          "Moving the pitcher up and down rapidly",
        ],
        correct_index: 1,
        explanation: "Angling the pitcher so the steam tip creates a whirlpool effect (vortex) is essential. This vortex folds air into the milk and breaks up large bubbles, creating the silky microfoam needed for latte art.",
        sort_order: 2,
      },
    ],
  },
  {
    title: "Alternative Milks & Dietary Awareness",
    slug: "alternative-milks",
    description: "Oat, almond, soy, coconut — how to steam and serve plant-based alternatives with the same care as dairy.",
    sort_order: 6,
    is_required: true,
    lessons: [
      {
        title: "Plant-Based Milk Guide: Properties & Techniques",
        slug: "plant-milk-guide",
        content: `Plant-based milks are not just an accommodation — they're a core part of our menu. Many customers choose them for health, ethical, or environmental reasons, and they deserve the same quality in their drinks.

Oat Milk: The champion of alternatives. Naturally sweet, creamy, and the best for latte art among plant milks. Oat milk steams similarly to dairy — it stretches well and creates stable microfoam. Use barista-edition oat milk (like Oatly Barista) which has added oils for better texture. Steam to the same temperature as dairy.

Almond Milk: Thinner and nuttier. More difficult to steam — it can become thin and bubbly. Barista editions perform better. Watch for curdling when combined with acidic coffees — pour the espresso slowly into the milk (not milk into espresso) to minimize this.

Soy Milk: Good protein content means decent foam. However, soy can curdle with very acidic espresso. Some customers avoid soy for allergy reasons. Always ask about allergies.

Coconut Milk: Very thin, poor foam quality. Best used in iced drinks or blended beverages rather than lattes. The coconut flavor pairs well with chocolate drinks.

Golden Rule: Always ask "Which milk would you like?" before assuming. Never make assumptions about dietary preferences. And always clean the steam wand thoroughly between dairy and non-dairy to prevent cross-contamination for allergy-sensitive customers.`,
        video_url: "https://www.youtube.com/embed/FPqRS9_Il_s",
        video_title: "Best Plant Milks for Coffee",
        sort_order: 1,
        lesson_type: "mixed",
      },
      {
        title: "Allergy Awareness & Cross-Contamination",
        slug: "allergy-awareness",
        content: `Food allergies can be life-threatening. As a barista, you are responsible for every drink that leaves your station.

Common allergens in our workspace: milk (dairy), tree nuts (almond, coconut), soy, and sometimes wheat (in pastries).

Protocol when a customer mentions an allergy:
1. Take it seriously. Never dismiss or minimize.
2. Confirm which allergens to avoid.
3. Use dedicated or freshly cleaned equipment.
4. Steam wand: purge and wipe before preparing a non-dairy drink. Better yet, use a separate pitcher.
5. If unsure about any ingredient, check the label or ask a manager. Never guess.

Cross-contamination happens fast: a splash of dairy milk in a pitcher used for oat milk can trigger a reaction in a lactose-intolerant or allergic customer. Cleanliness and attention are your tools.

Signs a customer may have an allergy concern: asking specific ingredient questions, requesting "dairy-free" or "nut-free," hesitating when you mention a default ingredient. In these moments, slow down and communicate clearly.`,
        video_url: null,
        video_title: null,
        sort_order: 2,
        lesson_type: "text",
      },
    ],
    quizzes: [
      {
        question: "Which plant-based milk is generally considered best for latte art?",
        options: ["Almond milk", "Coconut milk", "Oat milk", "Rice milk"],
        correct_index: 2,
        explanation: "Oat milk (especially barista editions) is the best alternative for latte art due to its natural sweetness, creamy body, and protein content that creates stable, pourable microfoam most similar to dairy.",
        sort_order: 1,
      },
    ],
  },
  {
    title: "The Art of Customer Service & Hospitality",
    slug: "customer-service",
    description: "The philosophy behind great hospitality — why we serve, how to create memorable moments, and the 'wow' factor.",
    sort_order: 7,
    is_required: true,
    lessons: [
      {
        title: "The 'Why' Behind Great Service",
        slug: "why-service",
        content: `Anyone can make coffee. What makes Kynda special is how we make people feel. This is the most important lesson in this entire training.

The "why" behind great customer service is simple: every person who walks through our door is having a day. Maybe it's a great day and they're celebrating. Maybe it's a terrible day and they need comfort. Maybe it's an ordinary day and they just want something pleasant. We don't know their story, but we can influence how the next 5 minutes of their day goes.

When you remember a regular's name and their usual order, you've told them: "You matter. You're seen." When you take an extra 30 seconds to explain the origin of today's single-origin, you've given someone a story to tell. When you smile and make eye contact during a rush, you've communicated: "You're not just a transaction."

This is not about being fake or performing. It's about genuinely caring about the person in front of you. The best baristas aren't the ones with the most technical skill — they're the ones who make customers feel like they're the most important person in the room.

At Kynda, we believe that small acts of genuine kindness ripple outward. The customer you brighten today may brighten someone else's tomorrow. That's how we make the world a little better, one cup at a time.`,
        video_url: "https://www.youtube.com/embed/3pT5gSATmcc",
        video_title: "The Power of Hospitality",
        sort_order: 1,
        lesson_type: "mixed",
      },
      {
        title: "The 'Wow' Factor: Exceeding Expectations",
        slug: "wow-factor",
        content: `Good service meets expectations. Great service exceeds them. The "wow" factor is what makes customers tell their friends about Kynda.

Practical ways to create wow moments:

1. Anticipate needs: If a customer's latte is taking a moment, offer them a glass of water without being asked. If they look like they're studying, point them to the quietest table.

2. Personalize: Remember names, remember orders, remember that someone's daughter had a soccer game last week. These details build genuine relationships.

3. Recover gracefully: Mistakes happen. A wrong order isn't a disaster — it's an opportunity. Fix it immediately, apologize sincerely, and add something extra (a cookie, a sample of something new). The recovery is often more memorable than if the mistake never happened.

4. Share knowledge enthusiastically: When a customer asks "What's good today?" don't just say "Everything." Tell them about the Ethiopian single-origin with blueberry notes. Share the story of the farm. Your enthusiasm is contagious.

5. Create rituals: Maybe you always draw a smiley face on cups for first-time visitors. Maybe you offer a tiny sample of a new pastry to regulars. Small, consistent rituals become part of your identity.

The wow factor isn't about grand gestures. It's about consistent, genuine attention to the small things that make people feel valued.`,
        video_url: null,
        video_title: null,
        sort_order: 2,
        lesson_type: "text",
      },
      {
        title: "Reading Customers: Adaptability in Service",
        slug: "reading-customers",
        content: `Not every customer wants the same interaction. Great service means adapting to the person in front of you.

The Regular: They want efficiency and warmth. They want you to know their order and acknowledge their presence. A quick "The usual?" with a smile is perfect.

The Explorer: They want guidance and stories. They'll ask questions about origins, methods, and recommendations. This is your chance to share your knowledge and passion. Take your time with them.

The Rushed Business Person: They want speed and accuracy. They don't want a 3-minute origin story — they want their double-shot oat latte, fast. Read their body language: checking their phone, looking at the door, tapping their foot.

The First-Timer: They might feel intimidated. Put them at ease. Offer a menu recommendation, explain any unfamiliar terms, make them feel welcome. "First time here? Let me know if you have any questions — I love talking about our coffees."

The Difficult Customer: They might be frustrated, impatient, or rude. This is where your character shows. Stay calm, stay kind, stay professional. Most difficult customers are having a bad day — your patience might be the best thing that happens to them.

How to read cues: eye contact (wants engagement vs. avoiding it), posture (open and relaxed vs. closed and tense), speech pace (meandering vs. clipped). Match their energy while staying warm.`,
        video_url: null,
        video_title: null,
        sort_order: 3,
        lesson_type: "text",
      },
    ],
    quizzes: [
      {
        question: "According to the Kynda philosophy, what is the 'why' behind great customer service?",
        options: [
          "To maximize tips and revenue",
          "To get good online reviews",
          "To genuinely influence how someone's day goes and show them they matter",
          "To follow company policy and avoid complaints",
        ],
        correct_index: 2,
        explanation: "At Kynda, great service is rooted in genuine care for the person in front of you. Every interaction is an opportunity to make someone's day a little better — that's the foundation of our hospitality philosophy.",
        sort_order: 1,
      },
      {
        question: "What is the best approach when a customer seems rushed and impatient?",
        options: [
          "Slow down and explain the menu thoroughly to help them appreciate the experience",
          "Match their pace — be efficient, accurate, and concise while staying warm",
          "Ignore their body language and treat them like every other customer",
          "Ask them to come back when they're less busy",
        ],
        correct_index: 1,
        explanation: "Reading customers and adapting your service style is essential. A rushed customer wants speed and accuracy — match their energy while remaining kind and professional.",
        sort_order: 2,
      },
    ],
  },
  {
    title: "Advanced Service: Rush Management & Problem Solving",
    slug: "advanced-service",
    description: "Handling peak hours, managing queues, de-escalation, and turning problems into opportunities.",
    sort_order: 8,
    is_required: true,
    lessons: [
      {
        title: "Managing the Rush: Flow, Communication, and Calm",
        slug: "rush-management",
        content: `The rush is where café teams are tested. A well-managed rush feels like a dance. A poorly managed one feels like chaos.

Preparation is everything:
- Before the rush hits, ensure all stations are stocked, backup milk is ready, cups are stacked, and the pastry case is full.
- Check that your grinder is dialed in and stable.
- Confirm your POS is working. Test the card reader.

During the rush:
- Work the queue in order. First in, first served. Always.
- Communicate with your team: "One oat cappuccino on deck!" "Working on the large mocha!"
- Stay calm. Customers can sense panic. If you're calm, they'll be patient.
- Don't sacrifice quality for speed. A wrong order takes longer to fix than doing it right the first time.
- If the line is growing, acknowledge waiting customers: "I'll be right with you!" This small acknowledgment buys enormous patience.

Queue management tips:
- Have one person dedicated to taking orders during peak if possible.
- Use a ticket system if orders exceed your memory.
- Call out completed orders clearly and repeatedly.
- Keep the pickup area clean and organized so customers can find their drinks.

After the rush: clean immediately. Restock everything. Reset the workspace. The next rush could be 20 minutes away.

Remember: the rush is temporary. The impression you leave on customers during it is permanent.`,
        video_url: null,
        video_title: null,
        sort_order: 1,
        lesson_type: "text",
      },
      {
        title: "Handling Complaints & Difficult Situations",
        slug: "complaints",
        content: `Complaints are not attacks — they're feedback disguised as frustration. How you respond defines Kynda's reputation.

The L.A.S.T. Method:
L — Listen: Let the customer speak without interrupting. Make eye contact. Nod. Show you're engaged.
A — Apologize: "I'm sorry this happened" is not an admission of fault — it's empathy. You're acknowledging their experience.
S — Solve: Fix the problem immediately. Remake the drink, offer a refund, provide a replacement. Don't argue about whose fault it is.
T — Thank: "Thank you for letting us know." This reframes the complaint as helpful feedback and leaves the customer feeling heard.

Common scenarios:
" This coffee is cold." → Remake it immediately. Check that your machine is at proper temperature.
" This doesn't taste right." → Offer to remake with a different milk or preparation. Ask what they expected.
" I've been waiting too long." → Apologize sincerely. Offer a complimentary pastry or upgrade.
" Your prices are too high." → Don't argue. Explain the quality story briefly if appropriate: "Our beans are single-origin, roasted fresh, and ethically sourced."

What NOT to do:
- Never argue with a customer
- Never blame a coworker in front of a customer
- Never make excuses
- Never dismiss a complaint as invalid

Most upset customers just want to feel heard. Give them that, and the problem usually resolves itself.`,
        video_url: "https://www.youtube.com/embed/RfS_bOSvLME",
        video_title: "Handling Customer Complaints",
        sort_order: 2,
        lesson_type: "mixed",
      },
    ],
    quizzes: [
      {
        question: "What does the L.A.S.T. method stand for in handling complaints?",
        options: [
          "Look, Assess, Solve, Transfer",
          "Listen, Apologize, Solve, Thank",
          "Learn, Accept, Suggest, Track",
          "Locate, Address, Solve, Test",
        ],
        correct_index: 1,
        explanation: "L.A.S.T. stands for Listen (without interrupting), Apologize (show empathy), Solve (fix the problem immediately), and Thank (reframe the complaint as helpful feedback).",
        sort_order: 1,
      },
    ],
  },
];
