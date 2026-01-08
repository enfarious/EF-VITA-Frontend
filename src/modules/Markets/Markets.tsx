import { useEffect, useMemo, useState, type FormEvent } from "react";

type ListingType = "buy" | "sell";
type ListingStatus = "open" | "reserved" | "in_transit" | "delivered" | "disputed" | "closed";
type EscrowStatus = "funded" | "releasing" | "released" | "held";
type ReputationTier = "trusted" | "steady" | "new" | "watch";

type Listing = {
	id: string;
	title: string;
	summary: string;
	type: ListingType;
	status: ListingStatus;
	price: number;
	quantity: number;
	unit: string;
	tribe: string;
	region: string;
	createdAt: string;
	expiresAt: string;
	escrowId?: string;
	tags: string[];
	contacts: string[];
};

type EscrowCase = {
	id: string;
	listingId: string;
	counterparty: string;
	amount: number;
	currency: string;
	status: EscrowStatus;
	mediator: string;
	openedAt: string;
	releaseEta: string;
	notes: string;
};

type ReputationSignal = {
	id: string;
	tribe: string;
	score: number;
	fulfilled: number;
	disputes: number;
	lastTrade: string;
	tier: ReputationTier;
};

type Dispute = {
	id: string;
	listingId: string;
	openedBy: string;
	reason: string;
	status: "open" | "review" | "resolved";
	openedAt: string;
};

const seedListings: Listing[] = [
	{
		id: "listing-ironwood",
		title: "Ironwood bulk crates",
		summary: "Selling ironwood crates for fortification upgrades.",
		type: "sell",
		status: "open",
		price: 120,
		quantity: 60,
		unit: "crates",
		tribe: "Stonefall",
		region: "Northern Ridge",
		createdAt: "2026-01-06",
		expiresAt: "2026-01-20",
		escrowId: "escrow-ironwood",
		tags: ["materials", "bulk", "defense"],
		contacts: ["@stonefall-chief"]
	},
	{
		id: "listing-medicine",
		title: "Medical kits needed",
		summary: "Urgent request for medkits before the next campaign.",
		type: "buy",
		status: "reserved",
		price: 40,
		quantity: 120,
		unit: "kits",
		tribe: "Emberline",
		region: "Southern Marsh",
		createdAt: "2026-01-05",
		expiresAt: "2026-01-16",
		escrowId: "escrow-medicine",
		tags: ["medical", "urgent"],
		contacts: ["@emberline-quartermaster"]
	},
	{
		id: "listing-ammo",
		title: "Ammunition transfer",
		summary: "Alliance surplus ammo available for trusted tribes.",
		type: "sell",
		status: "in_transit",
		price: 18,
		quantity: 400,
		unit: "cases",
		tribe: "Stormreach",
		region: "Ghostline",
		createdAt: "2026-01-04",
		expiresAt: "2026-01-14",
		escrowId: "escrow-ammo",
		tags: ["ammo", "alliance"],
		contacts: ["@stormreach-supply"]
	}
];

const seedEscrow: EscrowCase[] = [
	{
		id: "escrow-ironwood",
		listingId: "listing-ironwood",
		counterparty: "Stonefall",
		amount: 7200,
		currency: "marks",
		status: "funded",
		mediator: "Spine escrow",
		openedAt: "2026-01-06",
		releaseEta: "2026-01-20",
		notes: "Auto escrow for bulk transfer."
	},
	{
		id: "escrow-medicine",
		listingId: "listing-medicine",
		counterparty: "Emberline",
		amount: 4800,
		currency: "marks",
		status: "releasing",
		mediator: "Alliance escrow",
		openedAt: "2026-01-05",
		releaseEta: "2026-01-13",
		notes: "Release on proof of delivery."
	},
	{
		id: "escrow-ammo",
		listingId: "listing-ammo",
		counterparty: "Stormreach",
		amount: 7200,
		currency: "marks",
		status: "held",
		mediator: "Spine escrow",
		openedAt: "2026-01-04",
		releaseEta: "Pending",
		notes: "Hold until convoy clears Ghostline."
	}
];

