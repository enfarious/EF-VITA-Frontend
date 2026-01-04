import { ApiError, apiFetch } from "./client";

export type Membership = {
	tenant_id: number;
	name: string;
	slug: string;
	role: "owner" | "admin" | "member";
	joined_at: string;
};

export type UserWithMemberships = {
	id: number;
	email: string;
	display_name: string;
	created_at: string;
	memberships: Membership[];
};

export type TenantWithRole = {
	id: number;
	name: string;
	slug: string;
	status: "active" | "suspended";
	created_at: string;
	role: "owner" | "admin" | "member";
};

export type TenantDetails = {
	id: number;
	name: string;
	slug: string;
	status: "active" | "suspended";
	created_at: string;
	member_count: number;
	my_role?: string | null;
};

export type TenantMember = {
	id: number;
	display_name: string;
	email?: string;
	role: "owner" | "admin" | "member";
	joined_at: string;
};

export type ChainIdentity = {
	canonicalId: string;
	displayName: string;
	address: string;
};

export type ChainTribe = {
	id: string;
	name: string;
	description: string;
	memberCount: number;
	createdAt: string;
};

export type HealthResponse = {
	status: "ok";
	version?: string;
	commit?: string | null;
	chain?: string;
};

export async function getMe(): Promise<UserWithMemberships | null> {
	try {
		return await apiFetch<UserWithMemberships>("/me");
	} catch (err) {
		if (err instanceof ApiError && err.status === 401) return null;
		throw err;
	}
}

export async function listTenants(): Promise<{ tenants: TenantWithRole[] }> {
	return apiFetch<{ tenants: TenantWithRole[] }>("/tenants");
}

export async function createTenant(input: {
	name: string;
	slug: string;
}): Promise<TenantDetails> {
	return apiFetch<TenantDetails>("/tenants", {
		method: "POST",
		body: input
	});
}

export async function installModule(slug: string, moduleId: string): Promise<{ ok: boolean }> {
	return apiFetch<{ ok: boolean }>(
		`/t/${encodeURIComponent(slug)}/modules/${encodeURIComponent(moduleId)}/install`,
		{
			method: "POST"
		}
	);
}

export async function getTenant(slug: string): Promise<TenantDetails> {
	return apiFetch<TenantDetails>(`/tenants/${encodeURIComponent(slug)}`);
}

export async function listTenantMembers(slug: string): Promise<{ members: TenantMember[] }> {
	return apiFetch<{ members: TenantMember[] }>(`/tenants/${encodeURIComponent(slug)}/members`);
}

export async function getChainIdentity(address: string): Promise<ChainIdentity> {
	return apiFetch<ChainIdentity>(`/chain/identity/${encodeURIComponent(address)}`);
}

export async function getChainTribe(tribeId: string): Promise<ChainTribe> {
	return apiFetch<ChainTribe>(`/chain/tribe/${encodeURIComponent(tribeId)}`);
}

export async function getHealth(): Promise<HealthResponse> {
	return apiFetch<HealthResponse>("/health");
}
