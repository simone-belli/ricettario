import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ricettario",
    short_name: "Ricettario",
    description: "Simone and Kat's family recipes",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7F0",
    theme_color: "#C8102E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
