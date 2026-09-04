import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { isEndedGame } from "../src/data/ended-games.ts";
import { TN_MISSING_GAMES } from "../src/data/tn-missing.ts";
import { isNewCatalogGame } from "../src/data/tn-snapshot.ts";
import {
  looksLikeDateName,
  mergeNewGameListings,
  unionBundledGames,
} from "../src/data/states/parse.server.ts";
import { scoreGame } from "../src/lib/heat.server.ts";
import {
  PRICE_POINTS,
  buildGamesBoard,
  isSkipCandidate,
  isSkipGame,
  pickBetterPicks,
  pickNewGames,
  pickSkipAtPrice,
  pickSkipGames,
  pickTripGames,
  skipChipBand,
  soldPricePoints,
} from "../src/lib/heat.ts";


const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function scored(games) {
  const catalog = games.map((g) => ({ ...g, stateId: g.stateId ?? "tn" }));
  const reports = new Map(
    catalog.map((game) => [
      game.number,
      scoreGame(game, game.stateId === "tn" ? undefined : { topHoldback: 0 }),
    ]),
  );
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
  assert.match(board, /forceBand/);
  assert.equal(
    en["pricing.featHeat"],
    "Three tickets to look at at your price — not 100 rows.",
  );
  assert.equal(
    en["pricing.featSkip"],
    "Skip the drained ones. Tennessee’s Play It Again holdback is not counted as a store jackpot.",
  );
  assert.equal(
    en["pricing.featRadar"],
    "7 days free, then $4.99/mo. Or $49.99/year.",
  );
  assert.equal(en["cta.trial"], "Try 7 days free");
  assert.equal(en["hero.titleAll"], "Three tickets to look at. A list to walk past.");
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

test("TN $2/$3 stay out of New, Hot, Warm, and Skip", () => {
  const { catalog, reports } = scored(tnCatalog());
  const board = buildGamesBoard(catalog, reports, "all");
  const cheapNames = /Jumbo Bucks Seasons|^20X$/;
  for (const section of [board.newGames, board.hot, board.warm, board.skip]) {
    assert.equal(section.some((g) => g.price < 5), false);
    assert.equal(section.some((g) => cheapNames.test(g.name) && g.price < 5), false);
  }
  assert.equal(pickNewGames(catalog, reports, 50).some((g) => g.price < 5), false);
  assert.equal(pickSkipGames(catalog, reports, "5", 8).some((g) => g.price < 5), false);
  const seasons = catalog.find((g) => g.number === 1401);
  assert.ok(seasons);
  assert.equal(isNewCatalogGame({ ...seasons, stateId: "tn" }), true);
  assert.deepEqual([...PRICE_POINTS], [5, 10, 20, 25, 30, 50]);
});

test("board order is new, then hot, then warm, then skip/cold", () => {
  const { catalog, reports } = scored(tnCatalog());
  const board = buildGamesBoard(catalog, reports, "all");
  assert.equal(board.hot.every((g) => reports.get(g.number)?.band === "hot"), true);
  assert.equal(board.warm.every((g) => reports.get(g.number)?.band === "warm"), true);
  assert.equal(board.skip.every((g) => isSkipCandidate(g, reports.get(g.number))), true);
  assert.equal(
    board.skip.every((g) => {
      const heat = reports.get(g.number);
      return heat && heat.band !== "hot" && heat.band !== "warm" && heat.band !== "new";
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

test("public last-good desks keep $2/$3 out of New, Hot, Warm, and Skip", () => {
  for (const id of ["tn", "ky", "sc", "ok", "nc", "pa", "tx", "mo", "ia", "id"]) {
    const snap = JSON.parse(read(`src/data/states/last-good/${id}.json`));
    const { catalog, reports } = scored(
      snap.catalog.map((g) => ({ ...g, stateId: id })),
    );
    const board = buildGamesBoard(catalog, reports, "all");
    for (const section of [board.newGames, board.hot, board.warm, board.skip]) {
      assert.equal(
        section.some((g) => g.price < 5),
        false,
        `${id} leaked under $5`,
      );
    }
    for (const price of ["5", "10", "20", "25", "30", "50"]) {
      const trip = pickTripGames(catalog, reports, price, 3);
      const skip = pickSkipGames(
        catalog,
        reports,
        price,
        5,
        trip.map((g) => g.number),
      );
      assert.equal(
        skip.every((g) => isSkipCandidate(g, reports.get(g.number))),
        true,
        `${id} $${price} skip rule`,
      );
      assert.equal(
        skip.every((g) => g.price === Number(price)),
        true,
        `${id} $${price} skip same price`,
      );
      const tripIds = new Set(trip.map((g) => g.number));
      assert.equal(
        skip.some((g) => tripIds.has(g.number)),
        false,
        `${id} $${price} trip/skip overlap`,
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

function report(partial) {
  return {
    grand: 0,
    medium: 70,
    vault: 70,
    band: "hot",
    bust: false,
    mediumKnown: true,
    role: "jackpot",
    topRemaining: 0,
    effectiveTop: 0,
    midRemaining: 40,
    lowRemaining: 200,
    ...partial,
  };
}

test("hot, warm, and new are never skip even when jackpot grand is 0", () => {
  assert.equal(isSkipGame(report({ band: "hot", grand: 0, bust: false })), false);
  assert.equal(isSkipGame(report({ band: "warm", grand: 0, bust: false })), false);
  assert.equal(isSkipGame(report({ band: "new", grand: 0, bust: false })), false);
  assert.equal(isSkipGame(report({ band: "hot", bust: true })), false);
  assert.equal(isSkipGame(report({ band: "cool", grand: 80, bust: false })), true);
  assert.equal(isSkipGame(report({ band: "bust", grand: 0, bust: true })), true);
  assert.equal(skipChipBand(report({ band: "hot" })), "cool");
  assert.equal(skipChipBand(report({ band: "cool" })), "cool");
  assert.equal(skipChipBand(report({ band: "bust", bust: true })), "bust");
});

test("pickSkipGames never pads empty price lists with hot games", () => {
  const games = [
    { number: 991, name: "Wild Cash 50X", price: 5 },
    { number: 971, name: "50X The Luck", price: 5 },
    { number: 50, name: "Big $50", price: 50 },
  ];
  const reports = new Map([
    [991, report({ band: "hot", grand: 0 })],
    [971, report({ band: "hot", grand: 0 })],
    [50, report({ band: "hot", grand: 80, topRemaining: 4, effectiveTop: 4 })],
  ]);
  assert.deepEqual(
    pickSkipGames(games, reports, "50", 5).map((g) => g.number),
    [],
  );
  const coolFive = { number: 107, name: "Merry Multiplier", price: 5 };
  const withCool = [...games, coolFive];
  reports.set(107, report({ band: "cool", grand: 0, vault: 10, medium: 20 }));
  const filled = pickSkipGames(withCool, reports, "50", 5);
  assert.deepEqual(filled.map((g) => g.number), []);
  assert.deepEqual(
    pickSkipGames(withCool, reports, "5", 5).map((g) => g.number),
    [107],
  );
});

test("PA $10 Skip These has no HOT crossword chips", () => {
  const pa = JSON.parse(read("src/data/states/last-good/pa.json"));
  const { catalog, reports } = scored(pa.catalog.map((g) => ({ ...g, stateId: "pa" })));
  const skip = pickSkipGames(catalog, reports, "10", 5);
  assert.equal(skip.every((g) => isSkipGame(reports.get(g.number))), true);
  assert.equal(
    skip.some((g) => /Bonus Crossword|Big Cash Payout|Crossword Mania/i.test(g.name)),
    false,
  );
  assert.equal(
    skip.every((g) => {
      const band = reports.get(g.number)?.band;
      return band === "cool" || band === "bust";
    }),
    true,
  );
});

test("KY $30 and $50 Skip These are not padded with $5 HOT games", () => {
  const ky = JSON.parse(read("src/data/states/last-good/ky.json"));
  const { catalog, reports } = scored(ky.catalog.map((g) => ({ ...g, stateId: "ky" })));
  const hotFives = /Wild Cash 50X|50X The Luck|Casino Nights|Lucky Fortune/;
  for (const price of ["30", "50"]) {
    const skip = pickSkipGames(catalog, reports, price, 5);
    assert.equal(skip.every((g) => isSkipGame(reports.get(g.number))), true, `ky $${price}`);
    assert.equal(skip.some((g) => reports.get(g.number)?.band === "hot"), false, `ky $${price} hot`);
    assert.equal(skip.some((g) => hotFives.test(g.name)), false, `ky $${price} named hots`);
    assert.equal(skip.every((g) => g.price === Number(price)), true, `ky $${price} same price`);
    assert.equal(
      skip.some((g) => g.price === 5 && reports.get(g.number)?.band === "hot"),
      false,
      `ky $${price} $5 hot pad`,
    );
  }
});

test("homepage skip rows force Cold or Skip chips", () => {
  const home = read("src/routes/index.tsx");
  const skipBlock = home.slice(home.indexOf('id="skip"'));
  assert.match(skipBlock, /skipChipBand/);
  assert.doesNotMatch(skipBlock, /BandChip band=\{heat\.band\}/);
  assert.match(home, /home\.skipEmpty/);
  assert.match(home, /home\.skipKicker/);
  assert.match(home, /RadarCashHero/);
  assert.match(home, /home\.skipTitle/);
  assert.match(home, /order-2 lg:order-1/);
  assert.match(home, /sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(home, /hero\.titleAll/);
  assert.match(home, /cta\.trial/);
  assert.match(home, /viewState === "tn"/);
  assert.match(home, /pia\.title/);
  assert.match(home, /pia\.body/);
  assert.match(home, /soldPricePoints/);
  assert.match(home, /home\.noPrice/);
  assert.match(home, /home\.allSkip/);
  assert.match(home, /home\.noSnapshot/);
  const gamesPage = read("src/routes/games.tsx");
  assert.doesNotMatch(gamesPage, /pia\.title/);
  const card = read("src/components/ticket-card.tsx");
  assert.match(card, /showStoreJackpot/);
  assert.match(card, /state\.holdback/);
  const en = JSON.parse(read("src/locales/en.json"));
  assert.equal(en["pia.title"], "Play It Again (Tennessee)");
  assert.match(en["pia.body"], /Tennessee Lottery holds one top prize/);
  assert.equal(en["home.noPrice"], "{{state}} doesn’t sell ${{price}} scratch-offs.");
  assert.equal(en["home.allSkip"], "No ${{price}} tickets worth a look tonight.");
  assert.equal(
    en["home.noSnapshot"],
    "We’re still reading this lottery’s leftover-prize list.",
  );
});

test("Texas last-good date names yield to bundled names", () => {
  const tx = JSON.parse(read("src/data/states/last-good/tx.json"));
  assert.equal(tx.catalog.some((g) => looksLikeDateName(g.name)), false);
  const fiftyX = tx.catalog.find((g) => g.number === 2712);
  assert.ok(fiftyX);
  assert.equal(fiftyX.name, "50X The Cash");
  const dated = tx.catalog.map((g) => ({ ...g, name: "01/05/26", stateId: "tx" }));
  const bundled = tx.catalog.map((g) => ({
    ...g,
    tiers: g.tiers.map((tier) => ({ ...tier, remaining: null })),
    stateId: "tx",
  }));
  const healed = unionBundledGames(dated, bundled);
  assert.equal(healed.some((g) => looksLikeDateName(g.name)), false);
  const healedFifty = healed.find((g) => g.number === 2712);
  assert.equal(healedFifty.name, "50X The Cash");
  assert.equal(healedFifty.tiers[0].remaining, fiftyX.tiers[0].remaining);
});

test("SC catalog does not sell $25/$30/$50", () => {
  const sc = JSON.parse(read("src/data/states/last-good/sc.json"));
  const prices = soldPricePoints(sc.catalog);
  assert.deepEqual(prices, [5, 10, 20]);
  const home = read("src/routes/index.tsx");
  assert.match(home, /sold\.map/);
  assert.doesNotMatch(home, /id: "50"/);
});

test("Idaho $50 with posted remaining is not blank-trip plus all-skip", () => {
  const unknown = [
    {
      number: 1847,
      name: "$1,000,000 King",
      price: 50,
      topPrize: 1_000_000,
      odds: 2.7,
      source: "official-remaining",
      theme: "high",
      stateId: "id",
      tiers: [
        { amount: 1_000_000, remaining: null },
        { amount: 50_000, remaining: null },
        { amount: 1_000, remaining: null },
      ],
    },
    {
      number: 1897,
      name: "High Life",
      price: 50,
      topPrize: 1_000_000,
      odds: 2.7,
      source: "official-remaining",
      theme: "high",
      stateId: "id",
      tiers: [
        { amount: 1_000_000, remaining: null },
        { amount: 5_000, remaining: null },
        { amount: 1_000, remaining: null },
      ],
    },
  ];
  const unknownScored = scored(unknown);
  assert.equal(
    unknownScored.catalog.every((g) => !isSkipGame(unknownScored.reports.get(g.number))),
    true,
  );
  assert.equal(pickTripGames(unknownScored.catalog, unknownScored.reports, "50", 3).length, 2);
  assert.equal(pickSkipGames(unknownScored.catalog, unknownScored.reports, "50", 5).length, 0);

  const posted = [
    {
      ...unknown[0],
      tiers: [
        { amount: 1_000_000, remaining: 1 },
        { amount: 50_000, remaining: 0 },
        { amount: 10_000, remaining: 1 },
        { amount: 1_000, remaining: 4 },
        { amount: 100, remaining: 400 },
      ],
    },
    {
      ...unknown[1],
      tiers: [
        { amount: 1_000_000, remaining: 2 },
        { amount: 5_000, remaining: 3 },
        { amount: 1_000, remaining: 5 },
        { amount: 500, remaining: 90 },
        { amount: 100, remaining: 400 },
      ],
    },
  ];
  const postedScored = scored(posted);
  const trip = pickTripGames(postedScored.catalog, postedScored.reports, "50", 3);
  const skip = pickSkipGames(
    postedScored.catalog,
    postedScored.reports,
    "50",
    5,
    trip.map((g) => g.number),
  );
  assert.equal(trip.length, 2);
  assert.equal(skip.length, 0);
});

test("OK $50 has two posted games and does not invent a third", () => {
  const ok = JSON.parse(read("src/data/states/last-good/ok.json"));
  const { catalog, reports } = scored(ok.catalog.map((g) => ({ ...g, stateId: "ok" })));
  const fifties = catalog.filter((g) => g.price === 50);
  assert.equal(fifties.length, 2);
  const trip = pickTripGames(catalog, reports, "50", 3);
  const skip = pickSkipGames(
    catalog,
    reports,
    "50",
    5,
    trip.map((g) => g.number),
  );
  assert.equal(trip.length, 2);
  assert.equal(skip.length, 0);
});

test("unknown remaining is not skip", () => {
  assert.equal(
    isSkipGame(
      report({
        band: "cool",
        topRemaining: null,
        midRemaining: null,
        remainingUnknown: true,
      }),
    ),
    false,
  );
});

test("KY Merry Multiplier is ended — not Review these 3 or tonight hot", () => {
  assert.equal(isEndedGame({ stateId: "ky", number: 107, name: "Merry Multiplier" }), true);
  assert.equal(isEndedGame({ stateId: "tn", number: 107, name: "Merry Multiplier" }), false);
  const ky = JSON.parse(read("src/data/states/last-good/ky.json"));
  const { catalog, reports } = scored(
    ky.catalog.map((g) => ({ ...g, stateId: "ky" })),
  );
  const merry = catalog.find((g) => g.number === 107);
  assert.ok(merry);
  assert.match(merry.name, /Merry Multiplier/);
  const trip = pickTripGames(catalog, reports, "5", 3);
  assert.equal(trip.some((g) => g.number === 107), false);
  const board = buildGamesBoard(catalog, reports, "all");
  assert.equal(board.hot.some((g) => g.number === 107), false);
  assert.equal(board.warm.some((g) => g.number === 107), false);
  assert.equal(board.skip.some((g) => g.number === 107), true);
});
