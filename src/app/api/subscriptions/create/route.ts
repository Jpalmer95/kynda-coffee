import { NextRequest, NextResponse } from "next/server";
import { stripe, STORE_CONFIG } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const createSubscriptionSchema = z.object({
  product_id: z.string().uuid(),
  customer_email: z.string().email(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  grind: z.string().optional(),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});