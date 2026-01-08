import { Link, Outlet } from "@tanstack/react-router";

export function Layout() {
	const spineHref =
		typeof window !== "undefined"
			? window.location.pathname.match(/^\/t\/[^/]+/)?.[0] ?? "/"
			: "/";

	return (
		<div className="container">
			<nav className="nav">
				<Link to="/" activeOptions={{ exact: true }}>
					Modules
				</Link>
				<Link to="/tribe">Tribe</Link>
				<Link to="/alliance">Alliance</Link>
				<Link to="/job-board">Job Board</Link>
				<Link to="/markets">Markets</Link>
				<Link to="/logistics">Logistics</Link>
				<a href={spineHref}>Spine</a>
			</nav>

			<Outlet />

			<div className="small" style={{ marginTop: 18 }}>
				VITA reference frontend - API-base: <code>{import.meta.env.VITE_API_BASE_URL ?? "(unset)"}</code>
			</div>
		</div>
	);
}
