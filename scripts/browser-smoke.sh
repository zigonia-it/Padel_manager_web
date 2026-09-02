#!/usr/bin/env bash
set -euo pipefail

PORT="${PADELSTAR_SMOKE_PORT:-8080}"
URL="http://127.0.0.1:${PORT}"
SESSION="padelstar-smoke-$$"

python3 -m http.server "$PORT" >/tmp/padelstar-browser-smoke.log 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

if [[ -n "${PLAYWRIGHT_CLI:-}" ]]; then
  read -r -a PWCLI <<< "$PLAYWRIGHT_CLI"
else
  PWCLI=(npx --yes --package @playwright/cli playwright-cli)
fi

run_pw() {
  "${PWCLI[@]}" --session "$SESSION" "$@"
}

run_pw open "about:blank"
if [[ "${PADELSTAR_SMOKE_VIEWPORT:-desktop}" == "mobile" ]]; then
  run_pw resize 390 844
elif [[ "${PADELSTAR_SMOKE_VIEWPORT:-desktop}" == "medium" ]]; then
  run_pw resize 768 900
else
  run_pw resize 1440 1000
fi
run_pw run-code "async (page) => { const offlineResponse = { status: 204, body: '' }; await page.route('**://cdn.jsdelivr.net/**', route => route.fulfill(offlineResponse)); await page.route('**://*.supabase.co/**', route => route.fulfill(offlineResponse)); await page.route('**/_vercel/insights/script.js', route => route.fulfill(offlineResponse)); await page.goto('$URL'); }"
run_pw run-code "async (page) => { const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); if (overflow) throw new Error('horizontal overflow detected'); }"
if [[ "${PADELSTAR_SMOKE_VIEWPORT:-desktop}" == "desktop" ]]; then
  run_pw run-code "async (page) => { await page.getByRole('button', { name: 'Opprett' }).last().click(); const widths = await page.evaluate(() => ({ panel: document.querySelector('.setup-panel:not(.hidden)')?.getBoundingClientRect().width, card: document.querySelector('#createTournamentForm')?.getBoundingClientRect().width })); if (!widths.panel || !widths.card || Math.abs(widths.panel - widths.card) > 1) throw new Error('setup page width is inconsistent'); await page.getByRole('textbox', { name: 'Turneringsnavn' }).fill('Browser smoke'); await page.getByRole('textbox', { name: 'Spillere, valgfritt' }).fill('Ada\nBo'); await page.getByRole('button', { name: 'Opprett turnering' }).click(); await page.getByRole('button', { name: 'Start turnering' }).click(); }"
else
  run_pw run-code "async (page) => { await page.getByRole('button', { name: 'Opprett' }).last().click(); await page.getByRole('textbox', { name: 'Turneringsnavn' }).fill('Browser smoke'); await page.getByRole('textbox', { name: 'Spillere, valgfritt' }).fill('Ada\nBo'); await page.getByRole('button', { name: 'Opprett turnering' }).click(); await page.getByRole('button', { name: 'Start turnering' }).click(); }"
fi
if [[ "${PADELSTAR_SMOKE_VIEWPORT:-desktop}" != "desktop" ]]; then
  run_pw run-code "async (page) => { const toggle = page.locator('#appMenuToggle'); if (await toggle.isVisible()) await toggle.click(); }"
fi
run_pw run-code "async (page) => { await page.getByRole('button', { name: 'Admin', exact: true }).click(); await page.getByRole('tab', { name: 'Kamper' }).click(); await page.getByRole('heading', { name: 'Kamper og historikk' }).waitFor(); }"
run_pw close
