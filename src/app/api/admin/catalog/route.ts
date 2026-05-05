import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getPosCatalog } from "@/lib/pos/catalog";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const category = searchParams.get("category");
  const channel = (searchParams.get("channel") as any) ?? "all";

  try {
    const catalog = await getPosCatalog({
      channel,
      category: category && category !== "all" ? category : null,
      includeModifiers: false,
      includeOverrides: true,
      limit: 500,
    });

    let items = catalog.items;
    if (search) {
      items = items.filter((item) =>
        [item.name, item.description, item.categoryName, item.providerItemId]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }

    const { data: overrides, error } = await supabaseAdmin()
      .from("catalog_overrides")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    return NextResponse.json({
      items,
      categories: catalog.categories,
      overrides: overrides ?? [],
      generatedAt: catalog.generatedAt,
    });
  } catch (error) {
    console.error("Admin catalog fetch error", error);
    return NextResponse.json(
      {
        error: "Failed to fetch admin catalog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
