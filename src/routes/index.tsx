import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";

export const Route = createFileRoute("/")({
	component: Home
});

type Persona = {
	label: string;
	username: string;
	password: string;
	role: "tenant-admin" | "tribe-chief" | "tribe-elder" | "tribe-member";
};

type TenantSection = "overview" | "frontend" | "billing";
type MemberSection = "overview" | "members" | "roles" | "access";

type Member = {
	id: string;
	name: string;
	role: string;
	tier: number;
	status: "active" | "pending";
	wallet?: string;
};

const personas: Persona[] = [
	{
		label: "Tenant Admin",
		username: "TenantAdmin",
		password: "PasswordYo!2026",
		role: "tenant-admin"
	},
	{
		label: "Tribe Chief",
		username: "TribeChief",
		password: "PasswordYo!2026",
		role: "tribe-chief"
	},
	{
		label: "Tribe Elder",
		username: "TribeElder",
		password: "PasswordYo!2026",
		role: "tribe-elder"
	},
	{
		label: "Tribe Member",
		username: "TribeMember",
		password: "PasswordYo!2026",
		role: "tribe-member"
	}
];

const members: Member[] = [
	{
		id: "m-001",
		name: "Aria Voss",
		role: "Chief",
		tier: 5,
		status: "active",
		wallet: "0x8f3c...91b2"
	},
	{
		id: "m-002",
		name: "Kellan Rye",
		role: "Elder",
		tier: 4,
		status: "active",
		wallet: "0x51a2...0fdc"
	},
	{
		id: "m-003",
		name: "Mira Sol",
		role: "Builder",
		tier: 2,
		status: "active",
		wallet: "0x7d10...fe0a"
	},
	{
		id: "m-004",
		name: "Tomas Vale",
		role: "Gatherer",
		tier: 1,
		status: "pending"
	},
	{
		id: "m-005",
		name: "Nia Quell",
		role: "Explorer",
		tier: 2,
		status: "active",
		wallet: "0x0a8b...44be"
	}
];

function Home() {
	const [username, setUsername] = useState("TenantAdmin");
	const [password, setPassword] = useState("PasswordYo!2026");
	const [active, setActive] = useState<Persona | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [tenantSection, setTenantSection] = useState<TenantSection>("overview");
	const [memberSection, setMemberSection] = useState<MemberSection>("overview");

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

	const onLogin = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const match = personas.find(
			(persona) => persona.username === username && persona.password === password
		);

		if (!match) {
			setActive(null);
			setError("Login failed. Try a preset persona.");
			return;
		}

		setError(null);
		setActive(match);
		if (match.role === "tenant-admin") {
			setTenantSection("overview");
		} else {
			setMemberSection("overview");
		}
	};

	const setPersona = (persona: Persona) => {
		setUsername(persona.username);
		setPassword(persona.password);
		setError(null);
	};

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
							<button type="button" onClick={() => setActive(null)}>
								Sign out
							</button>
						</div>
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
											Role-based access applies. Higher tiers can manage lower tiers.
										</div>
									</div>
								</div>
							) : null}

							{memberSection === "members" ? (
								<div className="card">
									<div style={{ fontWeight: 700, marginBottom: 8 }}>Member list</div>
									<div className="table">
										<div className="table-row table-header">
											<span>Name</span>
											<span>Role</span>
											<span>Tier</span>
											<span>Status</span>
											<span>Wallet</span>
										</div>
										{members.map((member) => (
											<div className="table-row" key={member.id}>
												<span>{member.name}</span>
												<span>{member.role}</span>
												<span>{member.tier}</span>
												<span className={member.status === "active" ? "chip good" : "chip warn"}>
													{member.status}
												</span>
												<span className="mono">{member.wallet ?? "—"}</span>
											</div>
										))}
									</div>
								</div>
							) : null}

							{memberSection === "roles" ? (
								<div className="grid">
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Role catalog</div>
										<div className="small">Default tiers are editable but not deleted in MVP.</div>
										<ul className="list">
											<li>Chief · Tier 5</li>
											<li>Elder · Tier 4</li>
											<li>Warrior · Tier 3</li>
											<li>Builder · Tier 2</li>
											<li>Gatherer · Tier 1</li>
										</ul>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Role management</div>
										<div className="small">
											Role assignment appears only if your tier permits.
										</div>
										<button type="button">Request role change</button>
									</div>
								</div>
							) : null}

							{memberSection === "access" ? (
								<div className="grid">
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Access list</div>
										<div className="small">Invite or remove members by role tier.</div>
										<button type="button">Invite member</button>
									</div>
									<div className="card">
										<div style={{ fontWeight: 700, marginBottom: 6 }}>Pending invites</div>
										<div className="small">2 outstanding invites.</div>
										<button type="button">View invites</button>
									</div>
								</div>
							) : null}
						</div>
					)}
				</div>
			) : (
				<form className="stack" onSubmit={onLogin}>
					<div className="small">Fake login for MVP exploration.</div>
					<div className="grid">
						<label className="stack">
							<span className="small">Name</span>
							<input
								autoComplete="username"
								value={username}
								onChange={(event) => setUsername(event.target.value)}
							/>
						</label>
						<label className="stack">
							<span className="small">Password</span>
							<input
								type="password"
								autoComplete="current-password"
								value={password}
								onChange={(event) => setPassword(event.target.value)}
							/>
						</label>
					</div>
					<div className="row">
						<button type="submit">Enter</button>
						{error ? <span className="small">{error}</span> : null}
					</div>
					<div className="row" style={{ flexWrap: "wrap" }}>
						{personas.map((persona) => (
							<button type="button" key={persona.role} onClick={() => setPersona(persona)}>
								{persona.label}
							</button>
						))}
					</div>
				</form>
			)}
		</div>
	);
}
