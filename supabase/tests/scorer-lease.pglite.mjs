// Database regression tests for migration 20260919120000_match_scorer_lease.sql.
// Runs the migration on an in-memory Postgres (PGlite) with a minimal copy of the live schema.
// Run:  npm install --no-save @electric-sql/pglite && node supabase/tests/scorer-lease.pglite.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
const MIG = new URL('../migrations/20260919120000_match_scorer_lease.sql', import.meta.url).pathname;
const pg = new PGlite();
await pg.exec(`
create role anon; create role authenticated;
create schema extensions;
create function extensions.digest(t text, alg text) returns bytea language sql immutable as $$ select decode(md5(t),'hex') $$;
create table public.tournaments(id uuid primary key, invite_code text, admin_token text, state jsonb, revision int default 0, updated_at timestamptz default now());
create table public.player_sessions(tournament_id uuid, player_id uuid, token_hash text);
create table public.api_rate_limits(bucket_hash text primary key, window_started_at timestamptz, request_count int, updated_at timestamptz);
create or replace function public.consume_api_rate_limit(p_bucket text, p_limit integer, p_window_seconds integer) returns boolean language plpgsql as $$
declare h text; allowed boolean; begin
 h := encode(extensions.digest(p_bucket,'sha256'),'hex');
 insert into public.api_rate_limits values (h, now(), 1, now()) on conflict (bucket_hash) do update set request_count = public.api_rate_limits.request_count+1 returning request_count <= p_limit into allowed; return allowed; end $$;
`);
await pg.exec(fs.readFileSync(MIG, 'utf8'));
// the wrapper the live DB already has
await pg.exec(`create or replace function public.admin_undo_match(p_tournament_id uuid, p_admin_token text, p_match_id uuid, p_expected_revision integer) returns jsonb language plpgsql as $$ begin return public.admin_undo_match_impl(p_tournament_id,p_admin_token,p_match_id,p_expected_revision); end $$;`);
await pg.exec(`create or replace function public.save_player_point(p_tournament_id uuid, p_invite_code text, p_player_id uuid, p_match_id uuid, p_team_index integer, p_player_token text) returns jsonb language plpgsql as $$ begin return public.save_player_point_impl(p_tournament_id,p_invite_code,p_player_id,p_match_id,p_team_index,p_player_token); end $$;`);

const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const T = uuid(1), M1 = uuid(11), M2 = uuid(12);
const P = { A: uuid(101), B: uuid(102), C: uuid(103), D: uuid(104), E: uuid(105) };
const tok = (c) => c.repeat(48).slice(0,48);
const TOK = { A: tok('a'), B: tok('b'), C: tok('c'), D: tok('d'), E: tok('e') };
const team = (a,b)=>({ players:[{id:P[a],name:a},{id:P[b],name:b}], displayName:`${a} & ${b}` });
const mk = (id, state, a, b) => ({ id, state, status: state==='playing'?'active':'scheduled', teamOne: team(a[0],a[1]), teamTwo: team(b[0],b[1]),
  currentGame:{teamOne:0,teamTwo:0}, currentSet:{teamOne:0,teamTwo:0}, completedSets:[], courtId:'court-1', courtName:'Bane 1', undoStack:[] });
const state0 = { status:'Runde pågår', settings:{gamesToWinSet:6,setsToWinMatch:1}, revision:1, rounds:[{ id:'r1', status:'active', matches:[ mk(M1,'playing','AB','CD'), mk(M2,'waiting','AB','CD') ] }] };
await pg.query(`insert into public.tournaments(id,invite_code,admin_token,state,revision) values ($1,'ABCD2345','admintoken-1234567890',$2::jsonb,1)`, [T, JSON.stringify(state0)]);
for (const k of Object.keys(P)) await pg.query(`insert into public.player_sessions values ($1,$2,encode(extensions.digest($3,'sha256'),'hex'))`, [T, P[k], TOK[k]]);

