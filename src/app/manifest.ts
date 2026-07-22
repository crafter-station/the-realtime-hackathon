import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Realtime Hackathon by Portal",
    short_name: "Realtime Hackathon",
    description:
      "Build a live, multiplayer, or agentic AI product with Portal in one weekend.",
    start_url: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#090909",
    icons: [
      {
        src: "/brand-assets/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand-assets/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
