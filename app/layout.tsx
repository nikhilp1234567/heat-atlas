import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Heat Atlas | Urban Heat Island Visualizer",
  description: "Explore urban heat islands and absolute temperatures globally with the Heat Atlas. Visualize climate data and thermal anomalies in real-time.",
  keywords: ["heat atlas", "urban heat island", "climate change", "thermal map", "temperature", "global warming", "satellite data"],
  authors: [{ name: "Nikhil Parmar", url: "https://www.nikhilp.online" }],
  metadataBase: new URL("https://www.nikhilp.online/heat-atlas"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Heat Atlas | Urban Heat Island Visualizer",
    description: "Explore urban heat islands and absolute temperatures globally with the Heat Atlas.",
    url: "https://www.nikhilp.online/heat-atlas",
    siteName: "Heat Atlas",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Heat Atlas",
    description: "Visualize global thermal anomalies.",
    creator: "@scientificsaas", // Assuming handle, or remove if unknown
  },
  icons: {
    icon: "/heat-atlas/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
