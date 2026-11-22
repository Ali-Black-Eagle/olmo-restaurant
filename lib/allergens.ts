import type { Allergen, Dietary } from "@/prisma/seed-data";

export const ALLERGENS: { id: Allergen; label: string }[] = [
  { id: "CELERY", label: "Celery" },
  { id: "GLUTEN", label: "Gluten" },
  { id: "CRUSTACEANS", label: "Crustaceans" },
  { id: "EGGS", label: "Eggs" },
  { id: "FISH", label: "Fish" },
  { id: "LUPIN", label: "Lupin" },
  { id: "MILK", label: "Milk" },
  { id: "MOLLUSCS", label: "Molluscs" },
  { id: "MUSTARD", label: "Mustard" },
  { id: "NUTS", label: "Tree nuts" },
  { id: "PEANUTS", label: "Peanuts" },
  { id: "SESAME", label: "Sesame" },
  { id: "SOYA", label: "Soya" },
  { id: "SULPHITES", label: "Sulphites" },
];

export const allergenLabel = (a: Allergen) => ALLERGENS.find((x) => x.id === a)?.label ?? a;

export const DIETARY: { id: Dietary; label: string }[] = [
  { id: "VEGAN", label: "Vegan" },
  { id: "VEGETARIAN", label: "Vegetarian" },
  { id: "GLUTEN_FREE", label: "Gluten-free" },
];

export const dietaryLabel = (d: Dietary) => DIETARY.find((x) => x.id === d)?.label ?? d;

/** Vegan dishes count as vegetarian when someone filters for vegetarian. */
export function matchesDietary(itemDietary: Dietary[], wanted: Dietary[]): boolean {
  return wanted.every((w) => itemDietary.includes(w) || (w === "VEGETARIAN" && itemDietary.includes("VEGAN")));
}

export function matchesFilters(
  item: { allergens: Allergen[]; dietary: Dietary[] },
  wanted: Dietary[],
  excluded: Allergen[],
): boolean {
  return matchesDietary(item.dietary, wanted) && !item.allergens.some((a) => excluded.includes(a));
}
