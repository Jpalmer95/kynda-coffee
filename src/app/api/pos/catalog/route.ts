import { NextRequest, NextResponse } from "next/server";
import { getPosCatalog, type PosCatalogChannel } from "@/lib/pos/catalog";

export const dynamic = "force-dynamic";

const CHANNELS = new Set<PosCatalogChannel>([
  "all",
  "menu",
  "qr",
  "pickup",
  "delivery",
  "shipping",
  "shop",
]);

function parseChannel(value: string | null): PosCatalogChannel {
  if (value && CHANNELS.has(value as PosCatalogChannel)) {
    return value as PosCatalogChannel;
  }
  return "menu";
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

function parseLimit(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  try {
    const catalog = await getPosCatalog({
      channel: parseChannel(searchParams.get("channel")),
      category: searchParams.get("category"),
      includeModifiers: parseBoolean(searchParams.get("includeModifiers"), true),
      limit: parseLimit(searchParams.get("limit")),
    });

    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Failed to load POS catalog", error);
    return NextResponse.json(
      {
        error: "Failed to load POS catalog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
