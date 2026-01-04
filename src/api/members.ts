import { moduleFetch } from "./moduleClient";

export type Member = {
	id: string;
	displayName: string;
	status: "active" | "pending" | "suspended";
	walletAddress?: string | null;
	roles: string[];
	globalRanks: string[];
	roleRanks: { role: string; rank: string }[];
};

export type CreateMemberInput = {
	displayName: string;
	status?: Member["status"];
	walletAddress?: string;
	roles?: string[];
	globalRankId?: string;
	roleRanks?: { role: string; rankId: string }[];
};

export async function listMembers(): Promise<Member[]> {
	return moduleFetch<Member[]>("/members");
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
