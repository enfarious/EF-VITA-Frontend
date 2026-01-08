export function Logistics() {
	return (
		<div className="stack">
			<div className="hero">
				<div className="hero-header">
					<div>
						<div className="eyebrow">Logistics</div>
						<h1>Supply grid</h1>
						<div className="small">
							Coordinate resource flows, delivery lanes, and stockpile goals.
						</div>
					</div>
					<div className="hero-actions">
						<button type="button">Create route</button>
						<button type="button" className="secondary">
							View alerts
						</button>
					</div>
				</div>
				<div className="hero-grid">
					<div className="stat">
						<span className="stat-label">Active routes</span>
						<span className="stat-value">0</span>
						<span className="small">No routes configured.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Stockpiles</span>
						<span className="stat-value">—</span>
						<span className="small">Track strategic reserves.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Critical alerts</span>
						<span className="stat-value">0</span>
						<span className="small">All lanes stable.</span>
					</div>
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Flow tracking</div>
					<div className="small">
						Monitor inbound/outbound volumes and highlight bottlenecks.
					</div>
				</div>
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Stockpile goals</div>
					<div className="small">
						Set targets for steel, food, or ammo with live progress updates.
					</div>
				</div>
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Coming soon</div>
					<div className="small">Logistics dashboards will appear once the module is live.</div>
				</div>
			</div>
		</div>
	);
}
