#!/usr/bin/env node
// Dev-only stand-in for the MultiversX API when its account endpoints are
// broken (devnet-api returning empty accounts). Serves /accounts/* in the API
// format from a node gateway (proxy) and forwards every other route to the
// regular API, so the widget and the host's sdk-dapp only need their
// `networkApiAddress` / `apiAddress` pointed here.
//
//   GATEWAY=http://192.168.1.23:8079 node scripts/devnet-api-proxy.mjs
//
// Env: GATEWAY (required), UPSTREAM (default devnet-api), PORT (default 8787).

import http from "node:http";

const GATEWAY = (process.env.GATEWAY || "http://192.168.1.23:8079").replace(/\/$/, "");
const UPSTREAM = (process.env.UPSTREAM || "https://devnet-api.multiversx.com").replace(/\/$/, "");
const PORT = Number(process.env.PORT || 8787);

const NFT_TYPES = new Set(["NonFungibleESDT", "SemiFungibleESDT", "MetaESDT"]);

// Token metadata (ticker, decimals, assets) still works on the API — the
// gateway only gives balances, so fungible entries are enriched from there.
const metaCache = new Map();
async function tokenMeta(ids) {
  const missing = ids.filter((id) => !metaCache.has(id));
  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    try {
      const res = await fetch(
        `${UPSTREAM}/tokens?identifiers=${chunk.join(",")}&size=${chunk.length}&fields=identifier,ticker,name,decimals,assets,price`,
      );
      const list = res.ok ? await res.json() : [];
      for (const t of list) metaCache.set(t.identifier, t);
    } catch {
      /* metadata is best effort */
    }
    for (const id of chunk) if (!metaCache.has(id)) metaCache.set(id, { identifier: id });
  }
  return Object.fromEntries(ids.map((id) => [id, metaCache.get(id)]));
}

async function gw(path) {
  const res = await fetch(`${GATEWAY}${path}`);
  const body = await res.json();
  if (body.code !== "successful") throw Object.assign(new Error(body.error || "gateway error"), { status: 502 });
  return body.data;
}

async function accountEsdts(address) {
  const data = await gw(`/address/${address}/esdt`);
  return Object.values(data.esdts || {});
}

async function fungibleTokens(address) {
  const esdts = (await accountEsdts(address)).filter((e) => !NFT_TYPES.has(e.type));
  const meta = await tokenMeta(esdts.map((e) => e.tokenIdentifier));
  return esdts.map((e) => {
    const m = meta[e.tokenIdentifier] || {};
    return {
      identifier: e.tokenIdentifier,
      ticker: m.ticker ?? e.tokenIdentifier.split("-")[0],
      name: m.name ?? e.tokenIdentifier.split("-")[0],
      decimals: m.decimals ?? 18,
      assets: m.assets,
      price: m.price,
      balance: e.balance,
      type: e.type,
    };
  });
}

async function nftTokens(address) {
  return (await accountEsdts(address))
    .filter((e) => NFT_TYPES.has(e.type))
    .map((e) => {
      const parts = e.tokenIdentifier.split("-");
      return {
        identifier: e.tokenIdentifier,
        collection: parts.slice(0, 2).join("-"),
        nonce: e.nonce,
        type: e.type,
        name: e.name,
        creator: e.creator,
        royalties: e.royalties,
        uris: e.uris,
        attributes: e.attributes,
        balance: e.balance,
      };
    });
}

function paginate(list, q) {
  const from = Number(q.get("from") || 0);
  const size = Number(q.get("size") || 25);
  return list.slice(from, from + size);
}

function byIdentifiers(list, q, key = "identifier") {
  const ids = q.get("identifiers") || q.get("identifier");
  if (!ids) return list;
  const set = new Set(ids.split(","));
  return list.filter((t) => set.has(t[key]));
}

async function handleAccounts(path, q) {
  const [, , address, kind, id] = path.split("/");
  if (!kind) {
    const { account } = await gw(`/address/${address}`);
    return { address: account.address, balance: account.balance, nonce: account.nonce, username: account.username, shard: undefined };
  }
  if (kind === "tokens") {
    const list = await fungibleTokens(address);
    if (id) return list.find((t) => t.identifier === id) ?? null;
    return paginate(byIdentifiers(list, q), q);
  }
  if (kind === "nfts") {
    let list = await nftTokens(address);
    if (id) return list.find((t) => t.identifier === id) ?? null;
    const cols = q.get("collections") || q.get("collection");
    if (cols) {
      const set = new Set(cols.split(","));
      list = list.filter((t) => set.has(t.collection));
    }
    return paginate(byIdentifiers(list, q), q);
  }
  return undefined;
}

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", "cache-control": "no-store" });
  res.end(JSON.stringify(body));
}

async function forward(req, res, url) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.origin;
  delete headers.referer;
  delete headers["accept-encoding"];
  const upstream = await fetch(`${UPSTREAM}${url.pathname}${url.search}`, {
    method: req.method,
    headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
  const out = Buffer.from(await upstream.arrayBuffer());
  res.writeHead(upstream.status, {
    "content-type": upstream.headers.get("content-type") || "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(out);
}

http
  .createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": req.headers["access-control-request-headers"] || "*",
      });
      return res.end();
    }
    const url = new URL(req.url, "http://localhost");
    try {
      if (req.method === "GET" && /^\/accounts\/erd1[0-9a-z]+(\/(tokens|nfts)(\/[^/]+)?)?$/.test(url.pathname)) {
        const body = await handleAccounts(url.pathname, url.searchParams);
        if (body === null) return send(res, 404, { statusCode: 404, message: "Token for given account not found" });
        if (body !== undefined) return send(res, 200, body);
      }
      await forward(req, res, url);
    } catch (e) {
      send(res, e.status || 502, { statusCode: e.status || 502, message: String(e.message || e) });
    }
  })
  .listen(PORT, () => {
    console.log(`devnet API proxy on http://localhost:${PORT}`);
    console.log(`  /accounts/* <- ${GATEWAY}`);
    console.log(`  everything else -> ${UPSTREAM}`);
  });
