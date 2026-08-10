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
  } catch (e) {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        return JSON.parse(atob(parts[1]));
      }
    } catch {}
    return null;
  }
};

export const extractRoleFromToken = (token) => {
  const payload = safeDecodeJwt(token);
  if (!payload) return "";

  const authorities = [];
  if (Array.isArray(payload.authorities)) {
    authorities.push(...payload.authorities.map((a) => String(a).toUpperCase()));
  } else if (typeof payload.authorities === "string") {
    authorities.push(payload.authorities.toUpperCase());
  }

  if (payload.role) authorities.push(String(payload.role).toUpperCase());
  if (payload.roles) {
    if (Array.isArray(payload.roles)) {
      authorities.push(...payload.roles.map((r) => String(r).toUpperCase()));
    } else if (typeof payload.roles === "string") {
      authorities.push(payload.roles.toUpperCase());
    }
  }

  const authStr = authorities.join(",");
  const subStr = String(payload.sub || "").toLowerCase();

  if (authStr.includes("SALES") || subStr.includes("sales")) return "SALES_ADMIN";
  if (authStr.includes("PRODUCTION") || subStr.includes("production")) return "PRODUCTION_ADMIN";
  if (authStr.includes("SCM") || subStr.includes("scm")) return "SCM_ADMIN";
  if (authStr.includes("DEALER")) return "DEALER";
  if (authStr.includes("ADMIN_STAFF")) return "ADMIN_STAFF";
  if (authStr.includes("ADMIN")) return "ADMIN";

  return "";
};
