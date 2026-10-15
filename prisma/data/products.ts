/**
 * The demo catalog, written by hand in both languages (no lorem ipsum, nothing generated).
 * Prices are EGP and include 14% VAT; the seed converts them to qirsh.
 */
export type L = { en: string; ar: string };
export type Roast = "LIGHT" | "MEDIUM" | "DARK";

export type CategorySeed = { slug: string; name: L };
export type VariantSeed = { name: L; sku: string; price: number };
export type ProductSeed = {
  slug: string;
  category: string;
  name: L;
  description: L;
  origin?: string;
  roast?: Roast;
  notes?: string[];
  variants: VariantSeed[];
};

export const CATEGORIES: CategorySeed[] = [
  { slug: "single-origin", name: { en: "Single origin", ar: "بن مختص من مصدر واحد" } },
  { slug: "blends", name: { en: "Blends", ar: "مزيجات" } },
  { slug: "brewing-gear", name: { en: "Brewing gear", ar: "أدوات التحضير" } },
  { slug: "gift-sets", name: { en: "Gift sets", ar: "مجموعات الهدايا" } },
];

const W = {
  g250: { en: "250g", ar: "250 جم" },
  g500: { en: "500g", ar: "500 جم" },
  kg1: { en: "1kg", ar: "1 كجم" },
};
const G = {
  whole: { en: "Whole bean", ar: "حبوب كاملة" },
  espresso: { en: "Espresso grind", ar: "طحن إسبريسو" },
  filter: { en: "Filter grind", ar: "طحن فلتر" },
  turkish: { en: "Turkish grind", ar: "طحن تركي" },
};
const join = (a: L, b: L): L => ({ en: `${a.en} - ${b.en}`, ar: `${a.ar} - ${b.ar}` });

let skuN = 0;
const sku = (prefix: string) => `${prefix}-${String(++skuN).padStart(4, "0")}`;

/** 250g / 500g bags in whole bean, espresso and filter grind. `p250` is the 250g price in EGP. */
function bean(
  prefix: string,
  p250: number,
  grinds = [G.whole, G.espresso, G.filter],
): VariantSeed[] {
  return [
    [W.g250, p250],
    [W.g500, Math.round(p250 * 1.85)],
  ].flatMap(([w, price]) =>
    grinds.map((g) => ({ name: join(w as L, g), sku: sku(prefix), price: price as number })),
  );
}
const single = (name: L, price: number, prefix = "GEAR"): VariantSeed[] => [
  { name, sku: sku(prefix), price },
];

const origin = (
  slug: string,
  en: string,
  ar: string,
  country: string,
  roast: Roast,
  notes: string[],
  price: number,
  desc: L,
): ProductSeed => ({
  slug,
  category: "single-origin",
  name: { en, ar },
  description: desc,
  origin: country,
  roast,
  notes,
  variants: bean("BEAN", price),
});

