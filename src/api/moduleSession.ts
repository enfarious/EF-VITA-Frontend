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
	return moduleFetch<ModuleSession>("/me");
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
	return moduleFetch<JoinRequest[]>("/join-requests");
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