let pass = 0, fail = 0;
const ok = (name, cond, extra='') => { if (cond) { pass++; console.log('  ok  ', name); } else { fail++; console.log('  FAIL', name, extra); } };
const call = async (fn, args) => { try { const r = await pg.query(`select public.${fn}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as r`, args); return { data: r.rows[0].r }; } catch (e) { return { error: e.message }; } };
const point = (who, teamIndex, match=M1) => call('save_player_point', [T,'abcd2345',P[who],match,teamIndex,TOK[who]]);
const act = (who, action, target=null, match=M1) => call('match_scorer_action', [T,'ABCD2345',P[who],match,TOK[who],action,target]);
const m = (st, id=M1) => st.rounds[0].matches.find(x=>x.id===id);
const cur = async () => (await pg.query(`select state, revision from public.tournaments where id=$1`, [T])).rows[0];

console.log('scorer claim / rejection');
let r = await point('A', 0);
ok('first point auto-claims scorer', !r.error && m(r.data).scorer?.playerId === P.A, r.error);
ok('point applied', m(r.data).currentGame.teamOne === 1);
r = await point('C', 0);
ok('non-scorer point rejected', r.error?.includes('Not the active scorer'), r.error);
r = await act('C','claim');
ok('claim while scorer active rejected', r.error?.includes('already has an active scorer'), r.error);
r = await act('E','request');
ok('non-participant cannot request', r.error?.includes('not part of this match'), r.error);
r = await act('C','request');
ok('participant request recorded', !r.error && m(r.data).scorerRequest?.playerId === P.C, r.error);
r = await act('D','request');
ok('second request while one pending rejected', r.error?.includes('pending'), r.error);
r = await act('C','transfer');
ok('non-scorer cannot transfer', r.error?.includes('Not the active scorer'), r.error);
r = await act('A','transfer');
ok('transfer defaults to requester', !r.error && m(r.data).scorer?.playerId === P.C && !m(r.data).scorerRequest, r.error);
ok('scorer log has entries', m(r.data).scorerLog.length === 2 && m(r.data).scorerLog[1].reason === 'transferred');
r = await point('A', 0);
ok('old scorer cannot score after transfer', r.error?.includes('Not the active scorer'), r.error);

console.log('scoring both teams, undo / redo');
r = await point('C', 1);
ok('scorer scores for the opposing team too', !r.error && m(r.data).currentGame.teamTwo === 1 && m(r.data).currentGame.teamOne === 1, r.error);
r = await act('C','undo');
ok('undo reverts last point', !r.error && m(r.data).currentGame.teamTwo === 0 && m(r.data).currentGame.teamOne === 1, r.error);
r = await act('C','undo');
ok('second undo reverts to before first point', !r.error && m(r.data).currentGame.teamOne === 0 , JSON.stringify(m(r.data)?.currentGame)+r.error);
r = await act('C','undo');
ok('undo with empty stack rejected', r.error?.includes('No undo'), r.error);
r = await act('C','redo');
ok('redo re-applies a point', !r.error && m(r.data).currentGame.teamOne === 1, r.error);
r = await act('C','redo');
ok('redo re-applies the second point', !r.error && m(r.data).currentGame.teamTwo === 1, r.error);
r = await act('C','undo');
r = await point('C', 0);
ok('new point after undo scores', !r.error && m(r.data).currentGame.teamOne === 2, r.error);
ok('new point after undo drops the redo branch', m(r.data).redoStack.length === 0);
r = await act('C','redo');
ok('redo after new point rejected', r.error?.includes('No redo'), r.error);
const evTypes = m((await cur()).state).eventLog.map(e=>e.type).join(',');
ok('undone events stay in the event history', /point/.test(evTypes) && /undo/.test(evTypes) && /redo/.test(evTypes), evTypes);

console.log('finishing a match, undo/redo across the finish');
// C is scorer; play team 0 to 6 games. current game has teamOne=2 points (0-fresh). Score until finished.
let guard = 0; r = null;
while (guard++ < 40) { r = await point('C', 0); if (r.error || m(r.data).state === 'awaitingApproval') break; }
ok('the winning point puts the match up for approval', !r.error && m(r.data).state === 'awaitingApproval' && m(r.data).approval.status === 'draft', r.error);
ok('next waiting match started with the same court', m(r.data, M2).state === 'playing' && m(r.data, M2).courtName === 'Bane 1');
const finished = m(r.data);
r = await act('C','undo');
ok('undo after the winning point reopens the match', !r.error && m(r.data).state === 'playing' && m(r.data, M2).state === 'waiting', r.error);
r = await act('C','redo');
ok('redo puts the match up for approval again', !r.error && m(r.data).state === 'awaitingApproval' && m(r.data, M2).state === 'playing', r.error);
ok('redo restores identical score', JSON.stringify(m(r.data).completedSets) === JSON.stringify(finished.completedSets));

