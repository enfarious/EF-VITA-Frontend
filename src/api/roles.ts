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

export async function listRoles(): Promise<Role[]> {
	return moduleFetch<Role[]>("/roles");
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
	return moduleFetch<AccessList[]>("/access-lists");
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
	return moduleFetch<Rank[]>("/ranks");
}

export async function listRoleRanks(): Promise<RoleRank[]> {
	return moduleFetch<RoleRank[]>("/role-ranks");
}

export async function listRoleRankOverrides(): Promise<RoleRankOverride[]> {
	return moduleFetch<RoleRankOverride[]>("/role-rank-overrides");
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

export async function createRank(input: { name: string; description?: string; sortOrder?: number }): Promise<Rank> {
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
