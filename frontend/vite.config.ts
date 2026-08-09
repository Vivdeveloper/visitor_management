import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";

/**
 * Production build lands in Frappe public assets (same pattern as viv_crm).
 * Capacitor build (`mode: capacitor`) outputs to frontend/dist with base /.
 */
export default defineConfig(({ command, mode }) => {
	const isCapacitor = mode === "capacitor" || process.env.VITE_CAPACITOR === "true";
	const frappeAssetBase = "/assets/visitor_management/frontend/";

	return {
	plugins: [
		react(),
		...(isCapacitor
			? []
			: [
					VitePWA({
						registerType: "autoUpdate",
						injectRegister: false,
						minify: false,
						includeAssets: ["icons/*.png", "brand/*.png"],
						manifest: {
							name: "Visitor Gate",
							short_name: "Visitor Gate",
							description:
								"Precious Alloy Components — visitor check-in, host approvals, and gate passes",
							theme_color: "#0A3D91",
							background_color: "#F8FAFC",
							display: "standalone",
							orientation: "portrait",
							scope: "/vms/",
							start_url: "/vms/",
							id: "/vms/",
							lang: "en",
							dir: "ltr",
							categories: ["business", "productivity"],
							prefer_related_applications: false,
							shortcuts: [
								{
									name: "Add Entry",
									short_name: "Check-in",
									description: "Register a visitor at the gate",
									url: "/vms/check-in",
									icons: [
										{
											src: "/assets/visitor_management/frontend/icons/icon-192.png",
											sizes: "192x192",
											type: "image/png",
										},
									],
								},
								{
									name: "Approvals",
									short_name: "Pending",
									description: "Host approval queue",
									url: "/vms/approvals",
									icons: [
										{
											src: "/assets/visitor_management/frontend/icons/icon-192.png",
											sizes: "192x192",
											type: "image/png",
										},
									],
								},
								{
									name: "Inside",
									short_name: "Inside",
									description: "Visitors currently inside",
									url: "/vms/inside",
									icons: [
										{
											src: "/assets/visitor_management/frontend/icons/icon-192.png",
											sizes: "192x192",
											type: "image/png",
										},
									],
								},
							],
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
							// Production caching — SPA HTML comes from Frappe www `/vms`, not asset precache
							maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
							navigateFallback: null,
							globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
							runtimeCaching: [
								{
									urlPattern: ({ request, url }) =>
										request.mode === "navigate" && url.pathname.startsWith("/vms"),
									handler: "NetworkFirst",
									options: {
										cacheName: "vms-pages",
										networkTimeoutSeconds: 5,
										expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 },
									},
								},
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
										url.pathname.startsWith("/assets/visitor_management/frontend/") &&
										!url.pathname.endsWith(".png") &&
										!url.pathname.endsWith(".svg") &&
										!url.pathname.endsWith(".woff2"),
									handler: "NetworkFirst",
									options: {
										cacheName: "vms-shell",
										networkTimeoutSeconds: 4,
										expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 },
									},
								},
							],
						},
						filename: "sw.js",
						manifestFilename: "manifest.webmanifest",
					}),
				]),
	],
	base: isCapacitor ? "/" : command === "build" ? frappeAssetBase : "/",
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
		outDir: isCapacitor ? "dist" : "../visitor_management/public/frontend",
		emptyOutDir: true,
		minify: "esbuild",
		sourcemap: false,
		rollupOptions: {
			output: {
				entryFileNames: isCapacitor ? "assets/[name]-[hash].js" : "vms-app.js",
				chunkFileNames: isCapacitor ? "assets/[name]-[hash].js" : "vms-chunk-[name].js",
				assetFileNames: isCapacitor ? "assets/[name]-[hash].[ext]" : "vms-asset-[name].[ext]",
				manualChunks: isCapacitor
					? {
							vendor: ["react", "react-dom", "react-router-dom"],
							axios: ["axios"],
						}
					: undefined,
			},
		},
	},
};
});

function getProxyOptions() {
	const config = getCommonSiteConfig();
	const default_site = config?.default_site ?? null;
	// Prefer VITE_FRAPPE_URL (.env) so local port can differ from common_site_config.
	const envUrl = process.env.VITE_FRAPPE_URL?.trim();
	const target =
		envUrl && /^https?:\/\//.test(envUrl)
			? envUrl.replace(/\/$/, "")
			: `http://127.0.0.1:${config?.webserver_port ?? 8000}`;
	// Always proxy to loopback when possible — site hostnames (e.g. precious.alloys)
	// often are not in /etc/hosts. Set Host so Frappe multi-tenancy still resolves.
	return {
		"^/(app|login|api|assets|files|private)": {
			target,
			ws: true,
			changeOrigin: true,
			configure(proxy) {
				proxy.on("proxyReq", (proxyReq, req) => {
					let site_name = String(req.headers.host || "").split(":")[0];
					if (
						(site_name === "localhost" || site_name === "127.0.0.1") &&
						default_site
					) {
						site_name = default_site;
					}
					proxyReq.setHeader("Host", site_name);
				});
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
