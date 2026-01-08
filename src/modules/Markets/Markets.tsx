export function Markets() {
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
						<button type="button">Create listing</button>
						<button type="button" className="secondary">
							View escrow
						</button>
					</div>
				</div>
				<div className="hero-grid">
					<div className="stat">
						<span className="stat-label">Active listings</span>
						<span className="stat-value">0</span>
						<span className="small">No listings yet.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Escrow volume</span>
						<span className="stat-value">—</span>
						<span className="small">Secure trades when live.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Top lanes</span>
						<span className="stat-value">—</span>
						<span className="small">Market routes surface here.</span>
					</div>
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Listings board</div>
					<div className="small">
						Post buy/sell requests, set quantities, and enforce delivery windows.
					</div>
				</div>
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Reputation signals</div>
					<div className="small">
						Track fulfillment history for tribes, alliances, and individual traders.
					</div>
				</div>
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Coming soon</div>
					<div className="small">Market activity will appear once the module is live.</div>
				</div>
			</div>
		</div>
	);
}
