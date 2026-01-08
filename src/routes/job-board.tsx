import { createFileRoute } from "@tanstack/react-router";
import { JobBoard } from "@/modules/JobBoard/JobBoard";

export const Route = createFileRoute("/job-board")({
	component: JobBoard
});
