import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { matchPlayerIds, normalizeCategory, selectRecipients, type Subscriber } from "./recipients.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://padelstar.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, x-padelstar-admin-token",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) return false;
  try {
    const hostname = new URL(endpoint).hostname.toLowerCase();
    return [
      "fcm.googleapis.com",
      "updates.push.services.mozilla.com",
      "web.push.apple.com",
      "notify.windows.com",
      "wns.windows.com",
    ].some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return json({ error: "Push sender is not configured" }, 503);
  }

  let payload: { tournamentId?: string; title?: string; body?: string; tag?: string; category?: string; matchId?: string; playerIds?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (!payload.tournamentId || !payload.title || !payload.body) {
    return json({ error: "Invalid push request" }, 400);
  }

  const adminToken = request.headers.get("x-padelstar-admin-token");
  if (!adminToken || adminToken.length < 32) return json({ error: "Push authorization failed" }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: tournament } = await supabase.from("tournaments").select("id, state").eq("id", payload.tournamentId).eq("admin_token", adminToken).maybeSingle();
  if (!tournament) return json({ error: "Push authorization failed" }, 401);

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("id, player_id, subscription, prefs").eq("tournament_id", payload.tournamentId).limit(100);
  if (error) return json({ error: "Subscription lookup failed" }, 502);

  // Each player chose which messages they want (prefs on their subscription); the choice is enforced here, not in the app.
  // A match message goes only to the players of that match when they asked for "only my matches"; a message about a
  // teammate's withdrawal (playerIds, sent by the tournament's admin) goes only to those players.
  const category = normalizeCategory(payload.category);
  const targets = Array.isArray(payload.playerIds) ? payload.playerIds.filter((id): id is string => typeof id === "string").slice(0, 8) : null;
  // (a match that cannot be found gives an empty list: nobody who asked for "only mine" is bothered)
  const participants = payload.matchId ? matchPlayerIds((tournament as { state?: unknown }).state, payload.matchId) : null;
  const recipients = selectRecipients((subscriptions ?? []) as Subscriber[], { category, participants, targets });

  let sent = 0;
  let removed = 0;
  for (const row of recipients) {
    if (!isAllowedPushEndpoint((row.subscription as { endpoint?: unknown })?.endpoint)) {
      await supabase.from("push_subscriptions").delete().eq("id", row.id);
      removed += 1;
      continue;
    }
    try {
      await Promise.race([
        webpush.sendNotification(row.subscription, JSON.stringify({ title: payload.title.slice(0, 80), body: payload.body.slice(0, 160), tag: payload.tag?.slice(0, 80) })),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Push delivery timed out")), 8000)),
      ]);
      sent += 1;
    } catch (sendError) {
      const statusCode = Number((sendError as { statusCode?: number })?.statusCode);
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", row.id);
        removed += 1;
      }
    }
  }
  return json({ ok: true, sent, removed, skipped: (subscriptions ?? []).length - recipients.length });
});
