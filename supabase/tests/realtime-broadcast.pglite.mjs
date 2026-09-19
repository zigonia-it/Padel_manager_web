// Database test for 20260919200000_realtime_revision_broadcast.sql (Realtime is stubbed: realtime.send records its calls).
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/realtime-broadcast.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const pg = new PGlite();
await pg.exec(`
create role anon; create role authenticated;
create schema realtime;
create table public.sent(id serial primary key, payload jsonb, event text, topic text, private boolean);
create table public.flags(fail boolean);
insert into public.flags values (false);
create function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language plpgsql as $$
begin
  if (select fail from public.flags) then raise exception 'realtime is down'; end if;
  insert into public.sent(payload, event, topic, private) values (payload, event, topic, private);
end $$;
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb, revision int default 0);
`);
await pg.exec(fs.readFileSync(new URL('../migrations/20260919200000_realtime_revision_broadcast.sql', import.meta.url).pathname, 'utf8'));

const ID = '00000000-0000-4000-8000-000000000001';
await pg.query(`insert into public.tournaments values ($1,'SECRETCODE','secret-admin-token','{"adminToken":"x","name":"t"}'::jsonb,1)`, [ID]);
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const sent = async () => (await pg.query(`select * from public.sent order by id`)).rows;

await pg.query(`update public.tournaments set revision = 2 where id = $1`, [ID]);
let rows = await sent();
ok('a revision change sends one broadcast', rows.length === 1, JSON.stringify(rows));
ok('it goes to the tournament\'s own channel', rows[0]?.topic === `tournament:${ID}` && rows[0]?.event === 'revision');
ok('it is a public channel message', rows[0]?.private === false);
ok('the payload is only the revision number', JSON.stringify(rows[0]?.payload) === '{"revision": 2}' || JSON.stringify(rows[0]?.payload) === '{"revision":2}', JSON.stringify(rows[0]?.payload));
ok('no state, invite code or token leaks into the message', !/SECRET|secret|adminToken|state/.test(JSON.stringify(rows[0])));

await pg.query(`update public.tournaments set state = jsonb_set(state, '{name}', '"other"') where id = $1`, [ID]);
ok('an update without a revision change sends nothing', (await sent()).length === 1);

await pg.query(`update public.tournaments set revision = 3 where id = $1`, [ID]);
ok('every new revision is announced', (await sent()).length === 2);

await pg.query(`update public.flags set fail = true`);
const r = await pg.query(`update public.tournaments set revision = 4 where id = $1`, [ID]).then(() => ({}), (e) => ({ error: e.message }));
ok('a broken broadcast never fails the update', !r.error && (await pg.query(`select revision from public.tournaments where id = $1`, [ID])).rows[0].revision === 4, r.error);
const priv = (await pg.query(`select has_function_privilege('anon', 'public.notify_tournament_revision()', 'execute') as a, has_function_privilege('authenticated', 'public.notify_tournament_revision()', 'execute') as b`)).rows[0];
ok('the trigger function is not callable through the API', priv.a === false && priv.b === false);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
