import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /.well-known/agent.json — agent-discovery manifest.
 *
 * Machine-readable description of Kynda Coffee's agent-native surfaces so any
 * AI agent (shopping assistant, personal agent, etc.) can discover how to
 * browse the menu, place pickup orders, order shipped goods, and check status
 * — without scraping the human UI.
 */
export async function GET(req: NextRequest) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  return NextResponse.json(
    {
      schema_version: "1.0",
      name: "Kynda Coffee",
      description:
        "Specialty coffee shop in Horseshoe Bay, TX. Fresh-roasted organic coffee beans, café drinks and food for local pickup, plus merch and coffee beans shipped anywhere in the US.",
      website: origin,
      location: {
        address: "Horseshoe Bay, TX",
        timezone: "America/Chicago",
        hours: "7:00am-5:00pm daily (Central)",
      },
      capabilities: {
        cafe_ordering: {
          description:
            "Place a café pickup order (drinks/food) on a customer's behalf. No API key required; orders are rate-limited per IP and validated against the live menu.",
          menu: { method: "GET", url: `${origin}/api/agent/menu` },
          place_order: {
            method: "POST",
            url: `${origin}/api/agent/orders`,
            content_type: "application/json",
            request_example: {
              customer: { name: "Jane Doe", email: "jane@example.com", phone: "+15125550100" },
              fulfillment: { mode: "pickup" },
              paymentPreference: "stripe",
              notes: "extra hot please",
              items: [
                {
                  providerItemId: "<from /api/agent/menu>",
                  providerVariationId: "<from /api/agent/menu>",
                  quantity: 1,
                  modifierIds: ["<optional, from /api/agent/menu>"],
                },
              ],
              agent: { name: "my-assistant", platform: "openai" },
            },
            payment_options: {
              stripe:
                "ALL agent orders are prepaid via Stripe. The response includes a pay_endpoint that returns a Stripe Checkout link to present to the customer. The order is only prepared once payment completes — pay-at-counter is not available for remote orders.",
            },
            constraints: {
              fulfillment_modes: ["pickup", "table", "parking", "lobby"],
              max_line_quantity: 20,
              customer_contact: "email or phone required",
            },
          },
          order_status: {
            method: "GET",
            url: `${origin}/api/agent/orders/{order_id}?email={customer_email}`,
            note: "Knowledge-based auth: must supply the email or phone the order was placed with.",
          },
        },
        shipped_commerce: {
          description:
            "Browse shippable products (fresh-roasted coffee beans, merch) and create a Stripe Checkout for shipping anywhere in the US. Stripe collects the shipping address.",
          products: {
            method: "GET",
            url: `${origin}/api/products?limit=100`,
            note: "Use the returned product id as product_id in checkout items.",
          },
          checkout: {
            method: "POST",
            url: `${origin}/api/checkout`,
            content_type: "application/json",
            request_example: {
              items: [{ product_id: "<from /api/products>", quantity: 1 }],
              customer_email: "jane@example.com",
              success_url: `${origin}/order/success?ok=1`,
              cancel_url: `${origin}/cart`,
            },
            response: "{ url } — present the Stripe Checkout url to the customer to complete payment + shipping address.",
          },
        },
      },
      policies: {
        rate_limits: "Menu: 30 req/min/IP. Order placement: 10 req/min/IP.",
        payment:
          "Agents never handle card data. All remote orders are PREPAID via Stripe-hosted checkout links presented to the human customer; cash/pay-at-counter exists only at the physical register.",
        pii: "Provide only the contact details needed for pickup/shipping. Data is used solely to fulfill the order.",
      },
      contact: { email: "hello@kyndacoffee.com" },
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
