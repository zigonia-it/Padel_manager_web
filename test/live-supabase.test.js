const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");
const shouldRunLive = process.env.PADELSTAR_LIVE_SUPABASE === "1";

function readSupabaseConfig() {
  const configSource = fs.readFileSync(path.join(root, "supabase-config.js"), "utf8");
  const url = configSource.match(/url:\s*"([^"]+)"/)?.[1];
  const anonKey = configSource.match(/anonKey:\s*"([^"]+)"/)?.[1];
  assert.ok(url, "Expected Supabase URL in supabase-config.js");
  assert.ok(anonKey, "Expected Supabase anon/publishable key in supabase-config.js");
  return { url, anonKey };
}

function makeHeaders(anonKey) {
  return {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    "content-type": "application/json",
  };
}

async function rpc(config, name, payload) {
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: makeHeaders(config.anonKey),
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

async function restGet(config, pathAndQuery) {
  const response = await fetch(`${config.url}/rest/v1/${pathAndQuery}`, {
    headers: makeHeaders(config.anonKey),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

function expectRpcOk(result, name) {
  assert.equal(result.response.ok, true, `${name} failed: ${JSON.stringify(result.data)}`);
  return result.data;
}

function makePlayer(name, index) {
  return {
    id: crypto.randomUUID(),
    name,
    avatarId: "smash",
    accent: index === 0 ? "blue" : "orange",
    active: true,
    participantType: "player",
    joinStatus: "joined",
    joinedFrom: "manual",
    createdAt: new Date().toISOString(),
  };
}

function makeTournamentState(inviteCode) {
  const players = [makePlayer("Live Test Ada", 0), makePlayer("Live Test Bo", 1)];
  const matchId = crypto.randomUUID();
  const courtId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    adminToken: crypto.randomUUID(),
    name: `Codex Live Test ${inviteCode}`,
    inviteCode,
    status: "Runde pågår",
    currentRound: 1,
    settings: {
      gamesToWinSet: 1,
      setsToWinMatch: 1,
      pointMode: "matches",
      format: "roundRobin",
      cupTeamSetupMode: "auto",
      includesThirdPlaceMatch: false,
      language: "nb",
    },
    courts: [{
      id: courtId,
      name: "Bane 1",
      courtNumber: 1,
      active: true,
    }],
    players,
    schedule: [],
    rounds: [{
      id: crypto.randomUUID(),
      roundNumber: 1,
      status: "active",
      createdAt: new Date().toISOString(),
      sittingOut: [],
      matches: [{
        id: matchId,
        tournamentId: null,
        rotationNumber: 1,
        courtId,
        courtName: "Bane 1",
        teamOne: { id: crypto.randomUUID(), displayName: players[0].name, players: [players[0]], accent: players[0].accent },
        teamTwo: { id: crypto.randomUUID(), displayName: players[1].name, players: [players[1]], accent: players[1].accent },
        sittingOut: [],
        state: "playing",
        completedSets: [],
        currentSet: { teamOne: 0, teamTwo: 0 },
        currentGame: { teamOne: 0, teamTwo: 0 },
        startingTeamIndex: 0,
        winnerTeamIndex: null,
        isWalkover: false,
        isThirdPlaceMatch: false,
        lastScoredMatchState: null,
      }],
    }],
    cup: null,
    cupTeams: [],
    revision: 0,
    selectedPlayerId: players[0].id,
    playerToken: "local-secret",
    matchId,
    firstPlayerId: players[0].id,
  };
}

function liveTestCode() {
  return `LT${Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, "A")}`.slice(0, 6);
}

test("live Supabase anon RPC contract supports create, join, stale rejection, scoring and cleanup", { skip: !shouldRunLive }, async () => {
  const config = readSupabaseConfig();
  const inviteCode = liveTestCode();
  const state = makeTournamentState(inviteCode);
  state.rounds[0].matches[0].tournamentId = state.id;
  const adminToken = state.adminToken;
  const tournamentId = state.id;
  const matchId = state.matchId;
  const firstPlayerId = state.firstPlayerId;

  try {
    const created = expectRpcOk(await rpc(config, "create_tournament", {
      p_state: state,
      p_admin_token: adminToken,
    }), "create_tournament");
    assert.equal(created.id, tournamentId);
    assert.equal(created.revision, 0);
    assert.equal(Object.hasOwn(created, "adminToken"), false);
    assert.equal(Object.hasOwn(created, "playerToken"), false);
    assert.equal(Object.hasOwn(created, "selectedPlayerId"), false);

    const publicRead = await restGet(config, `tournaments?select=id,invite_code,state,revision&id=eq.${tournamentId}`);
    assert.equal(publicRead.response.ok, true, JSON.stringify(publicRead.data));
    assert.equal(publicRead.data.length, 1);
    assert.equal(publicRead.data[0].revision, 0);

    const forbiddenAdminTokenRead = await restGet(config, `tournaments?select=admin_token&id=eq.${tournamentId}`);
    assert.equal(forbiddenAdminTokenRead.response.ok, false, "anon must not be able to select admin_token");

    const forbiddenPlayerSessionsRead = await restGet(config, "player_sessions?select=*");
    assert.equal(forbiddenPlayerSessionsRead.response.ok, false, "anon must not be able to read player_sessions");

    const privateImpl = await rpc(config, "save_tournament_state_impl", {
      p_tournament_id: tournamentId,
      p_admin_token: adminToken,
      p_state: created,
      p_expected_revision: 0,
    });
    assert.equal(privateImpl.response.ok, false, "anon must not be able to call private _impl RPCs");

    const saved = expectRpcOk(await rpc(config, "save_tournament_state", {
      p_tournament_id: tournamentId,
      p_admin_token: adminToken,
      p_state: { ...created, name: `${created.name} updated` },
      p_expected_revision: 0,
    }), "save_tournament_state");
    assert.equal(saved.revision, 1);

    const staleSave = await rpc(config, "save_tournament_state", {
      p_tournament_id: tournamentId,
      p_admin_token: adminToken,
      p_state: { ...saved, name: `${saved.name} stale` },
      p_expected_revision: 0,
    });
    assert.equal(staleSave.response.ok, false, "stale admin revision must be rejected");

    const joined = expectRpcOk(await rpc(config, "join_tournament", {
      p_invite_code: inviteCode,
      p_player: makePlayer("Live Test Ada", 0),
    }), "join_tournament");
    assert.equal(joined.playerId, firstPlayerId);
    assert.match(joined.playerToken, /^[0-9a-f]{48}$/);

    let latestState = joined.state;
    for (let point = 0; point < 8; point += 1) {
      latestState = expectRpcOk(await rpc(config, "save_player_point", {
        p_tournament_id: tournamentId,
        p_invite_code: inviteCode,
        p_player_id: firstPlayerId,
        p_match_id: matchId,
        p_team_index: 0,
        p_player_token: joined.playerToken,
      }), `save_player_point ${point + 1}`);
    }
    const [match] = latestState.rounds[0].matches;
    assert.equal(match.state, "finished");
    assert.equal(match.winnerTeamIndex, 0);
    assert.equal(latestState.revision, 9);

    const badTokenScore = await rpc(config, "save_player_point", {
      p_tournament_id: tournamentId,
      p_invite_code: inviteCode,
      p_player_id: firstPlayerId,
      p_match_id: matchId,
      p_team_index: 0,
      p_player_token: "0".repeat(48),
    });
    assert.equal(badTokenScore.response.ok, false, "invalid player token must be rejected");

    const createRateLimitResults = [];
    for (let attempt = 0; attempt < 10; attempt += 1) {
      createRateLimitResults.push(await rpc(config, "create_tournament", {
        p_state: state,
        p_admin_token: adminToken,
      }));
    }
    assert.equal(
      createRateLimitResults.some((result) => result.response.ok === false),
      true,
      "repeated create calls with the same admin token must eventually be rate limited",
    );
  } finally {
    const deleted = await rpc(config, "delete_tournament", {
      p_tournament_id: tournamentId,
      p_admin_token: adminToken,
    });
    assert.equal(deleted.response.ok, true, `delete_tournament failed: ${JSON.stringify(deleted.data)}`);

    const afterCleanup = await restGet(config, `tournaments?select=id&id=eq.${tournamentId}`);
    assert.equal(afterCleanup.response.ok, true, JSON.stringify(afterCleanup.data));
    assert.deepEqual(afterCleanup.data, []);
  }
});
