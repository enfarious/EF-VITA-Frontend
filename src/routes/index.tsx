import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createMember, deleteMember, listMembers, updateMember, type CreateMemberInput } from "@/api/members";
import { ErrorView } from "@/components/ErrorView";
import { Loading } from "@/components/Loading";
import { createTenant, getMe, installModule, listTenantMembers } from "@/api/spine";
import {
	createAccessList,
	createRank,
	createRole,
	deleteAccessList,
	deleteRank,
	deleteRole,
	listAccessLists,
	listRanks,
	listRoleRankOverrides,
	listRoleRanks,
	listRoles,
	updateAccessList,
	updateRank,
	updateRankOrder,
	updateRole,
	updateRoleOrder,
	updateRoleRankOverrides,
	updateRoleRankOrder,
	updateRoleRanks
} from "@/api/roles";
import { listVisibility, updateVisibility } from "@/api/visibility";
import { env } from "@/env";

export const Route = createFileRoute("/")({
	component: Home
});

type Persona = {
	label: string;
	role: "tenant-admin" | "tribe-chief" | "tribe-elder" | "tribe-member";
};

type TenantSection = "overview" | "frontend" | "billing";
type MemberSection = "overview" | "members" | "roles" | "access";

const adminPersona: Persona = {
	label: "Tenant Admin",
	role: "tenant-admin"
};

const memberPersona: Persona = {
	label: "Tribe Member",
	role: "tribe-member"
};

const memberDefaults: CreateMemberInput = {
	displayName: "",
	status: "active",
	walletAddress: "",
	roles: [],
	globalRankId: "",
	roleRanks: []
};

