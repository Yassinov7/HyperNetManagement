import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";

import {
  Noto_Sans,
  Playfair_Display,
} from "next/font/google";

import { cn } from "@/lib/utils";

const playfairDisplayHeading =
  Playfair_Display({
    subsets: ["latin"],
    variable: "--font-heading",
  });

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "HyperNet",
    template: "%s | HyperNet",
  },

  description:
    "HyperNet Customer Management System",

  applicationName: "HyperNet",

  keywords: [
    "HyperNet",
    "ISP",
    "Customer Management",
    "Internet Management",
  ],

  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },

  manifest: "/webmanifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#031B30",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={cn(
        "font-sans",
        notoSans.variable,
        playfairDisplayHeading.variable
      )}
    >
      <head>
<link rel="manifest" href="/webmanifest.json" />
</head>
<body className="min-h-screen bg-[#031B30] text-white antialiased">
        {children}
      </body>
    </html>
  );
}