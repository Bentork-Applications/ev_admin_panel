/**
 * Centralized API Client abstraction following Dependency Inversion & Open/Closed Principles.
 * Provides unified HTTP methods, automatic token header handling, and standardized ApiError instances.
 */

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL || "";
  return envUrl.replace(/\/+$/, "");
};

const formatUrl = (endpoint) => {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (baseUrl.endsWith("/api") && cleanEndpoint.startsWith("/api/")) {
    return `${baseUrl}${cleanEndpoint.substring(4)}`;
  }
  return `${baseUrl}${cleanEndpoint}`;
};

const getAuthHeaders = (customHeaders = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...customHeaders
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type");
  let data = null;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : null;
  }

  if (!response.ok) {
    let errorMessage = `Server error (${response.status})`;

    if (data) {
      if (typeof data === "string") {
        errorMessage = data;
      } else if (Array.isArray(data.errors) && data.errors.length > 0) {
        errorMessage = data.errors
          .map((e) => e.defaultMessage || e.message || `${e.field}: invalid`)
          .join("; ");
      } else if (data.message) {
        errorMessage = data.message;
      } else if (typeof data === "object") {
        const messages = Object.values(data)
          .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
          .filter(Boolean)
          .join(", ");
        if (messages) errorMessage = messages;
      }
    }

    throw new ApiError(errorMessage, response.status, data);
  }

  return data;
};

export const apiClient = {
  get: async (endpoint, customHeaders = {}) => {
    try {
      const response = await fetch(formatUrl(endpoint), {
        method: "GET",
        headers: getAuthHeaders(customHeaders)
      });
      return await parseResponse(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || "Network error occurred", 0, err);
    }
  },

  post: async (endpoint, body = {}, customHeaders = {}) => {
    try {
      const response = await fetch(formatUrl(endpoint), {
        method: "POST",
        headers: getAuthHeaders(customHeaders),
        body: JSON.stringify(body)
      });
      return await parseResponse(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || "Network error occurred", 0, err);
    }
  },

  put: async (endpoint, body = {}, customHeaders = {}) => {
    try {
      const response = await fetch(formatUrl(endpoint), {
        method: "PUT",
        headers: getAuthHeaders(customHeaders),
        body: JSON.stringify(body)
      });
      return await parseResponse(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || "Network error occurred", 0, err);
    }
  },

  delete: async (endpoint, customHeaders = {}) => {
    try {
      const response = await fetch(formatUrl(endpoint), {
        method: "DELETE",
        headers: getAuthHeaders(customHeaders)
      });
      return await parseResponse(response);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || "Network error occurred", 0, err);
    }
  }
};
