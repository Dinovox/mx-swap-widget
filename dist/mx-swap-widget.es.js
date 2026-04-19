import { jsx as h, jsxs as w, Fragment as dt } from "react/jsx-runtime";
import Be, { createContext as ir, useContext as sr, useEffect as ie, useState as F, useRef as ut, useCallback as At } from "react";
import { initReactI18next as Nr, useTranslation as Ye, I18nextProvider as vr } from "react-i18next";
import pe from "axios";
import { Info as Lr, ArrowUpDown as Sr, Plus as Br, ArrowLeft as Tt, ArrowDown as Er, CheckCircle as Cr } from "lucide-react";
import { useGetAccount as pt } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetAccountInfo as ar } from "@multiversx/sdk-dapp/out/react/account/useGetAccountInfo";
import { useGetNetworkConfig as Je } from "@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig";
import { Address as qe, Transaction as tt } from "@multiversx/sdk-core";
import { GAS_PRICE as rt } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { getAccountProvider as $r } from "@multiversx/sdk-dapp/out/providers/helpers/accountProvider";
import { TransactionManager as Ar } from "@multiversx/sdk-dapp/out/managers/TransactionManager";
import { useGetPendingTransactions as Ir } from "@multiversx/sdk-dapp/out/react/transactions/useGetPendingTransactions";
import B from "bignumber.js";
const or = {
  swap: "/swap",
  liquidity: "/liquidity",
  addLiquidity: "/liquidity/add",
  removeLiquidity: "/liquidity/remove",
  createPool: "/liquidity/create",
  pools: "/liquidity/pools"
}, lr = {
  apiUrl: "https://dex.dinovox.com/api/v1",
  routerAddress: "erd1qqqqqqqqqqqqqpgq67xp5hv48n5vy5d8990uq8kpx99h7rfkfm8s2zqqxn",
  aggregatorAddress: "erd1qqqqqqqqqqqqqpgqly98mw70swxc403a7r63mr7pkzh9uhazfm8suv22ak",
  factoryAddress: "erd1qqqqqqqqqqqqqpgqq5852gnes6xxka35lw42prqwtv6a0znhfm8sn3h9n3",
  wrapContract: "erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3",
  wegldIdentifier: "WEGLD-bd4d79",
  routes: or
}, cr = ir(lr), zo = ({ config: l, children: e }) => {
  const n = {
    ...lr,
    ...l,
    routes: { ...or, ...l == null ? void 0 : l.routes }
  };
  return /* @__PURE__ */ h(cr.Provider, { value: n, children: e });
}, We = () => sr(cr), dr = ir(null), ur = () => sr(dr), q = (l) => typeof l == "string", at = () => {
  let l, e;
  const n = new Promise((i, s) => {
    l = i, e = s;
  });
  return n.resolve = l, n.reject = e, n;
}, Ot = (l) => l == null ? "" : String(l), Tr = (l, e, n) => {
  l.forEach((i) => {
    e[i] && (n[i] = e[i]);
  });
}, Fr = /###/g, Ut = (l) => l && l.includes("###") ? l.replace(Fr, ".") : l, jt = (l) => !l || q(l), lt = (l, e, n) => {
  const i = q(e) ? e.split(".") : e;
  let s = 0;
  for (; s < i.length - 1; ) {
    if (jt(l)) return {};
    const o = Ut(i[s]);
    !l[o] && n && (l[o] = new n()), Object.prototype.hasOwnProperty.call(l, o) ? l = l[o] : l = {}, ++s;
  }
  return jt(l) ? {} : {
    obj: l,
    k: Ut(i[s])
  };
}, Mt = (l, e, n) => {
  const {
    obj: i,
    k: s
  } = lt(l, e, Object);
  if (i !== void 0 || e.length === 1) {
    i[s] = n;
    return;
  }
  let o = e[e.length - 1], c = e.slice(0, e.length - 1), p = lt(l, c, Object);
  for (; p.obj === void 0 && c.length; )
    o = `${c[c.length - 1]}.${o}`, c = c.slice(0, c.length - 1), p = lt(l, c, Object), p != null && p.obj && typeof p.obj[`${p.k}.${o}`] < "u" && (p.obj = void 0);
  p.obj[`${p.k}.${o}`] = n;
}, Rr = (l, e, n, i) => {
  const {
    obj: s,
    k: o
  } = lt(l, e, Object);
  s[o] = s[o] || [], s[o].push(n);
}, bt = (l, e) => {
  const {
    obj: n,
    k: i
  } = lt(l, e);
  if (n && Object.prototype.hasOwnProperty.call(n, i))
    return n[i];
}, Pr = (l, e, n) => {
  const i = bt(l, n);
  return i !== void 0 ? i : bt(e, n);
}, fr = (l, e, n) => {
  for (const i in e)
    i !== "__proto__" && i !== "constructor" && (i in l ? q(l[i]) || l[i] instanceof String || q(e[i]) || e[i] instanceof String ? n && (l[i] = e[i]) : fr(l[i], e[i], n) : l[i] = e[i]);
  return l;
}, He = (l) => l.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), Dr = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;"
}, qr = (l) => q(l) ? l.replace(/[&<>"'\/]/g, (e) => Dr[e]) : l;
class Or {
  constructor(e) {
    this.capacity = e, this.regExpMap = /* @__PURE__ */ new Map(), this.regExpQueue = [];
  }
  getRegExp(e) {
    const n = this.regExpMap.get(e);
    if (n !== void 0)
      return n;
    const i = new RegExp(e);
    return this.regExpQueue.length === this.capacity && this.regExpMap.delete(this.regExpQueue.shift()), this.regExpMap.set(e, i), this.regExpQueue.push(e), i;
  }
}
const Ur = [" ", ",", "?", "!", ";"], jr = new Or(20), Mr = (l, e, n) => {
  e = e || "", n = n || "";
  const i = Ur.filter((c) => !e.includes(c) && !n.includes(c));
  if (i.length === 0) return !0;
  const s = jr.getRegExp(`(${i.map((c) => c === "?" ? "\\?" : c).join("|")})`);
  let o = !s.test(l);
  if (!o) {
    const c = l.indexOf(n);
    c > 0 && !s.test(l.substring(0, c)) && (o = !0);
  }
  return o;
}, It = (l, e, n = ".") => {
  if (!l) return;
  if (l[e])
    return Object.prototype.hasOwnProperty.call(l, e) ? l[e] : void 0;
  const i = e.split(n);
  let s = l;
  for (let o = 0; o < i.length; ) {
    if (!s || typeof s != "object")
      return;
    let c, p = "";
    for (let f = o; f < i.length; ++f)
      if (f !== o && (p += n), p += i[f], c = s[p], c !== void 0) {
        if (["string", "number", "boolean"].includes(typeof c) && f < i.length - 1)
          continue;
        o += f - o + 1;
        break;
      }
    s = c;
  }
  return s;
}, ft = (l) => l == null ? void 0 : l.replace(/_/g, "-"), Vr = {
  type: "logger",
  log(l) {
    this.output("log", l);
  },
  warn(l) {
    this.output("warn", l);
  },
  error(l) {
    this.output("error", l);
  },
  output(l, e) {
    var n, i;
    (i = (n = console == null ? void 0 : console[l]) == null ? void 0 : n.apply) == null || i.call(n, console, e);
  }
};
class yt {
  constructor(e, n = {}) {
    this.init(e, n);
  }
  init(e, n = {}) {
    this.prefix = n.prefix || "i18next:", this.logger = e || Vr, this.options = n, this.debug = n.debug;
  }
  log(...e) {
    return this.forward(e, "log", "", !0);
  }
  warn(...e) {
    return this.forward(e, "warn", "", !0);
  }
  error(...e) {
    return this.forward(e, "error", "");
  }
  deprecate(...e) {
    return this.forward(e, "warn", "WARNING DEPRECATED: ", !0);
  }
  forward(e, n, i, s) {
    return s && !this.debug ? null : (e = e.map((o) => q(o) ? o.replace(/[\r\n\x00-\x1F\x7F]/g, " ") : o), q(e[0]) && (e[0] = `${i}${this.prefix} ${e[0]}`), this.logger[n](e));
  }
  create(e) {
    return new yt(this.logger, {
      prefix: `${this.prefix}:${e}:`,
      ...this.options
    });
  }
  clone(e) {
    return e = e || this.options, e.prefix = e.prefix || this.prefix, new yt(this.logger, e);
  }
}
var Ve = new yt();
class _t {
  constructor() {
    this.observers = {};
  }
  on(e, n) {
    return e.split(" ").forEach((i) => {
      this.observers[i] || (this.observers[i] = /* @__PURE__ */ new Map());
      const s = this.observers[i].get(n) || 0;
      this.observers[i].set(n, s + 1);
    }), this;
  }
  off(e, n) {
    if (this.observers[e]) {
      if (!n) {
        delete this.observers[e];
        return;
      }
      this.observers[e].delete(n);
    }
  }
  once(e, n) {
    const i = (...s) => {
      n(...s), this.off(e, i);
    };
    return this.on(e, i), this;
  }
  emit(e, ...n) {
    this.observers[e] && Array.from(this.observers[e].entries()).forEach(([s, o]) => {
      for (let c = 0; c < o; c++)
        s(...n);
    }), this.observers["*"] && Array.from(this.observers["*"].entries()).forEach(([s, o]) => {
      for (let c = 0; c < o; c++)
        s(e, ...n);
    });
  }
}
class Vt extends _t {
  constructor(e, n = {
    ns: ["translation"],
    defaultNS: "translation"
  }) {
    super(), this.data = e || {}, this.options = n, this.options.keySeparator === void 0 && (this.options.keySeparator = "."), this.options.ignoreJSONStructure === void 0 && (this.options.ignoreJSONStructure = !0);
  }
  addNamespaces(e) {
    this.options.ns.includes(e) || this.options.ns.push(e);
  }
  removeNamespaces(e) {
    const n = this.options.ns.indexOf(e);
    n > -1 && this.options.ns.splice(n, 1);
  }
  getResource(e, n, i, s = {}) {
    var m, u;
    const o = s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator, c = s.ignoreJSONStructure !== void 0 ? s.ignoreJSONStructure : this.options.ignoreJSONStructure;
    let p;
    e.includes(".") ? p = e.split(".") : (p = [e, n], i && (Array.isArray(i) ? p.push(...i) : q(i) && o ? p.push(...i.split(o)) : p.push(i)));
    const f = bt(this.data, p);
    return !f && !n && !i && e.includes(".") && (e = p[0], n = p[1], i = p.slice(2).join(".")), f || !c || !q(i) ? f : It((u = (m = this.data) == null ? void 0 : m[e]) == null ? void 0 : u[n], i, o);
  }
  addResource(e, n, i, s, o = {
    silent: !1
  }) {
    const c = o.keySeparator !== void 0 ? o.keySeparator : this.options.keySeparator;
    let p = [e, n];
    i && (p = p.concat(c ? i.split(c) : i)), e.includes(".") && (p = e.split("."), s = n, n = p[1]), this.addNamespaces(n), Mt(this.data, p, s), o.silent || this.emit("added", e, n, i, s);
  }
  addResources(e, n, i, s = {
    silent: !1
  }) {
    for (const o in i)
      (q(i[o]) || Array.isArray(i[o])) && this.addResource(e, n, o, i[o], {
        silent: !0
      });
    s.silent || this.emit("added", e, n, i);
  }
  addResourceBundle(e, n, i, s, o, c = {
    silent: !1,
    skipCopy: !1
  }) {
    let p = [e, n];
    e.includes(".") && (p = e.split("."), s = i, i = n, n = p[1]), this.addNamespaces(n);
    let f = bt(this.data, p) || {};
    c.skipCopy || (i = JSON.parse(JSON.stringify(i))), s ? fr(f, i, o) : f = {
      ...f,
      ...i
    }, Mt(this.data, p, f), c.silent || this.emit("added", e, n, i);
  }
  removeResourceBundle(e, n) {
    this.hasResourceBundle(e, n) && delete this.data[e][n], this.removeNamespaces(n), this.emit("removed", e, n);
  }
  hasResourceBundle(e, n) {
    return this.getResource(e, n) !== void 0;
  }
  getResourceBundle(e, n) {
    return n || (n = this.options.defaultNS), this.getResource(e, n);
  }
  getDataByLanguage(e) {
    return this.data[e];
  }
  hasLanguageSomeTranslations(e) {
    const n = this.getDataByLanguage(e);
    return !!(n && Object.keys(n) || []).find((s) => n[s] && Object.keys(n[s]).length > 0);
  }
  toJSON() {
    return this.data;
  }
}
var pr = {
  processors: {},
  addPostProcessor(l) {
    this.processors[l.name] = l;
  },
  handle(l, e, n, i, s) {
    return l.forEach((o) => {
      var c;
      e = ((c = this.processors[o]) == null ? void 0 : c.process(e, n, i, s)) ?? e;
    }), e;
  }
};
const hr = Symbol("i18next/PATH_KEY");
function Wr() {
  const l = [], e = /* @__PURE__ */ Object.create(null);
  let n;
  return e.get = (i, s) => {
    var o;
    return (o = n == null ? void 0 : n.revoke) == null || o.call(n), s === hr ? l : (l.push(s), n = Proxy.revocable(i, e), n.proxy);
  }, Proxy.revocable(/* @__PURE__ */ Object.create(null), e).proxy;
}
function et(l, e) {
  const {
    [hr]: n
  } = l(Wr()), i = (e == null ? void 0 : e.keySeparator) ?? ".", s = (e == null ? void 0 : e.nsSeparator) ?? ":";
  if (n.length > 1 && s) {
    const o = e == null ? void 0 : e.ns, c = Array.isArray(o) ? o : null;
    if (c && c.length > 1 && c.slice(1).includes(n[0]))
      return `${n[0]}${s}${n.slice(1).join(i)}`;
  }
  return n.join(i);
}
const Lt = (l) => !q(l) && typeof l != "boolean" && typeof l != "number";
class wt extends _t {
  constructor(e, n = {}) {
    super(), Tr(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], e, this), this.options = n, this.options.keySeparator === void 0 && (this.options.keySeparator = "."), this.logger = Ve.create("translator"), this.checkedLoadedFor = {};
  }
  changeLanguage(e) {
    e && (this.language = e);
  }
  exists(e, n = {
    interpolation: {}
  }) {
    const i = {
      ...n
    };
    if (e == null) return !1;
    const s = this.resolve(e, i);
    if ((s == null ? void 0 : s.res) === void 0) return !1;
    const o = Lt(s.res);
    return !(i.returnObjects === !1 && o);
  }
  extractFromKey(e, n) {
    let i = n.nsSeparator !== void 0 ? n.nsSeparator : this.options.nsSeparator;
    i === void 0 && (i = ":");
    const s = n.keySeparator !== void 0 ? n.keySeparator : this.options.keySeparator;
    let o = n.ns || this.options.defaultNS || [];
    const c = i && e.includes(i), p = !this.options.userDefinedKeySeparator && !n.keySeparator && !this.options.userDefinedNsSeparator && !n.nsSeparator && !Mr(e, i, s);
    if (c && !p) {
      const f = e.match(this.interpolator.nestingRegexp);
      if (f && f.length > 0)
        return {
          key: e,
          namespaces: q(o) ? [o] : o
        };
      const m = e.split(i);
      (i !== s || i === s && this.options.ns.includes(m[0])) && (o = m.shift()), e = m.join(s);
    }
    return {
      key: e,
      namespaces: q(o) ? [o] : o
    };
  }
  translate(e, n, i) {
    let s = typeof n == "object" ? {
      ...n
    } : n;
    if (typeof s != "object" && this.options.overloadTranslationOptionHandler && (s = this.options.overloadTranslationOptionHandler(arguments)), typeof s == "object" && (s = {
      ...s
    }), s || (s = {}), e == null) return "";
    typeof e == "function" && (e = et(e, {
      ...this.options,
      ...s
    })), Array.isArray(e) || (e = [String(e)]), e = e.map((K) => typeof K == "function" ? et(K, {
      ...this.options,
      ...s
    }) : String(K));
    const o = s.returnDetails !== void 0 ? s.returnDetails : this.options.returnDetails, c = s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator, {
      key: p,
      namespaces: f
    } = this.extractFromKey(e[e.length - 1], s), m = f[f.length - 1];
    let u = s.nsSeparator !== void 0 ? s.nsSeparator : this.options.nsSeparator;
    u === void 0 && (u = ":");
    const y = s.lng || this.language, S = s.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
    if ((y == null ? void 0 : y.toLowerCase()) === "cimode")
      return S ? o ? {
        res: `${m}${u}${p}`,
        usedKey: p,
        exactUsedKey: p,
        usedLng: y,
        usedNS: m,
        usedParams: this.getUsedParamsDetails(s)
      } : `${m}${u}${p}` : o ? {
        res: p,
        usedKey: p,
        exactUsedKey: p,
        usedLng: y,
        usedNS: m,
        usedParams: this.getUsedParamsDetails(s)
      } : p;
    const _ = this.resolve(e, s);
    let x = _ == null ? void 0 : _.res;
    const v = (_ == null ? void 0 : _.usedKey) || p, k = (_ == null ? void 0 : _.exactUsedKey) || p, E = ["[object Number]", "[object Function]", "[object RegExp]"], D = s.joinArrays !== void 0 ? s.joinArrays : this.options.joinArrays, R = !this.i18nFormat || this.i18nFormat.handleAsObject, U = s.count !== void 0 && !q(s.count), L = wt.hasDefaultValue(s), ee = U ? this.pluralResolver.getSuffix(y, s.count, s) : "", C = s.ordinal && U ? this.pluralResolver.getSuffix(y, s.count, {
      ordinal: !1
    }) : "", ae = U && !s.ordinal && s.count === 0, A = ae && s[`defaultValue${this.options.pluralSeparator}zero`] || s[`defaultValue${ee}`] || s[`defaultValue${C}`] || s.defaultValue;
    let O = x;
    R && !x && L && (O = A);
    const ge = Lt(O), me = Object.prototype.toString.apply(O);
    if (R && O && ge && !E.includes(me) && !(q(D) && Array.isArray(O))) {
      if (!s.returnObjects && !this.options.returnObjects) {
        this.options.returnedObjectHandler || this.logger.warn("accessing an object - but returnObjects options is not enabled!");
        const K = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(v, O, {
          ...s,
          ns: f
        }) : `key '${p} (${this.language})' returned an object instead of string.`;
        return o ? (_.res = K, _.usedParams = this.getUsedParamsDetails(s), _) : K;
      }
      if (c) {
        const K = Array.isArray(O), T = K ? [] : {}, W = K ? k : v;
        for (const P in O)
          if (Object.prototype.hasOwnProperty.call(O, P)) {
            const Y = `${W}${c}${P}`;
            L && !x ? T[P] = this.translate(Y, {
              ...s,
              defaultValue: Lt(A) ? A[P] : void 0,
              joinArrays: !1,
              ns: f
            }) : T[P] = this.translate(Y, {
              ...s,
              joinArrays: !1,
              ns: f
            }), T[P] === Y && (T[P] = O[P]);
          }
        x = T;
      }
    } else if (R && q(D) && Array.isArray(x))
      x = x.join(D), x && (x = this.extendTranslation(x, e, s, i));
    else {
      let K = !1, T = !1;
      !this.isValidLookup(x) && L && (K = !0, x = A), this.isValidLookup(x) || (T = !0, x = p);
      const P = (s.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey) && T ? void 0 : x, Y = L && A !== x && this.options.updateMissing;
      if (T || K || Y) {
        if (this.logger.log(Y ? "updateKey" : "missingKey", y, m, p, Y ? A : x), c) {
          const te = this.resolve(p, {
            ...s,
            keySeparator: !1
          });
          te && te.res && this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
        }
        let he = [];
        const Ee = this.languageUtils.getFallbackCodes(this.options.fallbackLng, s.lng || this.language);
        if (this.options.saveMissingTo === "fallback" && Ee && Ee[0])
          for (let te = 0; te < Ee.length; te++)
            he.push(Ee[te]);
        else this.options.saveMissingTo === "all" ? he = this.languageUtils.toResolveHierarchy(s.lng || this.language) : he.push(s.lng || this.language);
        const ke = (te, se, xe) => {
          var re;
          const J = L && xe !== x ? xe : P;
          this.options.missingKeyHandler ? this.options.missingKeyHandler(te, m, se, J, Y, s) : (re = this.backendConnector) != null && re.saveMissing && this.backendConnector.saveMissing(te, m, se, J, Y, s), this.emit("missingKey", te, m, se, x);
        };
        this.options.saveMissing && (this.options.saveMissingPlurals && U ? he.forEach((te) => {
          const se = this.pluralResolver.getSuffixes(te, s);
          ae && s[`defaultValue${this.options.pluralSeparator}zero`] && !se.includes(`${this.options.pluralSeparator}zero`) && se.push(`${this.options.pluralSeparator}zero`), se.forEach((xe) => {
            ke([te], p + xe, s[`defaultValue${xe}`] || A);
          });
        }) : ke(he, p, A));
      }
      x = this.extendTranslation(x, e, s, _, i), T && x === p && this.options.appendNamespaceToMissingKey && (x = `${m}${u}${p}`), (T || K) && this.options.parseMissingKeyHandler && (x = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? `${m}${u}${p}` : p, K ? x : void 0, s));
    }
    return o ? (_.res = x, _.usedParams = this.getUsedParamsDetails(s), _) : x;
  }
  extendTranslation(e, n, i, s, o) {
    var f, m;
    if ((f = this.i18nFormat) != null && f.parse)
      e = this.i18nFormat.parse(e, {
        ...this.options.interpolation.defaultVariables,
        ...i
      }, i.lng || this.language || s.usedLng, s.usedNS, s.usedKey, {
        resolved: s
      });
    else if (!i.skipInterpolation) {
      i.interpolation && this.interpolator.init({
        ...i,
        interpolation: {
          ...this.options.interpolation,
          ...i.interpolation
        }
      });
      const u = q(e) && (((m = i == null ? void 0 : i.interpolation) == null ? void 0 : m.skipOnVariables) !== void 0 ? i.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables);
      let y;
      if (u) {
        const _ = e.match(this.interpolator.nestingRegexp);
        y = _ && _.length;
      }
      let S = i.replace && !q(i.replace) ? i.replace : i;
      if (this.options.interpolation.defaultVariables && (S = {
        ...this.options.interpolation.defaultVariables,
        ...S
      }), e = this.interpolator.interpolate(e, S, i.lng || this.language || s.usedLng, i), u) {
        const _ = e.match(this.interpolator.nestingRegexp), x = _ && _.length;
        y < x && (i.nest = !1);
      }
      !i.lng && s && s.res && (i.lng = this.language || s.usedLng), i.nest !== !1 && (e = this.interpolator.nest(e, (..._) => (o == null ? void 0 : o[0]) === _[0] && !i.context ? (this.logger.warn(`It seems you are nesting recursively key: ${_[0]} in key: ${n[0]}`), null) : this.translate(..._, n), i)), i.interpolation && this.interpolator.reset();
    }
    const c = i.postProcess || this.options.postProcess, p = q(c) ? [c] : c;
    return e != null && (p != null && p.length) && i.applyPostProcessor !== !1 && (e = pr.handle(p, e, n, this.options && this.options.postProcessPassResolved ? {
      i18nResolved: {
        ...s,
        usedParams: this.getUsedParamsDetails(i)
      },
      ...i
    } : i, this)), e;
  }
  resolve(e, n = {}) {
    let i, s, o, c, p;
    return q(e) && (e = [e]), Array.isArray(e) && (e = e.map((f) => typeof f == "function" ? et(f, {
      ...this.options,
      ...n
    }) : f)), e.forEach((f) => {
      if (this.isValidLookup(i)) return;
      const m = this.extractFromKey(f, n), u = m.key;
      s = u;
      let y = m.namespaces;
      this.options.fallbackNS && (y = y.concat(this.options.fallbackNS));
      const S = n.count !== void 0 && !q(n.count), _ = S && !n.ordinal && n.count === 0, x = n.context !== void 0 && (q(n.context) || typeof n.context == "number") && n.context !== "", v = n.lngs ? n.lngs : this.languageUtils.toResolveHierarchy(n.lng || this.language, n.fallbackLng);
      y.forEach((k) => {
        var E, D;
        this.isValidLookup(i) || (p = k, !this.checkedLoadedFor[`${v[0]}-${k}`] && ((E = this.utils) != null && E.hasLoadedNamespace) && !((D = this.utils) != null && D.hasLoadedNamespace(p)) && (this.checkedLoadedFor[`${v[0]}-${k}`] = !0, this.logger.warn(`key "${s}" for languages "${v.join(", ")}" won't get resolved as namespace "${p}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!")), v.forEach((R) => {
          var ee;
          if (this.isValidLookup(i)) return;
          c = R;
          const U = [u];
          if ((ee = this.i18nFormat) != null && ee.addLookupKeys)
            this.i18nFormat.addLookupKeys(U, u, R, k, n);
          else {
            let C;
            S && (C = this.pluralResolver.getSuffix(R, n.count, n));
            const ae = `${this.options.pluralSeparator}zero`, A = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
            if (S && (n.ordinal && C.startsWith(A) && U.push(u + C.replace(A, this.options.pluralSeparator)), U.push(u + C), _ && U.push(u + ae)), x) {
              const O = `${u}${this.options.contextSeparator || "_"}${n.context}`;
              U.push(O), S && (n.ordinal && C.startsWith(A) && U.push(O + C.replace(A, this.options.pluralSeparator)), U.push(O + C), _ && U.push(O + ae));
            }
          }
          let L;
          for (; L = U.pop(); )
            this.isValidLookup(i) || (o = L, i = this.getResource(R, k, L, n));
        }));
      });
    }), {
      res: i,
      usedKey: s,
      exactUsedKey: o,
      usedLng: c,
      usedNS: p
    };
  }
  isValidLookup(e) {
    return e !== void 0 && !(!this.options.returnNull && e === null) && !(!this.options.returnEmptyString && e === "");
  }
  getResource(e, n, i, s = {}) {
    var o;
    return (o = this.i18nFormat) != null && o.getResource ? this.i18nFormat.getResource(e, n, i, s) : this.resourceStore.getResource(e, n, i, s);
  }
  getUsedParamsDetails(e = {}) {
    const n = ["defaultValue", "ordinal", "context", "replace", "lng", "lngs", "fallbackLng", "ns", "keySeparator", "nsSeparator", "returnObjects", "returnDetails", "joinArrays", "postProcess", "interpolation"], i = e.replace && !q(e.replace);
    let s = i ? e.replace : e;
    if (i && typeof e.count < "u" && (s.count = e.count), this.options.interpolation.defaultVariables && (s = {
      ...this.options.interpolation.defaultVariables,
      ...s
    }), !i) {
      s = {
        ...s
      };
      for (const o of n)
        delete s[o];
    }
    return s;
  }
  static hasDefaultValue(e) {
    const n = "defaultValue";
    for (const i in e)
      if (Object.prototype.hasOwnProperty.call(e, i) && i.startsWith(n) && e[i] !== void 0)
        return !0;
    return !1;
  }
}
class Wt {
  constructor(e) {
    this.options = e, this.supportedLngs = this.options.supportedLngs || !1, this.logger = Ve.create("languageUtils");
  }
  getScriptPartFromCode(e) {
    if (e = ft(e), !e || !e.includes("-")) return null;
    const n = e.split("-");
    return n.length === 2 || (n.pop(), n[n.length - 1].toLowerCase() === "x") ? null : this.formatLanguageCode(n.join("-"));
  }
  getLanguagePartFromCode(e) {
    if (e = ft(e), !e || !e.includes("-")) return e;
    const n = e.split("-");
    return this.formatLanguageCode(n[0]);
  }
  formatLanguageCode(e) {
    if (q(e) && e.includes("-")) {
      let n;
      try {
        n = Intl.getCanonicalLocales(e)[0];
      } catch {
      }
      return n && this.options.lowerCaseLng && (n = n.toLowerCase()), n || (this.options.lowerCaseLng ? e.toLowerCase() : e);
    }
    return this.options.cleanCode || this.options.lowerCaseLng ? e.toLowerCase() : e;
  }
  isSupportedCode(e) {
    return (this.options.load === "languageOnly" || this.options.nonExplicitSupportedLngs) && (e = this.getLanguagePartFromCode(e)), !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.includes(e);
  }
  getBestMatchFromCodes(e) {
    if (!e) return null;
    let n;
    return e.forEach((i) => {
      if (n) return;
      const s = this.formatLanguageCode(i);
      (!this.options.supportedLngs || this.isSupportedCode(s)) && (n = s);
    }), !n && this.options.supportedLngs && e.forEach((i) => {
      if (n) return;
      const s = this.getScriptPartFromCode(i);
      if (this.isSupportedCode(s)) return n = s;
      const o = this.getLanguagePartFromCode(i);
      if (this.isSupportedCode(o)) return n = o;
      n = this.options.supportedLngs.find((c) => c === o ? !0 : !c.includes("-") && !o.includes("-") ? !1 : !!(c.includes("-") && !o.includes("-") && c.slice(0, c.indexOf("-")) === o || c.startsWith(o) && o.length > 1));
    }), n || (n = this.getFallbackCodes(this.options.fallbackLng)[0]), n;
  }
  getFallbackCodes(e, n) {
    if (!e) return [];
    if (typeof e == "function" && (e = e(n)), q(e) && (e = [e]), Array.isArray(e)) return e;
    if (!n) return e.default || [];
    let i = e[n];
    return i || (i = e[this.getScriptPartFromCode(n)]), i || (i = e[this.formatLanguageCode(n)]), i || (i = e[this.getLanguagePartFromCode(n)]), i || (i = e.default), i || [];
  }
  toResolveHierarchy(e, n) {
    const i = this.getFallbackCodes((n === !1 ? [] : n) || this.options.fallbackLng || [], e), s = [], o = (c) => {
      c && (this.isSupportedCode(c) ? s.push(c) : this.logger.warn(`rejecting language code not found in supportedLngs: ${c}`));
    };
    return q(e) && (e.includes("-") || e.includes("_")) ? (this.options.load !== "languageOnly" && o(this.formatLanguageCode(e)), this.options.load !== "languageOnly" && this.options.load !== "currentOnly" && o(this.getScriptPartFromCode(e)), this.options.load !== "currentOnly" && o(this.getLanguagePartFromCode(e))) : q(e) && o(this.formatLanguageCode(e)), i.forEach((c) => {
      s.includes(c) || o(this.formatLanguageCode(c));
    }), s;
  }
}
const Gt = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 4,
  other: 5
}, Ht = {
  select: (l) => l === 1 ? "one" : "other",
  resolvedOptions: () => ({
    pluralCategories: ["one", "other"]
  })
};
class Gr {
  constructor(e, n = {}) {
    this.languageUtils = e, this.options = n, this.logger = Ve.create("pluralResolver"), this.pluralRulesCache = {};
  }
  clearCache() {
    this.pluralRulesCache = {};
  }
  getRule(e, n = {}) {
    const i = ft(e === "dev" ? "en" : e), s = n.ordinal ? "ordinal" : "cardinal", o = JSON.stringify({
      cleanedCode: i,
      type: s
    });
    if (o in this.pluralRulesCache)
      return this.pluralRulesCache[o];
    let c;
    try {
      c = new Intl.PluralRules(i, {
        type: s
      });
    } catch {
      if (typeof Intl > "u")
        return this.logger.error("No Intl support, please use an Intl polyfill!"), Ht;
      if (!e.match(/-|_/)) return Ht;
      const f = this.languageUtils.getLanguagePartFromCode(e);
      c = this.getRule(f, n);
    }
    return this.pluralRulesCache[o] = c, c;
  }
  needsPlural(e, n = {}) {
    let i = this.getRule(e, n);
    return i || (i = this.getRule("dev", n)), (i == null ? void 0 : i.resolvedOptions().pluralCategories.length) > 1;
  }
  getPluralFormsOfKey(e, n, i = {}) {
    return this.getSuffixes(e, i).map((s) => `${n}${s}`);
  }
  getSuffixes(e, n = {}) {
    let i = this.getRule(e, n);
    return i || (i = this.getRule("dev", n)), i ? i.resolvedOptions().pluralCategories.sort((s, o) => Gt[s] - Gt[o]).map((s) => `${this.options.prepend}${n.ordinal ? `ordinal${this.options.prepend}` : ""}${s}`) : [];
  }
  getSuffix(e, n, i = {}) {
    const s = this.getRule(e, i);
    return s ? `${this.options.prepend}${i.ordinal ? `ordinal${this.options.prepend}` : ""}${s.select(n)}` : (this.logger.warn(`no plural rule found for: ${e}`), this.getSuffix("dev", n, i));
  }
}
const zt = (l, e, n, i = ".", s = !0) => {
  let o = Pr(l, e, n);
  return !o && s && q(n) && (o = It(l, n, i), o === void 0 && (o = It(e, n, i))), o;
}, St = (l) => l.replace(/\$/g, "$$$$");
class Kt {
  constructor(e = {}) {
    var n;
    this.logger = Ve.create("interpolator"), this.options = e, this.format = ((n = e == null ? void 0 : e.interpolation) == null ? void 0 : n.format) || ((i) => i), this.init(e);
  }
  init(e = {}) {
    e.interpolation || (e.interpolation = {
      escapeValue: !0
    });
    const {
      escape: n,
      escapeValue: i,
      useRawValueToEscape: s,
      prefix: o,
      prefixEscaped: c,
      suffix: p,
      suffixEscaped: f,
      formatSeparator: m,
      unescapeSuffix: u,
      unescapePrefix: y,
      nestingPrefix: S,
      nestingPrefixEscaped: _,
      nestingSuffix: x,
      nestingSuffixEscaped: v,
      nestingOptionsSeparator: k,
      maxReplaces: E,
      alwaysFormat: D
    } = e.interpolation;
    this.escape = n !== void 0 ? n : qr, this.escapeValue = i !== void 0 ? i : !0, this.useRawValueToEscape = s !== void 0 ? s : !1, this.prefix = o ? He(o) : c || "{{", this.suffix = p ? He(p) : f || "}}", this.formatSeparator = m || ",", this.unescapePrefix = u ? "" : y ? He(y) : "-", this.unescapeSuffix = this.unescapePrefix ? "" : u ? He(u) : "", this.nestingPrefix = S ? He(S) : _ || He("$t("), this.nestingSuffix = x ? He(x) : v || He(")"), this.nestingOptionsSeparator = k || ",", this.maxReplaces = E || 1e3, this.alwaysFormat = D !== void 0 ? D : !1, this.resetRegExp();
  }
  reset() {
    this.options && this.init(this.options);
  }
  resetRegExp() {
    const e = (n, i) => (n == null ? void 0 : n.source) === i ? (n.lastIndex = 0, n) : new RegExp(i, "g");
    this.regexp = e(this.regexp, `${this.prefix}(.+?)${this.suffix}`), this.regexpUnescape = e(this.regexpUnescape, `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`), this.nestingRegexp = e(this.nestingRegexp, `${this.nestingPrefix}((?:[^()"']+|"[^"]*"|'[^']*'|\\((?:[^()]|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`);
  }
  interpolate(e, n, i, s) {
    var _;
    let o, c, p;
    const f = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {}, m = (x) => {
      if (!x.includes(this.formatSeparator)) {
        const D = zt(n, f, x, this.options.keySeparator, this.options.ignoreJSONStructure);
        return this.alwaysFormat ? this.format(D, void 0, i, {
          ...s,
          ...n,
          interpolationkey: x
        }) : D;
      }
      const v = x.split(this.formatSeparator), k = v.shift().trim(), E = v.join(this.formatSeparator).trim();
      return this.format(zt(n, f, k, this.options.keySeparator, this.options.ignoreJSONStructure), E, i, {
        ...s,
        ...n,
        interpolationkey: k
      });
    };
    this.resetRegExp(), !this.escapeValue && typeof e == "string" && /\$t\([^)]*\{[^}]*\{\{/.test(e) && this.logger.warn("nesting options string contains interpolated variables with escapeValue: false — if any of those values are attacker-controlled they can inject additional nesting options (e.g. redirect lng/ns). Sanitise untrusted input before passing it to t(), or keep escapeValue: true.");
    const u = (s == null ? void 0 : s.missingInterpolationHandler) || this.options.missingInterpolationHandler, y = ((_ = s == null ? void 0 : s.interpolation) == null ? void 0 : _.skipOnVariables) !== void 0 ? s.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables;
    return [{
      regex: this.regexpUnescape,
      safeValue: (x) => St(x)
    }, {
      regex: this.regexp,
      safeValue: (x) => this.escapeValue ? St(this.escape(x)) : St(x)
    }].forEach((x) => {
      for (p = 0; o = x.regex.exec(e); ) {
        const v = o[1].trim();
        if (c = m(v), c === void 0)
          if (typeof u == "function") {
            const E = u(e, o, s);
            c = q(E) ? E : "";
          } else if (s && Object.prototype.hasOwnProperty.call(s, v))
            c = "";
          else if (y) {
            c = o[0];
            continue;
          } else
            this.logger.warn(`missed to pass in variable ${v} for interpolating ${e}`), c = "";
        else !q(c) && !this.useRawValueToEscape && (c = Ot(c));
        const k = x.safeValue(c);
        if (e = e.replace(o[0], k), y ? (x.regex.lastIndex += c.length, x.regex.lastIndex -= o[0].length) : x.regex.lastIndex = 0, p++, p >= this.maxReplaces)
          break;
      }
    }), e;
  }
  nest(e, n, i = {}) {
    let s, o, c;
    const p = (f, m) => {
      const u = this.nestingOptionsSeparator;
      if (!f.includes(u)) return f;
      const y = f.split(new RegExp(`${He(u)}[ ]*{`));
      let S = `{${y[1]}`;
      f = y[0], S = this.interpolate(S, c);
      const _ = S.match(/'/g), x = S.match(/"/g);
      (((_ == null ? void 0 : _.length) ?? 0) % 2 === 0 && !x || ((x == null ? void 0 : x.length) ?? 0) % 2 !== 0) && (S = S.replace(/'/g, '"'));
      try {
        c = JSON.parse(S), m && (c = {
          ...m,
          ...c
        });
      } catch (v) {
        return this.logger.warn(`failed parsing options string in nesting for key ${f}`, v), `${f}${u}${S}`;
      }
      return c.defaultValue && c.defaultValue.includes(this.prefix) && delete c.defaultValue, f;
    };
    for (; s = this.nestingRegexp.exec(e); ) {
      let f = [];
      c = {
        ...i
      }, c = c.replace && !q(c.replace) ? c.replace : c, c.applyPostProcessor = !1, delete c.defaultValue;
      const m = /{.*}/.test(s[1]) ? s[1].lastIndexOf("}") + 1 : s[1].indexOf(this.formatSeparator);
      if (m !== -1 && (f = s[1].slice(m).split(this.formatSeparator).map((u) => u.trim()).filter(Boolean), s[1] = s[1].slice(0, m)), o = n(p.call(this, s[1].trim(), c), c), o && s[0] === e && !q(o)) return o;
      q(o) || (o = Ot(o)), o || (this.logger.warn(`missed to resolve ${s[1]} for nesting ${e}`), o = ""), f.length && (o = f.reduce((u, y) => this.format(u, y, i.lng, {
        ...i,
        interpolationkey: s[1].trim()
      }), o.trim())), e = e.replace(s[0], o), this.regexp.lastIndex = 0;
    }
    return e;
  }
}
const Hr = (l) => {
  let e = l.toLowerCase().trim();
  const n = {};
  if (l.includes("(")) {
    const i = l.split("(");
    e = i[0].toLowerCase().trim();
    const s = i[1].slice(0, -1);
    e === "currency" && !s.includes(":") ? n.currency || (n.currency = s.trim()) : e === "relativetime" && !s.includes(":") ? n.range || (n.range = s.trim()) : s.split(";").forEach((c) => {
      if (c) {
        const [p, ...f] = c.split(":"), m = f.join(":").trim().replace(/^'+|'+$/g, ""), u = p.trim();
        n[u] || (n[u] = m), m === "false" && (n[u] = !1), m === "true" && (n[u] = !0), isNaN(m) || (n[u] = parseInt(m, 10));
      }
    });
  }
  return {
    formatName: e,
    formatOptions: n
  };
}, Yt = (l) => {
  const e = {};
  return (n, i, s) => {
    let o = s;
    s && s.interpolationkey && s.formatParams && s.formatParams[s.interpolationkey] && s[s.interpolationkey] && (o = {
      ...o,
      [s.interpolationkey]: void 0
    });
    const c = i + JSON.stringify(o);
    let p = e[c];
    return p || (p = l(ft(i), s), e[c] = p), p(n);
  };
}, zr = (l) => (e, n, i) => l(ft(n), i)(e);
class Kr {
  constructor(e = {}) {
    this.logger = Ve.create("formatter"), this.options = e, this.init(e);
  }
  init(e, n = {
    interpolation: {}
  }) {
    this.formatSeparator = n.interpolation.formatSeparator || ",";
    const i = n.cacheInBuiltFormats ? Yt : zr;
    this.formats = {
      number: i((s, o) => {
        const c = new Intl.NumberFormat(s, {
          ...o
        });
        return (p) => c.format(p);
      }),
      currency: i((s, o) => {
        const c = new Intl.NumberFormat(s, {
          ...o,
          style: "currency"
        });
        return (p) => c.format(p);
      }),
      datetime: i((s, o) => {
        const c = new Intl.DateTimeFormat(s, {
          ...o
        });
        return (p) => c.format(p);
      }),
      relativetime: i((s, o) => {
        const c = new Intl.RelativeTimeFormat(s, {
          ...o
        });
        return (p) => c.format(p, o.range || "day");
      }),
      list: i((s, o) => {
        const c = new Intl.ListFormat(s, {
          ...o
        });
        return (p) => c.format(p);
      })
    };
  }
  add(e, n) {
    this.formats[e.toLowerCase().trim()] = n;
  }
  addCached(e, n) {
    this.formats[e.toLowerCase().trim()] = Yt(n);
  }
  format(e, n, i, s = {}) {
    if (!n || e == null) return e;
    const o = n.split(this.formatSeparator);
    if (o.length > 1 && o[0].indexOf("(") > 1 && !o[0].includes(")") && o.find((p) => p.includes(")"))) {
      const p = o.findIndex((f) => f.includes(")"));
      o[0] = [o[0], ...o.splice(1, p)].join(this.formatSeparator);
    }
    return o.reduce((p, f) => {
      var y;
      const {
        formatName: m,
        formatOptions: u
      } = Hr(f);
      if (this.formats[m]) {
        let S = p;
        try {
          const _ = ((y = s == null ? void 0 : s.formatParams) == null ? void 0 : y[s.interpolationkey]) || {}, x = _.locale || _.lng || s.locale || s.lng || i;
          S = this.formats[m](p, x, {
            ...u,
            ...s,
            ..._
          });
        } catch (_) {
          this.logger.warn(_);
        }
        return S;
      } else
        this.logger.warn(`there was no format function for ${m}`);
      return p;
    }, e);
  }
}
const Yr = (l, e) => {
  l.pending[e] !== void 0 && (delete l.pending[e], l.pendingCount--);
};
class Jr extends _t {
  constructor(e, n, i, s = {}) {
    var o, c;
    super(), this.backend = e, this.store = n, this.services = i, this.languageUtils = i.languageUtils, this.options = s, this.logger = Ve.create("backendConnector"), this.waitingReads = [], this.maxParallelReads = s.maxParallelReads || 10, this.readingCalls = 0, this.maxRetries = s.maxRetries >= 0 ? s.maxRetries : 5, this.retryTimeout = s.retryTimeout >= 1 ? s.retryTimeout : 350, this.state = {}, this.queue = [], (c = (o = this.backend) == null ? void 0 : o.init) == null || c.call(o, i, s.backend, s);
  }
  queueLoad(e, n, i, s) {
    const o = {}, c = {}, p = {}, f = {};
    return e.forEach((m) => {
      let u = !0;
      n.forEach((y) => {
        const S = `${m}|${y}`;
        !i.reload && this.store.hasResourceBundle(m, y) ? this.state[S] = 2 : this.state[S] < 0 || (this.state[S] === 1 ? c[S] === void 0 && (c[S] = !0) : (this.state[S] = 1, u = !1, c[S] === void 0 && (c[S] = !0), o[S] === void 0 && (o[S] = !0), f[y] === void 0 && (f[y] = !0)));
      }), u || (p[m] = !0);
    }), (Object.keys(o).length || Object.keys(c).length) && this.queue.push({
      pending: c,
      pendingCount: Object.keys(c).length,
      loaded: {},
      errors: [],
      callback: s
    }), {
      toLoad: Object.keys(o),
      pending: Object.keys(c),
      toLoadLanguages: Object.keys(p),
      toLoadNamespaces: Object.keys(f)
    };
  }
  loaded(e, n, i) {
    const s = e.split("|"), o = s[0], c = s[1];
    n && this.emit("failedLoading", o, c, n), !n && i && this.store.addResourceBundle(o, c, i, void 0, void 0, {
      skipCopy: !0
    }), this.state[e] = n ? -1 : 2, n && i && (this.state[e] = 0);
    const p = {};
    this.queue.forEach((f) => {
      Rr(f.loaded, [o], c), Yr(f, e), n && f.errors.push(n), f.pendingCount === 0 && !f.done && (Object.keys(f.loaded).forEach((m) => {
        p[m] || (p[m] = {});
        const u = f.loaded[m];
        u.length && u.forEach((y) => {
          p[m][y] === void 0 && (p[m][y] = !0);
        });
      }), f.done = !0, f.errors.length ? f.callback(f.errors) : f.callback());
    }), this.emit("loaded", p), this.queue = this.queue.filter((f) => !f.done);
  }
  read(e, n, i, s = 0, o = this.retryTimeout, c) {
    if (!e.length) return c(null, {});
    if (this.readingCalls >= this.maxParallelReads) {
      this.waitingReads.push({
        lng: e,
        ns: n,
        fcName: i,
        tried: s,
        wait: o,
        callback: c
      });
      return;
    }
    this.readingCalls++;
    const p = (m, u) => {
      if (this.readingCalls--, this.waitingReads.length > 0) {
        const y = this.waitingReads.shift();
        this.read(y.lng, y.ns, y.fcName, y.tried, y.wait, y.callback);
      }
      if (m && u && s < this.maxRetries) {
        setTimeout(() => {
          this.read(e, n, i, s + 1, o * 2, c);
        }, o);
        return;
      }
      c(m, u);
    }, f = this.backend[i].bind(this.backend);
    if (f.length === 2) {
      try {
        const m = f(e, n);
        m && typeof m.then == "function" ? m.then((u) => p(null, u)).catch(p) : p(null, m);
      } catch (m) {
        p(m);
      }
      return;
    }
    return f(e, n, p);
  }
  prepareLoading(e, n, i = {}, s) {
    if (!this.backend)
      return this.logger.warn("No backend was added via i18next.use. Will not load resources."), s && s();
    q(e) && (e = this.languageUtils.toResolveHierarchy(e)), q(n) && (n = [n]);
    const o = this.queueLoad(e, n, i, s);
    if (!o.toLoad.length)
      return o.pending.length || s(), null;
    o.toLoad.forEach((c) => {
      this.loadOne(c);
    });
  }
  load(e, n, i) {
    this.prepareLoading(e, n, {}, i);
  }
  reload(e, n, i) {
    this.prepareLoading(e, n, {
      reload: !0
    }, i);
  }
  loadOne(e, n = "") {
    const i = e.split("|"), s = i[0], o = i[1];
    this.read(s, o, "read", void 0, void 0, (c, p) => {
      c && this.logger.warn(`${n}loading namespace ${o} for language ${s} failed`, c), !c && p && this.logger.log(`${n}loaded namespace ${o} for language ${s}`, p), this.loaded(e, c, p);
    });
  }
  saveMissing(e, n, i, s, o, c = {}, p = () => {
  }) {
    var f, m, u, y, S;
    if ((m = (f = this.services) == null ? void 0 : f.utils) != null && m.hasLoadedNamespace && !((y = (u = this.services) == null ? void 0 : u.utils) != null && y.hasLoadedNamespace(n))) {
      this.logger.warn(`did not save key "${i}" as the namespace "${n}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
      return;
    }
    if (!(i == null || i === "")) {
      if ((S = this.backend) != null && S.create) {
        const _ = {
          ...c,
          isUpdate: o
        }, x = this.backend.create.bind(this.backend);
        if (x.length < 6)
          try {
            let v;
            x.length === 5 ? v = x(e, n, i, s, _) : v = x(e, n, i, s), v && typeof v.then == "function" ? v.then((k) => p(null, k)).catch(p) : p(null, v);
          } catch (v) {
            p(v);
          }
        else
          x(e, n, i, s, p, _);
      }
      !e || !e[0] || this.store.addResource(e[0], n, i, s);
    }
  }
}
const Bt = () => ({
  debug: !1,
  initAsync: !0,
  ns: ["translation"],
  defaultNS: ["translation"],
  fallbackLng: ["dev"],
  fallbackNS: !1,
  supportedLngs: !1,
  nonExplicitSupportedLngs: !1,
  load: "all",
  preload: !1,
  keySeparator: ".",
  nsSeparator: ":",
  pluralSeparator: "_",
  contextSeparator: "_",
  partialBundledLanguages: !1,
  saveMissing: !1,
  updateMissing: !1,
  saveMissingTo: "fallback",
  saveMissingPlurals: !0,
  missingKeyHandler: !1,
  missingInterpolationHandler: !1,
  postProcess: !1,
  postProcessPassResolved: !1,
  returnNull: !1,
  returnEmptyString: !0,
  returnObjects: !1,
  joinArrays: !1,
  returnedObjectHandler: !1,
  parseMissingKeyHandler: !1,
  appendNamespaceToMissingKey: !1,
  appendNamespaceToCIMode: !1,
  overloadTranslationOptionHandler: (l) => {
    let e = {};
    if (typeof l[1] == "object" && (e = l[1]), q(l[1]) && (e.defaultValue = l[1]), q(l[2]) && (e.tDescription = l[2]), typeof l[2] == "object" || typeof l[3] == "object") {
      const n = l[3] || l[2];
      Object.keys(n).forEach((i) => {
        e[i] = n[i];
      });
    }
    return e;
  },
  interpolation: {
    escapeValue: !0,
    prefix: "{{",
    suffix: "}}",
    formatSeparator: ",",
    unescapePrefix: "-",
    nestingPrefix: "$t(",
    nestingSuffix: ")",
    nestingOptionsSeparator: ",",
    maxReplaces: 1e3,
    skipOnVariables: !0
  },
  cacheInBuiltFormats: !0
}), Jt = (l) => (q(l.ns) && (l.ns = [l.ns]), q(l.fallbackLng) && (l.fallbackLng = [l.fallbackLng]), q(l.fallbackNS) && (l.fallbackNS = [l.fallbackNS]), l.supportedLngs && !l.supportedLngs.includes("cimode") && (l.supportedLngs = l.supportedLngs.concat(["cimode"])), l), mt = () => {
}, Xr = (l) => {
  Object.getOwnPropertyNames(Object.getPrototypeOf(l)).forEach((n) => {
    typeof l[n] == "function" && (l[n] = l[n].bind(l));
  });
};
class ct extends _t {
  constructor(e = {}, n) {
    if (super(), this.options = Jt(e), this.services = {}, this.logger = Ve, this.modules = {
      external: []
    }, Xr(this), n && !this.isInitialized && !e.isClone) {
      if (!this.options.initAsync)
        return this.init(e, n), this;
      setTimeout(() => {
        this.init(e, n);
      }, 0);
    }
  }
  init(e = {}, n) {
    this.isInitializing = !0, typeof e == "function" && (n = e, e = {}), e.defaultNS == null && e.ns && (q(e.ns) ? e.defaultNS = e.ns : e.ns.includes("translation") || (e.defaultNS = e.ns[0]));
    const i = Bt();
    this.options = {
      ...i,
      ...this.options,
      ...Jt(e)
    }, this.options.interpolation = {
      ...i.interpolation,
      ...this.options.interpolation
    }, e.keySeparator !== void 0 && (this.options.userDefinedKeySeparator = e.keySeparator), e.nsSeparator !== void 0 && (this.options.userDefinedNsSeparator = e.nsSeparator), typeof this.options.overloadTranslationOptionHandler != "function" && (this.options.overloadTranslationOptionHandler = i.overloadTranslationOptionHandler);
    const s = (m) => m ? typeof m == "function" ? new m() : m : null;
    if (!this.options.isClone) {
      this.modules.logger ? Ve.init(s(this.modules.logger), this.options) : Ve.init(null, this.options);
      let m;
      this.modules.formatter ? m = this.modules.formatter : m = Kr;
      const u = new Wt(this.options);
      this.store = new Vt(this.options.resources, this.options);
      const y = this.services;
      y.logger = Ve, y.resourceStore = this.store, y.languageUtils = u, y.pluralResolver = new Gr(u, {
        prepend: this.options.pluralSeparator
      }), m && (y.formatter = s(m), y.formatter.init && y.formatter.init(y, this.options), this.options.interpolation.format = y.formatter.format.bind(y.formatter)), y.interpolator = new Kt(this.options), y.utils = {
        hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
      }, y.backendConnector = new Jr(s(this.modules.backend), y.resourceStore, y, this.options), y.backendConnector.on("*", (S, ..._) => {
        this.emit(S, ..._);
      }), this.modules.languageDetector && (y.languageDetector = s(this.modules.languageDetector), y.languageDetector.init && y.languageDetector.init(y, this.options.detection, this.options)), this.modules.i18nFormat && (y.i18nFormat = s(this.modules.i18nFormat), y.i18nFormat.init && y.i18nFormat.init(this)), this.translator = new wt(this.services, this.options), this.translator.on("*", (S, ..._) => {
        this.emit(S, ..._);
      }), this.modules.external.forEach((S) => {
        S.init && S.init(this);
      });
    }
    if (this.format = this.options.interpolation.format, n || (n = mt), this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
      const m = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
      m.length > 0 && m[0] !== "dev" && (this.options.lng = m[0]);
    }
    !this.services.languageDetector && !this.options.lng && this.logger.warn("init: no languageDetector is used and no lng is defined"), ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"].forEach((m) => {
      this[m] = (...u) => this.store[m](...u);
    }), ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"].forEach((m) => {
      this[m] = (...u) => (this.store[m](...u), this);
    });
    const p = at(), f = () => {
      const m = (u, y) => {
        this.isInitializing = !1, this.isInitialized && !this.initializedStoreOnce && this.logger.warn("init: i18next is already initialized. You should call init just once!"), this.isInitialized = !0, this.options.isClone || this.logger.log("initialized", this.options), this.emit("initialized", this.options), p.resolve(y), n(u, y);
      };
      if ((this.languages || this.isLanguageChangingTo) && !this.isInitialized) return m(null, this.t.bind(this));
      this.changeLanguage(this.options.lng, m);
    };
    return this.options.resources || !this.options.initAsync ? f() : setTimeout(f, 0), p;
  }
  loadResources(e, n = mt) {
    var o, c;
    let i = n;
    const s = q(e) ? e : this.language;
    if (typeof e == "function" && (i = e), !this.options.resources || this.options.partialBundledLanguages) {
      if ((s == null ? void 0 : s.toLowerCase()) === "cimode" && (!this.options.preload || this.options.preload.length === 0)) return i();
      const p = [], f = (m) => {
        if (!m || m === "cimode") return;
        this.services.languageUtils.toResolveHierarchy(m).forEach((y) => {
          y !== "cimode" && (p.includes(y) || p.push(y));
        });
      };
      s ? f(s) : this.services.languageUtils.getFallbackCodes(this.options.fallbackLng).forEach((u) => f(u)), (c = (o = this.options.preload) == null ? void 0 : o.forEach) == null || c.call(o, (m) => f(m)), this.services.backendConnector.load(p, this.options.ns, (m) => {
        !m && !this.resolvedLanguage && this.language && this.setResolvedLanguage(this.language), i(m);
      });
    } else
      i(null);
  }
  reloadResources(e, n, i) {
    const s = at();
    return typeof e == "function" && (i = e, e = void 0), typeof n == "function" && (i = n, n = void 0), e || (e = this.languages), n || (n = this.options.ns), i || (i = mt), this.services.backendConnector.reload(e, n, (o) => {
      s.resolve(), i(o);
    }), s;
  }
  use(e) {
    if (!e) throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");
    if (!e.type) throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");
    return e.type === "backend" && (this.modules.backend = e), (e.type === "logger" || e.log && e.warn && e.error) && (this.modules.logger = e), e.type === "languageDetector" && (this.modules.languageDetector = e), e.type === "i18nFormat" && (this.modules.i18nFormat = e), e.type === "postProcessor" && pr.addPostProcessor(e), e.type === "formatter" && (this.modules.formatter = e), e.type === "3rdParty" && this.modules.external.push(e), this;
  }
  setResolvedLanguage(e) {
    if (!(!e || !this.languages) && !["cimode", "dev"].includes(e)) {
      for (let n = 0; n < this.languages.length; n++) {
        const i = this.languages[n];
        if (!["cimode", "dev"].includes(i) && this.store.hasLanguageSomeTranslations(i)) {
          this.resolvedLanguage = i;
          break;
        }
      }
      !this.resolvedLanguage && !this.languages.includes(e) && this.store.hasLanguageSomeTranslations(e) && (this.resolvedLanguage = e, this.languages.unshift(e));
    }
  }
  changeLanguage(e, n) {
    this.isLanguageChangingTo = e;
    const i = at();
    this.emit("languageChanging", e);
    const s = (p) => {
      this.language = p, this.languages = this.services.languageUtils.toResolveHierarchy(p), this.resolvedLanguage = void 0, this.setResolvedLanguage(p);
    }, o = (p, f) => {
      f ? this.isLanguageChangingTo === e && (s(f), this.translator.changeLanguage(f), this.isLanguageChangingTo = void 0, this.emit("languageChanged", f), this.logger.log("languageChanged", f)) : this.isLanguageChangingTo = void 0, i.resolve((...m) => this.t(...m)), n && n(p, (...m) => this.t(...m));
    }, c = (p) => {
      var u, y;
      !e && !p && this.services.languageDetector && (p = []);
      const f = q(p) ? p : p && p[0], m = this.store.hasLanguageSomeTranslations(f) ? f : this.services.languageUtils.getBestMatchFromCodes(q(p) ? [p] : p);
      m && (this.language || s(m), this.translator.language || this.translator.changeLanguage(m), (y = (u = this.services.languageDetector) == null ? void 0 : u.cacheUserLanguage) == null || y.call(u, m)), this.loadResources(m, (S) => {
        o(S, m);
      });
    };
    return !e && this.services.languageDetector && !this.services.languageDetector.async ? c(this.services.languageDetector.detect()) : !e && this.services.languageDetector && this.services.languageDetector.async ? this.services.languageDetector.detect.length === 0 ? this.services.languageDetector.detect().then(c) : this.services.languageDetector.detect(c) : c(e), i;
  }
  getFixedT(e, n, i) {
    const s = (o, c, ...p) => {
      let f;
      typeof c != "object" ? f = this.options.overloadTranslationOptionHandler([o, c].concat(p)) : f = {
        ...c
      }, f.lng = f.lng || s.lng, f.lngs = f.lngs || s.lngs, f.ns = f.ns || s.ns, f.keyPrefix !== "" && (f.keyPrefix = f.keyPrefix || i || s.keyPrefix);
      const m = {
        ...this.options,
        ...f
      };
      typeof f.keyPrefix == "function" && (f.keyPrefix = et(f.keyPrefix, m));
      const u = this.options.keySeparator || ".";
      let y;
      return f.keyPrefix && Array.isArray(o) ? y = o.map((S) => (typeof S == "function" && (S = et(S, m)), `${f.keyPrefix}${u}${S}`)) : (typeof o == "function" && (o = et(o, m)), y = f.keyPrefix ? `${f.keyPrefix}${u}${o}` : o), this.t(y, f);
    };
    return q(e) ? s.lng = e : s.lngs = e, s.ns = n, s.keyPrefix = i, s;
  }
  t(...e) {
    var n;
    return (n = this.translator) == null ? void 0 : n.translate(...e);
  }
  exists(...e) {
    var n;
    return (n = this.translator) == null ? void 0 : n.exists(...e);
  }
  setDefaultNamespace(e) {
    this.options.defaultNS = e;
  }
  hasLoadedNamespace(e, n = {}) {
    if (!this.isInitialized)
      return this.logger.warn("hasLoadedNamespace: i18next was not initialized", this.languages), !1;
    if (!this.languages || !this.languages.length)
      return this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty", this.languages), !1;
    const i = n.lng || this.resolvedLanguage || this.languages[0], s = this.options ? this.options.fallbackLng : !1, o = this.languages[this.languages.length - 1];
    if (i.toLowerCase() === "cimode") return !0;
    const c = (p, f) => {
      const m = this.services.backendConnector.state[`${p}|${f}`];
      return m === -1 || m === 0 || m === 2;
    };
    if (n.precheck) {
      const p = n.precheck(this, c);
      if (p !== void 0) return p;
    }
    return !!(this.hasResourceBundle(i, e) || !this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages || c(i, e) && (!s || c(o, e)));
  }
  loadNamespaces(e, n) {
    const i = at();
    return this.options.ns ? (q(e) && (e = [e]), e.forEach((s) => {
      this.options.ns.includes(s) || this.options.ns.push(s);
    }), this.loadResources((s) => {
      i.resolve(), n && n(s);
    }), i) : (n && n(), Promise.resolve());
  }
  loadLanguages(e, n) {
    const i = at();
    q(e) && (e = [e]);
    const s = this.options.preload || [], o = e.filter((c) => !s.includes(c) && this.services.languageUtils.isSupportedCode(c));
    return o.length ? (this.options.preload = s.concat(o), this.loadResources((c) => {
      i.resolve(), n && n(c);
    }), i) : (n && n(), Promise.resolve());
  }
  dir(e) {
    var s, o;
    if (e || (e = this.resolvedLanguage || (((s = this.languages) == null ? void 0 : s.length) > 0 ? this.languages[0] : this.language)), !e) return "rtl";
    try {
      const c = new Intl.Locale(e);
      if (c && c.getTextInfo) {
        const p = c.getTextInfo();
        if (p && p.direction) return p.direction;
      }
    } catch {
    }
    const n = ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam", "ckb"], i = ((o = this.services) == null ? void 0 : o.languageUtils) || new Wt(Bt());
    return e.toLowerCase().indexOf("-latn") > 1 ? "ltr" : n.includes(i.getLanguagePartFromCode(e)) || e.toLowerCase().indexOf("-arab") > 1 ? "rtl" : "ltr";
  }
  static createInstance(e = {}, n) {
    const i = new ct(e, n);
    return i.createInstance = ct.createInstance, i;
  }
  cloneInstance(e = {}, n = mt) {
    const i = e.forkResourceStore;
    i && delete e.forkResourceStore;
    const s = {
      ...this.options,
      ...e,
      isClone: !0
    }, o = new ct(s);
    if ((e.debug !== void 0 || e.prefix !== void 0) && (o.logger = o.logger.clone(e)), ["store", "services", "language"].forEach((p) => {
      o[p] = this[p];
    }), o.services = {
      ...this.services
    }, o.services.utils = {
      hasLoadedNamespace: o.hasLoadedNamespace.bind(o)
    }, i) {
      const p = Object.keys(this.store.data).reduce((f, m) => (f[m] = {
        ...this.store.data[m]
      }, f[m] = Object.keys(f[m]).reduce((u, y) => (u[y] = {
        ...f[m][y]
      }, u), f[m]), f), {});
      o.store = new Vt(p, s), o.services.resourceStore = o.store;
    }
    if (e.interpolation) {
      const f = {
        ...Bt().interpolation,
        ...this.options.interpolation,
        ...e.interpolation
      }, m = {
        ...s,
        interpolation: f
      };
      o.services.interpolator = new Kt(m);
    }
    return o.translator = new wt(o.services, s), o.translator.on("*", (p, ...f) => {
      o.emit(p, ...f);
    }), o.init(s, n), o.translator.options = s, o.translator.backendConnector.services.utils = {
      hasLoadedNamespace: o.hasLoadedNamespace.bind(o)
    }, o;
  }
  toJSON() {
    return {
      options: this.options,
      store: this.store,
      language: this.language,
      languages: this.languages,
      resolvedLanguage: this.resolvedLanguage
    };
  }
}
const Ae = ct.createInstance(), Zr = Ae.createInstance;
Ae.dir;
Ae.init;
Ae.loadResources;
Ae.reloadResources;
Ae.use;
Ae.changeLanguage;
Ae.getFixedT;
Ae.t;
Ae.exists;
Ae.setDefaultNamespace;
Ae.hasLoadedNamespace;
Ae.loadNamespaces;
Ae.loadLanguages;
const Qr = "Swap your tokens at the best price", en = "Swap your tokens using DinoVox liquidity pools", tn = "Swap", rn = "Liquidity", nn = "You send", sn = "You receive", an = "Balance", on = "Calculating…", ln = "Insufficient balance", cn = "⚡ 1:1 conversion — EGLD → WEGLD via the wrap contract", dn = "⚡ 1:1 conversion — WEGLD → EGLD via the unwrap contract", un = "Price impact", fn = "Hops", pn = "Route", hn = "Slippage", gn = "Minimum received", mn = "This route has a high price impact — you are paying more than the market price for this token. Try reducing the swap amount for a better rate.", xn = "Add liquidity to this pair →", bn = "Connect your wallet", yn = "Signing…", wn = "Select tokens", _n = "Enter an amount", kn = "Insufficient balance", Nn = "Calculating…", vn = "Wrap", Ln = "Unwrap", Sn = "Quote unavailable", Bn = "Swap", En = "Arbitrage", Cn = "Estimated profit", $n = "No profitable arbitrage opportunity", An = "Opportunity too small to cover slippage", In = "Amount too low to get a quote", Tn = "No route available for this pair", Fn = "Amount exceeds available pool liquidity", Rn = "Unable to get a quote", Pn = "Swap in progress…", Dn = "Swap failed", qn = "Swap successful!", On = "Wrapping…", Un = "Wrap failed", jn = "Wrap successful!", Mn = "Unwrapping…", Vn = "Unwrap failed", Wn = "Unwrap successful!", Gn = "Choose a token", Hn = "Search…", zn = "Loading…", Kn = "No results", Yn = "Liquidity", Jn = "Manage your liquidity pairs", Xn = "Your active liquidity positions", Zn = "Your liquidity positions will appear here.", Qn = "Add liquidity", ei = "Add", ti = "Remove", ri = "Pools", ni = "Liquidity pools referenced by the router", ii = "Loading...", si = "{{count}} active pool", ai = "{{count}} active pools", oi = "No active pools found.", li = "Reserve", ci = "Active", di = "+ Add", ui = "Create a new pool", fi = "CREATE", pi = "New Pool", hi = "Token 1", gi = "Token 2", mi = "Select", xi = "No token in wallet", bi = "LP Name (3-20 characters)", yi = "LP Ticker (3-10 uppercase)", wi = "Step 1: Create the SC Pair", _i = "Step 2: Issue LP Token (0.05 EGLD)", ki = "Transaction in progress…", Ni = "Waiting for transaction confirmation…", vi = "Pair created!", Li = "To activate the pool and make it usable, the LP token must be issued. Transaction cost: 0.05 EGLD.", Si = "Pool Active!", Bi = "The pool is ready to receive liquidity.", Ei = "Add liquidity", Ci = "Creating the pair...", $i = "Creation failed", Ai = "Pair created! Waiting for synchronization...", Ii = "Issuing LP Token...", Ti = "Issuance failed", Fi = "LP Token issued! Pool is now active.", Ri = "Add Liquidity", Pi = "Add liquidity to a pool", Di = "Add Liquidity", qi = "Deposit two tokens to provide liquidity and receive LP tokens", Oi = "First Token", Ui = "Second Token", ji = "Searching for pool…", Mi = "No pool found", Vi = "You must create this pool before adding liquidity. Activation requires 0.05 EGLD.", Wi = "Create pool", Gi = "LP Received (est.)", Hi = "Refund {{ticker}}", zi = "Minimum deposit too low for the first liquidity.", Ki = "Connect your wallet", Yi = "Pool does not exist", Ji = "Pool inactive", Xi = "Insufficient balance", Zi = "Enter amounts", Qi = "Amount too low", es = "Add Liquidity", ts = "Adding liquidity…", rs = "Adding liquidity failed", ns = "Liquidity added!", gr = {
  subtitle: Qr,
  card_description: en,
  tab_swap: tn,
  tab_liquidity: rn,
  you_send: nn,
  you_receive: sn,
  balance: an,
  calculating: on,
  insufficient_balance: ln,
  wrap_info: cn,
  unwrap_info: dn,
  price_impact: un,
  hops: fn,
  route: pn,
  slippage: hn,
  min_received: gn,
  high_impact_warning: mn,
  add_liquidity_cta: xn,
  btn_connect: bn,
  btn_signing: yn,
  btn_select_tokens: wn,
  btn_enter_amount: _n,
  btn_insufficient: kn,
  btn_calculating: Nn,
  btn_wrap: vn,
  btn_unwrap: Ln,
  btn_quote_unavailable: Sn,
  btn_swap: Bn,
  btn_arb: En,
  arb_profit: Cn,
  arb_no_opportunity: $n,
  arb_slippage_too_high: An,
  error_amount_too_low: In,
  error_no_route: Tn,
  error_insufficient_liquidity: Fn,
  error_quote: Rn,
  processing: Pn,
  error_tx: Dn,
  success_tx: qn,
  processing_wrap: On,
  error_wrap: Un,
  success_wrap: jn,
  processing_unwrap: Mn,
  error_unwrap: Vn,
  success_unwrap: Wn,
  token_select: Gn,
  token_search: Hn,
  token_loading: zn,
  token_no_results: Kn,
  liquidity_title: Yn,
  liquidity_subtitle: Jn,
  liquidity_card_desc: Xn,
  liquidity_empty: Zn,
  liquidity_add: Qn,
  liquidity_add_btn: ei,
  liquidity_remove_btn: ti,
  pools_title: ri,
  pools_subtitle: ni,
  pools_loading_desc: ii,
  pools_count_one: si,
  pools_count_other: ai,
  pools_empty: oi,
  pools_reserve: li,
  pools_active: ci,
  pools_add: di,
  pools_create: ui,
  create_title: fi,
  create_subtitle: pi,
  create_token1: hi,
  create_token2: gi,
  create_select: mi,
  create_no_wallet_token: xi,
  create_lp_name: bi,
  create_lp_ticker: yi,
  create_step1: wi,
  create_step2: _i,
  create_tx_pending: ki,
  create_tx_waiting: Ni,
  create_pair_done: vi,
  create_pair_desc: Li,
  create_pool_active: Si,
  create_pool_ready: Bi,
  create_add_liquidity: Ei,
  create_processing_pair: Ci,
  create_error_pair: $i,
  create_success_pair: Ai,
  create_processing_lp: Ii,
  create_error_lp: Ti,
  create_success_lp: Fi,
  add_title: Ri,
  add_subtitle: Pi,
  add_card_title: Di,
  add_card_desc: qi,
  add_token1: Oi,
  add_token2: Ui,
  add_pool_searching: ji,
  add_no_pool_title: Mi,
  add_no_pool_desc: Vi,
  add_no_pool_btn: Wi,
  add_lp_preview: Gi,
  add_refund: Hi,
  add_min_deposit: zi,
  add_btn_connect: Ki,
  add_btn_no_pool: Yi,
  add_btn_inactive: Ji,
  add_btn_insufficient: Xi,
  add_btn_enter_amount: Zi,
  add_btn_min: Qi,
  add_btn_submit: es,
  add_processing: ts,
  add_error: rs,
  add_success: ns
}, is = "Échangez vos tokens au meilleur prix", ss = "Échangez vos tokens en utilisant les pools de liquidité DinoVox", as = "Swap", os = "Liquidité", ls = "Vous envoyez", cs = "Vous recevez", ds = "Balance", us = "Calcul…", fs = "Solde insuffisant", ps = "⚡ Conversion 1:1 — EGLD → WEGLD via le contrat de wrap", hs = "⚡ Conversion 1:1 — WEGLD → EGLD via le contrat de unwrap", gs = "Price impact", ms = "Hops", xs = "Route", bs = "Slippage", ys = "Minimum reçu", ws = "Cette route a un fort impact de prix — vous payez ce token plus cher que son prix de marché. Essayez de réduire le montant échangé pour un meilleur taux.", _s = "Ajouter de la liquidité sur cette paire →", ks = "Connectez votre wallet", Ns = "Signature…", vs = "Sélectionnez les tokens", Ls = "Entrez un montant", Ss = "Solde insuffisant", Bs = "Calcul en cours…", Es = "Wrapper", Cs = "Unwrapper", $s = "Quote indisponible", As = "Swap", Is = "Arbitrage", Ts = "Profit estimé", Fs = "Aucune opportunité d'arbitrage rentable", Rs = "Opportunité trop petite pour couvrir le slippage", Ps = "Montant insuffisant pour obtenir un quote", Ds = "Pas de route disponible pour cette paire", qs = "Montant supérieur à la liquidité disponible dans les pools", Os = "Impossible d'obtenir un quote", Us = "Swap en cours…", js = "Le swap a échoué", Ms = "Swap réussi !", Vs = "Wrap en cours…", Ws = "Le wrap a échoué", Gs = "Wrap réussi !", Hs = "Unwrap en cours…", zs = "L'unwrap a échoué", Ks = "Unwrap réussi !", Ys = "Choisir un token", Js = "Rechercher…", Xs = "Chargement…", Zs = "Aucun résultat", Qs = "Liquidité", ea = "Gérer vos paires de liquidité", ta = "Vos positions de liquidité actives", ra = "Vos positions de liquidité apparaîtront ici.", na = "Ajouter de la liquidité", ia = "Ajouter", sa = "Retirer", aa = "Pools", oa = "Les pools de liquidité référencées par le routeur", la = "Chargement...", ca = "{{count}} pool active", da = "{{count}} pools actives", ua = "Aucune pool active trouvée.", fa = "Réserve", pa = "Active", ha = "+ Ajouter", ga = "Créer une nouvelle pool", ma = "CRÉER", xa = "Nouvelle Pool", ba = "Token 1", ya = "Token 2", wa = "Sélectionner", _a = "Aucun token en portefeuille", ka = "Nom LP (3-20 caractères)", Na = "Ticker LP (3-10 majuscules)", va = "Étape 1 : Créer la Pair SC", La = "Étape 2 : Émettre le LP Token (0.05 EGLD)", Sa = "Transaction en cours…", Ba = "En attente de confirmation de la transaction…", Ea = "La pair est créée !", Ca = "Pour activer la pool et la rendre utilisable, le token LP doit être émis. Coût de la transaction : 0.05 EGLD.", $a = "Pool Active !", Aa = "La pool est prête à recevoir de la liquidité.", Ia = "Ajouter de la liquidité", Ta = "Création de la pair en cours...", Fa = "Création échouée", Ra = "Pair créée ! En attente de synchronisation...", Pa = "Émission du LP Token...", Da = "Émission échouée", qa = "Le LP Token a été émis ! Pool active.", Oa = "Ajouter de la liquidité", Ua = "Ajouter de la liquidité à une pool", ja = "Ajouter Liquidité", Ma = "Déposez deux tokens pour fournir de la liquidité et recevoir des LP tokens", Va = "Premier Token", Wa = "Deuxième Token", Ga = "Recherche de la pool en cours…", Ha = "Aucune pool trouvée", za = "Vous devez créer cette pool avant de pouvoir y ajouter de la liquidité. L'activation requiert 0.05 EGLD.", Ka = "Créer la pool", Ya = "LP Reçus (est.)", Ja = "Remboursement {{ticker}}", Xa = "Dépôt minimum insuffisant pour la première liquidité.", Za = "Connectez votre wallet", Qa = "Pool inexistante", eo = "Pool inactive", to = "Solde insuffisant", ro = "Renseignez un montant", no = "Montant trop faible", io = "Ajouter Liquidité", so = "Ajout de liquidité en cours…", ao = "L'ajout a échoué", oo = "Liquidité ajoutée !", mr = {
  subtitle: is,
  card_description: ss,
  tab_swap: as,
  tab_liquidity: os,
  you_send: ls,
  you_receive: cs,
  balance: ds,
  calculating: us,
  insufficient_balance: fs,
  wrap_info: ps,
  unwrap_info: hs,
  price_impact: gs,
  hops: ms,
  route: xs,
  slippage: bs,
  min_received: ys,
  high_impact_warning: ws,
  add_liquidity_cta: _s,
  btn_connect: ks,
  btn_signing: Ns,
  btn_select_tokens: vs,
  btn_enter_amount: Ls,
  btn_insufficient: Ss,
  btn_calculating: Bs,
  btn_wrap: Es,
  btn_unwrap: Cs,
  btn_quote_unavailable: $s,
  btn_swap: As,
  btn_arb: Is,
  arb_profit: Ts,
  arb_no_opportunity: Fs,
  arb_slippage_too_high: Rs,
  error_amount_too_low: Ps,
  error_no_route: Ds,
  error_insufficient_liquidity: qs,
  error_quote: Os,
  processing: Us,
  error_tx: js,
  success_tx: Ms,
  processing_wrap: Vs,
  error_wrap: Ws,
  success_wrap: Gs,
  processing_unwrap: Hs,
  error_unwrap: zs,
  success_unwrap: Ks,
  token_select: Ys,
  token_search: Js,
  token_loading: Xs,
  token_no_results: Zs,
  liquidity_title: Qs,
  liquidity_subtitle: ea,
  liquidity_card_desc: ta,
  liquidity_empty: ra,
  liquidity_add: na,
  liquidity_add_btn: ia,
  liquidity_remove_btn: sa,
  pools_title: aa,
  pools_subtitle: oa,
  pools_loading_desc: la,
  pools_count_one: ca,
  pools_count_other: da,
  pools_empty: ua,
  pools_reserve: fa,
  pools_active: pa,
  pools_add: ha,
  pools_create: ga,
  create_title: ma,
  create_subtitle: xa,
  create_token1: ba,
  create_token2: ya,
  create_select: wa,
  create_no_wallet_token: _a,
  create_lp_name: ka,
  create_lp_ticker: Na,
  create_step1: va,
  create_step2: La,
  create_tx_pending: Sa,
  create_tx_waiting: Ba,
  create_pair_done: Ea,
  create_pair_desc: Ca,
  create_pool_active: $a,
  create_pool_ready: Aa,
  create_add_liquidity: Ia,
  create_processing_pair: Ta,
  create_error_pair: Fa,
  create_success_pair: Ra,
  create_processing_lp: Pa,
  create_error_lp: Da,
  create_success_lp: qa,
  add_title: Oa,
  add_subtitle: Ua,
  add_card_title: ja,
  add_card_desc: Ma,
  add_token1: Va,
  add_token2: Wa,
  add_pool_searching: Ga,
  add_no_pool_title: Ha,
  add_no_pool_desc: za,
  add_no_pool_btn: Ka,
  add_lp_preview: Ya,
  add_refund: Ja,
  add_min_deposit: Xa,
  add_btn_connect: Za,
  add_btn_no_pool: Qa,
  add_btn_inactive: eo,
  add_btn_insufficient: to,
  add_btn_enter_amount: ro,
  add_btn_min: no,
  add_btn_submit: io,
  add_processing: so,
  add_error: ao,
  add_success: oo
}, ot = Zr();
ot.use(Nr).init({
  resources: {
    en: { swap: gr },
    fr: { swap: mr }
  },
  lng: typeof navigator < "u" ? (navigator.language || "en").split("-")[0] : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: !1 },
  react: { useSuspense: !1 }
});
var xr = {}, kt = {};
kt.byteLength = uo;
kt.toByteArray = po;
kt.fromByteArray = mo;
var Me = [], De = [], lo = typeof Uint8Array < "u" ? Uint8Array : Array, Et = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (var Ze = 0, co = Et.length; Ze < co; ++Ze)
  Me[Ze] = Et[Ze], De[Et.charCodeAt(Ze)] = Ze;
De[45] = 62;
De[95] = 63;
function br(l) {
  var e = l.length;
  if (e % 4 > 0)
    throw new Error("Invalid string. Length must be a multiple of 4");
  var n = l.indexOf("=");
  n === -1 && (n = e);
  var i = n === e ? 0 : 4 - n % 4;
  return [n, i];
}
function uo(l) {
  var e = br(l), n = e[0], i = e[1];
  return (n + i) * 3 / 4 - i;
}
function fo(l, e, n) {
  return (e + n) * 3 / 4 - n;
}
function po(l) {
  var e, n = br(l), i = n[0], s = n[1], o = new lo(fo(l, i, s)), c = 0, p = s > 0 ? i - 4 : i, f;
  for (f = 0; f < p; f += 4)
    e = De[l.charCodeAt(f)] << 18 | De[l.charCodeAt(f + 1)] << 12 | De[l.charCodeAt(f + 2)] << 6 | De[l.charCodeAt(f + 3)], o[c++] = e >> 16 & 255, o[c++] = e >> 8 & 255, o[c++] = e & 255;
  return s === 2 && (e = De[l.charCodeAt(f)] << 2 | De[l.charCodeAt(f + 1)] >> 4, o[c++] = e & 255), s === 1 && (e = De[l.charCodeAt(f)] << 10 | De[l.charCodeAt(f + 1)] << 4 | De[l.charCodeAt(f + 2)] >> 2, o[c++] = e >> 8 & 255, o[c++] = e & 255), o;
}
function ho(l) {
  return Me[l >> 18 & 63] + Me[l >> 12 & 63] + Me[l >> 6 & 63] + Me[l & 63];
}
function go(l, e, n) {
  for (var i, s = [], o = e; o < n; o += 3)
    i = (l[o] << 16 & 16711680) + (l[o + 1] << 8 & 65280) + (l[o + 2] & 255), s.push(ho(i));
  return s.join("");
}
function mo(l) {
  for (var e, n = l.length, i = n % 3, s = [], o = 16383, c = 0, p = n - i; c < p; c += o)
    s.push(go(l, c, c + o > p ? p : c + o));
  return i === 1 ? (e = l[n - 1], s.push(
    Me[e >> 2] + Me[e << 4 & 63] + "=="
  )) : i === 2 && (e = (l[n - 2] << 8) + l[n - 1], s.push(
    Me[e >> 10] + Me[e >> 4 & 63] + Me[e << 2 & 63] + "="
  )), s.join("");
}
var Ft = {};
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
Ft.read = function(l, e, n, i, s) {
  var o, c, p = s * 8 - i - 1, f = (1 << p) - 1, m = f >> 1, u = -7, y = n ? s - 1 : 0, S = n ? -1 : 1, _ = l[e + y];
  for (y += S, o = _ & (1 << -u) - 1, _ >>= -u, u += p; u > 0; o = o * 256 + l[e + y], y += S, u -= 8)
    ;
  for (c = o & (1 << -u) - 1, o >>= -u, u += i; u > 0; c = c * 256 + l[e + y], y += S, u -= 8)
    ;
  if (o === 0)
    o = 1 - m;
  else {
    if (o === f)
      return c ? NaN : (_ ? -1 : 1) * (1 / 0);
    c = c + Math.pow(2, i), o = o - m;
  }
  return (_ ? -1 : 1) * c * Math.pow(2, o - i);
};
Ft.write = function(l, e, n, i, s, o) {
  var c, p, f, m = o * 8 - s - 1, u = (1 << m) - 1, y = u >> 1, S = s === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, _ = i ? 0 : o - 1, x = i ? 1 : -1, v = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
  for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (p = isNaN(e) ? 1 : 0, c = u) : (c = Math.floor(Math.log(e) / Math.LN2), e * (f = Math.pow(2, -c)) < 1 && (c--, f *= 2), c + y >= 1 ? e += S / f : e += S * Math.pow(2, 1 - y), e * f >= 2 && (c++, f /= 2), c + y >= u ? (p = 0, c = u) : c + y >= 1 ? (p = (e * f - 1) * Math.pow(2, s), c = c + y) : (p = e * Math.pow(2, y - 1) * Math.pow(2, s), c = 0)); s >= 8; l[n + _] = p & 255, _ += x, p /= 256, s -= 8)
    ;
  for (c = c << s | p, m += s; m > 0; l[n + _] = c & 255, _ += x, c /= 256, m -= 8)
    ;
  l[n + _ - x] |= v * 128;
};
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
(function(l) {
  const e = kt, n = Ft, i = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
  l.Buffer = u, l.SlowBuffer = L, l.INSPECT_MAX_BYTES = 50;
  const s = 2147483647;
  l.kMaxLength = s;
  const { Uint8Array: o, ArrayBuffer: c, SharedArrayBuffer: p } = globalThis;
  u.TYPED_ARRAY_SUPPORT = f(), !u.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error(
    "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
  );
  function f() {
    try {
      const a = new o(1), t = { foo: function() {
        return 42;
      } };
      return Object.setPrototypeOf(t, o.prototype), Object.setPrototypeOf(a, t), a.foo() === 42;
    } catch {
      return !1;
    }
  }
  Object.defineProperty(u.prototype, "parent", {
    enumerable: !0,
    get: function() {
      if (u.isBuffer(this))
        return this.buffer;
    }
  }), Object.defineProperty(u.prototype, "offset", {
    enumerable: !0,
    get: function() {
      if (u.isBuffer(this))
        return this.byteOffset;
    }
  });
  function m(a) {
    if (a > s)
      throw new RangeError('The value "' + a + '" is invalid for option "size"');
    const t = new o(a);
    return Object.setPrototypeOf(t, u.prototype), t;
  }
  function u(a, t, r) {
    if (typeof a == "number") {
      if (typeof t == "string")
        throw new TypeError(
          'The "string" argument must be of type string. Received type number'
        );
      return x(a);
    }
    return y(a, t, r);
  }
  u.poolSize = 8192;
  function y(a, t, r) {
    if (typeof a == "string")
      return v(a, t);
    if (c.isView(a))
      return E(a);
    if (a == null)
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof a
      );
    if (oe(a, c) || a && oe(a.buffer, c) || typeof p < "u" && (oe(a, p) || a && oe(a.buffer, p)))
      return D(a, t, r);
    if (typeof a == "number")
      throw new TypeError(
        'The "value" argument must not be of type number. Received type number'
      );
    const d = a.valueOf && a.valueOf();
    if (d != null && d !== a)
      return u.from(d, t, r);
    const g = R(a);
    if (g) return g;
    if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof a[Symbol.toPrimitive] == "function")
      return u.from(a[Symbol.toPrimitive]("string"), t, r);
    throw new TypeError(
      "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof a
    );
  }
  u.from = function(a, t, r) {
    return y(a, t, r);
  }, Object.setPrototypeOf(u.prototype, o.prototype), Object.setPrototypeOf(u, o);
  function S(a) {
    if (typeof a != "number")
      throw new TypeError('"size" argument must be of type number');
    if (a < 0)
      throw new RangeError('The value "' + a + '" is invalid for option "size"');
  }
  function _(a, t, r) {
    return S(a), a <= 0 ? m(a) : t !== void 0 ? typeof r == "string" ? m(a).fill(t, r) : m(a).fill(t) : m(a);
  }
  u.alloc = function(a, t, r) {
    return _(a, t, r);
  };
  function x(a) {
    return S(a), m(a < 0 ? 0 : U(a) | 0);
  }
  u.allocUnsafe = function(a) {
    return x(a);
  }, u.allocUnsafeSlow = function(a) {
    return x(a);
  };
  function v(a, t) {
    if ((typeof t != "string" || t === "") && (t = "utf8"), !u.isEncoding(t))
      throw new TypeError("Unknown encoding: " + t);
    const r = ee(a, t) | 0;
    let d = m(r);
    const g = d.write(a, t);
    return g !== r && (d = d.slice(0, g)), d;
  }
  function k(a) {
    const t = a.length < 0 ? 0 : U(a.length) | 0, r = m(t);
    for (let d = 0; d < t; d += 1)
      r[d] = a[d] & 255;
    return r;
  }
  function E(a) {
    if (oe(a, o)) {
      const t = new o(a);
      return D(t.buffer, t.byteOffset, t.byteLength);
    }
    return k(a);
  }
  function D(a, t, r) {
    if (t < 0 || a.byteLength < t)
      throw new RangeError('"offset" is outside of buffer bounds');
    if (a.byteLength < t + (r || 0))
      throw new RangeError('"length" is outside of buffer bounds');
    let d;
    return t === void 0 && r === void 0 ? d = new o(a) : r === void 0 ? d = new o(a, t) : d = new o(a, t, r), Object.setPrototypeOf(d, u.prototype), d;
  }
  function R(a) {
    if (u.isBuffer(a)) {
      const t = U(a.length) | 0, r = m(t);
      return r.length === 0 || a.copy(r, 0, 0, t), r;
    }
    if (a.length !== void 0)
      return typeof a.length != "number" || $e(a.length) ? m(0) : k(a);
    if (a.type === "Buffer" && Array.isArray(a.data))
      return k(a.data);
  }
  function U(a) {
    if (a >= s)
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + s.toString(16) + " bytes");
    return a | 0;
  }
  function L(a) {
    return +a != a && (a = 0), u.alloc(+a);
  }
  u.isBuffer = function(t) {
    return t != null && t._isBuffer === !0 && t !== u.prototype;
  }, u.compare = function(t, r) {
    if (oe(t, o) && (t = u.from(t, t.offset, t.byteLength)), oe(r, o) && (r = u.from(r, r.offset, r.byteLength)), !u.isBuffer(t) || !u.isBuffer(r))
      throw new TypeError(
        'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
      );
    if (t === r) return 0;
    let d = t.length, g = r.length;
    for (let b = 0, N = Math.min(d, g); b < N; ++b)
      if (t[b] !== r[b]) {
        d = t[b], g = r[b];
        break;
      }
    return d < g ? -1 : g < d ? 1 : 0;
  }, u.isEncoding = function(t) {
    switch (String(t).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return !0;
      default:
        return !1;
    }
  }, u.concat = function(t, r) {
    if (!Array.isArray(t))
      throw new TypeError('"list" argument must be an Array of Buffers');
    if (t.length === 0)
      return u.alloc(0);
    let d;
    if (r === void 0)
      for (r = 0, d = 0; d < t.length; ++d)
        r += t[d].length;
    const g = u.allocUnsafe(r);
    let b = 0;
    for (d = 0; d < t.length; ++d) {
      let N = t[d];
      if (oe(N, o))
        b + N.length > g.length ? (u.isBuffer(N) || (N = u.from(N)), N.copy(g, b)) : o.prototype.set.call(
          g,
          N,
          b
        );
      else if (u.isBuffer(N))
        N.copy(g, b);
      else
        throw new TypeError('"list" argument must be an Array of Buffers');
      b += N.length;
    }
    return g;
  };
  function ee(a, t) {
    if (u.isBuffer(a))
      return a.length;
    if (c.isView(a) || oe(a, c))
      return a.byteLength;
    if (typeof a != "string")
      throw new TypeError(
        'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof a
      );
    const r = a.length, d = arguments.length > 2 && arguments[2] === !0;
    if (!d && r === 0) return 0;
    let g = !1;
    for (; ; )
      switch (t) {
        case "ascii":
        case "latin1":
        case "binary":
          return r;
        case "utf8":
        case "utf-8":
          return Ie(a).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return r * 2;
        case "hex":
          return r >>> 1;
        case "base64":
          return V(a).length;
        default:
          if (g)
            return d ? -1 : Ie(a).length;
          t = ("" + t).toLowerCase(), g = !0;
      }
  }
  u.byteLength = ee;
  function C(a, t, r) {
    let d = !1;
    if ((t === void 0 || t < 0) && (t = 0), t > this.length || ((r === void 0 || r > this.length) && (r = this.length), r <= 0) || (r >>>= 0, t >>>= 0, r <= t))
      return "";
    for (a || (a = "utf8"); ; )
      switch (a) {
        case "hex":
          return se(this, t, r);
        case "utf8":
        case "utf-8":
          return Y(this, t, r);
        case "ascii":
          return ke(this, t, r);
        case "latin1":
        case "binary":
          return te(this, t, r);
        case "base64":
          return P(this, t, r);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return xe(this, t, r);
        default:
          if (d) throw new TypeError("Unknown encoding: " + a);
          a = (a + "").toLowerCase(), d = !0;
      }
  }
  u.prototype._isBuffer = !0;
  function ae(a, t, r) {
    const d = a[t];
    a[t] = a[r], a[r] = d;
  }
  u.prototype.swap16 = function() {
    const t = this.length;
    if (t % 2 !== 0)
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (let r = 0; r < t; r += 2)
      ae(this, r, r + 1);
    return this;
  }, u.prototype.swap32 = function() {
    const t = this.length;
    if (t % 4 !== 0)
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (let r = 0; r < t; r += 4)
      ae(this, r, r + 3), ae(this, r + 1, r + 2);
    return this;
  }, u.prototype.swap64 = function() {
    const t = this.length;
    if (t % 8 !== 0)
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    for (let r = 0; r < t; r += 8)
      ae(this, r, r + 7), ae(this, r + 1, r + 6), ae(this, r + 2, r + 5), ae(this, r + 3, r + 4);
    return this;
  }, u.prototype.toString = function() {
    const t = this.length;
    return t === 0 ? "" : arguments.length === 0 ? Y(this, 0, t) : C.apply(this, arguments);
  }, u.prototype.toLocaleString = u.prototype.toString, u.prototype.equals = function(t) {
    if (!u.isBuffer(t)) throw new TypeError("Argument must be a Buffer");
    return this === t ? !0 : u.compare(this, t) === 0;
  }, u.prototype.inspect = function() {
    let t = "";
    const r = l.INSPECT_MAX_BYTES;
    return t = this.toString("hex", 0, r).replace(/(.{2})/g, "$1 ").trim(), this.length > r && (t += " ... "), "<Buffer " + t + ">";
  }, i && (u.prototype[i] = u.prototype.inspect), u.prototype.compare = function(t, r, d, g, b) {
    if (oe(t, o) && (t = u.from(t, t.offset, t.byteLength)), !u.isBuffer(t))
      throw new TypeError(
        'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof t
      );
    if (r === void 0 && (r = 0), d === void 0 && (d = t ? t.length : 0), g === void 0 && (g = 0), b === void 0 && (b = this.length), r < 0 || d > t.length || g < 0 || b > this.length)
      throw new RangeError("out of range index");
    if (g >= b && r >= d)
      return 0;
    if (g >= b)
      return -1;
    if (r >= d)
      return 1;
    if (r >>>= 0, d >>>= 0, g >>>= 0, b >>>= 0, this === t) return 0;
    let N = b - g, H = d - r;
    const de = Math.min(N, H), le = this.slice(g, b), ue = t.slice(r, d);
    for (let Z = 0; Z < de; ++Z)
      if (le[Z] !== ue[Z]) {
        N = le[Z], H = ue[Z];
        break;
      }
    return N < H ? -1 : H < N ? 1 : 0;
  };
  function A(a, t, r, d, g) {
    if (a.length === 0) return -1;
    if (typeof r == "string" ? (d = r, r = 0) : r > 2147483647 ? r = 2147483647 : r < -2147483648 && (r = -2147483648), r = +r, $e(r) && (r = g ? 0 : a.length - 1), r < 0 && (r = a.length + r), r >= a.length) {
      if (g) return -1;
      r = a.length - 1;
    } else if (r < 0)
      if (g) r = 0;
      else return -1;
    if (typeof t == "string" && (t = u.from(t, d)), u.isBuffer(t))
      return t.length === 0 ? -1 : O(a, t, r, d, g);
    if (typeof t == "number")
      return t = t & 255, typeof o.prototype.indexOf == "function" ? g ? o.prototype.indexOf.call(a, t, r) : o.prototype.lastIndexOf.call(a, t, r) : O(a, [t], r, d, g);
    throw new TypeError("val must be string, number or Buffer");
  }
  function O(a, t, r, d, g) {
    let b = 1, N = a.length, H = t.length;
    if (d !== void 0 && (d = String(d).toLowerCase(), d === "ucs2" || d === "ucs-2" || d === "utf16le" || d === "utf-16le")) {
      if (a.length < 2 || t.length < 2)
        return -1;
      b = 2, N /= 2, H /= 2, r /= 2;
    }
    function de(ue, Z) {
      return b === 1 ? ue[Z] : ue.readUInt16BE(Z * b);
    }
    let le;
    if (g) {
      let ue = -1;
      for (le = r; le < N; le++)
        if (de(a, le) === de(t, ue === -1 ? 0 : le - ue)) {
          if (ue === -1 && (ue = le), le - ue + 1 === H) return ue * b;
        } else
          ue !== -1 && (le -= le - ue), ue = -1;
    } else
      for (r + H > N && (r = N - H), le = r; le >= 0; le--) {
        let ue = !0;
        for (let Z = 0; Z < H; Z++)
          if (de(a, le + Z) !== de(t, Z)) {
            ue = !1;
            break;
          }
        if (ue) return le;
      }
    return -1;
  }
  u.prototype.includes = function(t, r, d) {
    return this.indexOf(t, r, d) !== -1;
  }, u.prototype.indexOf = function(t, r, d) {
    return A(this, t, r, d, !0);
  }, u.prototype.lastIndexOf = function(t, r, d) {
    return A(this, t, r, d, !1);
  };
  function ge(a, t, r, d) {
    r = Number(r) || 0;
    const g = a.length - r;
    d ? (d = Number(d), d > g && (d = g)) : d = g;
    const b = t.length;
    d > b / 2 && (d = b / 2);
    let N;
    for (N = 0; N < d; ++N) {
      const H = parseInt(t.substr(N * 2, 2), 16);
      if ($e(H)) return N;
      a[r + N] = H;
    }
    return N;
  }
  function me(a, t, r, d) {
    return Q(Ie(t, a.length - r), a, r, d);
  }
  function K(a, t, r, d) {
    return Q(j(t), a, r, d);
  }
  function T(a, t, r, d) {
    return Q(V(t), a, r, d);
  }
  function W(a, t, r, d) {
    return Q(z(t, a.length - r), a, r, d);
  }
  u.prototype.write = function(t, r, d, g) {
    if (r === void 0)
      g = "utf8", d = this.length, r = 0;
    else if (d === void 0 && typeof r == "string")
      g = r, d = this.length, r = 0;
    else if (isFinite(r))
      r = r >>> 0, isFinite(d) ? (d = d >>> 0, g === void 0 && (g = "utf8")) : (g = d, d = void 0);
    else
      throw new Error(
        "Buffer.write(string, encoding, offset[, length]) is no longer supported"
      );
    const b = this.length - r;
    if ((d === void 0 || d > b) && (d = b), t.length > 0 && (d < 0 || r < 0) || r > this.length)
      throw new RangeError("Attempt to write outside buffer bounds");
    g || (g = "utf8");
    let N = !1;
    for (; ; )
      switch (g) {
        case "hex":
          return ge(this, t, r, d);
        case "utf8":
        case "utf-8":
          return me(this, t, r, d);
        case "ascii":
        case "latin1":
        case "binary":
          return K(this, t, r, d);
        case "base64":
          return T(this, t, r, d);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return W(this, t, r, d);
        default:
          if (N) throw new TypeError("Unknown encoding: " + g);
          g = ("" + g).toLowerCase(), N = !0;
      }
  }, u.prototype.toJSON = function() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function P(a, t, r) {
    return t === 0 && r === a.length ? e.fromByteArray(a) : e.fromByteArray(a.slice(t, r));
  }
  function Y(a, t, r) {
    r = Math.min(a.length, r);
    const d = [];
    let g = t;
    for (; g < r; ) {
      const b = a[g];
      let N = null, H = b > 239 ? 4 : b > 223 ? 3 : b > 191 ? 2 : 1;
      if (g + H <= r) {
        let de, le, ue, Z;
        switch (H) {
          case 1:
            b < 128 && (N = b);
            break;
          case 2:
            de = a[g + 1], (de & 192) === 128 && (Z = (b & 31) << 6 | de & 63, Z > 127 && (N = Z));
            break;
          case 3:
            de = a[g + 1], le = a[g + 2], (de & 192) === 128 && (le & 192) === 128 && (Z = (b & 15) << 12 | (de & 63) << 6 | le & 63, Z > 2047 && (Z < 55296 || Z > 57343) && (N = Z));
            break;
          case 4:
            de = a[g + 1], le = a[g + 2], ue = a[g + 3], (de & 192) === 128 && (le & 192) === 128 && (ue & 192) === 128 && (Z = (b & 15) << 18 | (de & 63) << 12 | (le & 63) << 6 | ue & 63, Z > 65535 && Z < 1114112 && (N = Z));
        }
      }
      N === null ? (N = 65533, H = 1) : N > 65535 && (N -= 65536, d.push(N >>> 10 & 1023 | 55296), N = 56320 | N & 1023), d.push(N), g += H;
    }
    return Ee(d);
  }
  const he = 4096;
  function Ee(a) {
    const t = a.length;
    if (t <= he)
      return String.fromCharCode.apply(String, a);
    let r = "", d = 0;
    for (; d < t; )
      r += String.fromCharCode.apply(
        String,
        a.slice(d, d += he)
      );
    return r;
  }
  function ke(a, t, r) {
    let d = "";
    r = Math.min(a.length, r);
    for (let g = t; g < r; ++g)
      d += String.fromCharCode(a[g] & 127);
    return d;
  }
  function te(a, t, r) {
    let d = "";
    r = Math.min(a.length, r);
    for (let g = t; g < r; ++g)
      d += String.fromCharCode(a[g]);
    return d;
  }
  function se(a, t, r) {
    const d = a.length;
    (!t || t < 0) && (t = 0), (!r || r < 0 || r > d) && (r = d);
    let g = "";
    for (let b = t; b < r; ++b)
      g += Ue[a[b]];
    return g;
  }
  function xe(a, t, r) {
    const d = a.slice(t, r);
    let g = "";
    for (let b = 0; b < d.length - 1; b += 2)
      g += String.fromCharCode(d[b] + d[b + 1] * 256);
    return g;
  }
  u.prototype.slice = function(t, r) {
    const d = this.length;
    t = ~~t, r = r === void 0 ? d : ~~r, t < 0 ? (t += d, t < 0 && (t = 0)) : t > d && (t = d), r < 0 ? (r += d, r < 0 && (r = 0)) : r > d && (r = d), r < t && (r = t);
    const g = this.subarray(t, r);
    return Object.setPrototypeOf(g, u.prototype), g;
  };
  function J(a, t, r) {
    if (a % 1 !== 0 || a < 0) throw new RangeError("offset is not uint");
    if (a + t > r) throw new RangeError("Trying to access beyond buffer length");
  }
  u.prototype.readUintLE = u.prototype.readUIntLE = function(t, r, d) {
    t = t >>> 0, r = r >>> 0, d || J(t, r, this.length);
    let g = this[t], b = 1, N = 0;
    for (; ++N < r && (b *= 256); )
      g += this[t + N] * b;
    return g;
  }, u.prototype.readUintBE = u.prototype.readUIntBE = function(t, r, d) {
    t = t >>> 0, r = r >>> 0, d || J(t, r, this.length);
    let g = this[t + --r], b = 1;
    for (; r > 0 && (b *= 256); )
      g += this[t + --r] * b;
    return g;
  }, u.prototype.readUint8 = u.prototype.readUInt8 = function(t, r) {
    return t = t >>> 0, r || J(t, 1, this.length), this[t];
  }, u.prototype.readUint16LE = u.prototype.readUInt16LE = function(t, r) {
    return t = t >>> 0, r || J(t, 2, this.length), this[t] | this[t + 1] << 8;
  }, u.prototype.readUint16BE = u.prototype.readUInt16BE = function(t, r) {
    return t = t >>> 0, r || J(t, 2, this.length), this[t] << 8 | this[t + 1];
  }, u.prototype.readUint32LE = u.prototype.readUInt32LE = function(t, r) {
    return t = t >>> 0, r || J(t, 4, this.length), (this[t] | this[t + 1] << 8 | this[t + 2] << 16) + this[t + 3] * 16777216;
  }, u.prototype.readUint32BE = u.prototype.readUInt32BE = function(t, r) {
    return t = t >>> 0, r || J(t, 4, this.length), this[t] * 16777216 + (this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3]);
  }, u.prototype.readBigUInt64LE = ye(function(t) {
    t = t >>> 0, we(t, "offset");
    const r = this[t], d = this[t + 7];
    (r === void 0 || d === void 0) && Ne(t, this.length - 8);
    const g = r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24, b = this[++t] + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + d * 2 ** 24;
    return BigInt(g) + (BigInt(b) << BigInt(32));
  }), u.prototype.readBigUInt64BE = ye(function(t) {
    t = t >>> 0, we(t, "offset");
    const r = this[t], d = this[t + 7];
    (r === void 0 || d === void 0) && Ne(t, this.length - 8);
    const g = r * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t], b = this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + d;
    return (BigInt(g) << BigInt(32)) + BigInt(b);
  }), u.prototype.readIntLE = function(t, r, d) {
    t = t >>> 0, r = r >>> 0, d || J(t, r, this.length);
    let g = this[t], b = 1, N = 0;
    for (; ++N < r && (b *= 256); )
      g += this[t + N] * b;
    return b *= 128, g >= b && (g -= Math.pow(2, 8 * r)), g;
  }, u.prototype.readIntBE = function(t, r, d) {
    t = t >>> 0, r = r >>> 0, d || J(t, r, this.length);
    let g = r, b = 1, N = this[t + --g];
    for (; g > 0 && (b *= 256); )
      N += this[t + --g] * b;
    return b *= 128, N >= b && (N -= Math.pow(2, 8 * r)), N;
  }, u.prototype.readInt8 = function(t, r) {
    return t = t >>> 0, r || J(t, 1, this.length), this[t] & 128 ? (255 - this[t] + 1) * -1 : this[t];
  }, u.prototype.readInt16LE = function(t, r) {
    t = t >>> 0, r || J(t, 2, this.length);
    const d = this[t] | this[t + 1] << 8;
    return d & 32768 ? d | 4294901760 : d;
  }, u.prototype.readInt16BE = function(t, r) {
    t = t >>> 0, r || J(t, 2, this.length);
    const d = this[t + 1] | this[t] << 8;
    return d & 32768 ? d | 4294901760 : d;
  }, u.prototype.readInt32LE = function(t, r) {
    return t = t >>> 0, r || J(t, 4, this.length), this[t] | this[t + 1] << 8 | this[t + 2] << 16 | this[t + 3] << 24;
  }, u.prototype.readInt32BE = function(t, r) {
    return t = t >>> 0, r || J(t, 4, this.length), this[t] << 24 | this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3];
  }, u.prototype.readBigInt64LE = ye(function(t) {
    t = t >>> 0, we(t, "offset");
    const r = this[t], d = this[t + 7];
    (r === void 0 || d === void 0) && Ne(t, this.length - 8);
    const g = this[t + 4] + this[t + 5] * 2 ** 8 + this[t + 6] * 2 ** 16 + (d << 24);
    return (BigInt(g) << BigInt(32)) + BigInt(r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24);
  }), u.prototype.readBigInt64BE = ye(function(t) {
    t = t >>> 0, we(t, "offset");
    const r = this[t], d = this[t + 7];
    (r === void 0 || d === void 0) && Ne(t, this.length - 8);
    const g = (r << 24) + // Overflow
    this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t];
    return (BigInt(g) << BigInt(32)) + BigInt(this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + d);
  }), u.prototype.readFloatLE = function(t, r) {
    return t = t >>> 0, r || J(t, 4, this.length), n.read(this, t, !0, 23, 4);
  }, u.prototype.readFloatBE = function(t, r) {
    return t = t >>> 0, r || J(t, 4, this.length), n.read(this, t, !1, 23, 4);
  }, u.prototype.readDoubleLE = function(t, r) {
    return t = t >>> 0, r || J(t, 8, this.length), n.read(this, t, !0, 52, 8);
  }, u.prototype.readDoubleBE = function(t, r) {
    return t = t >>> 0, r || J(t, 8, this.length), n.read(this, t, !1, 52, 8);
  };
  function re(a, t, r, d, g, b) {
    if (!u.isBuffer(a)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (t > g || t < b) throw new RangeError('"value" argument is out of bounds');
    if (r + d > a.length) throw new RangeError("Index out of range");
  }
  u.prototype.writeUintLE = u.prototype.writeUIntLE = function(t, r, d, g) {
    if (t = +t, r = r >>> 0, d = d >>> 0, !g) {
      const H = Math.pow(2, 8 * d) - 1;
      re(this, t, r, d, H, 0);
    }
    let b = 1, N = 0;
    for (this[r] = t & 255; ++N < d && (b *= 256); )
      this[r + N] = t / b & 255;
    return r + d;
  }, u.prototype.writeUintBE = u.prototype.writeUIntBE = function(t, r, d, g) {
    if (t = +t, r = r >>> 0, d = d >>> 0, !g) {
      const H = Math.pow(2, 8 * d) - 1;
      re(this, t, r, d, H, 0);
    }
    let b = d - 1, N = 1;
    for (this[r + b] = t & 255; --b >= 0 && (N *= 256); )
      this[r + b] = t / N & 255;
    return r + d;
  }, u.prototype.writeUint8 = u.prototype.writeUInt8 = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 1, 255, 0), this[r] = t & 255, r + 1;
  }, u.prototype.writeUint16LE = u.prototype.writeUInt16LE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 2, 65535, 0), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
  }, u.prototype.writeUint16BE = u.prototype.writeUInt16BE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 2, 65535, 0), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
  }, u.prototype.writeUint32LE = u.prototype.writeUInt32LE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 4, 4294967295, 0), this[r + 3] = t >>> 24, this[r + 2] = t >>> 16, this[r + 1] = t >>> 8, this[r] = t & 255, r + 4;
  }, u.prototype.writeUint32BE = u.prototype.writeUInt32BE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 4, 4294967295, 0), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
  };
  function Oe(a, t, r, d, g) {
    Pe(t, d, g, a, r, 7);
    let b = Number(t & BigInt(4294967295));
    a[r++] = b, b = b >> 8, a[r++] = b, b = b >> 8, a[r++] = b, b = b >> 8, a[r++] = b;
    let N = Number(t >> BigInt(32) & BigInt(4294967295));
    return a[r++] = N, N = N >> 8, a[r++] = N, N = N >> 8, a[r++] = N, N = N >> 8, a[r++] = N, r;
  }
  function Te(a, t, r, d, g) {
    Pe(t, d, g, a, r, 7);
    let b = Number(t & BigInt(4294967295));
    a[r + 7] = b, b = b >> 8, a[r + 6] = b, b = b >> 8, a[r + 5] = b, b = b >> 8, a[r + 4] = b;
    let N = Number(t >> BigInt(32) & BigInt(4294967295));
    return a[r + 3] = N, N = N >> 8, a[r + 2] = N, N = N >> 8, a[r + 1] = N, N = N >> 8, a[r] = N, r + 8;
  }
  u.prototype.writeBigUInt64LE = ye(function(t, r = 0) {
    return Oe(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
  }), u.prototype.writeBigUInt64BE = ye(function(t, r = 0) {
    return Te(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
  }), u.prototype.writeIntLE = function(t, r, d, g) {
    if (t = +t, r = r >>> 0, !g) {
      const de = Math.pow(2, 8 * d - 1);
      re(this, t, r, d, de - 1, -de);
    }
    let b = 0, N = 1, H = 0;
    for (this[r] = t & 255; ++b < d && (N *= 256); )
      t < 0 && H === 0 && this[r + b - 1] !== 0 && (H = 1), this[r + b] = (t / N >> 0) - H & 255;
    return r + d;
  }, u.prototype.writeIntBE = function(t, r, d, g) {
    if (t = +t, r = r >>> 0, !g) {
      const de = Math.pow(2, 8 * d - 1);
      re(this, t, r, d, de - 1, -de);
    }
    let b = d - 1, N = 1, H = 0;
    for (this[r + b] = t & 255; --b >= 0 && (N *= 256); )
      t < 0 && H === 0 && this[r + b + 1] !== 0 && (H = 1), this[r + b] = (t / N >> 0) - H & 255;
    return r + d;
  }, u.prototype.writeInt8 = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 1, 127, -128), t < 0 && (t = 255 + t + 1), this[r] = t & 255, r + 1;
  }, u.prototype.writeInt16LE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 2, 32767, -32768), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
  }, u.prototype.writeInt16BE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 2, 32767, -32768), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
  }, u.prototype.writeInt32LE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 4, 2147483647, -2147483648), this[r] = t & 255, this[r + 1] = t >>> 8, this[r + 2] = t >>> 16, this[r + 3] = t >>> 24, r + 4;
  }, u.prototype.writeInt32BE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || re(this, t, r, 4, 2147483647, -2147483648), t < 0 && (t = 4294967295 + t + 1), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
  }, u.prototype.writeBigInt64LE = ye(function(t, r = 0) {
    return Oe(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  }), u.prototype.writeBigInt64BE = ye(function(t, r = 0) {
    return Te(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  });
  function $(a, t, r, d, g, b) {
    if (r + d > a.length) throw new RangeError("Index out of range");
    if (r < 0) throw new RangeError("Index out of range");
  }
  function G(a, t, r, d, g) {
    return t = +t, r = r >>> 0, g || $(a, t, r, 4), n.write(a, t, r, d, 23, 4), r + 4;
  }
  u.prototype.writeFloatLE = function(t, r, d) {
    return G(this, t, r, !0, d);
  }, u.prototype.writeFloatBE = function(t, r, d) {
    return G(this, t, r, !1, d);
  };
  function M(a, t, r, d, g) {
    return t = +t, r = r >>> 0, g || $(a, t, r, 8), n.write(a, t, r, d, 52, 8), r + 8;
  }
  u.prototype.writeDoubleLE = function(t, r, d) {
    return M(this, t, r, !0, d);
  }, u.prototype.writeDoubleBE = function(t, r, d) {
    return M(this, t, r, !1, d);
  }, u.prototype.copy = function(t, r, d, g) {
    if (!u.isBuffer(t)) throw new TypeError("argument should be a Buffer");
    if (d || (d = 0), !g && g !== 0 && (g = this.length), r >= t.length && (r = t.length), r || (r = 0), g > 0 && g < d && (g = d), g === d || t.length === 0 || this.length === 0) return 0;
    if (r < 0)
      throw new RangeError("targetStart out of bounds");
    if (d < 0 || d >= this.length) throw new RangeError("Index out of range");
    if (g < 0) throw new RangeError("sourceEnd out of bounds");
    g > this.length && (g = this.length), t.length - r < g - d && (g = t.length - r + d);
    const b = g - d;
    return this === t && typeof o.prototype.copyWithin == "function" ? this.copyWithin(r, d, g) : o.prototype.set.call(
      t,
      this.subarray(d, g),
      r
    ), b;
  }, u.prototype.fill = function(t, r, d, g) {
    if (typeof t == "string") {
      if (typeof r == "string" ? (g = r, r = 0, d = this.length) : typeof d == "string" && (g = d, d = this.length), g !== void 0 && typeof g != "string")
        throw new TypeError("encoding must be a string");
      if (typeof g == "string" && !u.isEncoding(g))
        throw new TypeError("Unknown encoding: " + g);
      if (t.length === 1) {
        const N = t.charCodeAt(0);
        (g === "utf8" && N < 128 || g === "latin1") && (t = N);
      }
    } else typeof t == "number" ? t = t & 255 : typeof t == "boolean" && (t = Number(t));
    if (r < 0 || this.length < r || this.length < d)
      throw new RangeError("Out of range index");
    if (d <= r)
      return this;
    r = r >>> 0, d = d === void 0 ? this.length : d >>> 0, t || (t = 0);
    let b;
    if (typeof t == "number")
      for (b = r; b < d; ++b)
        this[b] = t;
    else {
      const N = u.isBuffer(t) ? t : u.from(t, g), H = N.length;
      if (H === 0)
        throw new TypeError('The value "' + t + '" is invalid for argument "value"');
      for (b = 0; b < d - r; ++b)
        this[b + r] = N[b % H];
    }
    return this;
  };
  const ne = {};
  function Fe(a, t, r) {
    ne[a] = class extends r {
      constructor() {
        super(), Object.defineProperty(this, "message", {
          value: t.apply(this, arguments),
          writable: !0,
          configurable: !0
        }), this.name = `${this.name} [${a}]`, this.stack, delete this.name;
      }
      get code() {
        return a;
      }
      set code(g) {
        Object.defineProperty(this, "code", {
          configurable: !0,
          enumerable: !0,
          value: g,
          writable: !0
        });
      }
      toString() {
        return `${this.name} [${a}]: ${this.message}`;
      }
    };
  }
  Fe(
    "ERR_BUFFER_OUT_OF_BOUNDS",
    function(a) {
      return a ? `${a} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
    },
    RangeError
  ), Fe(
    "ERR_INVALID_ARG_TYPE",
    function(a, t) {
      return `The "${a}" argument must be of type number. Received type ${typeof t}`;
    },
    TypeError
  ), Fe(
    "ERR_OUT_OF_RANGE",
    function(a, t, r) {
      let d = `The value of "${a}" is out of range.`, g = r;
      return Number.isInteger(r) && Math.abs(r) > 2 ** 32 ? g = je(String(r)) : typeof r == "bigint" && (g = String(r), (r > BigInt(2) ** BigInt(32) || r < -(BigInt(2) ** BigInt(32))) && (g = je(g)), g += "n"), d += ` It must be ${t}. Received ${g}`, d;
    },
    RangeError
  );
  function je(a) {
    let t = "", r = a.length;
    const d = a[0] === "-" ? 1 : 0;
    for (; r >= d + 4; r -= 3)
      t = `_${a.slice(r - 3, r)}${t}`;
    return `${a.slice(0, r)}${t}`;
  }
  function Re(a, t, r) {
    we(t, "offset"), (a[t] === void 0 || a[t + r] === void 0) && Ne(t, a.length - (r + 1));
  }
  function Pe(a, t, r, d, g, b) {
    if (a > r || a < t) {
      const N = typeof t == "bigint" ? "n" : "";
      let H;
      throw t === 0 || t === BigInt(0) ? H = `>= 0${N} and < 2${N} ** ${(b + 1) * 8}${N}` : H = `>= -(2${N} ** ${(b + 1) * 8 - 1}${N}) and < 2 ** ${(b + 1) * 8 - 1}${N}`, new ne.ERR_OUT_OF_RANGE("value", H, a);
    }
    Re(d, g, b);
  }
  function we(a, t) {
    if (typeof a != "number")
      throw new ne.ERR_INVALID_ARG_TYPE(t, "number", a);
  }
  function Ne(a, t, r) {
    throw Math.floor(a) !== a ? (we(a, r), new ne.ERR_OUT_OF_RANGE("offset", "an integer", a)) : t < 0 ? new ne.ERR_BUFFER_OUT_OF_BOUNDS() : new ne.ERR_OUT_OF_RANGE(
      "offset",
      `>= 0 and <= ${t}`,
      a
    );
  }
  const Ce = /[^+/0-9A-Za-z-_]/g;
  function Ge(a) {
    if (a = a.split("=")[0], a = a.trim().replace(Ce, ""), a.length < 2) return "";
    for (; a.length % 4 !== 0; )
      a = a + "=";
    return a;
  }
  function Ie(a, t) {
    t = t || 1 / 0;
    let r;
    const d = a.length;
    let g = null;
    const b = [];
    for (let N = 0; N < d; ++N) {
      if (r = a.charCodeAt(N), r > 55295 && r < 57344) {
        if (!g) {
          if (r > 56319) {
            (t -= 3) > -1 && b.push(239, 191, 189);
            continue;
          } else if (N + 1 === d) {
            (t -= 3) > -1 && b.push(239, 191, 189);
            continue;
          }
          g = r;
          continue;
        }
        if (r < 56320) {
          (t -= 3) > -1 && b.push(239, 191, 189), g = r;
          continue;
        }
        r = (g - 55296 << 10 | r - 56320) + 65536;
      } else g && (t -= 3) > -1 && b.push(239, 191, 189);
      if (g = null, r < 128) {
        if ((t -= 1) < 0) break;
        b.push(r);
      } else if (r < 2048) {
        if ((t -= 2) < 0) break;
        b.push(
          r >> 6 | 192,
          r & 63 | 128
        );
      } else if (r < 65536) {
        if ((t -= 3) < 0) break;
        b.push(
          r >> 12 | 224,
          r >> 6 & 63 | 128,
          r & 63 | 128
        );
      } else if (r < 1114112) {
        if ((t -= 4) < 0) break;
        b.push(
          r >> 18 | 240,
          r >> 12 & 63 | 128,
          r >> 6 & 63 | 128,
          r & 63 | 128
        );
      } else
        throw new Error("Invalid code point");
    }
    return b;
  }
  function j(a) {
    const t = [];
    for (let r = 0; r < a.length; ++r)
      t.push(a.charCodeAt(r) & 255);
    return t;
  }
  function z(a, t) {
    let r, d, g;
    const b = [];
    for (let N = 0; N < a.length && !((t -= 2) < 0); ++N)
      r = a.charCodeAt(N), d = r >> 8, g = r % 256, b.push(g), b.push(d);
    return b;
  }
  function V(a) {
    return e.toByteArray(Ge(a));
  }
  function Q(a, t, r, d) {
    let g;
    for (g = 0; g < d && !(g + r >= t.length || g >= a.length); ++g)
      t[g + r] = a[g];
    return g;
  }
  function oe(a, t) {
    return a instanceof t || a != null && a.constructor != null && a.constructor.name != null && a.constructor.name === t.name;
  }
  function $e(a) {
    return a !== a;
  }
  const Ue = function() {
    const a = "0123456789abcdef", t = new Array(256);
    for (let r = 0; r < 16; ++r) {
      const d = r * 16;
      for (let g = 0; g < 16; ++g)
        t[d + g] = a[r] + a[g];
    }
    return t;
  }();
  function ye(a) {
    return typeof BigInt > "u" ? ve : a;
  }
  function ve() {
    throw new Error("BigInt not supported");
  }
})(xr);
const Nt = xr.Buffer;
function st() {
  const l = ur(), e = We();
  return l ? l.navigate : e.navigate ?? ((n) => {
    window.location.assign(n);
  });
}
function vt() {
  const l = ur();
  if (l) {
    const i = l.setParams ?? ((s, o) => {
      const c = s(new URLSearchParams(window.location.search)), p = new URL(window.location.href);
      p.search = c.toString(), o != null && o.replace ? window.history.replaceState({}, "", p.toString()) : window.history.pushState({}, "", p.toString());
    });
    return [l.params, i];
  }
  return [new URLSearchParams(window.location.search), (i, s) => {
    const o = i(new URLSearchParams(window.location.search)), c = new URL(window.location.href);
    c.search = o.toString(), s != null && s.replace ? window.history.replaceState({}, "", c.toString()) : window.history.pushState({}, "", c.toString());
  }];
}
const xo = {
  en: gr,
  fr: mr
}, ht = (l) => {
  const { i18n: e } = Ye();
  ie(() => {
    typeof (e == null ? void 0 : e.hasResourceBundle) == "function" && Object.entries(xo).forEach(([n, i]) => {
      e.hasResourceBundle(n, l) || e.addResourceBundle(n, l, i, !0, !1);
    });
  }, [l]);
}, nt = async ({
  transactions: l,
  transactionsDisplayInfo: e
}) => {
  const n = $r(), i = Ar.getInstance(), s = await n.signTransactions(l), o = await i.send(s);
  return await i.track(o, {
    transactionsDisplayInfo: e
  });
}, Ke = (l, e) => {
  const { network: n } = Je(), [i, s] = F([]), { address: o } = ar(), c = (e == null ? void 0 : e.enabled) ?? !0, f = Ir().length > 0, m = async () => {
    if (!(!c || f || !o))
      try {
        if (l) {
          const { data: _ } = await pe.get(`/accounts/${o}/tokens`, {
            baseURL: n.apiAddress,
            params: { size: 1e3, identifier: l }
          });
          s(_);
          return;
        }
        const y = [];
        let S = 0;
        for (; ; ) {
          const { data: _ } = await pe.get(`/accounts/${o}/tokens`, {
            baseURL: n.apiAddress,
            params: { size: 1e3, from: S }
          });
          if (y.push(..._), _.length < 1e3) break;
          S += 1e3;
        }
        s(y);
      } catch {
        s([]);
      }
  };
  return ie(() => {
    if (!c || !o) {
      s([]);
      return;
    }
    m();
  }, [o, f, l, c]), i;
}, bo = {
  card: {
    background: "linear-gradient(0deg, rgba(99,74,203,0.32), rgba(99,74,203,0.32)), linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%), #0a0614",
    borderColor: "#695885",
    color: "#ffffff"
  },
  inner: {
    backgroundColor: "rgba(13,8,28,0.75)",
    borderColor: "#695885"
  },
  input: {
    backgroundColor: "rgba(8,4,18,0.9)",
    color: "#ffffff",
    borderColor: "#695885"
  },
  tokenBtn: {
    backgroundColor: "rgba(8,4,18,0.9)",
    color: "#ffffff",
    borderColor: "#695885"
  },
  dropdown: {
    backgroundColor: "#0d0820",
    borderColor: "#695885"
  },
  searchInput: {
    backgroundColor: "rgba(5,2,14,0.95)",
    color: "#ffffff",
    borderColor: "#695885"
  },
  invertBtn: {
    backgroundColor: "rgba(8,4,18,0.9)",
    borderColor: "#695885"
  },
  quoteSection: {
    backgroundColor: "rgba(13,8,28,0.75)",
    borderColor: "#695885"
  },
  tabBar: {
    backgroundColor: "rgba(13,8,28,0.6)"
  },
  activeTab: {
    background: "linear-gradient(135deg, rgba(189,55,236,0.3), rgba(31,103,255,0.3))",
    color: "#BD37EC"
  }
}, yo = {
  card: { backgroundColor: "#111", color: "#ffffff" },
  inner: { backgroundColor: "#1e1e1e", borderColor: "#333" },
  input: { backgroundColor: "#2a2a2a", color: "#ffffff", borderColor: "#444" },
  tokenBtn: { backgroundColor: "#2a2a2a", color: "#ffffff", borderColor: "#444" },
  dropdown: { backgroundColor: "#2a2a2a", borderColor: "#444" },
  searchInput: { backgroundColor: "#1e1e1e", color: "#ffffff", borderColor: "#555" },
  invertBtn: { backgroundColor: "#2a2a2a", borderColor: "#444" },
  quoteSection: { backgroundColor: "#1a1a1a", borderColor: "#333" },
  tabBar: { backgroundColor: "#1a1a1a" },
  activeTab: { backgroundColor: "#2a2a2a", color: "#f59e0b" }
}, wo = {
  card: { backgroundColor: "#ffffff", color: "#111111" },
  inner: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  input: { backgroundColor: "#ffffff", color: "#111111", borderColor: "#e5e7eb" },
  tokenBtn: { backgroundColor: "#ffffff", color: "#111111", borderColor: "#e5e7eb" },
  dropdown: { backgroundColor: "#ffffff", borderColor: "#e5e7eb" },
  searchInput: { backgroundColor: "#f9fafb", color: "#111111", borderColor: "#e5e7eb" },
  invertBtn: { backgroundColor: "#ffffff", borderColor: "#e5e7eb" },
  quoteSection: { backgroundColor: "#ffffff", borderColor: "#e5e7eb" },
  tabBar: { backgroundColor: "#f3f4f6" },
  activeTab: { backgroundColor: "#ffffff", color: "#f59e0b" }
}, _o = {
  card: {},
  inner: {},
  input: {},
  tokenBtn: {},
  dropdown: {},
  searchInput: {},
  invertBtn: {},
  quoteSection: {},
  tabBar: {},
  activeTab: {}
};
function Rt(l) {
  return l === "mid" ? bo : l === "dark" ? yo : l === "light" ? wo : _o;
}
const gt = ({ id: l, title: e, children: n, description: i, reference: s, className: o = "", onClick: c }) => {
  const { theme: p } = We(), f = Rt(p), m = o.includes("border") ? "" : "border border-gray-100 dark:border-[#333]";
  return /* @__PURE__ */ w(
    "div",
    {
      id: l,
      onClick: c,
      style: f.card,
      className: `flex flex-col bg-[#ffffff] dark:bg-[#111] p-6 rounded-2xl shadow-sm transition-all ${m} ${o}`,
      children: [
        /* @__PURE__ */ w("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ h(
            "h2",
            {
              className: "text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase",
              style: p ? { color: f.card.color } : {},
              children: e
            }
          ),
          s ? /* @__PURE__ */ h(
            "a",
            {
              href: s,
              target: "_blank",
              rel: "noreferrer",
              className: "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors",
              title: "More info",
              children: /* @__PURE__ */ h(Lr, { size: 14 })
            }
          ) : null
        ] }),
        i ? /* @__PURE__ */ h(
          "p",
          {
            className: "mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400 font-medium",
            style: p === "mid" ? { color: "rgba(255,255,255,0.55)" } : {},
            children: i
          }
        ) : null,
        i && n ? /* @__PURE__ */ h(
          "div",
          {
            className: "my-4 h-px bg-gray-100 dark:bg-[#333]",
            style: p === "mid" ? { backgroundColor: "#695885" } : {}
          }
        ) : /* @__PURE__ */ h("div", { className: "mt-3" }),
        n
      ]
    }
  );
};
function Xt({ url: l, ticker: e }) {
  const [n, i] = F(!1);
  return !l || n ? /* @__PURE__ */ h("span", { className: "w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0", children: e.slice(0, 2) }) : /* @__PURE__ */ h(
    "img",
    {
      src: l,
      alt: e,
      className: "w-6 h-6 rounded-full object-contain shrink-0",
      onError: () => i(!0)
    }
  );
}
function it({
  value: l,
  onChange: e,
  tokens: n,
  exclude: i,
  loading: s,
  className: o = ""
}) {
  const { t: c } = Ye("swap"), { theme: p } = We(), f = Rt(p), [m, u] = F(!1), [y, S] = F(""), _ = ut(null), x = ut(null), v = n.filter((k) => k.identifier !== i).filter((k) => {
    if (!y) return !0;
    const E = y.toLowerCase();
    return k.ticker.toLowerCase().includes(E) || k.identifier.toLowerCase().includes(E);
  });
  return ie(() => {
    if (!m) {
      S("");
      return;
    }
    setTimeout(() => {
      var E;
      return (E = x.current) == null ? void 0 : E.focus();
    }, 50);
    const k = (E) => {
      _.current && !_.current.contains(E.target) && u(!1);
    };
    return document.addEventListener("mousedown", k), () => document.removeEventListener("mousedown", k);
  }, [m]), /* @__PURE__ */ w("div", { ref: _, className: `relative flex-1 ${o}`, children: [
    /* @__PURE__ */ w(
      "button",
      {
        type: "button",
        disabled: s,
        onClick: () => u((k) => !k),
        style: f.tokenBtn,
        className: "w-full flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#444] bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50",
        children: [
          s ? /* @__PURE__ */ h("span", { className: "flex-1 text-left text-gray-400", children: c("token_loading") }) : l ? /* @__PURE__ */ w(dt, { children: [
            /* @__PURE__ */ h(Xt, { url: l.logoUrl, ticker: l.ticker }),
            /* @__PURE__ */ h("span", { className: "flex-1 text-left", children: l.ticker })
          ] }) : /* @__PURE__ */ h("span", { className: "flex-1 text-left text-gray-400", children: c("token_select") }),
          /* @__PURE__ */ h(
            "svg",
            {
              className: `w-4 h-4 text-gray-400 transition-transform shrink-0 ${m ? "rotate-180" : ""}`,
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              strokeWidth: 2,
              children: /* @__PURE__ */ h("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 9l-7 7-7-7" })
            }
          )
        ]
      }
    ),
    m && /* @__PURE__ */ w(
      "div",
      {
        style: f.dropdown,
        className: "absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-[#444] bg-[#ffffff] dark:bg-[#2a2a2a] shadow-lg overflow-hidden",
        children: [
          /* @__PURE__ */ h("div", { className: "px-2 pt-2 pb-1", children: /* @__PURE__ */ h(
            "input",
            {
              ref: x,
              type: "text",
              value: y,
              onChange: (k) => S(k.target.value),
              placeholder: c("token_search"),
              style: f.searchInput,
              className: "w-full rounded-lg border border-gray-200 dark:border-[#555] bg-gray-50 dark:bg-[#1e1e1e] px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            }
          ) }),
          /* @__PURE__ */ h("div", { className: "max-h-52 overflow-y-auto", children: v.length === 0 ? /* @__PURE__ */ h("p", { className: "px-3 py-3 text-sm text-gray-400 text-center", children: c("token_no_results") }) : v.map((k) => {
            const E = (l == null ? void 0 : l.identifier) === k.identifier;
            return /* @__PURE__ */ w(
              "button",
              {
                type: "button",
                onClick: () => {
                  e(k), u(!1);
                },
                style: E ? p === "mid" ? { backgroundColor: "rgba(189,55,236,0.2)", color: "#BD37EC" } : {} : p === "mid" ? { color: "#ffffff" } : {},
                className: `w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-amber-50 dark:hover:bg-[#333] ${E ? "bg-amber-50 dark:bg-[#333] text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`,
                children: [
                  /* @__PURE__ */ h(Xt, { url: k.logoUrl, ticker: k.ticker }),
                  /* @__PURE__ */ h("span", { className: "flex-1 text-left", children: k.ticker }),
                  /* @__PURE__ */ h("span", { className: "text-[10px] text-gray-400 font-normal", children: k.identifier.split("-")[1] ?? "" })
                ]
              },
              k.identifier
            );
          }) })
        ]
      }
    )
  ] });
}
const ze = (l) => {
  let n = BigInt(l).toString(16);
  return n.length % 2 && (n = "0" + n), n;
}, Zt = [5e-3, 0.01, 0.02], Qt = {
  identifier: "EGLD",
  ticker: "EGLD",
  poolCount: 0,
  decimals: 18,
  logoUrl: null
}, er = (l) => Nt.from(l, "utf8").toString("hex"), ko = (l, e) => BigInt(
  new B(l).multipliedBy(1 - e).toFixed(0, B.ROUND_DOWN)
), No = () => {
  var Pt, Dt, qt;
  const {
    apiUrl: l,
    routerAddress: e,
    aggregatorAddress: n,
    wrapContract: i,
    wegldIdentifier: s,
    routes: o,
    theme: c
  } = We(), p = Rt(c), { t: f } = Ye("swap");
  ht("swap");
  const { address: m } = pt(), { account: u } = ar(), { network: y } = Je(), [S, _] = vt(), x = st(), [v, k] = F([]), [E, D] = F(/* @__PURE__ */ new Set()), [R, U] = F(!0), [L, ee] = F(null), [C, ae] = F(null), A = ut(!1), [O, ge] = F(""), [me, K] = F(""), [T, W] = F("in"), [P, Y] = F(null), [he, Ee] = F(!1), [ke, te] = F(null), [se, xe] = F(null), [J, re] = F(!1), [Oe, Te] = F(null), $ = !!(L && C && L.identifier === C.identifier), [G, M] = F(0.01), [ne, Fe] = F(!1), [je, Re] = F(null), Pe = ut(null), [we, Ne] = F(!1), Ce = (L == null ? void 0 : L.identifier) === "EGLD", Ge = Ke(
    Ce || L == null ? void 0 : L.identifier,
    { enabled: !!L && !Ce && !!m }
  );
  ie(() => {
    Ne(!!(L && m));
  }, [L == null ? void 0 : L.identifier]), ie(() => {
    Ne(!1);
  }, [Ge]);
  const Ie = Ce ? (u == null ? void 0 : u.balance) ?? null : ((Pt = Ge == null ? void 0 : Ge[0]) == null ? void 0 : Pt.balance) ?? null, j = Ie && L ? new B(Ie).shiftedBy(-L.decimals).toFixed(6, B.ROUND_DOWN) : null, z = !we && m && L ? Ie ?? "0" : Ie, V = T === "out" && P ? P.amountIn : T === "in" && O ? new B(O).shiftedBy((L == null ? void 0 : L.decimals) ?? 18).toFixed(0, B.ROUND_DOWN) : null, Q = z && V ? new B(V).isGreaterThan(z) : !1, oe = (C == null ? void 0 : C.identifier) === "EGLD", $e = Ke(
    oe || C == null ? void 0 : C.identifier,
    { enabled: !!C && !oe && !!m }
  ), Ue = oe ? (u == null ? void 0 : u.balance) ?? null : ((Dt = $e == null ? void 0 : $e[0]) == null ? void 0 : Dt.balance) ?? null, ye = Ue && C ? new B(Ue).shiftedBy(-C.decimals).toFixed(6, B.ROUND_DOWN) : null, ve = (L == null ? void 0 : L.identifier) === "EGLD" && (C == null ? void 0 : C.identifier) === s, a = (L == null ? void 0 : L.identifier) === s && (C == null ? void 0 : C.identifier) === "EGLD", t = ve || a, r = () => {
    !Ie || !L || (W("in"), K(""), ge(
      new B(Ie).shiftedBy(-L.decimals).toFixed(L.decimals, B.ROUND_DOWN)
    ));
  };
  ie(() => {
    l && (U(!0), Promise.all([
      pe.get(`${l}/tokens`),
      pe.get(`${l}/tokens/hub`).catch(() => ({ data: { hubTokens: [] } }))
    ]).then(([I, ce]) => {
      var _e;
      const be = (I.data.tokens || []).filter((Le) => Le.identifier), X = be.find((Le) => Le.ticker === "WEGLD");
      k([
        { ...Qt, logoUrl: (X == null ? void 0 : X.logoUrl) ?? null },
        ...be
      ]);
      const fe = (((_e = ce.data) == null ? void 0 : _e.hubTokens) ?? []).map(
        (Le) => Le.identifier
      );
      D(new Set(fe));
    }).catch(() => k([Qt])).finally(() => U(!1)));
  }, [l]), ie(() => {
    if (v.length === 0 || A.current) return;
    A.current = !0;
    const I = S.get("from"), ce = S.get("to"), be = I ? v.find((fe) => fe.identifier === I) : null, X = ce ? v.find((fe) => fe.identifier === ce) : null;
    be && ee(be), X && ae(X), A.current = !0;
  }, [v, R]), ie(() => {
    A.current && _(
      (I) => {
        const ce = new URLSearchParams(I);
        return L ? ce.set("from", L.identifier) : ce.delete("from"), C ? ce.set("to", C.identifier) : ce.delete("to"), ce;
      },
      { replace: !0 }
    );
  }, [L, C]);
  const d = At(async () => {
    var X, fe, _e, Le;
    if (t) {
      Y(null), te(null), xe(null), Te(null);
      return;
    }
    if (!L || !C) {
      Y(null), te(null), xe(null), Te(null);
      return;
    }
    if ($) {
      Y(null), te(null), re(!0), Te(null);
      try {
        const Se = {
          token: L.identifier,
          slippageBps: Math.round(G * 1e4)
        };
        O && Number(O) > 0 && (Se.amountIn = new B(O).shiftedBy(L.decimals).toFixed(0, B.ROUND_DOWN));
        const { data: Xe } = await pe.get(`${l}/arb`, {
          params: Se
        });
        xe(Xe), (!O || Number(O) <= 0) && ge(
          new B(Xe.amountIn).shiftedBy(-L.decimals).toFixed(6, B.ROUND_DOWN)
        );
      } catch {
        xe(null);
      } finally {
        re(!1);
      }
      return;
    }
    const I = T === "in" ? O : me;
    if (!I || Number(I) <= 0) {
      Y(null), te(null);
      return;
    }
    const ce = T === "in" ? L : C, be = new B(I).shiftedBy(ce.decimals).toFixed(0, B.ROUND_DOWN);
    Ee(!0), te(null);
    try {
      const { data: Se } = await pe.get(`${l}/quote`, {
        params: {
          tokenIn: L.identifier,
          tokenOut: C.identifier,
          ...T === "in" ? { amountIn: be } : { amountOut: be },
          slippageBps: Math.round(G * 1e4)
        }
      });
      Y(Se);
    } catch (Se) {
      const Xe = (fe = (X = Se == null ? void 0 : Se.response) == null ? void 0 : X.data) == null ? void 0 : fe.code;
      te(
        Xe === "AMOUNT_TOO_LOW" ? f("error_amount_too_low") : Xe === "NO_ROUTE" ? f("error_no_route") : Xe === "INSUFFICIENT_LIQUIDITY" ? f("error_insufficient_liquidity") : ((Le = (_e = Se == null ? void 0 : Se.response) == null ? void 0 : _e.data) == null ? void 0 : Le.message) ?? f("error_quote")
      ), Y(null);
    } finally {
      Ee(!1);
    }
  }, [L, C, O, me, T, $, t, G]);
  ie(() => (Pe.current && clearTimeout(Pe.current), Pe.current = setTimeout(d, 300), () => {
    Pe.current && clearTimeout(Pe.current);
  }), [d]);
  const g = () => {
    ee(C), ae(L), T === "in" ? (W("out"), K(O), ge("")) : (W("in"), ge(me), K("")), Y(null);
  }, b = async () => {
    if (!(!L || !m) && !($ && !se) && !(!$ && !P)) {
      Re(null), Fe(!0);
      try {
        const { tx: I } = $ ? se : P;
        if (![e, n].map(
          (X) => X.toLowerCase()
        ).includes(I.scAddress.toLowerCase())) {
          Re(`Receiver refusé : ${I.scAddress}`);
          return;
        }
        const be = new tt({
          value: BigInt(I.egldValue),
          data: new TextEncoder().encode(I.txData),
          receiver: new qe(I.scAddress),
          sender: new qe(m),
          gasLimit: BigInt(I.gasLimit),
          gasPrice: BigInt(rt),
          chainID: y.chainId,
          version: 1
        });
        await nt({
          transactions: [be],
          transactionsDisplayInfo: {
            processingMessage: f("processing"),
            errorMessage: f("error_tx"),
            successMessage: f("success_tx")
          }
        }), ge(""), K(""), W("in"), Y(null), xe(null);
      } catch (I) {
        Re((I == null ? void 0 : I.message) ?? "Erreur lors du swap");
      } finally {
        Fe(!1);
      }
    }
  }, N = T === "in" ? O : me, H = t ? N ? new B(N).toFixed(6, B.ROUND_DOWN) : "" : T === "out" ? me : $ && se ? new B(se.amountOut).shiftedBy(-((L == null ? void 0 : L.decimals) ?? 18)).toFixed(6, B.ROUND_DOWN) : P ? new B(P.amountOut).shiftedBy(-((C == null ? void 0 : C.decimals) ?? 18)).toFixed(6, B.ROUND_DOWN) : "", de = T === "out" && !t && P ? new B(P.amountIn).shiftedBy(-((L == null ? void 0 : L.decimals) ?? 18)).toFixed(6, B.ROUND_DOWN) : O, le = se ? new B(se.profit).shiftedBy(-((L == null ? void 0 : L.decimals) ?? 18)).toFixed(6, B.ROUND_DOWN) : null, ue = P && !t ? new B(ko(P.amountOut, G).toString()).shiftedBy(-((C == null ? void 0 : C.decimals) ?? 18)).toFixed(6, B.ROUND_DOWN) : null, Z = P ? (parseFloat(P.priceImpact) * 100).toFixed(2) : null, yr = Z ? parseFloat(Z) < 1 ? "text-green-600 dark:text-green-400" : parseFloat(Z) < 3 ? "text-amber-500 dark:text-amber-400" : "text-red-600 dark:text-red-400" : "", wr = t ? !!m && !ne && !Q && !!N && Number(N) > 0 : $ ? !!se && !!m && !ne && !J && !Oe && !Q : !!P && !!m && !ne && !he && !ke && !Q, _r = (C == null ? void 0 : C.identifier) === "EGLD", kr = async () => {
    const I = T === "out" ? me : O;
    if (!(!L || !m || !I || Number(I) <= 0)) {
      Re(null), Fe(!0);
      try {
        const ce = new qe(m), be = BigInt(
          new B(I).shiftedBy(18).toFixed(0, B.ROUND_DOWN)
        ), X = new qe(i);
        let fe, _e, Le;
        ve ? (_e = X, Le = be, fe = "wrapEgld") : (_e = ce, Le = BigInt(0), fe = [
          "MultiESDTNFTTransfer",
          X.toHex(),
          "01",
          er(s),
          "00",
          ze(be),
          er("unwrapEgld")
        ].join("@"));
        const Se = new tt({
          value: Le,
          data: new TextEncoder().encode(fe),
          receiver: _e,
          sender: ce,
          gasLimit: BigInt(3e6),
          gasPrice: BigInt(rt),
          chainID: y.chainId,
          version: 1
        });
        await nt({
          transactions: [Se],
          transactionsDisplayInfo: {
            processingMessage: f(ve ? "processing_wrap" : "processing_unwrap"),
            errorMessage: f(ve ? "error_wrap" : "error_unwrap"),
            successMessage: f(ve ? "success_wrap" : "success_unwrap")
          }
        }), ge(""), K(""), W("in");
      } catch (ce) {
        Re((ce == null ? void 0 : ce.message) ?? "Erreur");
      } finally {
        Fe(!1);
      }
    }
  };
  return /* @__PURE__ */ h("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ h(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ w("div", { className: "flex flex-col xs:flex-row items-start xs:items-center justify-between w-full gap-4", children: [
        /* @__PURE__ */ w("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ h("span", { className: "text-xl", children: "🔄" }),
          /* @__PURE__ */ h("span", { className: "text-lg font-black tracking-tight", children: "Swap" })
        ] }),
        /* @__PURE__ */ w("div", { style: p.tabBar, className: "flex gap-1.5 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full xs:w-auto", children: [
          /* @__PURE__ */ h("button", { style: p.activeTab, className: "flex-1 xs:flex-initial px-4 sm:px-6 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all", children: f("tab_swap") }),
          /* @__PURE__ */ h(
            "button",
            {
              onClick: () => x(o.liquidity),
              className: "flex-1 xs:flex-initial px-4 sm:px-6 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5",
              children: f("tab_liquidity")
            }
          )
        ] })
      ] }),
      description: f("card_description"),
      children: /* @__PURE__ */ w("div", { className: "space-y-2 mt-4", children: [
        /* @__PURE__ */ w("div", { style: p.inner, className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ w("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ w("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ h("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: f("you_send") }),
              L && /* @__PURE__ */ w(
                "a",
                {
                  href: `${y.explorerAddress}/tokens/${L.identifier}`,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors",
                  children: [
                    L.ticker,
                    " ↗"
                  ]
                }
              )
            ] }),
            he && T === "out" && /* @__PURE__ */ h("span", { className: "text-[10px] text-gray-400 animate-pulse uppercase tracking-wider", children: f("calculating") }),
            m && j && /* @__PURE__ */ w(
              "button",
              {
                onClick: r,
                className: "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-600 transition-colors",
                children: [
                  /* @__PURE__ */ w("span", { className: "text-gray-400", children: [
                    f("balance"),
                    " :"
                  ] }),
                  j,
                  /* @__PURE__ */ h("span", { className: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold", children: "MAX" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ w("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ h(
              it,
              {
                value: L,
                onChange: (I) => {
                  ee(I), Y(null);
                },
                tokens: v,
                exclude: void 0,
                loading: R
              }
            ),
            /* @__PURE__ */ h(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: de,
                onChange: (I) => {
                  W("in"), ge(I.target.value), K(""), Y(null);
                },
                style: p.input,
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${Q ? "border-red-400 dark:border-red-500 focus:ring-red-400" : T === "in" ? "border-amber-400 dark:border-amber-500 focus:ring-amber-500" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] }),
          Q && /* @__PURE__ */ h("p", { className: "mt-2 text-[10px] font-semibold text-red-500 text-right", children: f("insufficient_balance") })
        ] }),
        /* @__PURE__ */ h("div", { className: "flex justify-center -my-0.5 relative z-10", children: /* @__PURE__ */ h(
          "button",
          {
            onClick: g,
            style: p.invertBtn,
            className: "rounded-full p-2 bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors",
            children: /* @__PURE__ */ h(Sr, { className: "h-4 w-4 text-amber-500" })
          }
        ) }),
        /* @__PURE__ */ w("div", { style: p.inner, className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ w("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ w("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ h("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: f("you_receive") }),
              C && /* @__PURE__ */ w(
                "a",
                {
                  href: `${y.explorerAddress}/tokens/${C.identifier}`,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors",
                  children: [
                    C.ticker,
                    " ↗"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ w("div", { className: "flex items-center gap-2", children: [
              he && T === "in" && /* @__PURE__ */ h("span", { className: "text-[10px] text-gray-400 animate-pulse uppercase tracking-wider", children: f("calculating") }),
              m && ye && /* @__PURE__ */ w("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: [
                f("balance"),
                " :",
                " ",
                /* @__PURE__ */ h("span", { className: "text-amber-500", children: ye })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ w("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ h(
              it,
              {
                value: C,
                onChange: (I) => {
                  ae(I), Y(null);
                },
                tokens: v,
                exclude: void 0,
                loading: R
              }
            ),
            /* @__PURE__ */ h(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: H,
                onChange: (I) => {
                  W("out"), K(I.target.value), ge(""), Y(null);
                },
                style: p.input,
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${T === "out" ? "border-amber-400 dark:border-amber-500 focus:ring-amber-500" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] })
        ] }),
        t && !!O && Number(O) > 0 && /* @__PURE__ */ h("div", { className: "rounded-2xl border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-900/10 px-4 py-3 text-sm text-cyan-700 dark:text-cyan-400", children: f(ve ? "wrap_info" : "unwrap_info") }),
        !t && P && !he && /* @__PURE__ */ w("div", { style: p.quoteSection, className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] px-4 py-3 space-y-2.5 text-sm", children: [
          /* @__PURE__ */ w("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ h("span", { className: "text-gray-500 dark:text-gray-400", children: f("price_impact") }),
            /* @__PURE__ */ w("span", { className: `font-semibold ${yr}`, children: [
              Z,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ w("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ h("span", { className: "text-gray-500 dark:text-gray-400", children: f("hops") }),
            /* @__PURE__ */ h("span", { className: "font-medium text-gray-900 dark:text-white", children: P.hops })
          ] }),
          /* @__PURE__ */ w("div", { className: "pt-2 border-t border-gray-100 dark:border-[#2a2a2a]", children: [
            /* @__PURE__ */ h("p", { className: "text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2", children: f("route") }),
            /* @__PURE__ */ w("div", { className: "flex items-center flex-wrap gap-0", children: [
              /* @__PURE__ */ h("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: (L == null ? void 0 : L.ticker) ?? ((qt = P.route[0]) == null ? void 0 : qt.tokenIn) }),
              Ce && /* @__PURE__ */ w(Be.Fragment, { children: [
                /* @__PURE__ */ w("div", { className: "flex flex-col items-center mx-1", children: [
                  /* @__PURE__ */ h("span", { className: "text-[9px] font-bold text-gray-400", children: "wrap" }),
                  /* @__PURE__ */ w("div", { className: "flex items-center gap-0.5", children: [
                    /* @__PURE__ */ h("div", { className: "h-px w-4 bg-gray-300 dark:bg-gray-600" }),
                    /* @__PURE__ */ h("span", { className: "text-[10px] leading-none text-gray-400", children: "▶" })
                  ] })
                ] }),
                /* @__PURE__ */ h("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: "WEGLD" })
              ] }),
              P.route.map((I, ce) => {
                var Le;
                const be = ((Le = v.find((Se) => Se.identifier === I.tokenOut)) == null ? void 0 : Le.ticker) ?? I.tokenOut, fe = (I.priceImpact ? parseFloat(I.priceImpact) * 100 : 0) >= 5, _e = I.dexType === "XExchange" ? {
                  line: "bg-blue-400 dark:bg-blue-500",
                  label: "text-blue-600 dark:text-blue-400",
                  name: "XExchange"
                } : I.dexType === "JExchange" ? {
                  line: "bg-green-400 dark:bg-green-500",
                  label: "text-green-600 dark:text-green-400",
                  name: "JExchange"
                } : {
                  line: "bg-amber-400 dark:bg-amber-500",
                  label: "text-amber-600 dark:text-amber-400",
                  name: "DinoVox"
                };
                return /* @__PURE__ */ w(Be.Fragment, { children: [
                  /* @__PURE__ */ w("div", { className: "flex flex-col items-center mx-1", children: [
                    /* @__PURE__ */ w(
                      "a",
                      {
                        href: `${y.explorerAddress}/accounts/${I.pair}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: `text-[9px] font-bold hover:underline ${fe ? "text-red-500" : _e.label}`,
                        title: I.pair,
                        children: [
                          _e.name,
                          " ↗"
                        ]
                      }
                    ),
                    /* @__PURE__ */ w("div", { className: "flex items-center gap-0.5", children: [
                      /* @__PURE__ */ h(
                        "div",
                        {
                          className: `h-px w-4 ${fe ? "bg-red-500" : _e.line}`
                        }
                      ),
                      /* @__PURE__ */ h(
                        "span",
                        {
                          className: `text-[10px] leading-none ${fe ? "text-red-500" : _e.label}`,
                          children: fe ? "⚠" : "▶"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ h("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: be })
                ] }, ce);
              }),
              _r && /* @__PURE__ */ w(Be.Fragment, { children: [
                /* @__PURE__ */ w("div", { className: "flex flex-col items-center mx-1", children: [
                  /* @__PURE__ */ h("span", { className: "text-[9px] font-bold text-gray-400", children: "unwrap" }),
                  /* @__PURE__ */ w("div", { className: "flex items-center gap-0.5", children: [
                    /* @__PURE__ */ h("div", { className: "h-px w-4 bg-gray-300 dark:bg-gray-600" }),
                    /* @__PURE__ */ h("span", { className: "text-[10px] leading-none text-gray-400", children: "▶" })
                  ] })
                ] }),
                /* @__PURE__ */ h("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: "EGLD" })
              ] })
            ] }),
            (() => {
              const I = P.route.filter(
                (X) => X.priceImpact && parseFloat(X.priceImpact) * 100 >= 5
              );
              if (I.length === 0) return null;
              const ce = I.some(
                (X) => X.dexType === "DinoVox" || !X.dexType
              ), be = I.find(
                (X) => X.dexType === "DinoVox" || !X.dexType
              );
              return /* @__PURE__ */ w("div", { className: "mt-2 flex flex-col gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-3 py-2 text-xs text-red-600 dark:text-red-400", children: [
                /* @__PURE__ */ w("div", { className: "flex items-start gap-2", children: [
                  /* @__PURE__ */ h("span", { className: "mt-0.5 shrink-0", children: "⚠" }),
                  /* @__PURE__ */ h("span", { children: f("high_impact_warning") })
                ] }),
                ce && be && (() => {
                  const X = be.tokenIn, fe = be.tokenOut, [_e, Le] = E.has(fe) && !E.has(X) ? [fe, X] : [X, fe];
                  return /* @__PURE__ */ h(
                    "button",
                    {
                      onClick: () => x(
                        `${o.addLiquidity}?tokenA=${_e}&tokenB=${Le}`
                      ),
                      className: "self-start underline font-semibold hover:text-red-700 dark:hover:text-red-300 transition",
                      children: f("add_liquidity_cta")
                    }
                  );
                })()
              ] });
            })()
          ] }),
          /* @__PURE__ */ w("div", { className: "pt-2 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between", children: [
            /* @__PURE__ */ h("span", { className: "text-gray-500 dark:text-gray-400", children: f("slippage") }),
            /* @__PURE__ */ h("div", { className: "flex gap-1", children: Zt.map((I) => /* @__PURE__ */ w(
              "button",
              {
                onClick: () => M(I),
                className: `px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${G === I ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"}`,
                children: [
                  (I * 100).toFixed(1),
                  "%"
                ]
              },
              I
            )) })
          ] }),
          /* @__PURE__ */ w("div", { className: "pt-2 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between", children: [
            /* @__PURE__ */ h("span", { className: "text-gray-500 dark:text-gray-400", children: f("min_received") }),
            /* @__PURE__ */ w("span", { className: "font-semibold text-gray-900 dark:text-white", children: [
              ue,
              " ",
              /* @__PURE__ */ h("span", { className: "text-gray-400 text-xs", children: C == null ? void 0 : C.ticker })
            ] })
          ] })
        ] }),
        $ && se && !J && /* @__PURE__ */ w("div", { className: "rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10 px-4 py-3 space-y-2.5 text-sm", children: [
          /* @__PURE__ */ w("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ h("span", { className: "text-green-700 dark:text-green-400 font-semibold", children: f("arb_profit") }),
            /* @__PURE__ */ w("span", { className: "font-bold text-green-600 dark:text-green-400", children: [
              "+",
              le,
              " ",
              L == null ? void 0 : L.ticker,
              " (",
              (se.profitBps / 100).toFixed(2),
              "%)"
            ] })
          ] }),
          se.route && se.route.length > 0 && /* @__PURE__ */ w("div", { className: "pt-2 border-t border-green-200 dark:border-green-800/50", children: [
            /* @__PURE__ */ h("p", { className: "text-[10px] uppercase tracking-wider font-semibold text-green-700/60 dark:text-green-400/60 mb-2", children: f("route") }),
            /* @__PURE__ */ w("div", { className: "flex items-center flex-wrap gap-0", children: [
              /* @__PURE__ */ h("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200", children: L == null ? void 0 : L.ticker }),
              se.route.map((I, ce) => {
                var fe;
                const be = ((fe = v.find((_e) => _e.identifier === I.tokenOut)) == null ? void 0 : fe.ticker) ?? I.tokenOut.split("-")[0], X = I.dexType === "XExchange" ? {
                  line: "bg-blue-400",
                  label: "text-blue-600 dark:text-blue-400",
                  name: "XExchange"
                } : I.dexType === "JExchange" ? {
                  line: "bg-purple-400",
                  label: "text-purple-600 dark:text-purple-400",
                  name: "JExchange"
                } : {
                  line: "bg-green-400",
                  label: "text-green-600 dark:text-green-400",
                  name: "DinoVox"
                };
                return /* @__PURE__ */ w(Be.Fragment, { children: [
                  /* @__PURE__ */ w("div", { className: "flex flex-col items-center mx-1", children: [
                    /* @__PURE__ */ w(
                      "a",
                      {
                        href: `${y.explorerAddress}/accounts/${I.pair}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: `text-[9px] font-bold hover:underline ${X.label}`,
                        title: I.pair,
                        children: [
                          X.name,
                          " ↗"
                        ]
                      }
                    ),
                    /* @__PURE__ */ w("div", { className: "flex items-center gap-0.5", children: [
                      /* @__PURE__ */ h("div", { className: `h-px w-4 ${X.line}` }),
                      /* @__PURE__ */ h(
                        "span",
                        {
                          className: `text-[10px] leading-none ${X.label}`,
                          children: "▶"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ h("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200", children: be })
                ] }, ce);
              })
            ] })
          ] }),
          /* @__PURE__ */ w("div", { className: "pt-2 border-t border-green-200 dark:border-green-800/50 flex items-center justify-between", children: [
            /* @__PURE__ */ h("span", { className: "text-green-700/70 dark:text-green-400/70", children: f("slippage") }),
            /* @__PURE__ */ h("div", { className: "flex gap-1", children: Zt.map((I) => /* @__PURE__ */ w(
              "button",
              {
                onClick: () => M(I),
                className: `px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${G === I ? "bg-green-500 text-white" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"}`,
                children: [
                  (I * 100).toFixed(1),
                  "%"
                ]
              },
              I
            )) })
          ] })
        ] }),
        $ && J && /* @__PURE__ */ h("div", { className: "text-center text-xs text-gray-400 animate-pulse py-2", children: f("calculating") }),
        (!t && !$ && ke || $ && Oe || je) && /* @__PURE__ */ h("div", { className: "rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-4 py-3 text-sm text-red-600 dark:text-red-400", children: $ ? Oe : ke ?? je }),
        /* @__PURE__ */ h(
          "button",
          {
            onClick: t ? kr : b,
            disabled: !wr,
            style: c === "mid" ? { background: "linear-gradient(135deg, #BD37EC, #1F67FF)", border: "none" } : {},
            className: `dinoButton orange w-full !py-3 text-base ${!L || !C ? "!bg-orange-400 dark:!bg-orange-500 !border-orange-600 dark:!border-orange-700 !text-orange-950 dark:!text-orange-950 font-bold !opacity-100 hover:!bg-orange-500 hover:!border-orange-700 dark:hover:!bg-orange-400" : "disabled:opacity-40 disabled:cursor-not-allowed"}`,
            children: m ? ne ? f("btn_signing") : !L || !C ? f("btn_select_tokens") : Q ? f("btn_insufficient") : $ ? f(J ? "btn_calculating" : Oe ? "btn_quote_unavailable" : "btn_arb") : !O || Number(O) <= 0 ? f("btn_enter_amount") : f(he ? "btn_calculating" : t ? ve ? "btn_wrap" : "btn_unwrap" : ke ? "btn_quote_unavailable" : "btn_swap") : f("btn_connect")
          }
        )
      ] })
    }
  ) });
}, vo = () => {
  const { apiUrl: l, routes: e } = We(), { t: n } = Ye("swap");
  ht("swap");
  const i = st(), { address: s } = pt(), { network: o } = Je(), [c, p] = Be.useState([]), [f, m] = Be.useState(!0), [u, y] = Be.useState([]);
  Be.useEffect(() => {
    l && (m(!0), pe.get(`${l}/pools`).then((_) => {
      p(_.data.pools || []);
    }).catch(console.error).finally(() => m(!1)));
  }, [l]);
  const S = Ke(void 0, { enabled: !!s });
  return Be.useEffect(() => {
    if (!S || S.length === 0 || c.length === 0 || !(o != null && o.apiAddress)) {
      y([]);
      return;
    }
    const _ = c.flatMap((x) => {
      const v = S.find((k) => k.identifier === x.lpToken);
      return v && new B(v.balance).gt(0) ? [{ pool: x, balance: v.balance }] : [];
    });
    if (_.length === 0) {
      y([]);
      return;
    }
    Promise.all(
      _.map(async ({ pool: x, balance: v }) => {
        var R, U, L;
        const [k, E, D] = await Promise.all([
          pe.get(`/tokens/${x.lpToken}`, { baseURL: o.apiAddress }),
          pe.get(`/tokens/${x.tokenA}`, { baseURL: o.apiAddress }).catch(() => null),
          pe.get(`/tokens/${x.tokenB}`, { baseURL: o.apiAddress }).catch(() => null)
        ]);
        return { pool: x, balance: v, lpTotalSupply: ((R = k.data) == null ? void 0 : R.minted) ?? "1", decimalsA: ((U = E == null ? void 0 : E.data) == null ? void 0 : U.decimals) ?? 18, decimalsB: ((L = D == null ? void 0 : D.data) == null ? void 0 : L.decimals) ?? 18 };
      })
    ).then(y).catch(console.error);
  }, [S, c, o == null ? void 0 : o.apiAddress]), /* @__PURE__ */ h("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ h(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ w("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4", children: [
        /* @__PURE__ */ w("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ h("span", { className: "text-xl", children: "💧" }),
          /* @__PURE__ */ h("span", { className: "text-lg font-black tracking-tight", children: n("liquidity_title") })
        ] }),
        /* @__PURE__ */ w("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full sm:w-auto", children: [
          /* @__PURE__ */ h("button", { onClick: () => i(e.swap), className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5", children: "Swap" }),
          /* @__PURE__ */ h("button", { className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all", children: n("tab_liquidity") }),
          /* @__PURE__ */ h("button", { onClick: () => i(e.pools), className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5", children: "Pools" })
        ] })
      ] }),
      description: n("liquidity_card_desc"),
      children: /* @__PURE__ */ h("div", { className: "space-y-4 mt-4", children: !f && u.length === 0 ? /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-6 text-center", children: [
        /* @__PURE__ */ h("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-4", children: n("liquidity_empty") }),
        /* @__PURE__ */ h("button", { onClick: () => i(e.addLiquidity), className: "dinoButton w-full !py-3 text-base", children: n("liquidity_add") })
      ] }) : /* @__PURE__ */ w("div", { className: "space-y-4", children: [
        u.map((_) => {
          const x = _.pool.lpToken.split("-")[0], v = new B(_.balance).shiftedBy(-18).toFixed(6, B.ROUND_DOWN), k = new B(_.lpTotalSupply), E = k.isZero() ? new B(1) : k, D = new B(_.balance).multipliedBy(_.pool.reserveA).dividedBy(E).shiftedBy(-_.decimalsA).toFixed(6, B.ROUND_DOWN), R = new B(_.balance).multipliedBy(_.pool.reserveB).dividedBy(E).shiftedBy(-_.decimalsB).toFixed(6, B.ROUND_DOWN);
          return /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#2a2a2a] p-4", children: [
            /* @__PURE__ */ w("div", { className: "flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 mb-3", children: [
              /* @__PURE__ */ w("div", { className: "min-w-0", children: [
                /* @__PURE__ */ w("div", { className: "flex items-center gap-2 mb-0.5", children: [
                  /* @__PURE__ */ h("span", { className: "font-bold text-gray-900 dark:text-white uppercase truncate", children: x }),
                  /* @__PURE__ */ h("span", { className: "text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800 flex-shrink-0", children: "LP" })
                ] }),
                /* @__PURE__ */ w("p", { className: "text-xs text-gray-500 font-medium truncate", children: [
                  _.pool.tokenA.split("-")[0],
                  " / ",
                  _.pool.tokenB.split("-")[0]
                ] })
              ] }),
              /* @__PURE__ */ w("div", { className: "xs:text-right w-full xs:w-auto", children: [
                /* @__PURE__ */ w("p", { className: "font-bold text-gray-900 dark:text-white mb-1", children: [
                  v,
                  " LP"
                ] }),
                /* @__PURE__ */ w("div", { className: "flex gap-3 xs:justify-end", children: [
                  /* @__PURE__ */ h("button", { onClick: () => i(`${e.addLiquidity}?tokenA=${_.pool.tokenA}&tokenB=${_.pool.tokenB}`), className: "text-xs font-bold text-green-500 hover:text-green-600 transition underline decoration-dashed", children: n("liquidity_add_btn") }),
                  /* @__PURE__ */ h("button", { onClick: () => i(`${e.removeLiquidity}?pool=${_.pool.address}`), className: "text-xs font-bold text-red-500 hover:text-red-600 transition underline decoration-dashed", children: n("liquidity_remove_btn") })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ w("div", { className: "grid grid-cols-2 gap-2", children: [
              /* @__PURE__ */ w("div", { className: "rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#333] px-3 py-2 text-xs", children: [
                /* @__PURE__ */ w("p", { className: "text-gray-400 mb-0.5", children: [
                  "≈ ",
                  _.pool.tokenA.split("-")[0]
                ] }),
                /* @__PURE__ */ h("p", { className: "font-bold text-gray-900 dark:text-white", children: D })
              ] }),
              /* @__PURE__ */ w("div", { className: "rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#333] px-3 py-2 text-xs", children: [
                /* @__PURE__ */ w("p", { className: "text-gray-400 mb-0.5", children: [
                  "≈ ",
                  _.pool.tokenB.split("-")[0]
                ] }),
                /* @__PURE__ */ h("p", { className: "font-bold text-gray-900 dark:text-white", children: R })
              ] })
            ] })
          ] }, _.pool.address);
        }),
        /* @__PURE__ */ h("button", { onClick: () => i(e.addLiquidity), className: "dinoButton w-full !py-3 text-base", children: n("liquidity_add") })
      ] }) })
    }
  ) });
}, Ct = (l) => Nt.from(l, "utf8").toString("hex");
function Lo(l) {
  if (l < 2n) return l;
  let e = l, n = (e + 1n) / 2n;
  for (; n < e; )
    e = n, n = (e + l / e) / 2n;
  return e;
}
const So = () => {
  var Ge, Ie;
  const { apiUrl: l, routes: e } = We(), { t: n } = Ye("swap");
  ht("swap");
  const { address: i } = pt(), { network: s } = Je(), o = st(), [c, p] = vt(), [f, m] = F([]), [u, y] = F([]), [S, _] = F(!0), [x, v] = F(null), [k, E] = F(null), D = (j) => {
    v(j), p((z) => {
      const V = new URLSearchParams(z);
      return j ? V.set("tokenA", j.identifier) : V.delete("tokenA"), V;
    }, { replace: !0 });
  }, R = (j) => {
    E(j), p((z) => {
      const V = new URLSearchParams(z);
      return j ? V.set("tokenB", j.identifier) : V.delete("tokenB"), V;
    }, { replace: !0 });
  }, [U, L] = F(""), [ee, C] = F(""), ae = ut("A"), [A, O] = F(null), [ge, me] = F(!1), [K, T] = F(null), [W, P] = F(null), [Y, he] = F(0n), [Ee, ke] = F(0n), [te, se] = F(/* @__PURE__ */ new Set()), xe = Ke(void 0, { enabled: !!i }), [J, re] = F([]), Oe = Be.useMemo(() => {
    const j = J.length > 0 ? J : [];
    return k && !j.some((z) => z.identifier === k.identifier) ? [k, ...j] : j;
  }, [J, k]);
  ie(() => {
    if (!xe || xe.length === 0) {
      re([]);
      return;
    }
    const j = xe.filter((z) => !te.has(z.identifier)).map((z) => {
      var V, Q;
      return {
        identifier: z.identifier,
        ticker: z.ticker || z.identifier.split("-")[0],
        poolCount: 0,
        decimals: z.decimals ?? 18,
        logoUrl: ((V = z.assets) == null ? void 0 : V.svgUrl) ?? ((Q = z.assets) == null ? void 0 : Q.pngUrl) ?? null
      };
    });
    re(j);
  }, [xe, te]);
  const Te = Ke((x == null ? void 0 : x.identifier) ?? void 0, { enabled: !!x && !!i }), $ = Ke((k == null ? void 0 : k.identifier) ?? void 0, { enabled: !!k && !!i }), G = ((Ge = Te == null ? void 0 : Te[0]) == null ? void 0 : Ge.balance) ?? "0", M = ((Ie = $ == null ? void 0 : $[0]) == null ? void 0 : Ie.balance) ?? "0", ne = x && G ? new B(G).shiftedBy(-x.decimals).toFixed(6, B.ROUND_DOWN) : "0", Fe = k && M ? new B(M).shiftedBy(-k.decimals).toFixed(6, B.ROUND_DOWN) : "0";
  ie(() => {
    if (!l) return;
    _(!0), (async () => {
      var z;
      try {
        const [V, Q, oe] = await Promise.all([
          pe.get(`${l}/tokens`),
          pe.get(`${l}/tokens/hub`).catch(() => ({ data: [] })),
          pe.get(`${l}/pools`).catch(() => ({ data: { pools: [] } }))
        ]), $e = (oe.data.pools || []).map((r) => r.lpToken).filter(Boolean);
        se(new Set($e));
        const Ue = V.data.tokens || [], ye = ((z = Q.data) == null ? void 0 : z.hubTokens) || [], ve = ye.map((r) => r.identifier), a = [...Ue];
        for (const r of ye) a.find((d) => d.identifier === r.identifier) || a.push({ ...r, poolCount: 0 });
        const t = a.map((r) => ({ identifier: r.identifier, ticker: r.ticker || r.identifier.split("-")[0], poolCount: r.poolCount ?? 0, decimals: r.decimals ?? 18, logoUrl: r.logoUrl ?? null }));
        m(t), y(t.filter((r) => ve.includes(r.identifier)));
      } catch (V) {
        console.error(V);
      } finally {
        _(!1);
      }
    })();
  }, [l]), ie(() => {
    if (f.length === 0) return;
    const j = c.get("tokenA"), z = c.get("tokenB");
    j && !x && v(f.find((V) => V.identifier === j) || null), z && !k && E(f.find((V) => V.identifier === z) || null);
  }, [f]), ie(() => {
    if (!x || !k) {
      O(null), T(null);
      return;
    }
    me(!0), pe.get(`${l}/pools`).then(async (j) => {
      var Q;
      const V = (j.data.pools || []).find((oe) => oe.tokenA === x.identifier && oe.tokenB === k.identifier || oe.tokenA === k.identifier && oe.tokenB === x.identifier);
      if (O(V || null), V != null && V.lpToken && (s != null && s.apiAddress))
        try {
          const oe = await pe.get(`/tokens/${V.lpToken}`, { baseURL: s.apiAddress });
          T(((Q = oe.data) == null ? void 0 : Q.minted) ?? null);
        } catch {
          T(null);
        }
      else T(null);
    }).catch(console.error).finally(() => me(!1));
  }, [x, k]);
  const je = (j) => {
    if (L(j), ae.current = "A", !A || !x || !k || !j) return;
    const z = A.tokenA === x.identifier, V = new B(z ? A.reserveA : A.reserveB), Q = new B(z ? A.reserveB : A.reserveA);
    V.isZero() || Q.isZero() || C(new B(j).shiftedBy(x.decimals).multipliedBy(Q).dividedBy(V).shiftedBy(-k.decimals).toFixed(6, B.ROUND_UP));
  }, Re = (j) => {
    if (C(j), ae.current = "B", !A || !x || !k || !j) return;
    const z = A.tokenA === x.identifier, V = new B(z ? A.reserveA : A.reserveB), Q = new B(z ? A.reserveB : A.reserveA);
    V.isZero() || Q.isZero() || L(new B(j).shiftedBy(k.decimals).multipliedBy(V).dividedBy(Q).shiftedBy(-x.decimals).toFixed(6, B.ROUND_UP));
  };
  ie(() => {
    if (!x || !k || !U || !ee || Number(U) <= 0 || Number(ee) <= 0) {
      P(null), he(0n), ke(0n);
      return;
    }
    const j = BigInt(new B(U).shiftedBy(x.decimals).toFixed(0)), z = BigInt(new B(ee).shiftedBy(k.decimals).toFixed(0)), V = A ? new B(A.reserveA) : new B(0), Q = A ? new B(A.reserveB) : new B(0);
    if (!(A && V.gt(0) && Q.gt(0))) {
      P(Lo(j * z)), he(0n), ke(0n);
      return;
    }
    const $e = A.tokenA === x.identifier, Ue = $e ? j : z, ye = $e ? z : j, ve = BigInt(V.toFixed(0)), a = BigInt(Q.toFixed(0)), t = BigInt(new B(K ?? "0").isZero() ? "1" : new B(K).toFixed(0)), r = ve > 0n ? Ue * t / ve : 0n, d = a > 0n ? ye * t / a : 0n;
    if (r <= d) {
      P(r);
      const g = ve > 0n ? Ue * a / ve : 0n;
      he(0n), ke($e ? ye - g : Ue - g);
    } else {
      P(d);
      const g = a > 0n ? ye * ve / a : 0n;
      he($e ? Ue - g : ye - g), ke(0n);
    }
  }, [U, ee, A, x, k, K]);
  const Pe = async () => {
    if (!(!A || !x || !k || !i || !U || !ee))
      try {
        const j = BigInt(new B(U).shiftedBy(x.decimals).toFixed(0)), z = BigInt(new B(ee).shiftedBy(k.decimals).toFixed(0)), V = new qe(i), Q = ["MultiESDTNFTTransfer", new qe(A.address).toHex(), "02", Ct(x.identifier), "00", ze(j), Ct(k.identifier), "00", ze(z), Ct("addLiquidity"), ze(0n), ze(0n)], oe = new tt({ value: 0n, data: new TextEncoder().encode(Q.join("@")), receiver: V, sender: V, gasLimit: 15000000n, gasPrice: BigInt(rt), chainID: s.chainId, version: 1 });
        await nt({ transactions: [oe], transactionsDisplayInfo: { processingMessage: n("add_processing"), errorMessage: n("add_error"), successMessage: n("add_success") } }), L(""), C("");
      } catch (j) {
        console.error(j);
      }
  }, we = !!(U && new B(U).shiftedBy((x == null ? void 0 : x.decimals) ?? 18).isGreaterThan(G)), Ne = !!(ee && new B(ee).shiftedBy((k == null ? void 0 : k.decimals) ?? 18).isGreaterThan(M)), Ce = !!(A && new B(A.reserveA).gt(0) && new B(A.reserveB).gt(0));
  return /* @__PURE__ */ h("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ h(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ h("div", { className: "flex flex-col xs:flex-row items-start xs:items-center gap-3 w-full", children: /* @__PURE__ */ w("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ h("button", { onClick: () => o(e.liquidity), className: "p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition flex-shrink-0", children: /* @__PURE__ */ h(Tt, { className: "w-4 h-4 text-gray-600 dark:text-gray-300" }) }),
        /* @__PURE__ */ h("span", { className: "text-xl", children: "➕" }),
        /* @__PURE__ */ h("span", { className: "text-lg font-black tracking-tight whitespace-nowrap", children: n("add_card_title") })
      ] }) }),
      description: n("add_card_desc"),
      children: /* @__PURE__ */ w("div", { className: "space-y-2 mt-4", children: [
        /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ w("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ h("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: n("add_token1") }),
            /* @__PURE__ */ w("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ w("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-500", children: [
                n("balance"),
                ": ",
                /* @__PURE__ */ h("span", { className: "text-amber-500", children: ne })
              ] }),
              x && G !== "0" && /* @__PURE__ */ h("button", { onClick: () => je(new B(G).shiftedBy(-x.decimals).toFixed(x.decimals, B.ROUND_DOWN)), className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition", children: "MAX" })
            ] })
          ] }),
          /* @__PURE__ */ w("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ h(it, { value: x, onChange: D, tokens: u, exclude: k == null ? void 0 : k.identifier, loading: S }),
            /* @__PURE__ */ h(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: U,
                onChange: (j) => je(j.target.value),
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${we ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ h("div", { className: "flex justify-center -my-3 relative z-10", children: /* @__PURE__ */ h("div", { className: "rounded-full p-1.5 bg-[#ffffff] dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]", children: /* @__PURE__ */ h(Br, { className: "w-4 h-4 text-amber-500" }) }) }),
        /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ w("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ h("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: n("add_token2") }),
            /* @__PURE__ */ w("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ w("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-500", children: [
                n("balance"),
                ": ",
                /* @__PURE__ */ h("span", { className: "text-amber-500", children: Fe })
              ] }),
              k && M !== "0" && /* @__PURE__ */ h("button", { onClick: () => Re(new B(M).shiftedBy(-k.decimals).toFixed(k.decimals, B.ROUND_DOWN)), className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition", children: "MAX" })
            ] })
          ] }),
          /* @__PURE__ */ w("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ h(it, { value: k, onChange: R, tokens: Oe, exclude: x == null ? void 0 : x.identifier, loading: S || xe.length > 0 && J.length === 0 }),
            /* @__PURE__ */ h(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: ee,
                onChange: (j) => Re(j.target.value),
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${Ne ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] })
        ] }),
        ge && /* @__PURE__ */ h("p", { className: "text-center text-xs text-gray-500 mt-4 animate-pulse", children: n("add_pool_searching") }),
        !ge && x && k && !A && /* @__PURE__ */ w("div", { className: "rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 mt-4", children: [
          /* @__PURE__ */ h("p", { className: "text-sm font-semibold text-amber-600 dark:text-amber-400", children: n("add_no_pool_title") }),
          /* @__PURE__ */ h("p", { className: "text-xs text-amber-500 mt-1", children: n("add_no_pool_desc") }),
          /* @__PURE__ */ h("button", { onClick: () => o(`${e.createPool}?tokenX=${(x == null ? void 0 : x.identifier) ?? ""}&tokenY=${(k == null ? void 0 : k.identifier) ?? ""}`), className: "mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition", children: n("add_no_pool_btn") })
        ] }),
        A && W !== null && /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] p-4 mt-4 space-y-2", children: [
          /* @__PURE__ */ w("div", { className: "flex justify-between text-sm", children: [
            /* @__PURE__ */ h("span", { className: "text-gray-500", children: n("add_lp_preview") }),
            /* @__PURE__ */ w("span", { className: "font-bold text-amber-500", children: [
              new B(W.toString()).shiftedBy(-18).toFixed(6),
              " LP"
            ] })
          ] }),
          Y > 0n && /* @__PURE__ */ w("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ h("span", { className: "text-gray-500", children: n("add_refund", { ticker: x == null ? void 0 : x.ticker }) }),
            /* @__PURE__ */ h("span", { className: "font-medium text-gray-700 dark:text-gray-300", children: new B(Y.toString()).shiftedBy(-((x == null ? void 0 : x.decimals) ?? 18)).toFixed(6) })
          ] }),
          Ee > 0n && /* @__PURE__ */ w("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ h("span", { className: "text-gray-500", children: n("add_refund", { ticker: k == null ? void 0 : k.ticker }) }),
            /* @__PURE__ */ h("span", { className: "font-medium text-gray-700 dark:text-gray-300", children: new B(Ee.toString()).shiftedBy(-((k == null ? void 0 : k.decimals) ?? 18)).toFixed(6) })
          ] }),
          W < 1000n && !Ce && /* @__PURE__ */ h("p", { className: "text-xs text-red-500 mt-2", children: n("add_min_deposit") })
        ] }),
        /* @__PURE__ */ h(
          "button",
          {
            onClick: Pe,
            disabled: !A || !A.isActive || we || Ne || !U || !ee || W !== null && W < 1000n && !Ce,
            className: "dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed",
            children: i ? A ? A.isActive ? we || Ne ? n("add_btn_insufficient") : !U || !ee ? n("add_btn_enter_amount") : W !== null && W < 1000n && !Ce ? n("add_btn_min") : n("add_btn_submit") : n("add_btn_inactive") : n("add_btn_no_pool") : n("add_btn_connect")
          }
        )
      ] })
    }
  ) });
}, Bo = (l) => {
  const { network: e } = Je(), [n, i] = F({});
  return ie(() => {
    if (!l || l === "EGLD") return;
    const s = l === "EGLD" ? "EGLD-000000" : l, o = `esdt_${s}`, c = localStorage.getItem(o), p = Number(localStorage.getItem(`${o}_expire`));
    if (c && Date.now() < p) {
      i(JSON.parse(c));
      return;
    }
    pe.get(`/tokens/${s}`, { baseURL: e.apiAddress }).then(({ data: f }) => {
      i(f), localStorage.setItem(o, JSON.stringify(f)), localStorage.setItem(`${o}_expire`, String(Date.now() + 36e5));
    }).catch(() => i({}));
  }, [l, e.apiAddress]), n;
}, $t = ({
  amount: l,
  identifier: e,
  decimals: n,
  displayDecimals: i,
  showIdentifier: s = !0,
  nonce: o
}) => {
  const c = Bo(o && o > 0 ? "" : e), p = e === "EGLD" ? "EGLD" : (c == null ? void 0 : c.ticker) || e, f = n !== void 0 ? n : e === "EGLD" ? 18 : (c == null ? void 0 : c.decimals) || 0;
  if (l == null || isNaN(Number(l))) return /* @__PURE__ */ h(dt, { children: `0 ${p}` });
  const u = new B(l).div(new B(10).pow(f));
  let y;
  if (i !== void 0)
    y = u.toFixed(i, B.ROUND_DOWN);
  else {
    let S = f < 2 ? f : 2;
    if (u.gt(0) && u.lt(0.01)) {
      const _ = Math.floor(Math.log10(u.toNumber()));
      S = Math.min(-_ - 1 + 2, f);
    }
    y = u.toNumber().toLocaleString(void 0, { minimumFractionDigits: S, maximumFractionDigits: S });
  }
  return /* @__PURE__ */ h(dt, { children: `${y}${s ? " " + p : ""}${s && o && o > 0 ? `-${ze(BigInt(o))}` : ""}` });
}, tr = (l) => Nt.from(l, "utf8").toString("hex"), Eo = () => {
  var K;
  const { apiUrl: l, routes: e } = We(), { t: n } = Ye(), { address: i } = pt(), { network: s } = Je(), o = st(), [c, p] = F([]), [f, m] = F({}), [u, y] = F(""), [S, _] = F(!0), [x, v] = F(null), [k, E] = F(""), [D] = vt();
  ie(() => {
    l && pe.get(`${l}/tokens`).then((T) => {
      const W = {};
      for (const P of T.data.tokens || [])
        W[P.identifier] = { identifier: P.identifier, ticker: P.ticker || P.identifier.split("-")[0], decimals: P.decimals ?? 18 };
      m(W);
    }).catch(console.error);
  }, [l]), ie(() => {
    l && (_(!0), pe.get(`${l}/pools`).then((T) => {
      const W = (T.data.pools || []).filter((Y) => Y.isActive);
      p(W);
      const P = D.get("pool");
      P && W.some((Y) => Y.address === P) && y(P);
    }).catch(console.error).finally(() => _(!1)));
  }, [l, D]);
  const R = c.find((T) => T.address === u);
  ie(() => {
    if (!(R != null && R.lpToken) || !(s != null && s.apiAddress)) {
      v(null);
      return;
    }
    pe.get(`/tokens/${R.lpToken}`, { baseURL: s.apiAddress }).then((T) => {
      var W;
      return v(((W = T.data) == null ? void 0 : W.minted) ?? null);
    }).catch(() => v(null));
  }, [R == null ? void 0 : R.lpToken, s == null ? void 0 : s.apiAddress]);
  const U = Ke((R == null ? void 0 : R.lpToken) ?? void 0, { enabled: !!R && !!i }), L = ((K = U == null ? void 0 : U[0]) == null ? void 0 : K.balance) ?? "0";
  new B(L).shiftedBy(-18).toFixed(6, B.ROUND_DOWN);
  const ee = () => {
    !L || L === "0" || E(new B(L).shiftedBy(-18).toFixed(18, B.ROUND_DOWN).replace(/\.?0+$/, ""));
  }, C = x ?? (R == null ? void 0 : R.lpSupply) ?? "0", ae = new B(C).isZero() ? new B(1) : new B(C), A = R && k ? BigInt(new B(k).shiftedBy(18).multipliedBy(R.reserveA).dividedBy(ae).toFixed(0, B.ROUND_DOWN)) : 0n, O = R && k ? BigInt(new B(k).shiftedBy(18).multipliedBy(R.reserveB).dividedBy(ae).toFixed(0, B.ROUND_DOWN)) : 0n, ge = async () => {
    if (!(!R || !i || !k))
      try {
        const T = BigInt(new B(k).shiftedBy(18).toFixed(0)), W = ["ESDTTransfer", tr(R.lpToken), ze(T), tr("removeLiquidity"), ze(0n), ze(0n)], P = new tt({
          value: 0n,
          data: new TextEncoder().encode(W.join("@")),
          receiver: new qe(R.address),
          sender: new qe(i),
          gasLimit: 12000000n,
          gasPrice: BigInt(rt),
          chainID: s.chainId,
          version: 1
        });
        await nt({ transactions: [P], transactionsDisplayInfo: { processingMessage: "Retrait en cours...", errorMessage: "Le retrait a échoué", successMessage: "Liquidité retirée !" } }), E("");
      } catch (T) {
        console.error(T);
      }
  }, me = !!(k && new B(k).shiftedBy(18).isGreaterThan(L));
  return /* @__PURE__ */ h("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ h(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ w("div", { className: "flex items-center gap-3 w-full", children: [
        /* @__PURE__ */ h("button", { onClick: () => o(e.liquidity), className: "p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition flex-shrink-0", children: /* @__PURE__ */ h(Tt, { className: "w-4 h-4 text-gray-600 dark:text-gray-300" }) }),
        /* @__PURE__ */ h("span", { className: "text-xl", children: "🔓" }),
        /* @__PURE__ */ h("span", { className: "text-lg font-black tracking-tight", children: "Retirer Liquidité" })
      ] }),
      description: "Retirez vos LP tokens pour récupérer vos actifs",
      children: /* @__PURE__ */ w("div", { className: "space-y-4 mt-4", children: [
        /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ h("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2", children: "Sélectionner une Pool" }),
          /* @__PURE__ */ w(
            "select",
            {
              className: "w-full rounded-xl border border-gray-200 dark:border-[#444] bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500",
              value: u,
              onChange: (T) => y(T.target.value),
              disabled: S,
              children: [
                /* @__PURE__ */ h("option", { value: "", children: S ? "Chargement..." : "Choisir une pool" }),
                c.map((T) => {
                  var W, P;
                  return /* @__PURE__ */ w("option", { value: T.address, children: [
                    ((W = f[T.tokenA]) == null ? void 0 : W.ticker) || T.tokenA,
                    " - ",
                    ((P = f[T.tokenB]) == null ? void 0 : P.ticker) || T.tokenB
                  ] }, T.address);
                })
              ]
            }
          )
        ] }),
        R && /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ w("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ h("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: "Montant LP à retirer" }),
            /* @__PURE__ */ w("button", { onClick: ee, className: "text-[10px] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-600 flex items-center gap-1", children: [
              "MAX (",
              /* @__PURE__ */ h($t, { amount: new B(L.toString()).toFixed(0, B.ROUND_DOWN), identifier: R.lpToken }),
              ")"
            ] })
          ] }),
          /* @__PURE__ */ h(
            "input",
            {
              type: "number",
              min: "0",
              placeholder: "0.0",
              value: k,
              onChange: (T) => E(T.target.value),
              className: `w-full rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${me ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
            }
          ),
          me && /* @__PURE__ */ h("p", { className: "mt-1 text-xs text-red-500", children: "Solde LP insuffisant" })
        ] }),
        R && k && A > 0n && O > 0n && !me && /* @__PURE__ */ w(dt, { children: [
          /* @__PURE__ */ h("div", { className: "flex justify-center -my-2 relative z-10", children: /* @__PURE__ */ h("div", { className: "rounded-full p-1.5 bg-[#ffffff] dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]", children: /* @__PURE__ */ h(Er, { className: "w-4 h-4 text-amber-500" }) }) }),
          /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] p-4 space-y-3 shadow-sm", children: [
            /* @__PURE__ */ h("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center", children: "Vous recevrez (estimation)" }),
            /* @__PURE__ */ h("div", { className: "text-sm font-bold text-gray-900 dark:text-white", children: /* @__PURE__ */ h($t, { amount: new B(A.toString()).toFixed(0, B.ROUND_DOWN), identifier: R.tokenA }) }),
            /* @__PURE__ */ h("div", { className: "text-sm font-bold text-gray-900 dark:text-white", children: /* @__PURE__ */ h($t, { amount: new B(O.toString()).toFixed(0, B.ROUND_DOWN), identifier: R.tokenB }) })
          ] })
        ] }),
        /* @__PURE__ */ h(
          "button",
          {
            onClick: ge,
            disabled: !R || !i || !k || me,
            className: "dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed",
            children: i ? R ? k ? me ? "Solde insuffisant" : "Retirer Liquidité" : "Renseignez un montant" : "Sélectionnez une pool" : "Connectez votre wallet"
          }
        )
      ] })
    }
  ) });
}, Qe = (l) => Nt.from(l, "utf8").toString("hex"), Co = () => {
  const { apiUrl: l, factoryAddress: e, routes: n } = We(), { t: i } = Ye("swap");
  ht("swap");
  const { address: s } = pt(), { network: o } = Je(), c = st(), [p, f] = vt(), [m, u] = F([]), [y, S] = F(!0), [_, x] = F(/* @__PURE__ */ new Set()), [v, k] = F(null), [E, D] = F(null), R = ($) => {
    k($), f((G) => {
      const M = new URLSearchParams(G);
      return $ ? M.set("tokenX", $.identifier) : M.delete("tokenX"), M;
    }, { replace: !0 });
  }, U = ($) => {
    D($), f((G) => {
      const M = new URLSearchParams(G);
      return $ ? M.set("tokenY", $.identifier) : M.delete("tokenY"), M;
    }, { replace: !0 });
  }, [L, ee] = F(""), [C, ae] = F(""), [A, O] = F(null), [ge, me] = F(!1), [K, T] = F(!1), W = Ke(void 0, { enabled: !!s }), [P, Y] = F([]);
  ie(() => {
    if (!W || W.length === 0) {
      Y([]);
      return;
    }
    Y(W.filter(($) => !_.has($.identifier)).map(($) => {
      var G, M;
      return { identifier: $.identifier, ticker: $.ticker || $.identifier.split("-")[0], decimals: $.decimals ?? 18, logoUrl: ((G = $.assets) == null ? void 0 : G.svgUrl) ?? ((M = $.assets) == null ? void 0 : M.pngUrl) ?? null };
    }));
  }, [W, _]), ie(() => {
    l && (S(!0), Promise.all([
      pe.get(`${l}/tokens/hub`).catch(() => ({ data: [] })),
      pe.get(`${l}/pools`).catch(() => ({ data: { pools: [] } }))
    ]).then(([$, G]) => {
      var M;
      u((((M = $.data) == null ? void 0 : M.hubTokens) || []).map((ne) => ({ identifier: ne.identifier, ticker: ne.ticker || ne.identifier.split("-")[0], decimals: ne.decimals ?? 18, logoUrl: ne.logoUrl ?? null }))), x(new Set((G.data.pools || []).map((ne) => ne.lpToken).filter(Boolean)));
    }).catch(console.error).finally(() => S(!1)));
  }, [l]), ie(() => {
    if (y) return;
    const $ = p.get("tokenX"), G = p.get("tokenY");
    if ($ && !v) {
      const M = m.find((ne) => ne.identifier === $);
      M && k(M);
    }
    if (G && !E) {
      const M = P.find((ne) => ne.identifier === G);
      M && D(M);
    }
  }, [y, m, P]), ie(() => {
    if (!v || !E) return;
    const $ = (we) => we.split("-")[0].toUpperCase().replace(/[^A-Z0-9]/g, ""), G = $(v.ticker), M = $(E.ticker), ne = (we, Ne, Ce) => we.length + Ne.length <= Ce ? [we, Ne] : [we.slice(0, Ce - Math.floor(Ce / 2)), Ne.slice(0, Math.floor(Ce / 2))], [Fe, je] = ne(G, M, 18);
    ee(Fe + je + "LP");
    const [Re, Pe] = ne(G, M, 10);
    ae(Re + Pe);
  }, [v, E]);
  const he = async () => {
    var $, G;
    if (!(!v || !E))
      try {
        const M = await pe.get(`${l}/pools/pair`, { params: { tokenA: v.identifier, tokenB: E.identifier } });
        O(($ = M.data) != null && $.address ? M.data : null);
      } catch (M) {
        ((G = M == null ? void 0 : M.response) == null ? void 0 : G.status) !== 404 && console.error(M), O(null);
      }
  };
  ie(() => {
    he();
    const $ = setInterval(he, 5e3);
    return () => clearInterval($);
  }, [v, E]);
  const [Ee, ke] = Be.useState(!1);
  ie(() => {
    if (!Ee) return;
    const $ = setInterval(async () => {
      await he(), O((G) => (G && ke(!1), G));
    }, 2e3);
    return () => clearInterval($);
  }, [Ee, v, E]);
  const te = L.length >= 3 && L.length <= 20 && /^[a-zA-Z0-9]+$/.test(L), se = C.length >= 3 && C.length <= 10 && /^[A-Z0-9]+$/.test(C), xe = !!s && !!v && !!E && v.identifier !== E.identifier && te && se && !A, J = !!s && !!A && !A.isActive, re = ge || K, Oe = async () => {
    if (!(!xe || !v || !E)) {
      me(!0);
      try {
        const $ = ["createPair", Qe(v.identifier), Qe(E.identifier), Qe(L), Qe(C)], G = new tt({ value: 0n, data: new TextEncoder().encode($.join("@")), receiver: new qe(e), sender: new qe(s), gasLimit: 300000000n, gasPrice: BigInt(rt), chainID: o.chainId, version: 1 });
        await nt({ transactions: [G], transactionsDisplayInfo: { processingMessage: i("create_processing_pair"), errorMessage: i("create_error_pair"), successMessage: i("create_success_pair") } }), ke(!0);
      } catch ($) {
        console.error($);
      } finally {
        me(!1);
      }
    }
  }, Te = async () => {
    if (!(!J || !v || !E)) {
      T(!0);
      try {
        const $ = ["issueLpToken", Qe(v.identifier), Qe(E.identifier)], G = new tt({ value: 50000000000000000n, data: new TextEncoder().encode($.join("@")), receiver: new qe(e), sender: new qe(s), gasLimit: 150000000n, gasPrice: BigInt(rt), chainID: o.chainId, version: 1 });
        await nt({ transactions: [G], transactionsDisplayInfo: { processingMessage: i("create_processing_lp"), errorMessage: i("create_error_lp"), successMessage: i("create_success_lp") } });
      } catch ($) {
        console.error($);
      } finally {
        T(!1);
      }
    }
  };
  return /* @__PURE__ */ w("div", { className: "mx-auto max-w-lg px-4 py-8", children: [
    /* @__PURE__ */ w("div", { className: "flex items-center gap-3 mb-6", children: [
      /* @__PURE__ */ h("button", { onClick: () => c(n.liquidity), className: "p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition", children: /* @__PURE__ */ h(Tt, { className: "w-5 h-5 text-gray-600 dark:text-gray-300" }) }),
      /* @__PURE__ */ w("div", { children: [
        /* @__PURE__ */ h("h1", { className: "text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white", children: i("create_title") }),
        /* @__PURE__ */ h("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: i("create_subtitle") })
      ] })
    ] }),
    /* @__PURE__ */ w("div", { className: "space-y-4", children: [
      /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4 space-y-4", children: [
        /* @__PURE__ */ w("div", { children: [
          /* @__PURE__ */ h("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block", children: i("create_token1") }),
          /* @__PURE__ */ h(it, { value: v, onChange: re ? () => {
          } : R, tokens: m, exclude: E == null ? void 0 : E.identifier, loading: y })
        ] }),
        /* @__PURE__ */ w("div", { children: [
          /* @__PURE__ */ h("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block", children: i("create_token2") }),
          /* @__PURE__ */ h(it, { value: E, onChange: re ? () => {
          } : U, tokens: P, exclude: v == null ? void 0 : v.identifier, loading: y || W.length > 0 && P.length === 0 })
        ] }),
        /* @__PURE__ */ w("div", { children: [
          /* @__PURE__ */ h("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block", children: i("create_lp_name") }),
          /* @__PURE__ */ h(
            "input",
            {
              type: "text",
              value: L,
              onChange: ($) => ee($.target.value),
              disabled: re || !!A,
              className: `w-full rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${!te && L.length > 0 ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
            }
          )
        ] }),
        /* @__PURE__ */ w("div", { children: [
          /* @__PURE__ */ h("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block", children: i("create_lp_ticker") }),
          /* @__PURE__ */ h(
            "input",
            {
              type: "text",
              value: C,
              onChange: ($) => ae($.target.value.toUpperCase()),
              disabled: re || !!A,
              className: `w-full rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${!se && C.length > 0 ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
            }
          )
        ] })
      ] }),
      A ? A.isActive ? /* @__PURE__ */ w("div", { className: "rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-6 mt-4 text-center", children: [
        /* @__PURE__ */ h(Cr, { className: "w-12 h-12 text-green-500 mx-auto mb-3" }),
        /* @__PURE__ */ h("p", { className: "text-base font-bold text-green-700 dark:text-green-400 mb-2", children: i("create_pool_active") }),
        /* @__PURE__ */ h("p", { className: "text-sm text-green-600/80 dark:text-green-400/80 mb-4", children: i("create_pool_ready") }),
        /* @__PURE__ */ h("button", { onClick: () => c(`${n.addLiquidity}?tokenA=${v == null ? void 0 : v.identifier}&tokenB=${E == null ? void 0 : E.identifier}`), className: "w-full px-4 py-3 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition shadow-sm", children: i("create_add_liquidity") })
      ] }) : /* @__PURE__ */ w("div", { className: "rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 mt-4 text-center", children: [
        /* @__PURE__ */ h("p", { className: "text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3", children: i("create_pair_done") }),
        /* @__PURE__ */ h("p", { className: "text-xs text-amber-600/80 dark:text-amber-400/80 mb-4 text-left", children: i("create_pair_desc") }),
        /* @__PURE__ */ h("button", { onClick: Te, className: "w-full px-4 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition shadow-sm", children: i(K ? "create_tx_pending" : "create_step2") }),
        K && /* @__PURE__ */ h("p", { className: "text-center text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse", children: i("create_tx_waiting") })
      ] }) : /* @__PURE__ */ w(dt, { children: [
        /* @__PURE__ */ h("button", { onClick: Oe, disabled: !xe || ge, className: "dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed", children: i(ge ? "create_tx_pending" : "create_step1") }),
        ge && /* @__PURE__ */ h("p", { className: "text-center text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse", children: i("create_tx_waiting") })
      ] })
    ] })
  ] });
};
function rr(l, e) {
  const n = new B(l).shiftedBy(-e);
  return n.isZero() ? "0" : n.gte(1e6) ? n.toFormat(0) + "" : n.gte(1e3) ? n.toFormat(2) : n.gte(1) ? n.toFormat(4) : n.toFormat(6);
}
const $o = () => {
  const { apiUrl: l, routes: e } = We(), { t: n } = Ye("swap");
  ht("swap");
  const i = st(), [s, o] = Be.useState([]), [c, p] = Be.useState({}), [f, m] = Be.useState(!0), [u, y] = Be.useState("DinoVox");
  Be.useEffect(() => {
    l && (m(!0), Promise.all([
      pe.get(`${l}/pools`, { params: { dexType: u } }),
      pe.get(`${l}/tokens`)
    ]).then(([x, v]) => {
      const k = (x.data.pools || []).filter((D) => D.isActive);
      o(k);
      const E = {};
      for (const D of v.data.tokens || [])
        E[D.identifier] = { identifier: D.identifier, ticker: D.ticker ?? D.identifier.split("-")[0], decimals: D.decimals ?? 18 };
      p(E);
    }).catch(console.error).finally(() => m(!1)));
  }, [u, l]);
  const S = (x) => {
    var v;
    return ((v = c[x]) == null ? void 0 : v.ticker) ?? x.split("-")[0];
  }, _ = (x) => {
    var v;
    return ((v = c[x]) == null ? void 0 : v.decimals) ?? 18;
  };
  return /* @__PURE__ */ h("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ w(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ w("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4", children: [
        /* @__PURE__ */ w("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ h("span", { className: "text-xl", children: "🌊" }),
          /* @__PURE__ */ h("span", { className: "text-lg font-black tracking-tight", children: n("pools_title") })
        ] }),
        /* @__PURE__ */ w("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full sm:w-auto overflow-x-auto", children: [
          /* @__PURE__ */ h(
            "button",
            {
              onClick: () => i(e.swap),
              className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5 whitespace-nowrap",
              children: n("tab_swap")
            }
          ),
          /* @__PURE__ */ h(
            "button",
            {
              onClick: () => i(e.liquidity),
              className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5 whitespace-nowrap",
              children: n("tab_liquidity")
            }
          ),
          /* @__PURE__ */ h("button", { className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all whitespace-nowrap", children: n("pools_title") })
        ] })
      ] }),
      description: f ? n("pools_loading_desc") : n("pools_count", { count: s.length }),
      children: [
        /* @__PURE__ */ h("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl mt-4 w-fit", children: ["DinoVox", "XExchange"].map((x) => /* @__PURE__ */ h(
          "button",
          {
            onClick: () => y(x),
            className: `px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${u === x ? "bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md" : "text-gray-400 hover:text-gray-700 dark:hover:text-white"}`,
            children: x
          },
          x
        )) }),
        /* @__PURE__ */ w("div", { className: "space-y-3 mt-4", children: [
          f ? /* @__PURE__ */ h("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ h("div", { className: "w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" }) }) : s.length === 0 ? /* @__PURE__ */ h("p", { className: "text-center text-sm text-gray-500 dark:text-gray-400 py-8", children: n("pools_empty") }) : s.map((x) => {
            const v = S(x.tokenA), k = S(x.tokenB), E = _(x.tokenA), D = _(x.tokenB), R = rr(x.reserveA, E), U = rr(x.reserveB, D);
            return /* @__PURE__ */ w("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
              /* @__PURE__ */ w("div", { className: "flex items-center justify-between mb-3", children: [
                /* @__PURE__ */ w("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ w("span", { className: "font-black text-gray-900 dark:text-white text-base", children: [
                    v,
                    " / ",
                    k
                  ] }),
                  /* @__PURE__ */ h("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-semibold border border-green-200 dark:border-green-800 uppercase", children: n("pools_active") })
                ] }),
                u === "DinoVox" && /* @__PURE__ */ h(
                  "button",
                  {
                    onClick: () => i(`${e.addLiquidity}?tokenA=${x.tokenA}&tokenB=${x.tokenB}`),
                    className: "text-xs font-bold text-amber-500 hover:text-amber-600 transition",
                    children: n("pools_add")
                  }
                )
              ] }),
              /* @__PURE__ */ w("div", { className: "grid grid-cols-2 gap-3", children: [
                /* @__PURE__ */ w("div", { className: "rounded-xl bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-100 dark:border-[#333] px-3 py-2", children: [
                  /* @__PURE__ */ w("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5", children: [
                    n("pools_reserve"),
                    " ",
                    v
                  ] }),
                  /* @__PURE__ */ w("p", { className: "font-bold text-gray-900 dark:text-white text-sm", children: [
                    R,
                    " ",
                    /* @__PURE__ */ h("span", { className: "text-gray-400 font-medium", children: v })
                  ] })
                ] }),
                /* @__PURE__ */ w("div", { className: "rounded-xl bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-100 dark:border-[#333] px-3 py-2", children: [
                  /* @__PURE__ */ w("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5", children: [
                    n("pools_reserve"),
                    " ",
                    k
                  ] }),
                  /* @__PURE__ */ w("p", { className: "font-bold text-gray-900 dark:text-white text-sm", children: [
                    U,
                    " ",
                    /* @__PURE__ */ h("span", { className: "text-gray-400 font-medium", children: k })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ h("p", { className: "text-[10px] text-gray-400 mt-2 font-mono truncate", children: x.address })
            ] }, x.address);
          }),
          /* @__PURE__ */ h(
            "button",
            {
              onClick: () => i(e.createPool),
              className: "w-full py-3 rounded-xl border-2 border-amber-500 text-amber-500 font-bold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors mt-2",
              children: n("pools_create")
            }
          )
        ] })
      ]
    }
  ) });
}, xt = {
  swap: "",
  liquidity: "#liquidity",
  addLiquidity: "#add-liquidity",
  removeLiquidity: "#remove-liquidity",
  createPool: "#create-pool",
  pools: "#pools"
}, Ao = Object.fromEntries(
  Object.entries(xt).map(([l, e]) => [e, l])
);
function Io(l, e) {
  const n = Object.entries(e);
  n.sort((i, s) => s[1].length - i[1].length);
  for (const [i, s] of n)
    if (l === s) return i;
  return "swap";
}
function nr(l) {
  return Ao[l] ?? null;
}
const Yo = ({
  initialView: l = "swap"
}) => {
  const { routes: e, language: n, theme: i } = We(), [s, o] = F(
    () => typeof document < "u" && document.documentElement.classList.contains("dark")
  );
  ie(() => {
    if (i !== void 0) return;
    const _ = document.documentElement;
    o(_.classList.contains("dark"));
    const x = new MutationObserver(() => {
      o(_.classList.contains("dark"));
    });
    return x.observe(_, { attributes: !0, attributeFilter: ["class"] }), () => x.disconnect();
  }, [i]), ie(() => {
    const _ = (n || (typeof navigator < "u" ? navigator.language : "en") || "en").split("-")[0];
    ot.language !== _ && ot.isInitialized && ot.changeLanguage(_);
  }, [n]);
  const [{ view: c, params: p }, f] = F(() => ({
    view: (typeof window < "u" ? nr(window.location.hash) : null) ?? l,
    params: new URLSearchParams(window.location.search)
  })), m = At(
    (_) => {
      const [x, v] = _.split("?"), k = Io(x, e), E = xt[k], D = new URLSearchParams(v ?? ""), R = D.toString() ? "?" + D.toString() : "";
      window.history.pushState(
        null,
        "",
        window.location.pathname + R + E
      ), f({
        view: k,
        params: new URLSearchParams(v ?? "")
      });
    },
    [e]
  ), u = At(
    (_, x) => {
      f((v) => {
        const k = _(v.params), E = xt[v.view], D = window.location.pathname + "?" + k.toString() + E;
        return x != null && x.replace ? window.history.replaceState(null, "", D) : window.history.pushState(null, "", D), { ...v, params: k };
      });
    },
    []
  );
  ie(() => {
    const _ = () => {
      const x = nr(window.location.hash);
      x && f((v) => ({
        ...v,
        view: x,
        params: new URLSearchParams(window.location.search)
      }));
    };
    return window.addEventListener("popstate", _), () => window.removeEventListener("popstate", _);
  }, []), ie(() => {
    const _ = xt[c];
    _ && !window.location.hash && window.history.replaceState(null, "", _);
  }, []);
  const y = () => {
    switch (c) {
      case "liquidity":
        return /* @__PURE__ */ h(vo, {});
      case "addLiquidity":
        return /* @__PURE__ */ h(So, {});
      case "removeLiquidity":
        return /* @__PURE__ */ h(Eo, {});
      case "createPool":
        return /* @__PURE__ */ h(Co, {});
      case "pools":
        return /* @__PURE__ */ h($o, {});
      default:
        return /* @__PURE__ */ h(No, {});
    }
  }, S = i === "dark" ? "dark" : i === "light" ? "light" : i === "mid" || s ? "dark" : "";
  return /* @__PURE__ */ h(vr, { i18n: ot, children: /* @__PURE__ */ h(dr.Provider, { value: { params: p, navigate: m, setParams: u }, children: /* @__PURE__ */ h("div", { className: S || void 0, children: y() }) }) });
};
export {
  So as AddLiquidity,
  gt as Card,
  Co as CreatePool,
  $t as FormatAmount,
  vo as Liquidity,
  $o as Pools,
  Eo as RemoveLiquidity,
  No as Swap,
  zo as SwapConfigProvider,
  Yo as SwapWidget,
  it as TokenSelect,
  ze as bigToHex,
  nt as signAndSendTransactions,
  Ke as useGetUserESDT,
  We as useSwapConfig
};
//# sourceMappingURL=mx-swap-widget.es.js.map
