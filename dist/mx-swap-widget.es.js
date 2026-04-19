import { jsx as g, jsxs as _, Fragment as dt } from "react/jsx-runtime";
import Ce, { createContext as nr, useContext as ir, useEffect as ne, useState as F, useRef as ut, useCallback as Ct } from "react";
import { initReactI18next as wr, useTranslation as Ke, I18nextProvider as _r } from "react-i18next";
import he from "axios";
import { Info as kr, ArrowUpDown as Nr, Plus as vr, ArrowLeft as Tt, ArrowDown as Lr, CheckCircle as Sr } from "lucide-react";
import { useGetAccount as pt } from "@multiversx/sdk-dapp/out/react/account/useGetAccount";
import { useGetAccountInfo as sr } from "@multiversx/sdk-dapp/out/react/account/useGetAccountInfo";
import { useGetNetworkConfig as Je } from "@multiversx/sdk-dapp/out/react/network/useGetNetworkConfig";
import { Address as qe, Transaction as tt } from "@multiversx/sdk-core";
import { GAS_PRICE as rt } from "@multiversx/sdk-dapp/out/constants/mvx.constants";
import { getAccountProvider as Br } from "@multiversx/sdk-dapp/out/providers/helpers/accountProvider";
import { TransactionManager as Er } from "@multiversx/sdk-dapp/out/managers/TransactionManager";
import { useGetPendingTransactions as $r } from "@multiversx/sdk-dapp/out/react/transactions/useGetPendingTransactions";
import S from "bignumber.js";
const ar = {
  swap: "/swap",
  liquidity: "/liquidity",
  addLiquidity: "/liquidity/add",
  removeLiquidity: "/liquidity/remove",
  createPool: "/liquidity/create",
  pools: "/liquidity/pools"
}, or = {
  apiUrl: "https://dex.dinovox.com/api/v1",
  routerAddress: "erd1qqqqqqqqqqqqqpgq67xp5hv48n5vy5d8990uq8kpx99h7rfkfm8s2zqqxn",
  aggregatorAddress: "erd1qqqqqqqqqqqqqpgqly98mw70swxc403a7r63mr7pkzh9uhazfm8suv22ak",
  factoryAddress: "erd1qqqqqqqqqqqqqpgqq5852gnes6xxka35lw42prqwtv6a0znhfm8sn3h9n3",
  wrapContract: "erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3",
  wegldIdentifier: "WEGLD-bd4d79",
  routes: ar
}, lr = nr(or), Uo = ({ config: c, children: e }) => {
  const n = {
    ...or,
    ...c,
    routes: { ...ar, ...c == null ? void 0 : c.routes }
  };
  return /* @__PURE__ */ g(lr.Provider, { value: n, children: e });
}, Me = () => ir(lr), cr = nr(null), dr = () => ir(cr), D = (c) => typeof c == "string", at = () => {
  let c, e;
  const n = new Promise((i, s) => {
    c = i, e = s;
  });
  return n.resolve = c, n.reject = e, n;
}, qt = (c) => c == null ? "" : String(c), Ar = (c, e, n) => {
  c.forEach((i) => {
    e[i] && (n[i] = e[i]);
  });
}, Cr = /###/g, Ot = (c) => c && c.includes("###") ? c.replace(Cr, ".") : c, Ut = (c) => !c || D(c), lt = (c, e, n) => {
  const i = D(e) ? e.split(".") : e;
  let s = 0;
  for (; s < i.length - 1; ) {
    if (Ut(c)) return {};
    const o = Ot(i[s]);
    !c[o] && n && (c[o] = new n()), Object.prototype.hasOwnProperty.call(c, o) ? c = c[o] : c = {}, ++s;
  }
  return Ut(c) ? {} : {
    obj: c,
    k: Ot(i[s])
  };
}, jt = (c, e, n) => {
  const {
    obj: i,
    k: s
  } = lt(c, e, Object);
  if (i !== void 0 || e.length === 1) {
    i[s] = n;
    return;
  }
  let o = e[e.length - 1], l = e.slice(0, e.length - 1), f = lt(c, l, Object);
  for (; f.obj === void 0 && l.length; )
    o = `${l[l.length - 1]}.${o}`, l = l.slice(0, l.length - 1), f = lt(c, l, Object), f != null && f.obj && typeof f.obj[`${f.k}.${o}`] < "u" && (f.obj = void 0);
  f.obj[`${f.k}.${o}`] = n;
}, Ir = (c, e, n, i) => {
  const {
    obj: s,
    k: o
  } = lt(c, e, Object);
  s[o] = s[o] || [], s[o].push(n);
}, bt = (c, e) => {
  const {
    obj: n,
    k: i
  } = lt(c, e);
  if (n && Object.prototype.hasOwnProperty.call(n, i))
    return n[i];
}, Tr = (c, e, n) => {
  const i = bt(c, n);
  return i !== void 0 ? i : bt(e, n);
}, ur = (c, e, n) => {
  for (const i in e)
    i !== "__proto__" && i !== "constructor" && (i in c ? D(c[i]) || c[i] instanceof String || D(e[i]) || e[i] instanceof String ? n && (c[i] = e[i]) : ur(c[i], e[i], n) : c[i] = e[i]);
  return c;
}, We = (c) => c.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), Fr = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;"
}, Rr = (c) => D(c) ? c.replace(/[&<>"'\/]/g, (e) => Fr[e]) : c;
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
const Dr = [" ", ",", "?", "!", ";"], qr = new Pr(20), Or = (c, e, n) => {
  e = e || "", n = n || "";
  const i = Dr.filter((l) => !e.includes(l) && !n.includes(l));
  if (i.length === 0) return !0;
  const s = qr.getRegExp(`(${i.map((l) => l === "?" ? "\\?" : l).join("|")})`);
  let o = !s.test(c);
  if (!o) {
    const l = c.indexOf(n);
    l > 0 && !s.test(c.substring(0, l)) && (o = !0);
  }
  return o;
}, It = (c, e, n = ".") => {
  if (!c) return;
  if (c[e])
    return Object.prototype.hasOwnProperty.call(c, e) ? c[e] : void 0;
  const i = e.split(n);
  let s = c;
  for (let o = 0; o < i.length; ) {
    if (!s || typeof s != "object")
      return;
    let l, f = "";
    for (let p = o; p < i.length; ++p)
      if (p !== o && (f += n), f += i[p], l = s[f], l !== void 0) {
        if (["string", "number", "boolean"].includes(typeof l) && p < i.length - 1)
          continue;
        o += p - o + 1;
        break;
      }
    s = l;
  }
  return s;
}, ft = (c) => c == null ? void 0 : c.replace(/_/g, "-"), Ur = {
  type: "logger",
  log(c) {
    this.output("log", c);
  },
  warn(c) {
    this.output("warn", c);
  },
  error(c) {
    this.output("error", c);
  },
  output(c, e) {
    var n, i;
    (i = (n = console == null ? void 0 : console[c]) == null ? void 0 : n.apply) == null || i.call(n, console, e);
  }
};
class yt {
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
    return s && !this.debug ? null : (e = e.map((o) => D(o) ? o.replace(/[\r\n\x00-\x1F\x7F]/g, " ") : o), D(e[0]) && (e[0] = `${i}${this.prefix} ${e[0]}`), this.logger[n](e));
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
var je = new yt();
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
      for (let l = 0; l < o; l++)
        s(...n);
    }), this.observers["*"] && Array.from(this.observers["*"].entries()).forEach(([s, o]) => {
      for (let l = 0; l < o; l++)
        s(e, ...n);
    });
  }
}
class Mt extends _t {
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
    const o = s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator, l = s.ignoreJSONStructure !== void 0 ? s.ignoreJSONStructure : this.options.ignoreJSONStructure;
    let f;
    e.includes(".") ? f = e.split(".") : (f = [e, n], i && (Array.isArray(i) ? f.push(...i) : D(i) && o ? f.push(...i.split(o)) : f.push(i)));
    const p = bt(this.data, f);
    return !p && !n && !i && e.includes(".") && (e = f[0], n = f[1], i = f.slice(2).join(".")), p || !l || !D(i) ? p : It((u = (m = this.data) == null ? void 0 : m[e]) == null ? void 0 : u[n], i, o);
  }
  addResource(e, n, i, s, o = {
    silent: !1
  }) {
    const l = o.keySeparator !== void 0 ? o.keySeparator : this.options.keySeparator;
    let f = [e, n];
    i && (f = f.concat(l ? i.split(l) : i)), e.includes(".") && (f = e.split("."), s = n, n = f[1]), this.addNamespaces(n), jt(this.data, f, s), o.silent || this.emit("added", e, n, i, s);
  }
  addResources(e, n, i, s = {
    silent: !1
  }) {
    for (const o in i)
      (D(i[o]) || Array.isArray(i[o])) && this.addResource(e, n, o, i[o], {
        silent: !0
      });
    s.silent || this.emit("added", e, n, i);
  }
  addResourceBundle(e, n, i, s, o, l = {
    silent: !1,
    skipCopy: !1
  }) {
    let f = [e, n];
    e.includes(".") && (f = e.split("."), s = i, i = n, n = f[1]), this.addNamespaces(n);
    let p = bt(this.data, f) || {};
    l.skipCopy || (i = JSON.parse(JSON.stringify(i))), s ? ur(p, i, o) : p = {
      ...p,
      ...i
    }, jt(this.data, f, p), l.silent || this.emit("added", e, n, i);
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
var fr = {
  processors: {},
  addPostProcessor(c) {
    this.processors[c.name] = c;
  },
  handle(c, e, n, i, s) {
    return c.forEach((o) => {
      var l;
      e = ((l = this.processors[o]) == null ? void 0 : l.process(e, n, i, s)) ?? e;
    }), e;
  }
};
const pr = Symbol("i18next/PATH_KEY");
function jr() {
  const c = [], e = /* @__PURE__ */ Object.create(null);
  let n;
  return e.get = (i, s) => {
    var o;
    return (o = n == null ? void 0 : n.revoke) == null || o.call(n), s === pr ? c : (c.push(s), n = Proxy.revocable(i, e), n.proxy);
  }, Proxy.revocable(/* @__PURE__ */ Object.create(null), e).proxy;
}
function et(c, e) {
  const {
    [pr]: n
  } = c(jr()), i = (e == null ? void 0 : e.keySeparator) ?? ".", s = (e == null ? void 0 : e.nsSeparator) ?? ":";
  if (n.length > 1 && s) {
    const o = e == null ? void 0 : e.ns, l = Array.isArray(o) ? o : null;
    if (l && l.length > 1 && l.slice(1).includes(n[0]))
      return `${n[0]}${s}${n.slice(1).join(i)}`;
  }
  return n.join(i);
}
const Lt = (c) => !D(c) && typeof c != "boolean" && typeof c != "number";
class wt extends _t {
  constructor(e, n = {}) {
    super(), Ar(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], e, this), this.options = n, this.options.keySeparator === void 0 && (this.options.keySeparator = "."), this.logger = je.create("translator"), this.checkedLoadedFor = {};
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
    const l = i && e.includes(i), f = !this.options.userDefinedKeySeparator && !n.keySeparator && !this.options.userDefinedNsSeparator && !n.nsSeparator && !Or(e, i, s);
    if (l && !f) {
      const p = e.match(this.interpolator.nestingRegexp);
      if (p && p.length > 0)
        return {
          key: e,
          namespaces: D(o) ? [o] : o
        };
      const m = e.split(i);
      (i !== s || i === s && this.options.ns.includes(m[0])) && (o = m.shift()), e = m.join(s);
    }
    return {
      key: e,
      namespaces: D(o) ? [o] : o
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
    const o = s.returnDetails !== void 0 ? s.returnDetails : this.options.returnDetails, l = s.keySeparator !== void 0 ? s.keySeparator : this.options.keySeparator, {
      key: f,
      namespaces: p
    } = this.extractFromKey(e[e.length - 1], s), m = p[p.length - 1];
    let u = s.nsSeparator !== void 0 ? s.nsSeparator : this.options.nsSeparator;
    u === void 0 && (u = ":");
    const y = s.lng || this.language, L = s.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
    if ((y == null ? void 0 : y.toLowerCase()) === "cimode")
      return L ? o ? {
        res: `${m}${u}${f}`,
        usedKey: f,
        exactUsedKey: f,
        usedLng: y,
        usedNS: m,
        usedParams: this.getUsedParamsDetails(s)
      } : `${m}${u}${f}` : o ? {
        res: f,
        usedKey: f,
        exactUsedKey: f,
        usedLng: y,
        usedNS: m,
        usedParams: this.getUsedParamsDetails(s)
      } : f;
    const w = this.resolve(e, s);
    let x = w == null ? void 0 : w.res;
    const B = (w == null ? void 0 : w.usedKey) || f, v = (w == null ? void 0 : w.exactUsedKey) || f, C = ["[object Number]", "[object Function]", "[object RegExp]"], P = s.joinArrays !== void 0 ? s.joinArrays : this.options.joinArrays, k = !this.i18nFormat || this.i18nFormat.handleAsObject, A = s.count !== void 0 && !D(s.count), E = wt.hasDefaultValue(s), re = A ? this.pluralResolver.getSuffix(y, s.count, s) : "", Z = s.ordinal && A ? this.pluralResolver.getSuffix(y, s.count, {
      ordinal: !1
    }) : "", W = A && !s.ordinal && s.count === 0, $ = W && s[`defaultValue${this.options.pluralSeparator}zero`] || s[`defaultValue${re}`] || s[`defaultValue${Z}`] || s.defaultValue;
    let z = x;
    k && !x && E && (z = $);
    const me = Lt(z), X = Object.prototype.toString.apply(z);
    if (k && z && me && !C.includes(X) && !(D(P) && Array.isArray(z))) {
      if (!s.returnObjects && !this.options.returnObjects) {
        this.options.returnedObjectHandler || this.logger.warn("accessing an object - but returnObjects options is not enabled!");
        const K = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(B, z, {
          ...s,
          ns: p
        }) : `key '${f} (${this.language})' returned an object instead of string.`;
        return o ? (w.res = K, w.usedParams = this.getUsedParamsDetails(s), w) : K;
      }
      if (l) {
        const K = Array.isArray(z), I = K ? [] : {}, q = K ? v : B;
        for (const j in z)
          if (Object.prototype.hasOwnProperty.call(z, j)) {
            const le = `${q}${l}${j}`;
            E && !x ? I[j] = this.translate(le, {
              ...s,
              defaultValue: Lt($) ? $[j] : void 0,
              joinArrays: !1,
              ns: p
            }) : I[j] = this.translate(le, {
              ...s,
              joinArrays: !1,
              ns: p
            }), I[j] === le && (I[j] = z[j]);
          }
        x = I;
      }
    } else if (k && D(P) && Array.isArray(x))
      x = x.join(P), x && (x = this.extendTranslation(x, e, s, i));
    else {
      let K = !1, I = !1;
      !this.isValidLookup(x) && E && (K = !0, x = $), this.isValidLookup(x) || (I = !0, x = f);
      const j = (s.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey) && I ? void 0 : x, le = E && $ !== x && this.options.updateMissing;
      if (I || K || le) {
        if (this.logger.log(le ? "updateKey" : "missingKey", y, m, f, le ? $ : x), l) {
          const ie = this.resolve(f, {
            ...s,
            keySeparator: !1
          });
          ie && ie.res && this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
        }
        let ge = [];
        const _e = this.languageUtils.getFallbackCodes(this.options.fallbackLng, s.lng || this.language);
        if (this.options.saveMissingTo === "fallback" && _e && _e[0])
          for (let ie = 0; ie < _e.length; ie++)
            ge.push(_e[ie]);
        else this.options.saveMissingTo === "all" ? ge = this.languageUtils.toResolveHierarchy(s.lng || this.language) : ge.push(s.lng || this.language);
        const ce = (ie, ke, Ne) => {
          var Q;
          const Y = E && Ne !== x ? Ne : j;
          this.options.missingKeyHandler ? this.options.missingKeyHandler(ie, m, ke, Y, le, s) : (Q = this.backendConnector) != null && Q.saveMissing && this.backendConnector.saveMissing(ie, m, ke, Y, le, s), this.emit("missingKey", ie, m, ke, x);
        };
        this.options.saveMissing && (this.options.saveMissingPlurals && A ? ge.forEach((ie) => {
          const ke = this.pluralResolver.getSuffixes(ie, s);
          W && s[`defaultValue${this.options.pluralSeparator}zero`] && !ke.includes(`${this.options.pluralSeparator}zero`) && ke.push(`${this.options.pluralSeparator}zero`), ke.forEach((Ne) => {
            ce([ie], f + Ne, s[`defaultValue${Ne}`] || $);
          });
        }) : ce(ge, f, $));
      }
      x = this.extendTranslation(x, e, s, w, i), I && x === f && this.options.appendNamespaceToMissingKey && (x = `${m}${u}${f}`), (I || K) && this.options.parseMissingKeyHandler && (x = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? `${m}${u}${f}` : f, K ? x : void 0, s));
    }
    return o ? (w.res = x, w.usedParams = this.getUsedParamsDetails(s), w) : x;
  }
  extendTranslation(e, n, i, s, o) {
    var p, m;
    if ((p = this.i18nFormat) != null && p.parse)
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
      const u = D(e) && (((m = i == null ? void 0 : i.interpolation) == null ? void 0 : m.skipOnVariables) !== void 0 ? i.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables);
      let y;
      if (u) {
        const w = e.match(this.interpolator.nestingRegexp);
        y = w && w.length;
      }
      let L = i.replace && !D(i.replace) ? i.replace : i;
      if (this.options.interpolation.defaultVariables && (L = {
        ...this.options.interpolation.defaultVariables,
        ...L
      }), e = this.interpolator.interpolate(e, L, i.lng || this.language || s.usedLng, i), u) {
        const w = e.match(this.interpolator.nestingRegexp), x = w && w.length;
        y < x && (i.nest = !1);
      }
      !i.lng && s && s.res && (i.lng = this.language || s.usedLng), i.nest !== !1 && (e = this.interpolator.nest(e, (...w) => (o == null ? void 0 : o[0]) === w[0] && !i.context ? (this.logger.warn(`It seems you are nesting recursively key: ${w[0]} in key: ${n[0]}`), null) : this.translate(...w, n), i)), i.interpolation && this.interpolator.reset();
    }
    const l = i.postProcess || this.options.postProcess, f = D(l) ? [l] : l;
    return e != null && (f != null && f.length) && i.applyPostProcessor !== !1 && (e = fr.handle(f, e, n, this.options && this.options.postProcessPassResolved ? {
      i18nResolved: {
        ...s,
        usedParams: this.getUsedParamsDetails(i)
      },
      ...i
    } : i, this)), e;
  }
  resolve(e, n = {}) {
    let i, s, o, l, f;
    return D(e) && (e = [e]), Array.isArray(e) && (e = e.map((p) => typeof p == "function" ? et(p, {
      ...this.options,
      ...n
    }) : p)), e.forEach((p) => {
      if (this.isValidLookup(i)) return;
      const m = this.extractFromKey(p, n), u = m.key;
      s = u;
      let y = m.namespaces;
      this.options.fallbackNS && (y = y.concat(this.options.fallbackNS));
      const L = n.count !== void 0 && !D(n.count), w = L && !n.ordinal && n.count === 0, x = n.context !== void 0 && (D(n.context) || typeof n.context == "number") && n.context !== "", B = n.lngs ? n.lngs : this.languageUtils.toResolveHierarchy(n.lng || this.language, n.fallbackLng);
      y.forEach((v) => {
        var C, P;
        this.isValidLookup(i) || (f = v, !this.checkedLoadedFor[`${B[0]}-${v}`] && ((C = this.utils) != null && C.hasLoadedNamespace) && !((P = this.utils) != null && P.hasLoadedNamespace(f)) && (this.checkedLoadedFor[`${B[0]}-${v}`] = !0, this.logger.warn(`key "${s}" for languages "${B.join(", ")}" won't get resolved as namespace "${f}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!")), B.forEach((k) => {
          var re;
          if (this.isValidLookup(i)) return;
          l = k;
          const A = [u];
          if ((re = this.i18nFormat) != null && re.addLookupKeys)
            this.i18nFormat.addLookupKeys(A, u, k, v, n);
          else {
            let Z;
            L && (Z = this.pluralResolver.getSuffix(k, n.count, n));
            const W = `${this.options.pluralSeparator}zero`, $ = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
            if (L && (n.ordinal && Z.startsWith($) && A.push(u + Z.replace($, this.options.pluralSeparator)), A.push(u + Z), w && A.push(u + W)), x) {
              const z = `${u}${this.options.contextSeparator || "_"}${n.context}`;
              A.push(z), L && (n.ordinal && Z.startsWith($) && A.push(z + Z.replace($, this.options.pluralSeparator)), A.push(z + Z), w && A.push(z + W));
            }
          }
          let E;
          for (; E = A.pop(); )
            this.isValidLookup(i) || (o = E, i = this.getResource(k, v, E, n));
        }));
      });
    }), {
      res: i,
      usedKey: s,
      exactUsedKey: o,
      usedLng: l,
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
    const n = ["defaultValue", "ordinal", "context", "replace", "lng", "lngs", "fallbackLng", "ns", "keySeparator", "nsSeparator", "returnObjects", "returnDetails", "joinArrays", "postProcess", "interpolation"], i = e.replace && !D(e.replace);
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
    this.options = e, this.supportedLngs = this.options.supportedLngs || !1, this.logger = je.create("languageUtils");
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
    if (D(e) && e.includes("-")) {
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
      n = this.options.supportedLngs.find((l) => l === o ? !0 : !l.includes("-") && !o.includes("-") ? !1 : !!(l.includes("-") && !o.includes("-") && l.slice(0, l.indexOf("-")) === o || l.startsWith(o) && o.length > 1));
    }), n || (n = this.getFallbackCodes(this.options.fallbackLng)[0]), n;
  }
  getFallbackCodes(e, n) {
    if (!e) return [];
    if (typeof e == "function" && (e = e(n)), D(e) && (e = [e]), Array.isArray(e)) return e;
    if (!n) return e.default || [];
    let i = e[n];
    return i || (i = e[this.getScriptPartFromCode(n)]), i || (i = e[this.formatLanguageCode(n)]), i || (i = e[this.getLanguagePartFromCode(n)]), i || (i = e.default), i || [];
  }
  toResolveHierarchy(e, n) {
    const i = this.getFallbackCodes((n === !1 ? [] : n) || this.options.fallbackLng || [], e), s = [], o = (l) => {
      l && (this.isSupportedCode(l) ? s.push(l) : this.logger.warn(`rejecting language code not found in supportedLngs: ${l}`));
    };
    return D(e) && (e.includes("-") || e.includes("_")) ? (this.options.load !== "languageOnly" && o(this.formatLanguageCode(e)), this.options.load !== "languageOnly" && this.options.load !== "currentOnly" && o(this.getScriptPartFromCode(e)), this.options.load !== "currentOnly" && o(this.getLanguagePartFromCode(e))) : D(e) && o(this.formatLanguageCode(e)), i.forEach((l) => {
      s.includes(l) || o(this.formatLanguageCode(l));
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
  select: (c) => c === 1 ? "one" : "other",
  resolvedOptions: () => ({
    pluralCategories: ["one", "other"]
  })
};
class Mr {
  constructor(e, n = {}) {
    this.languageUtils = e, this.options = n, this.logger = je.create("pluralResolver"), this.pluralRulesCache = {};
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
    let l;
    try {
      l = new Intl.PluralRules(i, {
        type: s
      });
    } catch {
      if (typeof Intl > "u")
        return this.logger.error("No Intl support, please use an Intl polyfill!"), Gt;
      if (!e.match(/-|_/)) return Gt;
      const p = this.languageUtils.getLanguagePartFromCode(e);
      l = this.getRule(p, n);
    }
    return this.pluralRulesCache[o] = l, l;
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
const Ht = (c, e, n, i = ".", s = !0) => {
  let o = Tr(c, e, n);
  return !o && s && D(n) && (o = It(c, n, i), o === void 0 && (o = It(e, n, i))), o;
}, St = (c) => c.replace(/\$/g, "$$$$");
class zt {
  constructor(e = {}) {
    var n;
    this.logger = je.create("interpolator"), this.options = e, this.format = ((n = e == null ? void 0 : e.interpolation) == null ? void 0 : n.format) || ((i) => i), this.init(e);
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
      prefixEscaped: l,
      suffix: f,
      suffixEscaped: p,
      formatSeparator: m,
      unescapeSuffix: u,
      unescapePrefix: y,
      nestingPrefix: L,
      nestingPrefixEscaped: w,
      nestingSuffix: x,
      nestingSuffixEscaped: B,
      nestingOptionsSeparator: v,
      maxReplaces: C,
      alwaysFormat: P
    } = e.interpolation;
    this.escape = n !== void 0 ? n : Rr, this.escapeValue = i !== void 0 ? i : !0, this.useRawValueToEscape = s !== void 0 ? s : !1, this.prefix = o ? We(o) : l || "{{", this.suffix = f ? We(f) : p || "}}", this.formatSeparator = m || ",", this.unescapePrefix = u ? "" : y ? We(y) : "-", this.unescapeSuffix = this.unescapePrefix ? "" : u ? We(u) : "", this.nestingPrefix = L ? We(L) : w || We("$t("), this.nestingSuffix = x ? We(x) : B || We(")"), this.nestingOptionsSeparator = v || ",", this.maxReplaces = C || 1e3, this.alwaysFormat = P !== void 0 ? P : !1, this.resetRegExp();
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
    let o, l, f;
    const p = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {}, m = (x) => {
      if (!x.includes(this.formatSeparator)) {
        const P = Ht(n, p, x, this.options.keySeparator, this.options.ignoreJSONStructure);
        return this.alwaysFormat ? this.format(P, void 0, i, {
          ...s,
          ...n,
          interpolationkey: x
        }) : P;
      }
      const B = x.split(this.formatSeparator), v = B.shift().trim(), C = B.join(this.formatSeparator).trim();
      return this.format(Ht(n, p, v, this.options.keySeparator, this.options.ignoreJSONStructure), C, i, {
        ...s,
        ...n,
        interpolationkey: v
      });
    };
    this.resetRegExp(), !this.escapeValue && typeof e == "string" && /\$t\([^)]*\{[^}]*\{\{/.test(e) && this.logger.warn("nesting options string contains interpolated variables with escapeValue: false — if any of those values are attacker-controlled they can inject additional nesting options (e.g. redirect lng/ns). Sanitise untrusted input before passing it to t(), or keep escapeValue: true.");
    const u = (s == null ? void 0 : s.missingInterpolationHandler) || this.options.missingInterpolationHandler, y = ((w = s == null ? void 0 : s.interpolation) == null ? void 0 : w.skipOnVariables) !== void 0 ? s.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables;
    return [{
      regex: this.regexpUnescape,
      safeValue: (x) => St(x)
    }, {
      regex: this.regexp,
      safeValue: (x) => this.escapeValue ? St(this.escape(x)) : St(x)
    }].forEach((x) => {
      for (f = 0; o = x.regex.exec(e); ) {
        const B = o[1].trim();
        if (l = m(B), l === void 0)
          if (typeof u == "function") {
            const C = u(e, o, s);
            l = D(C) ? C : "";
          } else if (s && Object.prototype.hasOwnProperty.call(s, B))
            l = "";
          else if (y) {
            l = o[0];
            continue;
          } else
            this.logger.warn(`missed to pass in variable ${B} for interpolating ${e}`), l = "";
        else !D(l) && !this.useRawValueToEscape && (l = qt(l));
        const v = x.safeValue(l);
        if (e = e.replace(o[0], v), y ? (x.regex.lastIndex += l.length, x.regex.lastIndex -= o[0].length) : x.regex.lastIndex = 0, f++, f >= this.maxReplaces)
          break;
      }
    }), e;
  }
  nest(e, n, i = {}) {
    let s, o, l;
    const f = (p, m) => {
      const u = this.nestingOptionsSeparator;
      if (!p.includes(u)) return p;
      const y = p.split(new RegExp(`${We(u)}[ ]*{`));
      let L = `{${y[1]}`;
      p = y[0], L = this.interpolate(L, l);
      const w = L.match(/'/g), x = L.match(/"/g);
      (((w == null ? void 0 : w.length) ?? 0) % 2 === 0 && !x || ((x == null ? void 0 : x.length) ?? 0) % 2 !== 0) && (L = L.replace(/'/g, '"'));
      try {
        l = JSON.parse(L), m && (l = {
          ...m,
          ...l
        });
      } catch (B) {
        return this.logger.warn(`failed parsing options string in nesting for key ${p}`, B), `${p}${u}${L}`;
      }
      return l.defaultValue && l.defaultValue.includes(this.prefix) && delete l.defaultValue, p;
    };
    for (; s = this.nestingRegexp.exec(e); ) {
      let p = [];
      l = {
        ...i
      }, l = l.replace && !D(l.replace) ? l.replace : l, l.applyPostProcessor = !1, delete l.defaultValue;
      const m = /{.*}/.test(s[1]) ? s[1].lastIndexOf("}") + 1 : s[1].indexOf(this.formatSeparator);
      if (m !== -1 && (p = s[1].slice(m).split(this.formatSeparator).map((u) => u.trim()).filter(Boolean), s[1] = s[1].slice(0, m)), o = n(f.call(this, s[1].trim(), l), l), o && s[0] === e && !D(o)) return o;
      D(o) || (o = qt(o)), o || (this.logger.warn(`missed to resolve ${s[1]} for nesting ${e}`), o = ""), p.length && (o = p.reduce((u, y) => this.format(u, y, i.lng, {
        ...i,
        interpolationkey: s[1].trim()
      }), o.trim())), e = e.replace(s[0], o), this.regexp.lastIndex = 0;
    }
    return e;
  }
}
const Vr = (c) => {
  let e = c.toLowerCase().trim();
  const n = {};
  if (c.includes("(")) {
    const i = c.split("(");
    e = i[0].toLowerCase().trim();
    const s = i[1].slice(0, -1);
    e === "currency" && !s.includes(":") ? n.currency || (n.currency = s.trim()) : e === "relativetime" && !s.includes(":") ? n.range || (n.range = s.trim()) : s.split(";").forEach((l) => {
      if (l) {
        const [f, ...p] = l.split(":"), m = p.join(":").trim().replace(/^'+|'+$/g, ""), u = f.trim();
        n[u] || (n[u] = m), m === "false" && (n[u] = !1), m === "true" && (n[u] = !0), isNaN(m) || (n[u] = parseInt(m, 10));
      }
    });
  }
  return {
    formatName: e,
    formatOptions: n
  };
}, Kt = (c) => {
  const e = {};
  return (n, i, s) => {
    let o = s;
    s && s.interpolationkey && s.formatParams && s.formatParams[s.interpolationkey] && s[s.interpolationkey] && (o = {
      ...o,
      [s.interpolationkey]: void 0
    });
    const l = i + JSON.stringify(o);
    let f = e[l];
    return f || (f = c(ft(i), s), e[l] = f), f(n);
  };
}, Wr = (c) => (e, n, i) => c(ft(n), i)(e);
class Gr {
  constructor(e = {}) {
    this.logger = je.create("formatter"), this.options = e, this.init(e);
  }
  init(e, n = {
    interpolation: {}
  }) {
    this.formatSeparator = n.interpolation.formatSeparator || ",";
    const i = n.cacheInBuiltFormats ? Kt : Wr;
    this.formats = {
      number: i((s, o) => {
        const l = new Intl.NumberFormat(s, {
          ...o
        });
        return (f) => l.format(f);
      }),
      currency: i((s, o) => {
        const l = new Intl.NumberFormat(s, {
          ...o,
          style: "currency"
        });
        return (f) => l.format(f);
      }),
      datetime: i((s, o) => {
        const l = new Intl.DateTimeFormat(s, {
          ...o
        });
        return (f) => l.format(f);
      }),
      relativetime: i((s, o) => {
        const l = new Intl.RelativeTimeFormat(s, {
          ...o
        });
        return (f) => l.format(f, o.range || "day");
      }),
      list: i((s, o) => {
        const l = new Intl.ListFormat(s, {
          ...o
        });
        return (f) => l.format(f);
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
      const f = o.findIndex((p) => p.includes(")"));
      o[0] = [o[0], ...o.splice(1, f)].join(this.formatSeparator);
    }
    return o.reduce((f, p) => {
      var y;
      const {
        formatName: m,
        formatOptions: u
      } = Vr(p);
      if (this.formats[m]) {
        let L = f;
        try {
          const w = ((y = s == null ? void 0 : s.formatParams) == null ? void 0 : y[s.interpolationkey]) || {}, x = w.locale || w.lng || s.locale || s.lng || i;
          L = this.formats[m](f, x, {
            ...u,
            ...s,
            ...w
          });
        } catch (w) {
          this.logger.warn(w);
        }
        return L;
      } else
        this.logger.warn(`there was no format function for ${m}`);
      return f;
    }, e);
  }
}
const Hr = (c, e) => {
  c.pending[e] !== void 0 && (delete c.pending[e], c.pendingCount--);
};
class zr extends _t {
  constructor(e, n, i, s = {}) {
    var o, l;
    super(), this.backend = e, this.store = n, this.services = i, this.languageUtils = i.languageUtils, this.options = s, this.logger = je.create("backendConnector"), this.waitingReads = [], this.maxParallelReads = s.maxParallelReads || 10, this.readingCalls = 0, this.maxRetries = s.maxRetries >= 0 ? s.maxRetries : 5, this.retryTimeout = s.retryTimeout >= 1 ? s.retryTimeout : 350, this.state = {}, this.queue = [], (l = (o = this.backend) == null ? void 0 : o.init) == null || l.call(o, i, s.backend, s);
  }
  queueLoad(e, n, i, s) {
    const o = {}, l = {}, f = {}, p = {};
    return e.forEach((m) => {
      let u = !0;
      n.forEach((y) => {
        const L = `${m}|${y}`;
        !i.reload && this.store.hasResourceBundle(m, y) ? this.state[L] = 2 : this.state[L] < 0 || (this.state[L] === 1 ? l[L] === void 0 && (l[L] = !0) : (this.state[L] = 1, u = !1, l[L] === void 0 && (l[L] = !0), o[L] === void 0 && (o[L] = !0), p[y] === void 0 && (p[y] = !0)));
      }), u || (f[m] = !0);
    }), (Object.keys(o).length || Object.keys(l).length) && this.queue.push({
      pending: l,
      pendingCount: Object.keys(l).length,
      loaded: {},
      errors: [],
      callback: s
    }), {
      toLoad: Object.keys(o),
      pending: Object.keys(l),
      toLoadLanguages: Object.keys(f),
      toLoadNamespaces: Object.keys(p)
    };
  }
  loaded(e, n, i) {
    const s = e.split("|"), o = s[0], l = s[1];
    n && this.emit("failedLoading", o, l, n), !n && i && this.store.addResourceBundle(o, l, i, void 0, void 0, {
      skipCopy: !0
    }), this.state[e] = n ? -1 : 2, n && i && (this.state[e] = 0);
    const f = {};
    this.queue.forEach((p) => {
      Ir(p.loaded, [o], l), Hr(p, e), n && p.errors.push(n), p.pendingCount === 0 && !p.done && (Object.keys(p.loaded).forEach((m) => {
        f[m] || (f[m] = {});
        const u = p.loaded[m];
        u.length && u.forEach((y) => {
          f[m][y] === void 0 && (f[m][y] = !0);
        });
      }), p.done = !0, p.errors.length ? p.callback(p.errors) : p.callback());
    }), this.emit("loaded", f), this.queue = this.queue.filter((p) => !p.done);
  }
  read(e, n, i, s = 0, o = this.retryTimeout, l) {
    if (!e.length) return l(null, {});
    if (this.readingCalls >= this.maxParallelReads) {
      this.waitingReads.push({
        lng: e,
        ns: n,
        fcName: i,
        tried: s,
        wait: o,
        callback: l
      });
      return;
    }
    this.readingCalls++;
    const f = (m, u) => {
      if (this.readingCalls--, this.waitingReads.length > 0) {
        const y = this.waitingReads.shift();
        this.read(y.lng, y.ns, y.fcName, y.tried, y.wait, y.callback);
      }
      if (m && u && s < this.maxRetries) {
        setTimeout(() => {
          this.read(e, n, i, s + 1, o * 2, l);
        }, o);
        return;
      }
      l(m, u);
    }, p = this.backend[i].bind(this.backend);
    if (p.length === 2) {
      try {
        const m = p(e, n);
        m && typeof m.then == "function" ? m.then((u) => f(null, u)).catch(f) : f(null, m);
      } catch (m) {
        f(m);
      }
      return;
    }
    return p(e, n, f);
  }
  prepareLoading(e, n, i = {}, s) {
    if (!this.backend)
      return this.logger.warn("No backend was added via i18next.use. Will not load resources."), s && s();
    D(e) && (e = this.languageUtils.toResolveHierarchy(e)), D(n) && (n = [n]);
    const o = this.queueLoad(e, n, i, s);
    if (!o.toLoad.length)
      return o.pending.length || s(), null;
    o.toLoad.forEach((l) => {
      this.loadOne(l);
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
    this.read(s, o, "read", void 0, void 0, (l, f) => {
      l && this.logger.warn(`${n}loading namespace ${o} for language ${s} failed`, l), !l && f && this.logger.log(`${n}loaded namespace ${o} for language ${s}`, f), this.loaded(e, l, f);
    });
  }
  saveMissing(e, n, i, s, o, l = {}, f = () => {
  }) {
    var p, m, u, y, L;
    if ((m = (p = this.services) == null ? void 0 : p.utils) != null && m.hasLoadedNamespace && !((y = (u = this.services) == null ? void 0 : u.utils) != null && y.hasLoadedNamespace(n))) {
      this.logger.warn(`did not save key "${i}" as the namespace "${n}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
      return;
    }
    if (!(i == null || i === "")) {
      if ((L = this.backend) != null && L.create) {
        const w = {
          ...l,
          isUpdate: o
        }, x = this.backend.create.bind(this.backend);
        if (x.length < 6)
          try {
            let B;
            x.length === 5 ? B = x(e, n, i, s, w) : B = x(e, n, i, s), B && typeof B.then == "function" ? B.then((v) => f(null, v)).catch(f) : f(null, B);
          } catch (B) {
            f(B);
          }
        else
          x(e, n, i, s, f, w);
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
  overloadTranslationOptionHandler: (c) => {
    let e = {};
    if (typeof c[1] == "object" && (e = c[1]), D(c[1]) && (e.defaultValue = c[1]), D(c[2]) && (e.tDescription = c[2]), typeof c[2] == "object" || typeof c[3] == "object") {
      const n = c[3] || c[2];
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
}), Yt = (c) => (D(c.ns) && (c.ns = [c.ns]), D(c.fallbackLng) && (c.fallbackLng = [c.fallbackLng]), D(c.fallbackNS) && (c.fallbackNS = [c.fallbackNS]), c.supportedLngs && !c.supportedLngs.includes("cimode") && (c.supportedLngs = c.supportedLngs.concat(["cimode"])), c), mt = () => {
}, Kr = (c) => {
  Object.getOwnPropertyNames(Object.getPrototypeOf(c)).forEach((n) => {
    typeof c[n] == "function" && (c[n] = c[n].bind(c));
  });
};
class ct extends _t {
  constructor(e = {}, n) {
    if (super(), this.options = Yt(e), this.services = {}, this.logger = je, this.modules = {
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
    this.isInitializing = !0, typeof e == "function" && (n = e, e = {}), e.defaultNS == null && e.ns && (D(e.ns) ? e.defaultNS = e.ns : e.ns.includes("translation") || (e.defaultNS = e.ns[0]));
    const i = Bt();
    this.options = {
      ...i,
      ...this.options,
      ...Yt(e)
    }, this.options.interpolation = {
      ...i.interpolation,
      ...this.options.interpolation
    }, e.keySeparator !== void 0 && (this.options.userDefinedKeySeparator = e.keySeparator), e.nsSeparator !== void 0 && (this.options.userDefinedNsSeparator = e.nsSeparator), typeof this.options.overloadTranslationOptionHandler != "function" && (this.options.overloadTranslationOptionHandler = i.overloadTranslationOptionHandler);
    const s = (m) => m ? typeof m == "function" ? new m() : m : null;
    if (!this.options.isClone) {
      this.modules.logger ? je.init(s(this.modules.logger), this.options) : je.init(null, this.options);
      let m;
      this.modules.formatter ? m = this.modules.formatter : m = Gr;
      const u = new Vt(this.options);
      this.store = new Mt(this.options.resources, this.options);
      const y = this.services;
      y.logger = je, y.resourceStore = this.store, y.languageUtils = u, y.pluralResolver = new Mr(u, {
        prepend: this.options.pluralSeparator
      }), m && (y.formatter = s(m), y.formatter.init && y.formatter.init(y, this.options), this.options.interpolation.format = y.formatter.format.bind(y.formatter)), y.interpolator = new zt(this.options), y.utils = {
        hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
      }, y.backendConnector = new zr(s(this.modules.backend), y.resourceStore, y, this.options), y.backendConnector.on("*", (L, ...w) => {
        this.emit(L, ...w);
      }), this.modules.languageDetector && (y.languageDetector = s(this.modules.languageDetector), y.languageDetector.init && y.languageDetector.init(y, this.options.detection, this.options)), this.modules.i18nFormat && (y.i18nFormat = s(this.modules.i18nFormat), y.i18nFormat.init && y.i18nFormat.init(this)), this.translator = new wt(this.services, this.options), this.translator.on("*", (L, ...w) => {
        this.emit(L, ...w);
      }), this.modules.external.forEach((L) => {
        L.init && L.init(this);
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
    const f = at(), p = () => {
      const m = (u, y) => {
        this.isInitializing = !1, this.isInitialized && !this.initializedStoreOnce && this.logger.warn("init: i18next is already initialized. You should call init just once!"), this.isInitialized = !0, this.options.isClone || this.logger.log("initialized", this.options), this.emit("initialized", this.options), f.resolve(y), n(u, y);
      };
      if ((this.languages || this.isLanguageChangingTo) && !this.isInitialized) return m(null, this.t.bind(this));
      this.changeLanguage(this.options.lng, m);
    };
    return this.options.resources || !this.options.initAsync ? p() : setTimeout(p, 0), f;
  }
  loadResources(e, n = mt) {
    var o, l;
    let i = n;
    const s = D(e) ? e : this.language;
    if (typeof e == "function" && (i = e), !this.options.resources || this.options.partialBundledLanguages) {
      if ((s == null ? void 0 : s.toLowerCase()) === "cimode" && (!this.options.preload || this.options.preload.length === 0)) return i();
      const f = [], p = (m) => {
        if (!m || m === "cimode") return;
        this.services.languageUtils.toResolveHierarchy(m).forEach((y) => {
          y !== "cimode" && (f.includes(y) || f.push(y));
        });
      };
      s ? p(s) : this.services.languageUtils.getFallbackCodes(this.options.fallbackLng).forEach((u) => p(u)), (l = (o = this.options.preload) == null ? void 0 : o.forEach) == null || l.call(o, (m) => p(m)), this.services.backendConnector.load(f, this.options.ns, (m) => {
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
    return e.type === "backend" && (this.modules.backend = e), (e.type === "logger" || e.log && e.warn && e.error) && (this.modules.logger = e), e.type === "languageDetector" && (this.modules.languageDetector = e), e.type === "i18nFormat" && (this.modules.i18nFormat = e), e.type === "postProcessor" && fr.addPostProcessor(e), e.type === "formatter" && (this.modules.formatter = e), e.type === "3rdParty" && this.modules.external.push(e), this;
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
    }, o = (f, p) => {
      p ? this.isLanguageChangingTo === e && (s(p), this.translator.changeLanguage(p), this.isLanguageChangingTo = void 0, this.emit("languageChanged", p), this.logger.log("languageChanged", p)) : this.isLanguageChangingTo = void 0, i.resolve((...m) => this.t(...m)), n && n(f, (...m) => this.t(...m));
    }, l = (f) => {
      var u, y;
      !e && !f && this.services.languageDetector && (f = []);
      const p = D(f) ? f : f && f[0], m = this.store.hasLanguageSomeTranslations(p) ? p : this.services.languageUtils.getBestMatchFromCodes(D(f) ? [f] : f);
      m && (this.language || s(m), this.translator.language || this.translator.changeLanguage(m), (y = (u = this.services.languageDetector) == null ? void 0 : u.cacheUserLanguage) == null || y.call(u, m)), this.loadResources(m, (L) => {
        o(L, m);
      });
    };
    return !e && this.services.languageDetector && !this.services.languageDetector.async ? l(this.services.languageDetector.detect()) : !e && this.services.languageDetector && this.services.languageDetector.async ? this.services.languageDetector.detect.length === 0 ? this.services.languageDetector.detect().then(l) : this.services.languageDetector.detect(l) : l(e), i;
  }
  getFixedT(e, n, i) {
    const s = (o, l, ...f) => {
      let p;
      typeof l != "object" ? p = this.options.overloadTranslationOptionHandler([o, l].concat(f)) : p = {
        ...l
      }, p.lng = p.lng || s.lng, p.lngs = p.lngs || s.lngs, p.ns = p.ns || s.ns, p.keyPrefix !== "" && (p.keyPrefix = p.keyPrefix || i || s.keyPrefix);
      const m = {
        ...this.options,
        ...p
      };
      typeof p.keyPrefix == "function" && (p.keyPrefix = et(p.keyPrefix, m));
      const u = this.options.keySeparator || ".";
      let y;
      return p.keyPrefix && Array.isArray(o) ? y = o.map((L) => (typeof L == "function" && (L = et(L, m)), `${p.keyPrefix}${u}${L}`)) : (typeof o == "function" && (o = et(o, m)), y = p.keyPrefix ? `${p.keyPrefix}${u}${o}` : o), this.t(y, p);
    };
    return D(e) ? s.lng = e : s.lngs = e, s.ns = n, s.keyPrefix = i, s;
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
    const l = (f, p) => {
      const m = this.services.backendConnector.state[`${f}|${p}`];
      return m === -1 || m === 0 || m === 2;
    };
    if (n.precheck) {
      const f = n.precheck(this, l);
      if (f !== void 0) return f;
    }
    return !!(this.hasResourceBundle(i, e) || !this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages || l(i, e) && (!s || l(o, e)));
  }
  loadNamespaces(e, n) {
    const i = at();
    return this.options.ns ? (D(e) && (e = [e]), e.forEach((s) => {
      this.options.ns.includes(s) || this.options.ns.push(s);
    }), this.loadResources((s) => {
      i.resolve(), n && n(s);
    }), i) : (n && n(), Promise.resolve());
  }
  loadLanguages(e, n) {
    const i = at();
    D(e) && (e = [e]);
    const s = this.options.preload || [], o = e.filter((l) => !s.includes(l) && this.services.languageUtils.isSupportedCode(l));
    return o.length ? (this.options.preload = s.concat(o), this.loadResources((l) => {
      i.resolve(), n && n(l);
    }), i) : (n && n(), Promise.resolve());
  }
  dir(e) {
    var s, o;
    if (e || (e = this.resolvedLanguage || (((s = this.languages) == null ? void 0 : s.length) > 0 ? this.languages[0] : this.language)), !e) return "rtl";
    try {
      const l = new Intl.Locale(e);
      if (l && l.getTextInfo) {
        const f = l.getTextInfo();
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
  cloneInstance(e = {}, n = mt) {
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
      const f = Object.keys(this.store.data).reduce((p, m) => (p[m] = {
        ...this.store.data[m]
      }, p[m] = Object.keys(p[m]).reduce((u, y) => (u[y] = {
        ...p[m][y]
      }, u), p[m]), p), {});
      o.store = new Mt(f, s), o.services.resourceStore = o.store;
    }
    if (e.interpolation) {
      const p = {
        ...Bt().interpolation,
        ...this.options.interpolation,
        ...e.interpolation
      }, m = {
        ...s,
        interpolation: p
      };
      o.services.interpolator = new zt(m);
    }
    return o.translator = new wt(o.services, s), o.translator.on("*", (f, ...p) => {
      o.emit(f, ...p);
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
const Te = ct.createInstance(), Yr = Te.createInstance;
Te.dir;
Te.init;
Te.loadResources;
Te.reloadResources;
Te.use;
Te.changeLanguage;
Te.getFixedT;
Te.t;
Te.exists;
Te.setDefaultNamespace;
Te.hasLoadedNamespace;
Te.loadNamespaces;
Te.loadLanguages;
const Jr = "Swap your tokens at the best price", Xr = "Swap your tokens using DinoVox liquidity pools", Zr = "Swap", Qr = "Liquidity", en = "You send", tn = "You receive", rn = "Balance", nn = "Calculating…", sn = "Insufficient balance", an = "⚡ 1:1 conversion — EGLD → WEGLD via the wrap contract", on = "⚡ 1:1 conversion — WEGLD → EGLD via the unwrap contract", ln = "Price impact", cn = "Hops", dn = "Route", un = "Slippage", fn = "Minimum received", pn = "This route has a high price impact — you are paying more than the market price for this token. Try reducing the swap amount for a better rate.", hn = "Add liquidity to this pair →", gn = "Connect your wallet", mn = "Signing…", xn = "Select tokens", bn = "Enter an amount", yn = "Insufficient balance", wn = "Calculating…", _n = "Wrap", kn = "Unwrap", Nn = "Quote unavailable", vn = "Swap", Ln = "Arbitrage", Sn = "Estimated profit", Bn = "No profitable arbitrage opportunity", En = "Opportunity too small to cover slippage", $n = "Amount too low to get a quote", An = "No route available for this pair", Cn = "Amount exceeds available pool liquidity", In = "Unable to get a quote", Tn = "Swap in progress…", Fn = "Swap failed", Rn = "Swap successful!", Pn = "Wrapping…", Dn = "Wrap failed", qn = "Wrap successful!", On = "Unwrapping…", Un = "Unwrap failed", jn = "Unwrap successful!", Mn = "Choose a token", Vn = "Search…", Wn = "Loading…", Gn = "No results", Hn = "Liquidity", zn = "Manage your liquidity pairs", Kn = "Your active liquidity positions", Yn = "Your liquidity positions will appear here.", Jn = "Add liquidity", Xn = "Add", Zn = "Remove", Qn = "Pools", ei = "Liquidity pools referenced by the router", ti = "Loading...", ri = "{{count}} active pool", ni = "{{count}} active pools", ii = "No active pools found.", si = "Reserve", ai = "Active", oi = "+ Add", li = "Create a new pool", ci = "CREATE", di = "New Pool", ui = "Token 1", fi = "Token 2", pi = "Select", hi = "No token in wallet", gi = "LP Name (3-20 characters)", mi = "LP Ticker (3-10 uppercase)", xi = "Step 1: Create the SC Pair", bi = "Step 2: Issue LP Token (0.05 EGLD)", yi = "Transaction in progress…", wi = "Waiting for transaction confirmation…", _i = "Pair created!", ki = "To activate the pool and make it usable, the LP token must be issued. Transaction cost: 0.05 EGLD.", Ni = "Pool Active!", vi = "The pool is ready to receive liquidity.", Li = "Add liquidity", Si = "Creating the pair...", Bi = "Creation failed", Ei = "Pair created! Waiting for synchronization...", $i = "Issuing LP Token...", Ai = "Issuance failed", Ci = "LP Token issued! Pool is now active.", Ii = "Add Liquidity", Ti = "Add liquidity to a pool", Fi = "Add Liquidity", Ri = "Deposit two tokens to provide liquidity and receive LP tokens", Pi = "First Token", Di = "Second Token", qi = "Searching for pool…", Oi = "No pool found", Ui = "You must create this pool before adding liquidity. Activation requires 0.05 EGLD.", ji = "Create pool", Mi = "LP Received (est.)", Vi = "Refund {{ticker}}", Wi = "Minimum deposit too low for the first liquidity.", Gi = "Connect your wallet", Hi = "Pool does not exist", zi = "Pool inactive", Ki = "Insufficient balance", Yi = "Enter amounts", Ji = "Amount too low", Xi = "Add Liquidity", Zi = "Adding liquidity…", Qi = "Adding liquidity failed", es = "Liquidity added!", hr = {
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
  error_amount_too_low: $n,
  error_no_route: An,
  error_insufficient_liquidity: Cn,
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
  create_processing_lp: $i,
  create_error_lp: Ai,
  create_success_lp: Ci,
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
}, ts = "Échangez vos tokens au meilleur prix", rs = "Échangez vos tokens en utilisant les pools de liquidité DinoVox", ns = "Swap", is = "Liquidité", ss = "Vous envoyez", as = "Vous recevez", os = "Balance", ls = "Calcul…", cs = "Solde insuffisant", ds = "⚡ Conversion 1:1 — EGLD → WEGLD via le contrat de wrap", us = "⚡ Conversion 1:1 — WEGLD → EGLD via le contrat de unwrap", fs = "Price impact", ps = "Hops", hs = "Route", gs = "Slippage", ms = "Minimum reçu", xs = "Cette route a un fort impact de prix — vous payez ce token plus cher que son prix de marché. Essayez de réduire le montant échangé pour un meilleur taux.", bs = "Ajouter de la liquidité sur cette paire →", ys = "Connectez votre wallet", ws = "Signature…", _s = "Sélectionnez les tokens", ks = "Entrez un montant", Ns = "Solde insuffisant", vs = "Calcul en cours…", Ls = "Wrapper", Ss = "Unwrapper", Bs = "Quote indisponible", Es = "Swap", $s = "Arbitrage", As = "Profit estimé", Cs = "Aucune opportunité d'arbitrage rentable", Is = "Opportunité trop petite pour couvrir le slippage", Ts = "Montant insuffisant pour obtenir un quote", Fs = "Pas de route disponible pour cette paire", Rs = "Montant supérieur à la liquidité disponible dans les pools", Ps = "Impossible d'obtenir un quote", Ds = "Swap en cours…", qs = "Le swap a échoué", Os = "Swap réussi !", Us = "Wrap en cours…", js = "Le wrap a échoué", Ms = "Wrap réussi !", Vs = "Unwrap en cours…", Ws = "L'unwrap a échoué", Gs = "Unwrap réussi !", Hs = "Choisir un token", zs = "Rechercher…", Ks = "Chargement…", Ys = "Aucun résultat", Js = "Liquidité", Xs = "Gérer vos paires de liquidité", Zs = "Vos positions de liquidité actives", Qs = "Vos positions de liquidité apparaîtront ici.", ea = "Ajouter de la liquidité", ta = "Ajouter", ra = "Retirer", na = "Pools", ia = "Les pools de liquidité référencées par le routeur", sa = "Chargement...", aa = "{{count}} pool active", oa = "{{count}} pools actives", la = "Aucune pool active trouvée.", ca = "Réserve", da = "Active", ua = "+ Ajouter", fa = "Créer une nouvelle pool", pa = "CRÉER", ha = "Nouvelle Pool", ga = "Token 1", ma = "Token 2", xa = "Sélectionner", ba = "Aucun token en portefeuille", ya = "Nom LP (3-20 caractères)", wa = "Ticker LP (3-10 majuscules)", _a = "Étape 1 : Créer la Pair SC", ka = "Étape 2 : Émettre le LP Token (0.05 EGLD)", Na = "Transaction en cours…", va = "En attente de confirmation de la transaction…", La = "La pair est créée !", Sa = "Pour activer la pool et la rendre utilisable, le token LP doit être émis. Coût de la transaction : 0.05 EGLD.", Ba = "Pool Active !", Ea = "La pool est prête à recevoir de la liquidité.", $a = "Ajouter de la liquidité", Aa = "Création de la pair en cours...", Ca = "Création échouée", Ia = "Pair créée ! En attente de synchronisation...", Ta = "Émission du LP Token...", Fa = "Émission échouée", Ra = "Le LP Token a été émis ! Pool active.", Pa = "Ajouter de la liquidité", Da = "Ajouter de la liquidité à une pool", qa = "Ajouter Liquidité", Oa = "Déposez deux tokens pour fournir de la liquidité et recevoir des LP tokens", Ua = "Premier Token", ja = "Deuxième Token", Ma = "Recherche de la pool en cours…", Va = "Aucune pool trouvée", Wa = "Vous devez créer cette pool avant de pouvoir y ajouter de la liquidité. L'activation requiert 0.05 EGLD.", Ga = "Créer la pool", Ha = "LP Reçus (est.)", za = "Remboursement {{ticker}}", Ka = "Dépôt minimum insuffisant pour la première liquidité.", Ya = "Connectez votre wallet", Ja = "Pool inexistante", Xa = "Pool inactive", Za = "Solde insuffisant", Qa = "Renseignez un montant", eo = "Montant trop faible", to = "Ajouter Liquidité", ro = "Ajout de liquidité en cours…", no = "L'ajout a échoué", io = "Liquidité ajoutée !", gr = {
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
  btn_arb: $s,
  arb_profit: As,
  arb_no_opportunity: Cs,
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
  create_add_liquidity: $a,
  create_processing_pair: Aa,
  create_error_pair: Ca,
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
    en: { swap: hr },
    fr: { swap: gr }
  },
  lng: typeof navigator < "u" ? (navigator.language || "en").split("-")[0] : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: !1 },
  react: { useSuspense: !1 }
});
var mr = {}, kt = {};
kt.byteLength = oo;
kt.toByteArray = co;
kt.fromByteArray = po;
var Ue = [], De = [], so = typeof Uint8Array < "u" ? Uint8Array : Array, Et = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (var Ze = 0, ao = Et.length; Ze < ao; ++Ze)
  Ue[Ze] = Et[Ze], De[Et.charCodeAt(Ze)] = Ze;
De[45] = 62;
De[95] = 63;
function xr(c) {
  var e = c.length;
  if (e % 4 > 0)
    throw new Error("Invalid string. Length must be a multiple of 4");
  var n = c.indexOf("=");
  n === -1 && (n = e);
  var i = n === e ? 0 : 4 - n % 4;
  return [n, i];
}
function oo(c) {
  var e = xr(c), n = e[0], i = e[1];
  return (n + i) * 3 / 4 - i;
}
function lo(c, e, n) {
  return (e + n) * 3 / 4 - n;
}
function co(c) {
  var e, n = xr(c), i = n[0], s = n[1], o = new so(lo(c, i, s)), l = 0, f = s > 0 ? i - 4 : i, p;
  for (p = 0; p < f; p += 4)
    e = De[c.charCodeAt(p)] << 18 | De[c.charCodeAt(p + 1)] << 12 | De[c.charCodeAt(p + 2)] << 6 | De[c.charCodeAt(p + 3)], o[l++] = e >> 16 & 255, o[l++] = e >> 8 & 255, o[l++] = e & 255;
  return s === 2 && (e = De[c.charCodeAt(p)] << 2 | De[c.charCodeAt(p + 1)] >> 4, o[l++] = e & 255), s === 1 && (e = De[c.charCodeAt(p)] << 10 | De[c.charCodeAt(p + 1)] << 4 | De[c.charCodeAt(p + 2)] >> 2, o[l++] = e >> 8 & 255, o[l++] = e & 255), o;
}
function uo(c) {
  return Ue[c >> 18 & 63] + Ue[c >> 12 & 63] + Ue[c >> 6 & 63] + Ue[c & 63];
}
function fo(c, e, n) {
  for (var i, s = [], o = e; o < n; o += 3)
    i = (c[o] << 16 & 16711680) + (c[o + 1] << 8 & 65280) + (c[o + 2] & 255), s.push(uo(i));
  return s.join("");
}
function po(c) {
  for (var e, n = c.length, i = n % 3, s = [], o = 16383, l = 0, f = n - i; l < f; l += o)
    s.push(fo(c, l, l + o > f ? f : l + o));
  return i === 1 ? (e = c[n - 1], s.push(
    Ue[e >> 2] + Ue[e << 4 & 63] + "=="
  )) : i === 2 && (e = (c[n - 2] << 8) + c[n - 1], s.push(
    Ue[e >> 10] + Ue[e >> 4 & 63] + Ue[e << 2 & 63] + "="
  )), s.join("");
}
var Ft = {};
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
Ft.read = function(c, e, n, i, s) {
  var o, l, f = s * 8 - i - 1, p = (1 << f) - 1, m = p >> 1, u = -7, y = n ? s - 1 : 0, L = n ? -1 : 1, w = c[e + y];
  for (y += L, o = w & (1 << -u) - 1, w >>= -u, u += f; u > 0; o = o * 256 + c[e + y], y += L, u -= 8)
    ;
  for (l = o & (1 << -u) - 1, o >>= -u, u += i; u > 0; l = l * 256 + c[e + y], y += L, u -= 8)
    ;
  if (o === 0)
    o = 1 - m;
  else {
    if (o === p)
      return l ? NaN : (w ? -1 : 1) * (1 / 0);
    l = l + Math.pow(2, i), o = o - m;
  }
  return (w ? -1 : 1) * l * Math.pow(2, o - i);
};
Ft.write = function(c, e, n, i, s, o) {
  var l, f, p, m = o * 8 - s - 1, u = (1 << m) - 1, y = u >> 1, L = s === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, w = i ? 0 : o - 1, x = i ? 1 : -1, B = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
  for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (f = isNaN(e) ? 1 : 0, l = u) : (l = Math.floor(Math.log(e) / Math.LN2), e * (p = Math.pow(2, -l)) < 1 && (l--, p *= 2), l + y >= 1 ? e += L / p : e += L * Math.pow(2, 1 - y), e * p >= 2 && (l++, p /= 2), l + y >= u ? (f = 0, l = u) : l + y >= 1 ? (f = (e * p - 1) * Math.pow(2, s), l = l + y) : (f = e * Math.pow(2, y - 1) * Math.pow(2, s), l = 0)); s >= 8; c[n + w] = f & 255, w += x, f /= 256, s -= 8)
    ;
  for (l = l << s | f, m += s; m > 0; c[n + w] = l & 255, w += x, l /= 256, m -= 8)
    ;
  c[n + w - x] |= B * 128;
};
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
(function(c) {
  const e = kt, n = Ft, i = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
  c.Buffer = u, c.SlowBuffer = E, c.INSPECT_MAX_BYTES = 50;
  const s = 2147483647;
  c.kMaxLength = s;
  const { Uint8Array: o, ArrayBuffer: l, SharedArrayBuffer: f } = globalThis;
  u.TYPED_ARRAY_SUPPORT = p(), !u.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error(
    "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
  );
  function p() {
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
      return B(a, t);
    if (l.isView(a))
      return C(a);
    if (a == null)
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof a
      );
    if (de(a, l) || a && de(a.buffer, l) || typeof f < "u" && (de(a, f) || a && de(a.buffer, f)))
      return P(a, t, r);
    if (typeof a == "number")
      throw new TypeError(
        'The "value" argument must not be of type number. Received type number'
      );
    const d = a.valueOf && a.valueOf();
    if (d != null && d !== a)
      return u.from(d, t, r);
    const h = k(a);
    if (h) return h;
    if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof a[Symbol.toPrimitive] == "function")
      return u.from(a[Symbol.toPrimitive]("string"), t, r);
    throw new TypeError(
      "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof a
    );
  }
  u.from = function(a, t, r) {
    return y(a, t, r);
  }, Object.setPrototypeOf(u.prototype, o.prototype), Object.setPrototypeOf(u, o);
  function L(a) {
    if (typeof a != "number")
      throw new TypeError('"size" argument must be of type number');
    if (a < 0)
      throw new RangeError('The value "' + a + '" is invalid for option "size"');
  }
  function w(a, t, r) {
    return L(a), a <= 0 ? m(a) : t !== void 0 ? typeof r == "string" ? m(a).fill(t, r) : m(a).fill(t) : m(a);
  }
  u.alloc = function(a, t, r) {
    return w(a, t, r);
  };
  function x(a) {
    return L(a), m(a < 0 ? 0 : A(a) | 0);
  }
  u.allocUnsafe = function(a) {
    return x(a);
  }, u.allocUnsafeSlow = function(a) {
    return x(a);
  };
  function B(a, t) {
    if ((typeof t != "string" || t === "") && (t = "utf8"), !u.isEncoding(t))
      throw new TypeError("Unknown encoding: " + t);
    const r = re(a, t) | 0;
    let d = m(r);
    const h = d.write(a, t);
    return h !== r && (d = d.slice(0, h)), d;
  }
  function v(a) {
    const t = a.length < 0 ? 0 : A(a.length) | 0, r = m(t);
    for (let d = 0; d < t; d += 1)
      r[d] = a[d] & 255;
    return r;
  }
  function C(a) {
    if (de(a, o)) {
      const t = new o(a);
      return P(t.buffer, t.byteOffset, t.byteLength);
    }
    return v(a);
  }
  function P(a, t, r) {
    if (t < 0 || a.byteLength < t)
      throw new RangeError('"offset" is outside of buffer bounds');
    if (a.byteLength < t + (r || 0))
      throw new RangeError('"length" is outside of buffer bounds');
    let d;
    return t === void 0 && r === void 0 ? d = new o(a) : r === void 0 ? d = new o(a, t) : d = new o(a, t, r), Object.setPrototypeOf(d, u.prototype), d;
  }
  function k(a) {
    if (u.isBuffer(a)) {
      const t = A(a.length) | 0, r = m(t);
      return r.length === 0 || a.copy(r, 0, 0, t), r;
    }
    if (a.length !== void 0)
      return typeof a.length != "number" || Pe(a.length) ? m(0) : v(a);
    if (a.type === "Buffer" && Array.isArray(a.data))
      return v(a.data);
  }
  function A(a) {
    if (a >= s)
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + s.toString(16) + " bytes");
    return a | 0;
  }
  function E(a) {
    return +a != a && (a = 0), u.alloc(+a);
  }
  u.isBuffer = function(t) {
    return t != null && t._isBuffer === !0 && t !== u.prototype;
  }, u.compare = function(t, r) {
    if (de(t, o) && (t = u.from(t, t.offset, t.byteLength)), de(r, o) && (r = u.from(r, r.offset, r.byteLength)), !u.isBuffer(t) || !u.isBuffer(r))
      throw new TypeError(
        'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
      );
    if (t === r) return 0;
    let d = t.length, h = r.length;
    for (let b = 0, N = Math.min(d, h); b < N; ++b)
      if (t[b] !== r[b]) {
        d = t[b], h = r[b];
        break;
      }
    return d < h ? -1 : h < d ? 1 : 0;
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
    const h = u.allocUnsafe(r);
    let b = 0;
    for (d = 0; d < t.length; ++d) {
      let N = t[d];
      if (de(N, o))
        b + N.length > h.length ? (u.isBuffer(N) || (N = u.from(N)), N.copy(h, b)) : o.prototype.set.call(
          h,
          N,
          b
        );
      else if (u.isBuffer(N))
        N.copy(h, b);
      else
        throw new TypeError('"list" argument must be an Array of Buffers');
      b += N.length;
    }
    return h;
  };
  function re(a, t) {
    if (u.isBuffer(a))
      return a.length;
    if (l.isView(a) || de(a, l))
      return a.byteLength;
    if (typeof a != "string")
      throw new TypeError(
        'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof a
      );
    const r = a.length, d = arguments.length > 2 && arguments[2] === !0;
    if (!d && r === 0) return 0;
    let h = !1;
    for (; ; )
      switch (t) {
        case "ascii":
        case "latin1":
        case "binary":
          return r;
        case "utf8":
        case "utf-8":
          return Ve(a).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return r * 2;
        case "hex":
          return r >>> 1;
        case "base64":
          return M(a).length;
        default:
          if (h)
            return d ? -1 : Ve(a).length;
          t = ("" + t).toLowerCase(), h = !0;
      }
  }
  u.byteLength = re;
  function Z(a, t, r) {
    let d = !1;
    if ((t === void 0 || t < 0) && (t = 0), t > this.length || ((r === void 0 || r > this.length) && (r = this.length), r <= 0) || (r >>>= 0, t >>>= 0, r <= t))
      return "";
    for (a || (a = "utf8"); ; )
      switch (a) {
        case "hex":
          return ke(this, t, r);
        case "utf8":
        case "utf-8":
          return le(this, t, r);
        case "ascii":
          return ce(this, t, r);
        case "latin1":
        case "binary":
          return ie(this, t, r);
        case "base64":
          return j(this, t, r);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return Ne(this, t, r);
        default:
          if (d) throw new TypeError("Unknown encoding: " + a);
          a = (a + "").toLowerCase(), d = !0;
      }
  }
  u.prototype._isBuffer = !0;
  function W(a, t, r) {
    const d = a[t];
    a[t] = a[r], a[r] = d;
  }
  u.prototype.swap16 = function() {
    const t = this.length;
    if (t % 2 !== 0)
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    for (let r = 0; r < t; r += 2)
      W(this, r, r + 1);
    return this;
  }, u.prototype.swap32 = function() {
    const t = this.length;
    if (t % 4 !== 0)
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    for (let r = 0; r < t; r += 4)
      W(this, r, r + 3), W(this, r + 1, r + 2);
    return this;
  }, u.prototype.swap64 = function() {
    const t = this.length;
    if (t % 8 !== 0)
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    for (let r = 0; r < t; r += 8)
      W(this, r, r + 7), W(this, r + 1, r + 6), W(this, r + 2, r + 5), W(this, r + 3, r + 4);
    return this;
  }, u.prototype.toString = function() {
    const t = this.length;
    return t === 0 ? "" : arguments.length === 0 ? le(this, 0, t) : Z.apply(this, arguments);
  }, u.prototype.toLocaleString = u.prototype.toString, u.prototype.equals = function(t) {
    if (!u.isBuffer(t)) throw new TypeError("Argument must be a Buffer");
    return this === t ? !0 : u.compare(this, t) === 0;
  }, u.prototype.inspect = function() {
    let t = "";
    const r = c.INSPECT_MAX_BYTES;
    return t = this.toString("hex", 0, r).replace(/(.{2})/g, "$1 ").trim(), this.length > r && (t += " ... "), "<Buffer " + t + ">";
  }, i && (u.prototype[i] = u.prototype.inspect), u.prototype.compare = function(t, r, d, h, b) {
    if (de(t, o) && (t = u.from(t, t.offset, t.byteLength)), !u.isBuffer(t))
      throw new TypeError(
        'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof t
      );
    if (r === void 0 && (r = 0), d === void 0 && (d = t ? t.length : 0), h === void 0 && (h = 0), b === void 0 && (b = this.length), r < 0 || d > t.length || h < 0 || b > this.length)
      throw new RangeError("out of range index");
    if (h >= b && r >= d)
      return 0;
    if (h >= b)
      return -1;
    if (r >= d)
      return 1;
    if (r >>>= 0, d >>>= 0, h >>>= 0, b >>>= 0, this === t) return 0;
    let N = b - h, G = d - r;
    const ue = Math.min(N, G), ee = this.slice(h, b), fe = t.slice(r, d);
    for (let te = 0; te < ue; ++te)
      if (ee[te] !== fe[te]) {
        N = ee[te], G = fe[te];
        break;
      }
    return N < G ? -1 : G < N ? 1 : 0;
  };
  function $(a, t, r, d, h) {
    if (a.length === 0) return -1;
    if (typeof r == "string" ? (d = r, r = 0) : r > 2147483647 ? r = 2147483647 : r < -2147483648 && (r = -2147483648), r = +r, Pe(r) && (r = h ? 0 : a.length - 1), r < 0 && (r = a.length + r), r >= a.length) {
      if (h) return -1;
      r = a.length - 1;
    } else if (r < 0)
      if (h) r = 0;
      else return -1;
    if (typeof t == "string" && (t = u.from(t, d)), u.isBuffer(t))
      return t.length === 0 ? -1 : z(a, t, r, d, h);
    if (typeof t == "number")
      return t = t & 255, typeof o.prototype.indexOf == "function" ? h ? o.prototype.indexOf.call(a, t, r) : o.prototype.lastIndexOf.call(a, t, r) : z(a, [t], r, d, h);
    throw new TypeError("val must be string, number or Buffer");
  }
  function z(a, t, r, d, h) {
    let b = 1, N = a.length, G = t.length;
    if (d !== void 0 && (d = String(d).toLowerCase(), d === "ucs2" || d === "ucs-2" || d === "utf16le" || d === "utf-16le")) {
      if (a.length < 2 || t.length < 2)
        return -1;
      b = 2, N /= 2, G /= 2, r /= 2;
    }
    function ue(fe, te) {
      return b === 1 ? fe[te] : fe.readUInt16BE(te * b);
    }
    let ee;
    if (h) {
      let fe = -1;
      for (ee = r; ee < N; ee++)
        if (ue(a, ee) === ue(t, fe === -1 ? 0 : ee - fe)) {
          if (fe === -1 && (fe = ee), ee - fe + 1 === G) return fe * b;
        } else
          fe !== -1 && (ee -= ee - fe), fe = -1;
    } else
      for (r + G > N && (r = N - G), ee = r; ee >= 0; ee--) {
        let fe = !0;
        for (let te = 0; te < G; te++)
          if (ue(a, ee + te) !== ue(t, te)) {
            fe = !1;
            break;
          }
        if (fe) return ee;
      }
    return -1;
  }
  u.prototype.includes = function(t, r, d) {
    return this.indexOf(t, r, d) !== -1;
  }, u.prototype.indexOf = function(t, r, d) {
    return $(this, t, r, d, !0);
  }, u.prototype.lastIndexOf = function(t, r, d) {
    return $(this, t, r, d, !1);
  };
  function me(a, t, r, d) {
    r = Number(r) || 0;
    const h = a.length - r;
    d ? (d = Number(d), d > h && (d = h)) : d = h;
    const b = t.length;
    d > b / 2 && (d = b / 2);
    let N;
    for (N = 0; N < d; ++N) {
      const G = parseInt(t.substr(N * 2, 2), 16);
      if (Pe(G)) return N;
      a[r + N] = G;
    }
    return N;
  }
  function X(a, t, r, d) {
    return se(Ve(t, a.length - r), a, r, d);
  }
  function K(a, t, r, d) {
    return se(U(t), a, r, d);
  }
  function I(a, t, r, d) {
    return se(M(t), a, r, d);
  }
  function q(a, t, r, d) {
    return se(V(t, a.length - r), a, r, d);
  }
  u.prototype.write = function(t, r, d, h) {
    if (r === void 0)
      h = "utf8", d = this.length, r = 0;
    else if (d === void 0 && typeof r == "string")
      h = r, d = this.length, r = 0;
    else if (isFinite(r))
      r = r >>> 0, isFinite(d) ? (d = d >>> 0, h === void 0 && (h = "utf8")) : (h = d, d = void 0);
    else
      throw new Error(
        "Buffer.write(string, encoding, offset[, length]) is no longer supported"
      );
    const b = this.length - r;
    if ((d === void 0 || d > b) && (d = b), t.length > 0 && (d < 0 || r < 0) || r > this.length)
      throw new RangeError("Attempt to write outside buffer bounds");
    h || (h = "utf8");
    let N = !1;
    for (; ; )
      switch (h) {
        case "hex":
          return me(this, t, r, d);
        case "utf8":
        case "utf-8":
          return X(this, t, r, d);
        case "ascii":
        case "latin1":
        case "binary":
          return K(this, t, r, d);
        case "base64":
          return I(this, t, r, d);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return q(this, t, r, d);
        default:
          if (N) throw new TypeError("Unknown encoding: " + h);
          h = ("" + h).toLowerCase(), N = !0;
      }
  }, u.prototype.toJSON = function() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function j(a, t, r) {
    return t === 0 && r === a.length ? e.fromByteArray(a) : e.fromByteArray(a.slice(t, r));
  }
  function le(a, t, r) {
    r = Math.min(a.length, r);
    const d = [];
    let h = t;
    for (; h < r; ) {
      const b = a[h];
      let N = null, G = b > 239 ? 4 : b > 223 ? 3 : b > 191 ? 2 : 1;
      if (h + G <= r) {
        let ue, ee, fe, te;
        switch (G) {
          case 1:
            b < 128 && (N = b);
            break;
          case 2:
            ue = a[h + 1], (ue & 192) === 128 && (te = (b & 31) << 6 | ue & 63, te > 127 && (N = te));
            break;
          case 3:
            ue = a[h + 1], ee = a[h + 2], (ue & 192) === 128 && (ee & 192) === 128 && (te = (b & 15) << 12 | (ue & 63) << 6 | ee & 63, te > 2047 && (te < 55296 || te > 57343) && (N = te));
            break;
          case 4:
            ue = a[h + 1], ee = a[h + 2], fe = a[h + 3], (ue & 192) === 128 && (ee & 192) === 128 && (fe & 192) === 128 && (te = (b & 15) << 18 | (ue & 63) << 12 | (ee & 63) << 6 | fe & 63, te > 65535 && te < 1114112 && (N = te));
        }
      }
      N === null ? (N = 65533, G = 1) : N > 65535 && (N -= 65536, d.push(N >>> 10 & 1023 | 55296), N = 56320 | N & 1023), d.push(N), h += G;
    }
    return _e(d);
  }
  const ge = 4096;
  function _e(a) {
    const t = a.length;
    if (t <= ge)
      return String.fromCharCode.apply(String, a);
    let r = "", d = 0;
    for (; d < t; )
      r += String.fromCharCode.apply(
        String,
        a.slice(d, d += ge)
      );
    return r;
  }
  function ce(a, t, r) {
    let d = "";
    r = Math.min(a.length, r);
    for (let h = t; h < r; ++h)
      d += String.fromCharCode(a[h] & 127);
    return d;
  }
  function ie(a, t, r) {
    let d = "";
    r = Math.min(a.length, r);
    for (let h = t; h < r; ++h)
      d += String.fromCharCode(a[h]);
    return d;
  }
  function ke(a, t, r) {
    const d = a.length;
    (!t || t < 0) && (t = 0), (!r || r < 0 || r > d) && (r = d);
    let h = "";
    for (let b = t; b < r; ++b)
      h += $e[a[b]];
    return h;
  }
  function Ne(a, t, r) {
    const d = a.slice(t, r);
    let h = "";
    for (let b = 0; b < d.length - 1; b += 2)
      h += String.fromCharCode(d[b] + d[b + 1] * 256);
    return h;
  }
  u.prototype.slice = function(t, r) {
    const d = this.length;
    t = ~~t, r = r === void 0 ? d : ~~r, t < 0 ? (t += d, t < 0 && (t = 0)) : t > d && (t = d), r < 0 ? (r += d, r < 0 && (r = 0)) : r > d && (r = d), r < t && (r = t);
    const h = this.subarray(t, r);
    return Object.setPrototypeOf(h, u.prototype), h;
  };
  function Y(a, t, r) {
    if (a % 1 !== 0 || a < 0) throw new RangeError("offset is not uint");
    if (a + t > r) throw new RangeError("Trying to access beyond buffer length");
  }
  u.prototype.readUintLE = u.prototype.readUIntLE = function(t, r, d) {
    t = t >>> 0, r = r >>> 0, d || Y(t, r, this.length);
    let h = this[t], b = 1, N = 0;
    for (; ++N < r && (b *= 256); )
      h += this[t + N] * b;
    return h;
  }, u.prototype.readUintBE = u.prototype.readUIntBE = function(t, r, d) {
    t = t >>> 0, r = r >>> 0, d || Y(t, r, this.length);
    let h = this[t + --r], b = 1;
    for (; r > 0 && (b *= 256); )
      h += this[t + --r] * b;
    return h;
  }, u.prototype.readUint8 = u.prototype.readUInt8 = function(t, r) {
    return t = t >>> 0, r || Y(t, 1, this.length), this[t];
  }, u.prototype.readUint16LE = u.prototype.readUInt16LE = function(t, r) {
    return t = t >>> 0, r || Y(t, 2, this.length), this[t] | this[t + 1] << 8;
  }, u.prototype.readUint16BE = u.prototype.readUInt16BE = function(t, r) {
    return t = t >>> 0, r || Y(t, 2, this.length), this[t] << 8 | this[t + 1];
  }, u.prototype.readUint32LE = u.prototype.readUInt32LE = function(t, r) {
    return t = t >>> 0, r || Y(t, 4, this.length), (this[t] | this[t + 1] << 8 | this[t + 2] << 16) + this[t + 3] * 16777216;
  }, u.prototype.readUint32BE = u.prototype.readUInt32BE = function(t, r) {
    return t = t >>> 0, r || Y(t, 4, this.length), this[t] * 16777216 + (this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3]);
  }, u.prototype.readBigUInt64LE = Le(function(t) {
    t = t >>> 0, xe(t, "offset");
    const r = this[t], d = this[t + 7];
    (r === void 0 || d === void 0) && ve(t, this.length - 8);
    const h = r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24, b = this[++t] + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + d * 2 ** 24;
    return BigInt(h) + (BigInt(b) << BigInt(32));
  }), u.prototype.readBigUInt64BE = Le(function(t) {
    t = t >>> 0, xe(t, "offset");
    const r = this[t], d = this[t + 7];
    (r === void 0 || d === void 0) && ve(t, this.length - 8);
    const h = r * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t], b = this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + d;
    return (BigInt(h) << BigInt(32)) + BigInt(b);
  }), u.prototype.readIntLE = function(t, r, d) {
    t = t >>> 0, r = r >>> 0, d || Y(t, r, this.length);
    let h = this[t], b = 1, N = 0;
    for (; ++N < r && (b *= 256); )
      h += this[t + N] * b;
    return b *= 128, h >= b && (h -= Math.pow(2, 8 * r)), h;
  }, u.prototype.readIntBE = function(t, r, d) {
    t = t >>> 0, r = r >>> 0, d || Y(t, r, this.length);
    let h = r, b = 1, N = this[t + --h];
    for (; h > 0 && (b *= 256); )
      N += this[t + --h] * b;
    return b *= 128, N >= b && (N -= Math.pow(2, 8 * r)), N;
  }, u.prototype.readInt8 = function(t, r) {
    return t = t >>> 0, r || Y(t, 1, this.length), this[t] & 128 ? (255 - this[t] + 1) * -1 : this[t];
  }, u.prototype.readInt16LE = function(t, r) {
    t = t >>> 0, r || Y(t, 2, this.length);
    const d = this[t] | this[t + 1] << 8;
    return d & 32768 ? d | 4294901760 : d;
  }, u.prototype.readInt16BE = function(t, r) {
    t = t >>> 0, r || Y(t, 2, this.length);
    const d = this[t + 1] | this[t] << 8;
    return d & 32768 ? d | 4294901760 : d;
  }, u.prototype.readInt32LE = function(t, r) {
    return t = t >>> 0, r || Y(t, 4, this.length), this[t] | this[t + 1] << 8 | this[t + 2] << 16 | this[t + 3] << 24;
  }, u.prototype.readInt32BE = function(t, r) {
    return t = t >>> 0, r || Y(t, 4, this.length), this[t] << 24 | this[t + 1] << 16 | this[t + 2] << 8 | this[t + 3];
  }, u.prototype.readBigInt64LE = Le(function(t) {
    t = t >>> 0, xe(t, "offset");
    const r = this[t], d = this[t + 7];
    (r === void 0 || d === void 0) && ve(t, this.length - 8);
    const h = this[t + 4] + this[t + 5] * 2 ** 8 + this[t + 6] * 2 ** 16 + (d << 24);
    return (BigInt(h) << BigInt(32)) + BigInt(r + this[++t] * 2 ** 8 + this[++t] * 2 ** 16 + this[++t] * 2 ** 24);
  }), u.prototype.readBigInt64BE = Le(function(t) {
    t = t >>> 0, xe(t, "offset");
    const r = this[t], d = this[t + 7];
    (r === void 0 || d === void 0) && ve(t, this.length - 8);
    const h = (r << 24) + // Overflow
    this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + this[++t];
    return (BigInt(h) << BigInt(32)) + BigInt(this[++t] * 2 ** 24 + this[++t] * 2 ** 16 + this[++t] * 2 ** 8 + d);
  }), u.prototype.readFloatLE = function(t, r) {
    return t = t >>> 0, r || Y(t, 4, this.length), n.read(this, t, !0, 23, 4);
  }, u.prototype.readFloatBE = function(t, r) {
    return t = t >>> 0, r || Y(t, 4, this.length), n.read(this, t, !1, 23, 4);
  }, u.prototype.readDoubleLE = function(t, r) {
    return t = t >>> 0, r || Y(t, 8, this.length), n.read(this, t, !0, 52, 8);
  }, u.prototype.readDoubleBE = function(t, r) {
    return t = t >>> 0, r || Y(t, 8, this.length), n.read(this, t, !1, 52, 8);
  };
  function Q(a, t, r, d, h, b) {
    if (!u.isBuffer(a)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (t > h || t < b) throw new RangeError('"value" argument is out of bounds');
    if (r + d > a.length) throw new RangeError("Index out of range");
  }
  u.prototype.writeUintLE = u.prototype.writeUIntLE = function(t, r, d, h) {
    if (t = +t, r = r >>> 0, d = d >>> 0, !h) {
      const G = Math.pow(2, 8 * d) - 1;
      Q(this, t, r, d, G, 0);
    }
    let b = 1, N = 0;
    for (this[r] = t & 255; ++N < d && (b *= 256); )
      this[r + N] = t / b & 255;
    return r + d;
  }, u.prototype.writeUintBE = u.prototype.writeUIntBE = function(t, r, d, h) {
    if (t = +t, r = r >>> 0, d = d >>> 0, !h) {
      const G = Math.pow(2, 8 * d) - 1;
      Q(this, t, r, d, G, 0);
    }
    let b = d - 1, N = 1;
    for (this[r + b] = t & 255; --b >= 0 && (N *= 256); )
      this[r + b] = t / N & 255;
    return r + d;
  }, u.prototype.writeUint8 = u.prototype.writeUInt8 = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 1, 255, 0), this[r] = t & 255, r + 1;
  }, u.prototype.writeUint16LE = u.prototype.writeUInt16LE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 2, 65535, 0), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
  }, u.prototype.writeUint16BE = u.prototype.writeUInt16BE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 2, 65535, 0), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
  }, u.prototype.writeUint32LE = u.prototype.writeUInt32LE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 4, 4294967295, 0), this[r + 3] = t >>> 24, this[r + 2] = t >>> 16, this[r + 1] = t >>> 8, this[r] = t & 255, r + 4;
  }, u.prototype.writeUint32BE = u.prototype.writeUInt32BE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 4, 4294967295, 0), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
  };
  function we(a, t, r, d, h) {
    Oe(t, d, h, a, r, 7);
    let b = Number(t & BigInt(4294967295));
    a[r++] = b, b = b >> 8, a[r++] = b, b = b >> 8, a[r++] = b, b = b >> 8, a[r++] = b;
    let N = Number(t >> BigInt(32) & BigInt(4294967295));
    return a[r++] = N, N = N >> 8, a[r++] = N, N = N >> 8, a[r++] = N, N = N >> 8, a[r++] = N, r;
  }
  function Ie(a, t, r, d, h) {
    Oe(t, d, h, a, r, 7);
    let b = Number(t & BigInt(4294967295));
    a[r + 7] = b, b = b >> 8, a[r + 6] = b, b = b >> 8, a[r + 5] = b, b = b >> 8, a[r + 4] = b;
    let N = Number(t >> BigInt(32) & BigInt(4294967295));
    return a[r + 3] = N, N = N >> 8, a[r + 2] = N, N = N >> 8, a[r + 1] = N, N = N >> 8, a[r] = N, r + 8;
  }
  u.prototype.writeBigUInt64LE = Le(function(t, r = 0) {
    return we(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
  }), u.prototype.writeBigUInt64BE = Le(function(t, r = 0) {
    return Ie(this, t, r, BigInt(0), BigInt("0xffffffffffffffff"));
  }), u.prototype.writeIntLE = function(t, r, d, h) {
    if (t = +t, r = r >>> 0, !h) {
      const ue = Math.pow(2, 8 * d - 1);
      Q(this, t, r, d, ue - 1, -ue);
    }
    let b = 0, N = 1, G = 0;
    for (this[r] = t & 255; ++b < d && (N *= 256); )
      t < 0 && G === 0 && this[r + b - 1] !== 0 && (G = 1), this[r + b] = (t / N >> 0) - G & 255;
    return r + d;
  }, u.prototype.writeIntBE = function(t, r, d, h) {
    if (t = +t, r = r >>> 0, !h) {
      const ue = Math.pow(2, 8 * d - 1);
      Q(this, t, r, d, ue - 1, -ue);
    }
    let b = d - 1, N = 1, G = 0;
    for (this[r + b] = t & 255; --b >= 0 && (N *= 256); )
      t < 0 && G === 0 && this[r + b + 1] !== 0 && (G = 1), this[r + b] = (t / N >> 0) - G & 255;
    return r + d;
  }, u.prototype.writeInt8 = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 1, 127, -128), t < 0 && (t = 255 + t + 1), this[r] = t & 255, r + 1;
  }, u.prototype.writeInt16LE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 2, 32767, -32768), this[r] = t & 255, this[r + 1] = t >>> 8, r + 2;
  }, u.prototype.writeInt16BE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 2, 32767, -32768), this[r] = t >>> 8, this[r + 1] = t & 255, r + 2;
  }, u.prototype.writeInt32LE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 4, 2147483647, -2147483648), this[r] = t & 255, this[r + 1] = t >>> 8, this[r + 2] = t >>> 16, this[r + 3] = t >>> 24, r + 4;
  }, u.prototype.writeInt32BE = function(t, r, d) {
    return t = +t, r = r >>> 0, d || Q(this, t, r, 4, 2147483647, -2147483648), t < 0 && (t = 4294967295 + t + 1), this[r] = t >>> 24, this[r + 1] = t >>> 16, this[r + 2] = t >>> 8, this[r + 3] = t & 255, r + 4;
  }, u.prototype.writeBigInt64LE = Le(function(t, r = 0) {
    return we(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  }), u.prototype.writeBigInt64BE = Le(function(t, r = 0) {
    return Ie(this, t, r, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  });
  function R(a, t, r, d, h, b) {
    if (r + d > a.length) throw new RangeError("Index out of range");
    if (r < 0) throw new RangeError("Index out of range");
  }
  function H(a, t, r, d, h) {
    return t = +t, r = r >>> 0, h || R(a, t, r, 4), n.write(a, t, r, d, 23, 4), r + 4;
  }
  u.prototype.writeFloatLE = function(t, r, d) {
    return H(this, t, r, !0, d);
  }, u.prototype.writeFloatBE = function(t, r, d) {
    return H(this, t, r, !1, d);
  };
  function O(a, t, r, d, h) {
    return t = +t, r = r >>> 0, h || R(a, t, r, 8), n.write(a, t, r, d, 52, 8), r + 8;
  }
  u.prototype.writeDoubleLE = function(t, r, d) {
    return O(this, t, r, !0, d);
  }, u.prototype.writeDoubleBE = function(t, r, d) {
    return O(this, t, r, !1, d);
  }, u.prototype.copy = function(t, r, d, h) {
    if (!u.isBuffer(t)) throw new TypeError("argument should be a Buffer");
    if (d || (d = 0), !h && h !== 0 && (h = this.length), r >= t.length && (r = t.length), r || (r = 0), h > 0 && h < d && (h = d), h === d || t.length === 0 || this.length === 0) return 0;
    if (r < 0)
      throw new RangeError("targetStart out of bounds");
    if (d < 0 || d >= this.length) throw new RangeError("Index out of range");
    if (h < 0) throw new RangeError("sourceEnd out of bounds");
    h > this.length && (h = this.length), t.length - r < h - d && (h = t.length - r + d);
    const b = h - d;
    return this === t && typeof o.prototype.copyWithin == "function" ? this.copyWithin(r, d, h) : o.prototype.set.call(
      t,
      this.subarray(d, h),
      r
    ), b;
  }, u.prototype.fill = function(t, r, d, h) {
    if (typeof t == "string") {
      if (typeof r == "string" ? (h = r, r = 0, d = this.length) : typeof d == "string" && (h = d, d = this.length), h !== void 0 && typeof h != "string")
        throw new TypeError("encoding must be a string");
      if (typeof h == "string" && !u.isEncoding(h))
        throw new TypeError("Unknown encoding: " + h);
      if (t.length === 1) {
        const N = t.charCodeAt(0);
        (h === "utf8" && N < 128 || h === "latin1") && (t = N);
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
      const N = u.isBuffer(t) ? t : u.from(t, h), G = N.length;
      if (G === 0)
        throw new TypeError('The value "' + t + '" is invalid for argument "value"');
      for (b = 0; b < d - r; ++b)
        this[b + r] = N[b % G];
    }
    return this;
  };
  const ae = {};
  function Fe(a, t, r) {
    ae[a] = class extends r {
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
      set code(h) {
        Object.defineProperty(this, "code", {
          configurable: !0,
          enumerable: !0,
          value: h,
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
      let d = `The value of "${a}" is out of range.`, h = r;
      return Number.isInteger(r) && Math.abs(r) > 2 ** 32 ? h = Re(String(r)) : typeof r == "bigint" && (h = String(r), (r > BigInt(2) ** BigInt(32) || r < -(BigInt(2) ** BigInt(32))) && (h = Re(h)), h += "n"), d += ` It must be ${t}. Received ${h}`, d;
    },
    RangeError
  );
  function Re(a) {
    let t = "", r = a.length;
    const d = a[0] === "-" ? 1 : 0;
    for (; r >= d + 4; r -= 3)
      t = `_${a.slice(r - 3, r)}${t}`;
    return `${a.slice(0, r)}${t}`;
  }
  function He(a, t, r) {
    xe(t, "offset"), (a[t] === void 0 || a[t + r] === void 0) && ve(t, a.length - (r + 1));
  }
  function Oe(a, t, r, d, h, b) {
    if (a > r || a < t) {
      const N = typeof t == "bigint" ? "n" : "";
      let G;
      throw t === 0 || t === BigInt(0) ? G = `>= 0${N} and < 2${N} ** ${(b + 1) * 8}${N}` : G = `>= -(2${N} ** ${(b + 1) * 8 - 1}${N}) and < 2 ** ${(b + 1) * 8 - 1}${N}`, new ae.ERR_OUT_OF_RANGE("value", G, a);
    }
    He(d, h, b);
  }
  function xe(a, t) {
    if (typeof a != "number")
      throw new ae.ERR_INVALID_ARG_TYPE(t, "number", a);
  }
  function ve(a, t, r) {
    throw Math.floor(a) !== a ? (xe(a, r), new ae.ERR_OUT_OF_RANGE("offset", "an integer", a)) : t < 0 ? new ae.ERR_BUFFER_OUT_OF_BOUNDS() : new ae.ERR_OUT_OF_RANGE(
      "offset",
      `>= 0 and <= ${t}`,
      a
    );
  }
  const Be = /[^+/0-9A-Za-z-_]/g;
  function Ye(a) {
    if (a = a.split("=")[0], a = a.trim().replace(Be, ""), a.length < 2) return "";
    for (; a.length % 4 !== 0; )
      a = a + "=";
    return a;
  }
  function Ve(a, t) {
    t = t || 1 / 0;
    let r;
    const d = a.length;
    let h = null;
    const b = [];
    for (let N = 0; N < d; ++N) {
      if (r = a.charCodeAt(N), r > 55295 && r < 57344) {
        if (!h) {
          if (r > 56319) {
            (t -= 3) > -1 && b.push(239, 191, 189);
            continue;
          } else if (N + 1 === d) {
            (t -= 3) > -1 && b.push(239, 191, 189);
            continue;
          }
          h = r;
          continue;
        }
        if (r < 56320) {
          (t -= 3) > -1 && b.push(239, 191, 189), h = r;
          continue;
        }
        r = (h - 55296 << 10 | r - 56320) + 65536;
      } else h && (t -= 3) > -1 && b.push(239, 191, 189);
      if (h = null, r < 128) {
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
  function U(a) {
    const t = [];
    for (let r = 0; r < a.length; ++r)
      t.push(a.charCodeAt(r) & 255);
    return t;
  }
  function V(a, t) {
    let r, d, h;
    const b = [];
    for (let N = 0; N < a.length && !((t -= 2) < 0); ++N)
      r = a.charCodeAt(N), d = r >> 8, h = r % 256, b.push(h), b.push(d);
    return b;
  }
  function M(a) {
    return e.toByteArray(Ye(a));
  }
  function se(a, t, r, d) {
    let h;
    for (h = 0; h < d && !(h + r >= t.length || h >= a.length); ++h)
      t[h + r] = a[h];
    return h;
  }
  function de(a, t) {
    return a instanceof t || a != null && a.constructor != null && a.constructor.name != null && a.constructor.name === t.name;
  }
  function Pe(a) {
    return a !== a;
  }
  const $e = function() {
    const a = "0123456789abcdef", t = new Array(256);
    for (let r = 0; r < 16; ++r) {
      const d = r * 16;
      for (let h = 0; h < 16; ++h)
        t[d + h] = a[r] + a[h];
    }
    return t;
  }();
  function Le(a) {
    return typeof BigInt > "u" ? be : a;
  }
  function be() {
    throw new Error("BigInt not supported");
  }
})(mr);
const Nt = mr.Buffer;
function st() {
  const c = dr(), e = Me();
  return c ? c.navigate : e.navigate ?? ((n) => {
    window.location.assign(n);
  });
}
function vt() {
  const c = dr();
  if (c) {
    const i = c.setParams ?? ((s, o) => {
      const l = s(new URLSearchParams(window.location.search)), f = new URL(window.location.href);
      f.search = l.toString(), o != null && o.replace ? window.history.replaceState({}, "", f.toString()) : window.history.pushState({}, "", f.toString());
    });
    return [c.params, i];
  }
  return [new URLSearchParams(window.location.search), (i, s) => {
    const o = i(new URLSearchParams(window.location.search)), l = new URL(window.location.href);
    l.search = o.toString(), s != null && s.replace ? window.history.replaceState({}, "", l.toString()) : window.history.pushState({}, "", l.toString());
  }];
}
const ho = {
  en: hr,
  fr: gr
}, ht = (c) => {
  const { i18n: e } = Ke();
  ne(() => {
    typeof (e == null ? void 0 : e.hasResourceBundle) == "function" && Object.entries(ho).forEach(([n, i]) => {
      e.hasResourceBundle(n, c) || e.addResourceBundle(n, c, i, !0, !1);
    });
  }, [c]);
}, nt = async ({
  transactions: c,
  transactionsDisplayInfo: e
}) => {
  const n = Br(), i = Er.getInstance(), s = await n.signTransactions(c), o = await i.send(s);
  return await i.track(o, {
    transactionsDisplayInfo: e
  });
}, ze = (c, e) => {
  const { network: n } = Je(), [i, s] = F([]), { address: o } = sr(), l = (e == null ? void 0 : e.enabled) ?? !0, p = $r().length > 0, m = async () => {
    if (!(!l || p || !o))
      try {
        if (c) {
          const { data: w } = await he.get(`/accounts/${o}/tokens`, {
            baseURL: n.apiAddress,
            params: { size: 1e3, identifier: c }
          });
          s(w);
          return;
        }
        const y = [];
        let L = 0;
        for (; ; ) {
          const { data: w } = await he.get(`/accounts/${o}/tokens`, {
            baseURL: n.apiAddress,
            params: { size: 1e3, from: L }
          });
          if (y.push(...w), w.length < 1e3) break;
          L += 1e3;
        }
        s(y);
      } catch {
        s([]);
      }
  };
  return ne(() => {
    if (!l || !o) {
      s([]);
      return;
    }
    m();
  }, [o, p, c, l]), i;
}, gt = ({ id: c, title: e, children: n, description: i, reference: s, className: o = "", onClick: l }) => {
  const { theme: f } = Me(), p = o.includes("border") ? "" : "border border-gray-100 dark:border-[#333]";
  return /* @__PURE__ */ _(
    "div",
    {
      id: c,
      onClick: l,
      style: f === "dark" ? { backgroundColor: "#111", color: "#fff" } : f === "light" ? { backgroundColor: "#ffffff", color: "#111" } : {},
      className: `flex flex-col bg-[#ffffff] dark:bg-[#111] p-6 rounded-2xl shadow-sm transition-all ${p} ${o}`,
      children: [
        /* @__PURE__ */ _("div", { className: "flex items-start justify-between gap-3", children: [
          /* @__PURE__ */ g("h2", { className: "text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase", children: e }),
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
        i ? /* @__PURE__ */ g("p", { className: "mt-1.5 text-sm leading-relaxed text-gray-500 dark:text-gray-400 font-medium", children: i }) : null,
        i && n ? /* @__PURE__ */ g("div", { className: "my-4 h-px bg-gray-100 dark:bg-[#333]" }) : /* @__PURE__ */ g("div", { className: "mt-3" }),
        n
      ]
    }
  );
};
function Jt({ url: c, ticker: e }) {
  const [n, i] = F(!1);
  return !c || n ? /* @__PURE__ */ g("span", { className: "w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300 shrink-0", children: e.slice(0, 2) }) : /* @__PURE__ */ g(
    "img",
    {
      src: c,
      alt: e,
      className: "w-6 h-6 rounded-full object-contain shrink-0",
      onError: () => i(!0)
    }
  );
}
function it({
  value: c,
  onChange: e,
  tokens: n,
  exclude: i,
  loading: s,
  className: o = ""
}) {
  const { t: l } = Ke("swap"), { theme: f } = Me(), p = f === "dark", m = f === "light", [u, y] = F(!1), [L, w] = F(""), x = ut(null), B = ut(null), v = p ? { backgroundColor: "#2a2a2a", color: "#fff", borderColor: "#444" } : m ? { backgroundColor: "#ffffff", color: "#111", borderColor: "#e5e7eb" } : {}, C = p ? { backgroundColor: "#2a2a2a", borderColor: "#444" } : m ? { backgroundColor: "#ffffff", borderColor: "#e5e7eb" } : {}, P = p ? { backgroundColor: "#1e1e1e", color: "#fff", borderColor: "#555" } : m ? { backgroundColor: "#f9fafb", color: "#111", borderColor: "#e5e7eb" } : {}, k = n.filter((A) => A.identifier !== i).filter((A) => {
    if (!L) return !0;
    const E = L.toLowerCase();
    return A.ticker.toLowerCase().includes(E) || A.identifier.toLowerCase().includes(E);
  });
  return ne(() => {
    if (!u) {
      w("");
      return;
    }
    setTimeout(() => {
      var E;
      return (E = B.current) == null ? void 0 : E.focus();
    }, 50);
    const A = (E) => {
      x.current && !x.current.contains(E.target) && y(!1);
    };
    return document.addEventListener("mousedown", A), () => document.removeEventListener("mousedown", A);
  }, [u]), /* @__PURE__ */ _("div", { ref: x, className: `relative flex-1 ${o}`, children: [
    /* @__PURE__ */ _(
      "button",
      {
        type: "button",
        disabled: s,
        onClick: () => y((A) => !A),
        style: v,
        className: "w-full flex items-center gap-2 rounded-xl border border-gray-200 dark:border-[#444] bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50",
        children: [
          s ? /* @__PURE__ */ g("span", { className: "flex-1 text-left text-gray-400", children: l("token_loading") }) : c ? /* @__PURE__ */ _(dt, { children: [
            /* @__PURE__ */ g(Jt, { url: c.logoUrl, ticker: c.ticker }),
            /* @__PURE__ */ g("span", { className: "flex-1 text-left", children: c.ticker })
          ] }) : /* @__PURE__ */ g("span", { className: "flex-1 text-left text-gray-400", children: l("token_select") }),
          /* @__PURE__ */ g(
            "svg",
            {
              className: `w-4 h-4 text-gray-400 transition-transform shrink-0 ${u ? "rotate-180" : ""}`,
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
    u && /* @__PURE__ */ _(
      "div",
      {
        style: C,
        className: "absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-[#444] bg-[#ffffff] dark:bg-[#2a2a2a] shadow-lg overflow-hidden",
        children: [
          /* @__PURE__ */ g("div", { className: "px-2 pt-2 pb-1", children: /* @__PURE__ */ g(
            "input",
            {
              ref: B,
              type: "text",
              value: L,
              onChange: (A) => w(A.target.value),
              placeholder: l("token_search"),
              style: P,
              className: "w-full rounded-lg border border-gray-200 dark:border-[#555] bg-gray-50 dark:bg-[#1e1e1e] px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            }
          ) }),
          /* @__PURE__ */ g("div", { className: "max-h-52 overflow-y-auto", children: k.length === 0 ? /* @__PURE__ */ g("p", { className: "px-3 py-3 text-sm text-gray-400 text-center", children: l("token_no_results") }) : k.map((A) => /* @__PURE__ */ _(
            "button",
            {
              type: "button",
              onClick: () => {
                e(A), y(!1);
              },
              style: (c == null ? void 0 : c.identifier) === A.identifier ? p ? { backgroundColor: "#333", color: "#f59e0b" } : {} : p ? { color: "#fff" } : {},
              className: `w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-amber-50 dark:hover:bg-[#333] ${(c == null ? void 0 : c.identifier) === A.identifier ? "bg-amber-50 dark:bg-[#333] text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"}`,
              children: [
                /* @__PURE__ */ g(Jt, { url: A.logoUrl, ticker: A.ticker }),
                /* @__PURE__ */ g("span", { className: "flex-1 text-left", children: A.ticker }),
                /* @__PURE__ */ g("span", { className: "text-[10px] text-gray-400 font-normal", children: A.identifier.split("-")[1] ?? "" })
              ]
            },
            A.identifier
          )) })
        ]
      }
    )
  ] });
}
const Ge = (c) => {
  let n = BigInt(c).toString(16);
  return n.length % 2 && (n = "0" + n), n;
}, Xt = [5e-3, 0.01, 0.02], Zt = {
  identifier: "EGLD",
  ticker: "EGLD",
  poolCount: 0,
  decimals: 18,
  logoUrl: null
}, Qt = (c) => Nt.from(c, "utf8").toString("hex"), go = (c, e) => BigInt(
  new S(c).multipliedBy(1 - e).toFixed(0, S.ROUND_DOWN)
), mo = () => {
  var Rt, Pt, Dt;
  const {
    apiUrl: c,
    routerAddress: e,
    aggregatorAddress: n,
    wrapContract: i,
    wegldIdentifier: s,
    routes: o
  } = Me(), { t: l } = Ke("swap");
  ht("swap");
  const { address: f } = pt(), { account: p } = sr(), { network: m } = Je(), [u, y] = vt(), L = st(), [w, x] = F([]), [B, v] = F(/* @__PURE__ */ new Set()), [C, P] = F(!0), [k, A] = F(null), [E, re] = F(null), Z = ut(!1), [W, $] = F(""), [z, me] = F(""), [X, K] = F("in"), [I, q] = F(null), [j, le] = F(!1), [ge, _e] = F(null), [ce, ie] = F(null), [ke, Ne] = F(!1), [Y, Q] = F(null), we = !!(k && E && k.identifier === E.identifier), [Ie, R] = F(0.01), [H, O] = F(!1), [ae, Fe] = F(null), Re = ut(null), [He, Oe] = F(!1), xe = (k == null ? void 0 : k.identifier) === "EGLD", ve = ze(
    xe || k == null ? void 0 : k.identifier,
    { enabled: !!k && !xe && !!f }
  );
  ne(() => {
    Oe(!!(k && f));
  }, [k == null ? void 0 : k.identifier]), ne(() => {
    Oe(!1);
  }, [ve]);
  const Be = xe ? (p == null ? void 0 : p.balance) ?? null : ((Rt = ve == null ? void 0 : ve[0]) == null ? void 0 : Rt.balance) ?? null, Ye = Be && k ? new S(Be).shiftedBy(-k.decimals).toFixed(6, S.ROUND_DOWN) : null, Ve = !He && f && k ? Be ?? "0" : Be, U = X === "out" && I ? I.amountIn : X === "in" && W ? new S(W).shiftedBy((k == null ? void 0 : k.decimals) ?? 18).toFixed(0, S.ROUND_DOWN) : null, V = Ve && U ? new S(U).isGreaterThan(Ve) : !1, M = (E == null ? void 0 : E.identifier) === "EGLD", se = ze(
    M || E == null ? void 0 : E.identifier,
    { enabled: !!E && !M && !!f }
  ), de = M ? (p == null ? void 0 : p.balance) ?? null : ((Pt = se == null ? void 0 : se[0]) == null ? void 0 : Pt.balance) ?? null, Pe = de && E ? new S(de).shiftedBy(-E.decimals).toFixed(6, S.ROUND_DOWN) : null, $e = (k == null ? void 0 : k.identifier) === "EGLD" && (E == null ? void 0 : E.identifier) === s, Le = (k == null ? void 0 : k.identifier) === s && (E == null ? void 0 : E.identifier) === "EGLD", be = $e || Le, a = () => {
    !Be || !k || (K("in"), me(""), $(
      new S(Be).shiftedBy(-k.decimals).toFixed(k.decimals, S.ROUND_DOWN)
    ));
  };
  ne(() => {
    c && (P(!0), Promise.all([
      he.get(`${c}/tokens`),
      he.get(`${c}/tokens/hub`).catch(() => ({ data: { hubTokens: [] } }))
    ]).then(([T, oe]) => {
      var Se;
      const ye = (T.data.tokens || []).filter((Ee) => Ee.identifier), J = ye.find((Ee) => Ee.ticker === "WEGLD");
      x([
        { ...Zt, logoUrl: (J == null ? void 0 : J.logoUrl) ?? null },
        ...ye
      ]);
      const pe = (((Se = oe.data) == null ? void 0 : Se.hubTokens) ?? []).map(
        (Ee) => Ee.identifier
      );
      v(new Set(pe));
    }).catch(() => x([Zt])).finally(() => P(!1)));
  }, [c]), ne(() => {
    if (w.length === 0 || Z.current) return;
    Z.current = !0;
    const T = u.get("from"), oe = u.get("to"), ye = T ? w.find((pe) => pe.identifier === T) : null, J = oe ? w.find((pe) => pe.identifier === oe) : null;
    ye && A(ye), J && re(J), Z.current = !0;
  }, [w, C]), ne(() => {
    Z.current && y(
      (T) => {
        const oe = new URLSearchParams(T);
        return k ? oe.set("from", k.identifier) : oe.delete("from"), E ? oe.set("to", E.identifier) : oe.delete("to"), oe;
      },
      { replace: !0 }
    );
  }, [k, E]);
  const t = Ct(async () => {
    var J, pe, Se, Ee;
    if (be) {
      q(null), _e(null), ie(null), Q(null);
      return;
    }
    if (!k || !E) {
      q(null), _e(null), ie(null), Q(null);
      return;
    }
    if (we) {
      q(null), _e(null), Ne(!0), Q(null);
      try {
        const Ae = {
          token: k.identifier,
          slippageBps: Math.round(Ie * 1e4)
        };
        W && Number(W) > 0 && (Ae.amountIn = new S(W).shiftedBy(k.decimals).toFixed(0, S.ROUND_DOWN));
        const { data: Xe } = await he.get(`${c}/arb`, {
          params: Ae
        });
        ie(Xe), (!W || Number(W) <= 0) && $(
          new S(Xe.amountIn).shiftedBy(-k.decimals).toFixed(6, S.ROUND_DOWN)
        );
      } catch {
        ie(null);
      } finally {
        Ne(!1);
      }
      return;
    }
    const T = X === "in" ? W : z;
    if (!T || Number(T) <= 0) {
      q(null), _e(null);
      return;
    }
    const oe = X === "in" ? k : E, ye = new S(T).shiftedBy(oe.decimals).toFixed(0, S.ROUND_DOWN);
    le(!0), _e(null);
    try {
      const { data: Ae } = await he.get(`${c}/quote`, {
        params: {
          tokenIn: k.identifier,
          tokenOut: E.identifier,
          ...X === "in" ? { amountIn: ye } : { amountOut: ye },
          slippageBps: Math.round(Ie * 1e4)
        }
      });
      q(Ae);
    } catch (Ae) {
      const Xe = (pe = (J = Ae == null ? void 0 : Ae.response) == null ? void 0 : J.data) == null ? void 0 : pe.code;
      _e(
        Xe === "AMOUNT_TOO_LOW" ? l("error_amount_too_low") : Xe === "NO_ROUTE" ? l("error_no_route") : Xe === "INSUFFICIENT_LIQUIDITY" ? l("error_insufficient_liquidity") : ((Ee = (Se = Ae == null ? void 0 : Ae.response) == null ? void 0 : Se.data) == null ? void 0 : Ee.message) ?? l("error_quote")
      ), q(null);
    } finally {
      le(!1);
    }
  }, [k, E, W, z, X, we, be, Ie]);
  ne(() => (Re.current && clearTimeout(Re.current), Re.current = setTimeout(t, 300), () => {
    Re.current && clearTimeout(Re.current);
  }), [t]);
  const r = () => {
    A(E), re(k), X === "in" ? (K("out"), me(W), $("")) : (K("in"), $(z), me("")), q(null);
  }, d = async () => {
    if (!(!k || !f) && !(we && !ce) && !(!we && !I)) {
      Fe(null), O(!0);
      try {
        const { tx: T } = we ? ce : I;
        if (![e, n].map(
          (J) => J.toLowerCase()
        ).includes(T.scAddress.toLowerCase())) {
          Fe(`Receiver refusé : ${T.scAddress}`);
          return;
        }
        const ye = new tt({
          value: BigInt(T.egldValue),
          data: new TextEncoder().encode(T.txData),
          receiver: new qe(T.scAddress),
          sender: new qe(f),
          gasLimit: BigInt(T.gasLimit),
          gasPrice: BigInt(rt),
          chainID: m.chainId,
          version: 1
        });
        await nt({
          transactions: [ye],
          transactionsDisplayInfo: {
            processingMessage: l("processing"),
            errorMessage: l("error_tx"),
            successMessage: l("success_tx")
          }
        }), $(""), me(""), K("in"), q(null), ie(null);
      } catch (T) {
        Fe((T == null ? void 0 : T.message) ?? "Erreur lors du swap");
      } finally {
        O(!1);
      }
    }
  }, h = X === "in" ? W : z, b = be ? h ? new S(h).toFixed(6, S.ROUND_DOWN) : "" : X === "out" ? z : we && ce ? new S(ce.amountOut).shiftedBy(-((k == null ? void 0 : k.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : I ? new S(I.amountOut).shiftedBy(-((E == null ? void 0 : E.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : "", N = X === "out" && !be && I ? new S(I.amountIn).shiftedBy(-((k == null ? void 0 : k.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : W, G = ce ? new S(ce.profit).shiftedBy(-((k == null ? void 0 : k.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : null, ue = I && !be ? new S(go(I.amountOut, Ie).toString()).shiftedBy(-((E == null ? void 0 : E.decimals) ?? 18)).toFixed(6, S.ROUND_DOWN) : null, ee = I ? (parseFloat(I.priceImpact) * 100).toFixed(2) : null, fe = ee ? parseFloat(ee) < 1 ? "text-green-600 dark:text-green-400" : parseFloat(ee) < 3 ? "text-amber-500 dark:text-amber-400" : "text-red-600 dark:text-red-400" : "", te = be ? !!f && !H && !V && !!h && Number(h) > 0 : we ? !!ce && !!f && !H && !ke && !Y && !V : !!I && !!f && !H && !j && !ge && !V, br = (E == null ? void 0 : E.identifier) === "EGLD", yr = async () => {
    const T = X === "out" ? z : W;
    if (!(!k || !f || !T || Number(T) <= 0)) {
      Fe(null), O(!0);
      try {
        const oe = new qe(f), ye = BigInt(
          new S(T).shiftedBy(18).toFixed(0, S.ROUND_DOWN)
        ), J = new qe(i);
        let pe, Se, Ee;
        $e ? (Se = J, Ee = ye, pe = "wrapEgld") : (Se = oe, Ee = BigInt(0), pe = [
          "MultiESDTNFTTransfer",
          J.toHex(),
          "01",
          Qt(s),
          "00",
          Ge(ye),
          Qt("unwrapEgld")
        ].join("@"));
        const Ae = new tt({
          value: Ee,
          data: new TextEncoder().encode(pe),
          receiver: Se,
          sender: oe,
          gasLimit: BigInt(3e6),
          gasPrice: BigInt(rt),
          chainID: m.chainId,
          version: 1
        });
        await nt({
          transactions: [Ae],
          transactionsDisplayInfo: {
            processingMessage: l($e ? "processing_wrap" : "processing_unwrap"),
            errorMessage: l($e ? "error_wrap" : "error_unwrap"),
            successMessage: l($e ? "success_wrap" : "success_unwrap")
          }
        }), $(""), me(""), K("in");
      } catch (oe) {
        Fe((oe == null ? void 0 : oe.message) ?? "Erreur");
      } finally {
        O(!1);
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
        /* @__PURE__ */ _("div", { className: "flex gap-1.5 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl shadow-inner w-full xs:w-auto", children: [
          /* @__PURE__ */ g("button", { className: "flex-1 xs:flex-initial px-4 sm:px-6 py-2 text-sm font-black rounded-lg bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md transition-all", children: l("tab_swap") }),
          /* @__PURE__ */ g(
            "button",
            {
              onClick: () => L(o.liquidity),
              className: "flex-1 xs:flex-initial px-4 sm:px-6 py-2 text-sm font-bold rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all hover:bg-white/50 dark:hover:bg-white/5",
              children: l("tab_liquidity")
            }
          )
        ] })
      ] }),
      description: l("card_description"),
      children: /* @__PURE__ */ _("div", { className: "space-y-2 mt-4", children: [
        /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: l("you_send") }),
              k && /* @__PURE__ */ _(
                "a",
                {
                  href: `${m.explorerAddress}/tokens/${k.identifier}`,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors",
                  children: [
                    k.ticker,
                    " ↗"
                  ]
                }
              )
            ] }),
            j && X === "out" && /* @__PURE__ */ g("span", { className: "text-[10px] text-gray-400 animate-pulse uppercase tracking-wider", children: l("calculating") }),
            f && Ye && /* @__PURE__ */ _(
              "button",
              {
                onClick: a,
                className: "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-600 transition-colors",
                children: [
                  /* @__PURE__ */ _("span", { className: "text-gray-400", children: [
                    l("balance"),
                    " :"
                  ] }),
                  Ye,
                  /* @__PURE__ */ g("span", { className: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold", children: "MAX" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ g(
              it,
              {
                value: k,
                onChange: (T) => {
                  A(T), q(null);
                },
                tokens: w,
                exclude: void 0,
                loading: C
              }
            ),
            /* @__PURE__ */ g(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: N,
                onChange: (T) => {
                  K("in"), $(T.target.value), me(""), q(null);
                },
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${V ? "border-red-400 dark:border-red-500 focus:ring-red-400" : X === "in" ? "border-amber-400 dark:border-amber-500 focus:ring-amber-500" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] }),
          V && /* @__PURE__ */ g("p", { className: "mt-2 text-[10px] font-semibold text-red-500 text-right", children: l("insufficient_balance") })
        ] }),
        /* @__PURE__ */ g("div", { className: "flex justify-center -my-0.5 relative z-10", children: /* @__PURE__ */ g(
          "button",
          {
            onClick: r,
            className: "rounded-full p-2 bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#444] shadow-sm hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors",
            children: /* @__PURE__ */ g(Nr, { className: "h-4 w-4 text-amber-500" })
          }
        ) }),
        /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: l("you_receive") }),
              E && /* @__PURE__ */ _(
                "a",
                {
                  href: `${m.explorerAddress}/tokens/${E.identifier}`,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline transition-colors",
                  children: [
                    E.ticker,
                    " ↗"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              j && X === "in" && /* @__PURE__ */ g("span", { className: "text-[10px] text-gray-400 animate-pulse uppercase tracking-wider", children: l("calculating") }),
              f && Pe && /* @__PURE__ */ _("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: [
                l("balance"),
                " :",
                " ",
                /* @__PURE__ */ g("span", { className: "text-amber-500", children: Pe })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ g(
              it,
              {
                value: E,
                onChange: (T) => {
                  re(T), q(null);
                },
                tokens: w,
                exclude: void 0,
                loading: C
              }
            ),
            /* @__PURE__ */ g(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: b,
                onChange: (T) => {
                  K("out"), me(T.target.value), $(""), q(null);
                },
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-colors ${X === "out" ? "border-amber-400 dark:border-amber-500 focus:ring-amber-500" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] })
        ] }),
        be && !!W && Number(W) > 0 && /* @__PURE__ */ g("div", { className: "rounded-2xl border border-cyan-200 dark:border-cyan-800/50 bg-cyan-50 dark:bg-cyan-900/10 px-4 py-3 text-sm text-cyan-700 dark:text-cyan-400", children: l($e ? "wrap_info" : "unwrap_info") }),
        !be && I && !j && /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] px-4 py-3 space-y-2.5 text-sm", children: [
          /* @__PURE__ */ _("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500 dark:text-gray-400", children: l("price_impact") }),
            /* @__PURE__ */ _("span", { className: `font-semibold ${fe}`, children: [
              ee,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500 dark:text-gray-400", children: l("hops") }),
            /* @__PURE__ */ g("span", { className: "font-medium text-gray-900 dark:text-white", children: I.hops })
          ] }),
          /* @__PURE__ */ _("div", { className: "pt-2 border-t border-gray-100 dark:border-[#2a2a2a]", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-2", children: l("route") }),
            /* @__PURE__ */ _("div", { className: "flex items-center flex-wrap gap-0", children: [
              /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: (k == null ? void 0 : k.ticker) ?? ((Dt = I.route[0]) == null ? void 0 : Dt.tokenIn) }),
              xe && /* @__PURE__ */ _(Ce.Fragment, { children: [
                /* @__PURE__ */ _("div", { className: "flex flex-col items-center mx-1", children: [
                  /* @__PURE__ */ g("span", { className: "text-[9px] font-bold text-gray-400", children: "wrap" }),
                  /* @__PURE__ */ _("div", { className: "flex items-center gap-0.5", children: [
                    /* @__PURE__ */ g("div", { className: "h-px w-4 bg-gray-300 dark:bg-gray-600" }),
                    /* @__PURE__ */ g("span", { className: "text-[10px] leading-none text-gray-400", children: "▶" })
                  ] })
                ] }),
                /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: "WEGLD" })
              ] }),
              I.route.map((T, oe) => {
                var Ee;
                const ye = ((Ee = w.find((Ae) => Ae.identifier === T.tokenOut)) == null ? void 0 : Ee.ticker) ?? T.tokenOut, pe = (T.priceImpact ? parseFloat(T.priceImpact) * 100 : 0) >= 5, Se = T.dexType === "XExchange" ? {
                  line: "bg-blue-400 dark:bg-blue-500",
                  label: "text-blue-600 dark:text-blue-400",
                  name: "XExchange"
                } : T.dexType === "JExchange" ? {
                  line: "bg-green-400 dark:bg-green-500",
                  label: "text-green-600 dark:text-green-400",
                  name: "JExchange"
                } : {
                  line: "bg-amber-400 dark:bg-amber-500",
                  label: "text-amber-600 dark:text-amber-400",
                  name: "DinoVox"
                };
                return /* @__PURE__ */ _(Ce.Fragment, { children: [
                  /* @__PURE__ */ _("div", { className: "flex flex-col items-center mx-1", children: [
                    /* @__PURE__ */ _(
                      "a",
                      {
                        href: `${m.explorerAddress}/accounts/${T.pair}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: `text-[9px] font-bold hover:underline ${pe ? "text-red-500" : Se.label}`,
                        title: T.pair,
                        children: [
                          Se.name,
                          " ↗"
                        ]
                      }
                    ),
                    /* @__PURE__ */ _("div", { className: "flex items-center gap-0.5", children: [
                      /* @__PURE__ */ g(
                        "div",
                        {
                          className: `h-px w-4 ${pe ? "bg-red-500" : Se.line}`
                        }
                      ),
                      /* @__PURE__ */ g(
                        "span",
                        {
                          className: `text-[10px] leading-none ${pe ? "text-red-500" : Se.label}`,
                          children: pe ? "⚠" : "▶"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-200", children: ye })
                ] }, oe);
              }),
              br && /* @__PURE__ */ _(Ce.Fragment, { children: [
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
              const T = I.route.filter(
                (J) => J.priceImpact && parseFloat(J.priceImpact) * 100 >= 5
              );
              if (T.length === 0) return null;
              const oe = T.some(
                (J) => J.dexType === "DinoVox" || !J.dexType
              ), ye = T.find(
                (J) => J.dexType === "DinoVox" || !J.dexType
              );
              return /* @__PURE__ */ _("div", { className: "mt-2 flex flex-col gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-3 py-2 text-xs text-red-600 dark:text-red-400", children: [
                /* @__PURE__ */ _("div", { className: "flex items-start gap-2", children: [
                  /* @__PURE__ */ g("span", { className: "mt-0.5 shrink-0", children: "⚠" }),
                  /* @__PURE__ */ g("span", { children: l("high_impact_warning") })
                ] }),
                oe && ye && (() => {
                  const J = ye.tokenIn, pe = ye.tokenOut, [Se, Ee] = B.has(pe) && !B.has(J) ? [pe, J] : [J, pe];
                  return /* @__PURE__ */ g(
                    "button",
                    {
                      onClick: () => L(
                        `${o.addLiquidity}?tokenA=${Se}&tokenB=${Ee}`
                      ),
                      className: "self-start underline font-semibold hover:text-red-700 dark:hover:text-red-300 transition",
                      children: l("add_liquidity_cta")
                    }
                  );
                })()
              ] });
            })()
          ] }),
          /* @__PURE__ */ _("div", { className: "pt-2 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500 dark:text-gray-400", children: l("slippage") }),
            /* @__PURE__ */ g("div", { className: "flex gap-1", children: Xt.map((T) => /* @__PURE__ */ _(
              "button",
              {
                onClick: () => R(T),
                className: `px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${Ie === T ? "bg-yellow-500 text-white" : "bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-gray-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"}`,
                children: [
                  (T * 100).toFixed(1),
                  "%"
                ]
              },
              T
            )) })
          ] }),
          /* @__PURE__ */ _("div", { className: "pt-2 border-t border-gray-100 dark:border-[#2a2a2a] flex items-center justify-between", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500 dark:text-gray-400", children: l("min_received") }),
            /* @__PURE__ */ _("span", { className: "font-semibold text-gray-900 dark:text-white", children: [
              ue,
              " ",
              /* @__PURE__ */ g("span", { className: "text-gray-400 text-xs", children: E == null ? void 0 : E.ticker })
            ] })
          ] })
        ] }),
        we && ce && !ke && /* @__PURE__ */ _("div", { className: "rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10 px-4 py-3 space-y-2.5 text-sm", children: [
          /* @__PURE__ */ _("div", { className: "flex justify-between items-center", children: [
            /* @__PURE__ */ g("span", { className: "text-green-700 dark:text-green-400 font-semibold", children: l("arb_profit") }),
            /* @__PURE__ */ _("span", { className: "font-bold text-green-600 dark:text-green-400", children: [
              "+",
              G,
              " ",
              k == null ? void 0 : k.ticker,
              " (",
              (ce.profitBps / 100).toFixed(2),
              "%)"
            ] })
          ] }),
          ce.route && ce.route.length > 0 && /* @__PURE__ */ _("div", { className: "pt-2 border-t border-green-200 dark:border-green-800/50", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] uppercase tracking-wider font-semibold text-green-700/60 dark:text-green-400/60 mb-2", children: l("route") }),
            /* @__PURE__ */ _("div", { className: "flex items-center flex-wrap gap-0", children: [
              /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200", children: k == null ? void 0 : k.ticker }),
              ce.route.map((T, oe) => {
                var pe;
                const ye = ((pe = w.find((Se) => Se.identifier === T.tokenOut)) == null ? void 0 : pe.ticker) ?? T.tokenOut.split("-")[0], J = T.dexType === "XExchange" ? {
                  line: "bg-blue-400",
                  label: "text-blue-600 dark:text-blue-400",
                  name: "XExchange"
                } : T.dexType === "JExchange" ? {
                  line: "bg-purple-400",
                  label: "text-purple-600 dark:text-purple-400",
                  name: "JExchange"
                } : {
                  line: "bg-green-400",
                  label: "text-green-600 dark:text-green-400",
                  name: "DinoVox"
                };
                return /* @__PURE__ */ _(Ce.Fragment, { children: [
                  /* @__PURE__ */ _("div", { className: "flex flex-col items-center mx-1", children: [
                    /* @__PURE__ */ _(
                      "a",
                      {
                        href: `${m.explorerAddress}/accounts/${T.pair}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: `text-[9px] font-bold hover:underline ${J.label}`,
                        title: T.pair,
                        children: [
                          J.name,
                          " ↗"
                        ]
                      }
                    ),
                    /* @__PURE__ */ _("div", { className: "flex items-center gap-0.5", children: [
                      /* @__PURE__ */ g("div", { className: `h-px w-4 ${J.line}` }),
                      /* @__PURE__ */ g(
                        "span",
                        {
                          className: `text-[10px] leading-none ${J.label}`,
                          children: "▶"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ g("span", { className: "text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200", children: ye })
                ] }, oe);
              })
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "pt-2 border-t border-green-200 dark:border-green-800/50 flex items-center justify-between", children: [
            /* @__PURE__ */ g("span", { className: "text-green-700/70 dark:text-green-400/70", children: l("slippage") }),
            /* @__PURE__ */ g("div", { className: "flex gap-1", children: Xt.map((T) => /* @__PURE__ */ _(
              "button",
              {
                onClick: () => R(T),
                className: `px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${Ie === T ? "bg-green-500 text-white" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"}`,
                children: [
                  (T * 100).toFixed(1),
                  "%"
                ]
              },
              T
            )) })
          ] })
        ] }),
        we && ke && /* @__PURE__ */ g("div", { className: "text-center text-xs text-gray-400 animate-pulse py-2", children: l("calculating") }),
        (!be && !we && ge || we && Y || ae) && /* @__PURE__ */ g("div", { className: "rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 px-4 py-3 text-sm text-red-600 dark:text-red-400", children: we ? Y : ge ?? ae }),
        /* @__PURE__ */ g(
          "button",
          {
            onClick: be ? yr : d,
            disabled: !te,
            className: `dinoButton orange w-full !py-3 text-base ${!k || !E ? "!bg-orange-400 dark:!bg-orange-500 !border-orange-600 dark:!border-orange-700 !text-orange-950 dark:!text-orange-950 font-bold !opacity-100 hover:!bg-orange-500 hover:!border-orange-700 dark:hover:!bg-orange-400" : "disabled:opacity-40 disabled:cursor-not-allowed"}`,
            children: f ? H ? l("btn_signing") : !k || !E ? l("btn_select_tokens") : V ? l("btn_insufficient") : we ? l(ke ? "btn_calculating" : Y ? "btn_quote_unavailable" : "btn_arb") : !W || Number(W) <= 0 ? l("btn_enter_amount") : l(j ? "btn_calculating" : be ? $e ? "btn_wrap" : "btn_unwrap" : ge ? "btn_quote_unavailable" : "btn_swap") : l("btn_connect")
          }
        )
      ] })
    }
  ) });
}, xo = () => {
  const { apiUrl: c, routes: e } = Me(), { t: n } = Ke("swap");
  ht("swap");
  const i = st(), { address: s } = pt(), { network: o } = Je(), [l, f] = Ce.useState([]), [p, m] = Ce.useState(!0), [u, y] = Ce.useState([]);
  Ce.useEffect(() => {
    c && (m(!0), he.get(`${c}/pools`).then((w) => {
      f(w.data.pools || []);
    }).catch(console.error).finally(() => m(!1)));
  }, [c]);
  const L = ze(void 0, { enabled: !!s });
  return Ce.useEffect(() => {
    if (!L || L.length === 0 || l.length === 0 || !(o != null && o.apiAddress)) {
      y([]);
      return;
    }
    const w = l.flatMap((x) => {
      const B = L.find((v) => v.identifier === x.lpToken);
      return B && new S(B.balance).gt(0) ? [{ pool: x, balance: B.balance }] : [];
    });
    if (w.length === 0) {
      y([]);
      return;
    }
    Promise.all(
      w.map(async ({ pool: x, balance: B }) => {
        var k, A, E;
        const [v, C, P] = await Promise.all([
          he.get(`/tokens/${x.lpToken}`, { baseURL: o.apiAddress }),
          he.get(`/tokens/${x.tokenA}`, { baseURL: o.apiAddress }).catch(() => null),
          he.get(`/tokens/${x.tokenB}`, { baseURL: o.apiAddress }).catch(() => null)
        ]);
        return { pool: x, balance: B, lpTotalSupply: ((k = v.data) == null ? void 0 : k.minted) ?? "1", decimalsA: ((A = C == null ? void 0 : C.data) == null ? void 0 : A.decimals) ?? 18, decimalsB: ((E = P == null ? void 0 : P.data) == null ? void 0 : E.decimals) ?? 18 };
      })
    ).then(y).catch(console.error);
  }, [L, l, o == null ? void 0 : o.apiAddress]), /* @__PURE__ */ g("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ g(
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
      children: /* @__PURE__ */ g("div", { className: "space-y-4 mt-4", children: !p && u.length === 0 ? /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-6 text-center", children: [
        /* @__PURE__ */ g("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-4", children: n("liquidity_empty") }),
        /* @__PURE__ */ g("button", { onClick: () => i(e.addLiquidity), className: "dinoButton w-full !py-3 text-base", children: n("liquidity_add") })
      ] }) : /* @__PURE__ */ _("div", { className: "space-y-4", children: [
        u.map((w) => {
          const x = w.pool.lpToken.split("-")[0], B = new S(w.balance).shiftedBy(-18).toFixed(6, S.ROUND_DOWN), v = new S(w.lpTotalSupply), C = v.isZero() ? new S(1) : v, P = new S(w.balance).multipliedBy(w.pool.reserveA).dividedBy(C).shiftedBy(-w.decimalsA).toFixed(6, S.ROUND_DOWN), k = new S(w.balance).multipliedBy(w.pool.reserveB).dividedBy(C).shiftedBy(-w.decimalsB).toFixed(6, S.ROUND_DOWN);
          return /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#2a2a2a] p-4", children: [
            /* @__PURE__ */ _("div", { className: "flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 mb-3", children: [
              /* @__PURE__ */ _("div", { className: "min-w-0", children: [
                /* @__PURE__ */ _("div", { className: "flex items-center gap-2 mb-0.5", children: [
                  /* @__PURE__ */ g("span", { className: "font-bold text-gray-900 dark:text-white uppercase truncate", children: x }),
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
                  B,
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
                /* @__PURE__ */ g("p", { className: "font-bold text-gray-900 dark:text-white", children: P })
              ] }),
              /* @__PURE__ */ _("div", { className: "rounded-xl bg-gray-50 dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#333] px-3 py-2 text-xs", children: [
                /* @__PURE__ */ _("p", { className: "text-gray-400 mb-0.5", children: [
                  "≈ ",
                  w.pool.tokenB.split("-")[0]
                ] }),
                /* @__PURE__ */ g("p", { className: "font-bold text-gray-900 dark:text-white", children: k })
              ] })
            ] })
          ] }, w.pool.address);
        }),
        /* @__PURE__ */ g("button", { onClick: () => i(e.addLiquidity), className: "dinoButton w-full !py-3 text-base", children: n("liquidity_add") })
      ] }) })
    }
  ) });
}, $t = (c) => Nt.from(c, "utf8").toString("hex");
function bo(c) {
  if (c < 2n) return c;
  let e = c, n = (e + 1n) / 2n;
  for (; n < e; )
    e = n, n = (e + c / e) / 2n;
  return e;
}
const yo = () => {
  var Ye, Ve;
  const { apiUrl: c, routes: e } = Me(), { t: n } = Ke("swap");
  ht("swap");
  const { address: i } = pt(), { network: s } = Je(), o = st(), [l, f] = vt(), [p, m] = F([]), [u, y] = F([]), [L, w] = F(!0), [x, B] = F(null), [v, C] = F(null), P = (U) => {
    B(U), f((V) => {
      const M = new URLSearchParams(V);
      return U ? M.set("tokenA", U.identifier) : M.delete("tokenA"), M;
    }, { replace: !0 });
  }, k = (U) => {
    C(U), f((V) => {
      const M = new URLSearchParams(V);
      return U ? M.set("tokenB", U.identifier) : M.delete("tokenB"), M;
    }, { replace: !0 });
  }, [A, E] = F(""), [re, Z] = F(""), W = ut("A"), [$, z] = F(null), [me, X] = F(!1), [K, I] = F(null), [q, j] = F(null), [le, ge] = F(0n), [_e, ce] = F(0n), [ie, ke] = F(/* @__PURE__ */ new Set()), Ne = ze(void 0, { enabled: !!i }), [Y, Q] = F([]), we = Ce.useMemo(() => {
    const U = Y.length > 0 ? Y : [];
    return v && !U.some((V) => V.identifier === v.identifier) ? [v, ...U] : U;
  }, [Y, v]);
  ne(() => {
    if (!Ne || Ne.length === 0) {
      Q([]);
      return;
    }
    const U = Ne.filter((V) => !ie.has(V.identifier)).map((V) => {
      var M, se;
      return {
        identifier: V.identifier,
        ticker: V.ticker || V.identifier.split("-")[0],
        poolCount: 0,
        decimals: V.decimals ?? 18,
        logoUrl: ((M = V.assets) == null ? void 0 : M.svgUrl) ?? ((se = V.assets) == null ? void 0 : se.pngUrl) ?? null
      };
    });
    Q(U);
  }, [Ne, ie]);
  const Ie = ze((x == null ? void 0 : x.identifier) ?? void 0, { enabled: !!x && !!i }), R = ze((v == null ? void 0 : v.identifier) ?? void 0, { enabled: !!v && !!i }), H = ((Ye = Ie == null ? void 0 : Ie[0]) == null ? void 0 : Ye.balance) ?? "0", O = ((Ve = R == null ? void 0 : R[0]) == null ? void 0 : Ve.balance) ?? "0", ae = x && H ? new S(H).shiftedBy(-x.decimals).toFixed(6, S.ROUND_DOWN) : "0", Fe = v && O ? new S(O).shiftedBy(-v.decimals).toFixed(6, S.ROUND_DOWN) : "0";
  ne(() => {
    if (!c) return;
    w(!0), (async () => {
      var V;
      try {
        const [M, se, de] = await Promise.all([
          he.get(`${c}/tokens`),
          he.get(`${c}/tokens/hub`).catch(() => ({ data: [] })),
          he.get(`${c}/pools`).catch(() => ({ data: { pools: [] } }))
        ]), Pe = (de.data.pools || []).map((r) => r.lpToken).filter(Boolean);
        ke(new Set(Pe));
        const $e = M.data.tokens || [], Le = ((V = se.data) == null ? void 0 : V.hubTokens) || [], be = Le.map((r) => r.identifier), a = [...$e];
        for (const r of Le) a.find((d) => d.identifier === r.identifier) || a.push({ ...r, poolCount: 0 });
        const t = a.map((r) => ({ identifier: r.identifier, ticker: r.ticker || r.identifier.split("-")[0], poolCount: r.poolCount ?? 0, decimals: r.decimals ?? 18, logoUrl: r.logoUrl ?? null }));
        m(t), y(t.filter((r) => be.includes(r.identifier)));
      } catch (M) {
        console.error(M);
      } finally {
        w(!1);
      }
    })();
  }, [c]), ne(() => {
    if (p.length === 0) return;
    const U = l.get("tokenA"), V = l.get("tokenB");
    U && !x && B(p.find((M) => M.identifier === U) || null), V && !v && C(p.find((M) => M.identifier === V) || null);
  }, [p]), ne(() => {
    if (!x || !v) {
      z(null), I(null);
      return;
    }
    X(!0), he.get(`${c}/pools`).then(async (U) => {
      var se;
      const M = (U.data.pools || []).find((de) => de.tokenA === x.identifier && de.tokenB === v.identifier || de.tokenA === v.identifier && de.tokenB === x.identifier);
      if (z(M || null), M != null && M.lpToken && (s != null && s.apiAddress))
        try {
          const de = await he.get(`/tokens/${M.lpToken}`, { baseURL: s.apiAddress });
          I(((se = de.data) == null ? void 0 : se.minted) ?? null);
        } catch {
          I(null);
        }
      else I(null);
    }).catch(console.error).finally(() => X(!1));
  }, [x, v]);
  const Re = (U) => {
    if (E(U), W.current = "A", !$ || !x || !v || !U) return;
    const V = $.tokenA === x.identifier, M = new S(V ? $.reserveA : $.reserveB), se = new S(V ? $.reserveB : $.reserveA);
    M.isZero() || se.isZero() || Z(new S(U).shiftedBy(x.decimals).multipliedBy(se).dividedBy(M).shiftedBy(-v.decimals).toFixed(6, S.ROUND_UP));
  }, He = (U) => {
    if (Z(U), W.current = "B", !$ || !x || !v || !U) return;
    const V = $.tokenA === x.identifier, M = new S(V ? $.reserveA : $.reserveB), se = new S(V ? $.reserveB : $.reserveA);
    M.isZero() || se.isZero() || E(new S(U).shiftedBy(v.decimals).multipliedBy(M).dividedBy(se).shiftedBy(-x.decimals).toFixed(6, S.ROUND_UP));
  };
  ne(() => {
    if (!x || !v || !A || !re || Number(A) <= 0 || Number(re) <= 0) {
      j(null), ge(0n), ce(0n);
      return;
    }
    const U = BigInt(new S(A).shiftedBy(x.decimals).toFixed(0)), V = BigInt(new S(re).shiftedBy(v.decimals).toFixed(0)), M = $ ? new S($.reserveA) : new S(0), se = $ ? new S($.reserveB) : new S(0);
    if (!($ && M.gt(0) && se.gt(0))) {
      j(bo(U * V)), ge(0n), ce(0n);
      return;
    }
    const Pe = $.tokenA === x.identifier, $e = Pe ? U : V, Le = Pe ? V : U, be = BigInt(M.toFixed(0)), a = BigInt(se.toFixed(0)), t = BigInt(new S(K ?? "0").isZero() ? "1" : new S(K).toFixed(0)), r = be > 0n ? $e * t / be : 0n, d = a > 0n ? Le * t / a : 0n;
    if (r <= d) {
      j(r);
      const h = be > 0n ? $e * a / be : 0n;
      ge(0n), ce(Pe ? Le - h : $e - h);
    } else {
      j(d);
      const h = a > 0n ? Le * be / a : 0n;
      ge(Pe ? $e - h : Le - h), ce(0n);
    }
  }, [A, re, $, x, v, K]);
  const Oe = async () => {
    if (!(!$ || !x || !v || !i || !A || !re))
      try {
        const U = BigInt(new S(A).shiftedBy(x.decimals).toFixed(0)), V = BigInt(new S(re).shiftedBy(v.decimals).toFixed(0)), M = new qe(i), se = ["MultiESDTNFTTransfer", new qe($.address).toHex(), "02", $t(x.identifier), "00", Ge(U), $t(v.identifier), "00", Ge(V), $t("addLiquidity"), Ge(0n), Ge(0n)], de = new tt({ value: 0n, data: new TextEncoder().encode(se.join("@")), receiver: M, sender: M, gasLimit: 15000000n, gasPrice: BigInt(rt), chainID: s.chainId, version: 1 });
        await nt({ transactions: [de], transactionsDisplayInfo: { processingMessage: n("add_processing"), errorMessage: n("add_error"), successMessage: n("add_success") } }), E(""), Z("");
      } catch (U) {
        console.error(U);
      }
  }, xe = !!(A && new S(A).shiftedBy((x == null ? void 0 : x.decimals) ?? 18).isGreaterThan(H)), ve = !!(re && new S(re).shiftedBy((v == null ? void 0 : v.decimals) ?? 18).isGreaterThan(O)), Be = !!($ && new S($.reserveA).gt(0) && new S($.reserveB).gt(0));
  return /* @__PURE__ */ g("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ g(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ g("div", { className: "flex flex-col xs:flex-row items-start xs:items-center gap-3 w-full", children: /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ g("button", { onClick: () => o(e.liquidity), className: "p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition flex-shrink-0", children: /* @__PURE__ */ g(Tt, { className: "w-4 h-4 text-gray-600 dark:text-gray-300" }) }),
        /* @__PURE__ */ g("span", { className: "text-xl", children: "➕" }),
        /* @__PURE__ */ g("span", { className: "text-lg font-black tracking-tight whitespace-nowrap", children: n("add_card_title") })
      ] }) }),
      description: n("add_card_desc"),
      children: /* @__PURE__ */ _("div", { className: "space-y-2 mt-4", children: [
        /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: n("add_token1") }),
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ _("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-500", children: [
                n("balance"),
                ": ",
                /* @__PURE__ */ g("span", { className: "text-amber-500", children: ae })
              ] }),
              x && H !== "0" && /* @__PURE__ */ g("button", { onClick: () => Re(new S(H).shiftedBy(-x.decimals).toFixed(x.decimals, S.ROUND_DOWN)), className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition", children: "MAX" })
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ g(it, { value: x, onChange: P, tokens: u, exclude: v == null ? void 0 : v.identifier, loading: L }),
            /* @__PURE__ */ g(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: A,
                onChange: (U) => Re(U.target.value),
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${xe ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ g("div", { className: "flex justify-center -my-3 relative z-10", children: /* @__PURE__ */ g("div", { className: "rounded-full p-1.5 bg-[#ffffff] dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]", children: /* @__PURE__ */ g(vr, { className: "w-4 h-4 text-amber-500" }) }) }),
        /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: n("add_token2") }),
            /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ _("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-500", children: [
                n("balance"),
                ": ",
                /* @__PURE__ */ g("span", { className: "text-amber-500", children: Fe })
              ] }),
              v && O !== "0" && /* @__PURE__ */ g("button", { onClick: () => He(new S(O).shiftedBy(-v.decimals).toFixed(v.decimals, S.ROUND_DOWN)), className: "text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 transition", children: "MAX" })
            ] })
          ] }),
          /* @__PURE__ */ _("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ g(it, { value: v, onChange: k, tokens: we, exclude: x == null ? void 0 : x.identifier, loading: L || Ne.length > 0 && Y.length === 0 }),
            /* @__PURE__ */ g(
              "input",
              {
                type: "number",
                min: "0",
                placeholder: "0.0",
                value: re,
                onChange: (U) => He(U.target.value),
                className: `w-28 xs:w-36 flex-shrink-0 rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-right text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${ve ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
              }
            )
          ] })
        ] }),
        me && /* @__PURE__ */ g("p", { className: "text-center text-xs text-gray-500 mt-4 animate-pulse", children: n("add_pool_searching") }),
        !me && x && v && !$ && /* @__PURE__ */ _("div", { className: "rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 mt-4", children: [
          /* @__PURE__ */ g("p", { className: "text-sm font-semibold text-amber-600 dark:text-amber-400", children: n("add_no_pool_title") }),
          /* @__PURE__ */ g("p", { className: "text-xs text-amber-500 mt-1", children: n("add_no_pool_desc") }),
          /* @__PURE__ */ g("button", { onClick: () => o(`${e.createPool}?tokenX=${(x == null ? void 0 : x.identifier) ?? ""}&tokenY=${(v == null ? void 0 : v.identifier) ?? ""}`), className: "mt-3 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition", children: n("add_no_pool_btn") })
        ] }),
        $ && q !== null && /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] p-4 mt-4 space-y-2", children: [
          /* @__PURE__ */ _("div", { className: "flex justify-between text-sm", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500", children: n("add_lp_preview") }),
            /* @__PURE__ */ _("span", { className: "font-bold text-amber-500", children: [
              new S(q.toString()).shiftedBy(-18).toFixed(6),
              " LP"
            ] })
          ] }),
          le > 0n && /* @__PURE__ */ _("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500", children: n("add_refund", { ticker: x == null ? void 0 : x.ticker }) }),
            /* @__PURE__ */ g("span", { className: "font-medium text-gray-700 dark:text-gray-300", children: new S(le.toString()).shiftedBy(-((x == null ? void 0 : x.decimals) ?? 18)).toFixed(6) })
          ] }),
          _e > 0n && /* @__PURE__ */ _("div", { className: "flex justify-between text-xs", children: [
            /* @__PURE__ */ g("span", { className: "text-gray-500", children: n("add_refund", { ticker: v == null ? void 0 : v.ticker }) }),
            /* @__PURE__ */ g("span", { className: "font-medium text-gray-700 dark:text-gray-300", children: new S(_e.toString()).shiftedBy(-((v == null ? void 0 : v.decimals) ?? 18)).toFixed(6) })
          ] }),
          q < 1000n && !Be && /* @__PURE__ */ g("p", { className: "text-xs text-red-500 mt-2", children: n("add_min_deposit") })
        ] }),
        /* @__PURE__ */ g(
          "button",
          {
            onClick: Oe,
            disabled: !$ || !$.isActive || xe || ve || !A || !re || q !== null && q < 1000n && !Be,
            className: "dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed",
            children: i ? $ ? $.isActive ? xe || ve ? n("add_btn_insufficient") : !A || !re ? n("add_btn_enter_amount") : q !== null && q < 1000n && !Be ? n("add_btn_min") : n("add_btn_submit") : n("add_btn_inactive") : n("add_btn_no_pool") : n("add_btn_connect")
          }
        )
      ] })
    }
  ) });
}, wo = (c) => {
  const { network: e } = Je(), [n, i] = F({});
  return ne(() => {
    if (!c || c === "EGLD") return;
    const s = c === "EGLD" ? "EGLD-000000" : c, o = `esdt_${s}`, l = localStorage.getItem(o), f = Number(localStorage.getItem(`${o}_expire`));
    if (l && Date.now() < f) {
      i(JSON.parse(l));
      return;
    }
    he.get(`/tokens/${s}`, { baseURL: e.apiAddress }).then(({ data: p }) => {
      i(p), localStorage.setItem(o, JSON.stringify(p)), localStorage.setItem(`${o}_expire`, String(Date.now() + 36e5));
    }).catch(() => i({}));
  }, [c, e.apiAddress]), n;
}, At = ({
  amount: c,
  identifier: e,
  decimals: n,
  displayDecimals: i,
  showIdentifier: s = !0,
  nonce: o
}) => {
  const l = wo(o && o > 0 ? "" : e), f = e === "EGLD" ? "EGLD" : (l == null ? void 0 : l.ticker) || e, p = n !== void 0 ? n : e === "EGLD" ? 18 : (l == null ? void 0 : l.decimals) || 0;
  if (c == null || isNaN(Number(c))) return /* @__PURE__ */ g(dt, { children: `0 ${f}` });
  const u = new S(c).div(new S(10).pow(p));
  let y;
  if (i !== void 0)
    y = u.toFixed(i, S.ROUND_DOWN);
  else {
    let L = p < 2 ? p : 2;
    if (u.gt(0) && u.lt(0.01)) {
      const w = Math.floor(Math.log10(u.toNumber()));
      L = Math.min(-w - 1 + 2, p);
    }
    y = u.toNumber().toLocaleString(void 0, { minimumFractionDigits: L, maximumFractionDigits: L });
  }
  return /* @__PURE__ */ g(dt, { children: `${y}${s ? " " + f : ""}${s && o && o > 0 ? `-${Ge(BigInt(o))}` : ""}` });
}, er = (c) => Nt.from(c, "utf8").toString("hex"), _o = () => {
  var K;
  const { apiUrl: c, routes: e } = Me(), { t: n } = Ke(), { address: i } = pt(), { network: s } = Je(), o = st(), [l, f] = F([]), [p, m] = F({}), [u, y] = F(""), [L, w] = F(!0), [x, B] = F(null), [v, C] = F(""), [P] = vt();
  ne(() => {
    c && he.get(`${c}/tokens`).then((I) => {
      const q = {};
      for (const j of I.data.tokens || [])
        q[j.identifier] = { identifier: j.identifier, ticker: j.ticker || j.identifier.split("-")[0], decimals: j.decimals ?? 18 };
      m(q);
    }).catch(console.error);
  }, [c]), ne(() => {
    c && (w(!0), he.get(`${c}/pools`).then((I) => {
      const q = (I.data.pools || []).filter((le) => le.isActive);
      f(q);
      const j = P.get("pool");
      j && q.some((le) => le.address === j) && y(j);
    }).catch(console.error).finally(() => w(!1)));
  }, [c, P]);
  const k = l.find((I) => I.address === u);
  ne(() => {
    if (!(k != null && k.lpToken) || !(s != null && s.apiAddress)) {
      B(null);
      return;
    }
    he.get(`/tokens/${k.lpToken}`, { baseURL: s.apiAddress }).then((I) => {
      var q;
      return B(((q = I.data) == null ? void 0 : q.minted) ?? null);
    }).catch(() => B(null));
  }, [k == null ? void 0 : k.lpToken, s == null ? void 0 : s.apiAddress]);
  const A = ze((k == null ? void 0 : k.lpToken) ?? void 0, { enabled: !!k && !!i }), E = ((K = A == null ? void 0 : A[0]) == null ? void 0 : K.balance) ?? "0";
  new S(E).shiftedBy(-18).toFixed(6, S.ROUND_DOWN);
  const re = () => {
    !E || E === "0" || C(new S(E).shiftedBy(-18).toFixed(18, S.ROUND_DOWN).replace(/\.?0+$/, ""));
  }, Z = x ?? (k == null ? void 0 : k.lpSupply) ?? "0", W = new S(Z).isZero() ? new S(1) : new S(Z), $ = k && v ? BigInt(new S(v).shiftedBy(18).multipliedBy(k.reserveA).dividedBy(W).toFixed(0, S.ROUND_DOWN)) : 0n, z = k && v ? BigInt(new S(v).shiftedBy(18).multipliedBy(k.reserveB).dividedBy(W).toFixed(0, S.ROUND_DOWN)) : 0n, me = async () => {
    if (!(!k || !i || !v))
      try {
        const I = BigInt(new S(v).shiftedBy(18).toFixed(0)), q = ["ESDTTransfer", er(k.lpToken), Ge(I), er("removeLiquidity"), Ge(0n), Ge(0n)], j = new tt({
          value: 0n,
          data: new TextEncoder().encode(q.join("@")),
          receiver: new qe(k.address),
          sender: new qe(i),
          gasLimit: 12000000n,
          gasPrice: BigInt(rt),
          chainID: s.chainId,
          version: 1
        });
        await nt({ transactions: [j], transactionsDisplayInfo: { processingMessage: "Retrait en cours...", errorMessage: "Le retrait a échoué", successMessage: "Liquidité retirée !" } }), C("");
      } catch (I) {
        console.error(I);
      }
  }, X = !!(v && new S(v).shiftedBy(18).isGreaterThan(E));
  return /* @__PURE__ */ g("div", { className: "flex flex-col w-full gap-6", children: /* @__PURE__ */ g(
    gt,
    {
      className: "border-2 border-cyan-500/20",
      title: /* @__PURE__ */ _("div", { className: "flex items-center gap-3 w-full", children: [
        /* @__PURE__ */ g("button", { onClick: () => o(e.liquidity), className: "p-1.5 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition flex-shrink-0", children: /* @__PURE__ */ g(Tt, { className: "w-4 h-4 text-gray-600 dark:text-gray-300" }) }),
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
              value: u,
              onChange: (I) => y(I.target.value),
              disabled: L,
              children: [
                /* @__PURE__ */ g("option", { value: "", children: L ? "Chargement..." : "Choisir une pool" }),
                l.map((I) => {
                  var q, j;
                  return /* @__PURE__ */ _("option", { value: I.address, children: [
                    ((q = p[I.tokenA]) == null ? void 0 : q.ticker) || I.tokenA,
                    " - ",
                    ((j = p[I.tokenB]) == null ? void 0 : j.ticker) || I.tokenB
                  ] }, I.address);
                })
              ]
            }
          )
        ] }),
        k && /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
          /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400", children: "Montant LP à retirer" }),
            /* @__PURE__ */ _("button", { onClick: re, className: "text-[10px] font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-600 flex items-center gap-1", children: [
              "MAX (",
              /* @__PURE__ */ g(At, { amount: new S(E.toString()).toFixed(0, S.ROUND_DOWN), identifier: k.lpToken }),
              ")"
            ] })
          ] }),
          /* @__PURE__ */ g(
            "input",
            {
              type: "number",
              min: "0",
              placeholder: "0.0",
              value: v,
              onChange: (I) => C(I.target.value),
              className: `w-full rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${X ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
            }
          ),
          X && /* @__PURE__ */ g("p", { className: "mt-1 text-xs text-red-500", children: "Solde LP insuffisant" })
        ] }),
        k && v && $ > 0n && z > 0n && !X && /* @__PURE__ */ _(dt, { children: [
          /* @__PURE__ */ g("div", { className: "flex justify-center -my-2 relative z-10", children: /* @__PURE__ */ g("div", { className: "rounded-full p-1.5 bg-[#ffffff] dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333]", children: /* @__PURE__ */ g(Lr, { className: "w-4 h-4 text-amber-500" }) }) }),
          /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-[#ffffff] dark:bg-[#1a1a1a] p-4 space-y-3 shadow-sm", children: [
            /* @__PURE__ */ g("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center", children: "Vous recevrez (estimation)" }),
            /* @__PURE__ */ g("div", { className: "text-sm font-bold text-gray-900 dark:text-white", children: /* @__PURE__ */ g(At, { amount: new S($.toString()).toFixed(0, S.ROUND_DOWN), identifier: k.tokenA }) }),
            /* @__PURE__ */ g("div", { className: "text-sm font-bold text-gray-900 dark:text-white", children: /* @__PURE__ */ g(At, { amount: new S(z.toString()).toFixed(0, S.ROUND_DOWN), identifier: k.tokenB }) })
          ] })
        ] }),
        /* @__PURE__ */ g(
          "button",
          {
            onClick: me,
            disabled: !k || !i || !v || X,
            className: "dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed",
            children: i ? k ? v ? X ? "Solde insuffisant" : "Retirer Liquidité" : "Renseignez un montant" : "Sélectionnez une pool" : "Connectez votre wallet"
          }
        )
      ] })
    }
  ) });
}, Qe = (c) => Nt.from(c, "utf8").toString("hex"), ko = () => {
  const { apiUrl: c, factoryAddress: e, routes: n } = Me(), { t: i } = Ke("swap");
  ht("swap");
  const { address: s } = pt(), { network: o } = Je(), l = st(), [f, p] = vt(), [m, u] = F([]), [y, L] = F(!0), [w, x] = F(/* @__PURE__ */ new Set()), [B, v] = F(null), [C, P] = F(null), k = (R) => {
    v(R), p((H) => {
      const O = new URLSearchParams(H);
      return R ? O.set("tokenX", R.identifier) : O.delete("tokenX"), O;
    }, { replace: !0 });
  }, A = (R) => {
    P(R), p((H) => {
      const O = new URLSearchParams(H);
      return R ? O.set("tokenY", R.identifier) : O.delete("tokenY"), O;
    }, { replace: !0 });
  }, [E, re] = F(""), [Z, W] = F(""), [$, z] = F(null), [me, X] = F(!1), [K, I] = F(!1), q = ze(void 0, { enabled: !!s }), [j, le] = F([]);
  ne(() => {
    if (!q || q.length === 0) {
      le([]);
      return;
    }
    le(q.filter((R) => !w.has(R.identifier)).map((R) => {
      var H, O;
      return { identifier: R.identifier, ticker: R.ticker || R.identifier.split("-")[0], decimals: R.decimals ?? 18, logoUrl: ((H = R.assets) == null ? void 0 : H.svgUrl) ?? ((O = R.assets) == null ? void 0 : O.pngUrl) ?? null };
    }));
  }, [q, w]), ne(() => {
    c && (L(!0), Promise.all([
      he.get(`${c}/tokens/hub`).catch(() => ({ data: [] })),
      he.get(`${c}/pools`).catch(() => ({ data: { pools: [] } }))
    ]).then(([R, H]) => {
      var O;
      u((((O = R.data) == null ? void 0 : O.hubTokens) || []).map((ae) => ({ identifier: ae.identifier, ticker: ae.ticker || ae.identifier.split("-")[0], decimals: ae.decimals ?? 18, logoUrl: ae.logoUrl ?? null }))), x(new Set((H.data.pools || []).map((ae) => ae.lpToken).filter(Boolean)));
    }).catch(console.error).finally(() => L(!1)));
  }, [c]), ne(() => {
    if (y) return;
    const R = f.get("tokenX"), H = f.get("tokenY");
    if (R && !B) {
      const O = m.find((ae) => ae.identifier === R);
      O && v(O);
    }
    if (H && !C) {
      const O = j.find((ae) => ae.identifier === H);
      O && P(O);
    }
  }, [y, m, j]), ne(() => {
    if (!B || !C) return;
    const R = (xe) => xe.split("-")[0].toUpperCase().replace(/[^A-Z0-9]/g, ""), H = R(B.ticker), O = R(C.ticker), ae = (xe, ve, Be) => xe.length + ve.length <= Be ? [xe, ve] : [xe.slice(0, Be - Math.floor(Be / 2)), ve.slice(0, Math.floor(Be / 2))], [Fe, Re] = ae(H, O, 18);
    re(Fe + Re + "LP");
    const [He, Oe] = ae(H, O, 10);
    W(He + Oe);
  }, [B, C]);
  const ge = async () => {
    var R, H;
    if (!(!B || !C))
      try {
        const O = await he.get(`${c}/pools/pair`, { params: { tokenA: B.identifier, tokenB: C.identifier } });
        z((R = O.data) != null && R.address ? O.data : null);
      } catch (O) {
        ((H = O == null ? void 0 : O.response) == null ? void 0 : H.status) !== 404 && console.error(O), z(null);
      }
  };
  ne(() => {
    ge();
    const R = setInterval(ge, 5e3);
    return () => clearInterval(R);
  }, [B, C]);
  const [_e, ce] = Ce.useState(!1);
  ne(() => {
    if (!_e) return;
    const R = setInterval(async () => {
      await ge(), z((H) => (H && ce(!1), H));
    }, 2e3);
    return () => clearInterval(R);
  }, [_e, B, C]);
  const ie = E.length >= 3 && E.length <= 20 && /^[a-zA-Z0-9]+$/.test(E), ke = Z.length >= 3 && Z.length <= 10 && /^[A-Z0-9]+$/.test(Z), Ne = !!s && !!B && !!C && B.identifier !== C.identifier && ie && ke && !$, Y = !!s && !!$ && !$.isActive, Q = me || K, we = async () => {
    if (!(!Ne || !B || !C)) {
      X(!0);
      try {
        const R = ["createPair", Qe(B.identifier), Qe(C.identifier), Qe(E), Qe(Z)], H = new tt({ value: 0n, data: new TextEncoder().encode(R.join("@")), receiver: new qe(e), sender: new qe(s), gasLimit: 300000000n, gasPrice: BigInt(rt), chainID: o.chainId, version: 1 });
        await nt({ transactions: [H], transactionsDisplayInfo: { processingMessage: i("create_processing_pair"), errorMessage: i("create_error_pair"), successMessage: i("create_success_pair") } }), ce(!0);
      } catch (R) {
        console.error(R);
      } finally {
        X(!1);
      }
    }
  }, Ie = async () => {
    if (!(!Y || !B || !C)) {
      I(!0);
      try {
        const R = ["issueLpToken", Qe(B.identifier), Qe(C.identifier)], H = new tt({ value: 50000000000000000n, data: new TextEncoder().encode(R.join("@")), receiver: new qe(e), sender: new qe(s), gasLimit: 150000000n, gasPrice: BigInt(rt), chainID: o.chainId, version: 1 });
        await nt({ transactions: [H], transactionsDisplayInfo: { processingMessage: i("create_processing_lp"), errorMessage: i("create_error_lp"), successMessage: i("create_success_lp") } });
      } catch (R) {
        console.error(R);
      } finally {
        I(!1);
      }
    }
  };
  return /* @__PURE__ */ _("div", { className: "mx-auto max-w-lg px-4 py-8", children: [
    /* @__PURE__ */ _("div", { className: "flex items-center gap-3 mb-6", children: [
      /* @__PURE__ */ g("button", { onClick: () => l(n.liquidity), className: "p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition", children: /* @__PURE__ */ g(Tt, { className: "w-5 h-5 text-gray-600 dark:text-gray-300" }) }),
      /* @__PURE__ */ _("div", { children: [
        /* @__PURE__ */ g("h1", { className: "text-xl font-black uppercase tracking-tight text-gray-900 dark:text-white", children: i("create_title") }),
        /* @__PURE__ */ g("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: i("create_subtitle") })
      ] })
    ] }),
    /* @__PURE__ */ _("div", { className: "space-y-4", children: [
      /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4 space-y-4", children: [
        /* @__PURE__ */ _("div", { children: [
          /* @__PURE__ */ g("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block", children: i("create_token1") }),
          /* @__PURE__ */ g(it, { value: B, onChange: Q ? () => {
          } : k, tokens: m, exclude: C == null ? void 0 : C.identifier, loading: y })
        ] }),
        /* @__PURE__ */ _("div", { children: [
          /* @__PURE__ */ g("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block", children: i("create_token2") }),
          /* @__PURE__ */ g(it, { value: C, onChange: Q ? () => {
          } : A, tokens: j, exclude: B == null ? void 0 : B.identifier, loading: y || q.length > 0 && j.length === 0 })
        ] }),
        /* @__PURE__ */ _("div", { children: [
          /* @__PURE__ */ g("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block", children: i("create_lp_name") }),
          /* @__PURE__ */ g(
            "input",
            {
              type: "text",
              value: E,
              onChange: (R) => re(R.target.value),
              disabled: Q || !!$,
              className: `w-full rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${!ie && E.length > 0 ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
            }
          )
        ] }),
        /* @__PURE__ */ _("div", { children: [
          /* @__PURE__ */ g("label", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1 block", children: i("create_lp_ticker") }),
          /* @__PURE__ */ g(
            "input",
            {
              type: "text",
              value: Z,
              onChange: (R) => W(R.target.value.toUpperCase()),
              disabled: Q || !!$,
              className: `w-full rounded-xl border bg-[#ffffff] dark:bg-[#2a2a2a] px-3 py-2.5 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${!ke && Z.length > 0 ? "border-red-400 focus:ring-red-400" : "border-gray-200 dark:border-[#444] focus:ring-amber-500"}`
            }
          )
        ] })
      ] }),
      $ ? $.isActive ? /* @__PURE__ */ _("div", { className: "rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-6 mt-4 text-center", children: [
        /* @__PURE__ */ g(Sr, { className: "w-12 h-12 text-green-500 mx-auto mb-3" }),
        /* @__PURE__ */ g("p", { className: "text-base font-bold text-green-700 dark:text-green-400 mb-2", children: i("create_pool_active") }),
        /* @__PURE__ */ g("p", { className: "text-sm text-green-600/80 dark:text-green-400/80 mb-4", children: i("create_pool_ready") }),
        /* @__PURE__ */ g("button", { onClick: () => l(`${n.addLiquidity}?tokenA=${B == null ? void 0 : B.identifier}&tokenB=${C == null ? void 0 : C.identifier}`), className: "w-full px-4 py-3 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition shadow-sm", children: i("create_add_liquidity") })
      ] }) : /* @__PURE__ */ _("div", { className: "rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4 mt-4 text-center", children: [
        /* @__PURE__ */ g("p", { className: "text-sm font-semibold text-amber-600 dark:text-amber-400 mb-3", children: i("create_pair_done") }),
        /* @__PURE__ */ g("p", { className: "text-xs text-amber-600/80 dark:text-amber-400/80 mb-4 text-left", children: i("create_pair_desc") }),
        /* @__PURE__ */ g("button", { onClick: Ie, className: "w-full px-4 py-3 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition shadow-sm", children: i(K ? "create_tx_pending" : "create_step2") }),
        K && /* @__PURE__ */ g("p", { className: "text-center text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse", children: i("create_tx_waiting") })
      ] }) : /* @__PURE__ */ _(dt, { children: [
        /* @__PURE__ */ g("button", { onClick: we, disabled: !Ne || me, className: "dinoButton w-full !py-3 text-base mt-4 disabled:opacity-40 disabled:cursor-not-allowed", children: i(me ? "create_tx_pending" : "create_step1") }),
        me && /* @__PURE__ */ g("p", { className: "text-center text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse", children: i("create_tx_waiting") })
      ] })
    ] })
  ] });
};
function tr(c, e) {
  const n = new S(c).shiftedBy(-e);
  return n.isZero() ? "0" : n.gte(1e6) ? n.toFormat(0) + "" : n.gte(1e3) ? n.toFormat(2) : n.gte(1) ? n.toFormat(4) : n.toFormat(6);
}
const No = () => {
  const { apiUrl: c, routes: e } = Me(), { t: n } = Ke("swap");
  ht("swap");
  const i = st(), [s, o] = Ce.useState([]), [l, f] = Ce.useState({}), [p, m] = Ce.useState(!0), [u, y] = Ce.useState("DinoVox");
  Ce.useEffect(() => {
    c && (m(!0), Promise.all([
      he.get(`${c}/pools`, { params: { dexType: u } }),
      he.get(`${c}/tokens`)
    ]).then(([x, B]) => {
      const v = (x.data.pools || []).filter((P) => P.isActive);
      o(v);
      const C = {};
      for (const P of B.data.tokens || [])
        C[P.identifier] = { identifier: P.identifier, ticker: P.ticker ?? P.identifier.split("-")[0], decimals: P.decimals ?? 18 };
      f(C);
    }).catch(console.error).finally(() => m(!1)));
  }, [u, c]);
  const L = (x) => {
    var B;
    return ((B = l[x]) == null ? void 0 : B.ticker) ?? x.split("-")[0];
  }, w = (x) => {
    var B;
    return ((B = l[x]) == null ? void 0 : B.decimals) ?? 18;
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
      description: p ? n("pools_loading_desc") : n("pools_count", { count: s.length }),
      children: [
        /* @__PURE__ */ g("div", { className: "flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1a1a] rounded-xl mt-4 w-fit", children: ["DinoVox", "XExchange"].map((x) => /* @__PURE__ */ g(
          "button",
          {
            onClick: () => y(x),
            className: `px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${u === x ? "bg-[#ffffff] dark:bg-[#2a2a2a] text-amber-500 shadow-md" : "text-gray-400 hover:text-gray-700 dark:hover:text-white"}`,
            children: x
          },
          x
        )) }),
        /* @__PURE__ */ _("div", { className: "space-y-3 mt-4", children: [
          p ? /* @__PURE__ */ g("div", { className: "flex justify-center py-10", children: /* @__PURE__ */ g("div", { className: "w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" }) }) : s.length === 0 ? /* @__PURE__ */ g("p", { className: "text-center text-sm text-gray-500 dark:text-gray-400 py-8", children: n("pools_empty") }) : s.map((x) => {
            const B = L(x.tokenA), v = L(x.tokenB), C = w(x.tokenA), P = w(x.tokenB), k = tr(x.reserveA, C), A = tr(x.reserveB, P);
            return /* @__PURE__ */ _("div", { className: "rounded-2xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1e1e1e] p-4", children: [
              /* @__PURE__ */ _("div", { className: "flex items-center justify-between mb-3", children: [
                /* @__PURE__ */ _("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ _("span", { className: "font-black text-gray-900 dark:text-white text-base", children: [
                    B,
                    " / ",
                    v
                  ] }),
                  /* @__PURE__ */ g("span", { className: "text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-semibold border border-green-200 dark:border-green-800 uppercase", children: n("pools_active") })
                ] }),
                u === "DinoVox" && /* @__PURE__ */ g(
                  "button",
                  {
                    onClick: () => i(`${e.addLiquidity}?tokenA=${x.tokenA}&tokenB=${x.tokenB}`),
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
                    B
                  ] }),
                  /* @__PURE__ */ _("p", { className: "font-bold text-gray-900 dark:text-white text-sm", children: [
                    k,
                    " ",
                    /* @__PURE__ */ g("span", { className: "text-gray-400 font-medium", children: B })
                  ] })
                ] }),
                /* @__PURE__ */ _("div", { className: "rounded-xl bg-[#ffffff] dark:bg-[#2a2a2a] border border-gray-100 dark:border-[#333] px-3 py-2", children: [
                  /* @__PURE__ */ _("p", { className: "text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5", children: [
                    n("pools_reserve"),
                    " ",
                    v
                  ] }),
                  /* @__PURE__ */ _("p", { className: "font-bold text-gray-900 dark:text-white text-sm", children: [
                    A,
                    " ",
                    /* @__PURE__ */ g("span", { className: "text-gray-400 font-medium", children: v })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ g("p", { className: "text-[10px] text-gray-400 mt-2 font-mono truncate", children: x.address })
            ] }, x.address);
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
}, xt = {
  swap: "",
  liquidity: "#liquidity",
  addLiquidity: "#add-liquidity",
  removeLiquidity: "#remove-liquidity",
  createPool: "#create-pool",
  pools: "#pools"
}, vo = Object.fromEntries(
  Object.entries(xt).map(([c, e]) => [e, c])
);
function Lo(c, e) {
  const n = Object.entries(e);
  n.sort((i, s) => s[1].length - i[1].length);
  for (const [i, s] of n)
    if (c === s) return i;
  return "swap";
}
function rr(c) {
  return vo[c] ?? null;
}
const Mo = ({
  initialView: c = "swap"
}) => {
  const { routes: e, language: n, theme: i } = Me(), [s, o] = F(
    () => typeof document < "u" && document.documentElement.classList.contains("dark")
  );
  ne(() => {
    if (i !== void 0) return;
    const w = document.documentElement;
    o(w.classList.contains("dark"));
    const x = new MutationObserver(() => {
      o(w.classList.contains("dark"));
    });
    return x.observe(w, { attributes: !0, attributeFilter: ["class"] }), () => x.disconnect();
  }, [i]), ne(() => {
    const w = (n || (typeof navigator < "u" ? navigator.language : "en") || "en").split("-")[0];
    ot.language !== w && ot.isInitialized && ot.changeLanguage(w);
  }, [n]);
  const [{ view: l, params: f }, p] = F(() => ({
    view: (typeof window < "u" ? rr(window.location.hash) : null) ?? c,
    params: new URLSearchParams(window.location.search)
  })), m = Ct(
    (w) => {
      const [x, B] = w.split("?"), v = Lo(x, e), C = xt[v], P = new URLSearchParams(B ?? ""), k = P.toString() ? "?" + P.toString() : "";
      window.history.pushState(
        null,
        "",
        window.location.pathname + k + C
      ), p({
        view: v,
        params: new URLSearchParams(B ?? "")
      });
    },
    [e]
  ), u = Ct(
    (w, x) => {
      p((B) => {
        const v = w(B.params), C = xt[B.view], P = window.location.pathname + "?" + v.toString() + C;
        return x != null && x.replace ? window.history.replaceState(null, "", P) : window.history.pushState(null, "", P), { ...B, params: v };
      });
    },
    []
  );
  ne(() => {
    const w = () => {
      const x = rr(window.location.hash);
      x && p((B) => ({
        ...B,
        view: x,
        params: new URLSearchParams(window.location.search)
      }));
    };
    return window.addEventListener("popstate", w), () => window.removeEventListener("popstate", w);
  }, []), ne(() => {
    const w = xt[l];
    w && !window.location.hash && window.history.replaceState(null, "", w);
  }, []);
  const y = () => {
    switch (l) {
      case "liquidity":
        return /* @__PURE__ */ g(xo, {});
      case "addLiquidity":
        return /* @__PURE__ */ g(yo, {});
      case "removeLiquidity":
        return /* @__PURE__ */ g(_o, {});
      case "createPool":
        return /* @__PURE__ */ g(ko, {});
      case "pools":
        return /* @__PURE__ */ g(No, {});
      default:
        return /* @__PURE__ */ g(mo, {});
    }
  }, L = i === "dark" ? "dark" : i === "light" ? "light" : s ? "dark" : "";
  return /* @__PURE__ */ g(_r, { i18n: ot, children: /* @__PURE__ */ g(cr.Provider, { value: { params: f, navigate: m, setParams: u }, children: /* @__PURE__ */ g("div", { className: L || void 0, children: y() }) }) });
};
export {
  yo as AddLiquidity,
  gt as Card,
  ko as CreatePool,
  At as FormatAmount,
  xo as Liquidity,
  No as Pools,
  _o as RemoveLiquidity,
  mo as Swap,
  Uo as SwapConfigProvider,
  Mo as SwapWidget,
  it as TokenSelect,
  Ge as bigToHex,
  nt as signAndSendTransactions,
  ze as useGetUserESDT,
  Me as useSwapConfig
};
//# sourceMappingURL=mx-swap-widget.es.js.map
