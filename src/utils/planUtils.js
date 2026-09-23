/**
 * Plan & Charger Assignment String Parsing Utilities
 * Isolates [C:ID] pattern handling to prevent accidental corruption of plan descriptions.
 */

const CHARGER_PREFIX_REGEX = /^\[C:(\d+)\]\s*/;

/**
 * Extracts charger ID from a plan's description if embedded in [C:ID] format.
 * @param {string} description 
 * @returns {number|string|null}
 */
export const extractChargerIdFromDescription = (description) => {
  if (!description || typeof description !== "string") return null;
  const match = description.match(CHARGER_PREFIX_REGEX);
  return match ? match[1] : null;
};

/**
 * Strips the [C:ID] tag from the plan description for user-facing display.
 * @param {string} description 
 * @returns {string}
 */
export const stripChargerIdFromDescription = (description) => {
  if (!description || typeof description !== "string") return "";
  return description.replace(CHARGER_PREFIX_REGEX, "").trim();
};

/**
 * Encodes the charger ID prefix into the plan description without duplicate tagging.
 * @param {number|string} chargerId 
 * @param {string} rawDescription 
 * @returns {string}
 */
export const encodeChargerPlanDescription = (chargerId, rawDescription = "") => {
  const clean = stripChargerIdFromDescription(rawDescription);
  if (!chargerId) return clean;
  return `[C:${chargerId}] ${clean}`.trim();
};

/**
 * Checks if a plan is assigned to a specific charger.
 * @param {object} plan 
 * @param {number|string} chargerId 
 * @returns {boolean}
 */
export const isPlanAssignedToCharger = (plan, chargerId) => {
  if (!plan || !chargerId) return false;
  const assignedId = extractChargerIdFromDescription(plan.description);
  return assignedId !== null && String(assignedId) === String(chargerId);
};
