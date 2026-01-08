import { useMemo, useState } from "react";

type BuyInStatus = "paid" | "pending";
type TribeStanding = "founding" | "member" | "banned";

type AllianceTribe = {
	id: string;
	name: string;
	representative: string;
	focus: string;
	roster: number;
	joined: string;
	buyIn?: BuyInStatus;
	standing: TribeStanding;
	executor?: boolean;
};

type AllianceInvite = {
	id: string;
	name: string;
	contact: string;
	sent: string;
	status: "pending" | "accepted";
};

type AllianceRequest = {
	id: string;
	name: string;
	representative: string;
	roster: number;
	note: string;
};

const foundingTribes: AllianceTribe[] = [
	{
		id: "stonefall",
		name: "Stonefall",
		representative: "Kael",
		focus: "Defense",
		roster: 42,
		joined: "Founding",
		buyIn: "paid",
		standing: "founding",
		executor: true
	},
	{
		id: "emberlake",
		name: "Emberlake",
		representative: "Mara",
		focus: "Trade",
		roster: 33,
		joined: "Founding",
		buyIn: "paid",
		standing: "founding"
	},
	{
		id: "stormreach",
		name: "Stormreach",
		representative: "Voss",
		focus: "Scouting",
		roster: 28,
		joined: "Founding",
		buyIn: "pending",
		standing: "founding"
	}
];

const memberTribes: AllianceTribe[] = [
	...foundingTribes,
	{
		id: "ironwake",
		name: "Ironwake",
		representative: "Sable",
		focus: "Logistics",
		roster: 24,
		joined: "2w ago",
		standing: "member"
	},
	{
		id: "dawnkeepers",
		name: "Dawnkeepers",
		representative: "Iris",
		focus: "Healing",
		roster: 18,
		joined: "5d ago",
		standing: "member"
	},
	{
		id: "emberline",
		name: "Emberline",
		representative: "Taro",
		focus: "Exploration",
		roster: 21,
		joined: "3d ago",
		standing: "member"
	}
];

const invitesOut: AllianceInvite[] = [
	{
		id: "invite-ironspire",
		name: "Ironspire",
		contact: "@ironspire-chief",
		sent: "3h ago",
		status: "pending"
	},
	{
		id: "invite-sandward",
		name: "Sandward",
		contact: "@sandward-elders",
		sent: "2d ago",
		status: "pending"
	}
];

const joinRequests: AllianceRequest[] = [
	{
		id: "request-nightvale",
		name: "Nightvale",
		representative: "Rin",
		roster: 19,
		note: "We can open river routes and share patrol schedules."
	},
	{
		id: "request-greydusk",
		name: "Greydusk",
		representative: "Hale",
		roster: 27,
		note: "Interested in mutual defense and shared intel."
	}
];

const bannedTribes: AllianceTribe[] = [
	{
		id: "withered",
		name: "Withered Pact",
		representative: "Unknown",
		focus: "Sabotage",
		roster: 12,
		joined: "Banned",
		standing: "banned"
	}
];

