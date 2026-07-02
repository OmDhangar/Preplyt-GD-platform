const getApiBaseUrl = (): string => {
  const rawUrl =
    (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5000/api";
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  if (!trimmed.endsWith("/api")) {
    return `${trimmed}/api`;
  }
  return trimmed;
};

export const env = {
  API_BASE_URL: getApiBaseUrl(),
  SOCKET_URL:
    (import.meta.env.VITE_SOCKET_URL as string) || "http://localhost:5000",
  RAZORPAY_KEY_ID: (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || "",
};
