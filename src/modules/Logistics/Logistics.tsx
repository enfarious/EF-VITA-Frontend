import { useEffect, useMemo, useState, type FormEvent } from "react";

type RouteStatus = "stable" | "watch" | "critical" | "paused";
type RoutePriority = "standard" | "rush" | "covert";
type SupplyRoute = {
	id: string;
	name: string;
	origin: string;
	destination: string;
	cargo: string;
	etaHours: number;
	capacity: number;
	status: RouteStatus;
	priority: RoutePriority;
	convoys: number;
	escorts: number;
	lead: string;
	lastUpdate: string;
};

type Stockpile = {
	id: string;
	resource: string;
	location: string;
	current: number;
	target: number;
	unit: string;
	targetDate: string;
	risk: "ok" | "low" | "critical";
};

type Alert = {
	id: string;
	title: string;
	detail: string;
	severity: "info" | "warning" | "critical";
	time: string;
	acknowledged: boolean;
};

type Request = {
	id: string;
	tribe: string;
	resource: string;
	amount: number;
	unit: string;
	priority: "standard" | "rush";
	eta: string;
	status: "open" | "assigned" | "fulfilled";
};

const initialRoutes: SupplyRoute[] = [
	{
		id: "route-emerald",
		name: "Emerald Run",
		origin: "Stonefall",
		destination: "Embergate",
		cargo: "Steel billets",
		etaHours: 6,
		capacity: 82,
		status: "stable",
		priority: "standard",
		convoys: 3,
		escorts: 4,
		lead: "Kael",
		lastUpdate: "12m ago"
	},
	{
		id: "route-rime",
		name: "Rime Channel",
		origin: "Frostline",
		destination: "Stormreach",
		cargo: "Food crates",
		etaHours: 9,
		capacity: 68,
		status: "watch",
		priority: "rush",
		convoys: 2,
		escorts: 5,
		lead: "Mara",
		lastUpdate: "40m ago"
	},
	{
		id: "route-ghostline",
		name: "Ghostline Spur",
		origin: "Dawnwatch",
		destination: "Northgate",
		cargo: "Medical kits",
		etaHours: 5,
		capacity: 48,
		status: "critical",
		priority: "covert",
		convoys: 1,
		escorts: 6,
		lead: "Sable",
		lastUpdate: "6m ago"
	},
	{
		id: "route-ash",
		name: "Ash Coast",
		origin: "Emberline",
		destination: "Sandward",
		cargo: "Ammunition",
		etaHours: 11,
		capacity: 56,
		status: "paused",
		priority: "standard",
		convoys: 0,
		escorts: 0,
		lead: "Iris",
		lastUpdate: "3h ago"
	}
];

const stockpiles: Stockpile[] = [
	{
		id: "stock-ironwood",
		resource: "Ironwood",
		location: "Embergate",
		current: 620,
		target: 900,
		unit: "crates",
		targetDate: "In 10 days",
		risk: "low"
	},
	{
		id: "stock-rations",
		resource: "Rations",
		location: "Stonefall",
		current: 820,
		target: 950,
		unit: "packs",
		targetDate: "In 8 days",
		risk: "ok"
	},
	{
		id: "stock-ammo",
		resource: "Ammunition",
		location: "Northgate",
		current: 310,
		target: 700,
		unit: "cases",
		targetDate: "In 4 days",
		risk: "critical"
	},
	{
		id: "stock-medical",
		resource: "Medical kits",
		location: "Stormreach",
		current: 140,
		target: 260,
		unit: "kits",
		targetDate: "In 6 days",
		risk: "low"
	}
];

const initialAlerts: Alert[] = [
	{
		id: "alert-ghostline",
		title: "Ghostline Spur compromised",
		detail: "Raiders spotted near the ridge. Escort strength recommended.",
		severity: "critical",
		time: "6m ago",
		acknowledged: false
	},
	{
		id: "alert-rime",
		title: "Rime Channel weather delay",
		detail: "Heavy snow likely to slow convoys by 2-3 hours.",
		severity: "warning",
		time: "34m ago",
		acknowledged: false
	},
	{
		id: "alert-ash",
		title: "Ash Coast on hold",
		detail: "Tribe vote paused shipments until escort shortage clears.",
		severity: "info",
		time: "2h ago",
		acknowledged: true
	}
];

