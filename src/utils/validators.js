/**
 * Centralized Form and Input Validation Utilities
 * Eliminates duplicate regex checks and validation logic across the frontend.
 */

export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
};

export const isValidMobile = (mobile) => {
  if (!mobile || typeof mobile !== "string") return false;
  // Accepts standard 10-digit Indian numbers or with optional +91/country code
  const regex = /^(\+91[-\s]?)?[0-9]{10}$/;
  return regex.test(mobile.trim().replace(/\s+/g, ""));
};

export const isValidPassword = (password, minLength = 6) => {
  if (!password || typeof password !== "string") return false;
  return password.length >= minLength;
};

export const isNonEmptyString = (val) => {
  return typeof val === "string" && val.trim().length > 0;
};

export const isPositiveNumber = (val) => {
  if (val === null || val === undefined || val === "") return false;
  const num = Number(val);
  return !isNaN(num) && num > 0;
};

export const isNonNegativeNumber = (val) => {
  if (val === null || val === undefined || val === "") return false;
  const num = Number(val);
  return !isNaN(num) && num >= 0;
};

export const isValidBarcode = (barcode) => {
  if (!barcode || typeof barcode !== "string") return false;
  return barcode.trim().length >= 3;
};

export const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
};
