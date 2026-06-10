import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Juntada",
    short_name: "Juntada",
    description:
      "Organizá asados y juntadas con amigos: cantidades, quién trae qué y quién le debe a quién.",
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
