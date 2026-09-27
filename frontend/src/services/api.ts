import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// All requests go through the /api prefix, which Vite proxies to the
// backend in development (see vite.config.ts) and which a reverse proxy
// (e.g. Nginx) should handle the same way in production.
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true, // sends the httpOnly refresh-token cookie
});

// The access token lives only in memory (never localStorage — that would
// be readable by any injected script). AuthContext is the only thing that
// calls setAccessToken; everything else just reads it via getAccessToken.
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// When the access token expires, the API returns 401. We transparently try
// /api/auth/refresh (the browser sends the httpOnly cookie automatically)
// and, if that succeeds, retry the original request exactly once.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { data } = await axios.post<{ data: { accessToken: string } }>(
    "/api/auth/refresh",
    {},
    { withCredentials: true }
  );
  setAccessToken(data.data.accessToken);
  return data.data.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & {
      _retry?: boolean;
    }) | undefined;

    const isAuthEndpoint = originalRequest?.url?.includes("/auth/");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        // Only one refresh call in flight even if several requests 401 at once.
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const newToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
