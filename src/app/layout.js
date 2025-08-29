import React from 'react';
import "./globals.css";
import { AuthProvider } from "../../lib/auth-context.js";
import { Inter } from 'next/font/google';
import ClientOnly from "../../components/ClientOnly.js";
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nebula"
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6366f1'
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
        <ClientOnly>
          <AuthProvider>
            <ServiceWorkerUpdateBanner />
            <OfflineStatus />
            {children}
          </AuthProvider>
        </ClientOnly>
      </body>
    </html>
  );
}
