import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: ModuleCatalog
});

type ModuleStatus = "active" | "planned";

type ModuleInfo = {
	id: string;
	name: string;
	path: string;
	status: ModuleStatus;
	summary: string;
	features: string[];
};

const modules: ModuleInfo[] = [
	{
		id: "tribe-mgmt",
		name: "TribeMgmt",
		path: "/tribe",
		status: "active",
		summary: "Member operations, roles, access lists, and join requests.",
		features: ["Roster", "Roles & ranks", "Access lists", "Join requests"]
	},
	{
		id: "alliance-mgmt",
		name: "AllianceMgmt",
		path: "/alliance",
		status: "active",
		summary: "Coalition setup, invite flows, and shared governance.",
		features: ["Founding tribes", "Invites & requests", "Standing & bans"]
	},
	{
		id: "job-board",
		name: "JobBoard",
		path: "/job-board",
		status: "planned",
		summary: "Post jobs, track contributions, and split rewards.",
		features: ["Milestone goals", "Contribution tracking", "Reward splits"]
	},
	{
		id: "markets",
		name: "Markets",
		path: "/markets",
		status: "planned",
		summary: "Tribe and alliance-wide markets for trading and contracts.",
		features: ["Listings", "Escrow", "Reputation signals"]
	},
	{
		id: "logistics",
		name: "Logistics",
		path: "/logistics",
		status: "planned",
		summary: "Resource flow, stockpiles, and fulfillment chains.",
		features: ["Inventory lanes", "Delivery tracking", "Alerts"]
	}
];

const statusLabel: Record<ModuleStatus, string> = {
	active: "Active",
	planned: "Planned"
};

const statusClass: Record<ModuleStatus, string> = {
	active: "chip good",
	planned: "chip warn"
};

function ModuleCatalog() {
	const navigate = useNavigate();

	return (
		<div className="stack">
			<div className="hero">
				<div className="hero-header">
					<div>
						<div className="eyebrow">Module Catalog</div>
						<h1>VITA module lineup</h1>
						<div className="small">
							Pick the modules you want active. Shared schema keeps storage lean while
							pricing stays modular.
						</div>
					</div>
					<div className="hero-actions">
						<button type="button">Request new module</button>
						<button type="button" className="secondary">
							View billing tiers
						</button>
					</div>
				</div>
				<div className="hero-grid">
					<div className="stat">
						<span className="stat-label">Total modules</span>
						<span className="stat-value">{modules.length}</span>
						<span className="small">Select only what you need.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Active</span>
						<span className="stat-value">
							{modules.filter((module) => module.status === "active").length}
						</span>
						<span className="small">Live management modules.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Planned</span>
						<span className="stat-value">
							{modules.filter((module) => module.status === "planned").length}
						</span>
						<span className="small">Next wave shipping soon.</span>
					</div>
				</div>
			</div>

			<div className="grid">
				{modules.map((module) => (
					<div key={module.id} className="card">
						<div className="row" style={{ justifyContent: "space-between" }}>
							<div style={{ fontWeight: 700 }}>{module.name}</div>
							<span className={statusClass[module.status]}>
								{statusLabel[module.status]}
							</span>
						</div>
						<div className="small" style={{ marginTop: 8 }}>
							{module.summary}
						</div>
						<ul className="list">
							{module.features.map((feature) => (
								<li key={`${module.id}-${feature}`} className="small">
									{feature}
								</li>
							))}
						</ul>
						<div className="row" style={{ marginTop: 12 }}>
							<button
								type="button"
								onClick={() => navigate({ to: module.path })}
							>
								Open module
							</button>
							<button type="button" className="secondary">
								Configure
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
