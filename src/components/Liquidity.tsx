// "My liquidity" and "Pools" are merged into a single view (wallet positions
// are shown inside the pool cards). Kept as an alias so the public `Liquidity`
// export and the #liquidity route keep working.
export { Pools as Liquidity } from "./Pools";
