import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search | Kynda Coffee",
  description: "Search for coffee beans, merchandise, subscriptions, and more at Kynda Coffee.",
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
