import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chronic Health Buddy",
  description: "Your multilingual daily health companion - Track medications, vitals, and symptoms with ease",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Health Buddy",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Mobile Web App Config */}
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Health Buddy" />
        
        {/* Icons */}
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        
        {/* Splash Screen (for iOS) */}
        <link
          rel="apple-touch-startup-image"
          href="/icon-512x512.png"
          media="(device-width: 812px) and (device-height: 1707px) and (-webkit-device-pixel-ratio: 3)"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
