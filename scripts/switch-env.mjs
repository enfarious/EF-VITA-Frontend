import { readFileSync, writeFileSync } from "node:fs";

const target = process.argv[2];
const envPath = ".env";

const targets = {
	local: {
		VITE_API_BASE_URL: "http://localhost:5000/api",
		VITE_SPINE_AUTH_URL: "http://localhost:5000/auth/discord",
		VITE_MODULE_API_BASE_URL: "http://localhost:8787"
	},
	prod: {
		VITE_API_BASE_URL: "https://ef-vita.net/api",
		VITE_SPINE_AUTH_URL: "https://ef-vita.net/auth/discord",
		VITE_MODULE_API_BASE_URL: "http://localhost:8787"
	}
};

if (!target || !(target in targets)) {
	console.error("Usage: node scripts/switch-env.mjs <local|prod>");
	process.exit(1);
}

const source = readFileSync(envPath, "utf-8");
const lines = source.split(/\r?\n/);
const updates = targets[target];
const seen = new Set();

const nextLines = lines.map((line) => {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith("#")) return line;
	const index = trimmed.indexOf("=");
	if (index === -1) return line;
	const key = trimmed.slice(0, index).trim();
	if (!(key in updates)) return line;
	seen.add(key);
	return `${key}=${updates[key]}`;
});

for (const [key, value] of Object.entries(updates)) {
	if (!seen.has(key)) {
		nextLines.push(`${key}=${value}`);
	}
}

writeFileSync(envPath, nextLines.join("\n"));
console.log(`Updated ${envPath} -> ${target}`);
