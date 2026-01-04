import { Link, Outlet } from "@tanstack/react-router";

export function Layout() {
	return (
		<div className="container">
			<nav className="nav">
				<Link to="/" activeOptions={{ exact: true }}>
					Home
				</Link>
			</nav>

			<Outlet />

			<div className="small" style={{ marginTop: 18 }}>
				VITA reference frontend • API-base: <code>{import.meta.env.VITE_API_BASE_URL ?? "(unset)"}</code>
			</div>
		</div>
	);
}