export const PRODUCTS: ProductSeed[] = [
  // ---- single origin (14) ----
  origin(
    "ethiopia-yirgacheffe",
    "Ethiopia Yirgacheffe",
    "إثيوبيا يرغاتشيفي",
    "Ethiopia",
    "LIGHT",
    ["floral", "citrus", "berry"],
    360,
    {
      en: "A tea-like, floral cup with bright lemon and blueberry, from smallholders in the Gedeo zone.",
      ar: "فنجان خفيف زي الشاي، بنكهة زهور وليمون وتوت أزرق، من مزارعين صغار في منطقة جيديو.",
    },
  ),
  origin(
    "ethiopia-guji-natural",
    "Ethiopia Guji Natural",
    "إثيوبيا جوجي طبيعي",
    "Ethiopia",
    "LIGHT",
    ["berry", "tropical", "winey"],
    390,
    {
      en: "Sun-dried on raised beds: ripe strawberry, tropical fruit and a winey sweetness.",
      ar: "مجفف تحت الشمس على أسرّة مرتفعة: فراولة ناضجة وفاكهة استوائية وحلاوة قريبة من النبيذ.",
    },
  ),
  origin(
    "colombia-huila",
    "Colombia Huila",
    "كولومبيا هويلا",
    "Colombia",
    "MEDIUM",
    ["caramel", "apple", "cocoa"],
    320,
    {
      en: "Balanced and sweet: caramel body, red apple acidity and a clean cocoa finish.",
      ar: "متوازن وحلو: قوام كراميل وحموضة تفاح أحمر ونهاية كاكاو نظيفة.",
    },
  ),
  origin(
    "brazil-cerrado",
    "Brazil Cerrado",
    "البرازيل سيرادو",
    "Brazil",
    "MEDIUM",
    ["chocolate", "nutty", "caramel"],
    270,
    {
      en: "Low acidity and heavy body with milk chocolate and roasted hazelnut. Great for espresso.",
      ar: "حموضة منخفضة وقوام تقيل بطعم شوكولاتة بالحليب وبندق محمص. ممتاز للإسبريسو.",
    },
  ),
  origin(
    "kenya-aa",
    "Kenya AA",
    "كينيا AA",
    "Kenya",
    "LIGHT",
    ["blackcurrant", "citrus", "winey"],
    400,
    {
      en: "Juicy and vivid: blackcurrant, grapefruit and a syrupy sweetness.",
      ar: "عصيري وحيوي: كشمش أسود وجريب فروت وحلاوة تشبه الشراب.",
    },
  ),
  origin(
    "guatemala-antigua",
    "Guatemala Antigua",
    "غواتيمالا أنتيغوا",
    "Guatemala",
    "MEDIUM",
    ["chocolate", "spice", "orange"],
    330,
    {
      en: "Grown in volcanic soil: dark chocolate, soft spice and a hint of orange peel.",
      ar: "مزروع في تربة بركانية: شوكولاتة داكنة وتوابل ناعمة ولمسة من قشر البرتقال.",
    },
  ),
  origin(
    "costa-rica-tarrazu",
    "Costa Rica Tarrazú",
    "كوستاريكا تاراسو",
    "Costa Rica",
    "MEDIUM",
    ["honey", "apricot", "almond"],
    340,
    {
      en: "Honey-processed, smooth and sweet with apricot and toasted almond.",
      ar: "معالجة بالعسل، ناعمة وحلوة بنكهة مشمش ولوز محمص.",
    },
  ),
  origin(
    "rwanda-nyamasheke",
    "Rwanda Nyamasheke",
    "رواندا نياماشيكي",
    "Rwanda",
    "LIGHT",
    ["plum", "tea", "citrus"],
    350,
    {
      en: "Elegant and clean: ripe plum, black tea and a lively citrus finish.",
      ar: "أنيق ونظيف: برقوق ناضج وشاي أسود ونهاية حمضية منعشة.",
    },
  ),
  origin(
    "sumatra-mandheling",
    "Sumatra Mandheling",
    "سومطرة ماندهلينغ",
    "Indonesia",
    "DARK",
    ["earthy", "cedar", "dark-chocolate"],
    300,
    {
      en: "Full body, low acidity and deep earthy notes of cedar and dark chocolate.",
      ar: "قوام كامل وحموضة منخفضة ونكهات ترابية عميقة من خشب الأرز والشوكولاتة الداكنة.",
    },
  ),
  origin(
    "honduras-marcala",
    "Honduras Marcala",
    "هندوراس ماركالا",
    "Honduras",
    "MEDIUM",
    ["peach", "caramel", "cocoa"],
    310,
    {
      en: "Soft and fruity: ripe peach, brown sugar and cocoa.",
      ar: "ناعم وفاكهي: خوخ ناضج وسكر بني وكاكاو.",
    },
  ),
  origin(
    "peru-cajamarca",
    "Peru Cajamarca",
    "بيرو كاخاماركا",
    "Peru",
    "MEDIUM",
    ["cocoa", "nutty", "orange"],
    300,
    {
      en: "Organic and easy-drinking: cocoa, walnut and a gentle orange sweetness.",
      ar: "عضوي وسهل الشرب: كاكاو وعين جمل وحلاوة برتقال هادية.",
    },
  ),
  origin(
    "burundi-kayanza",
    "Burundi Kayanza",
    "بوروندي كاينزا",
    "Burundi",
    "LIGHT",
    ["red-berry", "citrus", "floral"],
    370,
    {
      en: "Bright red berries and blood orange over a delicate floral aroma.",
      ar: "توت أحمر لامع وبرتقال دموي فوق عطر زهري رقيق.",
    },
  ),
  origin(
    "panama-boquete",
    "Panama Boquete",
    "بنما بوكيتي",
    "Panama",
    "LIGHT",
    ["jasmine", "peach", "bergamot"],
    450,
    {
      en: "A refined, aromatic cup: jasmine, white peach and bergamot.",
      ar: "فنجان راقٍ وعطري: ياسمين وخوخ أبيض وبرغموت.",
    },
  ),
  origin(
    "el-salvador-santa-ana",
    "El Salvador Santa Ana",
    "السلفادور سانتا آنا",
    "El Salvador",
    "MEDIUM",
    ["chocolate", "maple", "orange"],
    320,
    {
      en: "Smooth and sweet: milk chocolate, maple syrup and a touch of orange.",
      ar: "ناعم وحلو: شوكولاتة بالحليب وشراب القيقب ولمسة برتقال.",
    },
  ),

  // ---- blends (6) ----
  {
    slug: "ember-house-blend",
    category: "blends",
    name: { en: "Ember House Blend", ar: "مزيج إمبر الخاص" },
    description: {
      en: "Our everyday blend of Brazil and Colombia: chocolate, nuts and caramel, smooth in any brew method.",
      ar: "مزيجنا اليومي من البرازيل وكولومبيا: شوكولاتة ومكسرات وكراميل، ناعم في أي طريقة تحضير.",
    },
    roast: "MEDIUM",
    notes: ["chocolate", "nutty", "caramel"],
    variants: bean("BLND", 230),
  },
  {
    slug: "espresso-classico",
    category: "blends",
    name: { en: "Espresso Classico", ar: "إسبريسو كلاسيكو" },
    description: {
      en: "Built for espresso and milk drinks: thick crema, dark chocolate and a long sweet finish.",
      ar: "مصنوع للإسبريسو ومشروبات الحليب: كريمة كثيفة وشوكولاتة داكنة ونهاية حلوة طويلة.",
    },
    roast: "DARK",
    notes: ["dark-chocolate", "caramel", "nutty"],
    variants: bean("BLND", 240, [G.whole, G.espresso]),
  },
  {
    slug: "morning-filter-blend",
    category: "blends",
    name: { en: "Morning Filter Blend", ar: "مزيج الصباح للفلتر" },
    description: {
      en: "A bright, clean blend for pour-over and batch brew, with citrus and honey sweetness.",
      ar: "مزيج منعش ونظيف للتحضير بالتنقيط، بحلاوة عسل ولمسة حمضية.",
    },
    roast: "LIGHT",
    notes: ["citrus", "honey", "floral"],
    variants: bean("BLND", 250, [G.whole, G.filter]),
  },
  {
    slug: "cairo-night-blend",
    category: "blends",
    name: { en: "Cairo Night Blend", ar: "مزيج ليل القاهرة" },
    description: {
      en: "A dark, bold roast with a smoky sweetness, made for strong cups after dinner.",
      ar: "تحميص داكن وجريء بحلاوة مدخّنة، لفناجين قوية بعد العشاء.",
    },
    roast: "DARK",
    notes: ["earthy", "dark-chocolate", "spice"],
    variants: bean("BLND", 220, [G.whole, G.espresso]),
  },
  {
    slug: "turkish-cardamom-blend",
    category: "blends",
    name: { en: "Turkish Coffee Blend", ar: "مزيج القهوة التركي" },
    description: {
      en: "Ground extra fine for the cezve, with a gentle note of cardamom. Rich, thick and aromatic.",
      ar: "مطحون ناعم جدًا للكنكة، بلمسة هادية من الهيل. غني وتقيل وعطري.",
    },
    roast: "MEDIUM",
    notes: ["spice", "cocoa", "nutty"],
    variants: bean("BLND", 200, [G.turkish]),
  },
  {
    slug: "swiss-water-decaf",
    category: "blends",
    name: { en: "Swiss Water Decaf", ar: "منزوع الكافيين (سويس ووتر)" },
    description: {
      en: "Decaffeinated without chemicals, keeping its caramel and cocoa sweetness.",
      ar: "منزوع الكافيين بدون مواد كيميائية، ومحتفظ بحلاوة الكراميل والكاكاو.",
    },
    roast: "MEDIUM",
    notes: ["caramel", "cocoa", "nutty"],
    variants: bean("BLND", 260, [G.whole, G.filter]),
  },

  // ---- brewing gear (12) ----
  {
    slug: "v60-dripper",
    category: "brewing-gear",
    name: { en: "V60 Dripper", ar: "قمع V60" },
    description: {
      en: "The classic cone dripper for clean, bright pour-over coffee. Size 02, ceramic.",
      ar: "القمع الكلاسيكي لتحضير قهوة التنقيط النظيفة. مقاس 02، سيراميك.",
    },
    variants: [
      { name: { en: "Ceramic - white", ar: "سيراميك - أبيض" }, sku: sku("GEAR"), price: 850 },
      { name: { en: "Ceramic - black", ar: "سيراميك - أسود" }, sku: sku("GEAR"), price: 850 },
    ],
  },
  {
    slug: "aeropress",
    category: "brewing-gear",
    name: { en: "AeroPress", ar: "إيروبريس" },
    description: {
      en: "Fast, forgiving and easy to carry: a rich, smooth cup in about two minutes.",
      ar: "سريع وسهل ومحمول: فنجان غني وناعم في حوالي دقيقتين.",
    },
    variants: single({ en: "Standard", ar: "قياسي" }, 1650),
  },
  {
    slug: "french-press",
    category: "brewing-gear",
    name: { en: "French Press", ar: "فرنش برس" },
    description: {
      en: "Full-bodied immersion brewing in a borosilicate carafe with a steel frame.",
      ar: "تحضير بالنقع بقوام كامل في إبريق زجاجي مقاوم للحرارة بإطار ستانلس.",
    },
    variants: [
      { name: { en: "350ml", ar: "350 مل" }, sku: sku("GEAR"), price: 750 },
      { name: { en: "1 litre", ar: "1 لتر" }, sku: sku("GEAR"), price: 1250 },
    ],
  },
  {
    slug: "moka-pot",
    category: "brewing-gear",
    name: { en: "Moka Pot", ar: "ركوة موكا" },
    description: {
      en: "Stovetop espresso-style coffee in an aluminium classic. Makes three cups.",
      ar: "قهوة بطعم الإسبريسو على النار في تصميم كلاسيكي من الألومنيوم. تعمل ثلاثة فناجين.",
    },
    variants: single({ en: "3 cups", ar: "3 فناجين" }, 690),
  },
  {
    slug: "gooseneck-kettle",
    category: "brewing-gear",
    name: { en: "Gooseneck Kettle", ar: "غلاية عنق الإوزة" },
    description: {
      en: "A precise, steady pour for pour-over. Stainless steel, 800ml.",
      ar: "صب دقيق وثابت للتنقيط. ستانلس ستيل، 800 مل.",
    },
    variants: single({ en: "800ml", ar: "800 مل" }, 1450),
  },
  {
    slug: "hand-burr-grinder",
    category: "brewing-gear",
    name: { en: "Hand Burr Grinder", ar: "مطحنة يدوية" },
    description: {
      en: "Even, adjustable grinding with steel conical burrs, from espresso to French press.",
      ar: "طحن متساوٍ وقابل للضبط بشفرات مخروطية من الستانلس، من الإسبريسو للفرنش برس.",
    },
    variants: single({ en: "Standard", ar: "قياسي" }, 2400),
  },
  {
    slug: "chemex-6-cup",
    category: "brewing-gear",
    name: { en: "Chemex 6-Cup", ar: "كيميكس 6 فناجين" },
    description: {
      en: "Hand-blown glass and thick filters for an exceptionally clear, sweet cup.",
      ar: "زجاج منفوخ يدويًا وفلاتر سميكة لفنجان صافٍ وحلو للغاية.",
    },
    variants: single({ en: "6 cups", ar: "6 فناجين" }, 2900),
  },
  {
    slug: "coffee-scale",
    category: "brewing-gear",
    name: { en: "Coffee Scale", ar: "ميزان قهوة" },
    description: {
      en: "0.1g precision with a built-in timer, so every brew is repeatable.",
      ar: "دقة 0.1 جرام مع مؤقت مدمج، فكل تحضير يتكرر بنفس النتيجة.",
    },
    variants: single({ en: "Standard", ar: "قياسي" }, 1150),
  },
  {
    slug: "cold-brew-jar",
    category: "brewing-gear",
    name: { en: "Cold Brew Jar", ar: "جرة كولد برو" },
    description: {
      en: "A sealed one-litre jar with a fine filter for smooth, low-acid cold brew.",
      ar: "جرة محكمة سعة لتر بفلتر ناعم لكولد برو ناعم وقليل الحموضة.",
    },
    variants: single({ en: "1 litre", ar: "1 لتر" }, 590),
  },
  {
    slug: "paper-filters",
    category: "brewing-gear",
    name: { en: "Paper Filters", ar: "فلاتر ورقية" },
    description: {
      en: "Unbleached cone filters that fit the V60 size 02. Pack of 100.",
      ar: "فلاتر مخروطية غير مبيّضة تناسب V60 مقاس 02. عبوة 100 قطعة.",
    },
    variants: single({ en: "Pack of 100", ar: "عبوة 100" }, 190),
  },
  {
    slug: "milk-pitcher",
    category: "brewing-gear",
    name: { en: "Milk Pitcher", ar: "إبريق حليب" },
    description: {
      en: "A stainless steel pitcher with a sharp spout, for steaming and latte art.",
      ar: "إبريق ستانلس بفوهة حادة لتبخير الحليب ورسم اللاتيه.",
    },
    variants: [
      { name: { en: "350ml", ar: "350 مل" }, sku: sku("GEAR"), price: 420 },
      { name: { en: "600ml", ar: "600 مل" }, sku: sku("GEAR"), price: 520 },
    ],
  },
  {
    slug: "coffee-tamper",
    category: "brewing-gear",
    name: { en: "Tamper", ar: "تامبر" },
    description: {
      en: "A 58mm flat tamper with a balanced steel base and a wooden handle.",
      ar: "تامبر مسطح 58 مم بقاعدة ستانلس متوازنة ومقبض خشبي.",
    },
    variants: single({ en: "58mm", ar: "58 مم" }, 480),
  },

  // ---- gift sets (8) ----
  ...(
    [
      [
        "discovery-box",
        "Discovery Box",
        "بوكس الاكتشاف",
        "Four 100g origins to find your favourite, with tasting cards.",
        "أربع أنواع بن 100 جم لاكتشاف المفضل عندك، مع كروت تذوق.",
        780,
        1,
      ],
      [
        "espresso-starter-set",
        "Espresso Starter Set",
        "طقم بداية الإسبريسو",
        "A bag of Espresso Classico, a tamper and a milk pitcher in a gift box.",
        "كيس إسبريسو كلاسيكو وتامبر وإبريق حليب في علبة هدية.",
        1250,
        2,
      ],
      [
        "pour-over-starter-set",
        "Pour-over Starter Set",
        "طقم بداية التنقيط",
        "A V60, 100 filters and a bag of Morning Filter Blend.",
        "قمع V60 و100 فلتر وكيس من مزيج الصباح للفلتر.",
        1500,
        3,
      ],
      [
        "tasting-flight",
        "Tasting Flight",
        "رحلة التذوق",
        "Three light roasts side by side, to learn how origin changes the cup.",
        "ثلاث تحميصات فاتحة جنب بعض، لتعرف إزاي المصدر بيغيّر الفنجان.",
        650,
        4,
      ],
      [
        "home-barista-set",
        "Home Barista Set",
        "طقم الباريستا المنزلي",
        "Everything for café-style coffee at home: grinder, scale and a bag of house blend.",
        "كل اللي تحتاجه لقهوة زي الكافيهات في البيت: مطحنة وميزان وكيس من المزيج الخاص.",
        3900,
        5,
      ],
      [
        "cold-brew-kit",
        "Cold Brew Kit",
        "طقم الكولد برو",
        "A cold brew jar and a coarse-ground bag, ready in 12 hours.",
        "جرة كولد برو وكيس مطحون خشن، جاهز في 12 ساعة.",
        880,
        6,
      ],
      [
        "travel-coffee-kit",
        "Travel Coffee Kit",
        "طقم القهوة للسفر",
        "An AeroPress, filters and a small hand grinder in a padded pouch.",
        "إيروبريس وفلاتر ومطحنة يدوية صغيرة في حقيبة مبطنة.",
        3600,
        7,
      ],
      [
        "light-roast-sampler",
        "Light Roast Sampler",
        "عيّنات التحميص الفاتح",
        "Four 100g light roasts from Africa and Central America.",
        "أربع أنواع تحميص فاتح 100 جم من إفريقيا وأمريكا الوسطى.",
        820,
        8,
      ],
    ] as const
  ).map(([slug, en, ar, den, dar, price]): ProductSeed => ({
    slug,
    category: "gift-sets",
    name: { en, ar },
    description: { en: den, ar: dar },
    variants: [{ name: { en: "Gift box", ar: "علبة هدية" }, sku: sku("GIFT"), price }],
  })),
];
