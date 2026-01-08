import { createFileRoute } from "@tanstack/react-router";
import { Markets } from "@/modules/Markets/Markets";

export const Route = createFileRoute("/markets")({
	component: Markets
});
