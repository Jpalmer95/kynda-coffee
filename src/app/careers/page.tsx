import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { CareersClient } from "@/components/careers/CareersClient";

export const metadata: Metadata = {
  title: "Careers — Join the Kynda Team",
  description:
    "We're hiring passionate baristas, shift leads, and creative minds at Kynda Coffee in Horseshoe Bay, TX. Apply today.",
  alternates: { canonical: "https://kyndacoffee.com/careers" },
};

interface JobOpening {
  id: string;
  title: string;
  slug: string;
  department: string;
  location: string;
  type: string;
  description: string;
  requirements: string[];
  compensation: string | null;
}

async function getOpenings(): Promise<JobOpening[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("job_openings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as unknown as JobOpening[];
  } catch {
    // Graceful fallback when table doesn't exist or Supabase is unreachable
    return [];
  }
}

export default async function CareersPage() {
  const openings = await getOpenings();

  return <CareersClient openings={openings} />;
}
