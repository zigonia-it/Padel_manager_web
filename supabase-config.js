window.PADELSTAR_SUPABASE = {
  url: "https://sxzlljxodorkfrjnwfgr.supabase.co",
  anonKey: "sb_publishable_Ius3igVjj6lBWF2tZUq1iw_TR3TiO5s",
  // Set this to the public VAPID key when the trusted push sender is enabled.
  // Cloudflare Turnstile SITE key (public). Empty = no "I'm not a robot" check. Set it together with the Turnstile secret in
  // Supabase (Authentication -> Attack Protection); see docs/technical/captcha-setup.md.
  captchaSiteKey: "0x4AAAAAAE95nXNYwBuQodlm",
  vapidPublicKey: "fzYP2O7OwsSyJHx5LbQLMUT_UAsolUCWKkzN2mlAsLk",
};

window.PADEL_MANAGER_SUPABASE = window.PADELSTAR_SUPABASE;
