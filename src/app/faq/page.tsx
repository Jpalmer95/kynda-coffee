import type { Metadata } from "next";
import { FaqClient } from "@/components/faq/FaqClient";

export const metadata: Metadata = {
  title: "FAQ — Kynda Coffee",
  description:
    "Frequently asked questions about Kynda Coffee: ordering, shipping, loyalty program, returns, custom merch, and more.",
  alternates: { canonical: "https://kyndacoffee.com/faq" },
};

export default function FaqPage() {
  return <FaqClient />;
}
