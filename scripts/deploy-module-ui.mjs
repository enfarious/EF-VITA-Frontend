import { cp, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const targetDir = path.join(root, "src", "modules", "basic_tribe_ui", "public");

async function ensureCleanTarget() {
	await rm(targetDir, { recursive: true, force: true });
}

async function main() {
	await ensureCleanTarget();
	await cp(distDir, targetDir, { recursive: true });
	console.log("Deployed UI to module public directory.");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
