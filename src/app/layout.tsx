import type { Metadata, Viewport } from "next";
import { EB_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "@/styles/globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { SkipLink } from "@/components/ui/SkipLink";
import { ToastProvider } from "@/components/ui/Toast";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { FloatingCheckout } from "@/components/cart/FloatingCheckout";
import { BackToTop } from "@/components/ui/BackToTop";
import { InstallPrompt } from "@/components/ui/InstallPrompt";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { SWUpdater } from "@/components/ui/SWUpdater";
import { ThemeProvider } from "@/lib/theme/context";
import { PostHogProvider } from "@/lib/posthog/PostHogProvider";
// TODO: Re-enable Sentry once client config import path is fixed for SSR
// import "@/sentry.client.config";

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const heading = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
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
  },
  openGraph: {
    title: "Kynda Coffee — Organic Specialty Coffee",
    description: "Hand-selected micro-lot organic coffees from the Texas Hill Country.",
    type: "website",
    locale: "en_US",
    siteName: "Kynda Coffee",
    images: [{ url: "/images/og-cover.jpg", width: 1200, height: 630, alt: "Kynda Coffee - Organic Specialty Coffee" }],
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
  },
  icons: {
    icon: [
      { url: "/icons/favicon.png", sizes: "any", type: "image/png" },
    ],
    apple: [{ url: "/icons/favicon.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1B3022",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/favicon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // SW update safety net — runs before React hydrates.
              // Ensures the NEW service worker activates even if the old
              // cached JS bundle doesn't contain our useSWUpdater hook.
              (function() {
                try {
                  var reloadedFlag = 'kynda-sw-reload-flag';
                  if (sessionStorage.getItem(reloadedFlag)) {
                    sessionStorage.removeItem(reloadedFlag);
                    return;
                  }
                  if (!('serviceWorker' in navigator)) return;
                  var reloadOnce = function() {
                    sessionStorage.setItem(reloadedFlag, '1');
                    window.location.reload();
                  };
                  navigator.serviceWorker.getRegistration('/').then(function(reg) {
                    if (!reg) return;
                    if (reg.waiting) {
                      // A new SW is already waiting — activate it now
                      sessionStorage.setItem(reloadedFlag, '1');
                      reg.waiting.postMessage('SKIP_WAITING');
                    }
                    reg.addEventListener('updatefound', function() {
                      var installing = reg.installing;
                      if (!installing) return;
                      installing.addEventListener('statechange', function() {
                        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                          // New SW ready — activate it and reload
                          sessionStorage.setItem(reloadedFlag, '1');
                          installing.postMessage('SKIP_WAITING');
                        }
                      });
                    });
                    // Force an immediate update check on every page load
                    reg.update().catch(function() {});
                    // Reload when the new SW takes over via clients.claim()
                    navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
                  }).catch(function() {});
                } catch (_) {}
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const t = localStorage.getItem('kynda-theme') || 'system';
                  if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>
        <body className="flex min-h-screen flex-col bg-cream text-espresso font-body antialiased touch-pan-y relative relative-z-0 bg-[url('/noise.png')]">
        <ThemeProvider>
          <PostHogProvider>
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
            <FloatingCheckout />
            <BackToTop />
            <InstallPrompt />
            <SWUpdater />
            <div id="cart-announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
          </ToastProvider>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
