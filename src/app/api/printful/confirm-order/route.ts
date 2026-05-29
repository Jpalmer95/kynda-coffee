import { NextRequest, NextResponse } from "next/server";
import { confirmOrder } from "@/lib/printful/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/printful/confirm-order
 *
 * Confirms a draft Printful order after Stripe payment succeeds.
 * Called from Stripe webhook handler or merch checkout success flow.
 *
 * Body: { printful_order_id: number, kynda_order_id?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { printful_order_id, kynda_order_id } = body;

    if (!printful_order_id) {
      return NextResponse.json(
        { error: "printful_order_id is required" },
        { status: 400 }
      );
    }

    // Confirm the draft order with Printful
    const confirmation = await confirmOrder(printful_order_id);

    // Update the Kynda order record if we have one
    if (kynda_order_id) {
      try {
        const db = supabaseAdmin();
        // Read existing metadata
        const { data: existing } = await db
          .from("orders")
          .select("metadata")
          .eq("id", kynda_order_id)
          .single();

        const currentMeta = (existing?.metadata as Record<string, unknown>) || {};

        await db
          .from("orders")
          .update({
            fulfillment_status: "processing",
            metadata: { ...currentMeta, printful_order_id },
          })
          .eq("id", kynda_order_id);
      } catch (updateErr: any) {
        // Non-fatal — the Printful order is confirmed, we just couldn't update our record
        console.warn("[Printful confirm-order] Failed to update order metadata:", updateErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      printful_order_id,
      status: (confirmation as any)?.result?.status || "processing",
    });
  } catch (err: any) {
    console.error("[Printful confirm-order]", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to confirm Printful order" },
      { status: 500 }
    );
  }
}
