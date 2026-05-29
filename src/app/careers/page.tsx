import { redirect } from "next/navigation";

/**
 * /careers → /contact#careers
 * The careers/job application form is embedded in the Contact page.
 * This redirect keeps the URL intuitive for job seekers.
 */
export default function CareersPage() {
  redirect("/contact#careers");
}