export function AllianceMgmt() {
	const [inviteDraft, setInviteDraft] = useState({
		name: "",
		contact: "",
		note: ""
	});
	const [search, setSearch] = useState("");
	const [allowRequests, setAllowRequests] = useState(true);
	const [allowInvites, setAllowInvites] = useState(true);
	const [shareRoster, setShareRoster] = useState(true);
	const [requireBuyIn, setRequireBuyIn] = useState(true);

	const buyInCount = foundingTribes.filter((tribe) => tribe.buyIn === "paid").length;
	const readyToLaunch = buyInCount >= 3;
	const executor = foundingTribes.find((tribe) => tribe.executor);

	const filteredMembers = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return memberTribes;
		return memberTribes.filter((tribe) =>
			[tribe.name, tribe.representative, tribe.focus].some((field) =>
				field.toLowerCase().includes(query)
			)
		);
	}, [search]);

	const buyInLabel = (status?: BuyInStatus) =>
		status === "paid" ? "Buy-in paid" : "Buy-in pending";

	return (
		<div className="stack">
			<div className="hero">
				<div className="hero-header">
					<div>
						<div className="eyebrow">Tribal Alliance</div>
						<h1>Alliance command deck</h1>
						<div className="small">
							Build a multi-tribe coalition with shared comms, rules of engagement, and
							mutual support.
						</div>
					</div>
					<div className="hero-actions">
						<button type="button" disabled={!readyToLaunch}>
							{readyToLaunch ? "Alliance live" : "Awaiting buy-ins"}
						</button>
						<button type="button">Open alliance briefing</button>
					</div>
				</div>
				<div className="hero-grid">
					<div className="stat">
						<span className="stat-label">Buy-in status</span>
						<span className="stat-value">{buyInCount}/3</span>
						<span className="small">
							{readyToLaunch
								? "Minimum met. Alliance operations unlocked."
								: "Three tribes must buy in before launch."}
						</span>
					</div>
					<div className="stat">
						<span className="stat-label">Executor tribe</span>
						<span className="stat-value">{executor?.name ?? "Unassigned"}</span>
						<span className="small">Executor oversees invites, votes, and bans.</span>
					</div>
					<div className="stat">
						<span className="stat-label">Active tribes</span>
						<span className="stat-value">{memberTribes.length}</span>
						<span className="small">Founding tribes retain vote priority.</span>
					</div>
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Alliance rules</div>
					<div className="small">
						Keep the alliance fair: three paid tribes to launch, shared governance after
						that.
					</div>
					<div className="stack" style={{ marginTop: 12 }}>
						<label className="row">
							<input
								type="checkbox"
								checked={requireBuyIn}
								onChange={(event) => setRequireBuyIn(event.target.checked)}
							/>
							<span>Require 3 paid buy-ins to start alliance</span>
						</label>
						<label className="row">
							<input
								type="checkbox"
								checked={allowInvites}
								onChange={(event) => setAllowInvites(event.target.checked)}
							/>
							<span>Founding tribes can invite new members</span>
						</label>
						<label className="row">
							<input
								type="checkbox"
								checked={allowRequests}
								onChange={(event) => setAllowRequests(event.target.checked)}
							/>
							<span>Allow incoming membership requests</span>
						</label>
						<label className="row">
							<input
								type="checkbox"
								checked={shareRoster}
								onChange={(event) => setShareRoster(event.target.checked)}
							/>
							<span>Share roster sizes with the alliance</span>
						</label>
					</div>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Invite a tribe</div>
					<div className="small">Founding tribes can initiate invites or share an invite.</div>
					<form
						className="stack"
						onSubmit={(event) => {
							event.preventDefault();
							setInviteDraft({ name: "", contact: "", note: "" });
						}}
					>
						<label className="stack">
							<span className="small">Tribe name</span>
							<input
								value={inviteDraft.name}
								onChange={(event) =>
									setInviteDraft((prev) => ({ ...prev, name: event.target.value }))
								}
								placeholder="Ashgrove"
							/>
						</label>
						<label className="stack">
							<span className="small">Contact handle</span>
							<input
								value={inviteDraft.contact}
								onChange={(event) =>
									setInviteDraft((prev) => ({ ...prev, contact: event.target.value }))
								}
								placeholder="@ashgrove-chief"
							/>
						</label>
						<label className="stack">
							<span className="small">Invite note</span>
							<textarea
								rows={3}
								value={inviteDraft.note}
								onChange={(event) =>
									setInviteDraft((prev) => ({ ...prev, note: event.target.value }))
								}
								placeholder="Share how the alliance helps them."
							/>
						</label>
						<div className="row">
							<button type="submit" disabled={!allowInvites}>
								Send invite
							</button>
							<button type="button" disabled={!allowInvites}>
								Copy invite link
							</button>
						</div>
					</form>
				</div>

				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Membership requests</div>
					<div className="small">
						Tribes can request membership when requests are open.
					</div>
					<div className="stack" style={{ marginTop: 12 }}>
						{joinRequests.map((request) => (
							<div key={request.id} className="card subtle stack">
								<div className="row" style={{ justifyContent: "space-between" }}>
									<div>
										<div style={{ fontWeight: 700 }}>{request.name}</div>
										<span className="small">
											Rep: {request.representative} • Roster {request.roster}
										</span>
									</div>
									<div className="row">
										<button type="button">Approve</button>
										<button type="button">Deny</button>
									</div>
								</div>
								<span className="small">{request.note}</span>
							</div>
						))}
						{joinRequests.length === 0 ? (
							<span className="small">No pending requests right now.</span>
						) : null}
					</div>
				</div>
			</div>

			<div className="card">
				<div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
					<div>
						<div style={{ fontWeight: 700 }}>Founding tribes</div>
						<div className="small">
							Founders buy in and vote to approve invitations, kicks, or bans.
						</div>
					</div>
					<div className="small">
						{readyToLaunch ? (
							<span className="chip good">Alliance active</span>
						) : (
							<span className="chip warn">{3 - buyInCount} buy-in(s) needed</span>
						)}
					</div>
				</div>
				<div className="table table-5">
					<div className="table-row table-header">
						<span>Tribe</span>
						<span>Representative</span>
						<span>Focus</span>
						<span>Roster</span>
						<span>Buy-in</span>
					</div>
					{foundingTribes.map((tribe) => (
						<div className="table-row" key={tribe.id}>
							<div className="stack" style={{ gap: 4 }}>
								<span>{tribe.name}</span>
								<div className="row">
									{tribe.executor ? <span className="chip info">Executor</span> : null}
								</div>
							</div>
							<span>{tribe.representative}</span>
							<span>{tribe.focus}</span>
							<span>{tribe.roster}</span>
							<span className={tribe.buyIn === "paid" ? "chip good" : "chip warn"}>
								{buyInLabel(tribe.buyIn)}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className="card">
				<div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
					<div>
						<div style={{ fontWeight: 700 }}>Alliance members</div>
						<div className="small">Track membership, standing, and roster sizes.</div>
					</div>
					<label className="stack" style={{ width: 240 }}>
						<span className="small">Search tribes</span>
						<input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Name, rep, focus"
						/>
					</label>
				</div>
				<div className="table table-6">
					<div className="table-row table-header">
						<span>Tribe</span>
						<span>Representative</span>
						<span>Focus</span>
						<span>Roster</span>
						<span>Standing</span>
						<span>Actions</span>
					</div>
					{filteredMembers.map((tribe) => (
						<div className="table-row" key={tribe.id}>
							<span>{tribe.name}</span>
							<span>{tribe.representative}</span>
							<span>{tribe.focus}</span>
							<span>{tribe.roster}</span>
							<span className="row" style={{ flexWrap: "wrap" }}>
								{tribe.executor ? <span className="chip info">Executor</span> : null}
								{tribe.standing === "founding" ? (
									<span className="chip">Founding</span>
								) : (
									<span className="chip">Member</span>
								)}
							</span>
							<span className="row">
								<button type="button" disabled={tribe.executor}>
									Kick
								</button>
								<button type="button" disabled={tribe.executor}>
									Ban
								</button>
							</span>
						</div>
					))}
					{filteredMembers.length === 0 ? (
						<div className="table-row">
							<span style={{ gridColumn: "1 / -1" }}>No tribes match that search.</span>
						</div>
					) : null}
				</div>
			</div>

			<div className="grid">
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Invites out</div>
					<div className="small">Waiting on responses from invited tribes.</div>
					<div className="stack" style={{ marginTop: 12 }}>
						{invitesOut.map((invite) => (
							<div key={invite.id} className="row" style={{ justifyContent: "space-between" }}>
								<div className="stack" style={{ gap: 4 }}>
									<span>{invite.name}</span>
									<span className="small">
										{invite.contact} • Sent {invite.sent}
									</span>
								</div>
								<span className="chip warn">{invite.status}</span>
							</div>
						))}
						{invitesOut.length === 0 ? (
							<span className="small">No active invitations.</span>
						) : null}
					</div>
				</div>
				<div className="card">
					<div style={{ fontWeight: 700, marginBottom: 6 }}>Banned tribes</div>
					<div className="small">Bans require a founding vote.</div>
					<div className="stack" style={{ marginTop: 12 }}>
						{bannedTribes.map((tribe) => (
							<div key={tribe.id} className="row" style={{ justifyContent: "space-between" }}>
								<div className="stack" style={{ gap: 4 }}>
									<span>{tribe.name}</span>
									<span className="small">Reason: hostile actions</span>
								</div>
								<button type="button">Review</button>
							</div>
						))}
						{bannedTribes.length === 0 ? (
							<span className="small">No bans recorded.</span>
						) : null}
					</div>
				</div>
			</div>

			<div className="card">
				<div style={{ fontWeight: 700, marginBottom: 6 }}>Alliance chat</div>
				<div className="row" style={{ justifyContent: "space-between" }}>
					<div className="small">
						Discord integration is coming soon. We'll surface alliance channels, pings,
						and shared announcements here.
					</div>
					<button type="button" disabled>
						Connect Discord
					</button>
				</div>
			</div>
		</div>
	);
}
