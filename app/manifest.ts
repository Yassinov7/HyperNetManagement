import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HyperNet Management System",

    short_name: "HyperNet",

    description:
      "نظام إدارة العملاء والحسابات في HyperNet",

    start_url: "/dashboard",

    display: "standalone",

    background_color: "#031B30",

    theme_color: "#031B30",

    orientation: "portrait",

    lang: "ar",

    dir: "rtl",

    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}