const inboundRequests: Request[] = [
	{
		id: "req-emberline",
		tribe: "Emberline",
		resource: "Medical kits",
		amount: 40,
		unit: "kits",
		priority: "rush",
		eta: "48h",
		status: "open"
	},
	{
		id: "req-ironwake",
		tribe: "Ironwake",
		resource: "Steel billets",
		amount: 120,
		unit: "crates",
		priority: "standard",
		eta: "5d",
		status: "assigned"
	},
	{
		id: "req-dawnkeepers",
		tribe: "Dawnkeepers",
		resource: "Rations",
		amount: 90,
		unit: "packs",
		priority: "standard",
		eta: "3d",
		status: "fulfilled"
	}
];

const emptyRouteDraft = {
	name: "",
	origin: "",
	destination: "",
	cargo: "",
	etaHours: "",
	capacity: "",
	priority: "standard" as RoutePriority,
	escorts: ""
};

const STORAGE_KEY_ROUTES = "logistics-routes";
const STORAGE_KEY_ALERTS = "logistics-alerts";
const STORAGE_KEY_SETTINGS = "logistics-settings";

function buildId(prefix: string) {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return `${prefix}-${crypto.randomUUID()}`;
	}
	return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function getStoredSettings() {
	if (typeof window === "undefined") return null;
	const stored = window.localStorage.getItem(STORAGE_KEY_SETTINGS);
	if (!stored) return null;
	try {
		return JSON.parse(stored) as Partial<{
			autoReroute: boolean;
			escortShare: boolean;
			throttleOnLowStock: boolean;
			statusFilter: RouteStatus | "all";
			search: string;
			selectedRouteId: string | null;
		}>;
	} catch {
		return null;
	}
}

function normalizeRoute(route: SupplyRoute): SupplyRoute {
	return {
		...route,
		status: route.status ?? "watch",
		priority: route.priority ?? "standard",
		convoys: route.convoys ?? 0,
		escorts: route.escorts ?? 0,
		lead: route.lead ?? "Dispatch",
		lastUpdate: route.lastUpdate ?? "Recently"
	};
}

function normalizeAlert(alert: Alert): Alert {
	return {
		...alert,
		severity: alert.severity ?? "info",
		acknowledged: alert.acknowledged ?? false,
		time: alert.time ?? "Recently"
	};
}

function formatNumber(value: number) {
	return value.toLocaleString();
}

function coverage(current: number, target: number) {
	if (target <= 0) return 0;
	return Math.min(100, Math.round((current / target) * 100));
}

