import { jsx as g, jsxs as _, Fragment as dt } from "react/jsx-runtime";
import Le, { createContext as tr, useContext as rr, useEffect as ae, useState as F, useRef as ut, useCallback as $t } from "react";
import { initReactI18next as wr, useTranslation as Je, I18nextProvider as _r } from "react-i18next";
import he from "axios";
import { Info as kr, ArrowUpDown as Nr, Plus as vr, ArrowLeft as It, ArrowDown as Lr, CheckCircle as Sr } from "lucide-react";
import { useGetAccount as pt } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetAccountInfo as nr } from "@multiversx/sdk-dapp/out/react/account/useGetAccountInfo";
import { useGetNetworkConfig as Xe } from "@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig";
import { Address as Pe, Transaction as tt } from "@multiversx/sdk-core";
import { GAS_PRICE as rt } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { getAccountProvider as Br } from "@multiversx/sdk-dapp/out/providers/helpers/accountProvider";
import { TransactionManager as Er } from "@multiversx/sdk-dapp/out/managers/TransactionManager";
import { useGetPendingTransactions as Cr } from "@multiversx/sdk-dapp/out/react/transactions/useGetPendingTransactions";
import S from "bignumber.js";
const ir = {
  swap: "/swap",
  liquidity: "/liquidity",
  addLiquidity: "/liquidity/add",
  removeLiquidity: "/liquidity/remove",
  createPool: "/liquidity/create",
  pools: "/liquidity/pools"
}, sr = {
  apiUrl: "https://dex.dinovox.com/api/v1",
  routerAddress: "erd1qqqqqqqqqqqqqpgq67xp5hv48n5vy5d8990uq8kpx99h7rfkfm8s2zqqxn",
  aggregatorAddress: "erd1qqqqqqqqqqqqqpgqly98mw70swxc403a7r63mr7pkzh9uhazfm8suv22ak",
  factoryAddress: "erd1qqqqqqqqqqqqqpgqq5852gnes6xxka35lw42prqwtv6a0znhfm8sn3h9n3",
  wrapContract: "erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3",
  wegldIdentifier: "WEGLD-bd4d79",
  routes: ir
}, ar = tr(sr), Ho = ({ config: l, children: e }) => {
  const n = {
    ...sr,
    ...l,
    routes: { ...ir, ...l == null ? void 0 : l.routes }
  };
  return /* @__PURE__ */ g(ar.Provider, { value: n, children: e });
}, Ge = () => rr(ar), or = tr(null), lr = () => rr(or), O = (l) => typeof l == "string", at = () => {
  let l, e;
  const n = new Promise((i, s) => {
    l = i, e = s;
  });
  return n.resolve = l, n.reject = e, n;
}, qt = (l) => l == null ? "" : String(l), $r = (l, e, n) => {
  l.forEach((i) => {
    e[i] && (n[i] = e[i]);
  });
}, Ar = /###/g, Ot = (l) => l && l.includes("###") ? l.replace(Ar, ".") : l, Ut = (l) => !l || O(l), lt = (l, e, n) => {
  const i = O(e) ? e.split(".") : e;
  let s = 0;
  for (; s < i.length - 1; ) {
    if (Ut(l)) return {};
    const o = Ot(i[s]);
    !l[o] && n && (l[o] = new n()), Object.prototype.hasOwnProperty.call(l, o) ? l = l[o] : l = {}, ++s;
  }
  return Ut(l) ? {} : {
    obj: l,
    k: Ot(i[s])
  };
}, jt = (l, e, n) => {
  const {
    obj: i,
    k: s
  } = lt(l, e, Object);
  if (i !== void 0 || e.length === 1) {
    i[s] = n;
    return;
  }
  let o = e[e.length - 1], d = e.slice(0, e.length - 1), f = lt(l, d, Object);
  for (; f.obj === void 0 && d.length; )
    o = `${d[d.length - 1]}.${o}`, d = d.slice(0, d.length - 1), f = lt(l, d, Object), f != null && f.obj && typeof f.obj[`${f.k}.${o}`] < "u" && (f.obj = void 0);
  f.obj[`${f.k}.${o}`] = n;
}, Ir = (l, e, n, i) => {
  const {
    obj: s,
    k: o
  } = lt(l, e, Object);
  s[o] = s[o] || [], s[o].push(n);
}, yt = (l, e) => {
  const {
    obj: n,
    k: i
  } = lt(l, e);
  if (n && Object.prototype.hasOwnProperty.call(n, i))
    return n[i];
}, Tr = (l, e, n) => {
  const i = yt(l, n);
  return i !== void 0 ? i : yt(e, n);
}, cr = (l, e, n) => {
  for (const i in e)
    i !== "__proto__" && i !== "constructor" && (i in l ? O(l[i]) || l[i] instanceof String || O(e[i]) || e[i] instanceof String ? n && (l[i] = e[i]) : cr(l[i], e[i], n) : l[i] = e[i]);
  return l;
}, ze = (l) => l.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), Fr = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;"
}, Rr = (l) => O(l) ? l.replace(/[&<>"'\/]/g, (e) => Fr[e]) : l;
class Pr {
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
const Dr = [" ", ",", "?", "!", ";"], qr = new Pr(20), Or = (l, e, n) => {
  e = e || "", n = n || "";
  const i = Dr.filter((d) => !e.includes(d) && !n.includes(d));
  if (i.length === 0) return !0;
  const s = qr.getRegExp(`(${i.map((d) => d === "?" ? "\\?" : d).join("|")})`);
  let o = !s.test(l);
  if (!o) {
    const d = l.indexOf(n);
    d > 0 && !s.test(l.substring(0, d)) && (o = !0);
  }
  return o;
}, At = (l, e, n = ".") => {
  if (!l) return;
  if (l[e])
    return Object.prototype.hasOwnProperty.call(l, e) ? l[e] : void 0;
  const i = e.split(n);
  let s = l;
  for (let o = 0; o < i.length; ) {
    if (!s || typeof s != "object")
      return;
    let d, f = "";
    for (let h = o; h < i.length; ++h)
      if (h !== o && (f += n), f += i[h], d = s[f], d !== void 0) {
        if (["string", "number", "boolean"].includes(typeof d) && h < i.length - 1)
          continue;
        o += h - o + 1;
        break;
      }
    s = d;
  }
  return s;
}, ft = (l) => l == null ? void 0 : l.replace(/_/g, "-"), Ur = {
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
class wt {
  constructor(e, n = {}) {
    this.init(e, n);
  }
  init(e, n = {}) {
    this.prefix = n.prefix || "i18next:", this.logger = e || Ur, this.options = n, this.debug = n.debug;
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
    return s && !this.debug ? null : (e = e.map((o) => O(o) ? o.replace(/[\r\n\x00-\x1F\x7F]/g, " ") : o), O(e[0]) && (e[0] = `${i}${this.prefix} ${e[0]}`), this.logger[n](e));
  }
  create(e) {
    return new wt(this.logger, {
      prefix: `${this.prefix}:${e}:`,
      ...this.options
    });
  }
  clone(e) {
    return e = e || this.options, e.prefix = e.prefix || this.prefix, new wt(this.logger, e);
  }
}
var We = new wt();
class kt {
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
      for (let d = 0; d < o; d++)
        s(...n);
    }), this.observers["*"] && Array.from(this.observers["*"].entries()).forEach(([s, o]) => {
      for (let d = 0; d < o; d++)
        s(e, ...n);
    });
  }
}
class Mt extends kt {
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
    var p, u;
    const o = s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator, d = s.ignoreJSONStructure !== void 0 ? s.ignoreJSONStructure : this.options.ignoreJSONStructure;
    let f;
    e.includes(".") ? f = e.split(".") : (f = [e, n], i && (Array.isArray(i) ? f.push(...i) : O(i) && o ? f.push(...i.split(o)) : f.push(i)));
    const h = yt(this.data, f);
    return !h && !n && !i && e.includes(".") && (e = f[0], n = f[1], i = f.slice(2).join(".")), h || !d || !O(i) ? h : At((u = (p = this.data) == null ? void 0 : p[e]) == null ? void 0 : u[n], i, o);
  }
  addResource(e, n, i, s, o = {
    silent: !1
  }) {
    const d = o.keySeparator !== void 0 ? o.keySeparator : this.options.keySeparator;
    let f = [e, n];
    i && (f = f.concat(d ? i.split(d) : i)), e.includes(".") && (f = e.split("."), s = n, n = f[1]), this.addNamespaces(n), jt(this.data, f, s), o.silent || this.emit("added", e, n, i, s);
  }
  addResources(e, n, i, s = {
    silent: !1
  }) {
    for (const o in i)
      (O(i[o]) || Array.isArray(i[o])) && this.addResource(e, n, o, i[o], {
        silent: !0
      });
    s.silent || this.emit("added", e, n, i);
  }
  addResourceBundle(e, n, i, s, o, d = {
    silent: !1,
    skipCopy: !1
  }) {
    let f = [e, n];
    e.includes(".") && (f = e.split("."), s = i, i = n, n = f[1]), this.addNamespaces(n);
    let h = yt(this.data, f) || {};
    d.skipCopy || (i = JSON.parse(JSON.stringify(i))), s ? cr(h, i, o) : h = {
      ...h,
      ...i
    }, jt(this.data, f, h), d.silent || this.emit("added", e, n, i);
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
var dr = {
  processors: {},
  addPostProcessor(l) {
    this.processors[l.name] = l;
  },
  handle(l, e, n, i, s) {
    return l.forEach((o) => {
      var d;
      e = ((d = this.processors[o]) == null ? void 0 : d.process(e, n, i, s)) ?? e;
    }), e;
  }
};
const ur = Symbol("i18next/PATH_KEY");
function jr() {
  const l = [], e = /* @__PURE__ */ Object.create(null);
  let n;
  return e.get = (i, s) => {
    var o;
    return (o = n == null ? void 0 : n.revoke) == null || o.call(n), s === ur ? l : (l.push(s), n = Proxy.revocable(i, e), n.proxy);
  }, Proxy.revocable(/* @__PURE__ */ Object.create(null), e).proxy;
}
function et(l, e) {
  const {
    [ur]: n
  } = l(jr()), i = (e == null ? void 0 : e.keySeparator) ?? ".", s = (e == null ? void 0 : e.nsSeparator) ?? ":";
  if (n.length > 1 && s) {
    const o = e == null ? void 0 : e.ns, d = Array.isArray(o) ? o : null;
    if (d && d.length > 1 && d.slice(1).includes(n[0]))
      return `${n[0]}${s}${n.slice(1).join(i)}`;
  }
  return n.join(i);
}
const Lt = (l) => !O(l) && typeof l != "boolean" && typeof l != "number";
class _t extends kt {
  constructor(e, n = {}) {
    super(), $r(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], e, this), this.options = n, this.options.keySeparator === void 0 && (this.options.keySeparator = "."), this.logger = We.create("translator"), this.checkedLoadedFor = {};
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
    const d = i && e.includes(i), f = !this.options.userDefinedKeySeparator && !n.keySeparator && !this.options.userDefinedNsSeparator && !n.nsSeparator && !Or(e, i, s);
    if (d && !f) {
      const h = e.match(this.interpolator.nestingRegexp);
      if (h && h.length > 0)
        return {
          key: e,
          namespaces: O(o) ? [o] : o
        };
      const p = e.split(i);
      (i !== s || i === s && this.options.ns.includes(p[0])) && (o = p.shift()), e = p.join(s);
    }
    return {
      key: e,
      namespaces: O(o) ? [o] : o
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
    })), Array.isArray(e) || (e = [String(e)]), e = e.map((Y) => typeof Y == "function" ? et(Y, {
      ...this.options,
      ...s
    }) : String(Y));
    const o = s.returnDetails !== void 0 ? s.returnDetails : this.options.returnDetails, d = s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator, {
      key: f,
      namespaces: h
    } = this.extractFromKey(e[e.length - 1], s), p = h[h.length - 1];
    let u = s.nsSeparator !== void 0 ? s.nsSeparator : this.options.nsSeparator;
    u === void 0 && (u = ":");
    const b = s.lng || this.language, L = s.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
    if ((b == null ? void 0 : b.toLowerCase()) === "cimode")
      return L ? o ? {
        res: `${p}${u}${f}`,
        usedKey: f,
        exactUsedKey: f,
        usedLng: b,
        usedNS: p,
        usedParams: this.getUsedParamsDetails(s)
      } : `${p}${u}${f}` : o ? {
        res: f,
        usedKey: f,
        exactUsedKey: f,
        usedLng: b,
        usedNS: p,
        usedParams: this.getUsedParamsDetails(s)
      } : f;
    const w = this.resolve(e, s);
    let k = w == null ? void 0 : w.res;
    const y = (w == null ? void 0 : w.usedKey) || f, A = (w == null ? void 0 : w.exactUsedKey) || f, N = ["[object Number]", "[object Function]", "[object RegExp]"], E = s.joinArrays !== void 0 ? s.joinArrays : this.options.joinArrays, H = !this.i18nFormat || this.i18nFormat.handleAsObject, I = s.count !== void 0 && !O(s.count), G = _t.hasDefaultValue(s), B = I ? this.pluralResolver.getSuffix(b, s.count, s) : "", K = s.ordinal && I ? this.pluralResolver.getSuffix(b, s.count, {
      ordinal: !1
    }) : "", C = I && !s.ordinal && s.count === 0, Z = C && s[`defaultValue${this.options.pluralSeparator}zero`] || s[`defaultValue${B}`] || s[`defaultValue${K}`] || s.defaultValue;
    let T = k;
    H && !k && G && (T = Z);
    const ee = Lt(T), xe = Object.prototype.toString.apply(T);
    if (H && T && ee && !N.includes(xe) && !(O(E) && Array.isArray(T))) {
      if (!s.returnObjects && !this.options.returnObjects) {
        this.options.returnedObjectHandler || this.logger.warn("accessing an object - but returnObjects options is not enabled!");
        const Y = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(y, T, {
          ...s,
          ns: h
        }) : `key '${f} (${this.language})' returned an object instead of string.`;
        return o ? (w.res = Y, w.usedParams = this.getUsedParamsDetails(s), w) : Y;
      }
      if (d) {
        const Y = Array.isArray(T), ne = Y ? [] : {}, R = Y ? A : y;
        for (const q in T)
          if (Object.prototype.hasOwnProperty.call(T, q)) {
            const P = `${R}${d}${q}`;
            G && !k ? ne[q] = this.translate(P, {
              ...s,
              defaultValue: Lt(Z) ? Z[q] : void 0,
              joinArrays: !1,
              ns: h
            }) : ne[q] = this.translate(P, {
              ...s,
              joinArrays: !1,
              ns: h
            }), ne[q] === P && (ne[q] = T[q]);
          }
        k = ne;
      }
    } else if (H && O(E) && Array.isArray(k))
      k = k.join(E), k && (k = this.extendTranslation(k, e, s, i));
    else {
      let Y = !1, ne = !1;
      !this.isValidLookup(k) && G && (Y = !0, k = Z), this.isValidLookup(k) || (ne = !0, k = f);
      const q = (s.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey) && ne ? void 0 : k, P = G && Z !== k && this.options.updateMissing;
      if (ne || Y || P) {
        if (this.logger.log(P ? "updateKey" : "missingKey", b, p, f, P ? Z : k), d) {
          const oe = this.resolve(f, {
            ...s,
            keySeparator: !1
          });
          oe && oe.res && this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
        }
        let te = [];
        const be = this.languageUtils.getFallbackCodes(this.options.fallbackLng, s.lng || this.language);
        if (this.options.saveMissingTo === "fallback" && be && be[0])
          for (let oe = 0; oe < be.length; oe++)
            te.push(be[oe]);
        else this.options.saveMissingTo === "all" ? te = this.languageUtils.toResolveHierarchy(s.lng || this.language) : te.push(s.lng || this.language);
        const Ce = (oe, ge, de) => {
          var re;
          const X = G && de !== k ? de : q;
          this.options.missingKeyHandler ? this.options.missingKeyHandler(oe, p, ge, X, P, s) : (re = this.backendConnector) != null && re.saveMissing && this.backendConnector.saveMissing(oe, p, ge, X, P, s), this.emit("missingKey", oe, p, ge, k);
        };
        this.options.saveMissing && (this.options.saveMissingPlurals && I ? te.forEach((oe) => {
          const ge = this.pluralResolver.getSuffixes(oe, s);
          C && s[`defaultValue${this.options.pluralSeparator}zero`] && !ge.includes(`${this.options.pluralSeparator}zero`) && ge.push(`${this.options.pluralSeparator}zero`), ge.forEach((de) => {
            Ce([oe], f + de, s[`defaultValue${de}`] || Z);
          });
        }) : Ce(te, f, Z));
      }
      k = this.extendTranslation(k, e, s, w, i), ne && k === f && this.options.appendNamespaceToMissingKey && (k = `${p}${u}${f}`), (ne || Y) && this.options.parseMissingKeyHandler && (k = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? `${p}${u}${f}` : f, Y ? k : void 0, s));
    }
    return o ? (w.res = k, w.usedParams = this.getUsedParamsDetails(s), w) : k;
  }
  extendTranslation(e, n, i, s, o) {
    var h, p;
    if ((h = this.i18nFormat) != null && h.parse)
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
      const u = O(e) && (((p = i == null ? void 0 : i.interpolation) == null ? void 0 : p.skipOnVariables) !== void 0 ? i.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables);
      let b;
      if (u) {
        const w = e.match(this.interpolator.nestingRegexp);
        b = w && w.length;
      }
      let L = i.replace && !O(i.replace) ? i.replace : i;
      if (this.options.interpolation.defaultVariables && (L = {
        ...this.options.interpolation.defaultVariables,
        ...L
      }), e = this.interpolator.interpolate(e, L, i.lng || this.language || s.usedLng, i), u) {
        const w = e.match(this.interpolator.nestingRegexp), k = w && w.length;
        b < k && (i.nest = !1);
      }
      !i.lng && s && s.res && (i.lng = this.language || s.usedLng), i.nest !== !1 && (e = this.interpolator.nest(e, (...w) => (o == null ? void 0 : o[0]) === w[0] && !i.context ? (this.logger.warn(`It seems you are nesting recursively key: ${w[0]} in key: ${n[0]}`), null) : this.translate(...w, n), i)), i.interpolation && this.interpolator.reset();
    }
    const d = i.postProcess || this.options.postProcess, f = O(d) ? [d] : d;
    return e != null && (f != null && f.length) && i.applyPostProcessor !== !1 && (e = dr.handle(f, e, n, this.options && this.options.postProcessPassResolved ? {
      i18nResolved: {
        ...s,
        usedParams: this.getUsedParamsDetails(i)
      },
      ...i
    } : i, this)), e;
  }
  resolve(e, n = {}) {
    let i, s, o, d, f;
    return O(e) && (e = [e]), Array.isArray(e) && (e = e.map((h) => typeof h == "function" ? et(h, {
      ...this.options,
      ...n
    }) : h)), e.forEach((h) => {
      if (this.isValidLookup(i)) return;
      const p = this.extractFromKey(h, n), u = p.key;
      s = u;
      let b = p.namespaces;
      this.options.fallbackNS && (b = b.concat(this.options.fallbackNS));
      const L = n.count !== void 0 && !O(n.count), w = L && !n.ordinal && n.count === 0, k = n.context !== void 0 && (O(n.context) || typeof n.context == "number") && n.context !== "", y = n.lngs ? n.lngs : this.languageUtils.toResolveHierarchy(n.lng || this.language, n.fallbackLng);
      b.forEach((A) => {
        var N, E;
        this.isValidLookup(i) || (f = A, !this.checkedLoadedFor[`${y[0]}-${A}`] && ((N = this.utils) != null && N.hasLoadedNamespace) && !((E = this.utils) != null && E.hasLoadedNamespace(f)) && (this.checkedLoadedFor[`${y[0]}-${A}`] = !0, this.logger.warn(`key "${s}" for languages "${y.join(", ")}" won't get resolved as namespace "${f}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!")), y.forEach((H) => {
          var B;
          if (this.isValidLookup(i)) return;
          d = H;
          const I = [u];
          if ((B = this.i18nFormat) != null && B.addLookupKeys)
            this.i18nFormat.addLookupKeys(I, u, H, A, n);
          else {
            let K;
            L && (K = this.pluralResolver.getSuffix(H, n.count, n));
            const C = `${this.options.pluralSeparator}zero`, Z = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
            if (L && (n.ordinal && K.startsWith(Z) && I.push(u + K.replace(Z, this.options.pluralSeparator)), I.push(u + K), w && I.push(u + C)), k) {
              const T = `${u}${this.options.contextSeparator || "_"}${n.context}`;
              I.push(T), L && (n.ordinal && K.startsWith(Z) && I.push(T + K.replace(Z, this.options.pluralSeparator)), I.push(T + K), w && I.push(T + C));
            }
          }
          let G;
          for (; G = I.pop(); )
            this.isValidLookup(i) || (o = G, i = this.getResource(H, A, G, n));
        }));
      });
    }), {
      res: i,
      usedKey: s,
      exactUsedKey: o,
      usedLng: d,
      usedNS: f
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
    const n = ["defaultValue", "ordinal", "context", "replace", "lng", "lngs", "fallbackLng", "ns", "keySeparator", "nsSeparator", "returnObjects", "returnDetails", "joinArrays", "postProcess", "interpolation"], i = e.replace && !O(e.replace);
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
class Vt {
  constructor(e) {
    this.options = e, this.supportedLngs = this.options.supportedLngs || !1, this.logger = We.create("languageUtils");
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
    if (O(e) && e.includes("-")) {
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
      n = this.options.supportedLngs.find((d) => d === o ? !0 : !d.includes("-") && !o.includes("-") ? !1 : !!(d.includes("-") && !o.includes("-") && d.slice(0, d.indexOf("-")) === o || d.startsWith(o) && o.length > 1));
    }), n || (n = this.getFallbackCodes(this.options.fallbackLng)[0]), n;
  }
  getFallbackCodes(e, n) {
    if (!e) return [];
    if (typeof e == "function" && (e = e(n)), O(e) && (e = [e]), Array.isArray(e)) return e;
    if (!n) return e.default || [];
    let i = e[n];
    return i || (i = e[this.getScriptPartFromCode(n)]), i || (i = e[this.formatLanguageCode(n)]), i || (i = e[this.getLanguagePartFromCode(n)]), i || (i = e.default), i || [];
  }
  toResolveHierarchy(e, n) {
    const i = this.getFallbackCodes((n === !1 ? [] : n) || this.options.fallbackLng || [], e), s = [], o = (d) => {
      d && (this.isSupportedCode(d) ? s.push(d) : this.logger.warn(`rejecting language code not found in supportedLngs: ${d}`));
    };
    return O(e) && (e.includes("-") || e.includes("_")) ? (this.options.load !== "languageOnly" && o(this.formatLanguageCode(e)), this.options.load !== "languageOnly" && this.options.load !== "currentOnly" && o(this.getScriptPartFromCode(e)), this.options.load !== "currentOnly" && o(this.getLanguagePartFromCode(e))) : O(e) && o(this.formatLanguageCode(e)), i.forEach((d) => {
      s.includes(d) || o(this.formatLanguageCode(d));
    }), s;
  }
}
const Wt = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 4,
  other: 5
}, Gt = {
  select: (l) => l === 1 ? "one" : "other",
  resolvedOptions: () => ({
    pluralCategories: ["one", "other"]
  })
};
class Mr {
  constructor(e, n = {}) {
    this.languageUtils = e, this.options = n, this.logger = We.create("pluralResolver"), this.pluralRulesCache = {};
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
    let d;
    try {
      d = new Intl.PluralRules(i, {
        type: s
      });
    } catch {
      if (typeof Intl > "u")
        return this.logger.error("No Intl support, please use an Intl polyfill!"), Gt;
      if (!e.match(/-|_/)) return Gt;
      const h = this.languageUtils.getLanguagePartFromCode(e);
      d = this.getRule(h, n);
    }
    return this.pluralRulesCache[o] = d, d;
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
    return i || (i = this.getRule("dev", n)), i ? i.resolvedOptions().pluralCategories.sort((s, o) => Wt[s] - Wt[o]).map((s) => `${this.options.prepend}${n.ordinal ? `ordinal${this.options.prepend}` : ""}${s}`) : [];
  }
  getSuffix(e, n, i = {}) {
    const s = this.getRule(e, i);
    return s ? `${this.options.prepend}${i.ordinal ? `ordinal${this.options.prepend}` : ""}${s.select(n)}` : (this.logger.warn(`no plural rule found for: ${e}`), this.getSuffix("dev", n, i));
  }
}
const Ht = (l, e, n, i = ".", s = !0) => {
  let o = Tr(l, e, n);
  return !o && s && O(n) && (o = At(l, n, i), o === void 0 && (o = At(e, n, i))), o;
}, St = (l) => l.replace(/\$/g, "$$$$");
class zt {
  constructor(e = {}) {
    var n;
    this.logger = We.create("interpolator"), this.options = e, this.format = ((n = e == null ? void 0 : e.interpolation) == null ? void 0 : n.format) || ((i) => i), this.init(e);
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
      prefixEscaped: d,
      suffix: f,
      suffixEscaped: h,
      formatSeparator: p,
      unescapeSuffix: u,
      unescapePrefix: b,
      nestingPrefix: L,
      nestingPrefixEscaped: w,
      nestingSuffix: k,
      nestingSuffixEscaped: y,
      nestingOptionsSeparator: A,
      maxReplaces: N,
      alwaysFormat: E
    } = e.interpolation;
    this.escape = n !== void 0 ? n : Rr, this.escapeValue = i !== void 0 ? i : !0, this.useRawValueToEscape = s !== void 0 ? s : !1, this.prefix = o ? ze(o) : d || "{{", this.suffix = f ? ze(f) : h || "}}", this.formatSeparator = p || ",", this.unescapePrefix = u ? "" : b ? ze(b) : "-", this.unescapeSuffix = this.unescapePrefix ? "" : u ? ze(u) : "", this.nestingPrefix = L ? ze(L) : w || ze("$t("), this.nestingSuffix = k ? ze(k) : y || ze(")"), this.nestingOptionsSeparator = A || ",", this.maxReplaces = N || 1e3, this.alwaysFormat = E !== void 0 ? E : !1, this.resetRegExp();
  }
  reset() {
    this.options && this.init(this.options);
  }
  resetRegExp() {
    const e = (n, i) => (n == null ? void 0 : n.source) === i ? (n.lastIndex = 0, n) : new RegExp(i, "g");
    this.regexp = e(this.regexp, `${this.prefix}(.+?)${this.suffix}`), this.regexpUnescape = e(this.regexpUnescape, `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`), this.nestingRegexp = e(this.nestingRegexp, `${this.nestingPrefix}((?:[^()"']+|"[^"]*"|'[^']*'|\\((?:[^()]|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`);
  }
  interpolate(e, n, i, s) {
    var w;
    let o, d, f;
    const h = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {}, p = (k) => {
      if (!k.includes(this.formatSeparator)) {
        const E = Ht(n, h, k, this.options.keySeparator, this.options.ignoreJSONStructure);
        return this.alwaysFormat ? this.format(E, void 0, i, {
          ...s,
          ...n,
          interpolationkey: k
        }) : E;
      }
      const y = k.split(this.formatSeparator), A = y.shift().trim(), N = y.join(this.formatSeparator).trim();
      return this.format(Ht(n, h, A, this.options.keySeparator, this.options.ignoreJSONStructure), N, i, {
        ...s,
        ...n,
        interpolationkey: A
      });
    };
    this.resetRegExp(), !this.escapeValue && typeof e == "string" && /\$t\([^)]*\{[^}]*\{\{/.test(e) && this.logger.warn("nesting options string contains interpolated variables with escapeValue: false — if any of those values are attacker-controlled they can inject additional nesting options (e.g. redirect lng/ns). Sanitise untrusted input before passing it to t(), or keep escapeValue: true.");
    const u = (s == null ? void 0 : s.missingInterpolationHandler) || this.options.missingInterpolationHandler, b = ((w = s == null ? void 0 : s.interpolation) == null ? void 0 : w.skipOnVariables) !== void 0 ? s.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables;
    return [{
      regex: this.regexpUnescape,
      safeValue: (k) => St(k)
    }, {
      regex: this.regexp,
      safeValue: (k) => this.escapeValue ? St(this.escape(k)) : St(k)
    }].forEach((k) => {
      for (f = 0; o = k.regex.exec(e); ) {
        const y = o[1].trim();
        if (d = p(y), d === void 0)
          if (typeof u == "function") {
            const N = u(e, o, s);
            d = O(N) ? N : "";
          } else if (s && Object.prototype.hasOwnProperty.call(s, y))
            d = "";
          else if (b) {
            d = o[0];
            continue;
          } else
            this.logger.warn(`missed to pass in variable ${y} for interpolating ${e}`), d = "";
        else !O(d) && !this.useRawValueToEscape && (d = qt(d));
        const A = k.safeValue(d);
        if (e = e.replace(o[0], A), b ? (k.regex.lastIndex += d.length, k.regex.lastIndex -= o[0].length) : k.regex.lastIndex = 0, f++, f >= this.maxReplaces)
          break;
      }
    }), e;
  }
  nest(e, n, i = {}) {
    let s, o, d;
    const f = (h, p) => {
      const u = this.nestingOptionsSeparator;
      if (!h.includes(u)) return h;
      const b = h.split(new RegExp(`${ze(u)}[ ]*{`));
      let L = `{${b[1]}`;
      h = b[0], L = this.interpolate(L, d);
      const w = L.match(/'/g), k = L.match(/"/g);
      (((w == null ? void 0 : w.length) ?? 0) % 2 === 0 && !k || ((k == null ? void 0 : k.length) ?? 0) % 2 !== 0) && (L = L.replace(/'/g, '"'));
      try {
        d = JSON.parse(L), p && (d = {
          ...p,
          ...d
        });
      } catch (y) {
        return this.logger.warn(`failed parsing options string in nesting for key ${h}`, y), `${h}${u}${L}`;
      }
      return d.defaultValue && d.defaultValue.includes(this.prefix) && delete d.defaultValue, h;
    };
    for (; s = this.nestingRegexp.exec(e); ) {
      let h = [];
      d = {
        ...i
      }, d = d.replace && !O(d.replace) ? d.replace : d, d.applyPostProcessor = !1, delete d.defaultValue;
      const p = /{.*}/.test(s[1]) ? s[1].lastIndexOf("}") + 1 : s[1].indexOf(this.formatSeparator);
      if (p !== -1 && (h = s[1].slice(p).split(this.formatSeparator).map((u) => u.trim()).filter(Boolean), s[1] = s[1].slice(0, p)), o = n(f.call(this, s[1].trim(), d), d), o && s[0] === e && !O(o)) return o;
      O(o) || (o = qt(o)), o || (this.logger.warn(`missed to resolve ${s[1]} for nesting ${e}`), o = ""), h.length && (o = h.reduce((u, b) => this.format(u, b, i.lng, {
        ...i,
        interpolationkey: s[1].trim()
      }), o.trim())), e = e.replace(s[0], o), this.regexp.lastIndex = 0;
    }
    return e;
  }
}
const Vr = (l) => {
  let e = l.toLowerCase().trim();
  const n = {};
  if (l.includes("(")) {
    const i = l.split("(");
    e = i[0].toLowerCase().trim();
    const s = i[1].slice(0, -1);
    e === "currency" && !s.includes(":") ? n.currency || (n.currency = s.trim()) : e === "relativetime" && !s.includes(":") ? n.range || (n.range = s.trim()) : s.split(";").forEach((d) => {
      if (d) {
        const [f, ...h] = d.split(":"), p = h.join(":").trim().replace(/^'+|'+$/g, ""), u = f.trim();
        n[u] || (n[u] = p), p === "false" && (n[u] = !1), p === "true" && (n[u] = !0), isNaN(p) || (n[u] = parseInt(p, 10));
      }
    });
  }
  return {
    formatName: e,
    formatOptions: n
  };
}, Kt = (l) => {
  const e = {};
  return (n, i, s) => {
    let o = s;
    s && s.interpolationkey && s.formatParams && s.formatParams[s.interpolationkey] && s[s.interpolationkey] && (o = {
      ...o,
      [s.interpolationkey]: void 0
    });
    const d = i + JSON.stringify(o);
    let f = e[d];
    return f || (f = l(ft(i), s), e[d] = f), f(n);
  };
}, Wr = (l) => (e, n, i) => l(ft(n), i)(e);
class Gr {
  constructor(e = {}) {
    this.logger = We.create("formatter"), this.options = e, this.init(e);
  }
  init(e, n = {
    interpolation: {}
  }) {
    this.formatSeparator = n.interpolation.formatSeparator || ",";
    const i = n.cacheInBuiltFormats ? Kt : Wr;
    this.formats = {
      number: i((s, o) => {
        const d = new Intl.NumberFormat(s, {
          ...o
        });
        return (f) => d.format(f);
      }),
      currency: i((s, o) => {
        const d = new Intl.NumberFormat(s, {
          ...o,
          style: "currency"
        });
        return (f) => d.format(f);
      }),
      datetime: i((s, o) => {
        const d = new Intl.DateTimeFormat(s, {
          ...o
        });
        return (f) => d.format(f);
      }),
      relativetime: i((s, o) => {
        const d = new Intl.RelativeTimeFormat(s, {
          ...o
        });
        return (f) => d.format(f, o.range || "day");
      }),
      list: i((s, o) => {
        const d = new Intl.ListFormat(s, {
          ...o
        });
        return (f) => d.format(f);
      })
    };
  }
  add(e, n) {
    this.formats[e.toLowerCase().trim()] = n;
  }
  addCached(e, n) {
    this.formats[e.toLowerCase().trim()] = Kt(n);
  }
  format(e, n, i, s = {}) {
    if (!n || e == null) return e;
    const o = n.split(this.formatSeparator);
    if (o.length > 1 && o[0].indexOf("(") > 1 && !o[0].includes(")") && o.find((f) => f.includes(")"))) {
      const f = o.findIndex((h) => h.includes(")"));
      o[0] = [o[0], ...o.splice(1, f)].join(this.formatSeparator);
    }
    return o.reduce((f, h) => {
      var b;
      const {
        formatName: p,
        formatOptions: u
      } = Vr(h);
      if (this.formats[p]) {
        let L = f;
        try {
          const w = ((b = s == null ? void 0 : s.formatParams) == null ? void 0 : b[s.interpolationkey]) || {}, k = w.locale || w.lng || s.locale || s.lng || i;
          L = this.formats[p](f, k, {
            ...u,
            ...s,
            ...w
          });
        } catch (w) {
          this.logger.warn(w);
        }
        return L;
      } else
        this.logger.warn(`there was no format function for ${p}`);
      return f;
    }, e);
  }
}
const Hr = (l, e) => {
  l.pending[e] !== void 0 && (delete l.pending[e], l.pendingCount--);
};
class zr extends kt {
  constructor(e, n, i, s = {}) {
    var o, d;
    super(), this.backend = e, this.store = n, this.services = i, this.languageUtils = i.languageUtils, this.options = s, this.logger = We.create("backendConnector"), this.waitingReads = [], this.maxParallelReads = s.maxParallelReads || 10, this.readingCalls = 0, this.maxRetries = s.maxRetries >= 0 ? s.maxRetries : 5, this.retryTimeout = s.retryTimeout >= 1 ? s.retryTimeout : 350, this.state = {}, this.queue = [], (d = (o = this.backend) == null ? void 0 : o.init) == null || d.call(o, i, s.backend, s);
  }
  queueLoad(e, n, i, s) {
    const o = {}, d = {}, f = {}, h = {};
    return e.forEach((p) => {
      let u = !0;
      n.forEach((b) => {
        const L = `${p}|${b}`;
        !i.reload && this.store.hasResourceBundle(p, b) ? this.state[L] = 2 : this.state[L] < 0 || (this.state[L] === 1 ? d[L] === void 0 && (d[L] = !0) : (this.state[L] = 1, u = !1, d[L] === void 0 && (d[L] = !0), o[L] === void 0 && (o[L] = !0), h[b] === void 0 && (h[b] = !0)));
      }), u || (f[p] = !0);
    }), (Object.keys(o).length || Object.keys(d).length) && this.queue.push({
      pending: d,
      pendingCount: Object.keys(d).length,
      loaded: {},
      errors: [],
      callback: s
    }), {
      toLoad: Object.keys(o),
      pending: Object.keys(d),
      toLoadLanguages: Object.keys(f),
      toLoadNamespaces: Object.keys(h)
    };
  }
  loaded(e, n, i) {
    const s = e.split("|"), o = s[0], d = s[1];
    n && this.emit("failedLoading", o, d, n), !n && i && this.store.addResourceBundle(o, d, i, void 0, void 0, {
      skipCopy: !0
    }), this.state[e] = n ? -1 : 2, n && i && (this.state[e] = 0);
    const f = {};
    this.queue.forEach((h) => {
      Ir(h.loaded, [o], d), Hr(h, e), n && h.errors.push(n), h.pendingCount === 0 && !h.done && (Object.keys(h.loaded).forEach((p) => {
        f[p] || (f[p] = {});
        const u = h.loaded[p];
        u.length && u.forEach((b) => {
          f[p][b] === void 0 && (f[p][b] = !0);
        });
      }), h.done = !0, h.errors.length ? h.callback(h.errors) : h.callback());
    }), this.emit("loaded", f), this.queue = this.queue.filter((h) => !h.done);
  }
  read(e, n, i, s = 0, o = this.retryTimeout, d) {
    if (!e.length) return d(null, {});
    if (this.readingCalls >= this.maxParallelReads) {
      this.waitingReads.push({
        lng: e,
        ns: n,
        fcName: i,
        tried: s,
        wait: o,
        callback: d
      });
      return;
    }
    this.readingCalls++;
    const f = (p, u) => {
      if (this.readingCalls--, this.waitingReads.length > 0) {
        const b = this.waitingReads.shift();
        this.read(b.lng, b.ns, b.fcName, b.tried, b.wait, b.callback);
      }
      if (p && u && s < this.maxRetries) {
        setTimeout(() => {
          this.read(e, n, i, s + 1, o * 2, d);
        }, o);
        return;
      }
      d(p, u);
    }, h = this.backend[i].bind(this.backend);
    if (h.length === 2) {
      try {
        const p = h(e, n);
        p && typeof p.then == "function" ? p.then((u) => f(null, u)).catch(f) : f(null, p);
      } catch (p) {
        f(p);
      }
      return;
    }
    return h(e, n, f);
  }
  prepareLoading(e, n, i = {}, s) {
    if (!this.backend)
      return this.logger.warn("No backend was added via i18next.use. Will not load resources."), s && s();
    O(e) && (e = this.languageUtils.toResolveHierarchy(e)), O(n) && (n = [n]);
    const o = this.queueLoad(e, n, i, s);
    if (!o.toLoad.length)
      return o.pending.length || s(), null;
    o.toLoad.forEach((d) => {
      this.loadOne(d);
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
    this.read(s, o, "read", void 0, void 0, (d, f) => {
      d && this.logger.warn(`${n}loading namespace ${o} for language ${s} failed`, d), !d && f && this.logger.log(`${n}loaded namespace ${o} for language ${s}`, f), this.loaded(e, d, f);
    });
  }
  saveMissing(e, n, i, s, o, d = {}, f = () => {
  }) {
    var h, p, u, b, L;
    if ((p = (h = this.services) == null ? void 0 : h.utils) != null && p.hasLoadedNamespace && !((b = (u = this.services) == null ? void 0 : u.utils) != null && b.hasLoadedNamespace(n))) {
      this.logger.warn(`did not save key "${i}" as the namespace "${n}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
      return;
    }
    if (!(i == null || i === "")) {
      if ((L = this.backend) != null && L.create) {
        const w = {
          ...d,
          isUpdate: o
        }, k = this.backend.create.bind(this.backend);
        if (k.length < 6)
          try {
            let y;
            k.length === 5 ? y = k(e, n, i, s, w) : y = k(e, n, i, s), y && typeof y.then == "function" ? y.then((A) => f(null, A)).catch(f) : f(null, y);
          } catch (y) {
            f(y);
          }
        else
          k(e, n, i, s, f, w);
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
    if (typeof l[1] == "object" && (e = l[1]), O(l[1]) && (e.defaultValue = l[1]), O(l[2]) && (e.tDescription = l[2]), typeof l[2] == "object" || typeof l[3] == "object") {
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
}), Yt = (l) => (O(l.ns) && (l.ns = [l.ns]), O(l.fallbackLng) && (l.fallbackLng = [l.fallbackLng]), O(l.fallbackNS) && (l.fallbackNS = [l.fallbackNS]), l.supportedLngs && !l.supportedLngs.includes("cimode") && (l.supportedLngs = l.supportedLngs.concat(["cimode"])), l), xt = () => {
}, Kr = (l) => {
  Object.getOwnPropertyNames(Object.getPrototypeOf(l)).forEach((n) => {
    typeof l[n] == "function" && (l[n] = l[n].bind(l));
  });
};
class ct extends kt {
  constructor(e = {}, n) {
    if (super(), this.options = Yt(e), this.services = {}, this.logger = We, this.modules = {
      external: []
    }, Kr(this), n && !this.isInitialized && !e.isClone) {
      if (!this.options.initAsync)
        return this.init(e, n), this;
      setTimeout(() => {
        this.init(e, n);
      }, 0);
    }
  }
  init(e = {}, n) {
    this.isInitializing = !0, typeof e == "function" && (n = e, e = {}), e.defaultNS == null && e.ns && (O(e.ns) ? e.defaultNS = e.ns : e.ns.includes("translation") || (e.defaultNS = e.ns[0]));
    const i = Bt();
    this.options = {
      ...i,
      ...this.options,
      ...Yt(e)
    }, this.options.interpolation = {
      ...i.interpolation,
      ...this.options.interpolation
    }, e.keySeparator !== void 0 && (this.options.userDefinedKeySeparator = e.keySeparator), e.nsSeparator !== void 0 && (this.options.userDefinedNsSeparator = e.nsSeparator), typeof this.options.overloadTranslationOptionHandler != "function" && (this.options.overloadTranslationOptionHandler = i.overloadTranslationOptionHandler);
    const s = (p) => p ? typeof p == "function" ? new p() : p : null;
    if (!this.options.isClone) {
      this.modules.logger ? We.init(s(this.modules.logger), this.options) : We.init(null, this.options);
      let p;
      this.modules.formatter ? p = this.modules.formatter : p = Gr;
      const u = new Vt(this.options);
      this.store = new Mt(this.options.resources, this.options);
      const b = this.services;
      b.logger = We, b.resourceStore = this.store, b.languageUtils = u, b.pluralResolver = new Mr(u, {
        prepend: this.options.pluralSeparator
      }), p && (b.formatter = s(p), b.formatter.init && b.formatter.init(b, this.options), this.options.interpolation.format = b.formatter.format.bind(b.formatter)), b.interpolator = new zt(this.options), b.utils = {
        hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
      }, b.backendConnector = new zr(s(this.modules.backend), b.resourceStore, b, this.options), b.backendConnector.on("*", (L, ...w) => {
        this.emit(L, ...w);
      }), this.modules.languageDetector && (b.languageDetector = s(this.modules.languageDetector), b.languageDetector.init && b.languageDetector.init(b, this.options.detection, this.options)), this.modules.i18nFormat && (b.i18nFormat = s(this.modules.i18nFormat), b.i18nFormat.init && b.i18nFormat.init(this)), this.translator = new _t(this.services, this.options), this.translator.on("*", (L, ...w) => {
        this.emit(L, ...w);
      }), this.modules.external.forEach((L) => {
        L.init && L.init(this);
      });
    }
    if (this.format = this.options.interpolation.format, n || (n = xt), this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
      const p = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
      p.length > 0 && p[0] !== "dev" && (this.options.lng = p[0]);
    }
    !this.services.languageDetector && !this.options.lng && this.logger.warn("init: no languageDetector is used and no lng is defined"), ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"].forEach((p) => {
      this[p] = (...u) => this.store[p](...u);
    }), ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"].forEach((p) => {
      this[p] = (...u) => (this.store[p](...u), this);
    });
    const f = at(), h = () => {
      const p = (u, b) => {
        this.isInitializing = !1, this.isInitialized && !this.initializedStoreOnce && this.logger.warn("init: i18next is already initialized. You should call init just once!"), this.isInitialized = !0, this.options.isClone || this.logger.log("initialized", this.options), this.emit("initialized", this.options), f.resolve(b), n(u, b);
      };
      if ((this.languages || this.isLanguageChangingTo) && !this.isInitialized) return p(null, this.t.bind(this));
      this.changeLanguage(this.options.lng, p);
    };
    return this.options.resources || !this.options.initAsync ? h() : setTimeout(h, 0), f;
  }
  loadResources(e, n = xt) {
    var o, d;
    let i = n;
    const s = O(e) ? e : this.language;
    if (typeof e == "function" && (i = e), !this.options.resources || this.options.partialBundledLanguages) {
      if ((s == null ? void 0 : s.toLowerCase()) === "cimode" && (!this.options.preload || this.options.preload.length === 0)) return i();
      const f = [], h = (p) => {
        if (!p || p === "cimode") return;
        this.services.languageUtils.toResolveHierarchy(p).forEach((b) => {
          b !== "cimode" && (f.includes(b) || f.push(b));
        });
      };
      s ? h(s) : this.services.languageUtils.getFallbackCodes(this.options.fallbackLng).forEach((u) => h(u)), (d = (o = this.options.preload) == null ? void 0 : o.forEach) == null || d.call(o, (p) => h(p)), this.services.backendConnector.load(f, this.options.ns, (p) => {
        !p && !this.resolvedLanguage && this.language && this.setResolvedLanguage(this.language), i(p);
      });
    } else
      i(null);
  }
  reloadResources(e, n, i) {
    const s = at();
    return typeof e == "function" && (i = e, e = void 0), typeof n == "function" && (i = n, n = void 0), e || (e = this.languages), n || (n = this.options.ns), i || (i = xt), this.services.backendConnector.reload(e, n, (o) => {
      s.resolve(), i(o);
    }), s;
  }
  use(e) {
    if (!e) throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");
    if (!e.type) throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");
    return e.type === "backend" && (this.modules.backend = e), (e.type === "logger" || e.log && e.warn && e.error) && (this.modules.logger = e), e.type === "languageDetector" && (this.modules.languageDetector = e), e.type === "i18nFormat" && (this.modules.i18nFormat = e), e.type === "postProcessor" && dr.addPostProcessor(e), e.type === "formatter" && (this.modules.formatter = e), e.type === "3rdParty" && this.modules.external.push(e), this;
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
    const s = (f) => {
      this.language = f, this.languages = this.services.languageUtils.toResolveHierarchy(f), this.resolvedLanguage = void 0, this.setResolvedLanguage(f);
    }, o = (f, h) => {
      h ? this.isLanguageChangingTo === e && (s(h), this.translator.changeLanguage(h), this.isLanguageChangingTo = void 0, this.emit("languageChanged", h), this.logger.log("languageChanged", h)) : this.isLanguageChangingTo = void 0, i.resolve((...p) => this.t(...p)), n && n(f, (...p) => this.t(...p));
    }, d = (f) => {
      var u, b;
      !e && !f && this.services.languageDetector && (f = []);
      const h = O(f) ? f : f && f[0], p = this.store.hasLanguageSomeTranslations(h) ? h : this.services.languageUtils.getBestMatchFromCodes(O(f) ? [f] : f);
      p && (this.language || s(p), this.translator.language || this.translator.changeLanguage(p), (b = (u = this.services.languageDetector) == null ? void 0 : u.cacheUserLanguage) == null || b.call(u, p)), this.loadResources(p, (L) => {
        o(L, p);
      });
    };
    return !e && this.services.languageDetector && !this.services.languageDetector.async ? d(this.services.languageDetector.detect()) : !e && this.services.languageDetector && this.services.languageDetector.async ? this.services.languageDetector.detect.length === 0 ? this.services.languageDetector.detect().then(d) : this.services.languageDetector.detect(d) : d(e), i;
  }
  getFixedT(e, n, i) {
    const s = (o, d, ...f) => {
      let h;
      typeof d != "object" ? h = this.options.overloadTranslationOptionHandler([o, d].concat(f)) : h = {
        ...d
      }, h.lng = h.lng || s.lng, h.lngs = h.lngs || s.lngs, h.ns = h.ns || s.ns, h.keyPrefix !== "" && (h.keyPrefix = h.keyPrefix || i || s.keyPrefix);
      const p = {
        ...this.options,
        ...h
      };
      typeof h.keyPrefix == "function" && (h.keyPrefix = et(h.keyPrefix, p));
      const u = this.options.keySeparator || ".";
      let b;
      return h.keyPrefix && Array.isArray(o) ? b = o.map((L) => (typeof L == "function" && (L = et(L, p)), `${h.keyPrefix}${u}${L}`)) : (typeof o == "function" && (o = et(o, p)), b = h.keyPrefix ? `${h.keyPrefix}${u}${o}` : o), this.t(b, h);
    };
    return O(e) ? s.lng = e : s.lngs = e, s.ns = n, s.keyPrefix = i, s;
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
    const d = (f, h) => {
      const p = this.services.backendConnector.state[`${f}|${h}`];
      return p === -1 || p === 0 || p === 2;
    };
    if (n.precheck) {
      const f = n.precheck(this, d);
      if (f !== void 0) return f;
    }
    return !!(this.hasResourceBundle(i, e) || !this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages || d(i, e) && (!s || d(o, e)));
  }
  loadNamespaces(e, n) {
    const i = at();
    return this.options.ns ? (O(e) && (e = [e]), e.forEach((s) => {
      this.options.ns.includes(s) || this.options.ns.push(s);
    }), this.loadResources((s) => {
      i.resolve(), n && n(s);
    }), i) : (n && n(), Promise.resolve());
  }
  loadLanguages(e, n) {
    const i = at();
    O(e) && (e = [e]);
    const s = this.options.preload || [], o = e.filter((d) => !s.includes(d) && this.services.languageUtils.isSupportedCode(d));
    return o.length ? (this.options.preload = s.concat(o), this.loadResources((d) => {
      i.resolve(), n && n(d);
    }), i) : (n && n(), Promise.resolve());
  }
  dir(e) {
    var s, o;
    if (e || (e = this.resolvedLanguage || (((s = this.languages) == null ? void 0 : s.length) > 0 ? this.languages[0] : this.language)), !e) return "rtl";
    try {
      const d = new Intl.Locale(e);
      if (d && d.getTextInfo) {
        const f = d.getTextInfo();
        if (f && f.direction) return f.direction;
      }
    } catch {
    }
    const n = ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam", "ckb"], i = ((o = this.services) == null ? void 0 : o.languageUtils) || new Vt(Bt());
    return e.toLowerCase().indexOf("-latn") > 1 ? "ltr" : n.includes(i.getLanguagePartFromCode(e)) || e.toLowerCase().indexOf("-arab") > 1 ? "rtl" : "ltr";
  }
  static createInstance(e = {}, n) {
    const i = new ct(e, n);
    return i.createInstance = ct.createInstance, i;
  }
  cloneInstance(e = {}, n = xt) {
    const i = e.forkResourceStore;
    i && delete e.forkResourceStore;
    const s = {
      ...this.options,
      ...e,
      isClone: !0
    }, o = new ct(s);
    if ((e.debug !== void 0 || e.prefix !== void 0) && (o.logger = o.logger.clone(e)), ["store", "services", "language"].forEach((f) => {
      o[f] = this[f];
    }), o.services = {
      ...this.services
    }, o.services.utils = {
      hasLoadedNamespace: o.hasLoadedNamespace.bind(o)
    }, i) {
      const f = Object.keys(this.store.data).reduce((h, p) => (h[p] = {
        ...this.store.data[p]
      }, h[p] = Object.keys(h[p]).reduce((u, b) => (u[b] = {
        ...h[p][b]
      }, u), h[p]), h), {});
      o.store = new Mt(f, s), o.services.resourceStore = o.store;
    }
    if (e.interpolation) {
      const h = {
        ...Bt().interpolation,
        ...this.options.interpolation,
        ...e.interpolation
      }, p = {
        ...s,
        interpolation: h
      };
      o.services.interpolator = new zt(p);
    }
    return o.translator = new _t(o.services, s), o.translator.on("*", (f, ...h) => {
      o.emit(f, ...h);
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
const Ee = ct.createInstance(), Yr = Ee.createInstance;
Ee.dir;
Ee.init;
Ee.loadResources;
Ee.reloadResources;
Ee.use;
Ee.changeLanguage;
Ee.getFixedT;
Ee.t;
Ee.exists;
Ee.setDefaultNamespace;
Ee.hasLoadedNamespace;
Ee.loadNamespaces;
Ee.loadLanguages;
const Jr = "Swap your tokens at the best price", Xr = "Swap your tokens using DinoVox liquidity pools", Zr = "Swap", Qr = "Liquidity", en = "You send", tn = "You receive", rn = "Balance", nn = "Calculating…", sn = "Insufficient balance", an = "⚡ 1:1 conversion — EGLD → WEGLD via the wrap contract", on = "⚡ 1:1 conversion — WEGLD → EGLD via the unwrap contract", ln = "Price impact", cn = "Hops", dn = "Route", un = "Slippage", fn = "Minimum received", pn = "This route has a high price impact — you are paying more than the market price for this token. Try reducing the swap amount for a better rate.", hn = "Add liquidity to this pair →", gn = "Connect your wallet", mn = "Signing…", xn = "Select tokens", bn = "Enter an amount", yn = "Insufficient balance", wn = "Calculating…", _n = "Wrap", kn = "Unwrap", Nn = "Quote unavailable", vn = "Swap", Ln = "Arbitrage", Sn = "Estimated profit", Bn = "No profitable arbitrage opportunity", En = "Opportunity too small to cover slippage", Cn = "Amount too low to get a quote", $n = "No route available for this pair", An = "Amount exceeds available pool liquidity", In = "Unable to get a quote", Tn = "Swap in progress…", Fn = "Swap failed", Rn = "Swap successful!", Pn = "Wrapping…", Dn = "Wrap failed", qn = "Wrap successful!", On = "Unwrapping…", Un = "Unwrap failed", jn = "Unwrap successful!", Mn = "Choose a token", Vn = "Search…", Wn = "Loading…", Gn = "No results", Hn = "Liquidity", zn = "Manage your liquidity pairs", Kn = "Your active liquidity positions", Yn = "Your liquidity positions will appear here.", Jn = "Add liquidity", Xn = "Add", Zn = "Remove", Qn = "Pools", ei = "Liquidity pools referenced by the router", ti = "Loading...", ri = "{{count}} active pool", ni = "{{count}} active pools", ii = "No active pools found.", si = "Reserve", ai = "Active", oi = "+ Add", li = "Create a new pool", ci = "CREATE", di = "New Pool", ui = "Token 1", fi = "Token 2", pi = "Select", hi = "No token in wallet", gi = "LP Name (3-20 characters)", mi = "LP Ticker (3-10 uppercase)", xi = "Step 1: Create the SC Pair", bi = "Step 2: Issue LP Token (0.05 EGLD)", yi = "Transaction in progress…", wi = "Waiting for transaction confirmation…", _i = "Pair created!", ki = "To activate the pool and make it usable, the LP token must be issued. Transaction cost: 0.05 EGLD.", Ni = "Pool Active!", vi = "The pool is ready to receive liquidity.", Li = "Add liquidity", Si = "Creating the pair...", Bi = "Creation failed", Ei = "Pair created! Waiting for synchronization...", Ci = "Issuing LP Token...", $i = "Issuance failed", Ai = "LP Token issued! Pool is now active.", Ii = "Add Liquidity", Ti = "Add liquidity to a pool", Fi = "Add Liquidity", Ri = "Deposit two tokens to provide liquidity and receive LP tokens", Pi = "First Token", Di = "Second Token", qi = "Searching for pool…", Oi = "No pool found", Ui = "You must create this pool before adding liquidity. Activation requires 0.05 EGLD.", ji = "Create pool", Mi = "LP Received (est.)", Vi = "Refund {{ticker}}", Wi = "Minimum deposit too low for the first liquidity.", Gi = "Connect your wallet", Hi = "Pool does not exist", zi = "Pool inactive", Ki = "Insufficient balance", Yi = "Enter amounts", Ji = "Amount too low", Xi = "Add Liquidity", Zi = "Adding liquidity…", Qi = "Adding liquidity failed", es = "Liquidity added!", fr = {
  subtitle: Jr,
  card_description: Xr,
  tab_swap: Zr,
  tab_liquidity: Qr,
  you_send: en,
  you_receive: tn,
  balance: rn,
  calculating: nn,
  insufficient_balance: sn,
  wrap_info: an,
  unwrap_info: on,
  price_impact: ln,
  hops: cn,
  route: dn,
  slippage: un,
  min_received: fn,
  high_impact_warning: pn,
  add_liquidity_cta: hn,
  btn_connect: gn,
  btn_signing: mn,
  btn_select_tokens: xn,
  btn_enter_amount: bn,
  btn_insufficient: yn,
  btn_calculating: wn,
  btn_wrap: _n,
  btn_unwrap: kn,
  btn_quote_unavailable: Nn,
  btn_swap: vn,
  btn_arb: Ln,
  arb_profit: Sn,
  arb_no_opportunity: Bn,
  arb_slippage_too_high: En,
  error_amount_too_low: Cn,
  error_no_route: $n,
  error_insufficient_liquidity: An,
  error_quote: In,
  processing: Tn,
  error_tx: Fn,
  success_tx: Rn,
  processing_wrap: Pn,
  error_wrap: Dn,
  success_wrap: qn,
  processing_unwrap: On,
  error_unwrap: Un,
  success_unwrap: jn,
  token_select: Mn,
  token_search: Vn,
  token_loading: Wn,
  token_no_results: Gn,
  liquidity_title: Hn,
  liquidity_subtitle: zn,
  liquidity_card_desc: Kn,
  liquidity_empty: Yn,
  liquidity_add: Jn,
  liquidity_add_btn: Xn,
  liquidity_remove_btn: Zn,
  pools_title: Qn,
  pools_subtitle: ei,
  pools_loading_desc: ti,
  pools_count_one: ri,
  pools_count_other: ni,
  pools_empty: ii,
  pools_reserve: si,
  pools_active: ai,
  pools_add: oi,
  pools_create: li,
  create_title: ci,
  create_subtitle: di,
  create_token1: ui,
  create_token2: fi,
  create_select: pi,
  create_no_wallet_token: hi,
  create_lp_name: gi,
  create_lp_ticker: mi,
  create_step1: xi,
  create_step2: bi,
  create_tx_pending: yi,
  create_tx_waiting: wi,
  create_pair_done: _i,
  create_pair_desc: ki,
  create_pool_active: Ni,
  create_pool_ready: vi,
  create_add_liquidity: Li,
  create_processing_pair: Si,
  create_error_pair: Bi,
  create_success_pair: Ei,
  create_processing_lp: Ci,
  create_error_lp: $i,
  create_success_lp: Ai,
  add_title: Ii,
  add_subtitle: Ti,
  add_card_title: Fi,
  add_card_desc: Ri,
  add_token1: Pi,
  add_token2: Di,
  add_pool_searching: qi,
  add_no_pool_title: Oi,
  add_no_pool_desc: Ui,
  add_no_pool_btn: ji,
  add_lp_preview: Mi,
  add_refund: Vi,
  add_min_deposit: Wi,
  add_btn_connect: Gi,
  add_btn_no_pool: Hi,
  add_btn_inactive: zi,
  add_btn_insufficient: Ki,
  add_btn_enter_amount: Yi,
  add_btn_min: Ji,
  add_btn_submit: Xi,
  add_processing: Zi,
  add_error: Qi,
  add_success: es
}, ts = "Échangez vos tokens au meilleur prix", rs = "Échangez vos tokens en utilisant les pools de liquidité DinoVox", ns = "Swap", is = "Liquidité", ss = "Vous envoyez", as = "Vous recevez", os = "Balance", ls = "Calcul…", cs = "Solde insuffisant", ds = "⚡ Conversion 1:1 — EGLD → WEGLD via le contrat de wrap", us = "⚡ Conversion 1:1 — WEGLD → EGLD via le contrat de unwrap", fs = "Price impact", ps = "Hops", hs = "Route", gs = "Slippage", ms = "Minimum reçu", xs = "Cette route a un fort impact de prix — vous payez ce token plus cher que son prix de marché. Essayez de réduire le montant échangé pour un meilleur taux.", bs = "Ajouter de la liquidité sur cette paire →", ys = "Connectez votre wallet", ws = "Signature…", _s = "Sélectionnez les tokens", ks = "Entrez un montant", Ns = "Solde insuffisant", vs = "Calcul en cours…", Ls = "Wrapper", Ss = "Unwrapper", Bs = "Quote indisponible", Es = "Swap", Cs = "Arbitrage", $s = "Profit estimé", As = "Aucune opportunité d'arbitrage rentable", Is = "Opportunité trop petite pour couvrir le slippage", Ts = "Montant insuffisant pour obtenir un quote", Fs = "Pas de route disponible pour cette paire", Rs = "Montant supérieur à la liquidité disponible dans les pools", Ps = "Impossible d'obtenir un quote", Ds = "Swap en cours…", qs = "Le swap a échoué", Os = "Swap réussi !", Us = "Wrap en cours…", js = "Le wrap a échoué", Ms = "Wrap réussi !", Vs = "Unwrap en cours…", Ws = "L'unwrap a échoué", Gs = "Unwrap réussi !", Hs = "Choisir un token", zs = "Rechercher…", Ks = "Chargement…", Ys = "Aucun résultat", Js = "Liquidité", Xs = "Gérer vos paires de liquidité", Zs = "Vos positions de liquidité actives", Qs = "Vos positions de liquidité apparaîtront ici.", ea = "Ajouter de la liquidité", ta = "Ajouter", ra = "Retirer", na = "Pools", ia = "Les pools de liquidité référencées par le routeur", sa = "Chargement...", aa = "{{count}} pool active", oa = "{{count}} pools actives", la = "Aucune pool active trouvée.", ca = "Réserve", da = "Active", ua = "+ Ajouter", fa = "Créer une nouvelle pool", pa = "CRÉER", ha = "Nouvelle Pool", ga = "Token 1", ma = "Token 2", xa = "Sélectionner", ba = "Aucun token en portefeuille", ya = "Nom LP (3-20 caractères)", wa = "Ticker LP (3-10 majuscules)", _a = "Étape 1 : Créer la Pair SC", ka = "Étape 2 : Émettre le LP Token (0.05 EGLD)", Na = "Transaction en cours…", va = "En attente de confirmation de la transaction…", La = "La pair est créée !", Sa = "Pour activer la pool et la rendre utilisable, le token LP doit être émis. Coût de la transaction : 0.05 EGLD.", Ba = "Pool Active !", Ea = "La pool est prête à recevoir de la liquidité.", Ca = "Ajouter de la liquidité", $a = "Création de la pair en cours...", Aa = "Création échouée", Ia = "Pair créée ! En attente de synchronisation...", Ta = "Émission du LP Token...", Fa = "Émission échouée", Ra = "Le LP Token a été émis ! Pool active.", Pa = "Ajouter de la liquidité", Da = "Ajouter de la liquidité à une pool", qa = "Ajouter Liquidité", Oa = "Déposez deux tokens pour fournir de la liquidité et recevoir des LP tokens", Ua = "Premier Token", ja = "Deuxième Token", Ma = "Recherche de la pool en cours…", Va = "Aucune pool trouvée", Wa = "Vous devez créer cette pool avant de pouvoir y ajouter de la liquidité. L'activation requiert 0.05 EGLD.", Ga = "Créer la pool", Ha = "LP Reçus (est.)", za = "Remboursement {{ticker}}", Ka = "Dépôt minimum insuffisant pour la première liquidité.", Ya = "Connectez votre wallet", Ja = "Pool inexistante", Xa = "Pool inactive", Za = "Solde insuffisant", Qa = "Renseignez un montant", eo = "Montant trop faible", to = "Ajouter Liquidité", ro = "Ajout de liquidité en cours…", no = "L'ajout a échoué", io = "Liquidité ajoutée !", pr = {
  subtitle: ts,
  card_description: rs,
  tab_swap: ns,
  tab_liquidity: is,
  you_send: ss,
  you_receive: as,
  balance: os,
  calculating: ls,
  insufficient_balance: cs,
  wrap_info: ds,
  unwrap_info: us,
  price_impact: fs,
  hops: ps,
  route: hs,
  slippage: gs,
  min_received: ms,
  high_impact_warning: xs,
  add_liquidity_cta: bs,
  btn_connect: ys,
  btn_signing: ws,
  btn_select_tokens: _s,
  btn_enter_amount: ks,
  btn_insufficient: Ns,
  btn_calculating: vs,
  btn_wrap: Ls,
  btn_unwrap: Ss,
  btn_quote_unavailable: Bs,
  btn_swap: Es,
  btn_arb: Cs,
  arb_profit: $s,
  arb_no_opportunity: As,
  arb_slippage_too_high: Is,
  error_amount_too_low: Ts,
  error_no_route: Fs,
  error_insufficient_liquidity: Rs,
  error_quote: Ps,
  processing: Ds,
  error_tx: qs,
  success_tx: Os,
  processing_wrap: Us,
  error_wrap: js,
  success_wrap: Ms,
  processing_unwrap: Vs,
  error_unwrap: Ws,
  success_unwrap: Gs,
  token_select: Hs,
  token_search: zs,
  token_loading: Ks,
  token_no_results: Ys,
  liquidity_title: Js,
  liquidity_subtitle: Xs,
  liquidity_card_desc: Zs,
  liquidity_empty: Qs,
  liquidity_add: ea,
  liquidity_add_btn: ta,
  liquidity_remove_btn: ra,
  pools_title: na,
  pools_subtitle: ia,
  pools_loading_desc: sa,
  pools_count_one: aa,
  pools_count_other: oa,
  pools_empty: la,
  pools_reserve: ca,
  pools_active: da,
  pools_add: ua,
  pools_create: fa,
  create_title: pa,
  create_subtitle: ha,
  create_token1: ga,
  create_token2: ma,
  create_select: xa,
  create_no_wallet_token: ba,
  create_lp_name: ya,
  create_lp_ticker: wa,
  create_step1: _a,
  create_step2: ka,
  create_tx_pending: Na,
  create_tx_waiting: va,
  create_pair_done: La,
  create_pair_desc: Sa,
  create_pool_active: Ba,
  create_pool_ready: Ea,
  create_add_liquidity: Ca,
  create_processing_pair: $a,
  create_error_pair: Aa,
  create_success_pair: Ia,
  create_processing_lp: Ta,
  create_error_lp: Fa,
  create_success_lp: Ra,
  add_title: Pa,
  add_subtitle: Da,
  add_card_title: qa,
  add_card_desc: Oa,
  add_token1: Ua,
  add_token2: ja,
  add_pool_searching: Ma,
  add_no_pool_title: Va,
  add_no_pool_desc: Wa,
  add_no_pool_btn: Ga,
  add_lp_preview: Ha,
  add_refund: za,
  add_min_deposit: Ka,
  add_btn_connect: Ya,
  add_btn_no_pool: Ja,
  add_btn_inactive: Xa,
  add_btn_insufficient: Za,
  add_btn_enter_amount: Qa,
  add_btn_min: eo,
  add_btn_submit: to,
  add_processing: ro,
  add_error: no,
  add_success: io
}, ot = Yr();
ot.use(wr).init({
  resources: {
    en: { swap: fr },
    fr: { swap: pr }
  },
  lng: typeof navigator < "u" ? (navigator.language || "en").split("-")[0] : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: !1 },
  react: { useSuspense: !1 }
});
function st() {
  const l = lr(), e = Ge();
  return l ? l.navigate : e.navigate ?? ((n) => {
    window.location.assign(n);
  });
}
function Nt() {
  const l = lr();
  if (l) {
    const i = l.setParams ?? ((s, o) => {
      const d = s(new URLSearchParams(window.location.search)), f = new URL(window.location.href);
      f.search = d.toString(), o != null && o.replace ? window.history.replaceState({}, "", f.toString()) : window.history.pushState({}, "", f.toString());
    });
    return [l.params, i];
  }
  return [new URLSearchParams(window.location.search), (i, s) => {
    const o = i(new URLSearchParams(window.location.search)), d = new URL(window.location.href);
    d.search = o.toString(), s != null && s.replace ? window.history.replaceState({}, "", d.toString()) : window.history.pushState({}, "", d.toString());
  }];
}
const so = {
  en: fr,
  fr: pr
}, ht = (l) => {
  const { i18n: e } = Je();
  ae(() => {
    typeof (e == null ? void 0 : e.hasResourceBundle) == "function" && Object.entries(so).forEach(([n, i]) => {
      e.hasResourceBundle(n, l) || e.addResourceBundle(n, l, i, !0, !1);
    });
  }, [l]);
}, nt = async ({
  transactions: l,
  transactionsDisplayInfo: e
}) => {
  const n = Br(), i = Er.getInstance(), s = await n.signTransactions(l), o = await i.send(s);
  return await i.track(o, {
    transactionsDisplayInfo: e
  });
}, Ye = (l, e) => {
  const { network: n } = Xe(), [i, s] = F([]), { address: o } = nr(), d = (e == null ? void 0 : e.enabled) ?? !0, h = Cr().length > 0, p = async () => {
    if (!(!d || h || !o))
      try {
        if (l) {
          const { data: w } = await he.get(`/accounts/${o}/tokens`, {
            baseURL: n.apiAddress,
            params: { size: 1e3, identifier: l }
          });
          s(w);
          return;
        }
        const b = [];
        let L = 0;
        for (; ; ) {
          const { data: w } = await he.get(`/accounts/${o}/tokens`, {
            baseURL: n.apiAddress,
            params: { size: 1e3, from: L }
          });
          if (b.push(...w), w.length < 1e3) break;
          L += 1e3;
        }
        s(b);
      } catch {
        s([]);
      }
  };
  return ae(() => {
    if (!d || !o) {
      s([]);
      return;
    }
    p();
  }, [o, h, l, d]), i;
}, ao = {
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
}, oo = {
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
}, lo = {
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
}, co = {
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
function Tt(l) {
  return l === "mid" ? ao : l === "dark" ? oo : l === "light" ? lo : co;
}
const gt = ({ id: l, title: e, children: n, description: i, reference: s, className: o = "", onClick: d }) => {
  const { theme: f } = Ge(), h = Tt(f), p = o.includes("border") ? "" : "border border-gray-100 dark:border-[#333]";
  return /* @__PURE__ */ _(
    "div",
    {
      id: l,
      onClick: d,
      style: h.card,
      className: `flex flex-col bg-[#ffffff] dark:bg-[#111] p-6 rounded-2xl shadow-sm transition-all ${p} ${o}`,
      children: [
        /* @__PURE__ */ _("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ g(
            "h2",
            {
              className: "text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase",
              style: f ? { color: h.card.color } : {},
              children: e
            }
          ),
          s ? /* @__PURE__ */ g(
            "a",
            {
              href: s,
              target: "_blank",
              rel: "noreferrer",
              className: "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors",
              title: "More info",
              children: /* @__PURE__ */ g(kr, { size: 14 })
            }
          ) : null
        ] }),
        i ? /* @__PURE__ */ g(
          "p",
          {
            className: "mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400 font-medium",
            style: f === "mid" ? { color: "rgba(255,255,255,0.55)" } : {},
            children: i
          }
        ) : null,
        i && n ? /* @__PURE__ */ g(
          "div",
          {
            className: "my-4 h-px bg-gray-100 dark:bg-[#333]",
            style: f === "mid" ? { backgroundColor: "#695885" } : {}
          }
        ) : /* @__PURE__ */ g("div", { className: "mt-3" }),
        n
      ]
    }
  );
};
function uo(l) {
  const [e, n] = F(!1);
  return ae(() => {
    const i = () => {
      var o;
      return n(!!((o = l.current) != null && o.closest(".dark")));
    };
    i();
    const s = new MutationObserver(i);
    return s.observe(document.documentElement, { attributes: !0, attributeFilter: ["class"], subtree: !1 }), () => s.disconnect();
  }, [l]), e;
}
function Jt({ url: l, ticker: e }) {
  const [n, i] = F(!1);
  return !l || n ? /* @__PURE__ */ g("span", { className: "w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0", children: e.slice(0, 2) }) : /* @__PURE__ */ g(
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
  const { t: d } = Je("swap"), { theme: f } = Ge(), h = Tt(f), [p, u] = F(!1), [b, L] = F(""), w = ut(null), k = uo(w), y = h.dropdown.backgroundColor ?? (k ? "#2a2a2a" : "#ffffff"), A = ut(null), N = n.filter((E) => E.identifier !== i).filter((E) => {
    if (!b) return !0;
    const H = b.toLowerCase();
    return E.ticker.toLowerCase().includes(H) || E.identifier.toLowerCase().includes(H);
  });
  return ae(() => {
    if (!p) {
      L("");
      return;
    }
    setTimeout(() => {
      var H;
      return (H = A.current) == null ? void 0 : H.focus();
    }, 50);
    const E = (H) => {
      w.current && !w.current.contains(H.target) && u(!1);
    };
    return document.addEventListener("mousedown", E), () => document.removeEventListener("mousedown", E);
  }, [p]), /* @__PURE__ */ _("div", { ref: w, className: `relative flex-1 ${o}`, children: [
    /* @__PURE__ */ _(
      "button",
      {
        type: "button",
        disabled: s,
        onClick: () => u((E) => !E),
        style: h.tokenBtn,
        className: "w-full flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#444] bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50",
        children: [
          s ? /* @__PURE__ */ g("span", { className: "flex-1 text-left text-gray-400", children: d("token_loading") }) : l ? /* @__PURE__ */ _(dt, { children: [
            /* @__PURE__ */ g(Jt, { url: l.logoUrl, ticker: l.ticker }),
            /* @__PURE__ */ g("span", { className: "flex-1 text-left", children: l.ticker })
          ] }) : /* @__PURE__ */ g("span", { className: "flex-1 text-left text-gray-400", children: d("token_select") }),
          /* @__PURE__ */ g(
            "svg",
            {
              className: `w-4 h-4 text-gray-400 transition-transform shrink-0 ${p ? "rotate-180" : ""}`,
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              strokeWidth: 2,
              children: /* @__PURE__ */ g("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 9l-7 7-7-7" })
            }
          )
        ]
      }
    ),
    p && /* @__PURE__ */ _(
      "div",
      {
        style: { backgroundColor: y, ...h.dropdown },
        className: "absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-[#444] shadow-lg overflow-hidden",
        children: [
          /* @__PURE__ */ g("div", { className: "px-2 pt-2 pb-1", children: /* @__PURE__ */ g(
            "input",
            {
              ref: A,
              type: "text",
              value: b,
              onChange: (E) => L(E.target.value),
              placeholder: d("token_search"),
              style: h.searchInput,
              className: "w-full rounded-lg border border-gray-200 dark:border-[#555] bg-gray-50 dark:bg-[#1e1e1e] px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            }
          ) }),
          /* @__PURE__ */ g("div", { className: "max-h-52 overflow-y-auto", children: N.length === 0 ? /* @__PURE__ */ g("p", { className: "px-3 py-3 text-sm text-gray-400 text-center", children: d("token_no_results") }) : N.map((E) => {
            const H = (l == null ? void 0 : l.identifier) === E.identifier;
            return /* @__PURE__ */ _(
              "button",
              {
                type: "button",
                onClick: () => {
                  e(E), u(!1);
                },
                style: H ? f === "mid" ? { backgroundColor: "rgba(189,55,236,0.2)", color: "#BD37EC" } : {} : f === "mid" ? { color: "#ffffff" } : {},
                className: `w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-amber-50 dark:hover:bg-[#333] ${H ? "bg-amber-50 dark:bg-[#333] text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`,
                children: [
                  /* @__PURE__ */ g(Jt, { url: E.logoUrl, ticker: E.ticker }),
                  /* @__PURE__ */ g("span", { className: "flex-1 text-left", children: E.ticker }),
                  /* @__PURE__ */ g("span", { className: "text-[10px] text-gray-400 font-normal", children: E.identifier.split("-")[1] ?? "" })
                ]
              },
              E.identifier
            );
          }) })
        ]
      }
    )
  ] });
}
const Ke = (l) => {
  let n = BigInt(l).toString(16);
  return n.length % 2 && (n = "0" + n), n;
};
var hr = {}, vt = {};
vt.byteLength = ho;
vt.toByteArray = mo;
vt.fromByteArray = yo;
var Ve = [], Re = [], fo = typeof Uint8Array < "u" ? Uint8Array : Array, Et = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (var Qe = 0, po = Et.length; Qe < po; ++Qe)
  Ve[Qe] = Et[Qe], Re[Et.charCodeAt(Qe)] = Qe;
Re[45] = 62;
Re[95] = 63;
function gr(l) {
  var e = l.length;
  if (e % 4 > 0)
    throw new Error("Invalid string. Length must be a multiple of 4");
  var n = l.indexOf("=");
  n === -1 && (n = e);
  var i = n === e ? 0 : 4 - n % 4;
  return [n, i];
}
function ho(l) {
  var e = gr(l), n = e[0], i = e[1];
  return (n + i) * 3 / 4 - i;
}
function go(l, e, n) {
  return (e + n) * 3 / 4 - n;
}
function mo(l) {
  var e, n = gr(l), i = n[0], s = n[1], o = new fo(go(l, i, s)), d = 0, f = s > 0 ? i - 4 : i, h;
  for (h = 0; h < f; h += 4)
    e = Re[l.charCodeAt(h)] << 18 | Re[l.charCodeAt(h + 1)] << 12 | Re[l.charCodeAt(h + 2)] << 6 | Re[l.charCodeAt(h + 3)], o[d++] = e >> 16 & 255, o[d++] = e >> 8 & 255, o[d++] = e & 255;
  return s === 2 && (e = Re[l.charCodeAt(h)] << 2 | Re[l.charCodeAt(h + 1)] >> 4, o[d++] = e & 255), s === 1 && (e = Re[l.charCodeAt(h)] << 10 | Re[l.charCodeAt(h + 1)] << 4 | Re[l.charCodeAt(h + 2)] >> 2, o[d++] = e >> 8 & 255, o[d++] = e & 255), o;
}
function xo(l) {
  return Ve[l >> 18 & 63] + Ve[l >> 12 & 63] + Ve[l >> 6 & 63] + Ve[l & 63];
}
function bo(l, e, n) {
  for (var i, s = [], o = e; o < n; o += 3)
    i = (l[o] << 16 & 16711680) + (l[o + 1] << 8 & 65280) + (l[o + 2] & 255), s.push(xo(i));
  return s.join("");
}
function yo(l) {
  for (var e, n = l.length, i = n % 3, s = [], o = 16383, d = 0, f = n - i; d < f; d += o)
    s.push(bo(l, d, d + o > f ? f : d + o));
  return i === 1 ? (e = l[n - 1], s.push(
    Ve[e >> 2] + Ve[e << 4 & 63] + "=="
  )) : i === 2 && (e = (l[n - 2] << 8) + l[n - 1], s.push(
    Ve[e >> 10] + Ve[e >> 4 & 63] + Ve[e << 2 & 63] + "="
  )), s.join("");
}
var Ft = {};
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
Ft.read = function(l, e, n, i, s) {
  var o, d, f = s * 8 - i - 1, h = (1 << f) - 1, p = h >> 1, u = -7, b = n ? s - 1 : 0, L = n ? -1 : 1, w = l[e + b];
  for (b += L, o = w & (1 << -u) - 1, w >>= -u, u += f; u > 0; o = o * 256 + l[e + b], b += L, u -= 8)
    ;
  for (d = o & (1 << -u) - 1, o >>= -u, u += i; u > 0; d = d * 256 + l[e + b], b += L, u -= 8)
    ;
  if (o === 0)
    o = 1 - p;
  else {
    if (o === h)
      return d ? NaN : (w ? -1 : 1) * (1 / 0);
    d = d + Math.pow(2, i), o = o - p;
  }
  return (w ? -1 : 1) * d * Math.pow(2, o - i);
};
Ft.write = function(l, e, n, i, s, o) {
  var d, f, h, p = o * 8 - s - 1, u = (1 << p) - 1, b = u >> 1, L = s === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, w = i ? 0 : o - 1, k = i ? 1 : -1, y = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
  for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (f = isNaN(e) ? 1 : 0, d = u) : (d = Math.floor(Math.log(e) / Math.LN2), e * (h = Math.pow(2, -d)) < 1 && (d--, h *= 2), d + b >= 1 ? e += L / h : e += L * Math.pow(2, 1 - b), e * h >= 2 && (d++, h /= 2), d + b >= u ? (f = 0, d = u) : d + b >= 1 ? (f = (e * h - 1) * Math.pow(2, s), d = d + b) : (f = e * Math.pow(2, b - 1) * Math.pow(2, s), d = 0)); s >= 8; l[n + w] = f & 255, w += k, f /= 256, s -= 8)
    ;
  for (d = d << s | f, p += s; p > 0; l[n + w] = d & 255, w += k, d /= 256, p -= 8)
    ;
  l[n + w - k] |= y * 128;
};
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
(function(l) {
  const e = vt, n = Ft, i = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
  l.Buffer = u, l.SlowBuffer = G, l.INSPECT_MAX_BYTES = 50;
  const s = 2147483647;
  l.kMaxLength = s;
  const { Uint8Array: o, ArrayBuffer: d, SharedArrayBuffer: f } = globalThis;
  u.TYPED_ARRAY_SUPPORT = h(), !u.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error(
    "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
  );
  function h() {
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
  function p(a) {
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
      return k(a);
    }
    return b(a, t, r);
  }
  u.poolSize = 8192;
  function b(a, t, r) {
    if (typeof a == "string")
      return y(a, t);
    if (d.isView(a))
      return N(a);
    if (a == null)
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof a
      );
    if (J(a, d) || a && J(a.buffer, d) || typeof f < "u" && (J(a, f) || a && J(a.buffer, f)))
      return E(a, t, r);
    if (typeof a == "number")
      throw new TypeError(
        'The "value" argument must not be of type number. Received type number'
      );
    const c = a.valueOf && a.valueOf();
    if (c != null && c !== a)
      return u.from(c, t, r);
    const m = H(a);
    if (m) return m;
    if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof a[Symbol.toPrimitive] == "function")
      return u.from(a[Symbol.toPrimitive]("string"), t, r);
    throw new TypeError(
      "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof a
    );
  }
  u.from = function(a, t, r) {
    return b(a, t, r);
  }, Object.setPrototypeOf(u.prototype, o.prototype), Object.setPrototypeOf(u, o);
  function L(a) {
    if (typeof a != "number")
      throw new TypeError('"size" argument must be of type number');
    if (a < 0)
      throw new RangeError('The value "' + a + '" is invalid for option "size"');
  }
  function w(a, t, r) {
    return L(a), a <= 0 ? p(a) : t !== void 0 ? typeof r == "string" ? p(a).fill(t, r) : p(a).fill(t) : p(a);
  }
  u.alloc = function(a, t, r) {
    return w(a, t, r);
  };
  function k(a) {
    return L(a), p(a < 0 ? 0 : I(a) | 0);
  }
  u.allocUnsafe = function(a) {
    return k(a);
  }, u.allocUnsafeSlow = function(a) {
    return k(a);
  };
  function y(a, t) {
    if ((typeof t != "string" || t === "") && (t = "utf8"), !u.isEncoding(t))
      throw new TypeError("Unknown encoding: " + t);
    const r = B(a, t) | 0;
    let c = p(r);
    const m = c.write(a, t);
    return m !== r && (c = c.slice(0, m)), c;
  }
  function A(a) {
    const t = a.length < 0 ? 0 : I(a.length) | 0, r = p(t);
    for (let c = 0; c < t; c += 1)
      r[c] = a[c] & 255;
    return r;
  }
  function N(a) {
    if (J(a, o)) {
      const t = new o(a);
      return E(t.buffer, t.byteOffset, t.byteLength);
    }
    return A(a);
  }
  function E(a, t, r) {
    if (t < 0 || a.byteLength < t)
      throw new RangeError('"offset" is outside of buffer bounds');
    if (a.byteLength < t + (r || 0))
      throw new RangeError('"length" is outside of buffer bounds');
    let c;
    return t === void 0 && r === void 0 ? c = new o(a) : r === void 0 ? c = new o(a, t) : c = new o(a, t, r), Object.setPrototypeOf(c, u.prototype), c;
  }
  function H(a) {
    if (u.isBuffer(a)) {
      const t = I(a.length) | 0, r = p(t);
      return r.length === 0 || a.copy(r, 0, 0, t), r;
    }
    if (a.length !== void 0)
      return typeof a.length != "number" || we(a.length) ? p(0) : A(a);
    if (a.type === "Buffer" && Array.isArray(a.data))
      return A(a.data);
  }
  function I(a) {
    if (a >= s)
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + s.toString(16) + " bytes");
    return a | 0;
  }
  function G(a) {
    return +a != a && (a = 0), u.alloc(+a);
  }
  u.isBuffer = function(t) {
    return t != null && t._isBuffer === !0 && t !== u.prototype;
  }, u.compare = function(t, r) {
    if (J(t, o) && (t = u.from(t, t.offset, t.byteLength)), J(r, o) && (r = u.from(r, r.offset, r.byteLength)), !u.isBuffer(t) || !u.isBuffer(r))
      throw new TypeError(
        'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
      );
    if (t === r) return 0;
    let c = t.length, m = r.length;
    for (let x = 0, v = Math.min(c, m); x < v; ++x)
      if (t[x] !== r[x]) {
        c = t[x], m = r[x];
        break;
      }
    return c < m ? -1 : m < c ? 1 : 0;
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
    let c;
    if (r === void 0)
      for (r = 0, c = 0; c < t.length; ++c)
        r += t[c].length;
    const m = u.allocUnsafe(r);
    let x = 0;
    for (c = 0; c < t.length; ++c) {
      let v = t[c];
      if (J(v, o))
        x + v.length > m.length ? (u.isBuffer(v) || (v = u.from(v)), v.copy(m, x)) : o.prototype.set.call(
          m,
          v,
          x
        );
      else if (u.isBuffer(v))
        v.copy(m, x);
      else
        throw new TypeError('"list" argument must be an Array of Buffers');
      x += v.length;
    }
    return m;
  };
  function B(a, t) {
    if (u.isBuffer(a))
      return a.length;
    if (d.isView(a) || J(a, d))
      return a.byteLength;
    if (typeof a != "string")
      throw new TypeError(
        'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof a
      );
    const r = a.length, c = arguments.length > 2 && arguments[2] === !0;
    if (!c && r === 0) return 0;
    let m = !1;
    for (; ; )
      switch (t) {
        case "ascii":
        case "latin1":
        case "binary":
          return r;
        case "utf8":
        case "utf-8":
          return Oe(a).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return r * 2;
        case "hex":
          return r >>> 1;
        case "base64":
          return z(a).length;
        default:
          if (m)
            return c ? -1 : Oe(a).length;
          t = ("" + t).toLowerCase(), m = !0;
      }
  }
  u.byteLength = B;
  function K(a, t, r) {
    let c = !1;
    if ((t === void 0 || t < 0) && (t = 0), t > this.length || ((r === void 0 || r > this.length) && (r = this.length), r <= 0) || (r >>>= 0, t >>>= 0, r <= t))
      return "";
    for (a || (a = "utf8"); ; )
      switch (a) {
        case "hex":
          return ge(this, t, r);
        case "utf8":
        case "utf-8":
          return P(this, t, r);
        case "ascii":
          return Ce(this, t, r);
        case "latin1":
        case "binary":
          return oe(this, t, r);
        case "base64":
          return q(this, t, r);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return de(this, t, r);
        default:
          if (c) throw new TypeError("Unknown encoding: " + a);
          a = (a + "").toLowerCase(), c = !0;
      }
  }
  u.prototype._isBuffer = !0;
  function C(a, t, r) {
    const c = a[t];
    a[t] = a[r], a[r] = c;
  }
  u.prototype.swap16 = function() {
    const t = this.length;
    if (t % 2 !== 0)
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (let r = 0; r < t; r += 2)
      C(this, r, r + 1);
    return this;
  }, u.prototype.swap32 = function() {
    const t = this.length;
    if (t % 4 !== 0)
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (let r = 0; r < t; r += 4)
      C(this, r, r + 3), C(this, r + 1, r + 2);
    return this;
  }, u.prototype.swap64 = function() {
    const t = this.length;
    if (t % 8 !== 0)
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    for (let r = 0; r < t; r += 8)
      C(this, r, r + 7), C(this, r + 1, r + 6), C(this, r + 2, r + 5), C(this, r + 3, r + 4);
    return this;
  }, u.prototype.toString = function() {
    const t = this.length;
    return t === 0 ? "" : arguments.length === 0 ? P(this, 0, t) : K.apply(this, arguments);
  }, u.prototype.toLocaleString = u.prototype.toString, u.prototype.equals = function(t) {
    if (!u.isBuffer(t)) throw new TypeError("Argument must be a Buffer");
    return this === t ? !0 : u.compare(this, t) === 0;
  }, u.prototype.inspect = function() {
    let t = "";
    const r = l.INSPECT_MAX_BYTES;
    return t = this.toString("hex", 0, r).replace(/(.{2})/g, "$1 ").trim(), this.length > r && (t += " ... "), "<Buffer " + t + ">";
  }, i && (u.prototype[i] = u.prototype.inspect), u.prototype.compare = function(t, r, c, m, x) {
    if (J(t, o) && (t = u.from(t, t.offset, t.byteLength)), !u.isBuffer(t))
      throw new TypeError(
        'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof t
      );
    if (r === void 0 && (r = 0), c === void 0 && (c = t ? t.length : 0), m === void 0 && (m = 0), x === void 0 && (x = this.length), r < 0 || c > t.length || m < 0 || x > this.length)
      throw new RangeError("out of range index");
    if (m >= x && r >= c)
      return 0;
    if (m >= x)
      return -1;
    if (r >= c)
      return 1;
    if (r >>>= 0, c >>>= 0, m >>>= 0, x >>>= 0, this === t) return 0;
    let v = x - m, W = c - r;
    const ue = Math.min(v, W), le = this.slice(m, x), fe = t.slice(r, c);
    for (let se = 0; se < ue; ++se)
      if (le[se] !== fe[se]) {
        v = le[se], W = fe[se];
        break;
      }
    return v < W ? -1 : W < v ? 1 : 0;
  };
  function Z(a, t, r, c, m) {
    if (a.length === 0) return -1;
    if (typeof r == "string" ? (c = r, r = 0) : r > 2147483647 ? r = 2147483647 : r < -2147483648 && (r = -2147483648), r = +r, we(r) && (r = m ? 0 : a.length - 1), r < 0 && (r = a.length + r), r >= a.length) {
      if (m) return -1;
      r = a.length - 1;
    } else if (r < 0)
      if (m) r = 0;
      else return -1;
    if (typeof t == "string" && (t = u.from(t, c)), u.isBuffer(t))
      return t.length === 0 ? -1 : T(a, t, r, c, m);
    if (typeof t == "number")
      return t = t & 255, typeof o.prototype.indexOf == "function" ? m ? o.prototype.indexOf.call(a, t, r) : o.prototype.lastIndexOf.call(a, t, r) : T(a, [t], r, c, m);
    throw new TypeError("val must be string, number or Buffer");
  }
  function T(a, t, r, c, m) {
    let x = 1, v = a.length, W = t.length;
    if (c !== void 0 && (c = String(c).toLowerCase(), c === "ucs2" || c === "ucs-2" || c === "utf16le" || c === "utf-16le")) {
      if (a.length < 2 || t.length < 2)
        return -1;
      x = 2, v /= 2, W /= 2, r /= 2;
    }
    function ue(fe, se) {
      return x === 1 ? fe[se] : fe.readUInt16BE(se * x);
    }
    let le;
    if (m) {
      let fe = -1;
      for (le = r; le < v; le++)
        if (ue(a, le) === ue(t, fe === -1 ? 0 : le - fe)) {
          if (fe === -1 && (fe = le), le - fe + 1 === W) return fe * x;
        } else
          fe !== -1 && (le -= le - fe), fe = -1;
    } else
      for (r + W > v && (r = v - W), le = r; le >= 0; le--) {
        let fe = !0;
        for (let se = 0; se < W; se++)
          if (ue(a, le + se) !== ue(t, se)) {
            fe = !1;
            break;
          }
        if (fe) return le;
      }
    return -1;
  }
  u.prototype.includes = function(t, r, c) {
    return this.indexOf(t, r, c) !== -1;
  }, u.prototype.indexOf = function(t, r, c) {
    return Z(this, t, r, c, !0);
  }, u.prototype.lastIndexOf = function(t, r, c) {
    return Z(this, t, r, c, !1);
  };
  function ee(a, t, r, c) {
    r = Number(r) || 0;
    const m = a.length - r;
    c ? (c = Number(c), c > m && (c = m)) : c = m;
    const x = t.length;
    c > x / 2 && (c = x / 2);
    let v;
    for (v = 0; v < c; ++v) {
      const W = parseInt(t.substr(v * 2, 2), 16);
      if (we(W)) return v;
      a[r + v] = W;
    }
    return v;
  }
  function xe(a, t, r, c) {
    return V(Oe(t, a.length - r), a, r, c);
  }
  function Y(a, t, r, c) {
    return V(Ue(t), a, r, c);
  }
  function ne(a, t, r, c) {
    return V(z(t), a, r, c);
  }
  function R(a, t, r, c) {
    return V(M(t, a.length - r), a, r, c);
  }
  u.prototype.write = function(t, r, c, m) {
    if (r === void 0)
      m = "utf8", c = this.length, r = 0;
    else if (c === void 0 && typeof r == "string")
      m = r, c = this.length, r = 0;
    else if (isFinite(r))
      r = r >>> 0, isFinite(c) ? (c = c >>> 0, m === void 0 && (m = "utf8")) : (m = c, c = void 0);
    else
      throw new Error(
        "Buffer.write(string, encoding, offset[, length]) is no longer supported"
      );
    const x = this.length - r;
    if ((c === void 0 || c > x) && (c = x), t.length > 0 && (c < 0 || r < 0) || r > this.length)
      throw new RangeError("Attempt to write outside buffer bounds");
    m || (m = "utf8");
    let v = !1;
    for (; ; )
      switch (m) {
        case "hex":
          return ee(this, t, r, c);
        case "utf8":
        case "utf-8":
          return xe(this, t, r, c);
        case "ascii":
        case "latin1":
        case "binary":
          return Y(this, t, r, c);
        case "base64":
          return ne(this, t, r, c);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return R(this, t, r, c);
        default:
          if (v) throw new TypeError("Unknown encoding: " + m);
          m = ("" + m).toLowerCase(), v = !0;
      }
  }, u.prototype.toJSON = function() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function q(a, t, r) {
    return t === 0 && r === a.length ? e.fromByteArray(a) : e.fromByteArray(a.slice(t, r));
  }
  function P(a, t, r) {
    r = Math.min(a.length, r);
    const c = [];
    let m = t;
    for (; m < r; ) {
      const x = a[m];
      let v = null, W = x > 239 ? 4 : x > 223 ? 3 : x > 191 ? 2 : 1;
      if (m + W <= r) {
        let ue, le, fe, se;
        switch (W) {
          case 1:
            x < 128 && (v = x);
            break;
          case 2:
            ue = a[m + 1], (ue & 192) === 128 && (se = (x & 31) << 6 | ue & 63, se > 127 && (v = se));
            break;
          case 3:
            ue = a[m + 1], le = a[m + 2], (ue & 192) === 128 && (le & 192) === 128 && (se = (x & 15) << 12 | (ue & 63) << 6 | le & 63, se > 2047 && (se < 55296 || se > 57343) && (v = se));
            break;
          case 4:
            ue = a[m + 1], le = a[m + 2], fe = a[m + 3], (ue & 192) === 128 && (le & 192) === 128 && (fe & 192) === 128 && (se = (x & 15) << 18 | (ue & 63) << 12 | (le & 63) << 6 | fe & 63, se > 65535 && se < 1114112 && (v = se));
        }
      }
      v === null ? (v = 65533, W = 1) : v > 65535 && (v -= 65536, c.push(v >>> 10 & 1023 | 55296), v = 56320 | v & 1023), c.push(v), m += W;
    }
    return be(c);
  }
  const te = 4096;
  function be(a) {
    const t = a.length;
    if (t <= te)
      return String.fromCharCode.apply(String, a);
    let r = "", c = 0;
    for (; c < t; )
      r += String.fromCharCode.apply(
        String,
        a.slice(c, c += te)
      );
    return r;
  }
  function Ce(a, t, r) {
    let c = "";
    r = Math.min(a.length, r);
    for (let m = t; m < r; ++m)
      c += String.fromCharCode(a[m] & 127);
    return c;
  }
  function oe(a, t, r) {
    let c = "";
    r = Math.min(a.length, r);
    for (let m = t; m < r; ++m)
      c += String.fromCharCode(a[m]);
    return c;
  }
  function ge(a, t, r) {
    const c = a.length;
    (!t || t < 0) && (t = 0), (!r || r < 0 || r > c) && (r = c);
    let m = "";
    for (let x = t; x < r; ++x)
      m += Te[a[x]];
    return m;
  }
  function de(a, t, r) {
    const c = a.slice(t, r);
    let m = "";
    for (let x = 0; x < c.length - 1; x += 2)
      m += String.fromCharCode(c[x] + c[x + 1] * 256);
    return m;
  }
  u.prototype.slice = function(t, r) {
    const c = this.length;
    t = ~~t, r = r === void 0 ? c : ~~r, t < 0 ? (t += c, t < 0 && (t = 0)) : t > c && (t = c), r < 0 ? (r += c, r < 0 && (r = 0)) : r > c && (r = c), r < t && (r = t);
    const m = this.subarray(t, r);
    return Object.setPrototypeOf(m, u.prototype), m;
  };
  function X(a, t, r) {
    if (a % 1 !== 0 || a < 0) throw new RangeError("offset is not uint");
    if (a + t > r) throw new RangeError("Trying to access beyond buffer length");
  }
  u.prototype.readUintLE = u.prototype.readUIntLE = function(t, r, c) {
    t = t >>> 0, r = r >>> 0, c || X(t, r, this.length);
    let m = this[t], x = 1, v = 0;
    for (; ++v < r && (x *= 256); )
      m += this[t + v] * x;
    return m;
  }, u.prototype.readUintBE = u.prototype.readUIntBE = function(t, r, c) {
    t = t >>> 0, r = r >>> 0, c || X(t, r, this.length);
    let m = this[t + --r], x = 1;
    for (; r > 0 && (x *= 256); )
      m += this[t + --r] * x;
    return m;
  }, u.prototype.readUint8 = u.prototype.readUInt8 = function(t, r) {
    return t = t >>> 0, r || X(t, 1, this.length), this[t];
  }, u.prototype.readUint16LE = u.prototype.readUInt16LE = function(t, r) {
    return t = t >>> 0, r || X(t, 2, this.length), this[t] | this[t + 1] << 8;
  }, u.prototype.readUint16BE = u.prototype.readUInt16BE = function(t, r) {
    return t = t >>> 0, r || X(t, 2, this.length), this[t] << 8 | this[t + 1];
  }, u.prototype.readUint32LE = u.prototype.readUInt32LE = function(t, r) {
    return t = t >>> 0, r || X(t, 4, this.length), (this[t] | this[t + 1] << 8 | this[t + 2] << 16) + this[t + 3] * 16777216;
  }, u.prototype.readUint32BE = u.prototype.readUInt32BE = function(t, r) {
    return t = t >>> 0, r || X(t, 4, this.length), this[t] * 16777216 + (this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3]);
  }, u.prototype.readBigUInt64LE = _e(function(t) {
    t = t >>> 0, ye(t, "offset");
    const r = this[t], c = this[t + 7];
    (r === void 0 || c === void 0) && Se(t, this.length - 8);
    const m = r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24, x = this[++t] + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + c * 2 ** 24;
    return BigInt(m) + (BigInt(x) << BigInt(32));
  }), u.prototype.readBigUInt64BE = _e(function(t) {
    t = t >>> 0, ye(t, "offset");
    const r = this[t], c = this[t + 7];
    (r === void 0 || c === void 0) && Se(t, this.length - 8);
    const m = r * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t], x = this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + c;
    return (BigInt(m) << BigInt(32)) + BigInt(x);
  }), u.prototype.readIntLE = function(t, r, c) {
    t = t >>> 0, r = r >>> 0, c || X(t, r, this.length);
    let m = this[t], x = 1, v = 0;
    for (; ++v < r && (x *= 256); )
      m += this[t + v] * x;
    return x *= 128, m >= x && (m -= Math.pow(2, 8 * r)), m;
  }, u.prototype.readIntBE = function(t, r, c) {
    t = t >>> 0, r = r >>> 0, c || X(t, r, this.length);
    let m = r, x = 1, v = this[t + --m];
    for (; m > 0 && (x *= 256); )
      v += this[t + --m] * x;
    return x *= 128, v >= x && (v -= Math.pow(2, 8 * r)), v;
  }, u.prototype.readInt8 = function(t, r) {
    return t = t >>> 0, r || X(t, 1, this.length), this[t] & 128 ? (255 - this[t] + 1) * -1 : this[t];
  }, u.prototype.readInt16LE = function(t, r) {
    t = t >>> 0, r || X(t, 2, this.length);
    const c = this[t] | this[t + 1] << 8;
    return c & 32768 ? c | 4294901760 : c;
  }, u.prototype.readInt16BE = function(t, r) {
    t = t >>> 0, r || X(t, 2, this.length);
    const c = this[t + 1] | this[t] << 8;
    return c & 32768 ? c | 4294901760 : c;
  }, u.prototype.readInt32LE = function(t, r) {
    return t = t >>> 0, r || X(t, 4, this.length), this[t] | this[t + 1] << 8 | this[t + 2] << 16 | this[t + 3] << 24;
  }, u.prototype.readInt32BE = function(t, r) {
    return t = t >>> 0, r || X(t, 4, this.length), this[t] << 24 | this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3];
  }, u.prototype.readBigInt64LE = _e(function(t) {
    t = t >>> 0, ye(t, "offset");
    const r = this[t], c = this[t + 7];
    (r === void 0 || c === void 0) && Se(t, this.length - 8);
    const m = this[t + 4] + this[t + 5] * 2 ** 8 + this[t + 6] * 2 ** 16 + (c << 24);
    return (BigInt(m) << BigInt(32)) + BigInt(r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24);
  }), u.prototype.readBigInt64BE = _e(function(t) {
    t = t >>> 0, ye(t, "offset");
    const r = this[t], c = this[t + 7];
    (r === void 0 || c === void 0) && Se(t, this.length - 8);
    const m = (r << 24) + // Overflow
    this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t];
    return (BigInt(m) << BigInt(32)) + BigInt(this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + c);
  }), u.prototype.readFloatLE = function(t, r) {
    return t = t >>> 0, r || X(t, 4, this.length), n.read(this, t, !0, 23, 4);
  }, u.prototype.readFloatBE = function(t, r) {
    return t = t >>> 0, r || X(t, 4, this.length), n.read(this, t, !1, 23, 4);
  }, u.prototype.readDoubleLE = function(t, r) {
    return t = t >>> 0, r || X(t, 8, this.length), n.read(this, t, !0, 52, 8);
  }, u.prototype.readDoubleBE = function(t, r) {
    return t = t >>> 0, r || X(t, 8, this.length), n.read(this, t, !1, 52, 8);
  };
  function re(a, t, r, c, m, x) {
    if (!u.isBuffer(a)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (t > m || t < x) throw new RangeError('"value" argument is out of bounds');
    if (r + c > a.length) throw new RangeError("Index out of range");
  }
  u.prototype.writeUintLE = u.prototype.writeUIntLE = function(t, r, c, m) {
    if (t = +t, r = r >>> 0, c = c >>> 0, !m) {
      const W = Math.pow(2, 8 * c) - 1;
      re(this, t, r, c, W, 0);
    }
    let x = 1, v = 0;
    for (this[r] = t & 255; ++v < c && (x *= 256); )
      this[r + v] = t / x & 255;
    return r + c;
  }, u.prototype.writeUintBE = u.prototype.writeUIntBE = function(t, r, c, m) {
    if (t = +t, r = r >>> 0, c = c >>> 0, !m) {
      const W = Math.pow(2, 8 * c) - 1;
      re(this, t, r, c, W, 0);
    }
    let x = c - 1, v = 1;
    for (this[r + x] = t & 255; --x >= 0 && (v *= 256); )
      this[r + x] = t / v & 255;
    return r + c;
  }, u.prototype.writeUint8 = u.prototype.writeUInt8 = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 1, 255, 0), this[r] = t & 255, r + 1;
  }, u.prototype.writeUint16LE = u.prototype.writeUInt16LE = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 2, 65535, 0), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
  }, u.prototype.writeUint16BE = u.prototype.writeUInt16BE = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 2, 65535, 0), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
  }, u.prototype.writeUint32LE = u.prototype.writeUInt32LE = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 4, 4294967295, 0), this[r + 3] = t >>> 24, this[r + 2] = t >>> 16, this[r + 1] = t >>> 8, this[r] = t & 255, r + 4;
  }, u.prototype.writeUint32BE = u.prototype.writeUInt32BE = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 4, 4294967295, 0), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
  };
  function je(a, t, r, c, m) {
    $e(t, c, m, a, r, 7);
    let x = Number(t & BigInt(4294967295));
    a[r++] = x, x = x >> 8, a[r++] = x, x = x >> 8, a[r++] = x, x = x >> 8, a[r++] = x;
    let v = Number(t >> BigInt(32) & BigInt(4294967295));
    return a[r++] = v, v = v >> 8, a[r++] = v, v = v >> 8, a[r++] = v, v = v >> 8, a[r++] = v, r;
  }
  function De(a, t, r, c, m) {
    $e(t, c, m, a, r, 7);
    let x = Number(t & BigInt(4294967295));
    a[r + 7] = x, x = x >> 8, a[r + 6] = x, x = x >> 8, a[r + 5] = x, x = x >> 8, a[r + 4] = x;
    let v = Number(t >> BigInt(32) & BigInt(4294967295));
    return a[r + 3] = v, v = v >> 8, a[r + 2] = v, v = v >> 8, a[r + 1] = v, v = v >> 8, a[r] = v, r + 8;
  }
  u.prototype.writeBigUInt64LE = _e(function(t, r = 0) {
    return je(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
  }), u.prototype.writeBigUInt64BE = _e(function(t, r = 0) {
    return De(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
  }), u.prototype.writeIntLE = function(t, r, c, m) {
    if (t = +t, r = r >>> 0, !m) {
      const ue = Math.pow(2, 8 * c - 1);
      re(this, t, r, c, ue - 1, -ue);
    }
    let x = 0, v = 1, W = 0;
    for (this[r] = t & 255; ++x < c && (v *= 256); )
      t < 0 && W === 0 && this[r + x - 1] !== 0 && (W = 1), this[r + x] = (t / v >> 0) - W & 255;
    return r + c;
  }, u.prototype.writeIntBE = function(t, r, c, m) {
    if (t = +t, r = r >>> 0, !m) {
      const ue = Math.pow(2, 8 * c - 1);
      re(this, t, r, c, ue - 1, -ue);
    }
    let x = c - 1, v = 1, W = 0;
    for (this[r + x] = t & 255; --x >= 0 && (v *= 256); )
      t < 0 && W === 0 && this[r + x + 1] !== 0 && (W = 1), this[r + x] = (t / v >> 0) - W & 255;
    return r + c;
  }, u.prototype.writeInt8 = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 1, 127, -128), t < 0 && (t = 255 + t + 1), this[r] = t & 255, r + 1;
  }, u.prototype.writeInt16LE = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 2, 32767, -32768), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
  }, u.prototype.writeInt16BE = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 2, 32767, -32768), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
  }, u.prototype.writeInt32LE = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 4, 2147483647, -2147483648), this[r] = t & 255, this[r + 1] = t >>> 8, this[r + 2] = t >>> 16, this[r + 3] = t >>> 24, r + 4;
  }, u.prototype.writeInt32BE = function(t, r, c) {
    return t = +t, r = r >>> 0, c || re(this, t, r, 4, 2147483647, -2147483648), t < 0 && (t = 4294967295 + t + 1), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
  }, u.prototype.writeBigInt64LE = _e(function(t, r = 0) {
    return je(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  }), u.prototype.writeBigInt64BE = _e(function(t, r = 0) {
    return De(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  });
  function D(a, t, r, c, m, x) {
    if (r + c > a.length) throw new RangeError("Index out of range");
    if (r < 0) throw new RangeError("Index out of range");
  }
  function j(a, t, r, c, m) {
    return t = +t, r = r >>> 0, m || D(a, t, r, 4), n.write(a, t, r, c, 23, 4), r + 4;
  }
  u.prototype.writeFloatLE = function(t, r, c) {
    return j(this, t, r, !0, c);
  }, u.prototype.writeFloatBE = function(t, r, c) {
    return j(this, t, r, !1, c);
  };
  function U(a, t, r, c, m) {
    return t = +t, r = r >>> 0, m || D(a, t, r, 8), n.write(a, t, r, c, 52, 8), r + 8;
  }
  u.prototype.writeDoubleLE = function(t, r, c) {
    return U(this, t, r, !0, c);
  }, u.prototype.writeDoubleBE = function(t, r, c) {
    return U(this, t, r, !1, c);
  }, u.prototype.copy = function(t, r, c, m) {
    if (!u.isBuffer(t)) throw new TypeError("argument should be a Buffer");
    if (c || (c = 0), !m && m !== 0 && (m = this.length), r >= t.length && (r = t.length), r || (r = 0), m > 0 && m < c && (m = c), m === c || t.length === 0 || this.length === 0) return 0;
    if (r < 0)
      throw new RangeError("targetStart out of bounds");
    if (c < 0 || c >= this.length) throw new RangeError("Index out of range");
    if (m < 0) throw new RangeError("sourceEnd out of bounds");
    m > this.length && (m = this.length), t.length - r < m - c && (m = t.length - r + c);
    const x = m - c;
    return this === t && typeof o.prototype.copyWithin == "function" ? this.copyWithin(r, c, m) : o.prototype.set.call(
      t,
      this.subarray(c, m),
      r
    ), x;
  }, u.prototype.fill = function(t, r, c, m) {
    if (typeof t == "string") {
      if (typeof r == "string" ? (m = r, r = 0, c = this.length) : typeof c == "string" && (m = c, c = this.length), m !== void 0 && typeof m != "string")
        throw new TypeError("encoding must be a string");
      if (typeof m == "string" && !u.isEncoding(m))
        throw new TypeError("Unknown encoding: " + m);
      if (t.length === 1) {
        const v = t.charCodeAt(0);
        (m === "utf8" && v < 128 || m === "latin1") && (t = v);
      }
    } else typeof t == "number" ? t = t & 255 : typeof t == "boolean" && (t = Number(t));
    if (r < 0 || this.length < r || this.length < c)
      throw new RangeError("Out of range index");
    if (c <= r)
      return this;
    r = r >>> 0, c = c === void 0 ? this.length : c >>> 0, t || (t = 0);
    let x;
    if (typeof t == "number")
      for (x = r; x < c; ++x)
        this[x] = t;
    else {
      const v = u.isBuffer(t) ? t : u.from(t, m), W = v.length;
      if (W === 0)
        throw new TypeError('The value "' + t + '" is invalid for argument "value"');
      for (x = 0; x < c - r; ++x)
        this[x + r] = v[x % W];
    }
    return this;
  };
  const ie = {};
  function Ie(a, t, r) {
    ie[a] = class extends r {
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
      set code(m) {
        Object.defineProperty(this, "code", {
          configurable: !0,
          enumerable: !0,
          value: m,
          writable: !0
        });
      }
      toString() {
        return `${this.name} [${a}]: ${this.message}`;
      }
    };
  }
  Ie(
    "ERR_BUFFER_OUT_OF_BOUNDS",
    function(a) {
      return a ? `${a} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
    },
    RangeError
  ), Ie(
    "ERR_INVALID_ARG_TYPE",
    function(a, t) {
      return `The "${a}" argument must be of type number. Received type ${typeof t}`;
    },
    TypeError
  ), Ie(
    "ERR_OUT_OF_RANGE",
    function(a, t, r) {
      let c = `The value of "${a}" is out of range.`, m = r;
      return Number.isInteger(r) && Math.abs(r) > 2 ** 32 ? m = qe(String(r)) : typeof r == "bigint" && (m = String(r), (r > BigInt(2) ** BigInt(32) || r < -(BigInt(2) ** BigInt(32))) && (m = qe(m)), m += "n"), c += ` It must be ${t}. Received ${m}`, c;
    },
    RangeError
  );
  function qe(a) {
    let t = "", r = a.length;
    const c = a[0] === "-" ? 1 : 0;
    for (; r >= c + 4; r -= 3)
      t = `_${a.slice(r - 3, r)}${t}`;
    return `${a.slice(0, r)}${t}`;
  }
  function He(a, t, r) {
    ye(t, "offset"), (a[t] === void 0 || a[t + r] === void 0) && Se(t, a.length - (r + 1));
  }
  function $e(a, t, r, c, m, x) {
    if (a > r || a < t) {
      const v = typeof t == "bigint" ? "n" : "";
      let W;
      throw t === 0 || t === BigInt(0) ? W = `>= 0${v} and < 2${v} ** ${(x + 1) * 8}${v}` : W = `>= -(2${v} ** ${(x + 1) * 8 - 1}${v}) and < 2 ** ${(x + 1) * 8 - 1}${v}`, new ie.ERR_OUT_OF_RANGE("value", W, a);
    }
    He(c, m, x);
  }
  function ye(a, t) {
    if (typeof a != "number")
      throw new ie.ERR_INVALID_ARG_TYPE(t, "number", a);
  }
  function Se(a, t, r) {
    throw Math.floor(a) !== a ? (ye(a, r), new ie.ERR_OUT_OF_RANGE("offset", "an integer", a)) : t < 0 ? new ie.ERR_BUFFER_OUT_OF_BOUNDS() : new ie.ERR_OUT_OF_RANGE(
      "offset",
      `>= 0 and <= ${t}`,
      a
    );
  }
  const Be = /[^+/0-9A-Za-z-_]/g;
  function Me(a) {
    if (a = a.split("=")[0], a = a.trim().replace(Be, ""), a.length < 2) return "";
    for (; a.length % 4 !== 0; )
      a = a + "=";
    return a;
  }
  function Oe(a, t) {
    t = t || 1 / 0;
    let r;
    const c = a.length;
    let m = null;
    const x = [];
    for (let v = 0; v < c; ++v) {
      if (r = a.charCodeAt(v), r > 55295 && r < 57344) {
        if (!m) {
          if (r > 56319) {
            (t -= 3) > -1 && x.push(239, 191, 189);
            continue;
          } else if (v + 1 === c) {
            (t -= 3) > -1 && x.push(239, 191, 189);
            continue;
          }
          m = r;
          continue;
        }
        if (r < 56320) {
          (t -= 3) > -1 && x.push(239, 191, 189), m = r;
          continue;
        }
        r = (m - 55296 << 10 | r - 56320) + 65536;
      } else m && (t -= 3) > -1 && x.push(239, 191, 189);
      if (m = null, r < 128) {
        if ((t -= 1) < 0) break;
        x.push(r);
      } else if (r < 2048) {
        if ((t -= 2) < 0) break;
        x.push(
          r >> 6 | 192,
          r & 63 | 128
        );
      } else if (r < 65536) {
        if ((t -= 3) < 0) break;
        x.push(
          r >> 12 | 224,
          r >> 6 & 63 | 128,
          r & 63 | 128
        );
      } else if (r < 1114112) {
        if ((t -= 4) < 0) break;
        x.push(
          r >> 18 | 240,
          r >> 12 & 63 | 128,
          r >> 6 & 63 | 128,
          r & 63 | 128
        );
      } else
        throw new Error("Invalid code point");
    }
    return x;
  }
  function Ue(a) {
    const t = [];
    for (let r = 0; r < a.length; ++r)
      t.push(a.charCodeAt(r) & 255);
    return t;
  }
  function M(a, t) {
    let r, c, m;
    const x = [];
    for (let v = 0; v < a.length && !((t -= 2) < 0); ++v)
      r = a.charCodeAt(v), c = r >> 8, m = r % 256, x.push(m), x.push(c);
    return x;
  }
  function z(a) {
    return e.toByteArray(Me(a));
  }
  function V(a, t, r, c) {
    let m;
    for (m = 0; m < c && !(m + r >= t.length || m >= a.length); ++m)
      t[m + r] = a[m];
    return m;
  }
  function J(a, t) {
    return a instanceof t || a != null && a.constructor != null && a.constructor.name != null && a.constructor.name === t.name;
  }
  function we(a) {
    return a !== a;
  }
  const Te = function() {
    const a = "0123456789abcdef", t = new Array(256);
    for (let r = 0; r < 16; ++r) {
      const c = r * 16;
      for (let m = 0; m < 16; ++m)
        t[c + m] = a[r] + a[m];
    }
    return t;
  }();
  function _e(a) {
    return typeof BigInt > "u" ? Fe : a;
  }
  function Fe() {
    throw new Error("BigInt not supported");
  }
})(hr);
const wo = hr.Buffer, Ae = (l) => wo.from(l, "utf8").toString("hex"), Xt = [5e-3, 0.01, 0.02], Zt = {
  identifier: "EGLD",
  ticker: "EGLD",
  poolCount: 0,
  decimals: 18,
  logoUrl: null
}, _o = (l, e) => BigInt(
  new S(l).multipliedBy(1 - e).toFixed(0, S.ROUND_DOWN)
), ko = () => {
  var Rt, Pt, Dt;
  const {
    apiUrl: l,
    routerAddress: e,
    aggregatorAddress: n,
    wrapContract: i,
    wegldIdentifier: s,
    routes: o,
    theme: d,
    onConnect: f
  } = Ge(), h = Tt(d), { t: p } = Je("swap");
  ht("swap");
  const { address: u } = pt(), { account: b } = nr(), { network: L } = Xe(), [w, k] = Nt(), y = st(), [A, N] = F([]), [E, H] = F(/* @__PURE__ */ new Set()), [I, G] = F(!0), [B, K] = F(null), [C, Z] = F(null), T = ut(!1), [ee, xe] = F(""), [Y, ne] = F(""), [R, q] = F("in"), [P, te] = F(null), [be, Ce] = F(!1), [oe, ge] = F(null), [de, X] = F(null), [re, je] = F(!1), [De, D] = F(null), j = !!(B && C && B.identifier === C.identifier), [U, ie] = F(0.01), [Ie, qe] = F(!1), [He, $e] = F(null), ye = ut(null), [Se, Be] = F(!1), Me = (B == null ? void 0 : B.identifier) === "EGLD", Oe = Ye(
    Me || B == null ? void 0 : B.identifier,
    { enabled: !!B && !Me && !!u }
  );
  ae(() => {
    Be(!!(B && u));
  }, [B == null ? void 0 : B.identifier]), ae(() => {
    Be(!1);
  }, [Oe]);
  const Ue = Me ? (b == null ? void 0 : b.balance) ?? null : ((Rt = Oe == null ? void 0 : Oe[0]) == null ? void 0 : Rt.balance) ?? null, M = Ue && B ? new S(Ue).shiftedBy(-B.decimals).toFixed(6, S.ROUND_DOWN) : null, z = !Se && u && B ? Ue ?? "0" : Ue, V = R === "out" && P ? P.amountIn : R === "in" && ee ? new S(ee).shiftedBy((B == null ? void 0 : B.decimals) ?? 18).toFixed(0, S.ROUND_DOWN) : null, J = z && V ? new S(V).isGreaterThan(z) : !1, we = (C == null ? void 0 : C.identifier) === "EGLD", Te = Ye(
    we || C == null ? void 0 : C.identifier,
    { enabled: !!C && !we && !!u }
  ), _e = we ? (b == null ? void 0 : b.balance) ?? null : ((Pt = Te == null ? void 0 : Te[0]) == null ? void 0 : Pt.balance) ?? null, Fe = _e && C ? new S(_e).shiftedBy(-C.decimals).toFixed(6, S.ROUND_DOWN) : null, a = (B == null ? void 0 : B.identifier) === "EGLD" && (C == null ? void 0 : C.identifier) === s, t = (B == null ? void 0 : B.identifier) === s && (C == null ? void 0 : C.identifier) === "EGLD", r = a || t, c = () => {
    !Ue || !B || (q("in"), ne(""), xe(
      new S(Ue).shiftedBy(-B.decimals).toFixed(B.decimals, S.ROUND_DOWN)
    ));
  };
  ae(() => {
    l && (G(!0), Promise.all([
      he.get(`${l}/tokens`),
      he.get(`${l}/tokens/hub`).catch(() => ({ data: { hubTokens: [] } }))
    ]).then(([$, ce]) => {
      var ke;
      const me = ($.data.tokens || []).filter((Ne) => Ne.identifier), Q = me.find((Ne) => Ne.ticker === "WEGLD");
      N([
        { ...Zt, logoUrl: (Q == null ? void 0 : Q.logoUrl) ?? null },
        ...me
      ]);
      const pe = (((ke = ce.data) == null ? void 0 : ke.hubTokens) ?? []).map(
        (Ne) => Ne.identifier
      );
      H(new Set(pe));
    }).catch(() => N([Zt])).finally(() => G(!1)));
  }, [l]), ae(() => {
    if (A.length === 0 || T.current) return;
    T.current = !0;
    const $ = w.get("from"), ce = w.get("to"), me = $ ? A.find((pe) => pe.identifier === $) : null, Q = ce ? A.find((pe) => pe.identifier === ce) : null;
    me && K(me), Q && Z(Q), T.current = !0;
  }, [A, I]), ae(() => {
    T.current && k(
      ($) => {
        const ce = new URLSearchParams($);
        return B ? ce.set("from", B.identifier) : ce.delete("from"), C ? ce.set("to", C.identifier) : ce.delete("to"), ce;
      },
      { replace: !0 }
    );
  }, [B, C]);
  const m = $t(async () => {
    var Q, pe, ke, Ne;
    if (r) {
      te(null), ge(null), X(null), D(null);
      return;
    }
    if (!B || !C) {
      te(null), ge(null), X(null), D(null);
      return;
    }
    if (j) {
      te(null), ge(null), je(!0), D(null);
      try {
        const ve = {
          token: B.identifier,
          slippageBps: Math.round(U * 1e4)
        };
        ee && Number(ee) > 0 && (ve.amountIn = new S(ee).shiftedBy(B.decimals).toFixed(0, S.ROUND_DOWN));
        const { data: Ze } = await he.get(`${l}/arb`, {
          params: ve
        });
        X(Ze), (!ee || Number(ee) <= 0) && xe(
          new S(Ze.amountIn).shiftedBy(-B.decimals).toFixed(6, S.ROUND_DOWN)
        );
      } catch {
        X(null);
      } finally {
        je(!1);
      }
      return;
    }
    const $ = R === "in" ? ee : Y;
    if (!$ || Number($) <= 0) {
      te(null), ge(null);
      return;
    }
    const ce = R === "in" ? B : C, me = new S($).shiftedBy(ce.decimals).toFixed(0, S.ROUND_DOWN);
    Ce(!0), ge(null);
    try {
      const { data: ve } = await he.get(`${l}/quote`, {
        params: {
          tokenIn: B.identifier,
          tokenOut: C.identifier,
          ...R === "in" ? { amountIn: me } : { amountOut: me },
          slippageBps: Math.round(U * 1e4)
        }
      });
      te(ve);
    } catch (ve) {
      const Ze = (pe = (Q = ve == null ? void 0 : ve.response) == null ? void 0 : Q.data) == null ? void 0 : pe.code;
      ge(
        Ze === "AMOUNT_TOO_LOW" ? p("error_amount_too_low") : Ze === "NO_ROUTE" ? p("error_no_route") : Ze === "INSUFFICIENT_LIQUIDITY" ? p("error_insufficient_liquidity") : ((Ne = (ke = ve == null ? void 0 : ve.response) == null ? void 0 : ke.data) == null ? void 0 : Ne.message) ?? p("error_quote")
      ), te(null);
    } finally {
      Ce(!1);
    }
  }, [B, C, ee, Y, R, j, r, U]);
  ae(() => (ye.current && clearTimeout(ye.current), ye.current = setTimeout(m, 300), () => {
    ye.current && clearTimeout(ye.current);
  }), [m]);
  const x = () => {
    K(C), Z(B), R === "in" ? (q("out"), ne(ee), xe("")) : (q("in"), xe(Y), ne("")), te(null);
  }, v = async () => {
    if (!(!B || !u) && !(j && !de) && !(!j && !P)) {
      $e(null), qe(!0);
      try {
        const { tx: $ } = j ? de : P;
        if (![e, n].map(
          (Q) => Q.toLowerCase()
        ).includes($.scAddress.toLowerCase())) {
          $e(`Receiver refusé : ${$.scAddress}`);
          return;
        }
        const me = new tt({
          value: BigInt($.egldValue),
          data: new TextEncoder().encode($.txData),
          receiver: new Pe($.scAddress),
          sender: new Pe(u),
          gasLimit: BigInt($.gasLimit),
          gasPrice: BigInt(rt),
          chainID: L.chainId,
          version: 1
        });
        await nt({
          transactions: [me],
          transactionsDisplayInfo: {
            processingMessage: p("processing"),
            errorMessage: p("error_tx"),
            successMessage: p("success_tx")
          }
        }), xe(""), ne(""), q("in"), te(null), X(null);
      } catch ($) {
        $e(($ == null ? void 0 : $.message) ?? "Erreur lors du swap");
      } finally {
        qe(!1);
      }
    }
  }, W = R === "in" ? ee : Y, ue = r ? W ? new S(W).toFixed(6, S.ROUND_DOWN) : "" : R === "out" ? Y : j && de ? new S(de.amountOut).shiftedBy(-((B == null ? void 0 : B.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : P ? new S(P.amountOut).shiftedBy(-((C == null ? void 0 : C.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : "", le = R === "out" && !r && P ? new S(P.amountIn).shiftedBy(-((B == null ? void 0 : B.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : ee, fe = de ? new S(de.profit).shiftedBy(-((B == null ? void 0 : B.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : null, se = P && !r ? new S(_o(P.amountOut, U).toString()).shiftedBy(-((C == null ? void 0 : C.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : null, mt = P ? (parseFloat(P.priceImpact) * 100).toFixed(2) : null, mr = mt ? parseFloat(mt) < 1 ? "text-green-600 dark:text-green-400" : parseFloat(mt) < 3 ? "text-amber-500 dark:text-amber-400" : "text-red-600 dark:text-red-400" : "", xr = r ? !!u && !Ie && !J && !!W && Number(W) > 0 : j ? !!de && !!u && !Ie && !re && !De && !J : !!P && !!u && !Ie && !be && !oe && !J, br = (C == null ? void 0 : C.identifier) === "EGLD", yr = async () => {
    const $ = R === "out" ? Y : ee;
    if (!(!B || !u || !$ || Number($) <= 0)) {
      $e(null), qe(!0);
      try {
        const ce = new Pe(u), me = BigInt(
          new S($).shiftedBy(18).toFixed(0, S.ROUND_DOWN)
        ), Q = new Pe(i);
        let pe, ke, Ne;
        a ? (ke = Q, Ne = me, pe = "wrapEgld") : (ke = ce, Ne = BigInt(0), pe = [
          "MultiESDTNFTTransfer",
          Q.toHex(),
          "01",
          Ae(s),
          "00",
          Ke(me),
          Ae("unwrapEgld")
        ].join("@"));
        const ve = new tt({
          value: Ne,
          data: new TextEncoder().encode(pe),
          receiver: ke,
          sender: ce,
          gasLimit: BigInt(3e6),
          gasPrice: BigInt(rt),
          chainID: L.chainId,
          version: 1
        });
        await nt({
          transactions: [ve],
          transactionsDisplayInfo: {
            processingMessage: p(a ? "processing_wrap" : "processing_unwrap"),
            errorMessage: p(a ? "error_wrap" : "error_unwrap"),
            successMessage: p(a ? "success_wrap" : "success_unwrap")
          }
        }), xe(""), ne(""), q("in");
      } catch (ce) {
        $e((ce == null ? void 0 : ce.message) ?? "Erreur");
      } finally {
        qe(!1);
      }
    }
  };
  return /* @__PURE__ */ g("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ g(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ _("div", { className: "flex flex-col xs:flex-row items-start xs:items-center justify-between w-full gap-4", children: [
        /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ g("span", { className: "text-xl", children: "🔄" }),
          /* @__PURE__ */ g("span", { className: "text-lg font-black tracking-tight", children: "Swap" })
        ] }),
        /* @__PURE__ */ _("div", { style: h.tabBar, className: "flex gap-1.5 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full xs:w-auto", children: [
          /* @__PURE__ */ g("button", { style: h.activeTab, className: "flex-1 xs:flex-initial px-4 sm:px-6 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all", children: p("tab_swap") }),
          /* @__PURE__ */ g(
            "button",
            {
              onClick: () => y(o.liquidity),
              className: "flex-1 xs:flex-initial px-4 sm:px-6 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5",
              children: p("tab_liquidity")
            }
          )
        ] })
      ] }),
      description: p("card_description"),
      children: /* @__PURE__ */ _("div", { className: "space-y-2 mt-4", children: [
        /* @__PURE__ */ _("div", { style: h.inner, className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: p("you_send") }),
              B && /* @__PURE__ */ _(
                "a",
                {
                  href: `${L.explorerAddress}/tokens/${B.identifier}`,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors",
                  children: [
                    B.ticker,
                    " ↗"
                  ]
                }
              )
            ] }),
            be && R === "out" && /* @__PURE__ */ g("span", { className: "text-[10px] text-gray-400 animate-pulse uppercase tracking-wider", children: p("calculating") }),
            u && M && /* @__PURE__ */ _(
              "button",
              {
                onClick: c,
                className: "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-600 transition-colors",
                children: [
                  /* @__PURE__ */ _("span", { className: "text-gray-400", children: [
                    p("balance"),
                    " :"
                  ] }),
                  M,
                  /* @__PURE__ */ g("span", { className: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold", children: "MAX" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ g(
              it,
              {
                value: B,
                onChange: ($) => {
                  K($), te(null);
                },
                tokens: A,
                exclude: void 0,
                loading: I
              }
            ),
            /* @__PURE__ */ g(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: le,
                onChange: ($) => {
                  q("in"), xe($.target.value), ne(""), te(null);
                },
                style: h.input,
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${J ? "border-red-400 dark:border-red-500 focus:ring-red-400" : R === "in" ? "border-amber-400 dark:border-amber-500 focus:ring-amber-500" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] }),
          J && /* @__PURE__ */ g("p", { className: "mt-2 text-[10px] font-semibold text-red-500 text-right", children: p("insufficient_balance") })
        ] }),
        /* @__PURE__ */ g("div", { className: "flex justify-center -my-0.5 relative z-10", children: /* @__PURE__ */ g(
          "button",
          {
            onClick: x,
            style: h.invertBtn,
            className: "rounded-full p-2 bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors",
            children: /* @__PURE__ */ g(Nr, { className: "h-4 w-4 text-amber-500" })
          }
        ) }),
        /* @__PURE__ */ _("div", { style: h.inner, className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: p("you_receive") }),
              C && /* @__PURE__ */ _(
                "a",
                {
                  href: `${L.explorerAddress}/tokens/${C.identifier}`,
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
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              be && R === "in" && /* @__PURE__ */ g("span", { className: "text-[10px] text-gray-400 animate-pulse uppercase tracking-wider", children: p("calculating") }),
              u && Fe && /* @__PURE__ */ _("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: [
                p("balance"),
                " :",
                " ",
                /* @__PURE__ */ g("span", { className: "text-amber-500", children: Fe })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ g(
              it,
              {
                value: C,
                onChange: ($) => {
                  Z($), te(null);
                },
                tokens: A,
                exclude: void 0,
                loading: I
              }
            ),
            /* @__PURE__ */ g(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: ue,
                onChange: ($) => {
                  q("out"), ne($.target.value), xe(""), te(null);
                },
                style: h.input,
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${R === "out" ? "border-amber-400 dark:border-amber-500 focus:ring-amber-500" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] })
        ] }),
        r && !!ee && Number(ee) > 0 && /* @__PURE__ */ g("div", { className: "rounded-2xl border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-900/10 px-4 py-3 text-sm text-cyan-700 dark:text-cyan-400", children: p(a ? "wrap_info" : "unwrap_info") }),
        !r && P && !be && /* @__PURE__ */ _("div", { style: h.quoteSection, className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] px-4 py-3 space-y-2.5 text-sm", children: [
          /* @__PURE__ */ _("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500 dark:text-gray-400", children: p("price_impact") }),
            /* @__PURE__ */ _("span", { className: `font-semibold ${mr}`, children: [
              mt,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500 dark:text-gray-400", children: p("hops") }),
            /* @__PURE__ */ g("span", { className: "font-medium text-gray-900 dark:text-white", children: P.hops })
          ] }),
          /* @__PURE__ */ _("div", { className: "pt-2 border-t border-gray-100 dark:border-[#2a2a2a]", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2", children: p("route") }),
            /* @__PURE__ */ _("div", { className: "flex items-center flex-wrap gap-0", children: [
              /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: (B == null ? void 0 : B.ticker) ?? ((Dt = P.route[0]) == null ? void 0 : Dt.tokenIn) }),
              Me && /* @__PURE__ */ _(Le.Fragment, { children: [
                /* @__PURE__ */ _("div", { className: "flex flex-col items-center mx-1", children: [
                  /* @__PURE__ */ g("span", { className: "text-[9px] font-bold text-gray-400", children: "wrap" }),
                  /* @__PURE__ */ _("div", { className: "flex items-center gap-0.5", children: [
                    /* @__PURE__ */ g("div", { className: "h-px w-4 bg-gray-300 dark:bg-gray-600" }),
                    /* @__PURE__ */ g("span", { className: "text-[10px] leading-none text-gray-400", children: "▶" })
                  ] })
                ] }),
                /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: "WEGLD" })
              ] }),
              P.route.map(($, ce) => {
                var Ne;
                const me = ((Ne = A.find((ve) => ve.identifier === $.tokenOut)) == null ? void 0 : Ne.ticker) ?? $.tokenOut, pe = ($.priceImpact ? parseFloat($.priceImpact) * 100 : 0) >= 5, ke = $.dexType === "XExchange" ? {
                  line: "bg-blue-400 dark:bg-blue-500",
                  label: "text-blue-600 dark:text-blue-400",
                  name: "XExchange"
                } : $.dexType === "JExchange" ? {
                  line: "bg-green-400 dark:bg-green-500",
                  label: "text-green-600 dark:text-green-400",
                  name: "JExchange"
                } : {
                  line: "bg-amber-400 dark:bg-amber-500",
                  label: "text-amber-600 dark:text-amber-400",
                  name: "DinoVox"
                };
                return /* @__PURE__ */ _(Le.Fragment, { children: [
                  /* @__PURE__ */ _("div", { className: "flex flex-col items-center mx-1", children: [
                    /* @__PURE__ */ _(
                      "a",
                      {
                        href: `${L.explorerAddress}/accounts/${$.pair}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: `text-[9px] font-bold hover:underline ${pe ? "text-red-500" : ke.label}`,
                        title: $.pair,
                        children: [
                          ke.name,
                          " ↗"
                        ]
                      }
                    ),
                    /* @__PURE__ */ _("div", { className: "flex items-center gap-0.5", children: [
                      /* @__PURE__ */ g(
                        "div",
                        {
                          className: `h-px w-4 ${pe ? "bg-red-500" : ke.line}`
                        }
                      ),
                      /* @__PURE__ */ g(
                        "span",
                        {
                          className: `text-[10px] leading-none ${pe ? "text-red-500" : ke.label}`,
                          children: pe ? "⚠" : "▶"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: me })
                ] }, ce);
              }),
              br && /* @__PURE__ */ _(Le.Fragment, { children: [
                /* @__PURE__ */ _("div", { className: "flex flex-col items-center mx-1", children: [
                  /* @__PURE__ */ g("span", { className: "text-[9px] font-bold text-gray-400", children: "unwrap" }),
                  /* @__PURE__ */ _("div", { className: "flex items-center gap-0.5", children: [
                    /* @__PURE__ */ g("div", { className: "h-px w-4 bg-gray-300 dark:bg-gray-600" }),
                    /* @__PURE__ */ g("span", { className: "text-[10px] leading-none text-gray-400", children: "▶" })
                  ] })
                ] }),
                /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: "EGLD" })
              ] })
            ] }),
            (() => {
              const $ = P.route.filter(
                (Q) => Q.priceImpact && parseFloat(Q.priceImpact) * 100 >= 5
              );
              if ($.length === 0) return null;
              const ce = $.some(
                (Q) => Q.dexType === "DinoVox" || !Q.dexType
              ), me = $.find(
                (Q) => Q.dexType === "DinoVox" || !Q.dexType
              );
              return /* @__PURE__ */ _("div", { className: "mt-2 flex flex-col gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-3 py-2 text-xs text-red-600 dark:text-red-400", children: [
                /* @__PURE__ */ _("div", { className: "flex items-start gap-2", children: [
                  /* @__PURE__ */ g("span", { className: "mt-0.5 shrink-0", children: "⚠" }),
                  /* @__PURE__ */ g("span", { children: p("high_impact_warning") })
                ] }),
                ce && me && (() => {
                  const Q = me.tokenIn, pe = me.tokenOut, [ke, Ne] = E.has(pe) && !E.has(Q) ? [pe, Q] : [Q, pe];
                  return /* @__PURE__ */ g(
                    "button",
                    {
                      onClick: () => y(
                        `${o.addLiquidity}?tokenA=${ke}&tokenB=${Ne}`
                      ),
                      className: "self-start underline font-semibold hover:text-red-700 dark:hover:text-red-300 transition",
                      children: p("add_liquidity_cta")
                    }
                  );
                })()
              ] });
            })()
          ] }),
          /* @__PURE__ */ _("div", { className: "pt-2 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500 dark:text-gray-400", children: p("slippage") }),
            /* @__PURE__ */ g("div", { className: "flex gap-1", children: Xt.map(($) => /* @__PURE__ */ _(
              "button",
              {
                onClick: () => ie($),
                className: `px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${U === $ ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"}`,
                children: [
                  ($ * 100).toFixed(1),
                  "%"
                ]
              },
              $
            )) })
          ] }),
          /* @__PURE__ */ _("div", { className: "pt-2 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500 dark:text-gray-400", children: p("min_received") }),
            /* @__PURE__ */ _("span", { className: "font-semibold text-gray-900 dark:text-white", children: [
              se,
              " ",
              /* @__PURE__ */ g("span", { className: "text-gray-400 text-xs", children: C == null ? void 0 : C.ticker })
            ] })
          ] })
        ] }),
        j && de && !re && /* @__PURE__ */ _("div", { className: "rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10 px-4 py-3 space-y-2.5 text-sm", children: [
          /* @__PURE__ */ _("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ g("span", { className: "text-green-700 dark:text-green-400 font-semibold", children: p("arb_profit") }),
            /* @__PURE__ */ _("span", { className: "font-bold text-green-600 dark:text-green-400", children: [
              "+",
              fe,
              " ",
              B == null ? void 0 : B.ticker,
              " (",
              (de.profitBps / 100).toFixed(2),
              "%)"
            ] })
          ] }),
          de.route && de.route.length > 0 && /* @__PURE__ */ _("div", { className: "pt-2 border-t border-green-200 dark:border-green-800/50", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] uppercase tracking-wider font-semibold text-green-700/60 dark:text-green-400/60 mb-2", children: p("route") }),
            /* @__PURE__ */ _("div", { className: "flex items-center flex-wrap gap-0", children: [
              /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200", children: B == null ? void 0 : B.ticker }),
              de.route.map(($, ce) => {
                var pe;
                const me = ((pe = A.find((ke) => ke.identifier === $.tokenOut)) == null ? void 0 : pe.ticker) ?? $.tokenOut.split("-")[0], Q = $.dexType === "XExchange" ? {
                  line: "bg-blue-400",
                  label: "text-blue-600 dark:text-blue-400",
                  name: "XExchange"
                } : $.dexType === "JExchange" ? {
                  line: "bg-purple-400",
                  label: "text-purple-600 dark:text-purple-400",
                  name: "JExchange"
                } : {
                  line: "bg-green-400",
                  label: "text-green-600 dark:text-green-400",
                  name: "DinoVox"
                };
                return /* @__PURE__ */ _(Le.Fragment, { children: [
                  /* @__PURE__ */ _("div", { className: "flex flex-col items-center mx-1", children: [
                    /* @__PURE__ */ _(
                      "a",
                      {
                        href: `${L.explorerAddress}/accounts/${$.pair}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: `text-[9px] font-bold hover:underline ${Q.label}`,
                        title: $.pair,
                        children: [
                          Q.name,
                          " ↗"
                        ]
                      }
                    ),
                    /* @__PURE__ */ _("div", { className: "flex items-center gap-0.5", children: [
                      /* @__PURE__ */ g("div", { className: `h-px w-4 ${Q.line}` }),
                      /* @__PURE__ */ g(
                        "span",
                        {
                          className: `text-[10px] leading-none ${Q.label}`,
                          children: "▶"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200", children: me })
                ] }, ce);
              })
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "pt-2 border-t border-green-200 dark:border-green-800/50 flex items-center justify-between", children: [
            /* @__PURE__ */ g("span", { className: "text-green-700/70 dark:text-green-400/70", children: p("slippage") }),
            /* @__PURE__ */ g("div", { className: "flex gap-1", children: Xt.map(($) => /* @__PURE__ */ _(
              "button",
              {
                onClick: () => ie($),
                className: `px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${U === $ ? "bg-green-500 text-white" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"}`,
                children: [
                  ($ * 100).toFixed(1),
                  "%"
                ]
              },
              $
            )) })
          ] })
        ] }),
        j && re && /* @__PURE__ */ g("div", { className: "text-center text-xs text-gray-400 animate-pulse py-2", children: p("calculating") }),
        (!r && !j && oe || j && De || He) && /* @__PURE__ */ g("div", { className: "rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-4 py-3 text-sm text-red-600 dark:text-red-400", children: j ? De : oe ?? He }),
        /* @__PURE__ */ g(
          "button",
          {
            onClick: u ? r ? yr : v : f,
            disabled: u ? !xr : !f,
            style: d === "mid" ? { background: "linear-gradient(135deg, #BD37EC, #1F67FF)", border: "none" } : {},
            className: `dinoButton orange w-full !py-3 text-base ${!B || !C ? "!bg-orange-400 dark:!bg-orange-500 !border-orange-600 dark:!border-orange-700 !text-orange-950 dark:!text-orange-950 font-bold !opacity-100 hover:!bg-orange-500 hover:!border-orange-700 dark:hover:!bg-orange-400" : "disabled:opacity-40 disabled:cursor-not-allowed"}`,
            children: u ? Ie ? p("btn_signing") : !B || !C ? p("btn_select_tokens") : J ? p("btn_insufficient") : j ? p(re ? "btn_calculating" : De ? "btn_quote_unavailable" : "btn_arb") : !ee || Number(ee) <= 0 ? p("btn_enter_amount") : p(be ? "btn_calculating" : r ? a ? "btn_wrap" : "btn_unwrap" : oe ? "btn_quote_unavailable" : "btn_swap") : p("btn_connect")
          }
        )
      ] })
    }
  ) });
}, No = () => {
  const { apiUrl: l, routes: e } = Ge(), { t: n } = Je("swap");
  ht("swap");
  const i = st(), { address: s } = pt(), { network: o } = Xe(), [d, f] = Le.useState([]), [h, p] = Le.useState(!0), [u, b] = Le.useState([]);
  Le.useEffect(() => {
    l && (p(!0), he.get(`${l}/pools`).then((w) => {
      f(w.data.pools || []);
    }).catch(console.error).finally(() => p(!1)));
  }, [l]);
  const L = Ye(void 0, { enabled: !!s });
  return Le.useEffect(() => {
    if (!L || L.length === 0 || d.length === 0 || !(o != null && o.apiAddress)) {
      b([]);
      return;
    }
    const w = d.flatMap((k) => {
      const y = L.find((A) => A.identifier === k.lpToken);
      return y && new S(y.balance).gt(0) ? [{ pool: k, balance: y.balance }] : [];
    });
    if (w.length === 0) {
      b([]);
      return;
    }
    Promise.all(
      w.map(async ({ pool: k, balance: y }) => {
        var H, I, G;
        const [A, N, E] = await Promise.all([
          he.get(`/tokens/${k.lpToken}`, { baseURL: o.apiAddress }),
          he.get(`/tokens/${k.tokenA}`, { baseURL: o.apiAddress }).catch(() => null),
          he.get(`/tokens/${k.tokenB}`, { baseURL: o.apiAddress }).catch(() => null)
        ]);
        return { pool: k, balance: y, lpTotalSupply: ((H = A.data) == null ? void 0 : H.minted) ?? "1", decimalsA: ((I = N == null ? void 0 : N.data) == null ? void 0 : I.decimals) ?? 18, decimalsB: ((G = E == null ? void 0 : E.data) == null ? void 0 : G.decimals) ?? 18 };
      })
    ).then(b).catch(console.error);
  }, [L, d, o == null ? void 0 : o.apiAddress]), /* @__PURE__ */ g("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ g(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ _("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4", children: [
        /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ g("span", { className: "text-xl", children: "💧" }),
          /* @__PURE__ */ g("span", { className: "text-lg font-black tracking-tight", children: n("liquidity_title") })
        ] }),
        /* @__PURE__ */ _("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full sm:w-auto", children: [
          /* @__PURE__ */ g("button", { onClick: () => i(e.swap), className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5", children: "Swap" }),
          /* @__PURE__ */ g("button", { className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all", children: n("tab_liquidity") }),
          /* @__PURE__ */ g("button", { onClick: () => i(e.pools), className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5", children: "Pools" })
        ] })
      ] }),
      description: n("liquidity_card_desc"),
      children: /* @__PURE__ */ g("div", { className: "space-y-4 mt-4", children: !h && u.length === 0 ? /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-6 text-center", children: [
        /* @__PURE__ */ g("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-4", children: n("liquidity_empty") }),
        /* @__PURE__ */ g("button", { onClick: () => i(e.addLiquidity), className: "dinoButton w-full !py-3 text-base", children: n("liquidity_add") })
      ] }) : /* @__PURE__ */ _("div", { className: "space-y-4", children: [
        u.map((w) => {
          const k = w.pool.lpToken.split("-")[0], y = new S(w.balance).shiftedBy(-18).toFixed(6, S.ROUND_DOWN), A = new S(w.lpTotalSupply), N = A.isZero() ? new S(1) : A, E = new S(w.balance).multipliedBy(w.pool.reserveA).dividedBy(N).shiftedBy(-w.decimalsA).toFixed(6, S.ROUND_DOWN), H = new S(w.balance).multipliedBy(w.pool.reserveB).dividedBy(N).shiftedBy(-w.decimalsB).toFixed(6, S.ROUND_DOWN);
          return /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#2a2a2a] p-4", children: [
            /* @__PURE__ */ _("div", { className: "flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 mb-3", children: [
              /* @__PURE__ */ _("div", { className: "min-w-0", children: [
                /* @__PURE__ */ _("div", { className: "flex items-center gap-2 mb-0.5", children: [
                  /* @__PURE__ */ g("span", { className: "font-bold text-gray-900 dark:text-white uppercase truncate", children: k }),
                  /* @__PURE__ */ g("span", { className: "text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-800 flex-shrink-0", children: "LP" })
                ] }),
                /* @__PURE__ */ _("p", { className: "text-xs text-gray-500 font-medium truncate", children: [
                  w.pool.tokenA.split("-")[0],
                  " / ",
                  w.pool.tokenB.split("-")[0]
                ] })
              ] }),
              /* @__PURE__ */ _("div", { className: "xs:text-right w-full xs:w-auto", children: [
                /* @__PURE__ */ _("p", { className: "font-bold text-gray-900 dark:text-white mb-1", children: [
                  y,
                  " LP"
                ] }),
                /* @__PURE__ */ _("div", { className: "flex gap-3 xs:justify-end", children: [
                  /* @__PURE__ */ g("button", { onClick: () => i(`${e.addLiquidity}?tokenA=${w.pool.tokenA}&tokenB=${w.pool.tokenB}`), className: "text-xs font-bold text-green-500 hover:text-green-600 transition underline decoration-dashed", children: n("liquidity_add_btn") }),
                  /* @__PURE__ */ g("button", { onClick: () => i(`${e.removeLiquidity}?pool=${w.pool.address}`), className: "text-xs font-bold text-red-500 hover:text-red-600 transition underline decoration-dashed", children: n("liquidity_remove_btn") })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ _("div", { className: "grid grid-cols-2 gap-2", children: [
              /* @__PURE__ */ _("div", { className: "rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#333] px-3 py-2 text-xs", children: [
                /* @__PURE__ */ _("p", { className: "text-gray-400 mb-0.5", children: [
                  "≈ ",
                  w.pool.tokenA.split("-")[0]
                ] }),
                /* @__PURE__ */ g("p", { className: "font-bold text-gray-900 dark:text-white", children: E })
              ] }),
              /* @__PURE__ */ _("div", { className: "rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#333] px-3 py-2 text-xs", children: [
                /* @__PURE__ */ _("p", { className: "text-gray-400 mb-0.5", children: [
                  "≈ ",
                  w.pool.tokenB.split("-")[0]
                ] }),
                /* @__PURE__ */ g("p", { className: "font-bold text-gray-900 dark:text-white", children: H })
              ] })
            ] })
          ] }, w.pool.address);
        }),
        /* @__PURE__ */ g("button", { onClick: () => i(e.addLiquidity), className: "dinoButton w-full !py-3 text-base", children: n("liquidity_add") })
      ] }) })
    }
  ) });
};
function vo(l) {
  if (l < 2n) return l;
  let e = l, n = (e + 1n) / 2n;
  for (; n < e; )
    e = n, n = (e + l / e) / 2n;
  return e;
}
const Lo = () => {
  var Oe, Ue;
  const { apiUrl: l, routes: e, onConnect: n } = Ge(), { t: i } = Je("swap");
  ht("swap");
  const { address: s } = pt(), { network: o } = Xe(), d = st(), [f, h] = Nt(), [p, u] = F([]), [b, L] = F([]), [w, k] = F(!0), [y, A] = F(null), [N, E] = F(null), H = (M) => {
    A(M), h((z) => {
      const V = new URLSearchParams(z);
      return M ? V.set("tokenA", M.identifier) : V.delete("tokenA"), V;
    }, { replace: !0 });
  }, I = (M) => {
    E(M), h((z) => {
      const V = new URLSearchParams(z);
      return M ? V.set("tokenB", M.identifier) : V.delete("tokenB"), V;
    }, { replace: !0 });
  }, [G, B] = F(""), [K, C] = F(""), Z = ut("A"), [T, ee] = F(null), [xe, Y] = F(!1), [ne, R] = F(null), [q, P] = F(null), [te, be] = F(0n), [Ce, oe] = F(0n), [ge, de] = F(/* @__PURE__ */ new Set()), X = Ye(void 0, { enabled: !!s }), [re, je] = F([]), De = Le.useMemo(() => {
    const M = re.length > 0 ? re : [];
    return N && !M.some((z) => z.identifier === N.identifier) ? [N, ...M] : M;
  }, [re, N]);
  ae(() => {
    if (!X || X.length === 0) {
      je([]);
      return;
    }
    const M = X.filter((z) => !ge.has(z.identifier)).map((z) => {
      var V, J;
      return {
        identifier: z.identifier,
        ticker: z.ticker || z.identifier.split("-")[0],
        poolCount: 0,
        decimals: z.decimals ?? 18,
        logoUrl: ((V = z.assets) == null ? void 0 : V.svgUrl) ?? ((J = z.assets) == null ? void 0 : J.pngUrl) ?? null
      };
    });
    je(M);
  }, [X, ge]);
  const D = Ye((y == null ? void 0 : y.identifier) ?? void 0, { enabled: !!y && !!s }), j = Ye((N == null ? void 0 : N.identifier) ?? void 0, { enabled: !!N && !!s }), U = ((Oe = D == null ? void 0 : D[0]) == null ? void 0 : Oe.balance) ?? "0", ie = ((Ue = j == null ? void 0 : j[0]) == null ? void 0 : Ue.balance) ?? "0", Ie = y && U ? new S(U).shiftedBy(-y.decimals).toFixed(6, S.ROUND_DOWN) : "0", qe = N && ie ? new S(ie).shiftedBy(-N.decimals).toFixed(6, S.ROUND_DOWN) : "0";
  ae(() => {
    if (!l) return;
    k(!0), (async () => {
      var z;
      try {
        const [V, J, we] = await Promise.all([
          he.get(`${l}/tokens`),
          he.get(`${l}/tokens/hub`).catch(() => ({ data: [] })),
          he.get(`${l}/pools`).catch(() => ({ data: { pools: [] } }))
        ]), Te = (we.data.pools || []).map((c) => c.lpToken).filter(Boolean);
        de(new Set(Te));
        const _e = V.data.tokens || [], Fe = ((z = J.data) == null ? void 0 : z.hubTokens) || [], a = Fe.map((c) => c.identifier), t = [..._e];
        for (const c of Fe) t.find((m) => m.identifier === c.identifier) || t.push({ ...c, poolCount: 0 });
        const r = t.map((c) => ({ identifier: c.identifier, ticker: c.ticker || c.identifier.split("-")[0], poolCount: c.poolCount ?? 0, decimals: c.decimals ?? 18, logoUrl: c.logoUrl ?? null }));
        u(r), L(r.filter((c) => a.includes(c.identifier)));
      } catch (V) {
        console.error(V);
      } finally {
        k(!1);
      }
    })();
  }, [l]), ae(() => {
    if (p.length === 0) return;
    const M = f.get("tokenA"), z = f.get("tokenB");
    M && !y && A(p.find((V) => V.identifier === M) || null), z && !N && E(p.find((V) => V.identifier === z) || null);
  }, [p]), ae(() => {
    if (!y || !N) {
      ee(null), R(null);
      return;
    }
    Y(!0), he.get(`${l}/pools`).then(async (M) => {
      var J;
      const V = (M.data.pools || []).find((we) => we.tokenA === y.identifier && we.tokenB === N.identifier || we.tokenA === N.identifier && we.tokenB === y.identifier);
      if (ee(V || null), V != null && V.lpToken && (o != null && o.apiAddress))
        try {
          const we = await he.get(`/tokens/${V.lpToken}`, { baseURL: o.apiAddress });
          R(((J = we.data) == null ? void 0 : J.minted) ?? null);
        } catch {
          R(null);
        }
      else R(null);
    }).catch(console.error).finally(() => Y(!1));
  }, [y, N]);
  const He = (M) => {
    if (B(M), Z.current = "A", !T || !y || !N || !M) return;
    const z = T.tokenA === y.identifier, V = new S(z ? T.reserveA : T.reserveB), J = new S(z ? T.reserveB : T.reserveA);
    V.isZero() || J.isZero() || C(new S(M).shiftedBy(y.decimals).multipliedBy(J).dividedBy(V).shiftedBy(-N.decimals).toFixed(6, S.ROUND_UP));
  }, $e = (M) => {
    if (C(M), Z.current = "B", !T || !y || !N || !M) return;
    const z = T.tokenA === y.identifier, V = new S(z ? T.reserveA : T.reserveB), J = new S(z ? T.reserveB : T.reserveA);
    V.isZero() || J.isZero() || B(new S(M).shiftedBy(N.decimals).multipliedBy(V).dividedBy(J).shiftedBy(-y.decimals).toFixed(6, S.ROUND_UP));
  };
  ae(() => {
    if (!y || !N || !G || !K || Number(G) <= 0 || Number(K) <= 0) {
      P(null), be(0n), oe(0n);
      return;
    }
    const M = BigInt(new S(G).shiftedBy(y.decimals).toFixed(0)), z = BigInt(new S(K).shiftedBy(N.decimals).toFixed(0)), V = T ? new S(T.reserveA) : new S(0), J = T ? new S(T.reserveB) : new S(0);
    if (!(T && V.gt(0) && J.gt(0))) {
      P(vo(M * z)), be(0n), oe(0n);
      return;
    }
    const Te = T.tokenA === y.identifier, _e = Te ? M : z, Fe = Te ? z : M, a = BigInt(V.toFixed(0)), t = BigInt(J.toFixed(0)), r = BigInt(new S(ne ?? "0").isZero() ? "1" : new S(ne).toFixed(0)), c = a > 0n ? _e * r / a : 0n, m = t > 0n ? Fe * r / t : 0n;
    if (c <= m) {
      P(c);
      const x = a > 0n ? _e * t / a : 0n;
      be(0n), oe(Te ? Fe - x : _e - x);
    } else {
      P(m);
      const x = t > 0n ? Fe * a / t : 0n;
      be(Te ? _e - x : Fe - x), oe(0n);
    }
  }, [G, K, T, y, N, ne]);
  const ye = async () => {
    if (!(!T || !y || !N || !s || !G || !K))
      try {
        const M = BigInt(new S(G).shiftedBy(y.decimals).toFixed(0)), z = BigInt(new S(K).shiftedBy(N.decimals).toFixed(0)), V = new Pe(s), J = ["MultiESDTNFTTransfer", new Pe(T.address).toHex(), "02", Ae(y.identifier), "00", Ke(M), Ae(N.identifier), "00", Ke(z), Ae("addLiquidity"), Ke(0n), Ke(0n)], we = new tt({ value: 0n, data: new TextEncoder().encode(J.join("@")), receiver: V, sender: V, gasLimit: 15000000n, gasPrice: BigInt(rt), chainID: o.chainId, version: 1 });
        await nt({ transactions: [we], transactionsDisplayInfo: { processingMessage: i("add_processing"), errorMessage: i("add_error"), successMessage: i("add_success") } }), B(""), C("");
      } catch (M) {
        console.error(M);
      }
  }, Se = !!(G && new S(G).shiftedBy((y == null ? void 0 : y.decimals) ?? 18).isGreaterThan(U)), Be = !!(K && new S(K).shiftedBy((N == null ? void 0 : N.decimals) ?? 18).isGreaterThan(ie)), Me = !!(T && new S(T.reserveA).gt(0) && new S(T.reserveB).gt(0));
  return /* @__PURE__ */ g("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ g(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ g("div", { className: "flex flex-col xs:flex-row items-start xs:items-center gap-3 w-full", children: /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ g("button", { onClick: () => d(e.liquidity), className: "p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition flex-shrink-0", children: /* @__PURE__ */ g(It, { className: "w-4 h-4 text-gray-600 dark:text-gray-300" }) }),
        /* @__PURE__ */ g("span", { className: "text-xl", children: "➕" }),
        /* @__PURE__ */ g("span", { className: "text-lg font-black tracking-tight whitespace-nowrap", children: i("add_card_title") })
      ] }) }),
      description: i("add_card_desc"),
      children: /* @__PURE__ */ _("div", { className: "space-y-2 mt-4", children: [
        /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: i("add_token1") }),
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ _("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-500", children: [
                i("balance"),
                ": ",
                /* @__PURE__ */ g("span", { className: "text-amber-500", children: Ie })
              ] }),
              y && U !== "0" && /* @__PURE__ */ g("button", { onClick: () => He(new S(U).shiftedBy(-y.decimals).toFixed(y.decimals, S.ROUND_DOWN)), className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition", children: "MAX" })
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ g(it, { value: y, onChange: H, tokens: b, exclude: N == null ? void 0 : N.identifier, loading: w }),
            /* @__PURE__ */ g(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: G,
                onChange: (M) => He(M.target.value),
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${Se ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ g("div", { className: "flex justify-center -my-3 relative z-10", children: /* @__PURE__ */ g("div", { className: "rounded-full p-1.5 bg-[#ffffff] dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]", children: /* @__PURE__ */ g(vr, { className: "w-4 h-4 text-amber-500" }) }) }),
        /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: i("add_token2") }),
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ _("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-500", children: [
                i("balance"),
                ": ",
                /* @__PURE__ */ g("span", { className: "text-amber-500", children: qe })
              ] }),
              N && ie !== "0" && /* @__PURE__ */ g("button", { onClick: () => $e(new S(ie).shiftedBy(-N.decimals).toFixed(N.decimals, S.ROUND_DOWN)), className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition", children: "MAX" })
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ g(it, { value: N, onChange: I, tokens: De, exclude: y == null ? void 0 : y.identifier, loading: w || X.length > 0 && re.length === 0 }),
            /* @__PURE__ */ g(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: K,
                onChange: (M) => $e(M.target.value),
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${Be ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] })
        ] }),
        xe && /* @__PURE__ */ g("p", { className: "text-center text-xs text-gray-500 mt-4 animate-pulse", children: i("add_pool_searching") }),
        !xe && y && N && !T && /* @__PURE__ */ _("div", { className: "rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 mt-4", children: [
          /* @__PURE__ */ g("p", { className: "text-sm font-semibold text-amber-600 dark:text-amber-400", children: i("add_no_pool_title") }),
          /* @__PURE__ */ g("p", { className: "text-xs text-amber-500 mt-1", children: i("add_no_pool_desc") }),
          /* @__PURE__ */ g("button", { onClick: () => d(`${e.createPool}?tokenX=${(y == null ? void 0 : y.identifier) ?? ""}&tokenY=${(N == null ? void 0 : N.identifier) ?? ""}`), className: "mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition", children: i("add_no_pool_btn") })
        ] }),
        T && q !== null && /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] p-4 mt-4 space-y-2", children: [
          /* @__PURE__ */ _("div", { className: "flex justify-between text-sm", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500", children: i("add_lp_preview") }),
            /* @__PURE__ */ _("span", { className: "font-bold text-amber-500", children: [
              new S(q.toString()).shiftedBy(-18).toFixed(6),
              " LP"
            ] })
          ] }),
          te > 0n && /* @__PURE__ */ _("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500", children: i("add_refund", { ticker: y == null ? void 0 : y.ticker }) }),
            /* @__PURE__ */ g("span", { className: "font-medium text-gray-700 dark:text-gray-300", children: new S(te.toString()).shiftedBy(-((y == null ? void 0 : y.decimals) ?? 18)).toFixed(6) })
          ] }),
          Ce > 0n && /* @__PURE__ */ _("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500", children: i("add_refund", { ticker: N == null ? void 0 : N.ticker }) }),
            /* @__PURE__ */ g("span", { className: "font-medium text-gray-700 dark:text-gray-300", children: new S(Ce.toString()).shiftedBy(-((N == null ? void 0 : N.decimals) ?? 18)).toFixed(6) })
          ] }),
          q < 1000n && !Me && /* @__PURE__ */ g("p", { className: "text-xs text-red-500 mt-2", children: i("add_min_deposit") })
        ] }),
        /* @__PURE__ */ g(
          "button",
          {
            onClick: s ? ye : n,
            disabled: s ? !T || !T.isActive || Se || Be || !G || !K || q !== null && q < 1000n && !Me : !n,
            className: "dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed",
            children: s ? T ? T.isActive ? Se || Be ? i("add_btn_insufficient") : !G || !K ? i("add_btn_enter_amount") : q !== null && q < 1000n && !Me ? i("add_btn_min") : i("add_btn_submit") : i("add_btn_inactive") : i("add_btn_no_pool") : i("add_btn_connect")
          }
        )
      ] })
    }
  ) });
}, So = (l) => {
  const { network: e } = Xe(), [n, i] = F({});
  return ae(() => {
    if (!l || l === "EGLD") return;
    const s = l === "EGLD" ? "EGLD-000000" : l, o = `esdt_${s}`, d = localStorage.getItem(o), f = Number(localStorage.getItem(`${o}_expire`));
    if (d && Date.now() < f) {
      i(JSON.parse(d));
      return;
    }
    he.get(`/tokens/${s}`, { baseURL: e.apiAddress }).then(({ data: h }) => {
      i(h), localStorage.setItem(o, JSON.stringify(h)), localStorage.setItem(`${o}_expire`, String(Date.now() + 36e5));
    }).catch(() => i({}));
  }, [l, e.apiAddress]), n;
}, Ct = ({
  amount: l,
  identifier: e,
  decimals: n,
  displayDecimals: i,
  showIdentifier: s = !0,
  nonce: o
}) => {
  const d = So(o && o > 0 ? "" : e), f = e === "EGLD" ? "EGLD" : (d == null ? void 0 : d.ticker) || e, h = n !== void 0 ? n : e === "EGLD" ? 18 : (d == null ? void 0 : d.decimals) || 0;
  if (l == null || isNaN(Number(l))) return /* @__PURE__ */ g(dt, { children: `0 ${f}` });
  const u = new S(l).div(new S(10).pow(h));
  let b;
  if (i !== void 0)
    b = u.toFixed(i, S.ROUND_DOWN);
  else {
    let L = h < 2 ? h : 2;
    if (u.gt(0) && u.lt(0.01)) {
      const w = Math.floor(Math.log10(u.toNumber()));
      L = Math.min(-w - 1 + 2, h);
    }
    b = u.toNumber().toLocaleString(void 0, { minimumFractionDigits: L, maximumFractionDigits: L });
  }
  return /* @__PURE__ */ g(dt, { children: `${b}${s ? " " + f : ""}${s && o && o > 0 ? `-${Ke(BigInt(o))}` : ""}` });
}, Bo = () => {
  var ne;
  const { apiUrl: l, routes: e, onConnect: n } = Ge(), { t: i } = Je(), { address: s } = pt(), { network: o } = Xe(), d = st(), [f, h] = F([]), [p, u] = F({}), [b, L] = F(""), [w, k] = F(!0), [y, A] = F(null), [N, E] = F(""), [H] = Nt();
  ae(() => {
    l && he.get(`${l}/tokens`).then((R) => {
      const q = {};
      for (const P of R.data.tokens || [])
        q[P.identifier] = { identifier: P.identifier, ticker: P.ticker || P.identifier.split("-")[0], decimals: P.decimals ?? 18 };
      u(q);
    }).catch(console.error);
  }, [l]), ae(() => {
    l && (k(!0), he.get(`${l}/pools`).then((R) => {
      const q = (R.data.pools || []).filter((te) => te.isActive);
      h(q);
      const P = H.get("pool");
      P && q.some((te) => te.address === P) && L(P);
    }).catch(console.error).finally(() => k(!1)));
  }, [l, H]);
  const I = f.find((R) => R.address === b);
  ae(() => {
    if (!(I != null && I.lpToken) || !(o != null && o.apiAddress)) {
      A(null);
      return;
    }
    he.get(`/tokens/${I.lpToken}`, { baseURL: o.apiAddress }).then((R) => {
      var q;
      return A(((q = R.data) == null ? void 0 : q.minted) ?? null);
    }).catch(() => A(null));
  }, [I == null ? void 0 : I.lpToken, o == null ? void 0 : o.apiAddress]);
  const G = Ye((I == null ? void 0 : I.lpToken) ?? void 0, { enabled: !!I && !!s }), B = ((ne = G == null ? void 0 : G[0]) == null ? void 0 : ne.balance) ?? "0";
  new S(B).shiftedBy(-18).toFixed(6, S.ROUND_DOWN);
  const K = () => {
    !B || B === "0" || E(new S(B).shiftedBy(-18).toFixed(18, S.ROUND_DOWN).replace(/\.?0+$/, ""));
  }, C = y ?? (I == null ? void 0 : I.lpSupply) ?? "0", Z = new S(C).isZero() ? new S(1) : new S(C), T = I && N ? BigInt(new S(N).shiftedBy(18).multipliedBy(I.reserveA).dividedBy(Z).toFixed(0, S.ROUND_DOWN)) : 0n, ee = I && N ? BigInt(new S(N).shiftedBy(18).multipliedBy(I.reserveB).dividedBy(Z).toFixed(0, S.ROUND_DOWN)) : 0n, xe = async () => {
    if (!(!I || !s || !N))
      try {
        const R = BigInt(new S(N).shiftedBy(18).toFixed(0)), q = ["ESDTTransfer", Ae(I.lpToken), Ke(R), Ae("removeLiquidity"), Ke(0n), Ke(0n)], P = new tt({
          value: 0n,
          data: new TextEncoder().encode(q.join("@")),
          receiver: new Pe(I.address),
          sender: new Pe(s),
          gasLimit: 12000000n,
          gasPrice: BigInt(rt),
          chainID: o.chainId,
          version: 1
        });
        await nt({ transactions: [P], transactionsDisplayInfo: { processingMessage: "Retrait en cours...", errorMessage: "Le retrait a échoué", successMessage: "Liquidité retirée !" } }), E("");
      } catch (R) {
        console.error(R);
      }
  }, Y = !!(N && new S(N).shiftedBy(18).isGreaterThan(B));
  return /* @__PURE__ */ g("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ g(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ _("div", { className: "flex items-center gap-3 w-full", children: [
        /* @__PURE__ */ g("button", { onClick: () => d(e.liquidity), className: "p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition flex-shrink-0", children: /* @__PURE__ */ g(It, { className: "w-4 h-4 text-gray-600 dark:text-gray-300" }) }),
        /* @__PURE__ */ g("span", { className: "text-xl", children: "🔓" }),
        /* @__PURE__ */ g("span", { className: "text-lg font-black tracking-tight", children: "Retirer Liquidité" })
      ] }),
      description: "Retirez vos LP tokens pour récupérer vos actifs",
      children: /* @__PURE__ */ _("div", { className: "space-y-4 mt-4", children: [
        /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2", children: "Sélectionner une Pool" }),
          /* @__PURE__ */ _(
            "select",
            {
              className: "w-full rounded-xl border border-gray-200 dark:border-[#444] bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500",
              value: b,
              onChange: (R) => L(R.target.value),
              disabled: w,
              children: [
                /* @__PURE__ */ g("option", { value: "", children: w ? "Chargement..." : "Choisir une pool" }),
                f.map((R) => {
                  var q, P;
                  return /* @__PURE__ */ _("option", { value: R.address, children: [
                    ((q = p[R.tokenA]) == null ? void 0 : q.ticker) || R.tokenA,
                    " - ",
                    ((P = p[R.tokenB]) == null ? void 0 : P.ticker) || R.tokenB
                  ] }, R.address);
                })
              ]
            }
          )
        ] }),
        I && /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: "Montant LP à retirer" }),
            /* @__PURE__ */ _("button", { onClick: K, className: "text-[10px] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-600 flex items-center gap-1", children: [
              "MAX (",
              /* @__PURE__ */ g(Ct, { amount: new S(B.toString()).toFixed(0, S.ROUND_DOWN), identifier: I.lpToken }),
              ")"
            ] })
          ] }),
          /* @__PURE__ */ g(
            "input",
            {
              type: "number",
              min: "0",
              placeholder: "0.0",
              value: N,
              onChange: (R) => E(R.target.value),
              className: `w-full rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${Y ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
            }
          ),
          Y && /* @__PURE__ */ g("p", { className: "mt-1 text-xs text-red-500", children: "Solde LP insuffisant" })
        ] }),
        I && N && T > 0n && ee > 0n && !Y && /* @__PURE__ */ _(dt, { children: [
          /* @__PURE__ */ g("div", { className: "flex justify-center -my-2 relative z-10", children: /* @__PURE__ */ g("div", { className: "rounded-full p-1.5 bg-[#ffffff] dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]", children: /* @__PURE__ */ g(Lr, { className: "w-4 h-4 text-amber-500" }) }) }),
          /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] p-4 space-y-3 shadow-sm", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center", children: "Vous recevrez (estimation)" }),
            /* @__PURE__ */ g("div", { className: "text-sm font-bold text-gray-900 dark:text-white", children: /* @__PURE__ */ g(Ct, { amount: new S(T.toString()).toFixed(0, S.ROUND_DOWN), identifier: I.tokenA }) }),
            /* @__PURE__ */ g("div", { className: "text-sm font-bold text-gray-900 dark:text-white", children: /* @__PURE__ */ g(Ct, { amount: new S(ee.toString()).toFixed(0, S.ROUND_DOWN), identifier: I.tokenB }) })
          ] })
        ] }),
        /* @__PURE__ */ g(
          "button",
          {
            onClick: s ? xe : n,
            disabled: s ? !I || !N || Y : !n,
            className: "dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed",
            children: s ? I ? N ? Y ? "Solde insuffisant" : "Retirer Liquidité" : "Renseignez un montant" : "Sélectionnez une pool" : "Connectez votre wallet"
          }
        )
      ] })
    }
  ) });
}, Eo = () => {
  const { apiUrl: l, factoryAddress: e, routes: n } = Ge(), { t: i } = Je("swap");
  ht("swap");
  const { address: s } = pt(), { network: o } = Xe(), d = st(), [f, h] = Nt(), [p, u] = F([]), [b, L] = F(!0), [w, k] = F(/* @__PURE__ */ new Set()), [y, A] = F(null), [N, E] = F(null), H = (D) => {
    A(D), h((j) => {
      const U = new URLSearchParams(j);
      return D ? U.set("tokenX", D.identifier) : U.delete("tokenX"), U;
    }, { replace: !0 });
  }, I = (D) => {
    E(D), h((j) => {
      const U = new URLSearchParams(j);
      return D ? U.set("tokenY", D.identifier) : U.delete("tokenY"), U;
    }, { replace: !0 });
  }, [G, B] = F(""), [K, C] = F(""), [Z, T] = F(null), [ee, xe] = F(!1), [Y, ne] = F(!1), R = Ye(void 0, { enabled: !!s }), [q, P] = F([]);
  ae(() => {
    if (!R || R.length === 0) {
      P([]);
      return;
    }
    P(R.filter((D) => !w.has(D.identifier)).map((D) => {
      var j, U;
      return { identifier: D.identifier, ticker: D.ticker || D.identifier.split("-")[0], decimals: D.decimals ?? 18, logoUrl: ((j = D.assets) == null ? void 0 : j.svgUrl) ?? ((U = D.assets) == null ? void 0 : U.pngUrl) ?? null };
    }));
  }, [R, w]), ae(() => {
    l && (L(!0), Promise.all([
      he.get(`${l}/tokens/hub`).catch(() => ({ data: [] })),
      he.get(`${l}/pools`).catch(() => ({ data: { pools: [] } }))
    ]).then(([D, j]) => {
      var U;
      u((((U = D.data) == null ? void 0 : U.hubTokens) || []).map((ie) => ({ identifier: ie.identifier, ticker: ie.ticker || ie.identifier.split("-")[0], decimals: ie.decimals ?? 18, logoUrl: ie.logoUrl ?? null }))), k(new Set((j.data.pools || []).map((ie) => ie.lpToken).filter(Boolean)));
    }).catch(console.error).finally(() => L(!1)));
  }, [l]), ae(() => {
    if (b) return;
    const D = f.get("tokenX"), j = f.get("tokenY");
    if (D && !y) {
      const U = p.find((ie) => ie.identifier === D);
      U && A(U);
    }
    if (j && !N) {
      const U = q.find((ie) => ie.identifier === j);
      U && E(U);
    }
  }, [b, p, q]), ae(() => {
    if (!y || !N) return;
    const D = (ye) => ye.split("-")[0].toUpperCase().replace(/[^A-Z0-9]/g, ""), j = D(y.ticker), U = D(N.ticker), ie = (ye, Se, Be) => ye.length + Se.length <= Be ? [ye, Se] : [ye.slice(0, Be - Math.floor(Be / 2)), Se.slice(0, Math.floor(Be / 2))], [Ie, qe] = ie(j, U, 18);
    B(Ie + qe + "LP");
    const [He, $e] = ie(j, U, 10);
    C(He + $e);
  }, [y, N]);
  const te = async () => {
    var D, j;
    if (!(!y || !N))
      try {
        const U = await he.get(`${l}/pools/pair`, { params: { tokenA: y.identifier, tokenB: N.identifier } });
        T((D = U.data) != null && D.address ? U.data : null);
      } catch (U) {
        ((j = U == null ? void 0 : U.response) == null ? void 0 : j.status) !== 404 && console.error(U), T(null);
      }
  };
  ae(() => {
    te();
    const D = setInterval(te, 5e3);
    return () => clearInterval(D);
  }, [y, N]);
  const [be, Ce] = Le.useState(!1);
  ae(() => {
    if (!be) return;
    const D = setInterval(async () => {
      await te(), T((j) => (j && Ce(!1), j));
    }, 2e3);
    return () => clearInterval(D);
  }, [be, y, N]);
  const oe = G.length >= 3 && G.length <= 20 && /^[a-zA-Z0-9]+$/.test(G), ge = K.length >= 3 && K.length <= 10 && /^[A-Z0-9]+$/.test(K), de = !!s && !!y && !!N && y.identifier !== N.identifier && oe && ge && !Z, X = !!s && !!Z && !Z.isActive, re = ee || Y, je = async () => {
    if (!(!de || !y || !N)) {
      xe(!0);
      try {
        const D = ["createPair", Ae(y.identifier), Ae(N.identifier), Ae(G), Ae(K)], j = new tt({ value: 0n, data: new TextEncoder().encode(D.join("@")), receiver: new Pe(e), sender: new Pe(s), gasLimit: 300000000n, gasPrice: BigInt(rt), chainID: o.chainId, version: 1 });
        await nt({ transactions: [j], transactionsDisplayInfo: { processingMessage: i("create_processing_pair"), errorMessage: i("create_error_pair"), successMessage: i("create_success_pair") } }), Ce(!0);
      } catch (D) {
        console.error(D);
      } finally {
        xe(!1);
      }
    }
  }, De = async () => {
    if (!(!X || !y || !N)) {
      ne(!0);
      try {
        const D = ["issueLpToken", Ae(y.identifier), Ae(N.identifier)], j = new tt({ value: 50000000000000000n, data: new TextEncoder().encode(D.join("@")), receiver: new Pe(e), sender: new Pe(s), gasLimit: 150000000n, gasPrice: BigInt(rt), chainID: o.chainId, version: 1 });
        await nt({ transactions: [j], transactionsDisplayInfo: { processingMessage: i("create_processing_lp"), errorMessage: i("create_error_lp"), successMessage: i("create_success_lp") } });
      } catch (D) {
        console.error(D);
      } finally {
        ne(!1);
      }
    }
  };
  return /* @__PURE__ */ _("div", { className: "mx-auto max-w-lg px-4 py-8", children: [
    /* @__PURE__ */ _("div", { className: "flex items-center gap-3 mb-6", children: [
      /* @__PURE__ */ g("button", { onClick: () => d(n.liquidity), className: "p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition", children: /* @__PURE__ */ g(It, { className: "w-5 h-5 text-gray-600 dark:text-gray-300" }) }),
      /* @__PURE__ */ _("div", { children: [
        /* @__PURE__ */ g("h1", { className: "text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white", children: i("create_title") }),
        /* @__PURE__ */ g("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: i("create_subtitle") })
      ] })
    ] }),
    /* @__PURE__ */ _("div", { className: "space-y-4", children: [
      /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4 space-y-4", children: [
        /* @__PURE__ */ _("div", { children: [
          /* @__PURE__ */ g("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block", children: i("create_token1") }),
          /* @__PURE__ */ g(it, { value: y, onChange: re ? () => {
          } : H, tokens: p, exclude: N == null ? void 0 : N.identifier, loading: b })
        ] }),
        /* @__PURE__ */ _("div", { children: [
          /* @__PURE__ */ g("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block", children: i("create_token2") }),
          /* @__PURE__ */ g(it, { value: N, onChange: re ? () => {
          } : I, tokens: q, exclude: y == null ? void 0 : y.identifier, loading: b || R.length > 0 && q.length === 0 })
        ] }),
        /* @__PURE__ */ _("div", { children: [
          /* @__PURE__ */ g("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block", children: i("create_lp_name") }),
          /* @__PURE__ */ g(
            "input",
            {
              type: "text",
              value: G,
              onChange: (D) => B(D.target.value),
              disabled: re || !!Z,
              className: `w-full rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${!oe && G.length > 0 ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
            }
          )
        ] }),
        /* @__PURE__ */ _("div", { children: [
          /* @__PURE__ */ g("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block", children: i("create_lp_ticker") }),
          /* @__PURE__ */ g(
            "input",
            {
              type: "text",
              value: K,
              onChange: (D) => C(D.target.value.toUpperCase()),
              disabled: re || !!Z,
              className: `w-full rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${!ge && K.length > 0 ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
            }
          )
        ] })
      ] }),
      Z ? Z.isActive ? /* @__PURE__ */ _("div", { className: "rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-6 mt-4 text-center", children: [
        /* @__PURE__ */ g(Sr, { className: "w-12 h-12 text-green-500 mx-auto mb-3" }),
        /* @__PURE__ */ g("p", { className: "text-base font-bold text-green-700 dark:text-green-400 mb-2", children: i("create_pool_active") }),
        /* @__PURE__ */ g("p", { className: "text-sm text-green-600/80 dark:text-green-400/80 mb-4", children: i("create_pool_ready") }),
        /* @__PURE__ */ g("button", { onClick: () => d(`${n.addLiquidity}?tokenA=${y == null ? void 0 : y.identifier}&tokenB=${N == null ? void 0 : N.identifier}`), className: "w-full px-4 py-3 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition shadow-sm", children: i("create_add_liquidity") })
      ] }) : /* @__PURE__ */ _("div", { className: "rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 mt-4 text-center", children: [
        /* @__PURE__ */ g("p", { className: "text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3", children: i("create_pair_done") }),
        /* @__PURE__ */ g("p", { className: "text-xs text-amber-600/80 dark:text-amber-400/80 mb-4 text-left", children: i("create_pair_desc") }),
        /* @__PURE__ */ g("button", { onClick: De, className: "w-full px-4 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition shadow-sm", children: i(Y ? "create_tx_pending" : "create_step2") }),
        Y && /* @__PURE__ */ g("p", { className: "text-center text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse", children: i("create_tx_waiting") })
      ] }) : /* @__PURE__ */ _(dt, { children: [
        /* @__PURE__ */ g("button", { onClick: je, disabled: !de || ee, className: "dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed", children: i(ee ? "create_tx_pending" : "create_step1") }),
        ee && /* @__PURE__ */ g("p", { className: "text-center text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse", children: i("create_tx_waiting") })
      ] })
    ] })
  ] });
};
function Qt(l, e) {
  const n = new S(l).shiftedBy(-e);
  return n.isZero() ? "0" : n.gte(1e6) ? n.toFormat(0) + "" : n.gte(1e3) ? n.toFormat(2) : n.gte(1) ? n.toFormat(4) : n.toFormat(6);
}
const Co = () => {
  const { apiUrl: l, routes: e } = Ge(), { t: n } = Je("swap");
  ht("swap");
  const i = st(), [s, o] = Le.useState([]), [d, f] = Le.useState({}), [h, p] = Le.useState(!0), [u, b] = Le.useState("DinoVox");
  Le.useEffect(() => {
    l && (p(!0), Promise.all([
      he.get(`${l}/pools`, { params: { dexType: u } }),
      he.get(`${l}/tokens`)
    ]).then(([k, y]) => {
      const A = (k.data.pools || []).filter((E) => E.isActive);
      o(A);
      const N = {};
      for (const E of y.data.tokens || [])
        N[E.identifier] = { identifier: E.identifier, ticker: E.ticker ?? E.identifier.split("-")[0], decimals: E.decimals ?? 18 };
      f(N);
    }).catch(console.error).finally(() => p(!1)));
  }, [u, l]);
  const L = (k) => {
    var y;
    return ((y = d[k]) == null ? void 0 : y.ticker) ?? k.split("-")[0];
  }, w = (k) => {
    var y;
    return ((y = d[k]) == null ? void 0 : y.decimals) ?? 18;
  };
  return /* @__PURE__ */ g("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ _(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ _("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4", children: [
        /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ g("span", { className: "text-xl", children: "🌊" }),
          /* @__PURE__ */ g("span", { className: "text-lg font-black tracking-tight", children: n("pools_title") })
        ] }),
        /* @__PURE__ */ _("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full sm:w-auto overflow-x-auto", children: [
          /* @__PURE__ */ g(
            "button",
            {
              onClick: () => i(e.swap),
              className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5 whitespace-nowrap",
              children: n("tab_swap")
            }
          ),
          /* @__PURE__ */ g(
            "button",
            {
              onClick: () => i(e.liquidity),
              className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5 whitespace-nowrap",
              children: n("tab_liquidity")
            }
          ),
          /* @__PURE__ */ g("button", { className: "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all whitespace-nowrap", children: n("pools_title") })
        ] })
      ] }),
      description: h ? n("pools_loading_desc") : n("pools_count", { count: s.length }),
      children: [
        /* @__PURE__ */ g("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl mt-4 w-fit", children: ["DinoVox", "XExchange"].map((k) => /* @__PURE__ */ g(
          "button",
          {
            onClick: () => b(k),
            className: `px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${u === k ? "bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md" : "text-gray-400 hover:text-gray-700 dark:hover:text-white"}`,
            children: k
          },
          k
        )) }),
        /* @__PURE__ */ _("div", { className: "space-y-3 mt-4", children: [
          h ? /* @__PURE__ */ g("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ g("div", { className: "w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" }) }) : s.length === 0 ? /* @__PURE__ */ g("p", { className: "text-center text-sm text-gray-500 dark:text-gray-400 py-8", children: n("pools_empty") }) : s.map((k) => {
            const y = L(k.tokenA), A = L(k.tokenB), N = w(k.tokenA), E = w(k.tokenB), H = Qt(k.reserveA, N), I = Qt(k.reserveB, E);
            return /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
              /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
                /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ _("span", { className: "font-black text-gray-900 dark:text-white text-base", children: [
                    y,
                    " / ",
                    A
                  ] }),
                  /* @__PURE__ */ g("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-semibold border border-green-200 dark:border-green-800 uppercase", children: n("pools_active") })
                ] }),
                u === "DinoVox" && /* @__PURE__ */ g(
                  "button",
                  {
                    onClick: () => i(`${e.addLiquidity}?tokenA=${k.tokenA}&tokenB=${k.tokenB}`),
                    className: "text-xs font-bold text-amber-500 hover:text-amber-600 transition",
                    children: n("pools_add")
                  }
                )
              ] }),
              /* @__PURE__ */ _("div", { className: "grid grid-cols-2 gap-3", children: [
                /* @__PURE__ */ _("div", { className: "rounded-xl bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-100 dark:border-[#333] px-3 py-2", children: [
                  /* @__PURE__ */ _("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5", children: [
                    n("pools_reserve"),
                    " ",
                    y
                  ] }),
                  /* @__PURE__ */ _("p", { className: "font-bold text-gray-900 dark:text-white text-sm", children: [
                    H,
                    " ",
                    /* @__PURE__ */ g("span", { className: "text-gray-400 font-medium", children: y })
                  ] })
                ] }),
                /* @__PURE__ */ _("div", { className: "rounded-xl bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-100 dark:border-[#333] px-3 py-2", children: [
                  /* @__PURE__ */ _("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5", children: [
                    n("pools_reserve"),
                    " ",
                    A
                  ] }),
                  /* @__PURE__ */ _("p", { className: "font-bold text-gray-900 dark:text-white text-sm", children: [
                    I,
                    " ",
                    /* @__PURE__ */ g("span", { className: "text-gray-400 font-medium", children: A })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ g("p", { className: "text-[10px] text-gray-400 mt-2 font-mono truncate", children: k.address })
            ] }, k.address);
          }),
          /* @__PURE__ */ g(
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
}, bt = {
  swap: "",
  liquidity: "#liquidity",
  addLiquidity: "#add-liquidity",
  removeLiquidity: "#remove-liquidity",
  createPool: "#create-pool",
  pools: "#pools"
}, $o = Object.fromEntries(
  Object.entries(bt).map(([l, e]) => [e, l])
);
function Ao(l, e) {
  const n = Object.entries(e);
  n.sort((i, s) => s[1].length - i[1].length);
  for (const [i, s] of n)
    if (l === s) return i;
  return "swap";
}
function er(l) {
  return $o[l] ?? null;
}
const Ko = ({
  initialView: l = "swap"
}) => {
  const { routes: e, language: n, theme: i } = Ge(), [s, o] = F(
    () => typeof document < "u" && document.documentElement.classList.contains("dark")
  );
  ae(() => {
    if (i !== void 0) return;
    const w = document.documentElement;
    o(w.classList.contains("dark"));
    const k = new MutationObserver(() => {
      o(w.classList.contains("dark"));
    });
    return k.observe(w, { attributes: !0, attributeFilter: ["class"] }), () => k.disconnect();
  }, [i]), ae(() => {
    const w = (n || (typeof navigator < "u" ? navigator.language : "en") || "en").split("-")[0];
    ot.language !== w && ot.isInitialized && ot.changeLanguage(w);
  }, [n]);
  const [{ view: d, params: f }, h] = F(() => ({
    view: (typeof window < "u" ? er(window.location.hash) : null) ?? l,
    params: new URLSearchParams(window.location.search)
  })), p = $t(
    (w) => {
      const [k, y] = w.split("?"), A = Ao(k, e), N = bt[A], E = new URLSearchParams(y ?? ""), H = E.toString() ? "?" + E.toString() : "";
      window.history.pushState(
        null,
        "",
        window.location.pathname + H + N
      ), h({
        view: A,
        params: new URLSearchParams(y ?? "")
      });
    },
    [e]
  ), u = $t(
    (w, k) => {
      h((y) => {
        const A = w(y.params), N = bt[y.view], E = window.location.pathname + "?" + A.toString() + N;
        return k != null && k.replace ? window.history.replaceState(null, "", E) : window.history.pushState(null, "", E), { ...y, params: A };
      });
    },
    []
  );
  ae(() => {
    const w = () => {
      const k = er(window.location.hash);
      k && h((y) => ({
        ...y,
        view: k,
        params: new URLSearchParams(window.location.search)
      }));
    };
    return window.addEventListener("popstate", w), () => window.removeEventListener("popstate", w);
  }, []), ae(() => {
    const w = bt[d];
    w && !window.location.hash && window.history.replaceState(null, "", w);
  }, []);
  const b = () => {
    switch (d) {
      case "liquidity":
        return /* @__PURE__ */ g(No, {});
      case "addLiquidity":
        return /* @__PURE__ */ g(Lo, {});
      case "removeLiquidity":
        return /* @__PURE__ */ g(Bo, {});
      case "createPool":
        return /* @__PURE__ */ g(Eo, {});
      case "pools":
        return /* @__PURE__ */ g(Co, {});
      default:
        return /* @__PURE__ */ g(ko, {});
    }
  }, L = i === "dark" ? "dark" : i === "light" ? "light" : i === "mid" || s ? "dark" : "";
  return /* @__PURE__ */ g(_r, { i18n: ot, children: /* @__PURE__ */ g(or.Provider, { value: { params: f, navigate: p, setParams: u }, children: /* @__PURE__ */ g("div", { className: L || void 0, children: b() }) }) });
};
export {
  Lo as AddLiquidity,
  gt as Card,
  Eo as CreatePool,
  Ct as FormatAmount,
  No as Liquidity,
  Co as Pools,
  Bo as RemoveLiquidity,
  ko as Swap,
  Ho as SwapConfigProvider,
  Ko as SwapWidget,
  it as TokenSelect,
  Ke as bigToHex,
  nt as signAndSendTransactions,
  Ye as useGetUserESDT,
  Ge as useSwapConfig
};
//# sourceMappingURL=mx-swap-widget.es.js.map
