import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const ADMIN_EMAILS = [
  ...(process.env.ADMIN_EMAILS?.split(",") ?? []),
  ...(process.env.ADMIN_EMAIL?.split(",") ?? []),
]
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function getAdminUser(req: NextRequest) {
  let response = NextResponse.next();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { user: null, response: null };

  const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "");
  if (!isAdmin) return { user: null, response: null };

  return { user, response };
}