function Home() {
	const [active, setActive] = useState<Persona | null>(null);
	const [tenantSection, setTenantSection] = useState<TenantSection>("overview");
	const [memberSection, setMemberSection] = useState<MemberSection>("overview");
	const [memberDraft, setMemberDraft] = useState<CreateMemberInput>(memberDefaults);
	const [memberError, setMemberError] = useState<string | null>(null);
	const [tenantDraft, setTenantDraft] = useState({ name: "V.I.T.A.", slug: "vita" });
	const [tenantError, setTenantError] = useState<string | null>(null);
	const [moduleError, setModuleError] = useState<string | null>(null);
	const [memberEdit, setMemberEdit] = useState<{
		id: string;
		draft: CreateMemberInput;
		readonly: boolean;
	} | null>(null);
	const [memberSearch, setMemberSearch] = useState("");
	const [roleSearch, setRoleSearch] = useState("");
	const [accessSearch, setAccessSearch] = useState("");
	const [rolesOpen, setRolesOpen] = useState(false);
	const [roleDraft, setRoleDraft] = useState<{
		id?: string;
		name: string;
		description: string;
		sortOrder: number;
	}>({
		name: "",
		description: "",
		sortOrder: 0
	});
	const [roleError, setRoleError] = useState<string | null>(null);
	const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
	const [rankDraft, setRankDraft] = useState<{
		id?: string;
		name: string;
		description: string;
		sortOrder: number;
	}>({
		name: "",
		description: "",
		sortOrder: 0
	});
	const [roleRankDraft, setRoleRankDraft] = useState<{
		id?: string;
		name: string;
		description: string;
	}>({
		name: "",
		description: ""
	});
	const [rankError, setRankError] = useState<string | null>(null);
	const [accessDraft, setAccessDraft] = useState<{
		id?: string;
		name: string;
		description: string;
		roles: string[];
	}>({
		name: "",
		description: "",
		roles: []
	});
	const [accessError, setAccessError] = useState<string | null>(null);
	const [accessRolesOpen, setAccessRolesOpen] = useState(false);
	const [rankRolesOpen, setRankRolesOpen] = useState(false);
	const [roleRankOverrideDraft, setRoleRankOverrideDraft] = useState<Record<string, string>>({});
	const [roleOrder, setRoleOrder] = useState<string[]>([]);
	const [rankOrder, setRankOrder] = useState<string[]>([]);
	const [roleRankOrder, setRoleRankOrder] = useState<string[]>([]);
	const [copyRoleId, setCopyRoleId] = useState<string>("");
	const queryClient = useQueryClient();
	const meQuery = useQuery({
		queryKey: ["spine-me"],
		queryFn: getMe,
		enabled: Boolean(env.apiBaseUrl)
	});
	const spineMembership = meQuery.data?.memberships?.[0] ?? null;
	const spineMembersQuery = useQuery({
		queryKey: ["spine-members", spineMembership?.slug ?? ""],
		queryFn: () => listTenantMembers(spineMembership?.slug ?? ""),
		enabled: Boolean(spineMembership?.slug)
	});

	const membersQuery = useQuery({
		queryKey: ["module-members"],
		queryFn: listMembers,
		enabled: Boolean(active && active.role !== "tenant-admin")
	});

	const rolesQuery = useQuery({
		queryKey: ["module-roles"],
		queryFn: listRoles,
		enabled: Boolean(active && active.role !== "tenant-admin")
	});

	const accessListsQuery = useQuery({
		queryKey: ["module-access-lists"],
		queryFn: listAccessLists,
		enabled: Boolean(active && active.role !== "tenant-admin")
	});

	const ranksQuery = useQuery({
		queryKey: ["module-ranks"],
		queryFn: listRanks,
		enabled: Boolean(active && active.role !== "tenant-admin")
	});

	const roleRanksQuery = useQuery({
		queryKey: ["module-role-ranks"],
		queryFn: listRoleRanks,
		enabled: Boolean(active && active.role !== "tenant-admin")
	});

	const roleRankOverridesQuery = useQuery({
		queryKey: ["module-role-rank-overrides"],
		queryFn: listRoleRankOverrides,
		enabled: Boolean(active && active.role !== "tenant-admin")
	});

	const visibilityQuery = useQuery({
		queryKey: ["module-visibility"],
		queryFn: listVisibility,
		enabled: Boolean(active && active.role !== "tenant-admin")
	});

	const createMemberMutation = useMutation({
		mutationFn: createMember,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["module-members"] });
			setMemberDraft(memberDefaults);
			setMemberError(null);
		},
		onError: (err) => {
			setMemberError(err instanceof Error ? err.message : "Failed to add member.");
		}
	});

	const deleteMemberMutation = useMutation({
		mutationFn: deleteMember,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-members"] })
	});

	const updateMemberMutation = useMutation({
		mutationFn: ({ id, input }: { id: string; input: CreateMemberInput }) => updateMember(id, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["module-members"] });
			setMemberEdit(null);
		},
		onError: (err) => {
			setMemberError(err instanceof Error ? err.message : "Failed to update member.");
		}
	});

	const createRoleMutation = useMutation({
		mutationFn: createRole,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["module-roles"] });
			setRoleDraft({ name: "", description: "", sortOrder: 0 });
			setRoleError(null);
		},
		onError: (err) => {
			setRoleError(err instanceof Error ? err.message : "Failed to save role.");
		}
	});

	const updateRoleMutation = useMutation({
		mutationFn: ({
			id,
			name,
			description,
			sortOrder
		}: {
			id: string;
			name: string;
			description?: string;
			sortOrder?: number;
		}) => updateRole(id, { name, description, sortOrder }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["module-roles"] });
			setRoleDraft({ name: "", description: "", sortOrder: 0 });
			setRoleError(null);
		},
		onError: (err) => {
			setRoleError(err instanceof Error ? err.message : "Failed to update role.");
		}
	});

	const deleteRoleMutation = useMutation({
		mutationFn: deleteRole,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["module-roles"] });
			setSelectedRoleId(null);
			setRoleDraft({ name: "", description: "", sortOrder: 0 });
		}
	});

	const createRankMutation = useMutation({
		mutationFn: createRank,
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["module-ranks"] });
			queryClient.invalidateQueries({ queryKey: ["module-role-ranks"] });
			if (variables?.roleId) {
				setRoleRankDraft({ name: "", description: "" });
			} else {
				setRankDraft({ name: "", description: "", sortOrder: 0 });
			}
			setRankError(null);
		},
		onError: (err) => {
			setRankError(err instanceof Error ? err.message : "Failed to save rank.");
		}
	});

	const updateRankMutation = useMutation({
		mutationFn: ({
			id,
			name,
			description,
			sortOrder
		}: {
			id: string;
			name: string;
			description?: string;
			sortOrder?: number;
			roleId?: string | null;
		}) => updateRank(id, { name, description, sortOrder }),
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: ["module-ranks"] });
			queryClient.invalidateQueries({ queryKey: ["module-role-ranks"] });
			if (variables?.roleId) {
				setRoleRankDraft({ name: "", description: "" });
			} else {
				setRankDraft({ name: "", description: "", sortOrder: 0 });
			}
			setRankError(null);
		},
		onError: (err) => {
			setRankError(err instanceof Error ? err.message : "Failed to update rank.");
		}
	});

	const deleteRankMutation = useMutation({
		mutationFn: deleteRank,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["module-ranks"] });
			queryClient.invalidateQueries({ queryKey: ["module-role-ranks"] });
		}
	});

	const updateRoleRanksMutation = useMutation({
		mutationFn: ({ roleId, rankIds }: { roleId: string; rankIds: string[] }) =>
			updateRoleRanks(roleId, rankIds),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-role-ranks"] })
	});

	const updateRoleRankOverridesMutation = useMutation({
		mutationFn: ({
			roleId,
			overrides
		}: {
			roleId: string;
			overrides: { rankId: string; name: string }[];
		}) => updateRoleRankOverrides(roleId, overrides),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-role-rank-overrides"] })
	});

	const updateRoleRankOrderMutation = useMutation({
		mutationFn: ({ roleId, rankIds }: { roleId: string; rankIds: string[] }) =>
			updateRoleRankOrder(roleId, rankIds),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-role-ranks"] })
	});

	const updateRoleOrderMutation = useMutation({
		mutationFn: (ids: string[]) => updateRoleOrder(ids),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-roles"] })
	});

	const updateRankOrderMutation = useMutation({
		mutationFn: (ids: string[]) => updateRankOrder(ids),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-ranks"] })
	});

	useEffect(() => {
		if (!selectedRoleId) {
			setRoleRankOverrideDraft({});
			setRoleRankDraft({ name: "", description: "" });
			return;
		}
		const overrides = (roleRankOverridesQuery.data ?? []).filter(
			(item) => item.roleId === selectedRoleId
		);
		const next: Record<string, string> = {};
		for (const item of overrides) {
			next[item.rankId] = item.name;
		}
		setRoleRankOverrideDraft(next);
		setRoleRankDraft({ name: "", description: "" });
	}, [selectedRoleId, roleRankOverridesQuery.data]);

	useEffect(() => {
		if (!rolesQuery.data) return;
		setRoleOrder(rolesQuery.data.map((role) => role.id));
	}, [rolesQuery.data]);

	useEffect(() => {
		if (!ranksQuery.data) return;
		setRankOrder(ranksQuery.data.filter((rank) => !rank.roleId).map((rank) => rank.id));
	}, [ranksQuery.data]);

	useEffect(() => {
		if (!selectedRoleId) {
			setRoleRankOrder([]);
			setCopyRoleId("");
			return;
		}
		const ordered = (roleRanksQuery.data ?? [])
			.filter((row) => row.roleId === selectedRoleId)
			.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
			.map((row) => row.rankId);
		setRoleRankOrder(ordered);
	}, [selectedRoleId, roleRanksQuery.data]);

	const createAccessMutation = useMutation({
		mutationFn: createAccessList,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["module-access-lists"] });
			setAccessDraft({ name: "", description: "", roles: [] });
			setAccessError(null);
		},
		onError: (err) => {
			setAccessError(err instanceof Error ? err.message : "Failed to save access list.");
		}
	});

	const updateAccessMutation = useMutation({
		mutationFn: ({
			id,
			name,
			description,
			roles
		}: {
			id: string;
			name: string;
			description?: string;
			roles?: string[];
		}) => updateAccessList(id, { name, description, roles }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["module-access-lists"] });
			setAccessDraft({ name: "", description: "", roles: [] });
			setAccessError(null);
		},
		onError: (err) => {
			setAccessError(err instanceof Error ? err.message : "Failed to update access list.");
		}
	});

	const deleteAccessMutation = useMutation({
		mutationFn: deleteAccessList,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-access-lists"] })
	});

	const createTenantMutation = useMutation({
		mutationFn: createTenant,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["spine-me"] });
			queryClient.invalidateQueries({ queryKey: ["spine-members"] });
			setTenantError(null);
		},
		onError: (err) => {
			setTenantError(err instanceof Error ? err.message : "Failed to create tenant.");
		}
	});

	const installModuleMutation = useMutation({
		mutationFn: ({ slug, moduleId }: { slug: string; moduleId: string }) =>
			installModule(slug, moduleId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["spine-me"] });
			queryClient.invalidateQueries({ queryKey: ["spine-members"] });
			setModuleError(null);
		},
		onError: (err) => {
			setModuleError(err instanceof Error ? err.message : "Failed to install module.");
		}
	});

	const updateVisibilityMutation = useMutation({
		mutationFn: ({ area, isPublic }: { area: "members" | "roles"; isPublic: boolean }) =>
			updateVisibility(area, isPublic),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["module-visibility"] })
	});

	const summary = useMemo(() => {
		if (!active) return null;
		if (active.role === "tenant-admin") {
			return "Platform-level access: configure frontend selection, billing, and org-wide settings.";
		}
		if (active.role === "tribe-chief") {
			return "Highest in-tribe authority: manage members and roles.";
		}
		if (active.role === "tribe-elder") {
			return "Senior role with limited management access based on tier.";
		}
		return "Member-level access: view tribe info and roster.";
	}, [active]);

	const discordAuthUrl = env.apiBaseUrl
		? new URL("/auth/discord", env.apiBaseUrl).toString()
		: "";
	const logoutUrl = env.apiBaseUrl ? new URL("/auth/logout", env.apiBaseUrl).toString() : "";

	const goToDiscordAuth = () => {
		if (!discordAuthUrl || typeof window === "undefined") return;
		window.location.assign(discordAuthUrl);
	};

	const handleSpineLogout = () => {
		if (!logoutUrl || typeof window === "undefined") return;
		window.location.assign(logoutUrl);
	};

	const enterAdminPortal = () => {
		if (!meQuery.data) return;
		setActive(adminPersona);
		setTenantSection("overview");
	};

	const enterMemberPortal = () => {
		setActive(memberPersona);
		setMemberSection("overview");
	};

	const updateMemberDraft = (next: Partial<CreateMemberInput>) => {
		setMemberDraft((prev) => ({ ...prev, ...next }));
	};

	const updateMemberEditDraft = (next: Partial<CreateMemberInput>) => {
		setMemberEdit((prev) => {
			if (!prev) return prev;
			return { ...prev, draft: { ...prev.draft, ...next } };
		});
	};

	const accessFor = (name: string) => {
		const list = accessListsQuery.data?.find((item) => item.name === name);
		if (!list) return [];
		return list.roles;
	};

	const activeRoleName =
		active?.role === "tribe-chief"
			? "Chief"
			: active?.role === "tribe-elder"
				? "Elder"
				: active?.role === "tribe-member"
					? "Member"
					: null;

	const canManageMembers = Boolean(activeRoleName && accessFor("manage_members").includes(activeRoleName));
	const canManageRoles = Boolean(activeRoleName && accessFor("manage_roles").includes(activeRoleName));
	const canManageAccessLists = Boolean(
		activeRoleName && accessFor("manage_access_lists").includes(activeRoleName)
	);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!activeRoleName) {
			window.localStorage.removeItem("moduleRole");
			return;
		}
		window.localStorage.setItem("moduleRole", activeRoleName);
	}, [activeRoleName]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const slug = meQuery.data?.memberships?.[0]?.slug ?? "";
		if (!slug) {
			window.localStorage.removeItem("activeTenantSlug");
			return;
		}
		window.localStorage.setItem("activeTenantSlug", slug);
	}, [meQuery.data]);

	const updateRoleDraft = (
		next: Partial<{ id?: string; name: string; description: string; sortOrder: number }>
	) => {
		setRoleDraft((prev) => ({ ...prev, ...next }));
	};

	const updateRankDraft = (
		next: Partial<{ id?: string; name: string; description: string; sortOrder: number }>
	) => {
		setRankDraft((prev) => ({ ...prev, ...next }));
	};

	const updateRoleRankDraft = (next: Partial<{ id?: string; name: string; description: string }>) => {
		setRoleRankDraft((prev) => ({ ...prev, ...next }));
	};

	const updateAccessDraft = (
		next: Partial<{ id?: string; name: string; description: string; roles: string[] }>
	) => {
		setAccessDraft((prev) => ({ ...prev, ...next }));
	};

	const toggleRole = (role: string) => {
		const next = new Set(memberDraft.roles ?? []);
		if (next.has(role)) {
			next.delete(role);
		} else {
			next.add(role);
		}
		const roles = Array.from(next);
		const roleRanks = (memberDraft.roleRanks ?? []).filter((entry) => roles.includes(entry.role));
		updateMemberDraft({ roles, roleRanks });
	};

	const resolveRoleRankName = (
		roleId: string,
		rankId: string,
		fallback: string,
		roleSpecific: boolean
	) => {
		if (!roleSpecific) return fallback;
		const override = (roleRankOverridesQuery.data ?? []).find(
			(item) => item.roleId === roleId && item.rankId === rankId
		);
		return override?.name ?? fallback;
	};

	const handleRoleReorder = (dragId: string, dropId: string) => {
		if (dragId === dropId) return;
		const next = [...roleOrder];
		const from = next.indexOf(dragId);
		const to = next.indexOf(dropId);
		if (from === -1 || to === -1) return;
		next.splice(from, 1);
		next.splice(to, 0, dragId);
		setRoleOrder(next);
		updateRoleOrderMutation.mutate(next);
	};

	const handleRankReorder = (dragId: string, dropId: string) => {
		if (dragId === dropId) return;
		const next = [...rankOrder];
		const from = next.indexOf(dragId);
		const to = next.indexOf(dropId);
		if (from === -1 || to === -1) return;
		next.splice(from, 1);
		next.splice(to, 0, dragId);
		setRankOrder(next);
		updateRankOrderMutation.mutate(next);
	};

	const handleRoleRankReorder = (dragId: string, dropId: string) => {
		if (!selectedRoleId || dragId === dropId) return;
		const next = [...roleRankOrder];
		const from = next.indexOf(dragId);
		const to = next.indexOf(dropId);
		if (from === -1 || to === -1) return;
		next.splice(from, 1);
		next.splice(to, 0, dragId);
		setRoleRankOrder(next);
		updateRoleRankOrderMutation.mutate({ roleId: selectedRoleId, rankIds: next });
	};

	const handleCopyRoleRanks = () => {
		if (!canManageRoles) return;
		if (!selectedRoleId || !copyRoleId || copyRoleId === selectedRoleId) return;
		const rankLookup = new Map((ranksQuery.data ?? []).map((rank) => [rank.id, rank]));
		const sourceRankIds = (roleRanksQuery.data ?? [])
			.filter((row) => row.roleId === copyRoleId)
			.filter((row) => !rankLookup.get(row.rankId)?.roleId)
			.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
			.map((row) => row.rankId);
		const sourceOverrides = (roleRankOverridesQuery.data ?? [])
			.filter((item) => item.roleId === copyRoleId)
			.filter((item) => !rankLookup.get(item.rankId)?.roleId)
			.map((item) => ({ rankId: item.rankId, name: item.name }));
		updateRoleRanksMutation.mutate({ roleId: selectedRoleId, rankIds: sourceRankIds });
		updateRoleRankOverridesMutation.mutate({
			roleId: selectedRoleId,
			overrides: sourceOverrides
		});
	};

	const handleAddMember = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canManageMembers) {
			setMemberError("You do not have access to add members.");
			return;
		}
		if (!memberDraft.displayName?.trim()) {
			setMemberError("Name is required.");
			return;
		}

		const rolesInput = Array.isArray(memberDraft.roles)
			? memberDraft.roles.map((role) => role.trim()).filter(Boolean)
			: [];

		createMemberMutation.mutate({
			displayName: memberDraft.displayName.trim(),
			status: memberDraft.status ?? "active",
			walletAddress: memberDraft.walletAddress?.trim() || undefined,
			roles: rolesInput,
			globalRankId: memberDraft.globalRankId || undefined,
			roleRanks: memberDraft.roleRanks?.filter((entry) => rolesInput.includes(entry.role))
		});
	};

	const handleUpdateMember = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!memberEdit) return;
		if (!memberEdit.draft.displayName?.trim()) {
			setMemberError("Name is required.");
			return;
		}

		updateMemberMutation.mutate({
			id: memberEdit.id,
			input: {
				...memberEdit.draft,
				displayName: memberEdit.draft.displayName.trim(),
				walletAddress: memberEdit.draft.walletAddress?.trim() || undefined,
				globalRankId: memberEdit.draft.globalRankId || undefined,
				roleRanks: memberEdit.draft.roleRanks?.filter((entry) =>
					(memberEdit.draft.roles ?? []).includes(entry.role)
				)
			}
		});
	};

	const handleSaveRole = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canManageRoles) {
			setRoleError("You do not have access to manage roles.");
			return;
		}
		if (!roleDraft.name.trim()) {
			setRoleError("Role name is required.");
			return;
		}

		const roleSort = roleDraft.sortOrder > 0 ? roleDraft.sortOrder : undefined;

		if (roleDraft.id) {
			updateRoleMutation.mutate({
				id: roleDraft.id,
				name: roleDraft.name.trim(),
				description: roleDraft.description.trim() || undefined,
				sortOrder: roleSort
			});
		} else {
			createRoleMutation.mutate({
				name: roleDraft.name.trim(),
				description: roleDraft.description.trim() || undefined,
				sortOrder: roleSort
			});
		}
	};

	const handleSaveRank = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canManageRoles) {
			setRankError("You do not have access to manage ranks.");
			return;
		}
		if (!rankDraft.name.trim()) {
			setRankError("Rank name is required.");
			return;
		}

		const rankSort = rankDraft.sortOrder > 0 ? rankDraft.sortOrder : undefined;

		if (rankDraft.id) {
			updateRankMutation.mutate({
				id: rankDraft.id,
				name: rankDraft.name.trim(),
				description: rankDraft.description.trim() || undefined,
				sortOrder: rankSort
			});
		} else {
			createRankMutation.mutate({
				name: rankDraft.name.trim(),
				description: rankDraft.description.trim() || undefined,
				sortOrder: rankSort
			});
		}
	};

	const handleSaveRoleRank = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canManageRoles) {
			setRankError("You do not have access to manage ranks.");
			return;
		}
		if (!selectedRoleId) {
			setRankError("Select a role to add role-specific ranks.");
			return;
		}
		if (!roleRankDraft.name.trim()) {
			setRankError("Rank name is required.");
			return;
		}

		if (roleRankDraft.id) {
			updateRankMutation.mutate({
				id: roleRankDraft.id,
				name: roleRankDraft.name.trim(),
				description: roleRankDraft.description.trim() || undefined,
				roleId: selectedRoleId
			});
		} else {
			createRankMutation.mutate({
				name: roleRankDraft.name.trim(),
				description: roleRankDraft.description.trim() || undefined,
				roleId: selectedRoleId
			});
		}
	};

	const handleSaveAccess = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canManageAccessLists) {
			setAccessError("You do not have access to manage access lists.");
			return;
		}
		if (!accessDraft.name.trim()) {
			setAccessError("Access list name is required.");
			return;
		}

		if (accessDraft.id) {
			updateAccessMutation.mutate({
				id: accessDraft.id,
				name: accessDraft.name.trim(),
				description: accessDraft.description.trim() || undefined,
				roles: accessDraft.roles
			});
		} else {
			createAccessMutation.mutate({
				name: accessDraft.name.trim(),
				description: accessDraft.description.trim() || undefined,
				roles: accessDraft.roles
			});
		}
	};

	const handleCreateTenant = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!tenantDraft.name.trim() || !tenantDraft.slug.trim()) {
			setTenantError("Tenant name and slug are required.");
			return;
		}
		createTenantMutation.mutate({
			name: tenantDraft.name.trim(),
			slug: tenantDraft.slug.trim()
		});
	};

	const handleInstallModule = () => {
		const slug = spineMembership?.slug || tenantDraft.slug.trim();
		if (!slug) {
			setModuleError("Add a tenant slug to install modules.");
			return;
		}
		installModuleMutation.mutate({ slug, moduleId: "basic_tribe_ui" });
	};

	const activeMembers = spineMembership?.slug
		? (spineMembersQuery.data?.members ?? []).map((member) => ({
				id: String(member.id),
				displayName: member.display_name,
				status: "active" as const,
				walletAddress: null,
				roles: member.role ? [member.role] : [],
				globalRank: null,
				roleRanks: []
			}))
		: membersQuery.data ?? [];
	const filteredMembers = activeMembers.filter((member) => {
		const query = memberSearch.trim().toLowerCase();
		if (!query) return true;
		return (
			member.displayName.toLowerCase().includes(query) ||
			member.roles.join(" ").toLowerCase().includes(query) ||
			(member.walletAddress ?? "").toLowerCase().includes(query)
		);
	});

	const filteredRoles = (rolesQuery.data ?? []).filter((role) => {
		const query = roleSearch.trim().toLowerCase();
		if (!query) return true;
		return (
			role.name.toLowerCase().includes(query) ||
			(role.description ?? "").toLowerCase().includes(query)
		);
	});

	const filteredAccessLists = (accessListsQuery.data ?? []).filter((accessList) => {
		const query = accessSearch.trim().toLowerCase();
		if (!query) return true;
		return (
			accessList.name.toLowerCase().includes(query) ||
			(accessList.description ?? "").toLowerCase().includes(query) ||
			accessList.roles.join(" ").toLowerCase().includes(query)
		);
	});

	const globalRanks = (ranksQuery.data ?? []).filter((rank) => !rank.roleId);
	const roleSpecificRanks = selectedRoleId
		? (ranksQuery.data ?? []).filter((rank) => rank.roleId === selectedRoleId)
		: [];
	const roleSpecificRankIds = new Set(roleSpecificRanks.map((rank) => rank.id));
	const orderedRoleSpecificRanks = roleRankOrder.length
		? roleRankOrder
				.map((id) => roleSpecificRanks.find((rank) => rank.id === id))
				.filter((rank): rank is NonNullable<typeof roleSpecificRanks>[number] => Boolean(rank))
		: roleSpecificRanks;
	const selectableRoleRanks = selectedRoleId ? [...globalRanks, ...roleSpecificRanks] : globalRanks;
	const isUsingGlobalRanks = selectedRoleId
		? (roleRanksQuery.data ?? []).filter((row) => row.roleId === selectedRoleId).length === 0
		: true;
	const usingSpineMembers = Boolean(spineMembership?.slug);
	const orderedRoles = roleOrder.length
		? roleOrder
				.map((id) => (rolesQuery.data ?? []).find((role) => role.id === id))
				.filter((role): role is NonNullable<typeof rolesQuery.data>[number] => Boolean(role))
		: rolesQuery.data ?? [];
	const filteredRoleIds = new Set(filteredRoles.map((role) => role.id));
	const orderedFilteredRoles = orderedRoles.filter((role) => filteredRoleIds.has(role.id));

	return (
		<div className="card">
			<h2 style={{ marginTop: 0 }}>VITA Single-Tribe Frontend</h2>
			<p className="small">Minimal UI that proves the API contract for a single tenant.</p>

			{active ? (
				<div className="stack">
					<div className="card subtle">
						<div className="row" style={{ justifyContent: "space-between" }}>
							<div>
								<div style={{ fontWeight: 700 }}>{active.label}</div>
								<div className="small">{summary}</div>
							</div>
							<div className="row">
								{meQuery.data ? (
									<button type="button" onClick={handleSpineLogout}>
										Sign out of spine
									</button>
								) : null}
								<button type="button" onClick={() => setActive(null)}>
									Back
								</button>
							</div>
						</div>
					</div>
					<div className="card subtle">
						<div style={{ fontWeight: 700, marginBottom: 6 }}>Spine session</div>
						{!env.apiBaseUrl ? (
							<div className="small">VITE_API_BASE_URL is not set.</div>
						) : meQuery.isLoading ? (
							<Loading />
						) : meQuery.isError ? (
							<ErrorView title="Failed to load spine session" error={meQuery.error} />
						) : meQuery.data ? (
							<div className="kv">
								<span>User</span>
								<span>{meQuery.data.display_name || meQuery.data.email}</span>
								<span>Tenant</span>
								<span>{spineMembership?.slug ?? "None"}</span>
								<span>Role</span>
								<span>{spineMembership?.role ?? "None"}</span>
							</div>
						) : (
							<div className="small">Not authenticated yet.</div>
						)}
					</div>

					{active.role === "tenant-admin" ? (
						<div className="stack">
							<div className="pill-nav">
								<button
									type="button"
									className={tenantSection === "overview" ? "active" : ""}
									onClick={() => setTenantSection("overview")}
								>
									Tenant overview
								</button>
								<button
									type="button"
									className={tenantSection === "frontend" ? "active" : ""}
									onClick={() => setTenantSection("frontend")}
								>
									Frontend
								</button>
								<button
									type="button"
									className={tenantSection === "billing" ? "active" : ""}
									onClick={() => setTenantSection("billing")}
								>
									Billing
								</button>
							</div>

							{tenantSection === "overview" ? (
								<div className="grid">
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Tribe identity</div>
										<div className="small">Display name, short code, and chain namespace.</div>
										<div className="kv">
											<span>Tribe name</span>
											<span>VITA Example</span>
											<span>Tenant ID</span>
											<span>vita-core-01</span>
											<span>Region</span>
											<span>Primary</span>
										</div>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Contact</div>
										<div className="small">Primary point of contact for spine alerts.</div>
										<div className="kv">
											<span>Owner</span>
											<span>tenant-admin</span>
											<span>Email</span>
											<span>admin@tribe.local</span>
											<span>Webhook</span>
											<span>Disabled</span>
										</div>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Create tenant</div>
										<div className="small">Helper for new tribes using the default UI.</div>
										<form className="stack" onSubmit={handleCreateTenant}>
											<label className="stack">
												<span className="small">Display name</span>
												<input
													value={tenantDraft.name}
													onChange={(event) =>
														setTenantDraft((prev) => ({
															...prev,
															name: event.target.value
														}))
													}
												/>
											</label>
											<label className="stack">
												<span className="small">Slug (URL-safe)</span>
												<input
													value={tenantDraft.slug}
													onChange={(event) =>
														setTenantDraft((prev) => ({
															...prev,
															slug: event.target.value
														}))
													}
													placeholder="vita-prime"
												/>
											</label>
											<div className="row">
												<button type="submit" disabled={createTenantMutation.isPending}>
													{createTenantMutation.isPending ? "Creating..." : "Create tenant"}
												</button>
												{tenantError ? <span className="small">{tenantError}</span> : null}
											</div>
										</form>
										<div className="small">
											Example: use display name "V.I.T.A." with slug "vita" for a clean URL.
										</div>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Security</div>
										<div className="small">Wallet authentication will land here (Sui).</div>
										<div className="row">
											<button type="button">Rotate admin key</button>
											<button type="button">View audit log</button>
										</div>
									</div>
								</div>
							) : null}

							{tenantSection === "frontend" ? (
								<div className="grid">
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Default frontend</div>
										<div className="small">Currently using the EF-VITA minimal UI.</div>
										<div className="row">
											<button type="button">Keep default</button>
											<button type="button">Upload custom</button>
										</div>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Module install</div>
										<div className="small">Install the default tribe module on the spine.</div>
										<div className="row">
											<button
												type="button"
												onClick={handleInstallModule}
												disabled={installModuleMutation.isPending}
											>
												{installModuleMutation.isPending ? "Installing..." : "Install Basic Tribe UI"}
											</button>
											{moduleError ? <span className="small">{moduleError}</span> : null}
										</div>
										<div className="small">
											Targets: /t/
											{spineMembership?.slug || tenantDraft.slug.trim() || "your-tribe"}
											/modules/basic_tribe_ui/install
										</div>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Routing</div>
										<div className="small">Map a vanity domain when you are ready.</div>
										<div className="row">
											<button type="button">Set domain</button>
											<button type="button">Verify</button>
										</div>
									</div>
								</div>
							) : null}

							{tenantSection === "billing" ? (
								<div className="grid">
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Plan</div>
										<div className="small">Starter (single-tribe)</div>
										<div className="row">
											<button type="button">Upgrade</button>
											<button type="button">View invoices</button>
										</div>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Payment method</div>
										<div className="small">Sui wallet only (no off-chain cards).</div>
										<button type="button">Connect Sui wallet</button>
									</div>
								</div>
							) : null}
						</div>
					) : (
						<div className="stack">
							<div className="pill-nav">
								<button
									type="button"
									className={memberSection === "overview" ? "active" : ""}
									onClick={() => setMemberSection("overview")}
								>
									Overview
								</button>
								<button
									type="button"
									className={memberSection === "members" ? "active" : ""}
									onClick={() => setMemberSection("members")}
								>
									Members
								</button>
								<button
									type="button"
									className={memberSection === "roles" ? "active" : ""}
									onClick={() => setMemberSection("roles")}
								>
									Roles
								</button>
								<button
									type="button"
									className={memberSection === "access" ? "active" : ""}
									onClick={() => setMemberSection("access")}
								>
									Access
								</button>
							</div>

							{memberSection === "overview" ? (
								<div className="grid">
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Tribe snapshot</div>
										<div className="kv">
											<span>Members</span>
											<span>18</span>
											<span>Active roles</span>
											<span>9</span>
											<span>Pending invites</span>
											<span>2</span>
										</div>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Your access</div>
										<div className="small">
											Role-based access applies. Access lists define what each role can do.
										</div>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Visibility</div>
										<div className="small">Control what members can see by default.</div>
										{visibilityQuery.isLoading ? <Loading /> : null}
										{visibilityQuery.isError ? (
											<ErrorView title="Failed to load visibility" error={visibilityQuery.error} />
										) : null}
											{visibilityQuery.data ? (
												<div className="stack">
													{(["members", "roles"] as const).map((area) => {
														const setting = visibilityQuery.data?.find((item) => item.area === area);
														const isPublic = setting?.isPublic ?? (area === "members");
														const label = area === "members" ? "Member list" : "Roles";
													return (
														<label key={area} className="row">
															<input
																type="checkbox"
																checked={isPublic}
																disabled={!canManageRoles || updateVisibilityMutation.isPending}
																onChange={(event) =>
																	updateVisibilityMutation.mutate({
																		area,
																		isPublic: event.target.checked
																	})
																}
															/>
															<span className="small">
																{label} is {isPublic ? "public" : "auth-only"}
															</span>
														</label>
													);
												})}
												{!canManageRoles ? (
													<span className="small">You do not have access to change visibility.</span>
												) : null}
											</div>
										) : null}
									</div>
								</div>
							) : null}

							{memberSection === "members" ? (
								<div className="card">
									<div className="row" style={{ justifyContent: "space-between" }}>
										<div style={{ fontWeight: 700 }}>Member list</div>
										<span className="small">Source: module DB</span>
									</div>

									<label className="stack">
										<span className="small">Search members</span>
										<input
											value={memberSearch}
											onChange={(event) => setMemberSearch(event.target.value)}
											placeholder="Name, role, wallet..."
										/>
									</label>

									{canManageMembers ? (
										!usingSpineMembers ? (
											<form className="stack" onSubmit={handleAddMember}>
											<div className="grid">
												<label className="stack">
													<span className="small">Display name</span>
													<input
														value={memberDraft.displayName ?? ""}
														onChange={(event) => updateMemberDraft({ displayName: event.target.value })}
													/>
												</label>
												<label className="stack">
													<span className="small">Roles</span>
													{rolesQuery.isLoading ? (
														<div className="small">Loading roles...</div>
													) : rolesQuery.isError ? (
														<div className="small">Failed to load roles.</div>
													) : (
														<div className="dropdown">
															<button
																className="dropdown-trigger"
																type="button"
																onClick={() => setRolesOpen((open) => !open)}
															>
																{memberDraft.roles?.length
																	? `${memberDraft.roles.length} selected`
																	: "Select roles"}
															</button>
															{rolesOpen ? (
																<div className="dropdown-menu">
																	{(rolesQuery.data ?? []).map((role) => {
																		const checked = memberDraft.roles?.includes(role.name) ?? false;
																		return (
																			<label key={role.id} className="dropdown-item">
																				<input
																					type="checkbox"
																					checked={checked}
																					onChange={() => toggleRole(role.name)}
																				/>
																				<span>{role.name}</span>
																			</label>
																		);
																	})}
																</div>
															) : null}
														</div>
													)}
												</label>
												<label className="stack">
													<span className="small">Global rank</span>
													{ranksQuery.isLoading ? (
														<div className="small">Loading ranks...</div>
													) : ranksQuery.isError ? (
														<div className="small">Failed to load ranks.</div>
													) : (
														<select
															value={memberDraft.globalRankId ?? ""}
															onChange={(event) =>
																updateMemberDraft({
																	globalRankId: event.target.value || ""
																})
															}
														>
															<option value="">None</option>
															{globalRanks.map((rank) => (
																<option key={rank.id} value={rank.id}>
																	{rank.name}
																</option>
															))}
														</select>
													)}
												</label>
												<label className="stack">
													<span className="small">Status</span>
													<select
														value={memberDraft.status ?? "active"}
														onChange={(event) =>
															updateMemberDraft({
																status: event.target.value as CreateMemberInput["status"]
															})
														}
													>
														<option value="active">Active</option>
														<option value="pending">Pending</option>
														<option value="suspended">Suspended</option>
													</select>
												</label>
												<label className="stack">
													<span className="small">Wallet address</span>
													<input
														value={memberDraft.walletAddress ?? ""}
														onChange={(event) =>
															updateMemberDraft({ walletAddress: event.target.value })
														}
													/>
												</label>
											</div>
											{memberDraft.roles?.length ? (
												<div className="stack">
													<span className="small">Role ranks</span>
													{memberDraft.roles.map((roleName) => {
														const role = rolesQuery.data?.find((item) => item.name === roleName);
														const roleRankIds =
															roleRanksQuery.data
																?.filter((row) => row.roleId === role?.id)
																.map((row) => row.rankId) ?? [];
														const roleSpecific = roleRankIds.length > 0;
														const availableRanks =
															roleRankIds.length > 0
																? (ranksQuery.data ?? []).filter((rank) => roleRankIds.includes(rank.id))
																: globalRanks;
														const current = memberDraft.roleRanks?.find(
															(entry) => entry.role === roleName
														);
														return (
															<label key={roleName} className="stack">
																<span className="small">{roleName}</span>
																<select
																	value={current?.rankId ?? ""}
																	onChange={(event) => {
																		const nextRankId = event.target.value;
																		const next = [...(memberDraft.roleRanks ?? [])];
																		const existing = next.find((entry) => entry.role === roleName);
																		if (existing) {
																			if (nextRankId) {
																				existing.rankId = nextRankId;
																			} else {
																				const filtered = next.filter(
																					(entry) => entry.role !== roleName
																				);
																				updateMemberDraft({ roleRanks: filtered });
																				return;
																			}
																		} else if (nextRankId) {
																			next.push({ role: roleName, rankId: nextRankId });
																		}
																		updateMemberDraft({ roleRanks: next });
																	}}
																>
																	<option value="">None</option>
																	{availableRanks.map((rank) => (
																		<option key={rank.id} value={rank.id}>
																			{role?.id
																				? resolveRoleRankName(role.id, rank.id, rank.name, roleSpecific)
																				: rank.name}
																		</option>
																	))}
																</select>
															</label>
														);
													})}
												</div>
											) : null}
											<div className="row">
												<button type="submit" disabled={createMemberMutation.isPending}>
													{createMemberMutation.isPending ? "Saving..." : "Add member"}
												</button>
												{memberError ? <span className="small">{memberError}</span> : null}
											</div>
										</form>
										) : (
											<div className="small">Member management happens in the spine.</div>
										)
									) : null}

									{usingSpineMembers ? (spineMembersQuery.isLoading ? <Loading /> : null) : null}
									{!usingSpineMembers ? (membersQuery.isLoading ? <Loading /> : null) : null}
									{usingSpineMembers && spineMembersQuery.isError ? (
										<ErrorView title="Failed to load members" error={spineMembersQuery.error} />
									) : null}
									{!usingSpineMembers && membersQuery.isError ? (
										<ErrorView title="Failed to load members" error={membersQuery.error} />
									) : null}

									{membersQuery.data ? (
										<div className="table">
											<div className="table-row table-header">
												<span>Name</span>
												<span>Roles</span>
												<span>Ranks</span>
												<span>Status</span>
												<span>Wallet</span>
												<span />
											</div>
											{filteredMembers.map((member) => (
												<div className="table-row" key={member.id}>
													<span>{member.displayName}</span>
													<span>{member.roles.length ? member.roles.join(", ") : "-"}</span>
													<span>
														{[
															member.globalRank?.name
																? `Global: ${member.globalRank.name}`
																: null,
															(member.roleRanks ?? []).length
																? member.roleRanks
																		.map((entry) => `${entry.role}: ${entry.rank}`)
																		.join(", ")
																: null
														]
															.filter(Boolean)
															.join(" | ") || "-"}
													</span>
													<span className={member.status === "active" ? "chip good" : "chip warn"}>
														{member.status}
													</span>
													<span className="mono">{member.walletAddress ?? "-"}</span>
													<span>
														{!usingSpineMembers ? (
															<div className="row">
																<button
																	type="button"
																	onClick={() =>
																		setMemberEdit({
																			id: member.id,
																			draft: {
																				displayName: member.displayName,
																				status: member.status,
																				walletAddress: member.walletAddress ?? "",
																				roles: member.roles,
																				globalRankId: member.globalRank?.id ?? "",
																				roleRanks: (member.roleRanks ?? []).map((entry) => ({
																					role: entry.role,
																					rankId: entry.rankId
																				}))
																			},
																			readonly: !canManageMembers
																		})
																	}
																>
																	{canManageMembers ? "Edit" : "View"}
																</button>
																{canManageMembers ? (
																	<button
																		type="button"
																		onClick={() => deleteMemberMutation.mutate(member.id)}
																		disabled={deleteMemberMutation.isPending}
																	>
																		Remove
																	</button>
																) : null}
															</div>
														) : null}
													</span>
												</div>
											))}
										</div>
									) : null}
									{memberEdit && !usingSpineMembers ? (
										<div className="card subtle">
											<div style={{ fontWeight: 700, marginBottom: 6 }}>
												{memberEdit.readonly ? "Member profile" : "Edit member"}
											</div>
											{memberEdit.readonly ? (
												<div className="stack">
													<div className="small">
														Accolades, accomplishments, medals, and titles will appear here.
													</div>
													<div className="row">
														<button type="button" onClick={() => setMemberEdit(null)}>
															Close
														</button>
													</div>
												</div>
											) : (
												<form className="stack" onSubmit={handleUpdateMember}>
													<div className="grid">
														<label className="stack">
															<span className="small">Display name</span>
															<input
																value={memberEdit.draft.displayName ?? ""}
																onChange={(event) =>
																	updateMemberEditDraft({ displayName: event.target.value })
																}
															/>
														</label>
														<label className="stack">
															<span className="small">Roles</span>
															<div className="dropdown">
																<button
																	className="dropdown-trigger"
																	type="button"
																	onClick={() => setRolesOpen((open) => !open)}
																>
																	{memberEdit.draft.roles?.length
																		? `${memberEdit.draft.roles.length} selected`
																		: "Select roles"}
																</button>
																{rolesOpen ? (
																	<div className="dropdown-menu">
																		{(rolesQuery.data ?? []).map((role) => {
																			const checked =
																				memberEdit.draft.roles?.includes(role.name) ?? false;
																			return (
																				<label key={role.id} className="dropdown-item">
																					<input
																						type="checkbox"
																						checked={checked}
																						onChange={() => {
																							const next = new Set(memberEdit.draft.roles ?? []);
																							if (next.has(role.name)) {
																								next.delete(role.name);
																							} else {
																								next.add(role.name);
																							}
																							updateMemberEditDraft({
																								roles: Array.from(next)
																							});
																						}}
																					/>
																					<span>{role.name}</span>
																				</label>
																			);
																		})}
																	</div>
																) : null}
															</div>
														</label>
														<label className="stack">
															<span className="small">Global rank</span>
															<select
																value={memberEdit.draft.globalRankId ?? ""}
																onChange={(event) =>
																	updateMemberEditDraft({
																		globalRankId: event.target.value || ""
																	})
																}
															>
																<option value="">None</option>
																{globalRanks.map((rank) => (
																	<option key={rank.id} value={rank.id}>
																		{rank.name}
																	</option>
																))}
															</select>
														</label>
														<label className="stack">
															<span className="small">Status</span>
															<select
																value={memberEdit.draft.status ?? "active"}
																onChange={(event) =>
																	updateMemberEditDraft({
																		status: event.target.value as CreateMemberInput["status"]
																	})
																}
															>
																<option value="active">Active</option>
																<option value="pending">Pending</option>
																<option value="suspended">Suspended</option>
															</select>
														</label>
														<label className="stack">
															<span className="small">Wallet address</span>
															<input
																value={memberEdit.draft.walletAddress ?? ""}
																onChange={(event) =>
																	updateMemberEditDraft({ walletAddress: event.target.value })
																}
															/>
														</label>
													</div>
													{memberEdit.draft.roles?.length ? (
														<div className="stack">
															<span className="small">Role ranks</span>
															{memberEdit.draft.roles.map((roleName) => {
																const role = rolesQuery.data?.find((item) => item.name === roleName);
															const roleRankIds =
																roleRanksQuery.data
																	?.filter((row) => row.roleId === role?.id)
																	.map((row) => row.rankId) ?? [];
															const roleSpecific = roleRankIds.length > 0;
															const availableRanks =
																roleRankIds.length > 0
																	? (ranksQuery.data ?? []).filter((rank) => roleRankIds.includes(rank.id))
																	: globalRanks;
																const current = memberEdit.draft.roleRanks?.find(
																	(entry) => entry.role === roleName
																);
																return (
																	<label key={roleName} className="stack">
																		<span className="small">{roleName}</span>
																		<select
																			value={current?.rankId ?? ""}
																			onChange={(event) => {
																				const nextRankId = event.target.value;
																				const next = [...(memberEdit.draft.roleRanks ?? [])];
																				const existing = next.find((entry) => entry.role === roleName);
																				if (existing) {
																					if (nextRankId) {
																						existing.rankId = nextRankId;
																					} else {
																						updateMemberEditDraft({
																							roleRanks: next.filter((entry) => entry.role !== roleName)
																						});
																						return;
																					}
																				} else if (nextRankId) {
																					next.push({ role: roleName, rankId: nextRankId });
																				}
																				updateMemberEditDraft({ roleRanks: next });
																			}}
																		>
																			<option value="">None</option>
																			{availableRanks.map((rank) => (
																				<option key={rank.id} value={rank.id}>
																					{role?.id
																						? resolveRoleRankName(role.id, rank.id, rank.name, roleSpecific)
																						: rank.name}
																				</option>
																			))}
																		</select>
																	</label>
																);
															})}
														</div>
													) : null}
													<div className="row">
														<button type="submit" disabled={updateMemberMutation.isPending}>
															{updateMemberMutation.isPending ? "Saving..." : "Save changes"}
														</button>
														<button type="button" onClick={() => setMemberEdit(null)}>
															Cancel
														</button>
													</div>
												</form>
											)}
										</div>
									) : null}
								</div>
							) : null}

							{memberSection === "roles" ? (
								<div className="grid">
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Roles</div>
										<div className="small">Pick a role to configure ranks for that role.</div>
										<label className="stack">
											<span className="small">Search roles</span>
											<input
												value={roleSearch}
												onChange={(event) => setRoleSearch(event.target.value)}
												placeholder="Name or description"
											/>
										</label>
										{rolesQuery.isLoading ? <Loading /> : null}
										{rolesQuery.isError ? (
											<ErrorView title="Failed to load roles" error={rolesQuery.error} />
										) : null}
										{rolesQuery.data ? (
											<ul className="list">
												<li>
													<button
														type="button"
														className={selectedRoleId ? "" : "active"}
														onClick={() => {
															setSelectedRoleId(null);
															setRoleDraft({ name: "", description: "", sortOrder: 0 });
														}}
													>
														Global ranks
													</button>
												</li>
												{orderedFilteredRoles.map((role) => (
													<li
														key={role.id}
														draggable={canManageRoles}
														onDragStart={(event) => {
															if (!canManageRoles) return;
															event.dataTransfer.setData("text/plain", role.id);
														}}
														onDragOver={(event) => {
															if (!canManageRoles) return;
															event.preventDefault();
														}}
														onDrop={(event) => {
															if (!canManageRoles) return;
															event.preventDefault();
															const dragId = event.dataTransfer.getData("text/plain");
															handleRoleReorder(dragId, role.id);
														}}
													>
														<button
															type="button"
															className={selectedRoleId === role.id ? "active" : ""}
															onClick={() => {
																setSelectedRoleId(role.id);
																setRoleDraft({
																	id: role.id,
																	name: role.name,
																	description: role.description ?? "",
																	sortOrder: role.sortOrder ?? 0
																});
															}}
														>
															{role.name}
														</button>
													</li>
												))}
												{!orderedFilteredRoles.length ? (
													<li>
														<span className="small">No roles match your search.</span>
													</li>
												) : null}
											</ul>
										) : null}
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>
											{selectedRoleId ? "Role ranks" : "Global ranks"}
										</div>
										<div className="small">
											{selectedRoleId
												? "Toggle between global ranks and role-specific ranks."
												: "Global ranks are used by default."}
										</div>
										{selectedRoleId ? (
											<div className="stack">
												{canManageRoles ? (
													<label className="row">
														<input
															type="checkbox"
															checked={isUsingGlobalRanks}
															onChange={(event) => {
																if (event.target.checked) {
																	updateRoleRanksMutation.mutate({
																		roleId: selectedRoleId,
																		rankIds: []
																	});
															} else {
																const globalRankIds = globalRanks.map((rank) => rank.id);
																const roleRankIds = roleSpecificRanks.map((rank) => rank.id);
																updateRoleRanksMutation.mutate({
																	roleId: selectedRoleId,
																	rankIds: [...globalRankIds, ...roleRankIds]
																});
															}
														}}
													/>
														<span className="small">Use global ranks</span>
													</label>
												) : null}
												{isUsingGlobalRanks ? (
													<div className="small">Using global ranks.</div>
												) : (
													<>
														{canManageRoles ? (
															<div className="dropdown">
																<button
																	className="dropdown-trigger"
																	type="button"
																	onClick={() => setRankRolesOpen((open) => !open)}
																>
																	Select ranks for this role
																</button>
																{rankRolesOpen ? (
																	<div className="dropdown-menu">
																	{selectableRoleRanks.map((rank) => {
																			const checked = (roleRanksQuery.data ?? []).some(
																				(row) => row.roleId === selectedRoleId && row.rankId === rank.id
																			);
																			return (
																				<label key={rank.id} className="dropdown-item">
																					<input
																						type="checkbox"
																						checked={checked}
																						onChange={() => {
																							const existing = (roleRanksQuery.data ?? [])
																								.filter((row) => row.roleId === selectedRoleId)
																								.map((row) => row.rankId);
																							const next = new Set(existing);
																							if (next.has(rank.id)) {
																								next.delete(rank.id);
																							} else {
																								next.add(rank.id);
																							}
																							updateRoleRanksMutation.mutate({
																								roleId: selectedRoleId,
																								rankIds: Array.from(next)
																							});
																						}}
																					/>
																					<span>{rank.name}</span>
																				</label>
																			);
																		})}
																	</div>
																) : null}
															</div>
														) : null}
													</>
												)}
												{canManageRoles && (rolesQuery.data ?? []).length > 1 ? (
													<div className="stack">
														<span className="small">Copy ranks from role</span>
														<div className="row">
															<select
																value={copyRoleId}
																onChange={(event) => setCopyRoleId(event.target.value)}
															>
																<option value="">Select role</option>
																{(rolesQuery.data ?? [])
																	.filter((role) => role.id !== selectedRoleId)
																	.map((role) => (
																		<option key={role.id} value={role.id}>
																			{role.name}
																		</option>
																	))}
															</select>
															<button
																type="button"
																onClick={handleCopyRoleRanks}
																disabled={!copyRoleId}
															>
																Copy
															</button>
														</div>
														<span className="small">
															Copying pulls global ranks and their custom names from the source role.
														</span>
													</div>
												) : null}
												{(roleRanksQuery.data ?? []).some(
													(row) => row.roleId === selectedRoleId
												) ? (
													<div className="table table-3">
														<div className="table-row table-header">
															<span>Rank</span>
															<span>Custom name</span>
															<span />
														</div>
														{roleRankOrder.map((rankId) => {
															const row = (roleRanksQuery.data ?? []).find(
																(item) => item.roleId === selectedRoleId && item.rankId === rankId
															);
															if (!row) return null;
																const rank = (ranksQuery.data ?? []).find(
																	(item) => item.id === rankId
																);
																const customName = roleRankOverrideDraft[rankId] ?? "";
																const isRoleSpecificRank = roleSpecificRankIds.has(rankId);
																return (
																	<div
																		className="table-row"
																		key={rankId}
																		draggable={canManageRoles}
																		onDragStart={(event) => {
																			if (!canManageRoles) return;
																			event.dataTransfer.setData("text/plain", rankId);
																		}}
																		onDragOver={(event) => {
																			if (!canManageRoles) return;
																			event.preventDefault();
																		}}
																		onDrop={(event) => {
																			if (!canManageRoles) return;
																			event.preventDefault();
																			const dragId = event.dataTransfer.getData("text/plain");
																			handleRoleRankReorder(dragId, rankId);
																		}}
																	>
																		<span>{rank?.name ?? "-"}</span>
																		{isRoleSpecificRank ? (
																			<span>-</span>
																		) : canManageRoles ? (
																			<input
																				value={customName}
																				placeholder="Use global name"
																				onChange={(event) => {
																					const value = event.target.value;
																					setRoleRankOverrideDraft((prev) => ({
																						...prev,
																						[rankId]: value
																					}));
																				}}
																			/>
																		) : (
																			<span>{customName || "-"}</span>
																		)}
																		<span />
																	</div>
																);
															})}
													</div>
												) : null}
												{(roleRanksQuery.data ?? []).some(
													(row) => row.roleId === selectedRoleId
												) ? (
													<>
														{canManageRoles ? (
															<div className="row">
																<button
																	type="button"
																	onClick={() => {
																		const overrides = Object.entries(roleRankOverrideDraft)
																			.filter(([, value]) => value.trim())
																			.map(([rankId, name]) => ({
																				rankId,
																				name
																			}));
																		updateRoleRankOverridesMutation.mutate({
																			roleId: selectedRoleId,
																			overrides
																		});
																	}}
																	disabled={updateRoleRankOverridesMutation.isPending}
																>
																	Save custom names
																</button>
															</div>
														) : null}
													</>
												) : null}
												{canManageRoles && !isUsingGlobalRanks ? (
													<div className="stack">
														<div style={{ fontWeight: 600 }}>Role-only ranks</div>
														<form className="stack" onSubmit={handleSaveRoleRank}>
															<label className="stack">
																<span className="small">Rank name</span>
																<input
																	value={roleRankDraft.name}
																	onChange={(event) =>
																		updateRoleRankDraft({ name: event.target.value })
																	}
																/>
															</label>
															<label className="stack">
																<span className="small">Description</span>
																<input
																	value={roleRankDraft.description}
																	onChange={(event) =>
																		updateRoleRankDraft({ description: event.target.value })
																	}
																/>
															</label>
															<div className="row">
																<button
																	type="submit"
																	disabled={createRankMutation.isPending || updateRankMutation.isPending}
																>
																	{roleRankDraft.id ? "Update rank" : "Add role rank"}
																</button>
																{roleRankDraft.id ? (
																	<button
																		type="button"
																		onClick={() => setRoleRankDraft({ name: "", description: "" })}
																	>
																		Cancel
																	</button>
																) : null}
															</div>
														</form>
														{rankError ? <span className="small">{rankError}</span> : null}
														{orderedRoleSpecificRanks.length ? (
															<div className="table table-3">
																<div className="table-row table-header">
																	<span>Rank</span>
																	<span>Description</span>
																	<span />
																</div>
																{orderedRoleSpecificRanks.map((rank) => (
																	<div className="table-row" key={rank.id}>
																		<span>{rank.name}</span>
																		<span>{rank.description ?? "-"}</span>
																		<span className="row">
																			<button
																				type="button"
																				onClick={() =>
																					setRoleRankDraft({
																						id: rank.id,
																						name: rank.name,
																						description: rank.description ?? ""
																					})
																				}
																			>
																				Edit
																			</button>
																			<button
																				type="button"
																				onClick={() => deleteRankMutation.mutate(rank.id)}
																				disabled={deleteRankMutation.isPending}
																			>
																				Remove
																			</button>
																		</span>
																	</div>
																))}
															</div>
														) : (
															<span className="small">No role-only ranks yet.</span>
														)}
													</div>
												) : null}
											</div>
										) : (
											<div className="stack">
												{canManageRoles ? (
													<form className="stack" onSubmit={handleSaveRank}>
														<label className="stack">
															<span className="small">Rank name</span>
															<input
																value={rankDraft.name}
																onChange={(event) => updateRankDraft({ name: event.target.value })}
															/>
														</label>
														<label className="stack">
															<span className="small">Sort order</span>
															<input
																type="number"
																value={rankDraft.sortOrder || ""}
																onChange={(event) =>
																	updateRankDraft({ sortOrder: Number(event.target.value) })
																}
															/>
														</label>
														<label className="stack">
															<span className="small">Description</span>
															<input
																value={rankDraft.description}
																onChange={(event) =>
																	updateRankDraft({ description: event.target.value })
																}
															/>
														</label>
														<div className="row">
															<button
																type="submit"
																disabled={createRankMutation.isPending || updateRankMutation.isPending}
															>
																{rankDraft.id ? "Update rank" : "Add rank"}
															</button>
															{rankDraft.id ? (
																<button
																	type="button"
																	onClick={() =>
																		setRankDraft({ name: "", description: "", sortOrder: 0 })
																	}
																>
																	Cancel
																</button>
															) : null}
														</div>
														{rankError ? <span className="small">{rankError}</span> : null}
													</form>
												) : null}
												{ranksQuery.data ? (
													<div className="table table-3">
														<div className="table-row table-header">
															<span>Rank</span>
															<span>Description</span>
															<span />
														</div>
														{rankOrder
															.map((id) => ranksQuery.data.find((rank) => rank.id === id))
															.filter(Boolean)
															.map((rank) => (
															<div
																className="table-row"
																key={rank.id}
																draggable={canManageRoles}
																onDragStart={(event) => {
																	if (!canManageRoles) return;
																	event.dataTransfer.setData("text/plain", rank.id);
																}}
																onDragOver={(event) => {
																	if (!canManageRoles) return;
																	event.preventDefault();
																}}
																onDrop={(event) => {
																	if (!canManageRoles) return;
																	event.preventDefault();
																	const dragId = event.dataTransfer.getData("text/plain");
																	handleRankReorder(dragId, rank.id);
																}}
															>
																<span>{rank.name}</span>
																<span>{rank.description ?? "-"}</span>
																<span className="row">
																	{canManageRoles ? (
																		<>
																			<button
																				type="button"
																				onClick={() =>
																					setRankDraft({
																						id: rank.id,
																						name: rank.name,
																						description: rank.description ?? "",
																						sortOrder: rank.sortOrder ?? 0
																					})
																				}
																			>
																				Edit
																			</button>
																			<button
																				type="button"
																				onClick={() => deleteRankMutation.mutate(rank.id)}
																				disabled={deleteRankMutation.isPending}
																			>
																				Remove
																			</button>
																		</>
																	) : null}
																</span>
															</div>
														))}
													</div>
												) : null}
											</div>
										)}
									</div>
									{canManageRoles ? (
										<div className="card">
											<div style={{ fontWeight: 700, marginBottom: 6 }}>Role management</div>
											<div className="small">
												Role assignment appears only if your access list permits.
											</div>
											<form className="stack" onSubmit={handleSaveRole}>
												<label className="stack">
													<span className="small">Role name</span>
													<input
														value={roleDraft.name}
														onChange={(event) => updateRoleDraft({ name: event.target.value })}
													/>
												</label>
												<label className="stack">
													<span className="small">Sort order</span>
													<input
														type="number"
														value={roleDraft.sortOrder || ""}
														onChange={(event) =>
															updateRoleDraft({ sortOrder: Number(event.target.value) })
														}
													/>
												</label>
												<label className="stack">
													<span className="small">Description</span>
													<input
														value={roleDraft.description}
														onChange={(event) => updateRoleDraft({ description: event.target.value })}
													/>
												</label>
												<div className="row">
													<button
														type="submit"
														disabled={createRoleMutation.isPending || updateRoleMutation.isPending}
													>
														{roleDraft.id ? "Update role" : "Add role"}
													</button>
													{roleDraft.id ? (
														<>
															<button
																type="button"
																onClick={() =>
																	setRoleDraft({ name: "", description: "", sortOrder: 0 })
																}
															>
																Cancel
															</button>
															<button
																type="button"
																onClick={() => deleteRoleMutation.mutate(roleDraft.id as string)}
																disabled={deleteRoleMutation.isPending}
															>
																Delete role
															</button>
														</>
													) : null}
												</div>
												{roleError ? <span className="small">{roleError}</span> : null}
											</form>
										</div>
									) : null}
								</div>
							) : null}

							{memberSection === "access" ? (
								<div className="grid">
									{canManageAccessLists ? (
										<div className="card">
											<div style={{ fontWeight: 700, marginBottom: 6 }}>Access list</div>
											<div className="small">Access lists map roles to permissions.</div>
											<form className="stack" onSubmit={handleSaveAccess}>
												<label className="stack">
													<span className="small">Access list name</span>
													<input
														value={accessDraft.name}
														onChange={(event) => updateAccessDraft({ name: event.target.value })}
													/>
												</label>
												<label className="stack">
													<span className="small">Description</span>
													<input
														value={accessDraft.description}
														onChange={(event) =>
															updateAccessDraft({ description: event.target.value })
														}
													/>
												</label>
												<label className="stack">
													<span className="small">Roles</span>
													{rolesQuery.isLoading ? (
														<div className="small">Loading roles...</div>
													) : rolesQuery.isError ? (
														<div className="small">Failed to load roles.</div>
													) : (
														<div className="dropdown">
															<button
																className="dropdown-trigger"
																type="button"
																onClick={() => setAccessRolesOpen((open) => !open)}
															>
																{accessDraft.roles.length
																	? `${accessDraft.roles.length} selected`
																	: "Select roles"}
															</button>
															{accessRolesOpen ? (
																<div className="dropdown-menu">
																	{(rolesQuery.data ?? []).map((role) => {
																		const checked = accessDraft.roles.includes(role.name);
																		return (
																			<label key={role.id} className="dropdown-item">
																				<input
																					type="checkbox"
																					checked={checked}
																					onChange={() => {
																						const next = new Set(accessDraft.roles);
																						if (next.has(role.name)) {
																							next.delete(role.name);
																						} else {
																							next.add(role.name);
																						}
																						updateAccessDraft({
																							roles: Array.from(next)
																						});
																					}}
																				/>
																				<span>{role.name}</span>
																			</label>
																		);
																	})}
																</div>
															) : null}
														</div>
													)}
												</label>
												<div className="row">
													<button
														type="submit"
														disabled={createAccessMutation.isPending || updateAccessMutation.isPending}
													>
														{accessDraft.id ? "Update access list" : "Add access list"}
													</button>
													{accessDraft.id ? (
														<button
															type="button"
															onClick={() =>
																setAccessDraft({ name: "", description: "", roles: [] })
															}
														>
															Cancel
														</button>
													) : null}
												</div>
												{accessError ? <span className="small">{accessError}</span> : null}
											</form>
										</div>
									) : null}
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Access lists</div>
										<label className="stack">
											<span className="small">Search access lists</span>
											<input
												value={accessSearch}
												onChange={(event) => setAccessSearch(event.target.value)}
												placeholder="Name, role, description"
											/>
										</label>
										{accessListsQuery.isLoading ? <Loading /> : null}
										{accessListsQuery.isError ? (
											<ErrorView title="Failed to load access lists" error={accessListsQuery.error} />
										) : null}
										{accessListsQuery.data ? (
											<div className="table table-3">
												<div className="table-row table-header">
													<span>List</span>
													<span>Roles</span>
													<span />
												</div>
												{filteredAccessLists.map((accessList) => (
													<div className="table-row" key={accessList.id}>
														<span>{accessList.name}</span>
														<span>{accessList.roles.length ? accessList.roles.join(", ") : "-"}</span>
														<span className="row">
															{canManageAccessLists ? (
																<>
																	<button
																		type="button"
																		onClick={() =>
																			setAccessDraft({
																				id: accessList.id,
																				name: accessList.name,
																				description: accessList.description ?? "",
																				roles: accessList.roles ?? []
																			})
																		}
																	>
																		Edit
																	</button>
																	<button
																		type="button"
																		onClick={() => deleteAccessMutation.mutate(accessList.id)}
																		disabled={deleteAccessMutation.isPending}
																	>
																		Remove
																	</button>
																</>
															) : null}
														</span>
													</div>
												))}
											</div>
										) : null}
									</div>
								</div>
							) : null}
						</div>
					)}
				</div>
			) : (
				<div className="stack">
					<div className="card subtle">
						<div style={{ fontWeight: 700, marginBottom: 6 }}>Admin login</div>
						<div className="small">Discord OAuth only for spine-level access.</div>
						{!env.apiBaseUrl ? (
							<div className="small">Set `VITE_API_BASE_URL` to enable login.</div>
						) : meQuery.isLoading ? (
							<Loading />
						) : meQuery.data ? (
							<div className="row">
								<button type="button" onClick={enterAdminPortal}>
									Enter admin portal
								</button>
							</div>
						) : (
							<div className="row">
								<button type="button" onClick={goToDiscordAuth}>
									Sign in with Discord
								</button>
							</div>
						)}
					</div>
					<div className="card subtle">
						<div style={{ fontWeight: 700, marginBottom: 6 }}>Member portal</div>
						<div className="small">Member auth hooks in next. For now, browse as a guest.</div>
						<div className="row">
							<button type="button" onClick={enterMemberPortal}>
								Enter member portal
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
