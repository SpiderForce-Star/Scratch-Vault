import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { TN_MISSING_GAMES } from "../src/data/tn-missing.ts";
import { isNewCatalogGame } from "../src/data/tn-snapshot.ts";
import { mergeNewGameListings, unionBundledGames } from "../src/data/states/parse.server.ts";
import { scoreGame } from "../src/lib/heat.server.ts";
import {
  buildGamesBoard,
  pickBetterPicks,
  pickNewGames,
  pickSkipAtPrice,
} from "../src/lib/heat.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function scored(games) {
  const catalog = games.map((g) => ({ ...g, stateId: g.stateId ?? "tn" }));
  const reports = new Map(catalog.map((game) => [game.number, scoreGame(game)]));
  return { catalog, reports };
}

function tnCatalog() {
  const tn = JSON.parse(read("src/data/states/last-good/tn.json"));
  return unionBundledGames(
    tn.catalog.map((g) => ({ ...g, stateId: "tn" })),
    TN_MISSING_GAMES.map((g) => ({ ...g, stateId: "tn" })),
  );
}

test("Games page is New → Hot → Warm → Skip these, $5+ only", () => {
  const games = read("src/routes/games.tsx");
  const board = read("src/components/games-board.tsx");
  const home = read("src/routes/index.tsx");
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  assert.match(games, /buildGamesBoard/);
  assert.match(games, /GamesBoardView/);
  assert.doesNotMatch(games, /catalog-sort/);
  assert.doesNotMatch(games, /home\.sortHeat/);
  assert.doesNotMatch(home, /home\.allGames/);
  assert.doesNotMatch(home, /home\.sortHeat/);
  assert.match(home, /games\.seeAll/);
  assert.match(home, /trip\.title/);
  assert.match(home, /home\.skipKicker/);
  assert.match(games, /games\.underFive/);
  assert.match(board, /games\.newKicker/);
  assert.match(board, /games\.hotTitle/);
  assert.match(board, /games\.warmTitle/);
  assert.match(board, /home\.skipKicker/);
  assert.match(board, /home\.skipTitle/);
  assert.equal(en["games.hotTitle"], "Hot — better leftover prizes.");
  assert.equal(en["games.warmTitle"], "Warm — okay, not first pick.");
  assert.equal(en["home.skipTitle"], "Don't waste money on a drained game.");
  assert.equal(en["games.newUnposted"], "New. Leftover prizes not posted yet.");
  assert.equal(es["games.hotTitle"], "Caliente — mejores premios que quedan.");
  assert.equal(en["odds.printed"], "About 1 in {{odds}} tickets win something (usually small)");
  assert.equal(en["card.topListed"], "Jackpots still on the lottery’s list");
  assert.equal(en["card.retailTops"], "Jackpots you can still hit in a store");
  assert.equal(en["card.midBook"], "Middle prizes still listed");
  assert.equal(en["heat.grandShort"], "Big prizes");
  assert.equal(en["heat.mediumShort"], "Middle prizes");
  assert.equal(
    en["banner.deskSnapshot"],
    "The lottery’s leftover-prize list. Not what’s in one store.",
  );
});

test("TN $2/$3 stay out of New, Hot, and Warm", () => {
  const { catalog, reports } = scored(tnCatalog());
  const board = buildGamesBoard(catalog, reports, "all");
  const cheapNames = /Jumbo Bucks Seasons|^20X$/;
  for (const section of [board.newGames, board.hot, board.warm]) {
    assert.equal(section.some((g) => g.price < 5), false);
    assert.equal(section.some((g) => cheapNames.test(g.name) && g.price < 5), false);
  }
  assert.equal(pickNewGames(catalog, reports, 50).some((g) => g.price < 5), false);
  const seasons = catalog.find((g) => g.number === 1401);
  assert.ok(seasons);
  assert.equal(isNewCatalogGame({ ...seasons, stateId: "tn" }), true);
});

test("board order is new, then hot, then warm, then skip/cold", () => {
  const { catalog, reports } = scored(tnCatalog());
  const board = buildGamesBoard(catalog, reports, "all");
  assert.equal(board.hot.every((g) => reports.get(g.number)?.band === "hot"), true);
  assert.equal(board.warm.every((g) => reports.get(g.number)?.band === "warm"), true);
  assert.equal(
    board.skip.every((g) => {
      const heat = reports.get(g.number);
      return heat && (heat.band === "cool" || heat.band === "bust" || heat.bust);
    }),
    true,
  );
});

