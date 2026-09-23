/**
 * Cafe Configuration Category Helper Utilities
 * Standardizes category parsing, formatting, and prefix handling.
 */

const CATEGORY_PREFIX_MAP = {
  cafe: "Café",
  restaurant: "Restaurant",
  lounge: "Lounge",
  shop: "Shop",
  amenity: "Amenity"
};

export const parseCategory = (rawCategory) => {
  if (!rawCategory || typeof rawCategory !== "string") return "Cafe";
  const trimmed = rawCategory.trim().toLowerCase();
  for (const key of Object.keys(CATEGORY_PREFIX_MAP)) {
    if (trimmed.includes(key)) {
      return CATEGORY_PREFIX_MAP[key];
    }
  }
  return rawCategory.trim();
};

export const formatCategory = (category) => {
  if (!category) return "Café";
  const parsed = parseCategory(category);
  return parsed === "Cafe" ? "Café" : parsed;
};

export const stripCategoryPrefix = (name, category) => {
  if (!name || typeof name !== "string") return "";
  const cat = category || parseCategory(name);
  const regex = new RegExp(`^${cat}\\s*[-:]?\\s*`, "i");
  return name.replace(regex, "").trim();
};