export function Logistics() {
	const [routes, setRoutes] = useState<SupplyRoute[]>(() => {
		if (typeof window === "undefined") return initialRoutes;
		const stored = window.localStorage.getItem(STORAGE_KEY_ROUTES);
		if (!stored) return initialRoutes;
		try {
			const parsed = JSON.parse(stored) as SupplyRoute[];
			return Array.isArray(parsed) && parsed.length
				? parsed.map((route) => normalizeRoute(route))
				: initialRoutes;
		} catch {
			return initialRoutes;
		}
	});
	const [alerts, setAlerts] = useState<Alert[]>(() => {
		if (typeof window === "undefined") return initialAlerts;
		const stored = window.localStorage.getItem(STORAGE_KEY_ALERTS);
		if (!stored) return initialAlerts;
		try {
			const parsed = JSON.parse(stored) as Alert[];
			return Array.isArray(parsed) && parsed.length
				? parsed.map((alert) => normalizeAlert(alert))
				: initialAlerts;
		} catch {
			return initialAlerts;
		}
	});
	const [routeDraft, setRouteDraft] = useState(emptyRouteDraft);
	const [settings] = useState(() => getStoredSettings());
	const [statusFilter, setStatusFilter] = useState<RouteStatus | "all">(
		settings?.statusFilter ?? "all"
	);
	const [search, setSearch] = useState(settings?.search ?? "");
	const [selectedRouteId, setSelectedRouteId] = useState<string | null>(
		settings?.selectedRouteId ?? initialRoutes[0]?.id ?? null
	);
	const [autoReroute, setAutoReroute] = useState(settings?.autoReroute ?? true);
	const [escortShare, setEscortShare] = useState(settings?.escortShare ?? true);
	const [throttleOnLowStock, setThrottleOnLowStock] = useState(
		settings?.throttleOnLowStock ?? true
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

	const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;

	const filteredRoutes = useMemo(() => {
		const query = search.trim().toLowerCase();
		return routes.filter((route) => {
			const matchesStatus = statusFilter === "all" ? true : route.status === statusFilter;
			if (!matchesStatus) return false;
			if (!query) return true;
			return [route.name, route.origin, route.destination, route.cargo].some((field) =>
				field.toLowerCase().includes(query)
			);
		});
	}, [routes, search, statusFilter]);

	const activeRoutes = routes.filter((route) => route.status !== "paused");
	const criticalAlerts = alerts.filter(
		(alert) => alert.severity === "critical" && !alert.acknowledged
	).length;
	const avgCoverage = Math.round(
		stockpiles.reduce((sum, pile) => sum + coverage(pile.current, pile.target), 0) /
			stockpiles.length
	);
	const capacityUtilization = Math.round(
		activeRoutes.reduce((sum, route) => sum + route.capacity, 0) / (activeRoutes.length || 1)
	);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(STORAGE_KEY_ROUTES, JSON.stringify(routes));
	}, [routes]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		window.localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
	}, [alerts]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const nextSettings = {
			autoReroute,
			escortShare,
			throttleOnLowStock,
			statusFilter,
			search,
			selectedRouteId
		};
		window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(nextSettings));
	}, [autoReroute, escortShare, throttleOnLowStock, statusFilter, search, selectedRouteId]);

	useEffect(() => {
		if (selectedRouteId && selectedRoute) return;
		setSelectedRouteId(routes[0]?.id ?? null);
	}, [routes, selectedRoute, selectedRouteId]);

	function handleCreateRoute(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const etaHours = Number(routeDraft.etaHours);
		const capacity = Number(routeDraft.capacity);
		const escorts = Number(routeDraft.escorts || 0);
		if (
			!routeDraft.name.trim() ||
			!routeDraft.origin.trim() ||
			!routeDraft.destination.trim() ||
			!routeDraft.cargo.trim() ||
			Number.isNaN(etaHours) ||
			Number.isNaN(capacity)
		) {
			return;
		}
		const newRoute: SupplyRoute = {
			id: buildId("route"),
			name: routeDraft.name.trim(),
			origin: routeDraft.origin.trim(),
			destination: routeDraft.destination.trim(),
			cargo: routeDraft.cargo.trim(),
			etaHours,
			capacity,
			status: "watch",
			priority: routeDraft.priority,
			convoys: 1,
			escorts,
			lead: "Dispatch",
			lastUpdate: "Just now"
		};
		setRoutes((prev) => [newRoute, ...prev]);
		setSelectedRouteId(newRoute.id);
		setRouteDraft(emptyRouteDraft);
	}

	function updateRoute(id: string, updater: (route: SupplyRoute) => SupplyRoute) {
		setRoutes((prev) => prev.map((route) => (route.id === id ? updater(route) : route)));
	}

	function toggleAlert(id: string) {
		setAlerts((prev) =>
			prev.map((alert) =>
				alert.id === id ? { ...alert, acknowledged: !alert.acknowledged } : alert
			)
		);
	}

	const statusChip = (status: RouteStatus) => {
		if (status === "stable") return "chip good";
		if (status === "watch") return "chip warn";
		if (status === "critical") return "chip warn";
		return "chip";
	};

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

	return (
		<div className="stack">
			<div className="hero">
				<div className="hero-header">
					<div>
						<div className="eyebrow">Logistics</div>
						<h1>Supply grid</h1>
						<div className="small">
							Coordinate resource flows, delivery lanes, and stockpile priorities.
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
							Broadcast alert
						</button>
					</div>
				</div>
				<div className="hero-grid">
					<div className="stat">
						<span className="stat-label">Active routes</span>
						<span className="stat-value">{activeRoutes.length}</span>
						<span className="small">
							{activeRoutes.length ? "Convoys are in motion." : "No routes configured."}
						</span>
					</div>
					<div className="stat">
						<span className="stat-label">Stockpile coverage</span>
						<span className="stat-value">{avgCoverage}%</span>
						<span className="small">Average goal coverage across reserves.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Critical alerts</span>
						<span className="stat-value">{criticalAlerts}</span>
						<span className="small">
							{criticalAlerts ? "Escorts needed on watch lanes." : "All lanes stable."}
						</span>
					</div>
					<div className="stat">
						<span className="stat-label">Capacity in motion</span>
						<span className="stat-value">{capacityUtilization}%</span>
						<span className="small">Average convoy utilization.</span>
					</div>
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Route planner</div>
					<div className="small">
						Spin up a new lane and assign convoy escorts.
					</div>
					<form className="stack" onSubmit={handleCreateRoute} style={{ marginTop: 12 }}>
						<label className="stack">
							<span className="small">Route name</span>
							<input
								value={routeDraft.name}
								onChange={(event) =>
									setRouteDraft((prev) => ({ ...prev, name: event.target.value }))
								}
								placeholder="Ironwood loop"
							/>
						</label>
						<div className="grid">
							<label className="stack">
								<span className="small">Origin</span>
								<input
									value={routeDraft.origin}
									onChange={(event) =>
										setRouteDraft((prev) => ({ ...prev, origin: event.target.value }))
									}
									placeholder="Stonefall"
								/>
							</label>
							<label className="stack">
								<span className="small">Destination</span>
								<input
									value={routeDraft.destination}
									onChange={(event) =>
										setRouteDraft((prev) => ({
											...prev,
											destination: event.target.value
										}))
									}
									placeholder="Embergate"
								/>
							</label>
						</div>
						<label className="stack">
							<span className="small">Primary cargo</span>
							<input
								value={routeDraft.cargo}
								onChange={(event) =>
									setRouteDraft((prev) => ({ ...prev, cargo: event.target.value }))
								}
								placeholder="Steel billets"
							/>
						</label>
						<div className="grid">
							<label className="stack">
								<span className="small">ETA (hours)</span>
								<input
									type="number"
									min={1}
									value={routeDraft.etaHours}
									onChange={(event) =>
										setRouteDraft((prev) => ({
											...prev,
											etaHours: event.target.value
										}))
									}
									placeholder="6"
								/>
							</label>
							<label className="stack">
								<span className="small">Capacity</span>
								<input
									type="number"
									min={1}
									value={routeDraft.capacity}
									onChange={(event) =>
										setRouteDraft((prev) => ({
											...prev,
											capacity: event.target.value
										}))
									}
									placeholder="80"
								/>
							</label>
						</div>
						<div className="grid">
							<label className="stack">
								<span className="small">Priority</span>
								<select
									value={routeDraft.priority}
									onChange={(event) =>
										setRouteDraft((prev) => ({
											...prev,
											priority: event.target.value as RoutePriority
										}))
									}
								>
									<option value="standard">Standard</option>
									<option value="rush">Rush</option>
									<option value="covert">Covert</option>
								</select>
							</label>
							<label className="stack">
								<span className="small">Escort count</span>
								<input
									type="number"
									min={0}
									value={routeDraft.escorts}
									onChange={(event) =>
										setRouteDraft((prev) => ({
											...prev,
											escorts: event.target.value
										}))
									}
									placeholder="4"
								/>
							</label>
						</div>
						<div className="row">
							<button type="submit">Create route</button>
							<button
								type="button"
								className="secondary"
								onClick={() => setRouteDraft(emptyRouteDraft)}
							>
								Reset
							</button>
						</div>
					</form>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Routing directives</div>
					<div className="small">
						Establish automatic guardrails for convoy planning.
					</div>
					<div className="stack" style={{ marginTop: 12 }}>
						<label className="row">
							<input
								type="checkbox"
								checked={autoReroute}
								onChange={(event) => setAutoReroute(event.target.checked)}
							/>
							<span>Auto reroute around critical alerts</span>
						</label>
						<label className="row">
							<input
								type="checkbox"
								checked={escortShare}
								onChange={(event) => setEscortShare(event.target.checked)}
							/>
							<span>Share escort teams across alliance lanes</span>
						</label>
						<label className="row">
							<input
								type="checkbox"
								checked={throttleOnLowStock}
								onChange={(event) => setThrottleOnLowStock(event.target.checked)}
							/>
							<span>Throttle low stockpiles to priority convoys</span>
						</label>
						<div className="card subtle">
							<div className="small">
								Auto reroute shifts convoys to safe lanes when escorts are low. Escort
								sharing allows route leads to borrow protection from nearby paths.
							</div>
						</div>
					</div>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Fleet readiness</div>
					<div className="small">Escort readiness and convoy teams on standby.</div>
					<div className="stack" style={{ marginTop: 12 }}>
						<div className="row" style={{ justifyContent: "space-between" }}>
							<span>Escort squads on duty</span>
							<span className="chip good">18 squads</span>
						</div>
						<div className="row" style={{ justifyContent: "space-between" }}>
							<span>Convoys awaiting clearance</span>
							<span className="chip warn">3 pending</span>
						</div>
						<div className="row" style={{ justifyContent: "space-between" }}>
							<span>Haulers in reserve</span>
							<span className="chip">7 ready</span>
						</div>
						<div className="small">
							Assign escorts to any route flagged critical to keep supply moving.
						</div>
					</div>
				</div>
			</div>

			<div className="card">
				<div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
					<div>
						<div style={{ fontWeight: 700 }}>Live routes</div>
						<div className="small">Track every convoy lane in the supply grid.</div>
					</div>
					<div className="row" style={{ flexWrap: "wrap" }}>
						<label className="stack" style={{ minWidth: 180 }}>
							<span className="small">Search routes</span>
							<input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Route, hub, cargo"
							/>
						</label>
						<label className="stack" style={{ minWidth: 160 }}>
							<span className="small">Status filter</span>
							<select
								value={statusFilter}
								onChange={(event) =>
									setStatusFilter(event.target.value as RouteStatus | "all")
								}
							>
								<option value="all">All</option>
								<option value="stable">Stable</option>
								<option value="watch">Watch</option>
								<option value="critical">Critical</option>
								<option value="paused">Paused</option>
							</select>
						</label>
					</div>
				</div>
				<div className="table table-5">
					<div className="table-row table-header">
						<span>Route</span>
						<span>Status</span>
						<span>Capacity</span>
						<span>Escorts</span>
						<span>Lead</span>
					</div>
					{filteredRoutes.map((route) => (
						<div className="table-row" key={route.id}>
							<div className="stack" style={{ gap: 4 }}>
								<span>{route.name}</span>
								<span className="small">
									{route.origin} to {route.destination} - {route.cargo}
								</span>
								<span className="small">
									ETA {route.etaHours}h - {route.priority}
								</span>
								<button type="button" onClick={() => setSelectedRouteId(route.id)}>
									View route
								</button>
							</div>
							<span className={statusChip(route.status)}>{route.status}</span>
							<span>{route.capacity}%</span>
							<span>{route.escorts}</span>
							<span>
								{route.lead}
								<span className="small" style={{ display: "block" }}>
									{route.lastUpdate}
								</span>
							</span>
						</div>
					))}
					{filteredRoutes.length === 0 ? (
						<div className="table-row">
							<span style={{ gridColumn: "1 / -1" }}>No routes match that filter.</span>
						</div>
					) : null}
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Route details</div>
					{selectedRoute ? (
						<div className="stack">
							<div>
								<h2>{selectedRoute.name}</h2>
								<div className="small">
									{selectedRoute.origin} to {selectedRoute.destination}
								</div>
							</div>
							<div className="kv">
								<span>Status</span>
								<span>
									<select
										value={selectedRoute.status}
										onChange={(event) =>
											updateRoute(selectedRoute.id, (route) => ({
												...route,
												status: event.target.value as RouteStatus
											}))
										}
									>
										<option value="stable">Stable</option>
										<option value="watch">Watch</option>
										<option value="critical">Critical</option>
										<option value="paused">Paused</option>
									</select>
								</span>
								<span>Priority</span>
								<span>{selectedRoute.priority}</span>
								<span>Primary cargo</span>
								<span>{selectedRoute.cargo}</span>
								<span>Convoys</span>
								<span>{selectedRoute.convoys}</span>
								<span>Escorts</span>
								<span>{selectedRoute.escorts}</span>
								<span>Capacity</span>
								<span>{selectedRoute.capacity}%</span>
								<span>Lead</span>
								<span>{selectedRoute.lead}</span>
							</div>
							<div className="row">
								<button
									type="button"
									onClick={() =>
										updateRoute(selectedRoute.id, (route) => ({
											...route,
											escorts: route.escorts + 1,
											lastUpdate: "Updated just now"
										}))
									}
								>
									Add escort
								</button>
								<button
									type="button"
									className="secondary"
									onClick={() =>
										updateRoute(selectedRoute.id, (route) => ({
											...route,
											convoys: Math.max(0, route.convoys - 1),
											lastUpdate: "Updated just now"
										}))
									}
								>
									Hold convoy
								</button>
							</div>
							<div className="small">
								Last update: {selectedRoute.lastUpdate}. Escort count reflects assigned
								guards currently on rotation.
							</div>
						</div>
					) : (
						<span className="small">Select a route to review details.</span>
					)}
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Stockpile goals</div>
					<div className="small">Keep critical reserves above target thresholds.</div>
					<div className="table table-4" style={{ marginTop: 12 }}>
						<div className="table-row table-header">
							<span>Resource</span>
							<span>Location</span>
							<span>Progress</span>
							<span>Target</span>
						</div>
						{stockpiles.map((pile) => {
							const percent = coverage(pile.current, pile.target);
							return (
								<div className="table-row" key={pile.id}>
									<div className="stack" style={{ gap: 4 }}>
										<span>{pile.resource}</span>
										<span className="small">{pile.unit}</span>
									</div>
									<span>{pile.location}</span>
									<span className={pile.risk === "critical" ? "chip warn" : "chip"}>
										{percent}%
									</span>
									<span>
										{formatNumber(pile.current)} / {formatNumber(pile.target)}
										<span className="small" style={{ display: "block" }}>
											Target {pile.targetDate}
										</span>
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Alerts & holds</div>
					<div className="small">
						Acknowledge lane disruptions to coordinate escorts.
					</div>
					<div className="stack" style={{ marginTop: 12 }}>
						{alerts.map((alert) => (
							<div className="card subtle" key={alert.id}>
								<div className="row" style={{ justifyContent: "space-between" }}>
									<div className="stack" style={{ gap: 4 }}>
										<div style={{ fontWeight: 600 }}>{alert.title}</div>
										<span className="small">{alert.detail}</span>
										<span className="small">Reported {alert.time}</span>
									</div>
									<div className="stack" style={{ alignItems: "flex-end" }}>
										<span
											className={
												alert.severity === "critical"
													? "chip warn"
													: alert.severity === "warning"
														? "chip"
														: "chip info"
											}
										>
											{alert.severity}
										</span>
										<button type="button" onClick={() => toggleAlert(alert.id)}>
											{alert.acknowledged ? "Unacknowledge" : "Acknowledge"}
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Inbound requests</div>
					<div className="small">Supply pulls from tribe or alliance partners.</div>
					<div className="table table-4" style={{ marginTop: 12 }}>
						<div className="table-row table-header">
							<span>Requester</span>
							<span>Resource</span>
							<span>Priority</span>
							<span>Status</span>
						</div>
						{inboundRequests.map((request) => (
							<div className="table-row" key={request.id}>
								<div className="stack" style={{ gap: 4 }}>
									<span>{request.tribe}</span>
									<span className="small">ETA {request.eta}</span>
								</div>
								<span>
									{formatNumber(request.amount)} {request.unit}
								</span>
								<span className={request.priority === "rush" ? "chip warn" : "chip"}>
									{request.priority}
								</span>
								<span
									className={
										request.status === "fulfilled"
											? "chip good"
											: request.status === "assigned"
												? "chip info"
												: "chip"
									}
								>
									{request.status}
								</span>
							</div>
						))}
					</div>
					<div className="small" style={{ marginTop: 10 }}>
						Requests marked rush should be routed to the nearest escort-ready convoy.
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
				</div>
			</div>
		</div>
	);
}
