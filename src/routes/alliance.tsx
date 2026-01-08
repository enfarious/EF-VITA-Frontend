import { createFileRoute } from "@tanstack/react-router";
import { AllianceMgmt } from "@/modules/AllianceMgmt/AllianceMgmt";

export const Route = createFileRoute("/alliance")({
	component: AllianceMgmt
});
