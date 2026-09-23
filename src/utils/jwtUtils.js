/**
 * Safe JWT decoder for browser production environments.
 * Handles URL-safe Base64 characters (- and _) and missing padding.
 * Prevents InvalidCharacterError exceptions in production builds.
 */
export const safeDecodeJwt = (token) => {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        return JSON.parse(atob(parts[1]));
      }
    } catch {
      // Fallback decoding failed; return null
    }
    return null;
  }
};

/**
 * Extracts normalized user role solely from JWT claims/authorities.
 * Unsafe email-substring matching has been removed per security specifications.
 */
export const extractRoleFromToken = (token) => {
  const payload = safeDecodeJwt(token);
  if (!payload) return "";

  const authorities = [];
  if (Array.isArray(payload.authorities)) {
    authorities.push(...payload.authorities.map((a) => String(a).toUpperCase()));
  } else if (typeof payload.authorities === "string") {
    authorities.push(payload.authorities.toUpperCase());
  }

  if (payload.role) {
    authorities.push(String(payload.role).toUpperCase());
  }
  if (payload.roles) {
    if (Array.isArray(payload.roles)) {
      authorities.push(...payload.roles.map((r) => String(r).toUpperCase()));
    } else if (typeof payload.roles === "string") {
      authorities.push(payload.roles.toUpperCase());
    }
  }

  const authStr = authorities.join(",");

  if (authStr.includes("SALES")) return "SALES_ADMIN";
  if (authStr.includes("PRODUCTION")) return "PRODUCTION_ADMIN";
  if (authStr.includes("SCM")) return "SCM_ADMIN";
  if (authStr.includes("DEALER")) return "DEALER";
  if (authStr.includes("ADMIN_STAFF") || authStr.includes("STAFF")) return "ADMIN_STAFF";
  if (authStr.includes("ADMIN") || authStr.includes("ROLE_ADMIN") || authStr.includes("ADMINISTRATOR")) return "ADMIN";

  return "";
};
