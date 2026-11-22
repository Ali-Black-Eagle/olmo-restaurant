/**
 * Single source of truth for the demo restaurant's content. The seed script writes
 * it to the database; the site falls back to it only when no database is configured
 * (so `npm run build` works on a fresh clone).
 */
export type Allergen =
  | "CELERY"
  | "GLUTEN"
  | "CRUSTACEANS"
  | "EGGS"
  | "FISH"
  | "LUPIN"
  | "MILK"
  | "MOLLUSCS"
  | "MUSTARD"
  | "NUTS"
  | "PEANUTS"
  | "SESAME"
  | "SOYA"
  | "SULPHITES";
export type Dietary = "VEGAN" | "VEGETARIAN" | "GLUTEN_FREE";

export const settingsSeed = {
  id: 1,
  name: "Olmo",
  timezone: "Europe/London",
  slotIntervalMin: 15,
  maxPartyOnline: 8,
  bookingWindowDays: 30,
  minNoticeMin: 60,
  phone: "0117 496 0123",
  email: "hello@olmo.example",
  priceRange: "££",
  cuisine: "Wood-fired, small plates",
  address: {
    line1: "18 Pip Lane",
    line2: "",
    city: "Bristol",
    postcode: "BS1 5QT",
    country: "GB",
    lat: 51.4545,
    lng: -2.5879,
  },
  durations: [
    { maxParty: 2, minutes: 90 },
    { maxParty: 4, minutes: 105 },
    { maxParty: 6, minutes: 120 },
    { maxParty: 8, minutes: 150 },
  ],
};

export type SeedTable = { label: string; minSeats: number; maxSeats: number; zone: string };
export const tablesSeed: SeedTable[] = [
  { label: "T1", minSeats: 1, maxSeats: 2, zone: "Window" },
  { label: "T2", minSeats: 1, maxSeats: 2, zone: "Window" },
  { label: "T3", minSeats: 1, maxSeats: 2, zone: "Window" },
  { label: "T4", minSeats: 1, maxSeats: 2, zone: "Oven counter" },
  { label: "T5", minSeats: 1, maxSeats: 2, zone: "Oven counter" },
  { label: "T6", minSeats: 2, maxSeats: 4, zone: "Main room" },
  { label: "T7", minSeats: 2, maxSeats: 4, zone: "Main room" },
  { label: "T8", minSeats: 2, maxSeats: 4, zone: "Main room" },
  { label: "T9", minSeats: 2, maxSeats: 4, zone: "Main room" },
  { label: "T10", minSeats: 4, maxSeats: 6, zone: "Back room" },
  { label: "T11", minSeats: 4, maxSeats: 6, zone: "Back room" },
  { label: "T12", minSeats: 1, maxSeats: 4, zone: "Bar" },
];

/** Labels of tables that can be pushed together, with the party range they seat. */
export const combosSeed = [
  { label: "T6 + T7", tables: ["T6", "T7"], minSeats: 5, maxSeats: 8 },
  { label: "T10 + T11", tables: ["T10", "T11"], minSeats: 7, maxSeats: 12 },
];

export type SeedPeriod = { dayOfWeek: number; name: string; opensAt: string; lastSeating: string; closesAt: string };
// Tuesday (2) to Sunday (0). Monday closed.
export const periodsSeed: SeedPeriod[] = [2, 3, 4, 5, 6, 0].flatMap((dayOfWeek) => {
  const lunch: SeedPeriod = { dayOfWeek, name: "Lunch", opensAt: "12:00", lastSeating: "14:30", closesAt: "16:00" };
  const dinner: SeedPeriod =
    dayOfWeek === 0
      ? { dayOfWeek, name: "Dinner", opensAt: "17:30", lastSeating: "19:30", closesAt: "21:30" }
      : { dayOfWeek, name: "Dinner", opensAt: "17:30", lastSeating: "21:00", closesAt: "23:00" };
  return [lunch, dinner];
});

export type SeedItem = {
  slug: string;
  name: string;
  description: string;
  pricePence: number;
  image?: string;
  allergens: Allergen[];
  dietary: Dietary[];
};
export type SeedSection = { slug: string; name: string; items: SeedItem[] };

const img = (n: string) => `/images/${n}.jpg`;

