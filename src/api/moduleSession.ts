import { moduleFetch } from "./moduleClient";
import type { Member } from "./members";

export type ModuleUser = {
	id: string;
	handle: string;
	avatarUrl?: string | null;
};

export type JoinRequest = {
	id: string;
	status: "pending" | "approved" | "denied";
	characterName: string;
	walletAddress?: string | null;
	note?: string | null;
	createdAt?: string | null;
};

export type ModuleSession = {
	authenticated: boolean;
	user: ModuleUser | null;
	member: Member | null;
	joinRequest: JoinRequest | null;
};

export async function getModuleSession(): Promise<ModuleSession> {
	const data = await moduleFetch<Record<string, unknown>>("/me");
	const rawUser = (data.user as Record<string, unknown> | null) ?? null;
	const rawMember = (data.member as Record<string, unknown> | null) ?? null;
	const rawMembership = (data.membership as Record<string, unknown> | null) ?? null;
	const rawJoin = (data.joinRequest as Record<string, unknown> | null) ?? null;

	const user = rawUser
		? {
				id: String(rawUser.id ?? ""),
				handle:
					String(
						rawUser.handle ??
							rawUser.display_name ??
							rawUser.displayName ??
							rawUser.username ??
							"Unknown"
					) || "Unknown",
				avatarUrl: (rawUser.avatar_url as string | null) ?? (rawUser.avatarUrl as string | null) ?? null
			}
		: null;

	const isPending =
		(rawMember?.status as string | undefined) === "pending" ||
		(rawMembership?.status as string | undefined) === "pending";

	const joinRequest =
		(rawJoin as JoinRequest | null) ??
		(isPending && (rawMembership || rawMember)
			? {
					id: String((rawMembership?.id ?? rawMember?.id ?? "") as string),
					status: "pending",
					characterName: String(
						rawMembership?.character_name ??
							rawMembership?.characterName ??
							rawMember?.character_name ??
							rawMember?.characterName ??
							user?.handle ??
							""
					),
					walletAddress:
						(rawMembership?.wallet_address as string | null) ??
						(rawMembership?.walletAddress as string | null) ??
						(rawMember?.wallet_address as string | null) ??
						(rawMember?.walletAddress as string | null) ??
						null,
					note:
						(rawMembership?.note as string | null) ??
						(rawMember?.note as string | null) ??
						null,
					createdAt: (rawMembership?.created_at as string | null) ?? (rawMember?.created_at as string | null)
				}
			: null);

	const member =
		!isPending && (rawMember || rawMembership)
			? {
					id: String((rawMember?.id ?? rawMembership?.id ?? user?.id ?? "member") as string),
					displayName: String(
						rawMember?.displayName ??
							rawMember?.display_name ??
							rawMember?.character_name ??
							rawMember?.characterName ??
							rawMembership?.display_name ??
							rawMembership?.character_name ??
							rawMembership?.characterName ??
							user?.handle ??
							"Member"
					),
					status:
						(rawMember?.status as Member["status"] | undefined) ??
						(rawMembership?.status as Member["status"] | undefined) ??
						"active",
					walletAddress:
						(rawMember?.walletAddress as string | null) ??
						(rawMember?.wallet_address as string | null) ??
						(rawMembership?.wallet_address as string | null) ??
						null,
					roles:
						(rawMember?.roles as string[] | undefined) ??
						(rawMembership?.roles as string[] | undefined) ??
						(rawMembership?.role ? [String(rawMembership.role)] : []),
					globalRank: (() => {
						const candidate = rawMember?.globalRank as { id?: string; name?: string } | undefined;
						if (candidate?.id && candidate?.name) {
							return { id: String(candidate.id), name: String(candidate.name) };
						}
						if (rawMembership?.rank_name) {
							return {
								id: `rank:${String(rawMembership.rank_name)}`,
								name: String(rawMembership.rank_name)
							};
						}
						return null;
					})(),
					roleRanks: (rawMember?.roleRanks as Member["roleRanks"] | undefined) ?? []
				}
			: null;

	return {
		authenticated: Boolean((data as { authenticated?: boolean }).authenticated ?? user),
		user,
		member,
		joinRequest
	};
}

export async function submitJoinRequest(input: {
	characterName: string;
	walletAddress?: string;
	note?: string;
}): Promise<JoinRequest> {
	return moduleFetch<JoinRequest>("/join", {
		method: "POST",
		body: {
			character_name: input.characterName,
			wallet_address: input.walletAddress,
			note: input.note
		}
	});
}

export async function listJoinRequests(): Promise<JoinRequest[]> {
	const payload = await moduleFetch<unknown>("/join-requests");
	if (Array.isArray(payload)) {
		return payload as JoinRequest[];
	}
	if (payload && typeof payload === "object") {
		const requests = (payload as Record<string, unknown>).requests;
		if (Array.isArray(requests)) {
			return requests as JoinRequest[];
		}
	}
	return [];
}

export async function approveJoinRequest(id: string): Promise<JoinRequest> {
	return moduleFetch<JoinRequest>(`/join-requests/${encodeURIComponent(id)}/approve`, {
		method: "POST"
	});
}

export async function denyJoinRequest(id: string): Promise<JoinRequest> {
	return moduleFetch<JoinRequest>(`/join-requests/${encodeURIComponent(id)}/deny`, {
		method: "POST"
	});
}
