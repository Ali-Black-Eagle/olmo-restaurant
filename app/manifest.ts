import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Olmo",
    short_name: "Olmo",
    description: "Wood-fired kitchen in Bristol. Book a table in three taps.",
    start_url: "/book",
    scope: "/",
    display: "standalone",
    background_color: "#ECE4D3",
    theme_color: "#ECE4D3",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
