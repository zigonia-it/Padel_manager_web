"use strict";

// Beta feedback: the app posts here, the message is emailed to the developer through Resend (https://resend.com).
//
// Environment variables (Vercel -> Project -> Settings -> Environment Variables):
//   RESEND_API_KEY      required   API key from Resend
//   FEEDBACK_TO_EMAIL   required   where the feedback is delivered (your own address)
//   FEEDBACK_FROM       optional   sender, default "Padelstar Feedback <onboarding@resend.dev>"
//                                  (with the free onboarding sender Resend only delivers to the address you signed up with)
//
// No secret ever reaches the browser. The email is plain text (nothing from the user is rendered as HTML), single-line
// fields are stripped of line breaks (no header injection), a hidden honeypot field silently drops most bots, and each
// client address is limited to a few messages per window (best effort per server instance).

const CATEGORIES = { bug: "Bug", idea: "Idea", question: "Question", other: "Other" };
const MIN_MESSAGE = 5;
const MAX_MESSAGE = 2000;
const RATE = { windowMs: 10 * 60 * 1000, max: 5 };
const hits = new Map();

// Control characters except tab, line feed and carriage return.
const CONTROL_CHARACTERS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const LINE_BREAKS = new RegExp("[\\r\\n" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]+", "g");

function clean(value, max) {
  return String(value ?? "").replace(CONTROL_CHARACTERS, "").trim().slice(0, max);
}

function singleLine(value, max) {
  return clean(value, max).replace(LINE_BREAKS, " ");
}

function isEmail(value) {
  return value.length <= 200 && /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[^\s@<>"',;:]{2,}$/.test(value);
}

function clientKey(request) {
  const forwarded = String(request.headers?.["x-forwarded-for"] ?? "").split(",")[0].trim();
  return forwarded || request.socket?.remoteAddress || "unknown";
}

function rateLimited(key, now) {
  for (const [id, times] of hits) {
    const fresh = times.filter((time) => now - time < RATE.windowMs);
    if (fresh.length) hits.set(id, fresh); else hits.delete(id);
  }
  const times = hits.get(key) ?? [];
  if (times.length >= RATE.max) return true;
  hits.set(key, [...times, now]);
  return false;
}

function readBody(request) {
  const body = request.body;
  if (body && typeof body === "object") return body;
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch { return null; }
  }
  return null;
}

function reply(response, status, payload) {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(payload);
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return reply(response, 405, { ok: false, error: "method" });
  }
  const body = readBody(request);
  if (!body) return reply(response, 400, { ok: false, error: "invalid" });

  // Honeypot: real users never see or fill this field. Pretend it worked.
  if (clean(body.website, 200)) return reply(response, 200, { ok: true });

  const category = Object.prototype.hasOwnProperty.call(CATEGORIES, body.category) ? body.category : null;
  const message = clean(body.message, MAX_MESSAGE + 1);
  const email = singleLine(body.email, 200);
  if (!category || message.length < MIN_MESSAGE || message.length > MAX_MESSAGE || (email && !isEmail(email))) {
    return reply(response, 400, { ok: false, error: "invalid" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_TO_EMAIL;
  if (!apiKey || !to) {
    // Names only, never values: tells the developer which Vercel variable the running deployment cannot see.
    const missing = [!apiKey && "RESEND_API_KEY", !to && "FEEDBACK_TO_EMAIL"].filter(Boolean);
    return reply(response, 503, { ok: false, error: "notConfigured", missing });
  }

  if (rateLimited(clientKey(request), Date.now())) return reply(response, 429, { ok: false, error: "rateLimited" });

  const context = body.context && typeof body.context === "object" ? body.context : {};
  const version = singleLine(context.version, 20) || "?";
  const lines = [
    `Category: ${CATEGORIES[category]}`,
    `Reply-to: ${email || "(not given)"}`,
    "",
    message,
    "",
    "--",
    `App version: ${version}`,
    `Language: ${singleLine(context.language, 10) || "?"}`,
    `View: ${singleLine(context.view, 40) || "?"}`,
    `Role: ${singleLine(context.role, 20) || "?"}`,
    `Screen: ${singleLine(context.screen, 30) || "?"}`,
    `Browser: ${singleLine(context.userAgent, 300) || "?"}`,
    `Sent: ${new Date().toISOString()}`,
  ];
  const subject = `[Padelstar ${version}] ${CATEGORIES[category]}: ${singleLine(message, 60)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.FEEDBACK_FROM || "Padelstar Feedback <onboarding@resend.dev>",
        to: [to],
        subject,
        text: lines.join("\n"),
        ...(email ? { reply_to: email } : {}),
      }),
      signal: controller.signal,
    });
    if (!result.ok) {
      // Only the HTTP status and Resend's short error name (for example "invalid_api_key" or "validation_error") are passed on,
      // so a wrong key or an unverified sender can be told apart without leaking a key, an address or Resend's message text.
      let providerError;
      try { const name = (await result.json())?.name; if (typeof name === "string" && /^[a-z_]{3,40}$/.test(name)) providerError = name; } catch { /* no readable body */ }
      return reply(response, 502, { ok: false, error: "provider", providerStatus: Number(result.status) || undefined, ...(providerError ? { providerError } : {}) });
    }
    return reply(response, 200, { ok: true });
  } catch {
    return reply(response, 502, { ok: false, error: "provider" });
  } finally {
    clearTimeout(timer);
  }
};

module.exports._resetRateLimit = () => hits.clear();
