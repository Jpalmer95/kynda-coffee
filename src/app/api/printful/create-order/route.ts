import { NextResponse } from "next/server";
import { createOrder, estimateShipping } from "@/lib/printful/client";
import type { PrintfulCreateOrderPayload } from "@/lib/printful/types";

export async function POST(req: Request) {
  try {
    const body: PrintfulCreateOrderPayload = await req.json();

    if (!body.recipient || !body.items?.length) {
      return NextResponse.json({ error: "Missing recipient or items" }, { status: 400 });
    }

    const shippingRates = await estimateShipping(body.recipient, body.items);

    const order = await createOrder({
      ...body,
      confirm: false,
    });

    return NextResponse.json({
      order: order.result,
      shippingRates: shippingRates.result,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Printful error" }, { status: 500 });
  }
}
