import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  AxiosError,
} from "axios";
import { env } from "./env";
import { useAuthStore } from "./auth-store";
import type { ApiEnvelope } from "./types";

export class ApiError extends Error {
  status: number;
  details?: { field: string; message: string }[];
  constructor(
    message: string,
    status: number,
    details?: { field: string; message: string }[],
  ) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: env.API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization =
      `Bearer ${token}`;
  }
  return config;
});

// 401 refresh-queue
let isRefreshing = false;
let pendingQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

const flushQueue = (err: unknown, token: string | null) => {
  pendingQueue.forEach((p) => {
    if (err || !token) p.reject(err);
    else p.resolve(token);
  });
  pendingQueue = [];
};

const hardLogout = () => {
  useAuthStore.getState().clear();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth")) {
    window.location.href = "/auth/login";
  }
};

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status ?? 0;

    if (status === 401 && original && !original._retry && !original.url?.includes("/auth/")) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        hardLogout();
        return Promise.reject(toApiError(error));
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              original._retry = true;
              original.headers = original.headers ?? {};
              (original.headers as Record<string, string>).Authorization =
                `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      original._retry = true;
      try {
        const { data } = await axios.post<
          ApiEnvelope<{ accessToken: string; refreshToken: string }>
        >(`${env.API_BASE_URL}/auth/refresh`, { refreshToken });
        const newAccess = data.data.accessToken;
        const newRefresh = data.data.refreshToken;
        useAuthStore.getState().setTokens(newAccess, newRefresh);
        flushQueue(null, newAccess);
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization =
          `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshErr) {
        flushQueue(refreshErr, null);
        hardLogout();
        return Promise.reject(toApiError(error));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(toApiError(error));
  },
);

function toApiError(error: AxiosError<ApiEnvelope<unknown>>): ApiError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;
  let msg =
    body?.message ?? error.message ?? "Request failed. Please try again.";
  if (body?.details && Array.isArray(body.details) && body.details.length > 0) {
    const detailsMsg = body.details.map((d: any) => d.message).join(", ");
    msg = `${msg}: ${detailsMsg}`;
  }
  return new ApiError(msg, status, body?.details);
}

/** Unwraps the standard {success, data, meta} envelope. */
export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<{ data: T; meta?: ApiEnvelope<T>["meta"] }> {
  const resp = await api.get<ApiEnvelope<T>>(url, config);
  return { data: resp.data.data, meta: resp.data.meta };
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const resp = await api.post<ApiEnvelope<T>>(url, body, config);
  return resp.data.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const resp = await api.patch<ApiEnvelope<T>>(url, body, config);
  return resp.data.data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const resp = await api.delete<ApiEnvelope<T>>(url, config);
  return resp.data.data;
}
