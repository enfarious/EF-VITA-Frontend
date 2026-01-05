import { env } from "@/env";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

function inferTenantSlug() {
	if (typeof window === "undefined") return "";
	const cached = window.localStorage.getItem("activeTenantSlug") ?? "";
	if (cached) return cached;
	const match = window.location.pathname.match(/\/t\/([^/]+)\/m\//);
	return match?.[1] ?? "";
}

function resolveModuleUrl(path: string) {
	const moduleId = "basic_tribe_ui";
	const overrideBase = env.moduleApiBaseUrl;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;

	if (overrideBase) {
		if (overrideBase.startsWith("http://") || overrideBase.startsWith("https://")) {
			return new URL(path, overrideBase).toString();
		}
		const normalizedBase = overrideBase.endsWith("/") ? overrideBase.slice(0, -1) : overrideBase;
		return `${normalizedBase}${normalizedPath}`;
	}

	const origin = typeof window !== "undefined" ? window.location.origin : env.apiBaseUrl;
	if (!origin) {
		throw new Error("Module base URL could not be resolved.");
	}

	const slug = inferTenantSlug();
	if (!slug) {
		throw new Error("Active tenant slug is not available.");
	}

	const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
	return `${base}/t/${encodeURIComponent(slug)}/m/${moduleId}${normalizedPath}`;
}

export async function moduleFetch<T>(
	path: string,
	opts?: {
		method?: HttpMethod;
		body?: unknown;
		headers?: Record<string, string>;
		signal?: AbortSignal;
	}
): Promise<T> {
	const url = resolveModuleUrl(path);
	const roleHeader =
		typeof window !== "undefined" ? window.localStorage.getItem("moduleRole") ?? "" : "";
	const userId =
		typeof window !== "undefined" ? window.localStorage.getItem("moduleUserId") ?? "" : "";
	const userHandle =
		typeof window !== "undefined" ? window.localStorage.getItem("moduleUserHandle") ?? "" : "";
	const userAvatar =
		typeof window !== "undefined" ? window.localStorage.getItem("moduleUserAvatar") ?? "" : "";

	const res = await fetch(url, {
		method: opts?.method ?? "GET",
		credentials: "include",
		headers: {
			"X-Module-Auth": "true",
			"X-Module-Role": roleHeader,
			...(userId ? { "X-Module-User-Id": userId } : {}),
			...(userHandle ? { "X-Module-User-Handle": userHandle } : {}),
			...(userAvatar ? { "X-Module-User-Avatar": userAvatar } : {}),
			...(opts?.body != null ? { "Content-Type": "application/json" } : {}),
			...(opts?.headers ?? {})
		},
		body: opts?.body ? JSON.stringify(opts.body) : undefined,
		signal: opts?.signal
	});

	const contentType = res.headers.get("content-type") ?? "";
	const isJson = contentType.includes("application/json");
	const payload = isJson ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);

	if (!res.ok) {
		const message =
			typeof payload === "object" && payload && "message" in payload
				? String(payload.message)
				: `HTTP ${res.status}`;
		throw new Error(message);
	}

	return payload as T;
}
