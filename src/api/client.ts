import { env } from "@/env";

export class ApiError extends Error {
	status: number;
	body?: unknown;

	constructor(message: string, status: number, body?: unknown) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.body = body;
	}
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function apiFetch<T>(
	path: string,
	opts?: {
		method?: HttpMethod;
		body?: unknown;
		headers?: Record<string, string>;
		signal?: AbortSignal;
	}
): Promise<T> {
	if (!env.apiBaseUrl) {
		throw new Error("VITE_API_BASE_URL is not set. Check your .env.");
	}

	const url = new URL(path, env.apiBaseUrl).toString();

	const res = await fetch(url, {
		method: opts?.method ?? "GET",
		headers: {
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
		const msg = typeof payload === "object" && payload && "message" in payload ? String(payload.message) : `HTTP ${res.status}`;
		throw new ApiError(msg, res.status, payload);
	}

	return payload as T;
}
