import { createFileRoute } from "@tanstack/react-router";
import { TribeMgmt } from "@/modules/TribeMgmt/TribeMgmt";

export const Route = createFileRoute("/tribe")({
	component: TribeMgmt
});
