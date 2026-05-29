import "@/styles/globals.css";

export const metadata = {
  title: "Kiosk | Kynda Coffee",
  description: "Order from our in-store kiosk. Browse the menu, customize your drink, and send your order to the barista.",
  robots: { index: false, follow: false },
};

/**
 * Kiosk layout — full-screen, no header/footer/nav chrome.
 * Designed for iPad / Android tablets mounted in-store.
 */
export default function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-background text-foreground font-body antialiased overflow-hidden touch-manipulation">
        {children}
      </body>
    </html>
  );
}
