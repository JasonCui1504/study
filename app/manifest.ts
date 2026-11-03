import type { MetadataRoute } from "next";

// Installs as a home-screen app ("MCAT") on phones; icons are in public/icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MCAT Study",
    short_name: "MCAT",
    description: "Flashcards, study plan and progress tracking for the MCAT.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1110",
    theme_color: "#0d1110",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
