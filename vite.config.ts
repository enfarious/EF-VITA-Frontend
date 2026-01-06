import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";
import path from "node:path";

export default defineConfig({
	base: "./",
	plugins: [TanStackRouterVite(), react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src")
		}
	},
	server: {
		port: 3030,
		proxy: {
			"/module-api": {
				target: "http://localhost:8787",
				changeOrigin: true,
				rewrite: (pathValue) => pathValue.replace(/^\/module-api/, "")
			}
		}
	}
});