const seedReputation: ReputationSignal[] = [
	{
		id: "rep-stonefall",
		tribe: "Stonefall",
		score: 92,
		fulfilled: 28,
		disputes: 1,
		lastTrade: "2d ago",
		tier: "trusted"
	},
	{
		id: "rep-emberline",
		tribe: "Emberline",
		score: 77,
		fulfilled: 12,
		disputes: 2,
		lastTrade: "1d ago",
		tier: "steady"
	},
	{
		id: "rep-stormreach",
		tribe: "Stormreach",
		score: 63,
		fulfilled: 9,
		disputes: 3,
		lastTrade: "4h ago",
		tier: "watch"
	},
	{
		id: "rep-dawnkeepers",
		tribe: "Dawnkeepers",
		score: 54,
		fulfilled: 4,
		disputes: 0,
		lastTrade: "5d ago",
		tier: "new"
	}
];

const seedDisputes: Dispute[] = [
	{
		id: "dispute-ammo",
		listingId: "listing-ammo",
		openedBy: "Stormreach",
		reason: "Escort route compromised, hold escrow release.",
		status: "open",
		openedAt: "3h ago"
	}
];

const emptyListingDraft = {
	title: "",
	summary: "",
	type: "sell" as ListingType,
	price: "",
	quantity: "",
	unit: "",
	tribe: "",
	region: "",
	expiresAt: "",
	tags: ""
};

const STORAGE_KEY_LISTINGS = "markets-listings";
const STORAGE_KEY_ESCROW = "markets-escrow";
const STORAGE_KEY_REPUTATION = "markets-reputation";
const STORAGE_KEY_DISPUTES = "markets-disputes";
const STORAGE_KEY_SETTINGS = "markets-settings";

function buildId(prefix: string) {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return `${prefix}-${crypto.randomUUID()}`;
	}
	return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatNumber(value: number) {
	return value.toLocaleString();
}

function normalizeListing(listing: Listing): Listing {
	return {
		...listing,
		status: listing.status ?? "open",
		type: listing.type ?? "sell",
		price: listing.price ?? 0,
		quantity: listing.quantity ?? 0,
		unit: listing.unit ?? "units",
		tags: Array.isArray(listing.tags) ? listing.tags : [],
		contacts: Array.isArray(listing.contacts) ? listing.contacts : []
	};
}

function normalizeEscrow(escrow: EscrowCase): EscrowCase {
	return {
		...escrow,
		status: escrow.status ?? "funded",
		currency: escrow.currency ?? "marks",
		notes: escrow.notes ?? ""
	};
}

function normalizeDispute(dispute: Dispute): Dispute {
	return {
		...dispute,
		status: dispute.status ?? "open"
	};
}

function getStoredSettings() {
	if (typeof window === "undefined") return null;
	const stored = window.localStorage.getItem(STORAGE_KEY_SETTINGS);
	if (!stored) return null;
	try {
		return JSON.parse(stored) as Partial<{
			statusFilter: ListingStatus | "all";
			search: string;
			selectedListingId: string | null;
			useEscrow: boolean;
			requireReputationCheck: boolean;
			autoHoldOnDispute: boolean;
		}>;
	} catch {
		return null;
	}
}

