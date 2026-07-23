import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";

/**
 * Production build lands in Frappe public assets (same pattern as viv_crm).
 * Served at /assets/visitor_management/frontend/… and loaded by www/vms.html.
 * PWA SW/manifest are copied to www/ for /vms/sw.js and /vms/manifest.webmanifest.
 */
export default defineConfig(({ command }) => ({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			injectRegister: false,
			includeAssets: ["icons/*.png"],
			manifest: {
				name: "Visitor Management",
				short_name: "VMS",
				description: "Visitor passes, host approvals, and gate operations",
				theme_color: "#e11d48",
				background_color: "#f4f4f5",
				display: "standalone",
				orientation: "portrait",
				scope: "/vms/",
				start_url: "/vms/m",
				id: "/vms/m",
				icons: [
					{
						src: "/assets/visitor_management/frontend/icons/icon-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "/assets/visitor_management/frontend/icons/icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "/assets/visitor_management/frontend/icons/icon-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				navigateFallback: null,
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
				runtimeCaching: [
					{
						urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
						handler: "NetworkFirst",
						options: {
							cacheName: "vms-api",
							networkTimeoutSeconds: 8,
							expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 },
						},
					},
					{
						urlPattern: ({ url }) =>
							url.pathname.startsWith("/assets/visitor_management/frontend/"),
						handler: "CacheFirst",
						options: {
							cacheName: "vms-shell",
							expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
						},
					},
				],
			},
			filename: "sw.js",
			manifestFilename: "manifest.webmanifest",
		}),
	],
	base: command === "build" ? "/assets/visitor_management/frontend/" : "/",
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	server: {
		port: 5173,
		proxy: getProxyOptions(),
	},
	build: {
		outDir: "../visitor_management/public/frontend",
		emptyOutDir: true,
		rollupOptions: {
			output: {
				entryFileNames: "vms-app.js",
				chunkFileNames: "vms-chunk-[name].js",
				assetFileNames: "vms-asset-[name].[ext]",
			},
		},
	},
}));

function getProxyOptions() {
	const config = getCommonSiteConfig();
	const webserver_port = config ? config.webserver_port : 8000;
	const default_site = config ? config.default_site : null;
	return {
		"^/(app|login|api|assets|files|private)": {
			target: `http://127.0.0.1:${webserver_port}`,
			ws: true,
			router(req) {
				let site_name = String(req.headers.host || "").split(":")[0];
				if ((site_name === "localhost" || site_name === "127.0.0.1") && default_site) {
					site_name = default_site;
				}
				return `http://${site_name}:${webserver_port}`;
			},
		},
	};
}

function getCommonSiteConfig() {
	let currentDir = path.resolve(".");
	while (currentDir !== "/") {
		const sitesDir = path.join(currentDir, "sites");
		const appsDir = path.join(currentDir, "apps");
		if (fs.existsSync(sitesDir) && fs.existsSync(appsDir)) {
			const configPath = path.join(sitesDir, "common_site_config.json");
			if (fs.existsSync(configPath)) {
				return JSON.parse(fs.readFileSync(configPath, "utf8"));
			}
			return null;
		}
		currentDir = path.resolve(currentDir, "..");
	}
	return null;
}