test("Giant Jumbo Bucks #1996 has better $5 picks and skip $5", () => {
  const { catalog, reports } = scored(tnCatalog());
  const jumbo = catalog.find((g) => g.number === 1996);
  assert.ok(jumbo);
  assert.equal(jumbo.price, 5);
  const better = pickBetterPicks(catalog, reports, 5, 1996);
  const skip = pickSkipAtPrice(catalog, reports, 5, 1996);
  assert.ok(better.length >= 1, "better $5 picks");
  assert.ok(skip.length >= 1, "skip $5");
  assert.equal(better.every((g) => g.price === 5 && g.number !== 1996), true);
  assert.equal(skip.every((g) => g.price === 5 && g.number !== 1996), true);
  const detail = read("src/routes/game/$number.tsx");
  assert.match(detail, /games\.betterPicks/);
  assert.match(detail, /games\.skipAtPrice/);
  assert.match(detail, /games\.seeAll/);
  assert.match(detail, /loader:/);
  assert.match(detail, /getDeskSnapshot/);
});

test("Kentucky uses the same Games board sections", () => {
  const ky = JSON.parse(read("src/data/states/last-good/ky.json"));
  const { catalog, reports } = scored(
    ky.catalog.map((g) => ({ ...g, stateId: "ky" })),
  );
  const board = buildGamesBoard(catalog, reports, "all");
  assert.equal(board.newGames.some((g) => g.price < 5), false);
  assert.equal(board.hot.some((g) => g.price < 5), false);
  assert.equal(board.warm.some((g) => g.price < 5), false);
  assert.ok(board.hot.length + board.warm.length + board.skip.length > 0);
  const games = read("src/routes/games.tsx");
  const card = read("src/components/ticket-card.tsx");
  const face = read("src/components/ticket-face.tsx");
  assert.match(games, /isPublicStateId/);
  assert.doesNotMatch(games, /stateId === "tn"/);
  assert.match(games, /viewState/);
  assert.match(card, /game\.stateId/);
  assert.match(card, /deskSearch\(deskId\)/);
  assert.match(face, /game\.stateId/);
});

test("public last-good desks keep $2/$3 out of New, Hot, and Warm", () => {
  for (const id of ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id"]) {
    const snap = JSON.parse(read(`src/data/states/last-good/${id}.json`));
    const { catalog, reports } = scored(
      snap.catalog.map((g) => ({ ...g, stateId: id })),
    );
    const board = buildGamesBoard(catalog, reports, "all");
    for (const section of [board.newGames, board.hot, board.warm]) {
      assert.equal(
        section.some((g) => g.price < 5),
        false,
        `${id} leaked under $5`,
      );
    }
  }
});

test("unposted new games are not fake HOT", () => {
  const franklin = TN_MISSING_GAMES.find((g) => g.number === 1397);
  assert.ok(franklin);
  const heat = scoreGame({ ...franklin, stateId: "tn" });
  assert.equal(heat.band, "new");
  assert.equal(heat.bust, false);
});

test("new-games merge adds $5+ with null remaining and skips $1/$3 extras", () => {
  const known = [
    {
      number: 1996,
      name: "Giant Jumbo Bucks",
      price: 5,
      topPrize: 150000,
      odds: 4,
      source: "tn-remaining",
      theme: "jumbo",
      stateId: "tn",
      tiers: [
        { amount: 150000, remaining: 9 },
        { amount: 5000, remaining: 12 },
        { amount: 1000, remaining: 613 },
      ],
    },
  ];
  const merged = mergeNewGameListings(
    known,
    [
      {
        number: 1996,
        name: "Giant Jumbo Bucks",
        price: 5,
        prizes: [{ amount: 150000, remaining: 99 }],
      },
      {
        number: 8888,
        name: "Fresh Five",
        price: 5,
        prizes: [{ amount: 100000, remaining: 4 }],
      },
      {
        number: 1401,
        name: "Jumbo Bucks Seasons",
        price: 3,
        prizes: [{ amount: 75000, remaining: 9 }],
      },
      {
        number: 1111,
        name: "Dollar Ticket",
        price: 1,
        prizes: [{ amount: 1000, remaining: 2 }],
      },
    ],
    "tn",
  );
  const jumbo = merged.find((g) => g.number === 1996);
  const fresh = merged.find((g) => g.number === 8888);
  assert.equal(jumbo?.tiers[0]?.remaining, 9);
  assert.ok(fresh);
  assert.equal(fresh.price, 5);
  assert.equal(fresh.fresh, true);
  assert.equal(fresh.tiers.every((tier) => tier.remaining == null), true);
  assert.equal(merged.some((g) => g.number === 1401), false);
  assert.equal(merged.some((g) => g.number === 1111), false);
});

test("en and es games keys match", () => {
  const en = JSON.parse(read("src/locales/en.json"));
  const es = JSON.parse(read("src/locales/es.json"));
  assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
});
