import { createFileRoute } from "@tanstack/react-router";
import { Logistics } from "@/modules/Logistics/Logistics";

export const Route = createFileRoute("/logistics")({
	component: Logistics
});