export const menuSeed: SeedSection[] = [
  {
    slug: "snacks",
    name: "Snacks",
    items: [
      {
        slug: "oven-sourdough",
        name: "Oven sourdough, jammy egg and herbs",
        description: "Thick toast from the loaf we bake in the oak oven each morning, a soft-set egg, herb butter from a farm near Chew Magna.",
        pricePence: 650,
        image: img("snack-egg-avocado-toast"),
        allergens: ["GLUTEN", "MILK", "EGGS"],
        dietary: ["VEGETARIAN"],
      },
      {
        slug: "halloumi-chilli-honey",
        name: "Grilled halloumi, chilli honey",
        description: "Charred on the grate, finished with honey steeped with dried chilli and lemon thyme.",
        pricePence: 700,
        image: img("snack-grilled-plate"),
        allergens: ["MILK"],
        dietary: ["VEGETARIAN", "GLUTEN_FREE"],
      },
      {
        slug: "crudites-romesco",
        name: "Raw and roasted vegetables, romesco",
        description: "Whatever is best that week, with a smoky almond and red pepper sauce.",
        pricePence: 800,
        image: img("snack-crudites"),
        allergens: ["NUTS"],
        dietary: ["VEGAN", "GLUTEN_FREE"],
      },
      {
        slug: "oven-toastie",
        name: "Oak oven toastie",
        description: "Cheddar, caramelised onion and mustard pressed between slices of the house loaf.",
        pricePence: 750,
        image: img("snack-toastie"),
        allergens: ["GLUTEN", "MILK", "MUSTARD"],
        dietary: ["VEGETARIAN"],
      },
      {
        slug: "soft-egg-greens",
        name: "Soft egg, avocado, bitter leaves",
        description: "A six-minute egg on ember-toasted bread with lemon, chilli and olive oil.",
        pricePence: 850,
        image: img("snack-egg-bowl"),
        allergens: ["EGGS", "GLUTEN"],
        dietary: ["VEGETARIAN"],
      },
    ],
  },
  {
    slug: "from-the-oven",
    name: "From the oven",
    items: [
      {
        slug: "margherita",
        name: "Margherita",
        description: "San Marzano tomato, fior di latte, basil. Blistered in about 90 seconds at 450 degrees.",
        pricePence: 1200,
        image: img("oven-margherita"),
        allergens: ["GLUTEN", "MILK"],
        dietary: ["VEGETARIAN"],
      },
      {
        slug: "burrata-rocket",
        name: "Burrata and wild rocket",
        description: "A white base with garlic oil, torn burrata, rocket, lemon and black pepper.",
        pricePence: 1450,
        image: img("oven-burrata-rocket"),
        allergens: ["GLUTEN", "MILK"],
        dietary: ["VEGETARIAN"],
      },
      {
        slug: "potato-red-onion",
        name: "Potato, red onion, rosemary",
        description: "Thin-sliced potato, sweet onion and rosemary over mozzarella. Plain and very good.",
        pricePence: 1350,
        image: img("oven-potato-red-onion"),
        allergens: ["GLUTEN", "MILK"],
        dietary: ["VEGETARIAN"],
      },
      {
        slug: "fennel-sausage",
        name: "Fennel sausage, cherry tomato",
        description: "Pork and fennel sausage from a Bristol butcher, blistered tomatoes, chilli.",
        pricePence: 1500,
        image: img("oven-rosemary-pie"),
        allergens: ["GLUTEN", "MILK", "SULPHITES"],
        dietary: [],
      },
      {
        slug: "vegan-marinara",
        name: "Marinara",
        description: "Tomato, garlic, oregano and olive oil. No cheese, nothing missing.",
        pricePence: 1100,
        image: img("oven-margherita"),
        allergens: ["GLUTEN"],
        dietary: ["VEGAN", "VEGETARIAN"],
      },
    ],
  },
  {
    slug: "plates",
    name: "Plates",
    items: [
      {
        slug: "pork-chop",
        name: "Oak-roasted pork chop",
        description: "Dry-aged chop, crisp potatoes, purple sprouting broccoli, anchovy butter.",
        pricePence: 2300,
        image: img("plate-pork-chop"),
        allergens: ["FISH", "MILK", "SULPHITES"],
        dietary: ["GLUTEN_FREE"],
      },
      {
        slug: "salmon-salsa",
        name: "Hot-smoked salmon, apple salsa",
        description: "Brought up over the coals, with cucumber, apple and a brown butter sauce.",
        pricePence: 2200,
        image: img("plate-salmon"),
        allergens: ["FISH", "MILK"],
        dietary: ["GLUTEN_FREE"],
      },
      {
        slug: "steak-herbs",
        name: "Flat iron steak, green herbs",
        description: "Rare, sliced, with salsa verde, shallots and a handful of cress.",
        pricePence: 2400,
        image: img("plate-steak-salad"),
        allergens: ["MUSTARD", "FISH", "SULPHITES"],
        dietary: ["GLUTEN_FREE"],
      },
      {
        slug: "pork-ribs",
        name: "Slow-cooked ribs, tomato, pickles",
        description: "Eight hours at low heat, finished on the grate with a sticky glaze.",
        pricePence: 1900,
        image: img("plate-ribs"),
        allergens: ["CELERY", "MUSTARD", "SOYA", "SULPHITES"],
        dietary: [],
      },
      {
        slug: "tagliatelle-ragu",
        name: "Tagliatelle, wild mushroom ragu",
        description: "Hand-cut pasta, a slow mushroom and thyme ragu, aged hard cheese.",
        pricePence: 1700,
        image: img("plate-tagliatelle"),
        allergens: ["GLUTEN", "EGGS", "MILK", "CELERY"],
        dietary: ["VEGETARIAN"],
      },
      {
        slug: "clam-linguine",
        name: "Cornish clam linguine",
        description: "Clams, white wine, garlic, a lot of parsley and a little chilli.",
        pricePence: 2100,
        image: img("plate-clams-linguine"),
        allergens: ["GLUTEN", "MOLLUSCS", "SULPHITES", "EGGS"],
        dietary: [],
      },
      {
        slug: "pesto-farfalle",
        name: "Farfalle, basil pesto, tomato",
        description: "Pasta bows, basil and pine nut pesto, blistered tomatoes.",
        pricePence: 1600,
        image: img("plate-pesto-farfalle"),
        allergens: ["GLUTEN", "NUTS", "MILK", "EGGS"],
        dietary: ["VEGETARIAN"],
      },
      {
        slug: "pomegranate-avocado",
        name: "Winter leaves, avocado, pomegranate",
        description: "Bitter leaves, avocado, citrus and pomegranate with a toasted seed crumble.",
        pricePence: 1400,
        image: img("plate-pomegranate-salad"),
        allergens: ["SESAME"],
        dietary: ["VEGAN", "GLUTEN_FREE"],
      },
    ],
  },
  {
    slug: "sweet",
    name: "Sweet",
    items: [
      {
        slug: "strawberry-pots",
        name: "Vanilla panna cotta, strawberries",
        description: "Set just enough to wobble, with macerated strawberries and black pepper.",
        pricePence: 800,
        image: img("sweet-strawberry-pots"),
        allergens: ["MILK"],
        dietary: ["VEGETARIAN", "GLUTEN_FREE"],
      },
      {
        slug: "raspberry-cake",
        name: "Lemon and raspberry cake",
        description: "Three layers, lemon curd, mascarpone cream and fresh raspberries.",
        pricePence: 900,
        image: img("sweet-raspberry-cake"),
        allergens: ["GLUTEN", "EGGS", "MILK"],
        dietary: ["VEGETARIAN"],
      },
      {
        slug: "chocolate-cake",
        name: "Dark chocolate cake",
        description: "Rich, not sweet, with a salted caramel ganache and crème fraîche.",
        pricePence: 900,
        image: img("sweet-chocolate-cake"),
        allergens: ["GLUTEN", "EGGS", "MILK", "NUTS"],
        dietary: ["VEGETARIAN"],
      },
      {
        slug: "oven-doughnut",
        name: "Oven-warmed doughnut, chocolate",
        description: "Filled with custard and glazed with dark chocolate. Best shared, rarely is.",
        pricePence: 700,
        image: img("sweet-doughnut"),
        allergens: ["GLUTEN", "EGGS", "MILK", "SOYA"],
        dietary: ["VEGETARIAN"],
      },
    ],
  },
  {
    slug: "drinks",
    name: "Drinks",
    items: [
      {
        slug: "house-orange-wine",
        name: "House orange wine, glass",
        description: "Skin-contact Pinot Gris from the Languedoc. Dry, a little tannic, good with the oven dishes.",
        pricePence: 850,
        allergens: ["SULPHITES"],
        dietary: ["VEGAN", "GLUTEN_FREE"],
      },
      {
        slug: "house-red",
        name: "House red, glass",
        description: "Light, chilled Gamay. Pours generously.",
        pricePence: 800,
        allergens: ["SULPHITES"],
        dietary: ["VEGAN", "GLUTEN_FREE"],
      },
      {
        slug: "local-pale-ale",
        name: "Bristol pale ale, 330ml",
        description: "From a brewery under a railway arch two miles away.",
        pricePence: 550,
        allergens: ["GLUTEN"],
        dietary: ["VEGAN"],
      },
      {
        slug: "oak-negroni",
        name: "Oak negroni",
        description: "Gin, Campari, sweet vermouth, finished with a smoked orange peel.",
        pricePence: 1100,
        allergens: ["SULPHITES"],
        dietary: ["VEGAN", "GLUTEN_FREE"],
      },
      {
        slug: "elderflower-soda",
        name: "Elderflower and cucumber soda",
        description: "House cordial, cucumber, mint and soda. No alcohol.",
        pricePence: 450,
        allergens: [],
        dietary: ["VEGAN", "GLUTEN_FREE"],
      },
      {
        slug: "flat-white",
        name: "Flat white",
        description: "Roasted in Bristol, made with whole or oat milk.",
        pricePence: 380,
        allergens: ["MILK", "SOYA"],
        dietary: ["VEGETARIAN"],
      },
    ],
  },
];
