/**
 * Utility functions for formatting dates, currency, numbers, and product specifications.
 */

/**
 * Format ISO date string into readable local date format.
 * @param {string|Date} dateStr 
 * @returns {string}
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch (err) {
    return "—";
  }
};

/**
 * Format currency amount into INR standard string.
 * @param {number|string} amount 
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "₹0";
  return `₹${num.toLocaleString("en-IN")}`;
};

/**
 * Parse structured string into product specification details object.
 * @param {string} str 
 * @returns {object}
 */
export const parseProductDetails = (str = "") => {
  const parts = str.split("-");
  const project = parts[0] ? parts[0].trim() : "EV Battery";
  const customProject = project !== "EV Battery" && project !== "ESS" && project !== "2 Wheeler" && project !== "3 Wheeler" && project !== "4 Wheeler" ? project : "";

  const vMatch = str.match(/(\d+)\s*V/i);
  const ahMatch = str.match(/(\d+)\s*Ah/i);
  const chemMatch = str.match(/Chemistry\s*=\s*([A-Za-z0-9\s-]+)/i);
  const notesMatch = str.match(/\(([^)]+)\)/);

  return {
    project: customProject ? "Other" : project,
    customProject,
    voltage: vMatch ? vMatch[1] : "",
    capacity: ahMatch ? ahMatch[1] : "",
    chemistry: chemMatch ? chemMatch[1].trim() : "NMC",
    notes: notesMatch ? notesMatch[1].trim() : (vMatch || ahMatch || chemMatch ? "" : str)
  };
};

/**
 * Format product specifications into standard summary text string.
 * @param {object} specs 
 * @returns {string}
 */
export const formatProductDetails = ({ project, customProject, voltage, capacity, chemistry, notes }) => {
  const proj = project === "Other" ? (customProject || "Other") : (project || "EV Battery");
  const v = voltage !== undefined && voltage !== "" ? `${voltage.toString().padStart(2, "0")}V` : "";
  const ah = capacity !== undefined && capacity !== "" ? `${capacity}Ah` : "";
  const chem = chemistry ? `Chemistry = ${chemistry}` : "";
  const mainSpecs = [v, ah].filter(Boolean).join(" ");
  const specLine = [mainSpecs, chem].filter(Boolean).join("  ");
  return notes && notes.trim() ? `${proj} - ${specLine}${specLine ? " " : ""}(${notes.trim()})` : `${proj} - ${specLine}`;
};
