import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { data: product, error } = await supabaseAdmin()
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const updates: Record<string, any> = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.slug !== undefined) updates.slug = body.slug.trim();
    if (body.description !== undefined) updates.description = body.description.trim();
    if (body.category !== undefined) updates.category = body.category;
    if (body.price_cents !== undefined) updates.price_cents = Number(body.price_cents);
    if (body.compare_price_cents !== undefined) updates.compare_price_cents = body.compare_price_cents ? Number(body.compare_price_cents) : null;
    if (body.images !== undefined) updates.images = body.images;
    if (body.inventory_count !== undefined) updates.inventory_count = Number(body.inventory_count);
    if (body.track_inventory !== undefined) updates.track_inventory = !!body.track_inventory;
    if (body.is_active !== undefined) updates.is_active = !!body.is_active;
    if (body.is_featured !== undefined) updates.is_featured = !!body.is_featured;
    if (body.weight_oz !== undefined) updates.weight_oz = body.weight_oz ? Number(body.weight_oz) : null;
    updates.updated_at = new Date().toISOString();

    const { data: product, error } = await supabaseAdmin()
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error || !product) {
      return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
    }

    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user } = await getAdminUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { error } = await supabaseAdmin()
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