console.log('offline takeover, release, heartbeat');
// use match 2 (now playing): A claims, D cannot immediately, becomes possible after 2 min without heartbeat
r = await act('A','claim',null,M2);
ok('claim on playing match with no scorer', !r.error && m(r.data, M2).scorer?.playerId === P.A, r.error);
r = await act('D','claim',null,M2);
ok('fresh scorer cannot be taken over', r.error?.includes('active scorer'), r.error);
const before = (await cur()).revision;
r = await act('A','heartbeat',null,M2);
ok('heartbeat succeeds', !r.error, r.error);
ok('heartbeat does not bump the revision', (await cur()).revision === before);
r = await act('B','heartbeat',null,M2);
ok('non-scorer heartbeat rejected', r.error?.includes('Not the active scorer'), r.error);
await pg.query(`update public.match_scorer_heartbeats set heartbeat_at = now() - interval '3 minutes' where match_id=$1`, [M2]);
r = await act('D','claim',null,M2);
ok('takeover allowed after 2 minutes without contact', !r.error && m(r.data, M2).scorer?.playerId === P.D, r.error);
ok('takeover is logged as offline_takeover', m(r.data, M2).scorerLog.slice(-1)[0].reason === 'offline_takeover');
r = await point('A', 0, M2);
ok('old scorer does not regain the role automatically', r.error?.includes('Not the active scorer'), r.error);
r = await act('D','release',null,M2);
ok('release clears the scorer', !r.error && !m(r.data, M2).scorer, r.error);

console.log('admin override');
let st = await cur();
r = await call('admin_set_match_scorer', [T,'admintoken-1234567890',M2,P.B,st.revision]);
ok('admin assigns a scorer', !r.error && m(r.data, M2).scorer?.playerId === P.B, r.error);
r = await call('admin_set_match_scorer', [T,'admintoken-1234567890',M2,P.B,st.revision]);
ok('admin override honours the expected revision', r.error?.includes('changed'), r.error);
r = await call('admin_set_match_scorer', [T,'wrongtoken-1234567890',M2,P.A,(await cur()).revision]);
ok('admin override needs the admin token', r.error?.includes('Admin token mismatch'), r.error);
r = await call('admin_set_match_scorer', [T,'admintoken-1234567890',M2,P.E,(await cur()).revision]);
ok('admin cannot assign a non-participant', r.error?.includes('not part'), r.error);
r = await call('admin_set_match_scorer', [T,'admintoken-1234567890',M2,null,(await cur()).revision]);
ok('admin can clear the scorer', !r.error && !m(r.data, M2).scorer, r.error);
r = await point('B', 0, M2);
ok('a cleared match can be claimed by the first point', !r.error && m(r.data, M2).scorer?.playerId === P.B, r.error);

console.log('admin undo keeps the scorer');
{
  // M2 is scored by B. Admin undo of B's point must not change the scorer.
  const before2 = await point('B', 0, M2);
  const revNow = (await cur()).revision;
  const rr = await call('admin_undo_match', [T,'admintoken-1234567890',M2,revNow]);
  ok('admin undo succeeds', !rr.error, rr.error);
  ok('admin undo keeps the current scorer role', !rr.error && m(rr.data, M2).scorer?.playerId === P.B);
  ok('admin undo clears the redo branch', !rr.error && Array.isArray(m(rr.data, M2).redoStack) && m(rr.data, M2).redoStack.length === 0);
  ok('admin undo keeps the event history', !rr.error && m(rr.data, M2).eventLog.length >= 1);
}

console.log('validation');
r = await call('match_scorer_action', [T,'ABCD2345',P.A,M1,'short','claim',null]);
ok('bad token format rejected', r.error?.includes('Invalid scorer payload'), r.error);
r = await call('match_scorer_action', [T,'ABCD2345',P.A,M1,TOK.B,'claim',null]);
ok('token of another player rejected', r.error?.includes('Player token mismatch'), r.error);
r = await call('match_scorer_action', [T,'ABCD2345',P.A,M1,TOK.A,'explode',null]);
ok('unknown action rejected', r.error?.includes('Invalid scorer payload'), r.error);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
