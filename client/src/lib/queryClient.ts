import { QueryClient, QueryFunction } from "@tanstack/react-query";

export const SUBSCRIBER_EMAIL_STORAGE_KEY = "electionpredictor_subscriber_email";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAdminHeader(url: string): Record<string, string> {
  if (!url.startsWith("/api/admin")) {
    return {};
  }

  if (typeof window === "undefined") {
    return {};
  }

  const key = window.localStorage.getItem("electionpredictor_admin_key") || "";
  return key ? { "x-admin-key": key } : {};
}

function getSubscriberHeader(url: string): Record<string, string> {
  const subscriberOnlyEndpoints = ["/api/custom-prediction", "/api/natural-language-analysis"];
  if (!subscriberOnlyEndpoints.includes(url)) {
    return {};
  }

  if (typeof window === "undefined") {
    return {};
  }

  const email = (window.localStorage.getItem(SUBSCRIBER_EMAIL_STORAGE_KEY) || "").trim().toLowerCase();
  return email ? { "x-subscriber-email": email } : {};
}

export async function apiRequest<T = unknown>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const adminHeader = getAdminHeader(url);
  const subscriberHeader = getSubscriberHeader(url);
  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...adminHeader,
      ...subscriberHeader,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = queryKey.join("/") as string;
      const res = await fetch(url, {
        headers: getAdminHeader(url),
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 0,
      refetchOnMount: true,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
