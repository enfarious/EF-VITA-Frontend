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
					Tribe
				</Link>
				<Link to="/alliance">Alliance</Link>
				<a href={spineHref}>Spine</a>
			</nav>

			<Outlet />

			<div className="small" style={{ marginTop: 18 }}>
				VITA reference frontend - API-base: <code>{import.meta.env.VITE_API_BASE_URL ?? "(unset)"}</code>
			</div>
		</div>
	);
}
