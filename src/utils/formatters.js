/**
 * Utility functions for formatting dates, currency, numbers, and product specifications.
 */

export const PROJECT_OPTIONS = [
  "Solar Battery",
  "EV Battery",
  "Inverter Battery",
  "Robotics Battery",
  "Defence Battery",
  "Medical Battery",
  "Spray Pump Battery",
  "Other"
];

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
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (err) {
    return dateStr || "—";
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
  if (!str) return { project: "EV Battery", customProject: "", voltage: "02", capacity: "3", chemistry: "NMC", notes: "" };
  let project = "EV Battery";
  let customProject = "";

  const matchedOption = PROJECT_OPTIONS.find((opt) => str.toLowerCase().includes(opt.toLowerCase()));
  if (matchedOption) {
    project = matchedOption;
  } else if (str.includes(" - ")) {
    const parts = str.split(" - ");
    if (parts[0] && parts[0].trim()) {
      project = "Other";
      customProject = parts[0].trim();
    }
  }

  const vMatch = str.match(/(\d+)\s*V/i);
  const ahMatch = str.match(/(\d+)\s*Ah/i);
  const chemMatch = str.match(/Chemistry\s*=\s*([A-Za-z0-9\s-]+)/i);
  const notesMatch = str.match(/\(([^)]+)\)/);
  return {
    project,
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
  const fullSpec = notes && notes.trim() ? `${specLine}${specLine ? " " : ""}(${notes.trim()})` : specLine;
  return `${proj} - ${fullSpec}`;
};

/**
 * Create default order item structure.
 * @returns {object}
 */
export const createDefaultOrderItem = () => ({
  id: Date.now() + Math.random(),
  project: "EV Battery",
  customProject: "",
  voltage: "02",
  capacity: "3",
  chemistry: "NMC",
  notes: "",
  productDetails: "EV Battery - 02V 3Ah Chemistry = NMC",
  quantity: 1
});

/**
 * Calculate warranty expiry date and total label based on start date, full warranty, and service warranty.
 * Matches Battery Inventory module logic exactly.
 */
export const calculateExpiryAndTotal = (startDateStr, fullY, fullM, servY, servM) => {
  const fy = parseInt(fullY, 10) || 0;
  const fm = parseInt(fullM, 10) || 0;
  const sy = parseInt(servY, 10) || 0;
  const sm = parseInt(servM, 10) || 0;

  const totalYRaw = fy + sy;
  const totalMRaw = fm + sm;

  const extraYears = Math.floor(totalMRaw / 12);
  const totalYears = totalYRaw + extraYears;
  const totalMonths = totalMRaw % 12;

  let totalWarrantyLabel = "";
  if (totalYears > 0 && totalMonths > 0) {
    totalWarrantyLabel = `${totalYears} Year${totalYears > 1 ? "s" : ""} ${totalMonths} Month${totalMonths > 1 ? "s" : ""}`;
  } else if (totalYears > 0) {
    totalWarrantyLabel = `${totalYears} Year${totalYears > 1 ? "s" : ""}`;
  } else if (totalMonths > 0) {
    totalWarrantyLabel = `${totalMonths} Month${totalMonths > 1 ? "s" : ""}`;
  } else {
    totalWarrantyLabel = "0 Years";
  }

  let expiryDateStr = "";
  if (startDateStr) {
    const start = new Date(startDateStr);
    if (!isNaN(start.getTime())) {
      const end = new Date(start);
      end.setFullYear(start.getFullYear() + totalYears);
      end.setMonth(start.getMonth() + totalMonths);
      end.setDate(end.getDate() - 1);

      const yyyy = end.getFullYear();
      const mm = String(end.getMonth() + 1).padStart(2, '0');
      const dd = String(end.getDate()).padStart(2, '0');
      expiryDateStr = `${yyyy}-${mm}-${dd}`;
    }
  }

  return {
    totalWarrantyLabel,
    expiryDateStr,
    totalYearsDecimal: totalYears + (totalMonths / 12),
    fullWarrantyMonths: fy * 12 + fm,
    serviceWarrantyMonths: sy * 12 + sm
  };
};

/**
 * Parse warranty start and end dates into full years and months.
 * Matches Battery Inventory module logic exactly.
 */
export const parseWarrantyPeriod = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return { years: 1, months: 0 };
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return { years: 1, months: 0 };

  const targetEnd = new Date(end);
  targetEnd.setDate(end.getDate() + 1);

  let years = targetEnd.getFullYear() - start.getFullYear();
  let months = targetEnd.getMonth() - start.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    years: Math.max(0, years),
    months: Math.max(0, months)
  };
};
