import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  // ⚠️  Change "swing-trading-app" to your actual GitHub repo name
  base: "/swing-trading-app/",

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Swing Trading Portfolio",
        short_name: "SwingTrading",
        description: "Gestor de portafolio de swing trading con análisis AI",
        theme_color: "#080d0f",
        background_color: "#080d0f",
        display: "standalone",
        orientation: "portrait",
        scope: "/swing-trading-app/",
        start_url: "/swing-trading-app/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
            handler: "NetworkOnly"
          }
        ]
      }
    })
  ]
});
