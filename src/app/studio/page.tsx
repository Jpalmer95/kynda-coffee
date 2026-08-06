import { redirect } from "next/navigation";

export const metadata = {
  title: "Design Studio | Kynda Coffee",
  description:
    "The Kynda Design Studio is currently available in the owner portal while we refine it. Ready-made designs are in the Shop.",
};

/**
 * Back-compat redirect: the Design Studio moved behind the admin wall
 * (owner-only) on 2026-08-06. Old links/QR codes/bookmarks keep working and
 * land on the admin studio — non-admins are redirected to the account login
 * by the /admin middleware.
 */
export default function StudioRedirectPage() {
  redirect("/admin/designs/studio");
}
