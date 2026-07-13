"use client";

import {
  getBrowserAdminSession,
  getBrowserSupabaseConfigStatus,
} from "@/lib/client/supabase";

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const adminMemoryCache = new Map<string, CacheEntry>();
const DEFAULT_GET_CACHE_MS = 45_000;
const STATIC_OPTIONS_CACHE_MS = 5 * 60_000;

function cacheTtlFor(path: string) {
  if (path.includes("/api/admin/options/") || path.includes("/api/admin/me"))
    return STATIC_OPTIONS_CACHE_MS;
  if (path.includes("/api/admin/dashboard")) return 30_000;
  if (path.includes("/api/admin/payroll")) return 20_000;
  return DEFAULT_GET_CACHE_MS;
}

function shouldUseCache(path: string, init: RequestInit) {
  const method = (init.method || "GET").toUpperCase();
  if (method !== "GET") return false;
  if (
    path.includes("format=pdf") ||
    path.includes("format=xlsx") ||
    path.includes("/export")
  )
    return false;
  return true;
}

export function clearAdminApiCache(prefix?: string) {
  if (!prefix) {
    adminMemoryCache.clear();
    return;
  }
  [...adminMemoryCache.keys()].forEach((key) => {
    if (key.includes(prefix)) adminMemoryCache.delete(key);
  });
}

export function prefetchAdmin(path: string) {
  adminFetch(path).catch(() => undefined);
}

async function getAdminAccessToken() {
  const config = getBrowserSupabaseConfigStatus();
  if (!config.configured) throw new Error(config.message);

  const {
    data: { session },
  } = await getBrowserAdminSession();

  if (!session?.access_token) {
    throw new Error("Sessão administrativa expirada. Entre novamente.");
  }
  return session.access_token;
}

export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const cacheKey = `${method}:${path}`;
  const cacheable = shouldUseCache(path, init);

  if (cacheable) {
    const entry = adminMemoryCache.get(cacheKey);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.value as T;
    }
  }

  const token = await getAdminAccessToken();

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String(data.error)
        : "Erro na operação administrativa.";
    throw new Error(message);
  }

  if (cacheable) {
    adminMemoryCache.set(cacheKey, {
      value: data,
      expiresAt: Date.now() + cacheTtlFor(path),
    });
  } else if (method !== "GET") {
    clearAdminApiCache();
  }
  return data as T;
}

export async function downloadAdminFile(path: string, filename: string) {
  const config = getBrowserSupabaseConfigStatus();
  if (!config.configured) throw new Error(config.message);

  const {
    data: { session },
  } = await getBrowserAdminSession();
  if (!session?.access_token)
    throw new Error("Sessão administrativa expirada.");

  const response = await fetch(path, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Não foi possível gerar o arquivo.");
    }
    const text = await response.text().catch(() => "");
    throw new Error(text || "Não foi possível gerar o arquivo.");
  }
  const blob = await response.blob();
  if (!blob.size)
    throw new Error(
      "O arquivo foi gerado vazio. Verifique os filtros e tente novamente.",
    );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadAdminPostFile(
  path: string,
  body: unknown,
  filename: string,
) {
  const config = getBrowserSupabaseConfigStatus();
  if (!config.configured) throw new Error(config.message);

  const {
    data: { session },
  } = await getBrowserAdminSession();
  if (!session?.access_token)
    throw new Error("Sessão administrativa expirada.");

  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Não foi possível gerar o arquivo.");
    }
    throw new Error(
      (await response.text().catch(() => "")) ||
        "Não foi possível gerar o arquivo.",
    );
  }
  const blob = await response.blob();
  if (!blob.size) throw new Error("O arquivo foi gerado vazio.");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
