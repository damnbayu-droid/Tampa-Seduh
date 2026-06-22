const API_BASE = import.meta.env.VITE_API_URL || "";

export const getApiUrl = (path: string): string => {
  if (!path) return "";
  // If the path is already an absolute URL (e.g. Formspree or external APIs), return it as is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  // Use VITE_API_URL if explicitly set, otherwise use window.location.origin
  // This prevents 308 redirect issues when non-www redirects to www (POST body is lost on redirect)
  const base = API_BASE
    ? API_BASE.replace(/\/$/, "")
    : (typeof window !== "undefined" ? window.location.origin : "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

export const safeParseJson = async (response: Response): Promise<any> => {
  try {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
  } catch (e) {
    console.error("[safeParseJson] Error parsing JSON:", e);
  }
  const text = await response.text();
  return { error: text || `Error ${response.status}: ${response.statusText}` };
};

