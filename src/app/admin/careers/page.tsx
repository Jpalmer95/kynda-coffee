import type { Metadata } from "next";
import { AdminCareersClient } from "@/components/careers/AdminCareersClient";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Careers — Admin",
};

interface JobOpening {
  id: string;
  title: string;
  slug: string;
  department: string;
  type: string;
  is_active: boolean;
  created_at: string;
}

interface JobApplication {
  id: string;
  opening_id: string | null;
  opening_title: string;
  name: string;
  email: string;
  phone: string | null;
  cover_letter: string | null;
  resume_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

async function getData() {
  try {
    const supabase = await createClient();

    const [openingsRes, appsRes] = await Promise.all([
      supabase
        .from("job_openings")
        .select("id, title, slug, department, type, is_active, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("job_applications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return {
      openings: (openingsRes.data || []) as unknown as JobOpening[],
      applications: (appsRes.data || []) as unknown as JobApplication[],
    };
  } catch {
    return { openings: [], applications: [] };
  }
}

export default async function AdminCareersPage() {
  const { openings, applications } = await getData();
  return <AdminCareersClient openings={openings} applications={applications} />;
}
