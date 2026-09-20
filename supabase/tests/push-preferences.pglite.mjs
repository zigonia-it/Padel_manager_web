// Database tests for migration 20260920230000_push_preferences.sql (on top of 20260828130000_push_subscriptions.sql).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/push-preferences.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
await pg.exec(`
create role anon; create role authenticated;
create schema extensions;
create function extensions.digest(t text, alg text) returns bytea language sql immutable as $$ select decode(md5(t),'hex') $$;
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb, revision int default 0);
create table public.player_sessions(tournament_id uuid, player_id uuid, token_hash text);
`);
await pg.exec(fs.readFileSync(dir + '20260828130000_push_subscriptions.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260920230000_push_preferences.sql', 'utf8'));

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const T = uuid(1), P1 = uuid(11), P2 = uuid(12);
const TOK1 = 'a'.repeat(40), TOK2 = 'b'.repeat(40);
const EP1 = 'https://fcm.googleapis.com/fcm/send/one-' + 'x'.repeat(20);
const EP2 = 'https://fcm.googleapis.com/fcm/send/two-' + 'x'.repeat(20);
await pg.exec(`
insert into public.tournaments(id, invite_code, admin_token) values ('${T}', 'ABCD2345', 'admin');
insert into public.player_sessions values ('${T}', '${P1}', encode(extensions.digest('${TOK1}', 'sha256'), 'hex')), ('${T}', '${P2}', encode(extensions.digest('${TOK2}', 'sha256'), 'hex'));
insert into public.push_subscriptions(tournament_id, player_id, endpoint, subscription) values
  ('${T}', '${P1}', '${EP1}', '{"endpoint":"${EP1}","keys":{}}'),
  ('${T}', '${P2}', '${EP2}', '{"endpoint":"${EP2}","keys":{}}');
`);

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const call = async (args) => { try { const r = await pg.query(`select public.set_push_preferences($1,$2,$3,$4,$5::jsonb) as r`, args); return { data: r.rows[0].r }; } catch (e) { return { error: e.message }; } };
const prefs = async (endpoint) => (await pg.query(`select prefs from public.push_subscriptions where endpoint = $1`, [endpoint])).rows[0].prefs;

console.log('a new subscription has no choices (every default applies)');
ok('the column exists with an empty default', JSON.stringify(await prefs(EP1)) === '{}');

console.log('a player saves their choices');
let r = await call([T, P1, TOK1, EP1, JSON.stringify({ match: true, result: false, onlyMine: true })]);
ok('the update is accepted', r.data === true, r.error);
ok('exactly the given choices are stored', JSON.stringify(await prefs(EP1)) === JSON.stringify({ match: true, result: false, onlyMine: true }), JSON.stringify(await prefs(EP1)));
ok("another player's subscription is untouched", JSON.stringify(await prefs(EP2)) === '{}');
r = await call([T, P1, TOK1, EP1, JSON.stringify({ withdrawal: false })]);
ok('a new save replaces the old one', JSON.stringify(await prefs(EP1)) === JSON.stringify({ withdrawal: false }));

console.log('nothing else can be stored');
r = await call([T, P1, TOK1, EP1, JSON.stringify({ match: 'yes', result: 1, withdrawal: null, onlyMine: false, admin: true, x: { y: 1 } })]);
ok('unknown keys and non-booleans are dropped', r.data === true && JSON.stringify(await prefs(EP1)) === JSON.stringify({ onlyMine: false }), JSON.stringify(await prefs(EP1)));
ok('an array is not accepted', (await call([T, P1, TOK1, EP1, '[]'])).error?.includes('Invalid push preferences'));
ok('a missing endpoint is not accepted', (await call([T, P1, TOK1, '', '{}'])).error?.includes('Invalid push preferences'));

console.log('only the player themselves');
r = await call([T, P1, TOK2, EP1, JSON.stringify({ match: false })]);
ok("another player's token is refused", r.error?.includes('Player session mismatch'), r.error);
r = await call([T, P2, TOK2, EP1, JSON.stringify({ match: false })]);
ok("a player cannot change a subscription that is not theirs (nothing updated)", r.data === false && JSON.stringify(await prefs(EP1)) === JSON.stringify({ onlyMine: false }), r.error);
r = await call([T, P1, 'short', EP1, '{}']);
ok('a short token is refused', r.error?.includes('Invalid push preferences'));
r = await call([uuid(99), P1, TOK1, EP1, '{}']);
ok('another tournament is refused', r.error?.includes('Player session mismatch'));

console.log('permissions');
const g = (await pg.query(`select has_function_privilege('anon', 'public.set_push_preferences(uuid,uuid,text,text,jsonb)', 'execute') a, has_function_privilege('authenticated', 'public.set_push_preferences(uuid,uuid,text,text,jsonb)', 'execute') b`)).rows[0];
ok('guests and signed-in players can call it (the token is the credential)', g.a === true && g.b === true);
const d = (await pg.query(`select has_function_privilege('anon', 'public.delete_push_subscription(uuid,uuid,text,text)', 'execute') a, has_function_privilege('authenticated', 'public.delete_push_subscription(uuid,uuid,text,text)', 'execute') b`)).rows[0];
ok('a signed-in player can now also switch push off (delete_push_subscription)', d.a === true && d.b === true);
const cols = (await pg.query(`select has_column_privilege('anon', 'public.push_subscriptions', 'prefs', 'select') a, has_column_privilege('authenticated', 'public.push_subscriptions', 'prefs', 'select') b`)).rows[0];
ok('the table stays closed to the API roles', !cols.a && !cols.b);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
