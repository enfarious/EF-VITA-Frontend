import { moduleFetch } from "./moduleClient";

export type Member = {
	id: string;
	displayName: string;
	status: "active" | "pending" | "suspended";
	walletAddress?: string | null;
	roles: string[];
	globalRank?: { id: string; name: string } | null;
	roleRanks: { role: string; rank: string; rankId: string }[];
};

export type CreateMemberInput = {
	displayName: string;
	status?: Member["status"];
	walletAddress?: string;
	roles?: string[];
	globalRankId?: string;
	roleRanks?: { role: string; rankId: string }[];
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

export async function listMembers(): Promise<Member[]> {
	const payload = await moduleFetch<unknown>("/members");
	return arrayFrom<Member>(payload, ["members"]);
}

export async function createMember(input: CreateMemberInput): Promise<Member> {
	return moduleFetch<Member>("/members", {
		method: "POST",
		body: input
	});
}

export async function updateMember(id: string, input: CreateMemberInput): Promise<Member> {
	return moduleFetch<Member>(`/members/${encodeURIComponent(id)}`, {
		method: "PATCH",
		body: input
	});
}

export async function deleteMember(id: string): Promise<void> {
	await moduleFetch<void>(`/members/${encodeURIComponent(id)}`, {
		method: "DELETE"
	});
}
