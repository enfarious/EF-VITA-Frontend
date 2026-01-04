import { moduleFetch } from "./moduleClient";

export type VisibilitySetting = {
	area: "members" | "roles";
	isPublic: boolean;
};

export async function listVisibility(): Promise<VisibilitySetting[]> {
	return moduleFetch<VisibilitySetting[]>("/visibility");
}

export async function updateVisibility(area: VisibilitySetting["area"], isPublic: boolean): Promise<void> {
	await moduleFetch<void>(`/visibility/${area}`, {
		method: "PATCH",
		body: { isPublic }
	});
}
