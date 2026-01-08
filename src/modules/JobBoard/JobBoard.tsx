export function JobBoard() {
	return (
		<div className="stack">
			<div className="hero">
				<div className="hero-header">
					<div>
						<div className="eyebrow">Job Board</div>
						<h1>Open contracts</h1>
						<div className="small">
							Post tribe or alliance jobs and split rewards by contribution.
						</div>
					</div>
					<div className="hero-actions">
						<button type="button">Post a job</button>
						<button type="button" className="secondary">
							View active payouts
						</button>
					</div>
				</div>
				<div className="hero-grid">
					<div className="stat">
						<span className="stat-label">Active jobs</span>
						<span className="stat-value">0</span>
						<span className="small">No postings yet.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Pending rewards</span>
						<span className="stat-value">0</span>
						<span className="small">Awaiting first claims.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Largest scope</span>
						<span className="stat-value">—</span>
						<span className="small">Track alliance-wide goals.</span>
					</div>
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>How it works</div>
					<div className="small">
						Create jobs with tasks, targets, and rewards. Contributions are tallied per
						member and payouts split by impact.
					</div>
				</div>
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Contribution signals</div>
					<div className="small">
						Kills, deliveries, builds, and healing all count. Mixed objectives split
						rewards across tracked metrics.
					</div>
				</div>
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Coming soon</div>
					<div className="small">Job listings will appear here once the module is live.</div>
				</div>
			</div>
		</div>
	);
}
