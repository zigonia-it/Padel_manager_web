"use strict";

// Tournament invitations by email. The admin's app first records the invitation in the database (admin_invite_player); this
// function then sends the email through Resend. It trusts nothing from the browser:
//   * the admin token is checked by the database itself (admin_list_invitations needs it), and the invitation for exactly
//     this address must be pending there, so nobody can send arbitrary mail through this endpoint;
//   * the tournament name and invite code come from the database, not from the request;
//   * the email is plain text, every single-line field has line breaks stripped, and each tournament, each address and each
//     client is rate limited (best effort per server instance).
//
// Environment variables (Vercel):
//   RESEND_API_KEY     required   the same key the feedback form uses
//   INVITE_FROM        optional   sender, default "Padelstar <invitations@padelstar.app>" (padelstar.app is verified in Resend)
//   SUPABASE_URL / SUPABASE_ANON_KEY   optional   default to the public values of the app (supabase-config.js)

const DEFAULT_SUPABASE_URL = "https://sxzlljxodorkfrjnwfgr.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_Ius3igVjj6lBWF2tZUq1iw_TR3TiO5s";
const APP_URL = "https://padelstar.app";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE = /^[A-Z0-9]{4,8}$/;
const RATE = { windowMs: 60 * 60 * 1000, perClient: 30, perTournament: 40, perAddress: 3 };
const hits = new Map();

const CONTROL_CHARACTERS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const LINE_BREAKS = new RegExp("[\\r\\n" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]+", "g");
const singleLine = (value, max) => String(value ?? "").replace(CONTROL_CHARACTERS, "").replace(LINE_BREAKS, " ").trim().slice(0, max);
const isEmail = (value) => value.length <= 200 && /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/.test(value);

const TEXT = {
  nb: {
    subject: (name) => `Du er invitert til ${name} på Padelstar`,
    body: (name, link, code) => [
      `Hei!`,
      ``,
      `Du er invitert til turneringen «${name}» på Padelstar.`,
      ``,
      `Bli med her: ${link}`,
      `Invitasjonskode: ${code}`,
      ``,
      `Hvis du har en Padelstar-konto med denne e-postadressen, ser du invitasjonen også under «Profil» etter at du har logget inn.`,
      `Kjenner du ikke igjen invitasjonen, kan du se bort fra denne e-posten.`,
    ],
  },
  en: {
    subject: (name) => `You are invited to ${name} on Padelstar`,
    body: (name, link, code) => [
      `Hi!`,
      ``,
      `You have been invited to the tournament "${name}" on Padelstar.`,
      ``,
      `Join here: ${link}`,
      `Invite code: ${code}`,
      ``,
      `If you have a Padelstar account with this email address, you will also see the invitation under "Profile" after signing in.`,
      `If you do not recognise the invitation, you can ignore this email.`,
    ],
  },
};

function clientKey(request) {
  const forwarded = String(request.headers?.["x-forwarded-for"] ?? "").split(",")[0].trim();
  return forwarded || request.socket?.remoteAddress || "unknown";
}

function limited(key, max, now) {
  const times = (hits.get(key) ?? []).filter((time) => now - time < RATE.windowMs);
  if (times.length >= max) { hits.set(key, times); return true; }
  hits.set(key, [...times, now]);
  return false;
}

function reply(response, status, payload) {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(payload);
}

function readBody(request) {
  const body = request.body;
  if (body && typeof body === "object") return body;
  if (typeof body === "string") { try { return JSON.parse(body); } catch { return null; } }
  return null;
}

async function rpc(name, payload, { url, key, signal }) {
  const result = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!result.ok) return { ok: false, status: result.status };
  return { ok: true, data: await result.json() };
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return reply(response, 405, { ok: false, error: "method" });
  }
  const body = readBody(request);
  if (!body) return reply(response, 400, { ok: false, error: "invalid" });

  const tournamentId = String(body.tournamentId ?? "");
  const adminToken = String(body.adminToken ?? "");
  const inviteCode = String(body.inviteCode ?? "").trim().toUpperCase();
  const email = singleLine(body.email, 200).toLowerCase();
  const language = body.language === "en" ? "en" : "nb";
  if (!UUID.test(tournamentId) || !UUID.test(adminToken) || !CODE.test(inviteCode) || !isEmail(email)) {
    return reply(response, 400, { ok: false, error: "invalid" });
  }

  const apiKey = String(process.env.RESEND_API_KEY ?? "").trim().replace(/^(["'])(.*)\1$/s, "$2").trim();
  if (!apiKey) return reply(response, 503, { ok: false, error: "notConfigured", missing: ["RESEND_API_KEY"] });

  const now = Date.now();
  if (limited(`c:${clientKey(request)}`, RATE.perClient, now) || limited(`t:${tournamentId}`, RATE.perTournament, now)
    || limited(`a:${tournamentId}:${email}`, RATE.perAddress, now)) {
    return reply(response, 429, { ok: false, error: "rateLimited" });
  }

  const supabase = { url: process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL, key: process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const listed = await rpc("admin_list_invitations", { p_tournament_id: tournamentId, p_admin_token: adminToken }, { ...supabase, signal: controller.signal });
    if (!listed.ok) return reply(response, 403, { ok: false, error: "forbidden" });
    const invitation = (listed.data?.invitations ?? []).find((item) => String(item.email).toLowerCase() === email);
    if (!invitation || invitation.status !== "pending") return reply(response, 409, { ok: false, error: "notPending" });

    const found = await rpc("get_tournament_by_code", { p_invite_code: inviteCode }, { ...supabase, signal: controller.signal });
    if (!found.ok || found.data?.id !== tournamentId) return reply(response, 409, { ok: false, error: "mismatch" });
    const name = singleLine(found.data?.name, 80) || "Padelstar";

    const text = TEXT[language];
    const link = `${APP_URL}/?join=${encodeURIComponent(inviteCode)}`;
    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: singleLine(process.env.INVITE_FROM, 200) || "Padelstar <invitations@padelstar.app>",
        to: [email],
        subject: text.subject(name),
        text: text.body(name, link, inviteCode).join("\n"),
      }),
      signal: controller.signal,
    });
    if (!sent.ok) {
      let providerError;
      try { const detail = await sent.json(); if (typeof detail?.name === "string" && /^[a-z_]{3,40}$/.test(detail.name)) providerError = detail.name; } catch { /* no readable body */ }
      return reply(response, 502, { ok: false, error: "provider", providerStatus: Number(sent.status) || undefined, ...(providerError ? { providerError } : {}) });
    }
    return reply(response, 200, { ok: true });
  } catch {
    return reply(response, 502, { ok: false, error: "provider" });
  } finally {
    clearTimeout(timer);
  }
};

module.exports._resetRateLimit = () => hits.clear();
