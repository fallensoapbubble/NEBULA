import React from 'react';
import "./globals.css";
import { AuthProvider } from "../../lib/auth-context.js";
import { Inter } from 'next/font/google';
import OfflineStatus from "../../components/ui/OfflineStatus.js";
import { ServiceWorkerUpdateBanner } from "../../lib/service-worker-manager.js";

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: "Nebula",
  description: "Decentralized Portfolio One Stop",
  manifest: "/manifest.json",
  themeColor: "#6366f1",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nebula"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nebula" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <ServiceWorkerUpdateBanner />
          <OfflineStatus />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
