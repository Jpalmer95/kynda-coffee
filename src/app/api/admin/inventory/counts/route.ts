import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getPosCatalog } from "@/lib/pos/catalog";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inventory/counts
 *   - ?id=<uuid>  → single count with items
 *   - (no params) → list of all counts (summary, no items)
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  try {
    if (id) {
      // Single count with items
      const { data: count, error: countErr } = await supabaseAdmin()
        .from("inventory_counts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (countErr) throw countErr;
      if (!count) return NextResponse.json({ error: "Count not found" }, { status: 404 });

      const { data: items, error: itemsErr } = await supabaseAdmin()
        .from("inventory_count_items")
        .select("*")
        .eq("count_id", id)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (itemsErr) throw itemsErr;

      return NextResponse.json({ count, items: items ?? [] });
    }

    // List all counts
    const { data: counts, error } = await supabaseAdmin()
      .from("inventory_counts")
      .select("*")
      .order("count_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ counts: counts ?? [] });
  } catch (error) {
    console.error("Inventory counts GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory counts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/inventory/counts
 * Create a new count, optionally auto-populating items from the live POS catalog.
 * Body: { action: "create" } → creates count + populates items from Square/online
 * Body: { action: "finalize", count_id } → sets status=completed, computes totals
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const action = body.action ?? "create";

    if (action === "finalize") {
      return await finalizeCount(body.count_id);
    }

    if (action === "create") {
      return await createCount(team.user.id);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error("Inventory counts POST error", error);
    return NextResponse.json(
      { error: "Failed to create inventory count", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function createCount(userId: string) {
  // Create the count header
  const { data: count, error: countErr } = await supabaseAdmin()
    .from("inventory_counts")
    .insert({
      counted_by: userId,
      status: "in_progress",
      count_date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (countErr) throw countErr;

  // Auto-populate items from the live POS catalog + online products
  const catalog = await getPosCatalog({ channel: "all", includeModifiers: false, limit: 500 });

  const posItems = catalog.items.flatMap((item, itemIdx) =>
    item.variations.map((variation) => ({
      count_id: count.id,
      pos_item_id: item.providerItemId,
      pos_variation_id: variation.providerVariationId,
      product_id: null,
      name: item.name,
      variation_name: variation.name,
      sku: variation.sku,
      category: item.itemType === "menu" || item.itemType === "service" ? "Cafe" : "Merch",
      unit: "each",
      system_stock: variation.trackInventory
        ? (variation.raw?.kyndaInventory?.quantity_available ?? 0)
        : 0,
      counted_stock: null,
      unit_cost_cents: Math.round((variation.priceCents ?? 0) * 0.35), // ~35% COGS estimate until MenuMetrics integration
      sort_order: itemIdx,
    }))
  );

  // Also pull online (non-POS) products
  const { data: onlineProducts } = await supabaseAdmin()
    .from("products")
    .select("id, name, category, inventory_count, track_inventory, source")
    .neq("source", "square")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(200);

  const onlineItems = (onlineProducts ?? []).map((product: any, idx: number) => ({
    count_id: count.id,
    pos_item_id: null,
    pos_variation_id: null,
    product_id: product.id,
    name: product.name,
    variation_name: "Default",
    sku: null,
    category: String(product.category).startsWith("coffee") ? "Cafe" : "Merch",
    unit: "each",
    system_stock: product.track_inventory ? product.inventory_count ?? 0 : 0,
    counted_stock: null,
    unit_cost_cents: 0,
    sort_order: 1000 + idx,
  }));

  const allItems = [...posItems, ...onlineItems];

  if (allItems.length > 0) {
    const { error: itemsErr } = await supabaseAdmin()
      .from("inventory_count_items")
      .insert(allItems);

    if (itemsErr) throw itemsErr;
  }

  return NextResponse.json({ count, itemsCreated: allItems.length });
}

async function finalizeCount(countId: string) {
  // Fetch all items for this count
  const { data: items, error: itemsErr } = await supabaseAdmin()
    .from("inventory_count_items")
    .select("*")
    .eq("count_id", countId);

  if (itemsErr) throw itemsErr;

  // Compute totals
  let totalExpectedCents = 0;
  let totalCountedCents = 0;

  for (const item of items ?? []) {
    const expected = (item.system_stock ?? 0) * (item.unit_cost_cents ?? 0);
    const counted = item.counted_stock !== null
      ? item.counted_stock * (item.unit_cost_cents ?? 0)
      : expected; // uncounted items assume no variance
    totalExpectedCents += Math.round(expected);
    totalCountedCents += Math.round(counted);
  }

  const totalVarianceCents = totalCountedCents - totalExpectedCents;

  const { data: count, error } = await supabaseAdmin()
    .from("inventory_counts")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      total_variance_cents: totalVarianceCents,
      total_expected_cents: totalExpectedCents,
      total_counted_cents: totalCountedCents,
    })
    .eq("id", countId)
    .select()
    .single();

  if (error) throw error;

  return NextResponse.json({ count });
}

/**
 * PATCH /api/admin/inventory/counts
 * Update a single count item's counted_stock or notes on the count header.
 * Body: { count_id, item_id, counted_stock } — update a single line
 * Body: { count_id, notes } — update count notes
 */
export async function PATCH(req: NextRequest) {
  const team = await requireTier(req, "manager");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Update a single count item's counted stock
    if (body.item_id && body.counted_stock !== undefined) {
      const { data, error } = await supabaseAdmin()
        .from("inventory_count_items")
        .update({ counted_stock: body.counted_stock })
        .eq("id", body.item_id)
        .eq("count_id", body.count_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ item: data });
    }

    // Update count notes
    if (body.count_id && body.notes !== undefined) {
      const { data, error } = await supabaseAdmin()
        .from("inventory_counts")
        .update({ notes: body.notes })
        .eq("id", body.count_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ count: data });
    }

    return NextResponse.json({ error: "Invalid PATCH body" }, { status: 400 });
  } catch (error) {
    console.error("Inventory counts PATCH error", error);
    return NextResponse.json(
      { error: "Failed to update count", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/inventory/counts?id=<count_id>
 */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "owner");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("inventory_counts")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
