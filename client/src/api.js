// Centralized API fetch wrapper for the DCFM client
// Handles Base URL, Bearer JWT injection, and uniform error extraction

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  // Stringify JSON body if passing an object
  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Standardized API error message extraction
    const errorMessage = data.error || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

export const api = {
  get: (endpoint) => apiFetch(endpoint, { method: "GET" }),
  post: (endpoint, body) => apiFetch(endpoint, { method: "POST", body }),
  patch: (endpoint, body) => apiFetch(endpoint, { method: "PATCH", body }),
  delete: (endpoint) => apiFetch(endpoint, { method: "DELETE" }),
};

export default api;

