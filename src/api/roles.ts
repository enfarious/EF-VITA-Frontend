import { moduleFetch } from "./moduleClient";

export type Role = {
	id: string;
	name: string;
	description?: string | null;
	sortOrder?: number;
};

export type AccessList = {
	id: string;
	name: string;
	description?: string | null;
	roles: string[];
};

export type Rank = {
	id: string;
	name: string;
	description?: string | null;
	sortOrder?: number;
	roleId?: string | null;
};

export type RoleRank = {
	roleId: string;
	rankId: string;
	sortOrder?: number;
};

export type RoleRankOverride = {
	roleId: string;
	rankId: string;
	name: string;
};

function arrayFrom<T>(payload: unknown, keys: string[]): T[] {
	if (Array.isArray(payload)) {
		return payload as T[];
	}
	if (payload && typeof payload === "object") {
		for (const key of keys) {
			const value = (payload as Record<string, unknown>)[key];
			if (Array.isArray(value)) {
				return value as T[];
			}
		}
	}
	return [];
}

export async function listRoles(): Promise<Role[]> {
	const payload = await moduleFetch<unknown>("/roles");
	return arrayFrom<Role>(payload, ["roles"]);
}

export async function createRole(input: { name: string; description?: string; sortOrder?: number }): Promise<Role> {
	return moduleFetch<Role>("/roles", {
		method: "POST",
		body: input
	});
}

export async function updateRole(
	id: string,
	input: { name: string; description?: string; sortOrder?: number }
): Promise<Role> {
	return moduleFetch<Role>(`/roles/${encodeURIComponent(id)}`, {
		method: "PATCH",
		body: input
	});
}

export async function deleteRole(id: string): Promise<void> {
	await moduleFetch<void>(`/roles/${encodeURIComponent(id)}`, {
		method: "DELETE"
	});
}

export async function listAccessLists(): Promise<AccessList[]> {
	const payload = await moduleFetch<unknown>("/access-lists");
	return arrayFrom<AccessList>(payload, ["access_lists", "accessLists"]);
}

export async function createAccessList(input: {
	name: string;
	description?: string;
	roles?: string[];
}): Promise<AccessList> {
	return moduleFetch<AccessList>("/access-lists", {
		method: "POST",
		body: input
	});
}

export async function updateAccessList(
	id: string,
	input: { name: string; description?: string; roles?: string[] }
): Promise<AccessList> {
	return moduleFetch<AccessList>(`/access-lists/${encodeURIComponent(id)}`, {
		method: "PATCH",
		body: input
	});
}

export async function deleteAccessList(id: string): Promise<void> {
	await moduleFetch<void>(`/access-lists/${encodeURIComponent(id)}`, {
		method: "DELETE"
	});
}

export async function listRanks(): Promise<Rank[]> {
	const payload = await moduleFetch<unknown>("/ranks");
	return arrayFrom<Rank>(payload, ["ranks"]);
}

export async function listRoleRanks(): Promise<RoleRank[]> {
	const payload = await moduleFetch<unknown>("/role-ranks");
	return arrayFrom<RoleRank>(payload, ["role_ranks", "roleRanks"]);
}

export async function listRoleRankOverrides(): Promise<RoleRankOverride[]> {
	const payload = await moduleFetch<unknown>("/role-rank-overrides");
	return arrayFrom<RoleRankOverride>(payload, ["role_rank_overrides", "roleRankOverrides"]);
}

export async function updateRoleRankOverrides(
	roleId: string,
	overrides: { rankId: string; name: string }[]
): Promise<void> {
	await moduleFetch<void>(`/role-rank-overrides/${encodeURIComponent(roleId)}`, {
		method: "PATCH",
		body: { overrides }
	});
}

export async function updateRoleRankOrder(roleId: string, rankIds: string[]): Promise<void> {
	await moduleFetch<void>(`/role-ranks/order/${encodeURIComponent(roleId)}`, {
		method: "PATCH",
		body: { rankIds }
	});
}

export async function createRank(input: {
	name: string;
	description?: string;
	sortOrder?: number;
	roleId?: string | null;
}): Promise<Rank> {
	return moduleFetch<Rank>("/ranks", {
		method: "POST",
		body: input
	});
}

export async function updateRank(
	id: string,
	input: { name: string; description?: string; sortOrder?: number }
): Promise<Rank> {
	return moduleFetch<Rank>(`/ranks/${encodeURIComponent(id)}`, {
		method: "PATCH",
		body: input
	});
}

export async function deleteRank(id: string): Promise<void> {
	await moduleFetch<void>(`/ranks/${encodeURIComponent(id)}`, {
		method: "DELETE"
	});
}

export async function updateRoleRanks(roleId: string, rankIds: string[]): Promise<void> {
	await moduleFetch<void>(`/role-ranks/${encodeURIComponent(roleId)}`, {
		method: "PATCH",
		body: { rankIds }
	});
}

export async function updateRoleOrder(roleIds: string[]): Promise<void> {
	await moduleFetch<void>("/roles/order", {
		method: "PATCH",
		body: { roleIds }
	});
}

export async function updateRankOrder(rankIds: string[]): Promise<void> {
	await moduleFetch<void>("/ranks/order", {
		method: "PATCH",
		body: { rankIds }
	});
}
