import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

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
  title: "Kynda Coffee — Organic Specialty Coffee | Horseshoe Bay, TX",
  description:
    "Hand-selected micro-lot organic coffees, scratch kitchen, and custom merchandise. Locally roasted in the Texas Hill Country.",
  keywords: [
    "specialty coffee",
    "organic coffee",
    "Horseshoe Bay",
    "Texas Hill Country",
    "coffee shop",
    "micro-lot roasts",
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
  },
};

export const viewport: Viewport = {
  themeColor: "#2c1810",
  width: "device-width",
  initialScale: 1,
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
      </head>
      <body className="flex min-h-screen flex-col bg-cream text-espresso font-body antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
