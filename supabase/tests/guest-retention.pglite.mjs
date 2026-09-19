// Database tests for guest retention: 20260919090500_cleanup_stale_guest_tournaments.sql and
// 20260919170000_guest_finish_retention.sql, run against copies of the live guard triggers.
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/guest-retention.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';

const dir = new URL('../migrations/', import.meta.url).pathname;
const pg = new PGlite();
await pg.exec(`
create role anon; create role authenticated;
create schema extensions;
create function extensions.digest(t text, alg text) returns bytea language sql immutable as $$ select decode(md5(t),'hex') $$;
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb, created_at timestamptz default now(),
  updated_at timestamptz default now(), revision int default 0, owner_user_id uuid, claimed_at timestamptz, ended_at timestamptz,
  retention_expires_at timestamptz, owner_profile_id text);
create table public.tournament_finalization_receipts(tournament_id uuid primary key, admin_token_hash text not null,
  outcome text not null check (outcome in ('completed','cancelled')), revision int not null, deleted boolean not null, finalized_at timestamptz not null);
create table public.tournament_account_players(tournament_id uuid not null references public.tournaments(id) on delete cascade, player_id uuid not null, user_id uuid not null);
create table public.account_tournament_statistics(user_id uuid, tournament_id uuid, finalized_at timestamptz, outcome text, matches int, wins int, sets int, games int);
create table public.player_profiles(id uuid primary key, deletion_scheduled_for timestamptz, deletion_requested_at timestamptz);
create function public.cleanup_expired_player_profiles(p_retention_days integer default 30) returns integer language sql as $$ select 0 $$;
-- copies of the live guard triggers
create function public.guard_tournament_finalization_update() returns trigger language plpgsql as $$
begin
  if old.state->>'status' = 'Avsluttet' and new.state is distinct from old.state then raise exception 'Finalized tournament is read-only'; end if;
  if new.state->>'status' = 'Avsluttet' and old.state->>'status' is distinct from 'Avsluttet'
    and not exists(select 1 from public.tournament_finalization_receipts where tournament_id = old.id) then
    raise exception 'Use finalize_tournament to save statistics before completion'; end if;
  return new; end $$;
create function public.guard_tournament_history_deletion() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.tournament_finalization_receipts where tournament_id = old.id) then raise exception 'Finalize tournament statistics before deletion'; end if;
  return old; end $$;
create function public.set_tournament_lifecycle_dates() returns trigger language plpgsql as $$
begin
  if coalesce(old.state->>'status', '') <> 'Avsluttet' and coalesce(new.state->>'status', '') = 'Avsluttet' then
    new.ended_at = coalesce(new.ended_at, now());
    if new.owner_user_id is null then new.retention_expires_at = coalesce(new.retention_expires_at, new.ended_at + interval '30 days'); end if;
  end if; return new; end $$;
create function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger tournament_finalization_before_update before update on public.tournaments for each row execute function public.guard_tournament_finalization_update();
create trigger tournament_history_before_delete before delete on public.tournaments for each row execute function public.guard_tournament_history_deletion();
create trigger tournaments_lifecycle_dates before update on public.tournaments for each row execute function public.set_tournament_lifecycle_dates();
create trigger tournaments_touch_updated_at before update on public.tournaments for each row execute function public.touch_updated_at();
`);
await pg.exec(fs.readFileSync(dir + '20260919090500_cleanup_stale_guest_tournaments.sql', 'utf8'));
await pg.exec(fs.readFileSync(dir + '20260919170000_guest_finish_retention.sql', 'utf8'));

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TOKEN = 'admintoken-1234567890';
let seq = 0;
async function tournament({ owner = null, unfinished = false, finishedMatch = true } = {}) {
  seq += 1;
  const id = uuid(3000 + seq);
  const match = (mid, state, winner) => ({ id: mid, state, winnerTeamIndex: winner,
    teamOne: { players: [{ id: uuid(101), name: 'A' }, { id: uuid(102), name: 'B' }] }, teamTwo: { players: [{ id: uuid(103), name: 'C' }, { id: uuid(104), name: 'D' }] },
    completedSets: state === 'finished' ? [{ teamOne: 6, teamTwo: 3 }] : [] });
  const state = { status: 'Runde pågår', adminToken: 'x', settings: {}, revision: 1,
    rounds: [{ id: 'r1', status: 'active', matches: [match(uuid(11), finishedMatch ? 'finished' : 'playing', finishedMatch ? 0 : null), match(uuid(12), 'waiting', null)] }] };
  await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision,owner_user_id) values ($1,$2,$3,$4::jsonb,1,$5)`,
    [id, 'CODE' + String(seq).padStart(4, '0'), TOKEN, JSON.stringify(state), owner]);
  return id;
}
const row = async (id) => (await pg.query(`select * from public.tournaments where id = $1`, [id])).rows[0];
const call = async (fn, args) => { try { const r = await pg.query(`select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as r`, args); return { data: r.rows[0].r }; } catch (e) { return { error: e.message }; } };
const finalize = (id, outcome = 'completed', token = TOKEN, revision = 1) => call('finalize_tournament', [id, token, revision, outcome]);
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };

console.log('finishing a guest tournament');
let id = await tournament();
let r = await finalize(id);
ok('the guest tournament is kept, not deleted', !r.error && r.data.deleted === false && (await row(id)) !== undefined, r.error);
ok('the response carries the final state without secrets', r.data.state.status === 'Avsluttet' && !('adminToken' in r.data.state) && r.data.statisticsSaved === true);
let t = await row(id);
ok('it is marked finished and expires in 24 hours', t.state.status === 'Avsluttet' && Math.abs(new Date(t.retention_expires_at) - Date.now() - 24 * 3600 * 1000) < 60000, String(t.retention_expires_at));
ok('unplayed matches were cancelled, finished ones kept', t.state.rounds[0].matches[0].state === 'finished' && t.state.rounds[0].matches[1].state === 'cancelled');
ok('a finalization receipt exists and says it was not deleted', (await pg.query(`select deleted from public.tournament_finalization_receipts where tournament_id = $1`, [id])).rows[0]?.deleted === false);
r = await pg.query(`update public.tournaments set state = jsonb_set(state, '{name}', '"changed"') where id = $1`, [id]).then(() => ({}), (e) => ({ error: e.message }));
ok('the finished tournament is read-only', r.error?.includes('read-only'), r.error);
const again = await finalize(id);
ok('finalizing again returns the same result (idempotent)', !again.error && again.data.deleted === false && again.data.revision === 2, again.error);
r = await finalize(id, 'completed', 'wrongtoken-1234567890');
ok('a retry with the wrong token is refused', r.error?.includes('Admin token mismatch'), r.error);

console.log('cancelled and validation');
id = await tournament({ finishedMatch: false });
r = await finalize(id, 'cancelled');
ok('a cancelled guest tournament is also kept for 24 hours', !r.error && r.data.outcome === 'cancelled' && (await row(id)).retention_expires_at !== null, r.error);
id = await tournament();
r = await finalize(id, 'completed', TOKEN, 9);
ok('a stale revision is refused', r.error?.includes('changed'), r.error);
r = await finalize(id, 'exploded');
ok('an unknown outcome is refused', r.error?.includes('Invalid finalization payload'), r.error);

console.log('account statistics are saved in the same transaction');
id = await tournament();
await pg.query(`insert into public.tournament_account_players values ($1,$2,$3)`, [id, uuid(101), uuid(900)]);
r = await finalize(id);
const stats = (await pg.query(`select * from public.account_tournament_statistics where tournament_id = $1`, [id])).rows[0];
ok('the linked player got matches, wins, sets and games', !r.error && stats && stats.matches === 1 && stats.wins === 1 && stats.sets === 1 && stats.games === 6, JSON.stringify(stats) + r.error);

console.log('account-owned tournaments are unchanged');
id = await tournament({ owner: uuid(900) });
r = await finalize(id);
t = await row(id);
ok('kept without any expiry', !r.error && r.data.deleted === false && t.retention_expires_at === null);

console.log('cleanup after 24 hours');
const guestDone = await tournament(); await finalize(guestDone);
const ownerDone = id;
let n = (await call('cleanup_expired_tournaments', [])).data;
ok('nothing is deleted before the 24 hours have passed', n === 0 && (await row(guestDone)) !== undefined);
await pg.query(`update public.tournaments set retention_expires_at = now() - interval '1 minute' where id = $1`, [guestDone]);
n = (await call('cleanup_expired_tournaments', [])).data;
ok('after 24 hours the finished guest tournament is deleted', n === 1 && (await row(guestDone)) === undefined);
ok('its finalization receipt stays', (await pg.query(`select 1 from public.tournament_finalization_receipts where tournament_id = $1`, [guestDone])).rows.length === 1);
ok('the account-owned tournament is never deleted', (await row(ownerDone)) !== undefined);

console.log('abandoned guest tournaments: 30 days idle, 7 days expired');
const idle = await tournament({ finishedMatch: false });
const fresh = await tournament({ finishedMatch: false });
// the touch trigger would reset updated_at, so it is switched off just for this set-up update
await pg.exec(`alter table public.tournaments disable trigger tournaments_touch_updated_at`);
await pg.query(`update public.tournaments set updated_at = now() - interval '31 days' where id = $1`, [idle]);
await pg.exec(`alter table public.tournaments enable trigger tournaments_touch_updated_at`);
await call('cleanup_expired_tournaments', []);
t = await row(idle);
ok('31 days without activity: expired, still there', t.expired_at !== null && t.state.status !== 'Avsluttet');
ok('a recently active tournament is not touched', (await row(fresh)).expired_at === null);
await pg.query(`update public.tournaments set expired_at = now() - interval '8 days' where id = $1`, [idle]);
n = (await call('cleanup_expired_tournaments', [])).data;
ok('after 7 days as expired it is deleted (receipt written first)', n === 1 && (await row(idle)) === undefined
  && (await pg.query(`select outcome from public.tournament_finalization_receipts where tournament_id = $1`, [idle])).rows[0]?.outcome === 'cancelled');
const revived = await tournament({ finishedMatch: false });
await pg.query(`update public.tournaments set expired_at = now() - interval '3 days' where id = $1`, [revived]);
await pg.query(`update public.tournaments set state = jsonb_set(state, '{name}', '"active again"'), revision = revision + 1 where id = $1`, [revived]);
ok('any real state change reactivates an expired tournament', (await row(revived)).expired_at === null);
await pg.query(`update public.tournaments set expired_at = now() - interval '9 days' where id = $1`, [revived]);
await pg.query(`update public.tournaments set state = jsonb_set(state, '{name}', '"x"') where id = $1`, [revived]);
n = (await call('cleanup_expired_tournaments', [])).data;
ok('a reactivated tournament survives the cleanup', (await row(revived)) !== undefined && n === 0);
const linked = await tournament({ finishedMatch: false });
await pg.query(`insert into public.tournament_account_players values ($1,$2,$3)`, [linked, uuid(101), uuid(900)]);
await pg.query(`update public.tournaments set expired_at = now() - interval '9 days' where id = $1`, [linked]);
n = (await call('cleanup_expired_tournaments', [])).data;
ok('an expired tournament with account-linked players is skipped, not deleted', (await row(linked)) !== undefined && n === 0);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