export function Markets() {
	const [listings, setListings] = useState<Listing[]>(() => {
		if (typeof window === "undefined") return seedListings;
		const stored = window.localStorage.getItem(STORAGE_KEY_LISTINGS);
		if (!stored) return seedListings;
		try {
			const parsed = JSON.parse(stored) as Listing[];
			return Array.isArray(parsed) && parsed.length
				? parsed.map((listing) => normalizeListing(listing))
				: seedListings;
		} catch {
			return seedListings;
		}
	});
	const [escrowCases, setEscrowCases] = useState<EscrowCase[]>(() => {
		if (typeof window === "undefined") return seedEscrow;
		const stored = window.localStorage.getItem(STORAGE_KEY_ESCROW);
		if (!stored) return seedEscrow;
		try {
			const parsed = JSON.parse(stored) as EscrowCase[];
			return Array.isArray(parsed) && parsed.length
				? parsed.map((escrow) => normalizeEscrow(escrow))
				: seedEscrow;
		} catch {
			return seedEscrow;
		}
	});
	const [reputationSignals] = useState<ReputationSignal[]>(() => {
		if (typeof window === "undefined") return seedReputation;
		const stored = window.localStorage.getItem(STORAGE_KEY_REPUTATION);
		if (!stored) return seedReputation;
		try {
			const parsed = JSON.parse(stored) as ReputationSignal[];
			return Array.isArray(parsed) && parsed.length ? parsed : seedReputation;
		} catch {
			return seedReputation;
		}
	});
	const [disputes, setDisputes] = useState<Dispute[]>(() => {
		if (typeof window === "undefined") return seedDisputes;
		const stored = window.localStorage.getItem(STORAGE_KEY_DISPUTES);
		if (!stored) return seedDisputes;
		try {
			const parsed = JSON.parse(stored) as Dispute[];
			return Array.isArray(parsed) && parsed.length
				? parsed.map((dispute) => normalizeDispute(dispute))
				: seedDisputes;
		} catch {
			return seedDisputes;
		}
	});
	const [listingDraft, setListingDraft] = useState(emptyListingDraft);
	const [settings] = useState(() => getStoredSettings());
	const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">(
		settings?.statusFilter ?? "all"
	);
	const [search, setSearch] = useState(settings?.search ?? "");
	const [selectedListingId, setSelectedListingId] = useState<string | null>(
		settings?.selectedListingId ?? seedListings[0]?.id ?? null
	);
	const [useEscrow, setUseEscrow] = useState(settings?.useEscrow ?? true);
	const [requireReputationCheck, setRequireReputationCheck] = useState(
		settings?.requireReputationCheck ?? true
	);
	const [autoHoldOnDispute, setAutoHoldOnDispute] = useState(
		settings?.autoHoldOnDispute ?? true
	);
	const [devSession, setDevSession] = useState(() => {
		if (typeof window === "undefined") {
			return { id: "", handle: "", role: "" };
		}
		return {
			id: window.localStorage.getItem("moduleUserId") ?? "",
			handle: window.localStorage.getItem("moduleUserHandle") ?? "",
			role: window.localStorage.getItem("moduleRole") ?? ""
		};
	});

	const selectedListing = listings.find((listing) => listing.id === selectedListingId) ?? null;
	const selectedEscrow = selectedListing?.escrowId
		? escrowCases.find((escrow) => escrow.id === selectedListing.escrowId) ?? null
		: null;
	const selectedDispute = disputes.find((dispute) => dispute.listingId === selectedListingId) ?? null;

	const filteredListings = useMemo(() => {
		const query = search.trim().toLowerCase();
		return listings.filter((listing) => {
			const matchesStatus = statusFilter === "all" ? true : listing.status === statusFilter;
			if (!matchesStatus) return false;
			if (!query) return true;
			return [listing.title, listing.summary, listing.tribe, listing.region].some((field) =>
				field.toLowerCase().includes(query)
			);
		});
	}, [listings, search, statusFilter]);

	const activeListings = listings.filter(
		(listing) => listing.status === "open" || listing.status === "reserved"
	);
	const escrowVolume = escrowCases.reduce((sum, escrow) => sum + escrow.amount, 0);
	const openDisputes = disputes.filter((dispute) => dispute.status !== "resolved").length;

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(STORAGE_KEY_LISTINGS, JSON.stringify(listings));
	}, [listings]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(STORAGE_KEY_ESCROW, JSON.stringify(escrowCases));
	}, [escrowCases]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(STORAGE_KEY_REPUTATION, JSON.stringify(reputationSignals));
	}, [reputationSignals]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(STORAGE_KEY_DISPUTES, JSON.stringify(disputes));
	}, [disputes]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const nextSettings = {
			statusFilter,
			search,
			selectedListingId,
			useEscrow,
			requireReputationCheck,
			autoHoldOnDispute
		};
		window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(nextSettings));
	}, [
		statusFilter,
		search,
		selectedListingId,
		useEscrow,
		requireReputationCheck,
		autoHoldOnDispute
	]);

	useEffect(() => {
		if (selectedListingId && selectedListing) return;
		setSelectedListingId(listings[0]?.id ?? null);
	}, [listings, selectedListing, selectedListingId]);

	function handleCreateListing(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const price = Number(listingDraft.price);
		const quantity = Number(listingDraft.quantity);
		if (
			!listingDraft.title.trim() ||
			!listingDraft.summary.trim() ||
			Number.isNaN(price) ||
			Number.isNaN(quantity)
		) {
			return;
		}
		const nextListing: Listing = {
			id: buildId("listing"),
			title: listingDraft.title.trim(),
			summary: listingDraft.summary.trim(),
			type: listingDraft.type,
			status: "open",
			price,
			quantity,
			unit: listingDraft.unit.trim() || "units",
			tribe: listingDraft.tribe.trim() || "Unlisted",
			region: listingDraft.region.trim() || "Unknown",
			createdAt: new Date().toISOString().slice(0, 10),
			expiresAt: listingDraft.expiresAt,
			tags: listingDraft.tags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
			contacts: []
		};
		let escrowId: string | undefined;
		if (useEscrow) {
			escrowId = buildId("escrow");
			const nextEscrow: EscrowCase = {
				id: escrowId,
				listingId: nextListing.id,
				counterparty: nextListing.tribe,
				amount: price * quantity,
				currency: "marks",
				status: "funded",
				mediator: "Spine escrow",
				openedAt: "Today",
				releaseEta: nextListing.expiresAt || "TBD",
				notes: "Auto escrow created on listing."
			};
			setEscrowCases((prev) => [nextEscrow, ...prev]);
			nextListing.escrowId = escrowId;
		}
		setListings((prev) => [nextListing, ...prev]);
		setSelectedListingId(nextListing.id);
		setListingDraft(emptyListingDraft);
	}

	function updateListing(id: string, updater: (listing: Listing) => Listing) {
		setListings((prev) => {
			let updatedListing: Listing | null = null;
			const nextListings = prev.map((listing) => {
				if (listing.id !== id) return listing;
				updatedListing = updater(listing);
				return updatedListing;
			});
			if (updatedListing?.escrowId) {
				const nextStatus = updatedListing.status;
				setEscrowCases((prevEscrow) =>
					prevEscrow.map((escrow) => {
						if (escrow.id !== updatedListing?.escrowId) return escrow;
						if (nextStatus === "disputed") {
							return autoHoldOnDispute
								? { ...escrow, status: "held", releaseEta: "Paused" }
								: escrow;
						}
						if (nextStatus === "delivered" || nextStatus === "closed") {
							return { ...escrow, status: "released", releaseEta: "Released" };
						}
						if (nextStatus === "in_transit") {
							return { ...escrow, status: "releasing", releaseEta: "In transit" };
						}
						return escrow;
					})
				);
			}
			return nextListings;
		});
	}

	function openDispute(listing: Listing) {
		if (disputes.some((dispute) => dispute.listingId === listing.id)) return;
		const nextDispute: Dispute = {
			id: buildId("dispute"),
			listingId: listing.id,
			openedBy: listing.tribe,
			reason: "Delivery mismatch reported.",
			status: "open",
			openedAt: "Just now"
		};
		setDisputes((prev) => [nextDispute, ...prev]);
		updateListing(listing.id, (current) => ({ ...current, status: "disputed" }));
	}

	function setDevRole(role: string, id: string, handle: string) {
		if (typeof window === "undefined") return;
		window.localStorage.setItem("moduleUserId", id);
		window.localStorage.setItem("moduleUserHandle", handle);
		window.localStorage.setItem("moduleRole", role);
		setDevSession({ id, handle, role });
	}

	function clearDevSession() {
		if (typeof window === "undefined") return;
		window.localStorage.removeItem("moduleUserId");
		window.localStorage.removeItem("moduleUserHandle");
		window.localStorage.removeItem("moduleRole");
		setDevSession({ id: "", handle: "", role: "" });
	}

	const listingStatusChip = (status: ListingStatus) => {
		if (status === "open") return "chip good";
		if (status === "reserved" || status === "in_transit") return "chip info";
		if (status === "disputed") return "chip warn";
		return "chip";
	};

	const escrowChip = (status: EscrowStatus) => {
		if (status === "released") return "chip good";
		if (status === "held") return "chip warn";
		if (status === "releasing") return "chip info";
		return "chip";
	};

	const repChip = (tier: ReputationTier) => {
		if (tier === "trusted") return "chip good";
		if (tier === "watch") return "chip warn";
		if (tier === "new") return "chip info";
		return "chip";
	};

	return (
		<div className="stack">
			<div className="hero">
				<div className="hero-header">
					<div>
						<div className="eyebrow">Markets</div>
						<h1>Trade lanes</h1>
						<div className="small">
							Launch tribe and alliance listings with escrow and reputation signals.
						</div>
					</div>
					<div className="hero-actions">
						<button
							type="button"
							onClick={() => {
								setSearch("");
								setStatusFilter("all");
							}}
						>
							Reset filters
						</button>
						<button type="button" className="secondary">
							Open escrow desk
						</button>
					</div>
				</div>
				<div className="hero-grid">
					<div className="stat">
						<span className="stat-label">Active listings</span>
						<span className="stat-value">{activeListings.length}</span>
						<span className="small">
							{activeListings.length ? "Listings are live now." : "No listings yet."}
						</span>
					</div>
					<div className="stat">
						<span className="stat-label">Escrow volume</span>
						<span className="stat-value">{formatNumber(escrowVolume)}</span>
						<span className="small">Marked for settlement.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Open disputes</span>
						<span className="stat-value">{openDisputes}</span>
						<span className="small">
							{openDisputes ? "Escalations need review." : "No trade disputes."}
						</span>
					</div>
					<div className="stat">
						<span className="stat-label">Trusted partners</span>
						<span className="stat-value">
							{reputationSignals.filter((signal) => signal.tier === "trusted").length}
						</span>
						<span className="small">High-confidence trade lanes.</span>
					</div>
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Create listing</div>
					<div className="small">Spin up a buy or sell request.</div>
					<form className="stack" style={{ marginTop: 12 }} onSubmit={handleCreateListing}>
						<label className="stack">
							<span className="small">Listing title</span>
							<input
								value={listingDraft.title}
								onChange={(event) =>
									setListingDraft((prev) => ({ ...prev, title: event.target.value }))
								}
								placeholder="Steel billets surplus"
							/>
						</label>
						<label className="stack">
							<span className="small">Summary</span>
							<textarea
								rows={3}
								value={listingDraft.summary}
								onChange={(event) =>
									setListingDraft((prev) => ({ ...prev, summary: event.target.value }))
								}
								placeholder="What is needed or offered."
							/>
						</label>
						<div className="grid">
							<label className="stack">
								<span className="small">Type</span>
								<select
									value={listingDraft.type}
									onChange={(event) =>
										setListingDraft((prev) => ({
											...prev,
											type: event.target.value as ListingType
										}))
									}
								>
									<option value="sell">Sell</option>
									<option value="buy">Buy</option>
								</select>
							</label>
							<label className="stack">
								<span className="small">Unit</span>
								<input
									value={listingDraft.unit}
									onChange={(event) =>
										setListingDraft((prev) => ({ ...prev, unit: event.target.value }))
									}
									placeholder="crates"
								/>
							</label>
						</div>
						<div className="grid">
							<label className="stack">
								<span className="small">Price per unit</span>
								<input
									type="number"
									min={0}
									value={listingDraft.price}
									onChange={(event) =>
										setListingDraft((prev) => ({ ...prev, price: event.target.value }))
									}
									placeholder="120"
								/>
							</label>
							<label className="stack">
								<span className="small">Quantity</span>
								<input
									type="number"
									min={1}
									value={listingDraft.quantity}
									onChange={(event) =>
										setListingDraft((prev) => ({
											...prev,
											quantity: event.target.value
										}))
									}
									placeholder="60"
								/>
							</label>
						</div>
						<div className="grid">
							<label className="stack">
								<span className="small">Tribe</span>
								<input
									value={listingDraft.tribe}
									onChange={(event) =>
										setListingDraft((prev) => ({ ...prev, tribe: event.target.value }))
									}
									placeholder="Stonefall"
								/>
							</label>
							<label className="stack">
								<span className="small">Region</span>
								<input
									value={listingDraft.region}
									onChange={(event) =>
										setListingDraft((prev) => ({ ...prev, region: event.target.value }))
									}
									placeholder="Northern Ridge"
								/>
							</label>
						</div>
						<label className="stack">
							<span className="small">Expires on</span>
							<input
								type="date"
								value={listingDraft.expiresAt}
								onChange={(event) =>
									setListingDraft((prev) => ({
										...prev,
										expiresAt: event.target.value
									}))
								}
							/>
						</label>
						<label className="stack">
							<span className="small">Tags (comma separated)</span>
							<input
								value={listingDraft.tags}
								onChange={(event) =>
									setListingDraft((prev) => ({ ...prev, tags: event.target.value }))
								}
								placeholder="materials, bulk, urgent"
							/>
						</label>
						<div className="row">
							<button type="submit">Post listing</button>
							<button
								type="button"
								className="secondary"
								onClick={() => setListingDraft(emptyListingDraft)}
							>
								Reset
							</button>
						</div>
					</form>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Market safeguards</div>
					<div className="small">
						Set guardrails for escrow and reputation screening.
					</div>
					<div className="stack" style={{ marginTop: 12 }}>
						<label className="row">
							<input
								type="checkbox"
								checked={useEscrow}
								onChange={(event) => setUseEscrow(event.target.checked)}
							/>
							<span>Default listings to escrow</span>
						</label>
						<label className="row">
							<input
								type="checkbox"
								checked={requireReputationCheck}
								onChange={(event) => setRequireReputationCheck(event.target.checked)}
							/>
							<span>Require reputation check before reserve</span>
						</label>
						<label className="row">
							<input
								type="checkbox"
								checked={autoHoldOnDispute}
								onChange={(event) => setAutoHoldOnDispute(event.target.checked)}
							/>
							<span>Auto hold escrow on disputes</span>
						</label>
						<div className="card subtle">
							<div className="small">
								Escrow defaults apply on new listings. Reputation checks are advisory for
								now and can be automated later.
							</div>
						</div>
					</div>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Escrow health</div>
					<div className="small">Quick view of escrow coverage.</div>
					<div className="stack" style={{ marginTop: 12 }}>
						<div className="row" style={{ justifyContent: "space-between" }}>
							<span>Funded escrows</span>
							<span className="chip good">
								{escrowCases.filter((escrow) => escrow.status === "funded").length}
							</span>
						</div>
						<div className="row" style={{ justifyContent: "space-between" }}>
							<span>Releasing escrows</span>
							<span className="chip info">
								{escrowCases.filter((escrow) => escrow.status === "releasing").length}
							</span>
						</div>
						<div className="row" style={{ justifyContent: "space-between" }}>
							<span>Held escrows</span>
							<span className="chip warn">
								{escrowCases.filter((escrow) => escrow.status === "held").length}
							</span>
						</div>
						<div className="small">
							Held escrows usually require mediator review before release.
						</div>
					</div>
				</div>
			</div>

			<div className="card">
				<div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
					<div>
						<div style={{ fontWeight: 700 }}>Listings board</div>
						<div className="small">Browse live trade lanes and offers.</div>
					</div>
					<div className="row" style={{ flexWrap: "wrap" }}>
						<label className="stack" style={{ minWidth: 200 }}>
							<span className="small">Search listings</span>
							<input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Title, tribe, region"
							/>
						</label>
						<label className="stack" style={{ minWidth: 160 }}>
							<span className="small">Status filter</span>
							<select
								value={statusFilter}
								onChange={(event) =>
									setStatusFilter(event.target.value as ListingStatus | "all")
								}
							>
								<option value="all">All</option>
								<option value="open">Open</option>
								<option value="reserved">Reserved</option>
								<option value="in_transit">In transit</option>
								<option value="delivered">Delivered</option>
								<option value="disputed">Disputed</option>
								<option value="closed">Closed</option>
							</select>
						</label>
					</div>
				</div>
				<div className="table table-5">
					<div className="table-row table-header">
						<span>Listing</span>
						<span>Type</span>
						<span>Status</span>
						<span>Price</span>
						<span>Expires</span>
					</div>
					{filteredListings.map((listing) => (
						<div className="table-row" key={listing.id}>
							<div className="stack" style={{ gap: 4 }}>
								<span>{listing.title}</span>
								<span className="small">
									{listing.tribe} - {listing.region}
								</span>
								<span className="small">
									{listing.quantity} {listing.unit}
								</span>
								<button type="button" onClick={() => setSelectedListingId(listing.id)}>
									View
								</button>
							</div>
							<span className="chip">{listing.type}</span>
							<span className={listingStatusChip(listing.status)}>{listing.status}</span>
							<span>{formatNumber(listing.price)}</span>
							<span>{listing.expiresAt || "-"}</span>
						</div>
					))}
					{filteredListings.length === 0 ? (
						<div className="table-row">
							<span style={{ gridColumn: "1 / -1" }}>No listings match that filter.</span>
						</div>
					) : null}
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Listing details</div>
					{selectedListing ? (
						<div className="stack">
							<div>
								<h2>{selectedListing.title}</h2>
								<div className="small">{selectedListing.summary}</div>
							</div>
							<div className="kv">
								<span>Status</span>
								<span>
									<select
										value={selectedListing.status}
										onChange={(event) =>
											updateListing(selectedListing.id, (listing) => ({
												...listing,
												status: event.target.value as ListingStatus
											}))
										}
									>
										<option value="open">Open</option>
										<option value="reserved">Reserved</option>
										<option value="in_transit">In transit</option>
										<option value="delivered">Delivered</option>
										<option value="disputed">Disputed</option>
										<option value="closed">Closed</option>
									</select>
								</span>
								<span>Type</span>
								<span>{selectedListing.type}</span>
								<span>Price</span>
								<span>{formatNumber(selectedListing.price)}</span>
								<span>Quantity</span>
								<span>
									{selectedListing.quantity} {selectedListing.unit}
								</span>
								<span>Region</span>
								<span>{selectedListing.region}</span>
								<span>Tribe</span>
								<span>{selectedListing.tribe}</span>
							</div>
							<div className="row">
								<button
									type="button"
									onClick={() =>
										updateListing(selectedListing.id, (listing) => ({
											...listing,
											status: "reserved"
										}))
									}
									disabled={selectedListing.status !== "open"}
								>
									Reserve
								</button>
								<button
									type="button"
									className="secondary"
									onClick={() => openDispute(selectedListing)}
									disabled={Boolean(selectedDispute)}
								>
									Open dispute
								</button>
							</div>
							<div className="small">
								Tags: {selectedListing.tags.length ? selectedListing.tags.join(", ") : "-"}
							</div>
						</div>
					) : (
						<span className="small">Select a listing to see details.</span>
					)}
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Escrow details</div>
					{selectedEscrow ? (
						<div className="stack">
							<div className="kv">
								<span>Status</span>
								<span className={escrowChip(selectedEscrow.status)}>
									{selectedEscrow.status}
								</span>
								<span>Amount</span>
								<span>
									{formatNumber(selectedEscrow.amount)} {selectedEscrow.currency}
								</span>
								<span>Mediator</span>
								<span>{selectedEscrow.mediator}</span>
								<span>Release ETA</span>
								<span>{selectedEscrow.releaseEta}</span>
								<span>Notes</span>
								<span>{selectedEscrow.notes || "-"}</span>
							</div>
							<div className="row">
								<button
									type="button"
									onClick={() =>
										setEscrowCases((prev) =>
											prev.map((escrow) =>
												escrow.id === selectedEscrow.id
													? { ...escrow, status: "released", releaseEta: "Released" }
													: escrow
											)
										)
									}
								>
									Release escrow
								</button>
								<button
									type="button"
									className="secondary"
									onClick={() =>
										setEscrowCases((prev) =>
											prev.map((escrow) =>
												escrow.id === selectedEscrow.id
													? { ...escrow, status: "held", releaseEta: "On hold" }
													: escrow
											)
										)
									}
								>
									Hold escrow
								</button>
							</div>
						</div>
					) : (
						<span className="small">No escrow record for this listing.</span>
					)}
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Escrow ledger</div>
					<div className="table table-4" style={{ marginTop: 12 }}>
						<div className="table-row table-header">
							<span>Listing</span>
							<span>Status</span>
							<span>Amount</span>
							<span>Mediator</span>
						</div>
						{escrowCases.map((escrow) => {
							const listing = listings.find((item) => item.id === escrow.listingId);
							return (
								<div className="table-row" key={escrow.id}>
									<span>{listing?.title ?? escrow.listingId}</span>
									<span className={escrowChip(escrow.status)}>{escrow.status}</span>
									<span>
										{formatNumber(escrow.amount)} {escrow.currency}
									</span>
									<span>{escrow.mediator}</span>
								</div>
							);
						})}
					</div>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Reputation signals</div>
					<div className="small">
						Review trust signals before approving high-volume trades.
					</div>
					<div className="table table-4" style={{ marginTop: 12 }}>
						<div className="table-row table-header">
							<span>Tribe</span>
							<span>Score</span>
							<span>Fulfilled</span>
							<span>Tier</span>
						</div>
						{reputationSignals.map((signal) => (
							<div className="table-row" key={signal.id}>
								<div className="stack" style={{ gap: 4 }}>
									<span>{signal.tribe}</span>
									<span className="small">Last trade {signal.lastTrade}</span>
								</div>
								<span>{signal.score}</span>
								<span>{signal.fulfilled}</span>
								<span className={repChip(signal.tier)}>{signal.tier}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Dispute queue</div>
					<div className="small">Track open trade escalations.</div>
					<div className="stack" style={{ marginTop: 12 }}>
						{disputes.map((dispute) => {
							const listing = listings.find((item) => item.id === dispute.listingId);
							return (
								<div key={dispute.id} className="card subtle">
									<div className="row" style={{ justifyContent: "space-between" }}>
										<div className="stack" style={{ gap: 4 }}>
											<div style={{ fontWeight: 600 }}>{listing?.title ?? "Unknown"}</div>
											<span className="small">{dispute.reason}</span>
											<span className="small">Opened {dispute.openedAt}</span>
										</div>
										<div className="stack" style={{ alignItems: "flex-end" }}>
											<span
												className={
													dispute.status === "resolved"
														? "chip good"
														: dispute.status === "review"
															? "chip info"
															: "chip warn"
												}
											>
												{dispute.status}
											</span>
											<button
												type="button"
												onClick={() =>
													setDisputes((prev) =>
														prev.map((item) =>
															item.id === dispute.id
																? { ...item, status: "resolved" }
																: item
														)
													)
												}
												disabled={dispute.status === "resolved"}
											>
												Resolve
											</button>
										</div>
									</div>
								</div>
							);
						})}
						{disputes.length === 0 ? (
							<span className="small">No disputes right now.</span>
						) : null}
					</div>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Dev session</div>
					<div className="small">Fake a module login for local testing.</div>
					<div className="kv" style={{ marginTop: 12 }}>
						<span>User</span>
						<span>{devSession.handle || "-"}</span>
						<span>Role</span>
						<span>{devSession.role || "-"}</span>
						<span>Id</span>
						<span className="mono">{devSession.id || "-"}</span>
					</div>
					<div className="row" style={{ marginTop: 12 }}>
						<button
							type="button"
							onClick={() => setDevRole("Chief", "dev-001", "Dev Chief")}
						>
							Use Chief
						</button>
						<button
							type="button"
							onClick={() => setDevRole("Elder", "dev-002", "Dev Elder")}
						>
							Use Elder
						</button>
						<button
							type="button"
							onClick={() => setDevRole("Member", "dev-003", "Dev Member")}
						>
							Use Member
						</button>
						<button type="button" className="secondary" onClick={clearDevSession}>
							Clear
						</button>
					</div>
					{requireReputationCheck ? (
						<div className="card subtle" style={{ marginTop: 12 }}>
							<div className="small">
								Reputation checks are active. Flag watch-tier tribes before approving
								reserves.
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
