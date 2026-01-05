import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// This import is optional; TanStack Router will generate routeTree.gen at dev time.
// If your editor complains before first run, that's normal.

const basepath =
	window.location.pathname.match(/^(\/t\/[^/]+\/m\/[^/]+)/)?.[1] || "/";

export const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	basepath
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
