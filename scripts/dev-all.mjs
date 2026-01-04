import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const env = { ...process.env };
const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath)) {
	const content = readFileSync(envPath, "utf-8");
	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const index = trimmed.indexOf("=");
		if (index === -1) continue;
		const key = trimmed.slice(0, index).trim();
		const value = trimmed.slice(index + 1).trim();
		env[key] = value;
	}
}

function run(command, args) {
	return spawn(command, args, { stdio: "inherit", shell: true, env });
}

const seed = run("node", ["scripts/seed-module-db.mjs"]);
seed.on("exit", (code) => {
	if (code !== 0) {
		process.exit(code ?? 1);
		return;
	}

	const ui = run("npm", ["run", "dev"]);
	const api = run("npm", ["run", "dev:api:watch"]);

	const shutdown = () => {
		api.kill("SIGINT");
		ui.kill("SIGINT");
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
});
