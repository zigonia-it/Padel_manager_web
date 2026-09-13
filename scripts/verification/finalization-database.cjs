// Isolated PostgreSQL integration fixture. Run with PADELSTAR_PGLITE_MODULE
// pointing to an installed @electric-sql/pglite; no production connection.
const { PGlite } = require(process.env.PADELSTAR_PGLITE_MODULE || '@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema extensions;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql as 'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      create function extensions.digest(text,text) returns bytea language sql as 'select sha256(convert_to($1, ''UTF8''))';
      create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb, revision integer default 0, owner_user_id uuid, owner_profile_id text, ended_at timestamptz, retention_expires_at timestamptz);
      create function public.create_tournament_impl(jsonb,text) returns jsonb language sql as 'select $1';
      create table public.player_sessions(tournament_id uuid, player_id uuid, token_hash text);
    `);
    await db.exec(fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20260913123550_account_tournament_finalization.sql'), 'utf8'));
    const user = '10000000-0000-4000-8000-000000000001';
    const player = '20000000-0000-4000-8000-000000000001';
    await db.query('insert into auth.users values ($1)', [user]);
    const token = 'isolated-test-admin-token';
    async function fixture(id, owner = null) {
      const state = { id, status: 'Runde pågår', players: [{ id: player, userId: user }, { id: 'guest', name: 'Guest' }], rounds: [{ matches: [{ id: 'm1', state: 'finished', teamOne: { players: [{ id: player }] }, teamTwo: { players: [{ id: 'guest' }] }, winnerTeamIndex: 0, completedSets: [{ teamOne: 6, teamTwo: 2 }] }] }] };
      await db.query('insert into tournaments(id, admin_token, state, owner_user_id) values ($1,$2,$3,$4)', [id,token,JSON.stringify(state),owner]);
      await db.query('insert into tournament_account_players values ($1,$2,$3)', [id,player,user]);
    }
    async function finalize(id, outcome = 'completed', adminToken = token) {
      return (await db.query('select finalize_tournament($1,$2,0,$3) result', [id,adminToken,outcome])).rows[0].result;
    }
    const guestId = '30000000-0000-4000-8000-000000000001';
    await fixture(guestId);
    await assert.rejects(db.query("update tournaments set state=jsonb_set(state, '{status}', '\"Avsluttet\"') where id=$1", [guestId]), /Use finalize_tournament/);
    await assert.rejects(db.query('delete from tournaments where id=$1', [guestId]), /Finalize/);
    const first = await finalize(guestId);
    assert.equal(first.deleted, true);
    assert.equal(first.statisticsSaved, true);
    assert.equal((await db.query('select * from tournaments where id=$1',[guestId])).rows.length, 0);
    const stats = (await db.query('select * from account_tournament_statistics')).rows;
    assert.equal(stats.length,1); assert.equal(stats[0].wins,1); assert.equal(stats[0].games,6);
    assert.deepEqual(await finalize(guestId), first);
    await assert.rejects(finalize(guestId, 'completed', 'wrong-test-admin-token'), /Admin token/);
    assert.equal((await db.query('select * from account_tournament_statistics')).rows.length,1);
    const ownerId='30000000-0000-4000-8000-000000000002';
    await fixture(ownerId,user);
    const owned = await finalize(ownerId,'cancelled');
    assert.equal(owned.deleted,false); assert.equal(owned.state.lifecycleStatus,'cancelled');
    assert.equal((await db.query('select count(*)::int n from tournaments')).rows[0].n,1);
    const failureId='30000000-0000-4000-8000-000000000003';
    await fixture(failureId);
    await db.exec(`create function fail_stats() returns trigger language plpgsql as $$begin raise exception 'injected write failure'; end$$; create trigger fail_stats before insert on account_tournament_statistics for each row execute function fail_stats();`);
    await assert.rejects(finalize(failureId), /injected write failure/);
    assert.equal((await db.query('select state from tournaments where id=$1',[failureId])).rows[0].state.status,'Runde pågår');
    assert.equal((await db.query('select * from tournament_finalization_receipts where tournament_id=$1',[failureId])).rows.length,0);
    await db.exec('drop trigger fail_stats on account_tournament_statistics;');
    assert.equal((await finalize(failureId)).statisticsSaved,true);
    console.log('PASS: PostgreSQL guest deletion, independent stats, account retention, retry, token rejection, deletion guard and rollback/retry');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
