import { NextRequest, NextResponse } from "next/server";
import { requireTier } from "@/lib/auth/team";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const DEFAULT_CHANNELS = [
  { name: "general", description: "General team chat", icon: "💬", sort_order: 0 },
  { name: "kitchen", description: "Kitchen / KDS", icon: "🍳", sort_order: 1 },
  { name: "front-of-house", description: "Front counter & barista", icon: "☕", sort_order: 2 },
  { name: "management", description: "Owners & managers", icon: "📋", sort_order: 3 },
];

/**
 * GET /api/admin/chat
 *   - ?channel=<id> → messages for a channel (last 100)
 *   - (no params) → channel list with unread counts
 */
export async function GET(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get("channel");

  try {
    if (channelId) {
      // Fetch messages for a channel
      const { data: messages, error } = await supabaseAdmin()
        .from("chat_messages")
        .select("id, channel_id, user_id, body, image_url, pinned, created_at")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch user profiles for the messages
      const userIds = [...new Set((messages ?? []).map((m: any) => m.user_id))];
      let profilesMap: Record<string, { name: string; role: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabaseAdmin()
          .from("profiles")
          .select("id, full_name, role")
          .in("id", userIds);
        for (const p of profiles ?? []) {
          profilesMap[p.id] = { name: p.full_name || "Team Member", role: p.role || "staff" };
        }
      }

      // Update last_read_at for the current user
      await supabaseAdmin()
        .from("chat_channel_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("channel_id", channelId)
        .eq("user_id", team.user.id);

      return NextResponse.json({
        messages: (messages ?? []).map((m: any) => ({
          ...m,
          authorName: profilesMap[m.user_id]?.name ?? "Team Member",
          authorRole: profilesMap[m.user_id]?.role ?? "staff",
        })),
      });
    }

    // Channel list — ensure default channels exist, then return all
    await ensureDefaultChannels(team.user.id);

    const { data: channels, error } = await supabaseAdmin()
      .from("chat_channels")
      .select("id, name, description, icon, type, sort_order, created_at")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    // Ensure current user is a member of all channels
    for (const ch of channels ?? []) {
      await supabaseAdmin()
        .from("chat_channel_members")
        .upsert({ channel_id: ch.id, user_id: team.user.id }, { onConflict: "channel_id,user_id" });
    }

    // Get unread counts (messages after last_read_at)
    const channelIds = (channels ?? []).map((c: any) => c.id);
    let unreadMap: Record<string, number> = {};

    if (channelIds.length > 0) {
      const { data: memberships } = await supabaseAdmin()
        .from("chat_channel_members")
        .select("channel_id, last_read_at")
        .eq("user_id", team.user.id);

      for (const m of memberships ?? []) {
        const { count } = await supabaseAdmin()
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", m.channel_id)
          .gt("created_at", m.last_read_at ?? new Date(0).toISOString());
        unreadMap[m.channel_id] = count ?? 0;
      }
    }

    return NextResponse.json({
      channels: (channels ?? []).map((c: any) => ({
        ...c,
        unread_count: unreadMap[c.id] ?? 0,
      })),
    });
  } catch (error) {
    console.error("Chat GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch chat data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/chat
 * Body: { channel_id, body?, image_url? } → send message
 * Body: { action: "create_channel", name, description?, icon? } → create channel (manager+)
 * Body: { action: "pin", message_id, pinned } → pin/unpin (manager+)
 */
export async function POST(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (body.action === "create_channel") {
      const minTeam = await requireTier(req, "manager");
      if (!minTeam) return NextResponse.json({ error: "Manager+ required" }, { status: 403 });

      const name = (body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Channel name required" }, { status: 400 });

      const { data, error } = await supabaseAdmin()
        .from("chat_channels")
        .insert({
          name,
          description: body.description ?? null,
          icon: body.icon ?? "💬",
          type: "channel",
          created_by: team.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as member
      await supabaseAdmin()
        .from("chat_channel_members")
        .insert({ channel_id: data.id, user_id: team.user.id });

      return NextResponse.json({ channel: data });
    }

    if (body.action === "pin") {
      const minTeam = await requireTier(req, "manager");
      if (!minTeam) return NextResponse.json({ error: "Manager+ required" }, { status: 403 });

      const { data, error } = await supabaseAdmin()
        .from("chat_messages")
        .update({ pinned: !!body.pinned })
        .eq("id", body.message_id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ message: data });
    }

    // Send message
    const channelId = body.channel_id;
    const text = (body.body ?? "").trim();
    const imageUrl = body.image_url;

    if (!channelId) return NextResponse.json({ error: "channel_id required" }, { status: 400 });
    if (!text && !imageUrl) return NextResponse.json({ error: "body or image_url required" }, { status: 400 });

    const { data, error } = await supabaseAdmin()
      .from("chat_messages")
      .insert({
        channel_id: channelId,
        user_id: team.user.id,
        body: text || null,
        image_url: imageUrl || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error("Chat POST error", error);
    return NextResponse.json(
      { error: "Failed to send message", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/chat?id=<message_id> → delete message (own or manager+)
 */
export async function DELETE(req: NextRequest) {
  const team = await requireTier(req, "staff");
  if (!team) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("id");

  if (!messageId) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Check ownership or manager+
  const { data: msg } = await supabaseAdmin()
    .from("chat_messages")
    .select("user_id")
    .eq("id", messageId)
    .maybeSingle();

  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const isOwner = msg.user_id === team.user.id;
  const isManager = (await requireTier(req, "manager")) !== null;

  if (!isOwner && !isManager) {
    return NextResponse.json({ error: "Can only delete your own messages" }, { status: 403 });
  }

  const { error } = await supabaseAdmin()
    .from("chat_messages")
    .delete()
    .eq("id", messageId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

async function ensureDefaultChannels(userId: string) {
  const { data: existing } = await supabaseAdmin()
    .from("chat_channels")
    .select("id")
    .limit(1);

  if (existing && existing.length > 0) return;

  // Seed default channels
  for (const ch of DEFAULT_CHANNELS) {
    const { data } = await supabaseAdmin()
      .from("chat_channels")
      .insert({ ...ch, type: "channel", created_by: userId })
      .select()
      .single();

    if (data) {
      await supabaseAdmin()
        .from("chat_channel_members")
        .insert({ channel_id: data.id, user_id: userId });
    }
  }
}
