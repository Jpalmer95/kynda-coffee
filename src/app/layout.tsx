import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { SkipLink } from "@/components/ui/SkipLink";
import { ToastProvider } from "@/components/ui/Toast";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { BackToTop } from "@/components/ui/BackToTop";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

const heading = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kyndacoffee.com"),
  title: "Kynda Coffee — Organic Specialty Coffee | Horseshoe Bay, TX",
  description:
    "Hand-selected micro-lot organic coffees, scratch kitchen, and custom merchandise. Locally roasted in the Texas Hill Country. Order online for pickup or delivery.",
  keywords: [
    "specialty coffee",
    "organic coffee",
    "Horseshoe Bay",
    "Texas Hill Country",
    "coffee shop",
    "micro-lot roasts",
    "coffee subscription",
    "custom merch",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Kynda Coffee",
    startupImage: [
      { url: "/icons/apple-splash-2048-2732.jpg", media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/icons/apple-splash-1668-2388.jpg", media: "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/icons/apple-splash-1536-2048.jpg", media: "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      { url: "/icons/apple-splash-1170-2532.jpg", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      { url: "/icons/apple-splash-750-1334.jpg", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
    ],
  },
  openGraph: {
    title: "Kynda Coffee — Organic Specialty Coffee",
    description: "Hand-selected micro-lot organic coffees from the Texas Hill Country.",
    type: "website",
    locale: "en_US",
    siteName: "Kynda Coffee",
    images: [
      { url: "/images/og-cover.jpg", width: 1200, height: 630, alt: "Kynda Coffee - Organic Specialty Coffee" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kynda Coffee — Organic Specialty Coffee",
    description: "Hand-selected micro-lot organic coffees from the Texas Hill Country.",
    images: ["/images/og-cover.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/icons/safari-pinned-tab.svg", color: "#2c1810" },
    ],
  },
  other: {
    "msapplication-TileColor": "#2c1810",
    "msapplication-config": "/icons/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  themeColor: "#2c1810",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="flex min-h-screen flex-col bg-cream text-espresso font-body antialiased touch-pan-y">
        <ToastProvider>
          <OfflineBanner />
          <SkipLink />
          <Header />
          <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <BottomNav />
          <CartDrawer />
          <BackToTop />
          <InstallPrompt />
          {/* Screen reader announcements for dynamic cart updates */}
          <div id="cart-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch(() => {});
                  });
                }
              `,
            }}
          />
        </ToastProvider>
      </body>
    </html>
  );
}
