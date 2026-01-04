import { env } from "@/env";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

function resolveModuleUrl(path: string) {
	const base = env.moduleApiBaseUrl || "/module-api";
	if (base.startsWith("http://") || base.startsWith("https://")) {
		return new URL(path, base).toString();
	}

	const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${normalizedBase}${normalizedPath}`;
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

	const res = await fetch(url, {
		method: opts?.method ?? "GET",
		headers: {
			"X-Module-Auth": "true",
			"X-Module-Role": roleHeader,
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
