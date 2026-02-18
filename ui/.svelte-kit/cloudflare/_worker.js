var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@sveltejs/kit/src/exports/internal/remote-functions.js
var init_remote_functions = __esm({
  "node_modules/@sveltejs/kit/src/exports/internal/remote-functions.js"() {
  }
});

// node_modules/@sveltejs/kit/src/exports/internal/index.js
var HttpError, Redirect, SvelteKitError, ActionFailure;
var init_internal = __esm({
  "node_modules/@sveltejs/kit/src/exports/internal/index.js"() {
    init_remote_functions();
    HttpError = class {
      /**
       * @param {number} status
       * @param {{message: string} extends App.Error ? (App.Error | string | undefined) : App.Error} body
       */
      constructor(status, body2) {
        this.status = status;
        if (typeof body2 === "string") {
          this.body = { message: body2 };
        } else if (body2) {
          this.body = body2;
        } else {
          this.body = { message: `Error: ${status}` };
        }
      }
      toString() {
        return JSON.stringify(this.body);
      }
    };
    Redirect = class {
      /**
       * @param {300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308} status
       * @param {string} location
       */
      constructor(status, location) {
        this.status = status;
        this.location = location;
      }
    };
    SvelteKitError = class extends Error {
      /**
       * @param {number} status
       * @param {string} text
       * @param {string} message
       */
      constructor(status, text2, message) {
        super(message);
        this.status = status;
        this.text = text2;
      }
    };
    ActionFailure = class {
      /**
       * @param {number} status
       * @param {T} data
       */
      constructor(status, data) {
        this.status = status;
        this.data = data;
      }
    };
  }
});

// node_modules/@sveltejs/kit/src/runtime/server/constants.js
var IN_WEBCONTAINER;
var init_constants = __esm({
  "node_modules/@sveltejs/kit/src/runtime/server/constants.js"() {
    IN_WEBCONTAINER = !!globalThis.process?.versions?.webcontainer;
  }
});

// node_modules/@sveltejs/kit/src/exports/internal/event.js
function with_request_store(store, fn) {
  try {
    sync_store = store;
    return als ? als.run(store, fn) : fn();
  } finally {
    if (!IN_WEBCONTAINER) {
      sync_store = null;
    }
  }
}
var sync_store, als;
var init_event = __esm({
  "node_modules/@sveltejs/kit/src/exports/internal/event.js"() {
    init_constants();
    sync_store = null;
    import("node:async_hooks").then((hooks) => als = new hooks.AsyncLocalStorage()).catch(() => {
    });
  }
});

// node_modules/@sveltejs/kit/src/exports/internal/server.js
function merge_tracing(event_like, current2) {
  return {
    ...event_like,
    tracing: {
      ...event_like.tracing,
      current: current2
    }
  };
}
var init_server = __esm({
  "node_modules/@sveltejs/kit/src/exports/internal/server.js"() {
    init_event();
  }
});

// .svelte-kit/output/server/chunks/utils.js
function get_relative_path(from, to) {
  const from_parts = from.split(/[/\\]/);
  const to_parts = to.split(/[/\\]/);
  from_parts.pop();
  while (from_parts[0] === to_parts[0]) {
    from_parts.shift();
    to_parts.shift();
  }
  let i = from_parts.length;
  while (i--) from_parts[i] = "..";
  return from_parts.concat(to_parts).join("/");
}
function base64_encode(bytes) {
  if (globalThis.Buffer) {
    return globalThis.Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function base64_decode(encoded) {
  if (globalThis.Buffer) {
    const buffer = globalThis.Buffer.from(encoded, "base64");
    return new Uint8Array(buffer);
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
var text_encoder2, text_decoder2;
var init_utils = __esm({
  ".svelte-kit/output/server/chunks/utils.js"() {
    text_encoder2 = new TextEncoder();
    text_decoder2 = new TextDecoder();
  }
});

// .svelte-kit/output/server/chunks/exports.js
function resolve(base2, path) {
  if (path[0] === "/" && path[1] === "/") return path;
  let url = new URL(base2, internal);
  url = new URL(path, url);
  return url.protocol === internal.protocol ? url.pathname + url.search + url.hash : url.href;
}
function normalize_path(path, trailing_slash) {
  if (path === "/" || trailing_slash === "ignore") return path;
  if (trailing_slash === "never") {
    return path.endsWith("/") ? path.slice(0, -1) : path;
  } else if (trailing_slash === "always" && !path.endsWith("/")) {
    return path + "/";
  }
  return path;
}
function decode_pathname(pathname) {
  return pathname.split("%25").map(decodeURI).join("%25");
}
function decode_params(params) {
  for (const key2 in params) {
    params[key2] = decodeURIComponent(params[key2]);
  }
  return params;
}
function make_trackable(url, callback, search_params_callback, allow_hash = false) {
  const tracked = new URL(url);
  Object.defineProperty(tracked, "searchParams", {
    value: new Proxy(tracked.searchParams, {
      get(obj, key2) {
        if (key2 === "get" || key2 === "getAll" || key2 === "has") {
          return (param, ...rest) => {
            search_params_callback(param);
            return obj[key2](param, ...rest);
          };
        }
        callback();
        const value = Reflect.get(obj, key2);
        return typeof value === "function" ? value.bind(obj) : value;
      }
    }),
    enumerable: true,
    configurable: true
  });
  const tracked_url_properties = ["href", "pathname", "search", "toString", "toJSON"];
  if (allow_hash) tracked_url_properties.push("hash");
  for (const property of tracked_url_properties) {
    Object.defineProperty(tracked, property, {
      get() {
        callback();
        return url[property];
      },
      enumerable: true,
      configurable: true
    });
  }
  {
    tracked[Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect) => {
      return inspect(url, opts);
    };
    tracked.searchParams[Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect) => {
      return inspect(url.searchParams, opts);
    };
  }
  if (!allow_hash) {
    disable_hash(tracked);
  }
  return tracked;
}
function disable_hash(url) {
  allow_nodejs_console_log(url);
  Object.defineProperty(url, "hash", {
    get() {
      throw new Error(
        "Cannot access event.url.hash. Consider using `page.url.hash` inside a component instead"
      );
    }
  });
}
function disable_search(url) {
  allow_nodejs_console_log(url);
  for (const property of ["search", "searchParams"]) {
    Object.defineProperty(url, property, {
      get() {
        throw new Error(`Cannot access url.${property} on a page with prerendering enabled`);
      }
    });
  }
}
function allow_nodejs_console_log(url) {
  {
    url[Symbol.for("nodejs.util.inspect.custom")] = (depth, opts, inspect) => {
      return inspect(new URL(url), opts);
    };
  }
}
function validator(expected) {
  function validate(module, file) {
    if (!module) return;
    for (const key2 in module) {
      if (key2[0] === "_" || expected.has(key2)) continue;
      const values = [...expected.values()];
      const hint = hint_for_supported_files(key2, file?.slice(file.lastIndexOf("."))) ?? `valid exports are ${values.join(", ")}, or anything with a '_' prefix`;
      throw new Error(`Invalid export '${key2}'${file ? ` in ${file}` : ""} (${hint})`);
    }
  }
  return validate;
}
function hint_for_supported_files(key2, ext = ".js") {
  const supported_files = [];
  if (valid_layout_exports.has(key2)) {
    supported_files.push(`+layout${ext}`);
  }
  if (valid_page_exports.has(key2)) {
    supported_files.push(`+page${ext}`);
  }
  if (valid_layout_server_exports.has(key2)) {
    supported_files.push(`+layout.server${ext}`);
  }
  if (valid_page_server_exports.has(key2)) {
    supported_files.push(`+page.server${ext}`);
  }
  if (valid_server_exports.has(key2)) {
    supported_files.push(`+server${ext}`);
  }
  if (supported_files.length > 0) {
    return `'${key2}' is a valid export in ${supported_files.slice(0, -1).join(", ")}${supported_files.length > 1 ? " or " : ""}${supported_files.at(-1)}`;
  }
}
var internal, valid_layout_exports, valid_page_exports, valid_layout_server_exports, valid_page_server_exports, valid_server_exports, validate_layout_exports, validate_page_exports, validate_layout_server_exports, validate_page_server_exports, validate_server_exports;
var init_exports = __esm({
  ".svelte-kit/output/server/chunks/exports.js"() {
    internal = new URL("sveltekit-internal://");
    valid_layout_exports = /* @__PURE__ */ new Set([
      "load",
      "prerender",
      "csr",
      "ssr",
      "trailingSlash",
      "config"
    ]);
    valid_page_exports = /* @__PURE__ */ new Set([...valid_layout_exports, "entries"]);
    valid_layout_server_exports = /* @__PURE__ */ new Set([...valid_layout_exports]);
    valid_page_server_exports = /* @__PURE__ */ new Set([...valid_layout_server_exports, "actions", "entries"]);
    valid_server_exports = /* @__PURE__ */ new Set([
      "GET",
      "POST",
      "PATCH",
      "PUT",
      "DELETE",
      "OPTIONS",
      "HEAD",
      "fallback",
      "prerender",
      "trailingSlash",
      "config",
      "entries"
    ]);
    validate_layout_exports = validator(valid_layout_exports);
    validate_page_exports = validator(valid_page_exports);
    validate_layout_server_exports = validator(valid_layout_server_exports);
    validate_page_server_exports = validator(valid_page_server_exports);
    validate_server_exports = validator(valid_server_exports);
  }
});

// .svelte-kit/output/server/chunks/ssr.js
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return /* @__PURE__ */ Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || a && typeof a === "object" || typeof a === "function";
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    for (const callback of callbacks) {
      callback(void 0);
    }
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
  return new CustomEvent(type, { detail, bubbles, cancelable });
}
function set_current_component(component8) {
  current_component = component8;
}
function get_current_component() {
  if (!current_component) throw new Error("Function called outside component initialization");
  return current_component;
}
function createEventDispatcher() {
  const component8 = get_current_component();
  return (type, detail, { cancelable = false } = {}) => {
    const callbacks = component8.$$.callbacks[type];
    if (callbacks) {
      const event = custom_event(
        /** @type {string} */
        type,
        detail,
        { cancelable }
      );
      callbacks.slice().forEach((fn) => {
        fn.call(component8, event);
      });
      return !event.defaultPrevented;
    }
    return true;
  };
}
function setContext(key2, context) {
  get_current_component().$$.context.set(key2, context);
  return context;
}
function getContext(key2) {
  return get_current_component().$$.context.get(key2);
}
function ensure_array_like(array_like_or_iterator) {
  return array_like_or_iterator?.length !== void 0 ? array_like_or_iterator : Array.from(array_like_or_iterator);
}
function escape(value, is_attr = false) {
  const str = String(value);
  const pattern2 = is_attr ? ATTR_REGEX : CONTENT_REGEX;
  pattern2.lastIndex = 0;
  let escaped2 = "";
  let last = 0;
  while (pattern2.test(str)) {
    const i = pattern2.lastIndex - 1;
    const ch = str[i];
    escaped2 += str.substring(last, i) + (ch === "&" ? "&amp;" : ch === '"' ? "&quot;" : "&lt;");
    last = i + 1;
  }
  return escaped2 + str.substring(last);
}
function each(items, fn) {
  items = ensure_array_like(items);
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
function validate_component(component8, name) {
  if (!component8 || !component8.$$render) {
    if (name === "svelte:component") name += " this={...}";
    throw new Error(
      `<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules. Otherwise you may need to fix a <${name}>.`
    );
  }
  return component8;
}
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(context || (parent_component ? parent_component.$$.context : [])),
      // these will be immediately discarded
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = /* @__PURE__ */ new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: /* @__PURE__ */ new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css8) => css8.code).join("\n"),
          map: null
          // TODO
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  const assignment = `="${escape(value, true)}"`;
  return ` ${name}${assignment}`;
}
var current_component, ATTR_REGEX, CONTENT_REGEX, missing_component, on_destroy;
var init_ssr = __esm({
  ".svelte-kit/output/server/chunks/ssr.js"() {
    ATTR_REGEX = /[&"<]/g;
    CONTENT_REGEX = /[&<]/g;
    missing_component = {
      $$render: () => ""
    };
  }
});

// .svelte-kit/output/server/chunks/index.js
function readable(value, start) {
  return {
    subscribe: writable(value, start).subscribe
  };
}
function writable(value, start = noop) {
  let stop;
  const subscribers = /* @__PURE__ */ new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set, update) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0 && stop) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
var subscriber_queue;
var init_chunks = __esm({
  ".svelte-kit/output/server/chunks/index.js"() {
    init_ssr();
    subscriber_queue = [];
  }
});

// .svelte-kit/output/server/chunks/ssr2.js
function onMount() {
}
function afterUpdate() {
}
var init_ssr2 = __esm({
  ".svelte-kit/output/server/chunks/ssr2.js"() {
  }
});

// node_modules/cookie/index.js
var require_cookie = __commonJS({
  "node_modules/cookie/index.js"(exports) {
    "use strict";
    exports.parse = parse3;
    exports.serialize = serialize2;
    var __toString = Object.prototype.toString;
    var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
    function parse3(str, options2) {
      if (typeof str !== "string") {
        throw new TypeError("argument str must be a string");
      }
      var obj = {};
      var opt = options2 || {};
      var dec = opt.decode || decode;
      var index8 = 0;
      while (index8 < str.length) {
        var eqIdx = str.indexOf("=", index8);
        if (eqIdx === -1) {
          break;
        }
        var endIdx = str.indexOf(";", index8);
        if (endIdx === -1) {
          endIdx = str.length;
        } else if (endIdx < eqIdx) {
          index8 = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        var key2 = str.slice(index8, eqIdx).trim();
        if (void 0 === obj[key2]) {
          var val = str.slice(eqIdx + 1, endIdx).trim();
          if (val.charCodeAt(0) === 34) {
            val = val.slice(1, -1);
          }
          obj[key2] = tryDecode(val, dec);
        }
        index8 = endIdx + 1;
      }
      return obj;
    }
    function serialize2(name, val, options2) {
      var opt = options2 || {};
      var enc = opt.encode || encode2;
      if (typeof enc !== "function") {
        throw new TypeError("option encode is invalid");
      }
      if (!fieldContentRegExp.test(name)) {
        throw new TypeError("argument name is invalid");
      }
      var value = enc(val);
      if (value && !fieldContentRegExp.test(value)) {
        throw new TypeError("argument val is invalid");
      }
      var str = name + "=" + value;
      if (null != opt.maxAge) {
        var maxAge = opt.maxAge - 0;
        if (isNaN(maxAge) || !isFinite(maxAge)) {
          throw new TypeError("option maxAge is invalid");
        }
        str += "; Max-Age=" + Math.floor(maxAge);
      }
      if (opt.domain) {
        if (!fieldContentRegExp.test(opt.domain)) {
          throw new TypeError("option domain is invalid");
        }
        str += "; Domain=" + opt.domain;
      }
      if (opt.path) {
        if (!fieldContentRegExp.test(opt.path)) {
          throw new TypeError("option path is invalid");
        }
        str += "; Path=" + opt.path;
      }
      if (opt.expires) {
        var expires = opt.expires;
        if (!isDate(expires) || isNaN(expires.valueOf())) {
          throw new TypeError("option expires is invalid");
        }
        str += "; Expires=" + expires.toUTCString();
      }
      if (opt.httpOnly) {
        str += "; HttpOnly";
      }
      if (opt.secure) {
        str += "; Secure";
      }
      if (opt.partitioned) {
        str += "; Partitioned";
      }
      if (opt.priority) {
        var priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError("option priority is invalid");
        }
      }
      if (opt.sameSite) {
        var sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
        switch (sameSite) {
          case true:
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError("option sameSite is invalid");
        }
      }
      return str;
    }
    function decode(str) {
      return str.indexOf("%") !== -1 ? decodeURIComponent(str) : str;
    }
    function encode2(val) {
      return encodeURIComponent(val);
    }
    function isDate(val) {
      return __toString.call(val) === "[object Date]" || val instanceof Date;
    }
    function tryDecode(str, decode2) {
      try {
        return decode2(str);
      } catch (e3) {
        return str;
      }
    }
  }
});

// .svelte-kit/output/server/chunks/state.svelte.js
var is_legacy;
var init_state_svelte = __esm({
  ".svelte-kit/output/server/chunks/state.svelte.js"() {
    init_ssr2();
    init_exports();
    init_server();
    is_legacy = onMount.toString().includes("$$") || /function \w+\(\) \{\}/.test(onMount.toString());
    if (is_legacy) {
      ({
        data: {},
        form: null,
        error: null,
        params: {},
        route: { id: null },
        state: {},
        status: -1,
        url: new URL("https://example.com")
      });
    }
  }
});

// .svelte-kit/output/server/chunks/stores.js
var getStores, page;
var init_stores = __esm({
  ".svelte-kit/output/server/chunks/stores.js"() {
    init_ssr();
    init_internal();
    init_exports();
    init_utils();
    init_server();
    init_state_svelte();
    getStores = () => {
      const stores = getContext("__svelte__");
      return {
        /** @type {typeof page} */
        page: {
          subscribe: stores.page.subscribe
        },
        /** @type {typeof navigating} */
        navigating: {
          subscribe: stores.navigating.subscribe
        },
        /** @type {typeof updated} */
        updated: stores.updated
      };
    };
    page = {
      subscribe(fn) {
        const store = getStores().page;
        return store.subscribe(fn);
      }
    };
  }
});

// .svelte-kit/output/server/chunks/ShortlistStore.js
function createShortlistStore() {
  const initial2 = (() => {
    if (typeof localStorage === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      return [];
    }
  })();
  const { subscribe: subscribe2, set, update } = writable(initial2);
  function persist(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
    }
    return list;
  }
  return {
    subscribe: subscribe2,
    add(match) {
      update((list) => {
        if (list.find((m) => m.username === match.username)) return list;
        return persist([...list, match]);
      });
    },
    remove(username) {
      update((list) => persist(list.filter((m) => m.username !== username)));
    },
    clear() {
      set(persist([]));
    },
    has(username) {
      try {
        const list = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
        return list.some((m) => m.username === username);
      } catch {
        return false;
      }
    }
  };
}
var STORAGE_KEY, shortlistStore;
var init_ShortlistStore = __esm({
  ".svelte-kit/output/server/chunks/ShortlistStore.js"() {
    init_chunks();
    STORAGE_KEY = "wdtw_shortlist";
    shortlistStore = createShortlistStore();
  }
});

// .svelte-kit/output/server/entries/pages/_layout.svelte.js
var layout_svelte_exports = {};
__export(layout_svelte_exports, {
  default: () => Layout
});
var css, Layout;
var init_layout_svelte = __esm({
  ".svelte-kit/output/server/entries/pages/_layout.svelte.js"() {
    init_ssr();
    init_stores();
    init_ShortlistStore();
    css = {
      code: "*, *::before, *::after{box-sizing:border-box}body{margin:0;background:#f5f2ed;color:#0a0907;font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;-webkit-font-smoothing:antialiased;background-image:repeating-conic-gradient(rgba(37,99,235,0.07) 0% 25%, transparent 0% 50%);background-size:24px 24px;background-position:0 0}a{color:inherit}h1, h2, h3, h4{font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif}.app.svelte-1siamux.svelte-1siamux{min-height:100vh}nav.svelte-1siamux.svelte-1siamux{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;height:60px;padding:0 2rem;background:rgba(245,242,237,0.88);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid #ddd8d0}.brand.svelte-1siamux.svelte-1siamux{font-size:1rem;font-weight:800;color:#0a0907;text-decoration:none;letter-spacing:-0.01em}.nav-links.svelte-1siamux.svelte-1siamux{display:flex;gap:1.5rem;align-items:center}.nav-links.svelte-1siamux a.svelte-1siamux{font-size:0.9rem;color:#3d3830;text-decoration:none;transition:color 0.15s}.nav-links.svelte-1siamux a.svelte-1siamux:hover,.nav-links.svelte-1siamux a.active.svelte-1siamux{color:#0a0907}main.svelte-1siamux.svelte-1siamux{min-height:calc(100vh - 60px)}",
      map: `{"version":3,"file":"+layout.svelte","sources":["+layout.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { page } from \\"$app/stores\\";\\nimport { shortlistStore } from \\"$lib/stores/ShortlistStore\\";\\n$: shortlistCount = $shortlistStore.length;\\n<\/script>\\n\\n<svelte:head>\\n  <link rel=\\"preconnect\\" href=\\"https://fonts.bunny.net\\" />\\n  <link href=\\"https://fonts.bunny.net/css?family=plus-jakarta-sans:400,600,700,800,900&display=swap\\" rel=\\"stylesheet\\" />\\n</svelte:head>\\n\\n<div class=\\"app\\">\\n  <nav>\\n    <a href=\\"/\\" class=\\"brand\\">whodoesthe.work</a>\\n    <div class=\\"nav-links\\">\\n      <a\\n        href=\\"/search\\"\\n        class:active={$page.url.pathname.startsWith('/search') || $page.url.pathname.startsWith('/matches')}\\n      >\\n        Find Engineers\\n      </a>\\n      <a href=\\"/shortlist\\" class:active={$page.url.pathname === '/shortlist'}>\\n        Shortlist{shortlistCount > 0 ? \` (\${shortlistCount})\` : ''}\\n      </a>\\n    </div>\\n  </nav>\\n  <main>\\n    <slot />\\n  </main>\\n</div>\\n\\n<style>\\n  :global(*, *::before, *::after) { box-sizing: border-box; }\\n  :global(body) {\\n    margin: 0;\\n    background: #f5f2ed;\\n    color: #0a0907;\\n    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\\n    -webkit-font-smoothing: antialiased;\\n    background-image: repeating-conic-gradient(rgba(37,99,235,0.07) 0% 25%, transparent 0% 50%);\\n    background-size: 24px 24px;\\n    background-position: 0 0;\\n  }\\n  :global(a) { color: inherit; }\\n  :global(h1, h2, h3, h4) {\\n    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\\n  }\\n\\n  .app { min-height: 100vh; }\\n\\n  nav {\\n    position: sticky;\\n    top: 0;\\n    z-index: 100;\\n    display: flex;\\n    align-items: center;\\n    justify-content: space-between;\\n    height: 60px;\\n    padding: 0 2rem;\\n    background: rgba(245,242,237,0.88);\\n    backdrop-filter: blur(12px);\\n    -webkit-backdrop-filter: blur(12px);\\n    border-bottom: 1px solid #ddd8d0;\\n  }\\n\\n  .brand {\\n    font-size: 1rem;\\n    font-weight: 800;\\n    color: #0a0907;\\n    text-decoration: none;\\n    letter-spacing: -0.01em;\\n  }\\n\\n  .nav-links {\\n    display: flex;\\n    gap: 1.5rem;\\n    align-items: center;\\n  }\\n\\n  .nav-links a {\\n    font-size: 0.9rem;\\n    color: #3d3830;\\n    text-decoration: none;\\n    transition: color 0.15s;\\n  }\\n\\n  .nav-links a:hover,\\n  .nav-links a.active {\\n    color: #0a0907;\\n  }\\n\\n  main {\\n    min-height: calc(100vh - 60px);\\n  }\\n</style>\\n"],"names":[],"mappings":"AA+BU,sBAAwB,CAAE,UAAU,CAAE,UAAY,CAClD,IAAM,CACZ,MAAM,CAAE,CAAC,CACT,UAAU,CAAE,OAAO,CACnB,KAAK,CAAE,OAAO,CACd,WAAW,CAAE,mBAAmB,CAAC,CAAC,aAAa,CAAC,CAAC,kBAAkB,CAAC,CAAC,UAAU,CAAC,CAAC,UAAU,CAC3F,sBAAsB,CAAE,WAAW,CACnC,gBAAgB,CAAE,yBAAyB,KAAK,EAAE,CAAC,EAAE,CAAC,GAAG,CAAC,IAAI,CAAC,CAAC,EAAE,CAAC,GAAG,CAAC,CAAC,WAAW,CAAC,EAAE,CAAC,GAAG,CAAC,CAC3F,eAAe,CAAE,IAAI,CAAC,IAAI,CAC1B,mBAAmB,CAAE,CAAC,CAAC,CACzB,CACQ,CAAG,CAAE,KAAK,CAAE,OAAS,CACrB,cAAgB,CACtB,WAAW,CAAE,mBAAmB,CAAC,CAAC,aAAa,CAAC,CAAC,kBAAkB,CAAC,CAAC,UAAU,CAAC,CAAC,UACnF,CAEA,kCAAK,CAAE,UAAU,CAAE,KAAO,CAE1B,iCAAI,CACF,QAAQ,CAAE,MAAM,CAChB,GAAG,CAAE,CAAC,CACN,OAAO,CAAE,GAAG,CACZ,OAAO,CAAE,IAAI,CACb,WAAW,CAAE,MAAM,CACnB,eAAe,CAAE,aAAa,CAC9B,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,CAAC,CAAC,IAAI,CACf,UAAU,CAAE,KAAK,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,IAAI,CAAC,CAClC,eAAe,CAAE,KAAK,IAAI,CAAC,CAC3B,uBAAuB,CAAE,KAAK,IAAI,CAAC,CACnC,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,OAC3B,CAEA,oCAAO,CACL,SAAS,CAAE,IAAI,CACf,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,OAAO,CACd,eAAe,CAAE,IAAI,CACrB,cAAc,CAAE,OAClB,CAEA,wCAAW,CACT,OAAO,CAAE,IAAI,CACb,GAAG,CAAE,MAAM,CACX,WAAW,CAAE,MACf,CAEA,yBAAU,CAAC,gBAAE,CACX,SAAS,CAAE,MAAM,CACjB,KAAK,CAAE,OAAO,CACd,eAAe,CAAE,IAAI,CACrB,UAAU,CAAE,KAAK,CAAC,KACpB,CAEA,yBAAU,CAAC,gBAAC,MAAM,CAClB,yBAAU,CAAC,CAAC,sBAAQ,CAClB,KAAK,CAAE,OACT,CAEA,kCAAK,CACH,UAAU,CAAE,KAAK,KAAK,CAAC,CAAC,CAAC,IAAI,CAC/B"}`
    };
    Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let shortlistCount;
      let $shortlistStore, $$unsubscribe_shortlistStore;
      let $page, $$unsubscribe_page;
      $$unsubscribe_shortlistStore = subscribe(shortlistStore, (value) => $shortlistStore = value);
      $$unsubscribe_page = subscribe(page, (value) => $page = value);
      $$result.css.add(css);
      shortlistCount = $shortlistStore.length;
      $$unsubscribe_shortlistStore();
      $$unsubscribe_page();
      return `${$$result.head += `<!-- HEAD_svelte-h53cys_START --><link rel="preconnect" href="https://fonts.bunny.net"><link href="https://fonts.bunny.net/css?family=plus-jakarta-sans:400,600,700,800,900&amp;display=swap" rel="stylesheet"><!-- HEAD_svelte-h53cys_END -->`, ""} <div class="app svelte-1siamux"><nav class="svelte-1siamux"><a href="/" class="brand svelte-1siamux" data-svelte-h="svelte-taemeu">whodoesthe.work</a> <div class="nav-links svelte-1siamux"><a href="/search" class="${[
        "svelte-1siamux",
        $page.url.pathname.startsWith("/search") || $page.url.pathname.startsWith("/matches") ? "active" : ""
      ].join(" ").trim()}" data-svelte-h="svelte-1r7sxnm">Find Engineers</a> <a href="/shortlist" class="${["svelte-1siamux", $page.url.pathname === "/shortlist" ? "active" : ""].join(" ").trim()}">Shortlist${escape(shortlistCount > 0 ? ` (${shortlistCount})` : "")}</a></div></nav> <main class="svelte-1siamux">${slots.default ? slots.default({}) : ``}</main> </div>`;
    });
  }
});

// .svelte-kit/output/server/nodes/0.js
var __exports = {};
__export(__exports, {
  component: () => component,
  fonts: () => fonts,
  imports: () => imports,
  index: () => index,
  stylesheets: () => stylesheets
});
var index, component_cache, component, imports, stylesheets, fonts;
var init__ = __esm({
  ".svelte-kit/output/server/nodes/0.js"() {
    index = 0;
    component = async () => component_cache ??= (await Promise.resolve().then(() => (init_layout_svelte(), layout_svelte_exports))).default;
    imports = ["_app/immutable/nodes/0.CAEOLsNU.js", "_app/immutable/chunks/DyFvLQCM.js", "_app/immutable/chunks/CmEbjEsd.js", "_app/immutable/chunks/Cy91UwDa.js", "_app/immutable/chunks/BAsHyxeC.js", "_app/immutable/chunks/DfWdpNK_.js", "_app/immutable/chunks/CSUp05l_.js"];
    stylesheets = ["_app/immutable/assets/0.B5CnRJs3.css"];
    fonts = [];
  }
});

// .svelte-kit/output/server/entries/fallbacks/error.svelte.js
var error_svelte_exports = {};
__export(error_svelte_exports, {
  default: () => Error2
});
var Error2;
var init_error_svelte = __esm({
  ".svelte-kit/output/server/entries/fallbacks/error.svelte.js"() {
    init_ssr();
    init_stores();
    Error2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $page, $$unsubscribe_page;
      $$unsubscribe_page = subscribe(page, (value) => $page = value);
      $$unsubscribe_page();
      return `<h1>${escape($page.status)}</h1> <p>${escape($page.error?.message)}</p>`;
    });
  }
});

// .svelte-kit/output/server/nodes/1.js
var __exports2 = {};
__export(__exports2, {
  component: () => component2,
  fonts: () => fonts2,
  imports: () => imports2,
  index: () => index2,
  stylesheets: () => stylesheets2
});
var index2, component_cache2, component2, imports2, stylesheets2, fonts2;
var init__2 = __esm({
  ".svelte-kit/output/server/nodes/1.js"() {
    index2 = 1;
    component2 = async () => component_cache2 ??= (await Promise.resolve().then(() => (init_error_svelte(), error_svelte_exports))).default;
    imports2 = ["_app/immutable/nodes/1.Cayhx27D.js", "_app/immutable/chunks/DyFvLQCM.js", "_app/immutable/chunks/CmEbjEsd.js", "_app/immutable/chunks/Cy91UwDa.js", "_app/immutable/chunks/BAsHyxeC.js", "_app/immutable/chunks/DfWdpNK_.js"];
    stylesheets2 = [];
    fonts2 = [];
  }
});

// .svelte-kit/output/server/chunks/ProjectForm.js
var css2, ProjectForm;
var init_ProjectForm = __esm({
  ".svelte-kit/output/server/chunks/ProjectForm.js"() {
    init_ssr();
    css2 = {
      code: ".form.svelte-1rf6zzw{max-width:580px;margin:0 auto}.steps.svelte-1rf6zzw{display:flex;align-items:center;justify-content:center;gap:0;margin-bottom:2.5rem}.dot.svelte-1rf6zzw{width:12px;height:12px;border-radius:50%;background:transparent;border:2px solid #ddd8d0;transition:background 0.2s, border-color 0.2s}.dot.active.svelte-1rf6zzw{background:#2563eb;border-color:#2563eb}.dot.done.svelte-1rf6zzw{background:#b8ff57;border-color:#b8ff57}.line.svelte-1rf6zzw{flex:1;height:2px;background:#ddd8d0;max-width:48px}.line.done.svelte-1rf6zzw{background:#b8ff57}.step.svelte-1rf6zzw{display:flex;flex-direction:column;gap:1rem}h2.svelte-1rf6zzw{font-size:1.5rem;font-weight:800;color:#0a0907;margin:0;letter-spacing:-0.02em}.hint-top.svelte-1rf6zzw{color:#8a8070;font-size:0.9rem;margin:0}textarea.svelte-1rf6zzw{width:100%;padding:0.875rem 1rem;background:#ffffff;border:1.5px solid #ddd8d0;border-radius:8px;color:#0a0907;font-size:1rem;line-height:1.65;resize:vertical;min-height:120px;box-sizing:border-box}textarea.svelte-1rf6zzw:focus{outline:none;border-color:#2563eb}.desc-hint.svelte-1rf6zzw{font-size:0.8rem;color:#8a8070}.desc-hint.ok.svelte-1rf6zzw{color:#1a3300}.chip-grid.svelte-1rf6zzw{display:flex;flex-wrap:wrap;gap:0.5rem}.stack-chip.svelte-1rf6zzw{padding:0.35rem 0.875rem;border-radius:999px;background:#f5f2ed;border:1px solid #ddd8d0;color:#3d3830;font-size:0.875rem;cursor:pointer;transition:border-color 0.15s, color 0.15s, background 0.15s}.stack-chip.selected.svelte-1rf6zzw{border-color:#5b21b6;color:#5b21b6;background:#ede9fe}.role-grid.svelte-1rf6zzw{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem}.role-card.svelte-1rf6zzw{padding:0.875rem 1rem;background:#ffffff;border:1.5px solid #ddd8d0;border-radius:8px;color:#3d3830;font-size:0.9rem;cursor:pointer;text-align:left;transition:border-color 0.15s, color 0.15s, background 0.15s}.role-card.selected.svelte-1rf6zzw{border-color:#2563eb;color:#0a0907;background:rgba(37,99,235,0.04);border-width:2px}.btn-row.svelte-1rf6zzw{display:flex;gap:0.75rem;justify-content:flex-end}.btn-primary.svelte-1rf6zzw{padding:0.75rem 1.5rem;background:#b8ff57;color:#1a3300;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;transition:background 0.15s, transform 0.15s}.btn-primary.svelte-1rf6zzw:hover:not(:disabled){background:#a3f03d;transform:translateY(-1px)}.btn-primary.svelte-1rf6zzw:disabled{opacity:0.45;cursor:default}.btn-ghost.svelte-1rf6zzw{padding:0.75rem 1.25rem;background:transparent;color:#3d3830;border:1.5px solid #ddd8d0;border-radius:8px;font-size:1rem;cursor:pointer;transition:border-color 0.15s, color 0.15s}.btn-ghost.svelte-1rf6zzw:hover{border-color:#b0a89e;color:#0a0907}",
      map: '{"version":3,"file":"ProjectForm.svelte","sources":["ProjectForm.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { createEventDispatcher } from \\"svelte\\";\\nconst dispatch = createEventDispatcher();\\nimport { onMount } from \\"svelte\\";\\nimport { getDomains } from \\"$lib/api\\";\\nexport let initialDescription = \\"\\";\\nconst LANGUAGES = [\\n  \\"Rust\\",\\n  \\"Go\\",\\n  \\"TypeScript\\",\\n  \\"Python\\",\\n  \\"Java\\",\\n  \\"C++\\",\\n  \\"C#\\",\\n  \\"Ruby\\",\\n  \\"Scala\\",\\n  \\"Kotlin\\",\\n  \\"Swift\\",\\n  \\"Elixir\\",\\n  \\"Haskell\\",\\n  \\"Zig\\",\\n  \\"React\\",\\n  \\"Next.js\\",\\n  \\"SvelteKit\\",\\n  \\"Vue\\",\\n  \\"Node.js\\",\\n  \\"PostgreSQL\\"\\n];\\nlet domainChips = [];\\nlet selectedDomains = [];\\n$: STACKS = [\\n  ...LANGUAGES,\\n  ...domainChips.slice(0, 12).map((d) => d.domain)\\n];\\nonMount(async () => {\\n  domainChips = await getDomains();\\n});\\nconst ROLES = [\\n  \\"Backend engineer\\",\\n  \\"Frontend engineer\\",\\n  \\"Full-stack engineer\\",\\n  \\"Infrastructure / DevOps\\",\\n  \\"ML / Data engineer\\",\\n  \\"Security engineer\\"\\n];\\nlet step = 1;\\nlet description = initialDescription;\\nlet selectedStacks = [];\\nlet selectedRole = \\"\\";\\n$: descOk = description.trim().length >= 20;\\n$: descCount = description.trim().length;\\n$: descHint = descOk ? \\"Looking good\\" : `${Math.max(0, 20 - descCount)} more characters`;\\nfunction toggleStack(s) {\\n  selectedStacks = selectedStacks.includes(s) ? selectedStacks.filter((x) => x !== s) : [...selectedStacks, s];\\n}\\nfunction submit() {\\n  dispatch(\\"submit\\", {\\n    description: description.trim(),\\n    stacks: selectedStacks,\\n    role: selectedRole,\\n    limit: 10\\n  });\\n}\\n<\/script>\\n\\n<div class=\\"form\\">\\n  <!-- Progress dots -->\\n  <div class=\\"steps\\">\\n    {#each [1, 2, 3] as s}\\n      <div class=\\"dot\\" class:active={step === s} class:done={step > s} />\\n      {#if s < 3}<div class=\\"line\\" class:done={step > s} />{/if}\\n    {/each}\\n  </div>\\n\\n  {#if step === 1}\\n    <div class=\\"step\\">\\n      <h2>Describe your project</h2>\\n      <p class=\\"hint-top\\">What are you building? What engineering problems need solving?</p>\\n      <textarea\\n        bind:value={description}\\n        placeholder=\\"e.g. Building a real-time payment settlement system. Need someone who understands distributed transactions, consistency guarantees, and can ship production Rust or Go...\\"\\n        rows={5}\\n      />\\n      <div class=\\"desc-hint\\" class:ok={descOk}>{descHint}</div>\\n      <button class=\\"btn-primary\\" disabled={!descOk} on:click={() => (step = 2)}>\\n        Next \u2192\\n      </button>\\n    </div>\\n\\n  {:else if step === 2}\\n    <div class=\\"step\\">\\n      <h2>Pick your stack</h2>\\n      <p class=\\"hint-top\\">Select all that apply. Leave empty if you\'re stack-agnostic.</p>\\n      <div class=\\"chip-grid\\">\\n        {#each STACKS as s}\\n          <button\\n            class=\\"stack-chip\\"\\n            class:selected={selectedStacks.includes(s)}\\n            on:click={() => toggleStack(s)}\\n          >{s}</button>\\n        {/each}\\n      </div>\\n      <div class=\\"btn-row\\">\\n        <button class=\\"btn-ghost\\" on:click={() => (step = 1)}>\u2190 Back</button>\\n        <button class=\\"btn-primary\\" on:click={() => (step = 3)}>Next \u2192</button>\\n      </div>\\n    </div>\\n\\n  {:else}\\n    <div class=\\"step\\">\\n      <h2>What role are you hiring for?</h2>\\n      <div class=\\"role-grid\\">\\n        {#each ROLES as r}\\n          <button\\n            class=\\"role-card\\"\\n            class:selected={selectedRole === r}\\n            on:click={() => (selectedRole = r)}\\n          >{r}</button>\\n        {/each}\\n      </div>\\n      <div class=\\"btn-row\\">\\n        <button class=\\"btn-ghost\\" on:click={() => (step = 2)}>\u2190 Back</button>\\n        <button class=\\"btn-primary\\" disabled={!selectedRole} on:click={submit}>\\n          Find matches \u2192\\n        </button>\\n      </div>\\n    </div>\\n  {/if}\\n</div>\\n\\n<style>\\n  .form { max-width: 580px; margin: 0 auto; }\\n  .steps { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 2.5rem; }\\n  .dot {\\n    width: 12px; height: 12px; border-radius: 50%;\\n    background: transparent; border: 2px solid #ddd8d0;\\n    transition: background 0.2s, border-color 0.2s;\\n  }\\n  .dot.active { background: #2563eb; border-color: #2563eb; }\\n  .dot.done { background: #b8ff57; border-color: #b8ff57; }\\n  .line { flex: 1; height: 2px; background: #ddd8d0; max-width: 48px; }\\n  .line.done { background: #b8ff57; }\\n  .step { display: flex; flex-direction: column; gap: 1rem; }\\n  h2 { font-size: 1.5rem; font-weight: 800; color: #0a0907; margin: 0; letter-spacing: -0.02em; }\\n  .hint-top { color: #8a8070; font-size: 0.9rem; margin: 0; }\\n  textarea {\\n    width: 100%; padding: 0.875rem 1rem; background: #ffffff;\\n    border: 1.5px solid #ddd8d0; border-radius: 8px; color: #0a0907;\\n    font-size: 1rem; line-height: 1.65; resize: vertical; min-height: 120px;\\n    box-sizing: border-box;\\n  }\\n  textarea:focus { outline: none; border-color: #2563eb; }\\n  .desc-hint { font-size: 0.8rem; color: #8a8070; }\\n  .desc-hint.ok { color: #1a3300; }\\n  .chip-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }\\n  .stack-chip {\\n    padding: 0.35rem 0.875rem; border-radius: 999px;\\n    background: #f5f2ed; border: 1px solid #ddd8d0;\\n    color: #3d3830; font-size: 0.875rem; cursor: pointer;\\n    transition: border-color 0.15s, color 0.15s, background 0.15s;\\n  }\\n  .stack-chip.selected { border-color: #5b21b6; color: #5b21b6; background: #ede9fe; }\\n  .role-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }\\n  .role-card {\\n    padding: 0.875rem 1rem; background: #ffffff; border: 1.5px solid #ddd8d0;\\n    border-radius: 8px; color: #3d3830; font-size: 0.9rem; cursor: pointer;\\n    text-align: left; transition: border-color 0.15s, color 0.15s, background 0.15s;\\n  }\\n  .role-card.selected { border-color: #2563eb; color: #0a0907; background: rgba(37,99,235,0.04); border-width: 2px; }\\n  .btn-row { display: flex; gap: 0.75rem; justify-content: flex-end; }\\n  .btn-primary {\\n    padding: 0.75rem 1.5rem; background: #b8ff57; color: #1a3300;\\n    border: none; border-radius: 8px; font-size: 1rem; font-weight: 700;\\n    cursor: pointer; transition: background 0.15s, transform 0.15s;\\n  }\\n  .btn-primary:hover:not(:disabled) { background: #a3f03d; transform: translateY(-1px); }\\n  .btn-primary:disabled { opacity: 0.45; cursor: default; }\\n  .btn-ghost {\\n    padding: 0.75rem 1.25rem; background: transparent; color: #3d3830;\\n    border: 1.5px solid #ddd8d0; border-radius: 8px; font-size: 1rem; cursor: pointer;\\n    transition: border-color 0.15s, color 0.15s;\\n  }\\n  .btn-ghost:hover { border-color: #b0a89e; color: #0a0907; }\\n</style>\\n"],"names":[],"mappings":"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"}'
    };
    ProjectForm = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let descOk;
      let descCount;
      let descHint;
      createEventDispatcher();
      let { initialDescription = "" } = $$props;
      const LANGUAGES = [
        "Rust",
        "Go",
        "TypeScript",
        "Python",
        "Java",
        "C++",
        "C#",
        "Ruby",
        "Scala",
        "Kotlin",
        "Swift",
        "Elixir",
        "Haskell",
        "Zig",
        "React",
        "Next.js",
        "SvelteKit",
        "Vue",
        "Node.js",
        "PostgreSQL"
      ];
      let domainChips = [];
      let step = 1;
      let description = initialDescription;
      if ($$props.initialDescription === void 0 && $$bindings.initialDescription && initialDescription !== void 0) $$bindings.initialDescription(initialDescription);
      $$result.css.add(css2);
      [...LANGUAGES, ...domainChips.slice(0, 12).map((d) => d.domain)];
      descOk = description.trim().length >= 20;
      descCount = description.trim().length;
      descHint = descOk ? "Looking good" : `${Math.max(0, 20 - descCount)} more characters`;
      return `<div class="form svelte-1rf6zzw"> <div class="steps svelte-1rf6zzw">${each([1, 2, 3], (s3) => {
        return `<div class="${[
          "dot svelte-1rf6zzw",
          (step === s3 ? "active" : "") + " " + (step > s3 ? "done" : "")
        ].join(" ").trim()}"></div> ${s3 < 3 ? `<div class="${["line svelte-1rf6zzw", step > s3 ? "done" : ""].join(" ").trim()}"></div>` : ``}`;
      })}</div> ${`<div class="step svelte-1rf6zzw"><h2 class="svelte-1rf6zzw" data-svelte-h="svelte-hlhp85">Describe your project</h2> <p class="hint-top svelte-1rf6zzw" data-svelte-h="svelte-8htt6e">What are you building? What engineering problems need solving?</p> <textarea placeholder="e.g. Building a real-time payment settlement system. Need someone who understands distributed transactions, consistency guarantees, and can ship production Rust or Go..."${add_attribute("rows", 5)} class="svelte-1rf6zzw">${escape(description || "")}</textarea> <div class="${["desc-hint svelte-1rf6zzw", descOk ? "ok" : ""].join(" ").trim()}">${escape(descHint)}</div> <button class="btn-primary svelte-1rf6zzw" ${!descOk ? "disabled" : ""}>Next \u2192</button></div>`} </div>`;
    });
  }
});

// .svelte-kit/output/server/entries/pages/_page.svelte.js
var page_svelte_exports = {};
__export(page_svelte_exports, {
  default: () => Page
});
var css$1, Hero, css3, Page;
var init_page_svelte = __esm({
  ".svelte-kit/output/server/entries/pages/_page.svelte.js"() {
    init_ssr();
    init_internal();
    init_exports();
    init_utils();
    init_server();
    init_state_svelte();
    init_ProjectForm();
    css$1 = {
      code: ".hero.svelte-1jx8vai{position:relative;padding:6rem 1rem 5rem;text-align:center;overflow:hidden;background-color:#f5f2ed}.blob.svelte-1jx8vai{position:absolute;top:0;left:50%;transform:translateX(-50%);width:100%;height:100%;background:radial-gradient(ellipse 700px 400px at 50% 0%, rgba(196,181,253,0.35) 0%, transparent 70%);pointer-events:none}.content.svelte-1jx8vai{position:relative;max-width:760px;margin:0 auto}.eyebrow.svelte-1jx8vai{display:inline-block;background:rgba(37,99,235,0.08);color:#2563eb;border:1.5px solid #2563eb;border-radius:4px;padding:0.35rem 1rem;font-size:0.75rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:2rem}h1.svelte-1jx8vai{font-size:clamp(3rem, 7vw, 5.5rem);font-weight:900;color:#0a0907;line-height:0.95;letter-spacing:-0.03em;margin:0 0 1.5rem}.accent.svelte-1jx8vai{color:#b8ff57}.tagline.svelte-1jx8vai{font-style:italic;font-size:1.1rem;color:#8a8070;margin:0 auto 2rem;max-width:480px;line-height:1.5}.cta-row.svelte-1jx8vai{display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;margin-bottom:2rem}.btn-primary.svelte-1jx8vai{padding:0.75rem 1.75rem;background:#b8ff57;color:#1a3300;border-radius:8px;font-size:1rem;font-weight:700;text-decoration:none;transition:background 0.15s, transform 0.15s}.btn-primary.svelte-1jx8vai:hover{background:#a3f03d;transform:translateY(-1px)}.btn-ghost.svelte-1jx8vai{padding:0.75rem 1.5rem;background:transparent;color:#0a0907;border:1.5px solid #0a0907;border-radius:8px;font-size:1rem;text-decoration:none;transition:border-color 0.15s, color 0.15s}.btn-ghost.svelte-1jx8vai:hover{border-color:#2563eb;color:#2563eb}.chips.svelte-1jx8vai{display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;justify-content:center}.chips-label.svelte-1jx8vai{font-size:0.8rem;color:#8a8070}.chip.svelte-1jx8vai{background:#f0ede8;border:1px solid #ddd8d0;color:#3d3830;border-radius:999px;padding:0.3rem 0.875rem;font-size:0.8rem;cursor:pointer;transition:background 0.15s, border-color 0.15s}.chip.svelte-1jx8vai:hover{background:#ede9fe;border-color:#c4b5fd;color:#5b21b6}.pixel-grid{background-image:repeating-conic-gradient(rgba(37,99,235,0.07) 0% 25%, transparent 0% 50%);background-size:24px 24px;background-position:0 0}",
      map: '{"version":3,"file":"Hero.svelte","sources":["Hero.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { goto } from \\"$app/navigation\\";\\nconst SAMPLE_QUERIES = [\\n  \\"Distributed systems, Go or Rust\\",\\n  \\"Frontend React + TypeScript, design systems\\",\\n  \\"ML infrastructure, Python + CUDA\\",\\n  \\"Backend APIs, high-scale Postgres\\"\\n];\\nfunction prefill(query) {\\n  goto(`/search?q=${encodeURIComponent(query)}`);\\n}\\n<\/script>\\n\\n<section class=\\"hero pixel-grid\\">\\n  <div class=\\"blob\\" aria-hidden=\\"true\\" />\\n  <div class=\\"content\\">\\n    <div class=\\"eyebrow\\">DEVELOPER INTELLIGENCE</div>\\n    <h1>\\n      Find engineers who\'ve built<br />\\n      <span class=\\"accent\\">exactly what you need</span>\\n    </h1>\\n    <p class=\\"tagline\\">Built from real commit evidence, not resumes.</p>\\n    <div class=\\"cta-row\\">\\n      <a href=\\"/search\\" class=\\"btn-primary\\">Find engineers \u2192</a>\\n      <a href=\\"/mcp\\" class=\\"btn-ghost\\">MCP API for agents</a>\\n    </div>\\n    <div class=\\"chips\\">\\n      <span class=\\"chips-label\\">Try:</span>\\n      {#each SAMPLE_QUERIES as q}\\n        <button class=\\"chip\\" on:click={() => prefill(q)}>{q}</button>\\n      {/each}\\n    </div>\\n  </div>\\n</section>\\n\\n<style>\\n  .hero {\\n    position: relative;\\n    padding: 6rem 1rem 5rem;\\n    text-align: center;\\n    overflow: hidden;\\n    background-color: #f5f2ed;\\n    /* pixel grid applied via class above */\\n  }\\n  .blob {\\n    position: absolute;\\n    top: 0; left: 50%; transform: translateX(-50%);\\n    width: 100%; height: 100%;\\n    background: radial-gradient(ellipse 700px 400px at 50% 0%, rgba(196,181,253,0.35) 0%, transparent 70%);\\n    pointer-events: none;\\n  }\\n  .content { position: relative; max-width: 760px; margin: 0 auto; }\\n  .eyebrow {\\n    display: inline-block;\\n    background: rgba(37,99,235,0.08);\\n    color: #2563eb;\\n    border: 1.5px solid #2563eb;\\n    border-radius: 4px;\\n    padding: 0.35rem 1rem;\\n    font-size: 0.75rem;\\n    font-weight: 700;\\n    letter-spacing: 0.1em;\\n    text-transform: uppercase;\\n    margin-bottom: 2rem;\\n  }\\n  h1 {\\n    font-size: clamp(3rem, 7vw, 5.5rem);\\n    font-weight: 900;\\n    color: #0a0907;\\n    line-height: 0.95;\\n    letter-spacing: -0.03em;\\n    margin: 0 0 1.5rem;\\n  }\\n  .accent { color: #b8ff57; }\\n  .tagline {\\n    font-style: italic;\\n    font-size: 1.1rem;\\n    color: #8a8070;\\n    margin: 0 auto 2rem;\\n    max-width: 480px;\\n    line-height: 1.5;\\n  }\\n  .cta-row { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-bottom: 2rem; }\\n  .btn-primary {\\n    padding: 0.75rem 1.75rem;\\n    background: #b8ff57;\\n    color: #1a3300;\\n    border-radius: 8px;\\n    font-size: 1rem;\\n    font-weight: 700;\\n    text-decoration: none;\\n    transition: background 0.15s, transform 0.15s;\\n  }\\n  .btn-primary:hover { background: #a3f03d; transform: translateY(-1px); }\\n  .btn-ghost {\\n    padding: 0.75rem 1.5rem;\\n    background: transparent;\\n    color: #0a0907;\\n    border: 1.5px solid #0a0907;\\n    border-radius: 8px;\\n    font-size: 1rem;\\n    text-decoration: none;\\n    transition: border-color 0.15s, color 0.15s;\\n  }\\n  .btn-ghost:hover { border-color: #2563eb; color: #2563eb; }\\n  .chips { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }\\n  .chips-label { font-size: 0.8rem; color: #8a8070; }\\n  .chip {\\n    background: #f0ede8;\\n    border: 1px solid #ddd8d0;\\n    color: #3d3830;\\n    border-radius: 999px;\\n    padding: 0.3rem 0.875rem;\\n    font-size: 0.8rem;\\n    cursor: pointer;\\n    transition: background 0.15s, border-color 0.15s;\\n  }\\n  .chip:hover { background: #ede9fe; border-color: #c4b5fd; color: #5b21b6; }\\n\\n  /* Global pixel grid utility */\\n  :global(.pixel-grid) {\\n    background-image: repeating-conic-gradient(rgba(37,99,235,0.07) 0% 25%, transparent 0% 50%);\\n    background-size: 24px 24px;\\n    background-position: 0 0;\\n  }\\n</style>\\n"],"names":[],"mappings":"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"}'
    };
    Hero = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      const SAMPLE_QUERIES = [
        "Distributed systems, Go or Rust",
        "Frontend React + TypeScript, design systems",
        "ML infrastructure, Python + CUDA",
        "Backend APIs, high-scale Postgres"
      ];
      $$result.css.add(css$1);
      return `<section class="hero pixel-grid svelte-1jx8vai"><div class="blob svelte-1jx8vai" aria-hidden="true"></div> <div class="content svelte-1jx8vai"><div class="eyebrow svelte-1jx8vai" data-svelte-h="svelte-1gvfsir">DEVELOPER INTELLIGENCE</div> <h1 class="svelte-1jx8vai" data-svelte-h="svelte-b061oj">Find engineers who&#39;ve built<br> <span class="accent svelte-1jx8vai">exactly what you need</span></h1> <p class="tagline svelte-1jx8vai" data-svelte-h="svelte-7ygnk">Built from real commit evidence, not resumes.</p> <div class="cta-row svelte-1jx8vai" data-svelte-h="svelte-iq3n1v"><a href="/search" class="btn-primary svelte-1jx8vai">Find engineers \u2192</a> <a href="/mcp" class="btn-ghost svelte-1jx8vai">MCP API for agents</a></div> <div class="chips svelte-1jx8vai"><span class="chips-label svelte-1jx8vai" data-svelte-h="svelte-kniz8k">Try:</span> ${each(SAMPLE_QUERIES, (q) => {
        return `<button class="chip svelte-1jx8vai">${escape(q)}</button>`;
      })}</div></div> </section>`;
    });
    css3 = {
      code: ".form-section.svelte-m8xlle.svelte-m8xlle{max-width:640px;margin:0 auto;padding:3rem 1.5rem}.form-header.svelte-m8xlle.svelte-m8xlle{text-align:center;margin-bottom:2.5rem}.form-header.svelte-m8xlle h2.svelte-m8xlle{font-size:clamp(1.75rem, 3.5vw, 2.25rem);font-weight:800;color:#0a0907;margin:0 0 0.5rem;letter-spacing:-0.02em}.form-header.svelte-m8xlle p.svelte-m8xlle{color:#8a8070;font-size:1rem;margin:0;line-height:1.6}.value-props.svelte-m8xlle.svelte-m8xlle{max-width:960px;margin:0 auto;padding:0 1.5rem 4rem}.grid.svelte-m8xlle.svelte-m8xlle{display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:1.25rem}.prop.svelte-m8xlle.svelte-m8xlle{background:#ffffff;border:1.5px solid #ddd8d0;border-radius:10px;padding:1.5rem;transition:border-color 0.15s, box-shadow 0.15s}.prop.svelte-m8xlle.svelte-m8xlle:hover{border-color:#2563eb;box-shadow:0 2px 16px rgba(0,0,0,0.06)}.prop-icon.svelte-m8xlle.svelte-m8xlle{font-size:1.5rem;margin-bottom:0.75rem}.prop.svelte-m8xlle h3.svelte-m8xlle{font-size:1rem;font-weight:700;color:#0a0907;margin:0 0 0.5rem;letter-spacing:-0.01em}.prop.svelte-m8xlle p.svelte-m8xlle{font-size:0.9rem;color:#8a8070;margin:0;line-height:1.65}.stats-bar.svelte-m8xlle.svelte-m8xlle{border-top:1px solid #ddd8d0;padding:2rem 1.5rem;background:#ffffff}.stats.svelte-m8xlle.svelte-m8xlle{max-width:720px;margin:0 auto;display:flex;align-items:center;justify-content:center;gap:2rem;flex-wrap:wrap}.stat.svelte-m8xlle.svelte-m8xlle{display:flex;flex-direction:column;align-items:center;gap:0.2rem}.stat-num.svelte-m8xlle.svelte-m8xlle{font-size:1.25rem;font-weight:800;color:#2563eb;font-variant-numeric:tabular-nums}.stat-label.svelte-m8xlle.svelte-m8xlle{font-size:0.75rem;color:#8a8070;text-align:center;text-transform:uppercase;letter-spacing:0.06em;font-weight:600}.divider.svelte-m8xlle.svelte-m8xlle{width:1px;height:32px;background:#ddd8d0}",
      map: `{"version":3,"file":"+page.svelte","sources":["+page.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { goto } from \\"$app/navigation\\";\\nimport Hero from \\"$lib/components/Hero.svelte\\";\\nimport ProjectForm from \\"$lib/components/ProjectForm.svelte\\";\\nimport { pendingSearch } from \\"$lib/stores/SearchStore\\";\\nfunction handleSubmit(event) {\\n  pendingSearch.set(event.detail);\\n  goto(\\"/matches\\");\\n}\\n<\/script>\\n\\n<svelte:head>\\n  <title>whodoesthe.work \u2014 Developer Intelligence Platform</title>\\n</svelte:head>\\n\\n<Hero />\\n\\n<section class=\\"form-section\\">\\n  <div class=\\"form-header\\">\\n    <h2>Start your search</h2>\\n    <p>Describe your project and we'll match you with developers who've built something similar.</p>\\n  </div>\\n  <ProjectForm on:submit={handleSubmit} />\\n</section>\\n\\n<section class=\\"value-props\\">\\n  <div class=\\"grid\\">\\n    <div class=\\"prop\\">\\n      <div class=\\"prop-icon\\">&#127919;</div>\\n      <h3>Contribution-based matching</h3>\\n      <p>We analyze public GitHub commits, PRs, and code reviews \u2014 not self-reported skills or keyword-stuffed profiles.</p>\\n    </div>\\n    <div class=\\"prop\\">\\n      <div class=\\"prop-icon\\">&#9889;</div>\\n      <h3>AI match explanations</h3>\\n      <p>Every result comes with a one-sentence explanation of why this developer fits your specific project \u2014 grounded in actual evidence.</p>\\n    </div>\\n    <div class=\\"prop\\">\\n      <div class=\\"prop-icon\\">&#128203;</div>\\n      <h3>Shortlist and compare</h3>\\n      <p>Save your top candidates to a shortlist backed by localStorage. Compare side-by-side without losing context.</p>\\n    </div>\\n  </div>\\n</section>\\n\\n<section class=\\"stats-bar\\">\\n  <div class=\\"stats\\">\\n    <div class=\\"stat\\">\\n      <span class=\\"stat-num\\">6</span>\\n      <span class=\\"stat-label\\">quality dimensions</span>\\n    </div>\\n    <div class=\\"divider\\" />\\n    <div class=\\"stat\\">\\n      <span class=\\"stat-num\\">Edge</span>\\n      <span class=\\"stat-label\\">Cloudflare Workers</span>\\n    </div>\\n    <div class=\\"divider\\" />\\n    <div class=\\"stat\\">\\n      <span class=\\"stat-num\\">&lt;3s</span>\\n      <span class=\\"stat-label\\">median first result</span>\\n    </div>\\n    <div class=\\"divider\\" />\\n    <div class=\\"stat\\">\\n      <span class=\\"stat-num\\">Public</span>\\n      <span class=\\"stat-label\\">data only, auditable</span>\\n    </div>\\n  </div>\\n</section>\\n\\n<style>\\n  .form-section {\\n    max-width: 640px;\\n    margin: 0 auto;\\n    padding: 3rem 1.5rem;\\n  }\\n\\n  .form-header {\\n    text-align: center;\\n    margin-bottom: 2.5rem;\\n  }\\n\\n  .form-header h2 {\\n    font-size: clamp(1.75rem, 3.5vw, 2.25rem);\\n    font-weight: 800;\\n    color: #0a0907;\\n    margin: 0 0 0.5rem;\\n    letter-spacing: -0.02em;\\n  }\\n\\n  .form-header p {\\n    color: #8a8070;\\n    font-size: 1rem;\\n    margin: 0;\\n    line-height: 1.6;\\n  }\\n\\n  .value-props {\\n    max-width: 960px;\\n    margin: 0 auto;\\n    padding: 0 1.5rem 4rem;\\n  }\\n\\n  .grid {\\n    display: grid;\\n    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));\\n    gap: 1.25rem;\\n  }\\n\\n  .prop {\\n    background: #ffffff;\\n    border: 1.5px solid #ddd8d0;\\n    border-radius: 10px;\\n    padding: 1.5rem;\\n    transition: border-color 0.15s, box-shadow 0.15s;\\n  }\\n\\n  .prop:hover {\\n    border-color: #2563eb;\\n    box-shadow: 0 2px 16px rgba(0,0,0,0.06);\\n  }\\n\\n  .prop-icon {\\n    font-size: 1.5rem;\\n    margin-bottom: 0.75rem;\\n  }\\n\\n  .prop h3 {\\n    font-size: 1rem;\\n    font-weight: 700;\\n    color: #0a0907;\\n    margin: 0 0 0.5rem;\\n    letter-spacing: -0.01em;\\n  }\\n\\n  .prop p {\\n    font-size: 0.9rem;\\n    color: #8a8070;\\n    margin: 0;\\n    line-height: 1.65;\\n  }\\n\\n  .stats-bar {\\n    border-top: 1px solid #ddd8d0;\\n    padding: 2rem 1.5rem;\\n    background: #ffffff;\\n  }\\n\\n  .stats {\\n    max-width: 720px;\\n    margin: 0 auto;\\n    display: flex;\\n    align-items: center;\\n    justify-content: center;\\n    gap: 2rem;\\n    flex-wrap: wrap;\\n  }\\n\\n  .stat {\\n    display: flex;\\n    flex-direction: column;\\n    align-items: center;\\n    gap: 0.2rem;\\n  }\\n\\n  .stat-num {\\n    font-size: 1.25rem;\\n    font-weight: 800;\\n    color: #2563eb;\\n    font-variant-numeric: tabular-nums;\\n  }\\n\\n  .stat-label {\\n    font-size: 0.75rem;\\n    color: #8a8070;\\n    text-align: center;\\n    text-transform: uppercase;\\n    letter-spacing: 0.06em;\\n    font-weight: 600;\\n  }\\n\\n  .divider {\\n    width: 1px;\\n    height: 32px;\\n    background: #ddd8d0;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAqEE,yCAAc,CACZ,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,IAAI,CAAC,MAChB,CAEA,wCAAa,CACX,UAAU,CAAE,MAAM,CAClB,aAAa,CAAE,MACjB,CAEA,0BAAY,CAAC,gBAAG,CACd,SAAS,CAAE,MAAM,OAAO,CAAC,CAAC,KAAK,CAAC,CAAC,OAAO,CAAC,CACzC,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,OAAO,CACd,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,MAAM,CAClB,cAAc,CAAE,OAClB,CAEA,0BAAY,CAAC,eAAE,CACb,KAAK,CAAE,OAAO,CACd,SAAS,CAAE,IAAI,CACf,MAAM,CAAE,CAAC,CACT,WAAW,CAAE,GACf,CAEA,wCAAa,CACX,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,CAAC,CAAC,MAAM,CAAC,IACpB,CAEA,iCAAM,CACJ,OAAO,CAAE,IAAI,CACb,qBAAqB,CAAE,OAAO,QAAQ,CAAC,CAAC,OAAO,KAAK,CAAC,CAAC,GAAG,CAAC,CAAC,CAC3D,GAAG,CAAE,OACP,CAEA,iCAAM,CACJ,UAAU,CAAE,OAAO,CACnB,MAAM,CAAE,KAAK,CAAC,KAAK,CAAC,OAAO,CAC3B,aAAa,CAAE,IAAI,CACnB,OAAO,CAAE,MAAM,CACf,UAAU,CAAE,YAAY,CAAC,KAAK,CAAC,CAAC,UAAU,CAAC,KAC7C,CAEA,iCAAK,MAAO,CACV,YAAY,CAAE,OAAO,CACrB,UAAU,CAAE,CAAC,CAAC,GAAG,CAAC,IAAI,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CACxC,CAEA,sCAAW,CACT,SAAS,CAAE,MAAM,CACjB,aAAa,CAAE,OACjB,CAEA,mBAAK,CAAC,gBAAG,CACP,SAAS,CAAE,IAAI,CACf,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,OAAO,CACd,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,MAAM,CAClB,cAAc,CAAE,OAClB,CAEA,mBAAK,CAAC,eAAE,CACN,SAAS,CAAE,MAAM,CACjB,KAAK,CAAE,OAAO,CACd,MAAM,CAAE,CAAC,CACT,WAAW,CAAE,IACf,CAEA,sCAAW,CACT,UAAU,CAAE,GAAG,CAAC,KAAK,CAAC,OAAO,CAC7B,OAAO,CAAE,IAAI,CAAC,MAAM,CACpB,UAAU,CAAE,OACd,CAEA,kCAAO,CACL,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,IAAI,CACb,WAAW,CAAE,MAAM,CACnB,eAAe,CAAE,MAAM,CACvB,GAAG,CAAE,IAAI,CACT,SAAS,CAAE,IACb,CAEA,iCAAM,CACJ,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,WAAW,CAAE,MAAM,CACnB,GAAG,CAAE,MACP,CAEA,qCAAU,CACR,SAAS,CAAE,OAAO,CAClB,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,OAAO,CACd,oBAAoB,CAAE,YACxB,CAEA,uCAAY,CACV,SAAS,CAAE,OAAO,CAClB,KAAK,CAAE,OAAO,CACd,UAAU,CAAE,MAAM,CAClB,cAAc,CAAE,SAAS,CACzB,cAAc,CAAE,MAAM,CACtB,WAAW,CAAE,GACf,CAEA,oCAAS,CACP,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,IAAI,CACZ,UAAU,CAAE,OACd"}`
    };
    Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      $$result.css.add(css3);
      return `${$$result.head += `<!-- HEAD_svelte-1bbfltu_START -->${$$result.title = `<title>whodoesthe.work \u2014 Developer Intelligence Platform</title>`, ""}<!-- HEAD_svelte-1bbfltu_END -->`, ""} ${validate_component(Hero, "Hero").$$render($$result, {}, {}, {})} <section class="form-section svelte-m8xlle"><div class="form-header svelte-m8xlle" data-svelte-h="svelte-bbr8wl"><h2 class="svelte-m8xlle">Start your search</h2> <p class="svelte-m8xlle">Describe your project and we&#39;ll match you with developers who&#39;ve built something similar.</p></div> ${validate_component(ProjectForm, "ProjectForm").$$render($$result, {}, {}, {})}</section> <section class="value-props svelte-m8xlle" data-svelte-h="svelte-1g5eyzg"><div class="grid svelte-m8xlle"><div class="prop svelte-m8xlle"><div class="prop-icon svelte-m8xlle">\u{1F3AF}</div> <h3 class="svelte-m8xlle">Contribution-based matching</h3> <p class="svelte-m8xlle">We analyze public GitHub commits, PRs, and code reviews \u2014 not self-reported skills or keyword-stuffed profiles.</p></div> <div class="prop svelte-m8xlle"><div class="prop-icon svelte-m8xlle">\u26A1</div> <h3 class="svelte-m8xlle">AI match explanations</h3> <p class="svelte-m8xlle">Every result comes with a one-sentence explanation of why this developer fits your specific project \u2014 grounded in actual evidence.</p></div> <div class="prop svelte-m8xlle"><div class="prop-icon svelte-m8xlle">\u{1F4CB}</div> <h3 class="svelte-m8xlle">Shortlist and compare</h3> <p class="svelte-m8xlle">Save your top candidates to a shortlist backed by localStorage. Compare side-by-side without losing context.</p></div></div></section> <section class="stats-bar svelte-m8xlle" data-svelte-h="svelte-t53kpi"><div class="stats svelte-m8xlle"><div class="stat svelte-m8xlle"><span class="stat-num svelte-m8xlle">6</span> <span class="stat-label svelte-m8xlle">quality dimensions</span></div> <div class="divider svelte-m8xlle"></div> <div class="stat svelte-m8xlle"><span class="stat-num svelte-m8xlle">Edge</span> <span class="stat-label svelte-m8xlle">Cloudflare Workers</span></div> <div class="divider svelte-m8xlle"></div> <div class="stat svelte-m8xlle"><span class="stat-num svelte-m8xlle">&lt;3s</span> <span class="stat-label svelte-m8xlle">median first result</span></div> <div class="divider svelte-m8xlle"></div> <div class="stat svelte-m8xlle"><span class="stat-num svelte-m8xlle">Public</span> <span class="stat-label svelte-m8xlle">data only, auditable</span></div></div> </section>`;
    });
  }
});

// .svelte-kit/output/server/nodes/2.js
var __exports3 = {};
__export(__exports3, {
  component: () => component3,
  fonts: () => fonts3,
  imports: () => imports3,
  index: () => index3,
  stylesheets: () => stylesheets3
});
var index3, component_cache3, component3, imports3, stylesheets3, fonts3;
var init__3 = __esm({
  ".svelte-kit/output/server/nodes/2.js"() {
    index3 = 2;
    component3 = async () => component_cache3 ??= (await Promise.resolve().then(() => (init_page_svelte(), page_svelte_exports))).default;
    imports3 = ["_app/immutable/nodes/2.Ccntuvyc.js", "_app/immutable/chunks/DyFvLQCM.js", "_app/immutable/chunks/CmEbjEsd.js", "_app/immutable/chunks/BAsHyxeC.js", "_app/immutable/chunks/DfWdpNK_.js", "_app/immutable/chunks/D6YF6ztN.js", "_app/immutable/chunks/DxrIyZV1.js", "_app/immutable/chunks/Ca6diGT7.js"];
    stylesheets3 = ["_app/immutable/assets/ProjectForm.CK00JySN.css", "_app/immutable/assets/2.BK4tbs-J.css"];
    fonts3 = [];
  }
});

// .svelte-kit/output/server/chunks/SearchStore.js
var pendingSearch;
var init_SearchStore = __esm({
  ".svelte-kit/output/server/chunks/SearchStore.js"() {
    init_chunks();
    pendingSearch = writable(null);
  }
});

// .svelte-kit/output/server/entries/pages/developer/_username_/_page.svelte.js
var page_svelte_exports2 = {};
__export(page_svelte_exports2, {
  default: () => Page2
});
var css4, Page2;
var init_page_svelte2 = __esm({
  ".svelte-kit/output/server/entries/pages/developer/_username_/_page.svelte.js"() {
    init_ssr();
    init_stores();
    init_SearchStore();
    init_ShortlistStore();
    css4 = {
      code: ".page.svelte-12e2xwz.svelte-12e2xwz{max-width:720px;margin:0 auto;padding:2rem 1.5rem}.back-nav.svelte-12e2xwz.svelte-12e2xwz{margin-bottom:1.5rem}.back-link.svelte-12e2xwz.svelte-12e2xwz{font-size:0.85rem;color:#8a8070;text-decoration:none;transition:color 0.15s}.back-link.svelte-12e2xwz.svelte-12e2xwz:hover{color:#2563eb}.loading.svelte-12e2xwz.svelte-12e2xwz{display:flex;flex-direction:column;align-items:center;gap:1.25rem;padding:5rem 0}.spinner.svelte-12e2xwz.svelte-12e2xwz{width:36px;height:36px;border:3px solid #ddd8d0;border-top-color:#2563eb;border-radius:50%;animation:svelte-12e2xwz-spin 0.7s linear infinite}.loading-text.svelte-12e2xwz.svelte-12e2xwz{font-size:1rem;color:#8a8070;margin:0}@keyframes svelte-12e2xwz-spin{to{transform:rotate(360deg)}}.error-state.svelte-12e2xwz.svelte-12e2xwz{text-align:center;padding:4rem 0}.error-msg.svelte-12e2xwz.svelte-12e2xwz{color:#991b1b;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:0.75rem 1rem;font-size:0.9rem;margin-bottom:1rem}.btn-primary.svelte-12e2xwz.svelte-12e2xwz{display:inline-block;padding:0.625rem 1.5rem;background:#b8ff57;color:#1a3300;border-radius:8px;font-size:0.9rem;font-weight:700;text-decoration:none;transition:background 0.15s, transform 0.15s}.btn-primary.svelte-12e2xwz.svelte-12e2xwz:hover{background:#a3f03d;transform:translateY(-1px)}.hero-row.svelte-12e2xwz.svelte-12e2xwz{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem;gap:1rem;flex-wrap:wrap}.identity.svelte-12e2xwz h1.svelte-12e2xwz{font-size:clamp(1.75rem, 4vw, 2.5rem);font-weight:900;color:#0a0907;margin:0 0 0.375rem;letter-spacing:-0.03em;line-height:1}.gh-link.svelte-12e2xwz.svelte-12e2xwz{font-size:0.875rem;color:#2563eb;text-decoration:none;transition:color 0.15s}.gh-link.svelte-12e2xwz.svelte-12e2xwz:hover{color:#1d4ed8}.hero-right.svelte-12e2xwz.svelte-12e2xwz{display:flex;flex-direction:column;align-items:flex-end;gap:0.75rem}.impact-block.svelte-12e2xwz.svelte-12e2xwz{display:flex;flex-direction:column;align-items:flex-end;gap:0.125rem}.impact-num.svelte-12e2xwz.svelte-12e2xwz{font-size:3rem;font-weight:900;color:#b8ff57;line-height:1;font-variant-numeric:tabular-nums;-webkit-text-stroke:0.5px #1a3300;text-shadow:0 1px 2px rgba(26,51,0,0.15)}.impact-label.svelte-12e2xwz.svelte-12e2xwz{font-size:0.65rem;font-weight:700;color:#8a8070;letter-spacing:0.1em;text-transform:uppercase}.shortlist-btn.svelte-12e2xwz.svelte-12e2xwz{padding:0.4rem 1rem;border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;background:transparent;border:1.5px solid #ddd8d0;color:#8a8070;transition:border-color 0.15s, color 0.15s, background 0.15s}.shortlist-btn.svelte-12e2xwz.svelte-12e2xwz:hover{border-color:#5b21b6;color:#5b21b6}.shortlist-btn.active.svelte-12e2xwz.svelte-12e2xwz{border-color:#5b21b6;color:#5b21b6;background:#ede9fe}.section.svelte-12e2xwz.svelte-12e2xwz{margin:2rem 0}.section-title.svelte-12e2xwz.svelte-12e2xwz{font-size:0.75rem;font-weight:700;color:#8a8070;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 1rem}.scores.svelte-12e2xwz.svelte-12e2xwz{background:#ffffff;border:1.5px solid #ddd8d0;border-radius:10px;padding:1.25rem 1.5rem}.domain-chips.svelte-12e2xwz.svelte-12e2xwz{display:grid;grid-template-columns:repeat(auto-fill, minmax(160px, 1fr));gap:0.75rem}.domain-card.svelte-12e2xwz.svelte-12e2xwz{background:#ede9fe;border:1px solid #c4b5fd;border-radius:8px;padding:0.875rem;display:flex;flex-direction:column;gap:0.25rem}.domain-name.svelte-12e2xwz.svelte-12e2xwz{font-size:0.875rem;color:#5b21b6;font-weight:600}.domain-score.svelte-12e2xwz.svelte-12e2xwz{font-size:1.25rem;font-weight:800;color:#4c1d95;font-variant-numeric:tabular-nums}.domain-count.svelte-12e2xwz.svelte-12e2xwz{font-size:0.7rem;color:#7c3aed;opacity:0.75}.evidence-list.svelte-12e2xwz.svelte-12e2xwz{display:flex;flex-wrap:wrap;gap:0.5rem}.evidence-link.svelte-12e2xwz.svelte-12e2xwz{display:inline-block;padding:0.3rem 0.875rem;background:#ffffff;border:1.5px solid #ddd8d0;border-radius:6px;font-size:0.8rem;color:#2563eb;text-decoration:none;font-family:'SFMono-Regular', Consolas, monospace;transition:border-color 0.15s, background 0.15s}.evidence-link.svelte-12e2xwz.svelte-12e2xwz:hover{border-color:#2563eb;background:rgba(37,99,235,0.04)}",
      map: `{"version":3,"file":"+page.svelte","sources":["+page.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { page } from \\"$app/stores\\";\\nimport { getDeveloper } from \\"$lib/api\\";\\nimport { pendingSearch } from \\"$lib/stores/SearchStore\\";\\nimport { shortlistStore } from \\"$lib/stores/ShortlistStore\\";\\nimport ScoreBar from \\"$lib/components/ScoreBar.svelte\\";\\nimport { onMount } from \\"svelte\\";\\nlet profile = null;\\nlet loading = true;\\nlet error = \\"\\";\\nonMount(async () => {\\n  try {\\n    profile = await getDeveloper($page.params.username);\\n  } catch (e) {\\n    error = String(e);\\n  } finally {\\n    loading = false;\\n  }\\n});\\n$: isShortlisted = profile ? $shortlistStore.some((m) => m.username === profile.username) : false;\\nfunction toggleShortlist() {\\n  if (!profile) return;\\n  if (isShortlisted) {\\n    shortlistStore.remove(profile.username);\\n  } else {\\n    shortlistStore.add({\\n      developerId: profile.id,\\n      username: profile.username,\\n      githubUrl: \`https://github.com/\${profile.username}\`,\\n      overallImpact: profile.overallImpact ?? 0,\\n      codeQuality: profile.codeQuality ?? 0,\\n      reviewQuality: profile.reviewQuality ?? 0,\\n      topDomains: profile.domains.slice(0, 3).map((d) => ({ domain: d.domain, score: d.score })),\\n      topLanguages: [],\\n      matchConfidence: 0,\\n      whyMatched: \\"\\"\\n    });\\n  }\\n}\\n<\/script>\\n\\n<svelte:head>\\n  <title>{$page.params.username} \u2014 whodoesthe.work</title>\\n</svelte:head>\\n\\n<div class=\\"page\\">\\n  <div class=\\"back-nav\\">\\n    {#if $pendingSearch}\\n      <a href=\\"/matches\\" class=\\"back-link\\">\u2190 Back to matches</a>\\n    {:else}\\n      <a href=\\"/\\" class=\\"back-link\\">\u2190 Home</a>\\n    {/if}\\n  </div>\\n\\n  {#if loading}\\n    <div class=\\"loading\\">\\n      <div class=\\"spinner\\" />\\n      <p class=\\"loading-text\\"><em>Loading profile\u2026</em></p>\\n    </div>\\n  {:else if error}\\n    <div class=\\"error-state\\">\\n      <p class=\\"error-msg\\">{error}</p>\\n      <a href=\\"/\\" class=\\"btn-primary\\">Go home</a>\\n    </div>\\n  {:else if profile}\\n    <div class=\\"profile\\">\\n      <!-- Hero row -->\\n      <div class=\\"hero-row\\">\\n        <div class=\\"identity\\">\\n          <h1>@{profile.username}</h1>\\n          <a\\n            href=\\"https://github.com/{profile.username}\\"\\n            target=\\"_blank\\"\\n            rel=\\"noopener noreferrer\\"\\n            class=\\"gh-link\\"\\n          >\\n            View on GitHub \u2192\\n          </a>\\n        </div>\\n        <div class=\\"hero-right\\">\\n          <div class=\\"impact-block\\">\\n            <span class=\\"impact-num\\">{profile.overallImpact?.toFixed(1) ?? '\u2014'}</span>\\n            <span class=\\"impact-label\\">OVERALL IMPACT</span>\\n          </div>\\n          <button\\n            class=\\"shortlist-btn\\"\\n            class:active={isShortlisted}\\n            on:click={toggleShortlist}\\n          >\\n            {isShortlisted ? '\u2713 Shortlisted' : '+ Shortlist'}\\n          </button>\\n        </div>\\n      </div>\\n\\n      <!-- Score breakdown -->\\n      <section class=\\"section\\">\\n        <h2 class=\\"section-title\\">Score Breakdown</h2>\\n        <div class=\\"scores\\">\\n          <ScoreBar label=\\"Code Quality\\" value={profile.codeQuality} />\\n          <ScoreBar label=\\"Review Quality\\" value={profile.reviewQuality} />\\n          <ScoreBar label=\\"Documentation\\" value={profile.documentationQuality} />\\n          <ScoreBar label=\\"Collaboration Breadth\\" value={profile.collaborationBreadth} />\\n          <ScoreBar label=\\"Consistency\\" value={profile.consistencyScore} />\\n          <ScoreBar label=\\"Recent Activity\\" value={profile.recentActivityScore} />\\n        </div>\\n      </section>\\n\\n      <!-- Domain expertise -->\\n      {#if profile.domains.length > 0}\\n        <section class=\\"section\\">\\n          <h2 class=\\"section-title\\">Domain Expertise</h2>\\n          <div class=\\"domain-chips\\">\\n            {#each profile.domains.slice(0, 8) as d}\\n              <div class=\\"domain-card\\">\\n                <span class=\\"domain-name\\">{d.domain}</span>\\n                <span class=\\"domain-score\\">{d.score.toFixed(0)}</span>\\n                <span class=\\"domain-count\\">{d.contributionCount} contributions</span>\\n              </div>\\n            {/each}\\n          </div>\\n        </section>\\n      {/if}\\n\\n      <!-- Top languages from evidence repos -->\\n      {#if profile.domains.length > 0 && profile.domains.some(d => d.evidenceRepos)}\\n        <section class=\\"section\\">\\n          <h2 class=\\"section-title\\">Evidence Repositories</h2>\\n          <div class=\\"evidence-list\\">\\n            {#each profile.domains.slice(0, 5) as d}\\n              {#if d.evidenceRepos}\\n                {#each d.evidenceRepos.split(',').slice(0, 2) as repo}\\n                  {#if repo.trim()}\\n                    <a\\n                      href=\\"https://github.com/{repo.trim()}\\"\\n                      target=\\"_blank\\"\\n                      rel=\\"noopener noreferrer\\"\\n                      class=\\"evidence-link\\"\\n                    >\\n                      {repo.trim()}\\n                    </a>\\n                  {/if}\\n                {/each}\\n              {/if}\\n            {/each}\\n          </div>\\n        </section>\\n      {/if}\\n    </div>\\n  {/if}\\n</div>\\n\\n<style>\\n  .page {\\n    max-width: 720px;\\n    margin: 0 auto;\\n    padding: 2rem 1.5rem;\\n  }\\n\\n  .back-nav {\\n    margin-bottom: 1.5rem;\\n  }\\n\\n  .back-link {\\n    font-size: 0.85rem;\\n    color: #8a8070;\\n    text-decoration: none;\\n    transition: color 0.15s;\\n  }\\n\\n  .back-link:hover {\\n    color: #2563eb;\\n  }\\n\\n  .loading {\\n    display: flex;\\n    flex-direction: column;\\n    align-items: center;\\n    gap: 1.25rem;\\n    padding: 5rem 0;\\n  }\\n\\n  .spinner {\\n    width: 36px;\\n    height: 36px;\\n    border: 3px solid #ddd8d0;\\n    border-top-color: #2563eb;\\n    border-radius: 50%;\\n    animation: spin 0.7s linear infinite;\\n  }\\n\\n  .loading-text {\\n    font-size: 1rem;\\n    color: #8a8070;\\n    margin: 0;\\n  }\\n\\n  @keyframes spin {\\n    to { transform: rotate(360deg); }\\n  }\\n\\n  .error-state {\\n    text-align: center;\\n    padding: 4rem 0;\\n  }\\n\\n  .error-msg {\\n    color: #991b1b;\\n    background: #fee2e2;\\n    border: 1px solid #fca5a5;\\n    border-radius: 8px;\\n    padding: 0.75rem 1rem;\\n    font-size: 0.9rem;\\n    margin-bottom: 1rem;\\n  }\\n\\n  .btn-primary {\\n    display: inline-block;\\n    padding: 0.625rem 1.5rem;\\n    background: #b8ff57;\\n    color: #1a3300;\\n    border-radius: 8px;\\n    font-size: 0.9rem;\\n    font-weight: 700;\\n    text-decoration: none;\\n    transition: background 0.15s, transform 0.15s;\\n  }\\n\\n  .btn-primary:hover {\\n    background: #a3f03d;\\n    transform: translateY(-1px);\\n  }\\n\\n  .hero-row {\\n    display: flex;\\n    justify-content: space-between;\\n    align-items: flex-start;\\n    margin-bottom: 2rem;\\n    gap: 1rem;\\n    flex-wrap: wrap;\\n  }\\n\\n  .identity h1 {\\n    font-size: clamp(1.75rem, 4vw, 2.5rem);\\n    font-weight: 900;\\n    color: #0a0907;\\n    margin: 0 0 0.375rem;\\n    letter-spacing: -0.03em;\\n    line-height: 1;\\n  }\\n\\n  .gh-link {\\n    font-size: 0.875rem;\\n    color: #2563eb;\\n    text-decoration: none;\\n    transition: color 0.15s;\\n  }\\n\\n  .gh-link:hover {\\n    color: #1d4ed8;\\n  }\\n\\n  .hero-right {\\n    display: flex;\\n    flex-direction: column;\\n    align-items: flex-end;\\n    gap: 0.75rem;\\n  }\\n\\n  .impact-block {\\n    display: flex;\\n    flex-direction: column;\\n    align-items: flex-end;\\n    gap: 0.125rem;\\n  }\\n\\n  .impact-num {\\n    font-size: 3rem;\\n    font-weight: 900;\\n    color: #b8ff57;\\n    line-height: 1;\\n    font-variant-numeric: tabular-nums;\\n    /* Green on light bg \u2014 use text stroke trick for readability */\\n    -webkit-text-stroke: 0.5px #1a3300;\\n    text-shadow: 0 1px 2px rgba(26,51,0,0.15);\\n  }\\n\\n  .impact-label {\\n    font-size: 0.65rem;\\n    font-weight: 700;\\n    color: #8a8070;\\n    letter-spacing: 0.1em;\\n    text-transform: uppercase;\\n  }\\n\\n  .shortlist-btn {\\n    padding: 0.4rem 1rem;\\n    border-radius: 6px;\\n    font-size: 0.85rem;\\n    font-weight: 600;\\n    cursor: pointer;\\n    background: transparent;\\n    border: 1.5px solid #ddd8d0;\\n    color: #8a8070;\\n    transition: border-color 0.15s, color 0.15s, background 0.15s;\\n  }\\n\\n  .shortlist-btn:hover {\\n    border-color: #5b21b6;\\n    color: #5b21b6;\\n  }\\n\\n  .shortlist-btn.active {\\n    border-color: #5b21b6;\\n    color: #5b21b6;\\n    background: #ede9fe;\\n  }\\n\\n  .section {\\n    margin: 2rem 0;\\n  }\\n\\n  .section-title {\\n    font-size: 0.75rem;\\n    font-weight: 700;\\n    color: #8a8070;\\n    text-transform: uppercase;\\n    letter-spacing: 0.1em;\\n    margin: 0 0 1rem;\\n  }\\n\\n  .scores {\\n    background: #ffffff;\\n    border: 1.5px solid #ddd8d0;\\n    border-radius: 10px;\\n    padding: 1.25rem 1.5rem;\\n  }\\n\\n  .domain-chips {\\n    display: grid;\\n    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));\\n    gap: 0.75rem;\\n  }\\n\\n  .domain-card {\\n    background: #ede9fe;\\n    border: 1px solid #c4b5fd;\\n    border-radius: 8px;\\n    padding: 0.875rem;\\n    display: flex;\\n    flex-direction: column;\\n    gap: 0.25rem;\\n  }\\n\\n  .domain-name {\\n    font-size: 0.875rem;\\n    color: #5b21b6;\\n    font-weight: 600;\\n  }\\n\\n  .domain-score {\\n    font-size: 1.25rem;\\n    font-weight: 800;\\n    color: #4c1d95;\\n    font-variant-numeric: tabular-nums;\\n  }\\n\\n  .domain-count {\\n    font-size: 0.7rem;\\n    color: #7c3aed;\\n    opacity: 0.75;\\n  }\\n\\n  .evidence-list {\\n    display: flex;\\n    flex-wrap: wrap;\\n    gap: 0.5rem;\\n  }\\n\\n  .evidence-link {\\n    display: inline-block;\\n    padding: 0.3rem 0.875rem;\\n    background: #ffffff;\\n    border: 1.5px solid #ddd8d0;\\n    border-radius: 6px;\\n    font-size: 0.8rem;\\n    color: #2563eb;\\n    text-decoration: none;\\n    font-family: 'SFMono-Regular', Consolas, monospace;\\n    transition: border-color 0.15s, background 0.15s;\\n  }\\n\\n  .evidence-link:hover {\\n    border-color: #2563eb;\\n    background: rgba(37,99,235,0.04);\\n  }\\n</style>\\n"],"names":[],"mappings":"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"}`
    };
    Page2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $$unsubscribe_shortlistStore;
      let $page, $$unsubscribe_page;
      let $pendingSearch, $$unsubscribe_pendingSearch;
      $$unsubscribe_shortlistStore = subscribe(shortlistStore, (value) => value);
      $$unsubscribe_page = subscribe(page, (value) => $page = value);
      $$unsubscribe_pendingSearch = subscribe(pendingSearch, (value) => $pendingSearch = value);
      $$result.css.add(css4);
      $$unsubscribe_shortlistStore();
      $$unsubscribe_page();
      $$unsubscribe_pendingSearch();
      return `${$$result.head += `<!-- HEAD_svelte-c0h6ib_START -->${$$result.title = `<title>${escape($page.params.username)} \u2014 whodoesthe.work</title>`, ""}<!-- HEAD_svelte-c0h6ib_END -->`, ""} <div class="page svelte-12e2xwz"><div class="back-nav svelte-12e2xwz">${$pendingSearch ? `<a href="/matches" class="back-link svelte-12e2xwz" data-svelte-h="svelte-1ewrrmi">\u2190 Back to matches</a>` : `<a href="/" class="back-link svelte-12e2xwz" data-svelte-h="svelte-1hhu2kp">\u2190 Home</a>`}</div> ${`<div class="loading svelte-12e2xwz" data-svelte-h="svelte-1bdovqp"><div class="spinner svelte-12e2xwz"></div> <p class="loading-text svelte-12e2xwz"><em>Loading profile\u2026</em></p></div>`} </div>`;
    });
  }
});

// .svelte-kit/output/server/nodes/3.js
var __exports4 = {};
__export(__exports4, {
  component: () => component4,
  fonts: () => fonts4,
  imports: () => imports4,
  index: () => index4,
  stylesheets: () => stylesheets4
});
var index4, component_cache4, component4, imports4, stylesheets4, fonts4;
var init__4 = __esm({
  ".svelte-kit/output/server/nodes/3.js"() {
    index4 = 3;
    component4 = async () => component_cache4 ??= (await Promise.resolve().then(() => (init_page_svelte2(), page_svelte_exports2))).default;
    imports4 = ["_app/immutable/nodes/3.DvaCoh4r.js", "_app/immutable/chunks/DyFvLQCM.js", "_app/immutable/chunks/CmEbjEsd.js", "_app/immutable/chunks/D6YF6ztN.js", "_app/immutable/chunks/Cy91UwDa.js", "_app/immutable/chunks/BAsHyxeC.js", "_app/immutable/chunks/DfWdpNK_.js", "_app/immutable/chunks/Ca6diGT7.js", "_app/immutable/chunks/CSUp05l_.js"];
    stylesheets4 = ["_app/immutable/assets/3.C52NBNhb.css"];
    fonts4 = [];
  }
});

// .svelte-kit/output/server/entries/pages/matches/_page.svelte.js
var page_svelte_exports3 = {};
__export(page_svelte_exports3, {
  default: () => Page3
});
var css5, Page3;
var init_page_svelte3 = __esm({
  ".svelte-kit/output/server/entries/pages/matches/_page.svelte.js"() {
    init_ssr();
    init_internal();
    init_exports();
    init_utils();
    init_server();
    init_state_svelte();
    init_SearchStore();
    init_ShortlistStore();
    css5 = {
      code: ".page.svelte-162prpu{max-width:720px;margin:0 auto;padding:2rem 1.5rem}.search-header.svelte-162prpu{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:0.75rem;padding-bottom:1rem;border-bottom:1px solid #ddd8d0}.query-summary.svelte-162prpu{display:flex;align-items:center;gap:0.5rem}.role.svelte-162prpu{font-size:1rem;font-weight:700;color:#0a0907}.separator.svelte-162prpu{color:#ddd8d0}.stacks.svelte-162prpu{font-size:0.9rem;color:#8a8070}.header-actions.svelte-162prpu{display:flex;gap:1rem;align-items:center}.refine-link.svelte-162prpu{font-size:0.85rem;color:#8a8070;text-decoration:none;transition:color 0.15s}.refine-link.svelte-162prpu:hover{color:#0a0907}.shortlist-link.svelte-162prpu{font-size:0.85rem;color:#2563eb;text-decoration:none;transition:color 0.15s}.shortlist-link.svelte-162prpu:hover{color:#1d4ed8}.result-count.svelte-162prpu{font-size:0.75rem;color:#8a8070;margin-bottom:1rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:600}.results.svelte-162prpu{display:flex;flex-direction:column;gap:1rem}.loading.svelte-162prpu{display:flex;flex-direction:column;align-items:center;gap:1.25rem;padding:5rem 0}.spinner.svelte-162prpu{width:36px;height:36px;border:3px solid #ddd8d0;border-top-color:#2563eb;border-radius:50%;animation:svelte-162prpu-spin 0.7s linear infinite}.loading-text.svelte-162prpu{font-size:1rem;color:#8a8070;margin:0}@keyframes svelte-162prpu-spin{to{transform:rotate(360deg)}}.empty-state.svelte-162prpu,.error-state.svelte-162prpu{text-align:center;padding:4rem 0;color:#8a8070}.error-msg.svelte-162prpu{color:#991b1b;background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:0.75rem 1rem;font-size:0.9rem;margin-bottom:1rem}.btn-primary.svelte-162prpu{display:inline-block;margin-top:1rem;padding:0.625rem 1.5rem;background:#b8ff57;color:#1a3300;border-radius:8px;font-size:0.9rem;font-weight:700;text-decoration:none;transition:background 0.15s, transform 0.15s}.btn-primary.svelte-162prpu:hover{background:#a3f03d;transform:translateY(-1px)}",
      map: `{"version":3,"file":"+page.svelte","sources":["+page.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { onMount } from \\"svelte\\";\\nimport { goto } from \\"$app/navigation\\";\\nimport { pendingSearch } from \\"$lib/stores/SearchStore\\";\\nimport { searchMatches } from \\"$lib/api\\";\\nimport MatchCard from \\"$lib/components/MatchCard.svelte\\";\\nlet results = [];\\nlet loading = true;\\nlet error = \\"\\";\\nlet req = $pendingSearch;\\nonMount(async () => {\\n  if (!req) {\\n    goto(\\"/search\\");\\n    return;\\n  }\\n  try {\\n    results = await searchMatches(req);\\n  } catch (e) {\\n    error = String(e);\\n  } finally {\\n    loading = false;\\n  }\\n});\\n<\/script>\\n\\n<svelte:head>\\n  <title>Matches \u2014 whodoesthe.work</title>\\n</svelte:head>\\n\\n<div class=\\"page\\">\\n  {#if req}\\n    <div class=\\"search-header\\">\\n      <div class=\\"query-summary\\">\\n        <span class=\\"role\\">{req.role || 'Engineer'}</span>\\n        {#if req.stacks.length > 0}\\n          <span class=\\"separator\\">\xB7</span>\\n          <span class=\\"stacks\\">{req.stacks.slice(0, 3).join(', ')}</span>\\n        {/if}\\n      </div>\\n      <div class=\\"header-actions\\">\\n        <a href=\\"/search\\" class=\\"refine-link\\">Refine search</a>\\n        <a href=\\"/shortlist\\" class=\\"shortlist-link\\">View shortlist \u2192</a>\\n      </div>\\n    </div>\\n  {/if}\\n\\n  {#if loading}\\n    <div class=\\"loading\\">\\n      <div class=\\"spinner\\" />\\n      <p class=\\"loading-text\\"><em>Expanding your query across technical domains\u2026</em></p>\\n    </div>\\n  {:else if error}\\n    <div class=\\"error-state\\">\\n      <p class=\\"error-msg\\">{error}</p>\\n      <a href=\\"/search\\" class=\\"btn-primary\\">Try again</a>\\n    </div>\\n  {:else if results.length === 0}\\n    <div class=\\"empty-state\\">\\n      <p>No matches found. Try broadening your description or removing stack filters.</p>\\n      <a href=\\"/search\\" class=\\"btn-primary\\">Refine search</a>\\n    </div>\\n  {:else}\\n    <p class=\\"result-count\\">{results.length} developer{results.length !== 1 ? 's' : ''} matched</p>\\n    <div class=\\"results\\">\\n      {#each results as match, i}\\n        <MatchCard {match} rank={i + 1} />\\n      {/each}\\n    </div>\\n  {/if}\\n</div>\\n\\n<style>\\n  .page {\\n    max-width: 720px;\\n    margin: 0 auto;\\n    padding: 2rem 1.5rem;\\n  }\\n\\n  .search-header {\\n    display: flex;\\n    justify-content: space-between;\\n    align-items: center;\\n    margin-bottom: 1.5rem;\\n    flex-wrap: wrap;\\n    gap: 0.75rem;\\n    padding-bottom: 1rem;\\n    border-bottom: 1px solid #ddd8d0;\\n  }\\n\\n  .query-summary {\\n    display: flex;\\n    align-items: center;\\n    gap: 0.5rem;\\n  }\\n\\n  .role {\\n    font-size: 1rem;\\n    font-weight: 700;\\n    color: #0a0907;\\n  }\\n\\n  .separator {\\n    color: #ddd8d0;\\n  }\\n\\n  .stacks {\\n    font-size: 0.9rem;\\n    color: #8a8070;\\n  }\\n\\n  .header-actions {\\n    display: flex;\\n    gap: 1rem;\\n    align-items: center;\\n  }\\n\\n  .refine-link {\\n    font-size: 0.85rem;\\n    color: #8a8070;\\n    text-decoration: none;\\n    transition: color 0.15s;\\n  }\\n\\n  .refine-link:hover {\\n    color: #0a0907;\\n  }\\n\\n  .shortlist-link {\\n    font-size: 0.85rem;\\n    color: #2563eb;\\n    text-decoration: none;\\n    transition: color 0.15s;\\n  }\\n\\n  .shortlist-link:hover {\\n    color: #1d4ed8;\\n  }\\n\\n  .result-count {\\n    font-size: 0.75rem;\\n    color: #8a8070;\\n    margin-bottom: 1rem;\\n    text-transform: uppercase;\\n    letter-spacing: 0.08em;\\n    font-weight: 600;\\n  }\\n\\n  .results {\\n    display: flex;\\n    flex-direction: column;\\n    gap: 1rem;\\n  }\\n\\n  .loading {\\n    display: flex;\\n    flex-direction: column;\\n    align-items: center;\\n    gap: 1.25rem;\\n    padding: 5rem 0;\\n  }\\n\\n  .spinner {\\n    width: 36px;\\n    height: 36px;\\n    border: 3px solid #ddd8d0;\\n    border-top-color: #2563eb;\\n    border-radius: 50%;\\n    animation: spin 0.7s linear infinite;\\n  }\\n\\n  .loading-text {\\n    font-size: 1rem;\\n    color: #8a8070;\\n    margin: 0;\\n  }\\n\\n  @keyframes spin {\\n    to { transform: rotate(360deg); }\\n  }\\n\\n  .empty-state,\\n  .error-state {\\n    text-align: center;\\n    padding: 4rem 0;\\n    color: #8a8070;\\n  }\\n\\n  .error-msg {\\n    color: #991b1b;\\n    background: #fee2e2;\\n    border: 1px solid #fca5a5;\\n    border-radius: 8px;\\n    padding: 0.75rem 1rem;\\n    font-size: 0.9rem;\\n    margin-bottom: 1rem;\\n  }\\n\\n  .btn-primary {\\n    display: inline-block;\\n    margin-top: 1rem;\\n    padding: 0.625rem 1.5rem;\\n    background: #b8ff57;\\n    color: #1a3300;\\n    border-radius: 8px;\\n    font-size: 0.9rem;\\n    font-weight: 700;\\n    text-decoration: none;\\n    transition: background 0.15s, transform 0.15s;\\n  }\\n\\n  .btn-primary:hover {\\n    background: #a3f03d;\\n    transform: translateY(-1px);\\n  }\\n</style>\\n"],"names":[],"mappings":"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"}`
    };
    Page3 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $pendingSearch, $$unsubscribe_pendingSearch;
      $$unsubscribe_pendingSearch = subscribe(pendingSearch, (value) => $pendingSearch = value);
      let req = $pendingSearch;
      $$result.css.add(css5);
      $$unsubscribe_pendingSearch();
      return `${$$result.head += `<!-- HEAD_svelte-hq0jhf_START -->${$$result.title = `<title>Matches \u2014 whodoesthe.work</title>`, ""}<!-- HEAD_svelte-hq0jhf_END -->`, ""} <div class="page svelte-162prpu">${req ? `<div class="search-header svelte-162prpu"><div class="query-summary svelte-162prpu"><span class="role svelte-162prpu">${escape(req.role || "Engineer")}</span> ${req.stacks.length > 0 ? `<span class="separator svelte-162prpu" data-svelte-h="svelte-3qa9vh">\xB7</span> <span class="stacks svelte-162prpu">${escape(req.stacks.slice(0, 3).join(", "))}</span>` : ``}</div> <div class="header-actions svelte-162prpu" data-svelte-h="svelte-1n5ht1d"><a href="/search" class="refine-link svelte-162prpu">Refine search</a> <a href="/shortlist" class="shortlist-link svelte-162prpu">View shortlist \u2192</a></div></div>` : ``} ${`<div class="loading svelte-162prpu" data-svelte-h="svelte-1b3gojg"><div class="spinner svelte-162prpu"></div> <p class="loading-text svelte-162prpu"><em>Expanding your query across technical domains\u2026</em></p></div>`} </div>`;
    });
  }
});

// .svelte-kit/output/server/nodes/4.js
var __exports5 = {};
__export(__exports5, {
  component: () => component5,
  fonts: () => fonts5,
  imports: () => imports5,
  index: () => index5,
  stylesheets: () => stylesheets5
});
var index5, component_cache5, component5, imports5, stylesheets5, fonts5;
var init__5 = __esm({
  ".svelte-kit/output/server/nodes/4.js"() {
    index5 = 4;
    component5 = async () => component_cache5 ??= (await Promise.resolve().then(() => (init_page_svelte3(), page_svelte_exports3))).default;
    imports5 = ["_app/immutable/nodes/4.BVNdYq97.js", "_app/immutable/chunks/DyFvLQCM.js", "_app/immutable/chunks/CmEbjEsd.js", "_app/immutable/chunks/D6YF6ztN.js", "_app/immutable/chunks/BAsHyxeC.js", "_app/immutable/chunks/DfWdpNK_.js", "_app/immutable/chunks/Ca6diGT7.js", "_app/immutable/chunks/A0-L4VQt.js", "_app/immutable/chunks/CSUp05l_.js"];
    stylesheets5 = ["_app/immutable/assets/MatchCard.CDJuwFMM.css", "_app/immutable/assets/4.BBcxoJJE.css"];
    fonts5 = [];
  }
});

// .svelte-kit/output/server/entries/pages/search/_page.svelte.js
var page_svelte_exports4 = {};
__export(page_svelte_exports4, {
  default: () => Page4
});
var css6, Page4;
var init_page_svelte4 = __esm({
  ".svelte-kit/output/server/entries/pages/search/_page.svelte.js"() {
    init_ssr();
    init_internal();
    init_exports();
    init_utils();
    init_server();
    init_state_svelte();
    init_stores();
    init_ProjectForm();
    css6 = {
      code: ".page.svelte-3vhm7j{max-width:640px;margin:0 auto;padding:3.5rem 1.5rem}.header.svelte-3vhm7j{text-align:center;margin-bottom:2.5rem}h1.svelte-3vhm7j{font-size:clamp(1.75rem, 3.5vw, 2.5rem);font-weight:900;color:#0a0907;margin:0 0 0.5rem;letter-spacing:-0.03em;line-height:0.95}p.svelte-3vhm7j{color:#8a8070;font-size:1rem;margin:0;line-height:1.6}",
      map: `{"version":3,"file":"+page.svelte","sources":["+page.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { goto } from \\"$app/navigation\\";\\nimport { page } from \\"$app/stores\\";\\nimport ProjectForm from \\"$lib/components/ProjectForm.svelte\\";\\nimport { pendingSearch } from \\"$lib/stores/SearchStore\\";\\nconst initialDescription = $page.url.searchParams.get(\\"q\\") ?? \\"\\";\\nfunction handleSubmit(event) {\\n  pendingSearch.set(event.detail);\\n  goto(\\"/matches\\");\\n}\\n<\/script>\\n\\n<svelte:head>\\n  <title>Find Engineers \u2014 whodoesthe.work</title>\\n</svelte:head>\\n\\n<div class=\\"page\\">\\n  <div class=\\"header\\">\\n    <h1>Find engineers</h1>\\n    <p>Describe what you're building. We'll match you with developers who've shipped similar work.</p>\\n  </div>\\n  <ProjectForm {initialDescription} on:submit={handleSubmit} />\\n</div>\\n\\n<style>\\n  .page {\\n    max-width: 640px;\\n    margin: 0 auto;\\n    padding: 3.5rem 1.5rem;\\n  }\\n\\n  .header {\\n    text-align: center;\\n    margin-bottom: 2.5rem;\\n  }\\n\\n  h1 {\\n    font-size: clamp(1.75rem, 3.5vw, 2.5rem);\\n    font-weight: 900;\\n    color: #0a0907;\\n    margin: 0 0 0.5rem;\\n    letter-spacing: -0.03em;\\n    line-height: 0.95;\\n  }\\n\\n  p {\\n    color: #8a8070;\\n    font-size: 1rem;\\n    margin: 0;\\n    line-height: 1.6;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAwBE,mBAAM,CACJ,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,MAAM,CAAC,MAClB,CAEA,qBAAQ,CACN,UAAU,CAAE,MAAM,CAClB,aAAa,CAAE,MACjB,CAEA,gBAAG,CACD,SAAS,CAAE,MAAM,OAAO,CAAC,CAAC,KAAK,CAAC,CAAC,MAAM,CAAC,CACxC,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,OAAO,CACd,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,MAAM,CAClB,cAAc,CAAE,OAAO,CACvB,WAAW,CAAE,IACf,CAEA,eAAE,CACA,KAAK,CAAE,OAAO,CACd,SAAS,CAAE,IAAI,CACf,MAAM,CAAE,CAAC,CACT,WAAW,CAAE,GACf"}`
    };
    Page4 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let $page, $$unsubscribe_page;
      $$unsubscribe_page = subscribe(page, (value) => $page = value);
      const initialDescription = $page.url.searchParams.get("q") ?? "";
      $$result.css.add(css6);
      $$unsubscribe_page();
      return `${$$result.head += `<!-- HEAD_svelte-h9zn9z_START -->${$$result.title = `<title>Find Engineers \u2014 whodoesthe.work</title>`, ""}<!-- HEAD_svelte-h9zn9z_END -->`, ""} <div class="page svelte-3vhm7j"><div class="header svelte-3vhm7j" data-svelte-h="svelte-1kmly40"><h1 class="svelte-3vhm7j">Find engineers</h1> <p class="svelte-3vhm7j">Describe what you&#39;re building. We&#39;ll match you with developers who&#39;ve shipped similar work.</p></div> ${validate_component(ProjectForm, "ProjectForm").$$render($$result, { initialDescription }, {}, {})} </div>`;
    });
  }
});

// .svelte-kit/output/server/nodes/5.js
var __exports6 = {};
__export(__exports6, {
  component: () => component6,
  fonts: () => fonts6,
  imports: () => imports6,
  index: () => index6,
  stylesheets: () => stylesheets6
});
var index6, component_cache6, component6, imports6, stylesheets6, fonts6;
var init__6 = __esm({
  ".svelte-kit/output/server/nodes/5.js"() {
    index6 = 5;
    component6 = async () => component_cache6 ??= (await Promise.resolve().then(() => (init_page_svelte4(), page_svelte_exports4))).default;
    imports6 = ["_app/immutable/nodes/5.Bl64MnMV.js", "_app/immutable/chunks/DyFvLQCM.js", "_app/immutable/chunks/CmEbjEsd.js", "_app/immutable/chunks/BAsHyxeC.js", "_app/immutable/chunks/DfWdpNK_.js", "_app/immutable/chunks/Cy91UwDa.js", "_app/immutable/chunks/DxrIyZV1.js", "_app/immutable/chunks/D6YF6ztN.js", "_app/immutable/chunks/Ca6diGT7.js"];
    stylesheets6 = ["_app/immutable/assets/ProjectForm.CK00JySN.css", "_app/immutable/assets/5.ataGYo84.css"];
    fonts6 = [];
  }
});

// .svelte-kit/output/server/entries/pages/shortlist/_page.svelte.js
var page_svelte_exports5 = {};
__export(page_svelte_exports5, {
  default: () => Page5
});
var css$12, MatchCard, css7, Page5;
var init_page_svelte5 = __esm({
  ".svelte-kit/output/server/entries/pages/shortlist/_page.svelte.js"() {
    init_ssr();
    init_ShortlistStore();
    css$12 = {
      code: ".card.svelte-133lepy{display:flex;background:#ffffff;border:1.5px solid #ddd8d0;border-radius:10px;overflow:hidden;transition:border-color 0.15s, box-shadow 0.15s}.card.svelte-133lepy:hover{border-color:#2563eb;box-shadow:0 2px 16px rgba(0,0,0,0.08)}.rank.svelte-133lepy{display:flex;align-items:center;justify-content:center;min-width:48px;background:#0a0907;border-right:1px solid #1a1a1a;flex-shrink:0}.rank-num.svelte-133lepy{writing-mode:vertical-lr;transform:rotate(180deg);font-size:0.8rem;font-weight:900;color:#f5f2ed;letter-spacing:0.06em}.body.svelte-133lepy{flex:1;padding:1.125rem 1.25rem;display:flex;flex-direction:column;gap:0.75rem}.top-row.svelte-133lepy{display:flex;justify-content:space-between;align-items:flex-start}.username.svelte-133lepy{font-size:1.05rem;font-weight:700;color:#0a0907}.badges.svelte-133lepy{display:flex;align-items:center;gap:0.625rem}.confidence-badge.svelte-133lepy{font-size:0.75rem;font-weight:700;padding:0.25rem 0.625rem;border-radius:999px;border:1.5px solid}.confidence-badge.high.svelte-133lepy{background:#b8ff57;color:#1a3300;border-color:#b8ff57}.confidence-badge.mid.svelte-133lepy{background:#fef3c7;color:#92400e;border-color:#fbbf24}.confidence-badge.low.svelte-133lepy{background:#fee2e2;color:#991b1b;border-color:#fca5a5}.impact.svelte-133lepy{font-size:1.5rem;font-weight:900;color:#2563eb;line-height:1}.domains.svelte-133lepy{display:flex;gap:0.4rem;flex-wrap:wrap}.domain-chip.svelte-133lepy{padding:0.2rem 0.65rem;background:#ede9fe;border:1px solid #c4b5fd;border-radius:999px;font-size:0.75rem;color:#5b21b6;font-weight:500}.why-matched.svelte-133lepy{padding:0.625rem 0.875rem;border-left:3px solid #b8ff57;background:#f9ffe8;border-radius:0 6px 6px 0}.why-label.svelte-133lepy{font-size:0.65rem;font-weight:700;color:#1a3300;letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:0.25rem}.why-text.svelte-133lepy{font-size:0.875rem;color:#3d3830;line-height:1.5;margin:0}.score-row.svelte-133lepy{display:flex;gap:1.5rem}.score-item.svelte-133lepy{flex:1;display:flex;flex-direction:column;gap:0.25rem}.score-label.svelte-133lepy{font-size:0.7rem;color:#8a8070}.mini-bar-track.svelte-133lepy{background:#e8e4df;border-radius:3px;height:5px;overflow:hidden}.mini-bar-fill.svelte-133lepy{height:100%;border-radius:3px;background:#b8ff57;transition:width 0.4s ease}.footer.svelte-133lepy{display:flex;justify-content:space-between;align-items:center;margin-top:0.25rem}.langs.svelte-133lepy{display:flex;gap:0.375rem;flex-wrap:wrap}.lang-chip.svelte-133lepy{padding:0.15rem 0.5rem;background:#f5f2ed;border:1px solid #ddd8d0;border-radius:999px;font-size:0.7rem;color:#8a8070}.actions.svelte-133lepy{display:flex;gap:0.625rem;align-items:center}.view-link.svelte-133lepy{font-size:0.8rem;color:#8a8070;text-decoration:none}.view-link.svelte-133lepy:hover{color:#2563eb}.shortlist-btn.svelte-133lepy{padding:0.3rem 0.875rem;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;background:transparent;border:1.5px solid #ddd8d0;color:#8a8070;transition:border-color 0.15s, color 0.15s, background 0.15s}.shortlist-btn.svelte-133lepy:hover{border-color:#5b21b6;color:#5b21b6}.shortlist-btn.active.svelte-133lepy{border-color:#5b21b6;color:#5b21b6;background:#ede9fe}",
      map: `{"version":3,"file":"MatchCard.svelte","sources":["MatchCard.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { shortlistStore } from \\"$lib/stores/ShortlistStore\\";\\nexport let match;\\nexport let rank;\\n$: confidence = match.matchConfidence;\\n$: confidenceClass = confidence >= 70 ? \\"high\\" : confidence >= 40 ? \\"mid\\" : \\"low\\";\\n$: isShortlisted = $shortlistStore.some((m) => m.username === match.username);\\nfunction toggleShortlist() {\\n  if (isShortlisted) {\\n    shortlistStore.remove(match.username);\\n  } else {\\n    shortlistStore.add(match);\\n  }\\n}\\n<\/script>\\n\\n<div class=\\"card\\" class:shortlisted={isShortlisted}>\\n  <!-- Rank badge -->\\n  <div class=\\"rank\\">\\n    <span class=\\"rank-num\\">#{rank}</span>\\n  </div>\\n\\n  <div class=\\"body\\">\\n    <!-- Top row -->\\n    <div class=\\"top-row\\">\\n      <div class=\\"name-block\\">\\n        <span class=\\"username\\">@{match.username}</span>\\n      </div>\\n      <div class=\\"badges\\">\\n        <span class=\\"confidence-badge {confidenceClass}\\">\\n          {confidence}% match\\n        </span>\\n        <span class=\\"impact\\">{match.overallImpact.toFixed(0)}</span>\\n      </div>\\n    </div>\\n\\n    <!-- Domain tags -->\\n    {#if match.topDomains.length > 0}\\n      <div class=\\"domains\\">\\n        {#each match.topDomains.slice(0, 3) as d}\\n          <span class=\\"domain-chip\\">{d.domain}</span>\\n        {/each}\\n      </div>\\n    {/if}\\n\\n    <!-- Why matched block -->\\n    {#if match.whyMatched}\\n      <div class=\\"why-matched\\">\\n        <span class=\\"why-label\\">WHY MATCHED</span>\\n        <p class=\\"why-text\\">{match.whyMatched}</p>\\n      </div>\\n    {/if}\\n\\n    <!-- Score mini-bars -->\\n    <div class=\\"score-row\\">\\n      <div class=\\"score-item\\">\\n        <span class=\\"score-label\\">Code quality</span>\\n        <div class=\\"mini-bar-track\\">\\n          <div\\n            class=\\"mini-bar-fill\\"\\n            style=\\"width: {match.codeQuality}%\\"\\n          />\\n        </div>\\n      </div>\\n      <div class=\\"score-item\\">\\n        <span class=\\"score-label\\">Review quality</span>\\n        <div class=\\"mini-bar-track\\">\\n          <div\\n            class=\\"mini-bar-fill\\"\\n            style=\\"width: {match.reviewQuality}%\\"\\n          />\\n        </div>\\n      </div>\\n    </div>\\n\\n    <!-- Footer -->\\n    <div class=\\"footer\\">\\n      <div class=\\"langs\\">\\n        {#each match.topLanguages.slice(0, 3) as l}\\n          <span class=\\"lang-chip\\">{l.language}</span>\\n        {/each}\\n      </div>\\n      <div class=\\"actions\\">\\n        <a href=\\"/developer/{match.username}\\" class=\\"view-link\\">View profile</a>\\n        <button class=\\"shortlist-btn\\" class:active={isShortlisted} on:click={toggleShortlist}>\\n          {isShortlisted ? '\u2713 Shortlisted' : '+ Shortlist'}\\n        </button>\\n      </div>\\n    </div>\\n  </div>\\n</div>\\n\\n<style>\\n  .card {\\n    display: flex;\\n    background: #ffffff;\\n    border: 1.5px solid #ddd8d0;\\n    border-radius: 10px;\\n    overflow: hidden;\\n    transition: border-color 0.15s, box-shadow 0.15s;\\n  }\\n  .card:hover {\\n    border-color: #2563eb;\\n    box-shadow: 0 2px 16px rgba(0,0,0,0.08);\\n  }\\n  .rank {\\n    display: flex; align-items: center; justify-content: center;\\n    min-width: 48px; background: #0a0907; border-right: 1px solid #1a1a1a;\\n    flex-shrink: 0;\\n  }\\n  .rank-num {\\n    writing-mode: vertical-lr; transform: rotate(180deg);\\n    font-size: 0.8rem; font-weight: 900; color: #f5f2ed; letter-spacing: 0.06em;\\n  }\\n  .body { flex: 1; padding: 1.125rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }\\n  .top-row { display: flex; justify-content: space-between; align-items: flex-start; }\\n  .username { font-size: 1.05rem; font-weight: 700; color: #0a0907; }\\n  .badges { display: flex; align-items: center; gap: 0.625rem; }\\n  .confidence-badge {\\n    font-size: 0.75rem; font-weight: 700;\\n    padding: 0.25rem 0.625rem; border-radius: 999px; border: 1.5px solid;\\n  }\\n  .confidence-badge.high { background: #b8ff57; color: #1a3300; border-color: #b8ff57; }\\n  .confidence-badge.mid  { background: #fef3c7; color: #92400e; border-color: #fbbf24; }\\n  .confidence-badge.low  { background: #fee2e2; color: #991b1b; border-color: #fca5a5; }\\n  .impact { font-size: 1.5rem; font-weight: 900; color: #2563eb; line-height: 1; }\\n  .domains { display: flex; gap: 0.4rem; flex-wrap: wrap; }\\n  .domain-chip {\\n    padding: 0.2rem 0.65rem; background: #ede9fe;\\n    border: 1px solid #c4b5fd; border-radius: 999px;\\n    font-size: 0.75rem; color: #5b21b6; font-weight: 500;\\n  }\\n  .why-matched {\\n    padding: 0.625rem 0.875rem;\\n    border-left: 3px solid #b8ff57;\\n    background: #f9ffe8;\\n    border-radius: 0 6px 6px 0;\\n  }\\n  .why-label {\\n    font-size: 0.65rem; font-weight: 700; color: #1a3300;\\n    letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 0.25rem;\\n  }\\n  .why-text { font-size: 0.875rem; color: #3d3830; line-height: 1.5; margin: 0; }\\n  .score-row { display: flex; gap: 1.5rem; }\\n  .score-item { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }\\n  .score-label { font-size: 0.7rem; color: #8a8070; }\\n  .mini-bar-track { background: #e8e4df; border-radius: 3px; height: 5px; overflow: hidden; }\\n  .mini-bar-fill { height: 100%; border-radius: 3px; background: #b8ff57; transition: width 0.4s ease; }\\n  .footer { display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem; }\\n  .langs { display: flex; gap: 0.375rem; flex-wrap: wrap; }\\n  .lang-chip {\\n    padding: 0.15rem 0.5rem; background: #f5f2ed;\\n    border: 1px solid #ddd8d0; border-radius: 999px;\\n    font-size: 0.7rem; color: #8a8070;\\n  }\\n  .actions { display: flex; gap: 0.625rem; align-items: center; }\\n  .view-link { font-size: 0.8rem; color: #8a8070; text-decoration: none; }\\n  .view-link:hover { color: #2563eb; }\\n  .shortlist-btn {\\n    padding: 0.3rem 0.875rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;\\n    background: transparent; border: 1.5px solid #ddd8d0; color: #8a8070;\\n    transition: border-color 0.15s, color 0.15s, background 0.15s;\\n  }\\n  .shortlist-btn:hover { border-color: #5b21b6; color: #5b21b6; }\\n  .shortlist-btn.active { border-color: #5b21b6; color: #5b21b6; background: #ede9fe; }\\n</style>\\n"],"names":[],"mappings":"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"}`
    };
    MatchCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let confidence;
      let confidenceClass;
      let isShortlisted;
      let $shortlistStore, $$unsubscribe_shortlistStore;
      $$unsubscribe_shortlistStore = subscribe(shortlistStore, (value) => $shortlistStore = value);
      let { match } = $$props;
      let { rank } = $$props;
      if ($$props.match === void 0 && $$bindings.match && match !== void 0) $$bindings.match(match);
      if ($$props.rank === void 0 && $$bindings.rank && rank !== void 0) $$bindings.rank(rank);
      $$result.css.add(css$12);
      confidence = match.matchConfidence;
      confidenceClass = confidence >= 70 ? "high" : confidence >= 40 ? "mid" : "low";
      isShortlisted = $shortlistStore.some((m) => m.username === match.username);
      $$unsubscribe_shortlistStore();
      return `<div class="${["card svelte-133lepy", isShortlisted ? "shortlisted" : ""].join(" ").trim()}"> <div class="rank svelte-133lepy"><span class="rank-num svelte-133lepy">#${escape(rank)}</span></div> <div class="body svelte-133lepy"> <div class="top-row svelte-133lepy"><div class="name-block"><span class="username svelte-133lepy">@${escape(match.username)}</span></div> <div class="badges svelte-133lepy"><span class="${"confidence-badge " + escape(confidenceClass, true) + " svelte-133lepy"}">${escape(confidence)}% match</span> <span class="impact svelte-133lepy">${escape(match.overallImpact.toFixed(0))}</span></div></div>  ${match.topDomains.length > 0 ? `<div class="domains svelte-133lepy">${each(match.topDomains.slice(0, 3), (d) => {
        return `<span class="domain-chip svelte-133lepy">${escape(d.domain)}</span>`;
      })}</div>` : ``}  ${match.whyMatched ? `<div class="why-matched svelte-133lepy"><span class="why-label svelte-133lepy" data-svelte-h="svelte-gfj0xm">WHY MATCHED</span> <p class="why-text svelte-133lepy">${escape(match.whyMatched)}</p></div>` : ``}  <div class="score-row svelte-133lepy"><div class="score-item svelte-133lepy"><span class="score-label svelte-133lepy" data-svelte-h="svelte-10eelxs">Code quality</span> <div class="mini-bar-track svelte-133lepy"><div class="mini-bar-fill svelte-133lepy" style="${"width: " + escape(match.codeQuality, true) + "%"}"></div></div></div> <div class="score-item svelte-133lepy"><span class="score-label svelte-133lepy" data-svelte-h="svelte-1ri61nl">Review quality</span> <div class="mini-bar-track svelte-133lepy"><div class="mini-bar-fill svelte-133lepy" style="${"width: " + escape(match.reviewQuality, true) + "%"}"></div></div></div></div>  <div class="footer svelte-133lepy"><div class="langs svelte-133lepy">${each(match.topLanguages.slice(0, 3), (l) => {
        return `<span class="lang-chip svelte-133lepy">${escape(l.language)}</span>`;
      })}</div> <div class="actions svelte-133lepy"><a href="${"/developer/" + escape(match.username, true)}" class="view-link svelte-133lepy">View profile</a> <button class="${["shortlist-btn svelte-133lepy", isShortlisted ? "active" : ""].join(" ").trim()}">${escape(isShortlisted ? "\u2713 Shortlisted" : "+ Shortlist")}</button></div></div></div> </div>`;
    });
    css7 = {
      code: ".page.svelte-4sfbjj{max-width:720px;margin:0 auto;padding:2rem 1.5rem}.header.svelte-4sfbjj{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;padding-bottom:1rem;border-bottom:1px solid #ddd8d0}h1.svelte-4sfbjj{font-size:clamp(1.5rem, 3vw, 2rem);font-weight:900;color:#0a0907;margin:0;letter-spacing:-0.02em}.header-actions.svelte-4sfbjj{display:flex;align-items:center;gap:1rem}.count.svelte-4sfbjj{font-size:0.875rem;color:#8a8070}.clear-btn.svelte-4sfbjj{font-size:0.8rem;color:#991b1b;background:transparent;border:1px solid rgba(153,27,27,0.25);border-radius:6px;padding:0.3rem 0.75rem;cursor:pointer;transition:background 0.15s, border-color 0.15s}.clear-btn.svelte-4sfbjj:hover{background:rgba(153,27,27,0.06);border-color:rgba(153,27,27,0.5)}.empty-state.svelte-4sfbjj{text-align:center;padding:5rem 0}.empty-text.svelte-4sfbjj{font-size:1.2rem;color:#8a8070;margin:0 0 0.5rem;font-family:'Playfair Display', Georgia, serif}.empty-sub.svelte-4sfbjj{font-size:0.9rem;color:#b0a89e;margin:0 0 1.5rem;max-width:360px;margin-left:auto;margin-right:auto;line-height:1.6}.btn-primary.svelte-4sfbjj{display:inline-block;padding:0.75rem 1.75rem;background:#b8ff57;color:#1a3300;border-radius:8px;font-size:1rem;font-weight:700;text-decoration:none;transition:background 0.15s, transform 0.15s}.btn-primary.svelte-4sfbjj:hover{background:#a3f03d;transform:translateY(-1px)}.results.svelte-4sfbjj{display:flex;flex-direction:column;gap:1rem}.footer.svelte-4sfbjj{margin-top:2rem;text-align:center}.find-more.svelte-4sfbjj{font-size:0.9rem;color:#2563eb;text-decoration:none;transition:color 0.15s}.find-more.svelte-4sfbjj:hover{color:#1d4ed8}",
      map: `{"version":3,"file":"+page.svelte","sources":["+page.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { shortlistStore } from \\"$lib/stores/ShortlistStore\\";\\nimport MatchCard from \\"$lib/components/MatchCard.svelte\\";\\n$: matches = $shortlistStore;\\n<\/script>\\n\\n<svelte:head>\\n  <title>Shortlist \u2014 whodoesthe.work</title>\\n</svelte:head>\\n\\n<div class=\\"page\\">\\n  <div class=\\"header\\">\\n    <h1>Shortlist</h1>\\n    {#if matches.length > 0}\\n      <div class=\\"header-actions\\">\\n        <span class=\\"count\\">{matches.length} candidate{matches.length !== 1 ? 's' : ''}</span>\\n        <button class=\\"clear-btn\\" on:click={() => shortlistStore.clear()}>Clear all</button>\\n      </div>\\n    {/if}\\n  </div>\\n\\n  {#if matches.length === 0}\\n    <div class=\\"empty-state\\">\\n      <p class=\\"empty-text\\"><em>Your shortlist is empty</em></p>\\n      <p class=\\"empty-sub\\">Find engineers and add them to your shortlist from the matches page.</p>\\n      <a href=\\"/search\\" class=\\"btn-primary\\">Find engineers \u2192</a>\\n    </div>\\n  {:else}\\n    <div class=\\"results\\">\\n      {#each matches as match, i}\\n        <MatchCard {match} rank={i + 1} />\\n      {/each}\\n    </div>\\n    <div class=\\"footer\\">\\n      <a href=\\"/search\\" class=\\"find-more\\">Find more engineers \u2192</a>\\n    </div>\\n  {/if}\\n</div>\\n\\n<style>\\n  .page {\\n    max-width: 720px;\\n    margin: 0 auto;\\n    padding: 2rem 1.5rem;\\n  }\\n\\n  .header {\\n    display: flex;\\n    justify-content: space-between;\\n    align-items: center;\\n    margin-bottom: 1.5rem;\\n    padding-bottom: 1rem;\\n    border-bottom: 1px solid #ddd8d0;\\n  }\\n\\n  h1 {\\n    font-size: clamp(1.5rem, 3vw, 2rem);\\n    font-weight: 900;\\n    color: #0a0907;\\n    margin: 0;\\n    letter-spacing: -0.02em;\\n  }\\n\\n  .header-actions {\\n    display: flex;\\n    align-items: center;\\n    gap: 1rem;\\n  }\\n\\n  .count {\\n    font-size: 0.875rem;\\n    color: #8a8070;\\n  }\\n\\n  .clear-btn {\\n    font-size: 0.8rem;\\n    color: #991b1b;\\n    background: transparent;\\n    border: 1px solid rgba(153,27,27,0.25);\\n    border-radius: 6px;\\n    padding: 0.3rem 0.75rem;\\n    cursor: pointer;\\n    transition: background 0.15s, border-color 0.15s;\\n  }\\n\\n  .clear-btn:hover {\\n    background: rgba(153,27,27,0.06);\\n    border-color: rgba(153,27,27,0.5);\\n  }\\n\\n  .empty-state {\\n    text-align: center;\\n    padding: 5rem 0;\\n  }\\n\\n  .empty-text {\\n    font-size: 1.2rem;\\n    color: #8a8070;\\n    margin: 0 0 0.5rem;\\n    font-family: 'Playfair Display', Georgia, serif;\\n  }\\n\\n  .empty-sub {\\n    font-size: 0.9rem;\\n    color: #b0a89e;\\n    margin: 0 0 1.5rem;\\n    max-width: 360px;\\n    margin-left: auto;\\n    margin-right: auto;\\n    line-height: 1.6;\\n  }\\n\\n  .btn-primary {\\n    display: inline-block;\\n    padding: 0.75rem 1.75rem;\\n    background: #b8ff57;\\n    color: #1a3300;\\n    border-radius: 8px;\\n    font-size: 1rem;\\n    font-weight: 700;\\n    text-decoration: none;\\n    transition: background 0.15s, transform 0.15s;\\n  }\\n\\n  .btn-primary:hover {\\n    background: #a3f03d;\\n    transform: translateY(-1px);\\n  }\\n\\n  .results {\\n    display: flex;\\n    flex-direction: column;\\n    gap: 1rem;\\n  }\\n\\n  .footer {\\n    margin-top: 2rem;\\n    text-align: center;\\n  }\\n\\n  .find-more {\\n    font-size: 0.9rem;\\n    color: #2563eb;\\n    text-decoration: none;\\n    transition: color 0.15s;\\n  }\\n\\n  .find-more:hover {\\n    color: #1d4ed8;\\n  }\\n</style>\\n"],"names":[],"mappings":"AAuCE,mBAAM,CACJ,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,IAAI,CAAC,MAChB,CAEA,qBAAQ,CACN,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,CACnB,aAAa,CAAE,MAAM,CACrB,cAAc,CAAE,IAAI,CACpB,aAAa,CAAE,GAAG,CAAC,KAAK,CAAC,OAC3B,CAEA,gBAAG,CACD,SAAS,CAAE,MAAM,MAAM,CAAC,CAAC,GAAG,CAAC,CAAC,IAAI,CAAC,CACnC,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,OAAO,CACd,MAAM,CAAE,CAAC,CACT,cAAc,CAAE,OAClB,CAEA,6BAAgB,CACd,OAAO,CAAE,IAAI,CACb,WAAW,CAAE,MAAM,CACnB,GAAG,CAAE,IACP,CAEA,oBAAO,CACL,SAAS,CAAE,QAAQ,CACnB,KAAK,CAAE,OACT,CAEA,wBAAW,CACT,SAAS,CAAE,MAAM,CACjB,KAAK,CAAE,OAAO,CACd,UAAU,CAAE,WAAW,CACvB,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,KAAK,GAAG,CAAC,EAAE,CAAC,EAAE,CAAC,IAAI,CAAC,CACtC,aAAa,CAAE,GAAG,CAClB,OAAO,CAAE,MAAM,CAAC,OAAO,CACvB,MAAM,CAAE,OAAO,CACf,UAAU,CAAE,UAAU,CAAC,KAAK,CAAC,CAAC,YAAY,CAAC,KAC7C,CAEA,wBAAU,MAAO,CACf,UAAU,CAAE,KAAK,GAAG,CAAC,EAAE,CAAC,EAAE,CAAC,IAAI,CAAC,CAChC,YAAY,CAAE,KAAK,GAAG,CAAC,EAAE,CAAC,EAAE,CAAC,GAAG,CAClC,CAEA,0BAAa,CACX,UAAU,CAAE,MAAM,CAClB,OAAO,CAAE,IAAI,CAAC,CAChB,CAEA,yBAAY,CACV,SAAS,CAAE,MAAM,CACjB,KAAK,CAAE,OAAO,CACd,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,MAAM,CAClB,WAAW,CAAE,kBAAkB,CAAC,CAAC,OAAO,CAAC,CAAC,KAC5C,CAEA,wBAAW,CACT,SAAS,CAAE,MAAM,CACjB,KAAK,CAAE,OAAO,CACd,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,MAAM,CAClB,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,IAAI,CACjB,YAAY,CAAE,IAAI,CAClB,WAAW,CAAE,GACf,CAEA,0BAAa,CACX,OAAO,CAAE,YAAY,CACrB,OAAO,CAAE,OAAO,CAAC,OAAO,CACxB,UAAU,CAAE,OAAO,CACnB,KAAK,CAAE,OAAO,CACd,aAAa,CAAE,GAAG,CAClB,SAAS,CAAE,IAAI,CACf,WAAW,CAAE,GAAG,CAChB,eAAe,CAAE,IAAI,CACrB,UAAU,CAAE,UAAU,CAAC,KAAK,CAAC,CAAC,SAAS,CAAC,KAC1C,CAEA,0BAAY,MAAO,CACjB,UAAU,CAAE,OAAO,CACnB,SAAS,CAAE,WAAW,IAAI,CAC5B,CAEA,sBAAS,CACP,OAAO,CAAE,IAAI,CACb,cAAc,CAAE,MAAM,CACtB,GAAG,CAAE,IACP,CAEA,qBAAQ,CACN,UAAU,CAAE,IAAI,CAChB,UAAU,CAAE,MACd,CAEA,wBAAW,CACT,SAAS,CAAE,MAAM,CACjB,KAAK,CAAE,OAAO,CACd,eAAe,CAAE,IAAI,CACrB,UAAU,CAAE,KAAK,CAAC,KACpB,CAEA,wBAAU,MAAO,CACf,KAAK,CAAE,OACT"}`
    };
    Page5 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
      let matches;
      let $shortlistStore, $$unsubscribe_shortlistStore;
      $$unsubscribe_shortlistStore = subscribe(shortlistStore, (value) => $shortlistStore = value);
      $$result.css.add(css7);
      matches = $shortlistStore;
      $$unsubscribe_shortlistStore();
      return `${$$result.head += `<!-- HEAD_svelte-1pb7v3o_START -->${$$result.title = `<title>Shortlist \u2014 whodoesthe.work</title>`, ""}<!-- HEAD_svelte-1pb7v3o_END -->`, ""} <div class="page svelte-4sfbjj"><div class="header svelte-4sfbjj"><h1 class="svelte-4sfbjj" data-svelte-h="svelte-1ywqnfo">Shortlist</h1> ${matches.length > 0 ? `<div class="header-actions svelte-4sfbjj"><span class="count svelte-4sfbjj">${escape(matches.length)} candidate${escape(matches.length !== 1 ? "s" : "")}</span> <button class="clear-btn svelte-4sfbjj" data-svelte-h="svelte-1nskfas">Clear all</button></div>` : ``}</div> ${matches.length === 0 ? `<div class="empty-state svelte-4sfbjj" data-svelte-h="svelte-j1ee9v"><p class="empty-text svelte-4sfbjj"><em>Your shortlist is empty</em></p> <p class="empty-sub svelte-4sfbjj">Find engineers and add them to your shortlist from the matches page.</p> <a href="/search" class="btn-primary svelte-4sfbjj">Find engineers \u2192</a></div>` : `<div class="results svelte-4sfbjj">${each(matches, (match, i) => {
        return `${validate_component(MatchCard, "MatchCard").$$render($$result, { match, rank: i + 1 }, {}, {})}`;
      })}</div> <div class="footer svelte-4sfbjj" data-svelte-h="svelte-16635d4"><a href="/search" class="find-more svelte-4sfbjj">Find more engineers \u2192</a></div>`} </div>`;
    });
  }
});

// .svelte-kit/output/server/nodes/6.js
var __exports7 = {};
__export(__exports7, {
  component: () => component7,
  fonts: () => fonts7,
  imports: () => imports7,
  index: () => index7,
  stylesheets: () => stylesheets7
});
var index7, component_cache7, component7, imports7, stylesheets7, fonts7;
var init__7 = __esm({
  ".svelte-kit/output/server/nodes/6.js"() {
    index7 = 6;
    component7 = async () => component_cache7 ??= (await Promise.resolve().then(() => (init_page_svelte5(), page_svelte_exports5))).default;
    imports7 = ["_app/immutable/nodes/6.x108TPTE.js", "_app/immutable/chunks/DyFvLQCM.js", "_app/immutable/chunks/CmEbjEsd.js", "_app/immutable/chunks/D6YF6ztN.js", "_app/immutable/chunks/CSUp05l_.js", "_app/immutable/chunks/DfWdpNK_.js", "_app/immutable/chunks/A0-L4VQt.js"];
    stylesheets7 = ["_app/immutable/assets/MatchCard.CDJuwFMM.css", "_app/immutable/assets/6.DMPb4n4f.css"];
    fonts7 = [];
  }
});

// node_modules/@sveltejs/kit/src/exports/index.js
init_internal();

// node_modules/esm-env/true.js
var true_default = true;

// node_modules/esm-env/dev-fallback.js
var node_env = globalThis.process?.env?.NODE_ENV;
var dev_fallback_default = node_env && !node_env.toLowerCase().startsWith("prod");

// node_modules/@sveltejs/kit/src/runtime/utils.js
var text_encoder = new TextEncoder();
var text_decoder = new TextDecoder();

// node_modules/@sveltejs/kit/src/exports/index.js
function error(status, body2) {
  if ((!true_default || dev_fallback_default) && (isNaN(status) || status < 400 || status > 599)) {
    throw new Error(`HTTP error status codes must be between 400 and 599 \u2014 ${status} is invalid`);
  }
  throw new HttpError(status, body2);
}
function json(data, init2) {
  const body2 = JSON.stringify(data);
  const headers2 = new Headers(init2?.headers);
  if (!headers2.has("content-length")) {
    headers2.set("content-length", text_encoder.encode(body2).byteLength.toString());
  }
  if (!headers2.has("content-type")) {
    headers2.set("content-type", "application/json");
  }
  return new Response(body2, {
    ...init2,
    headers: headers2
  });
}
function text(body2, init2) {
  const headers2 = new Headers(init2?.headers);
  if (!headers2.has("content-length")) {
    const encoded = text_encoder.encode(body2);
    headers2.set("content-length", encoded.byteLength.toString());
    return new Response(encoded, {
      ...init2,
      headers: headers2
    });
  }
  return new Response(body2, {
    ...init2,
    headers: headers2
  });
}

// .svelte-kit/output/server/chunks/shared.js
init_internal();
init_server();

// node_modules/devalue/src/utils.js
var escaped = {
  "<": "\\u003C",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var DevalueError = class extends Error {
  /**
   * @param {string} message
   * @param {string[]} keys
   * @param {any} [value] - The value that failed to be serialized
   * @param {any} [root] - The root value being serialized
   */
  constructor(message, keys, value, root) {
    super(message);
    this.name = "DevalueError";
    this.path = keys.join("");
    this.value = value;
    this.root = root;
  }
};
function is_primitive(thing) {
  return Object(thing) !== thing;
}
var object_proto_names = /* @__PURE__ */ Object.getOwnPropertyNames(
  Object.prototype
).sort().join("\0");
function is_plain_object(thing) {
  const proto = Object.getPrototypeOf(thing);
  return proto === Object.prototype || proto === null || Object.getPrototypeOf(proto) === null || Object.getOwnPropertyNames(proto).sort().join("\0") === object_proto_names;
}
function get_type(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function get_escaped_char(char) {
  switch (char) {
    case '"':
      return '\\"';
    case "<":
      return "\\u003C";
    case "\\":
      return "\\\\";
    case "\n":
      return "\\n";
    case "\r":
      return "\\r";
    case "	":
      return "\\t";
    case "\b":
      return "\\b";
    case "\f":
      return "\\f";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return char < " " ? `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}` : "";
  }
}
function stringify_string(str) {
  let result = "";
  let last_pos = 0;
  const len = str.length;
  for (let i = 0; i < len; i += 1) {
    const char = str[i];
    const replacement = get_escaped_char(char);
    if (replacement) {
      result += str.slice(last_pos, i) + replacement;
      last_pos = i + 1;
    }
  }
  return `"${last_pos === 0 ? str : result + str.slice(last_pos)}"`;
}
function enumerable_symbols(object) {
  return Object.getOwnPropertySymbols(object).filter(
    (symbol) => Object.getOwnPropertyDescriptor(object, symbol).enumerable
  );
}
var is_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
function stringify_key(key2) {
  return is_identifier.test(key2) ? "." + key2 : "[" + JSON.stringify(key2) + "]";
}

// node_modules/devalue/src/uneval.js
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafe_chars = /[<\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
function uneval(value, replacer) {
  const counts = /* @__PURE__ */ new Map();
  const keys = [];
  const custom = /* @__PURE__ */ new Map();
  function walk(thing) {
    if (!is_primitive(thing)) {
      if (counts.has(thing)) {
        counts.set(thing, counts.get(thing) + 1);
        return;
      }
      counts.set(thing, 1);
      if (replacer) {
        const str2 = replacer(thing, (value2) => uneval(value2, replacer));
        if (typeof str2 === "string") {
          custom.set(thing, str2);
          return;
        }
      }
      if (typeof thing === "function") {
        throw new DevalueError(`Cannot stringify a function`, keys, thing, value);
      }
      const type = get_type(thing);
      switch (type) {
        case "Number":
        case "BigInt":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
        case "URL":
        case "URLSearchParams":
          return;
        case "Array":
          thing.forEach((value2, i) => {
            keys.push(`[${i}]`);
            walk(value2);
            keys.pop();
          });
          break;
        case "Set":
          Array.from(thing).forEach(walk);
          break;
        case "Map":
          for (const [key2, value2] of thing) {
            keys.push(
              `.get(${is_primitive(key2) ? stringify_primitive(key2) : "..."})`
            );
            walk(value2);
            keys.pop();
          }
          break;
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array":
          walk(thing.buffer);
          return;
        case "ArrayBuffer":
          return;
        case "Temporal.Duration":
        case "Temporal.Instant":
        case "Temporal.PlainDate":
        case "Temporal.PlainTime":
        case "Temporal.PlainDateTime":
        case "Temporal.PlainMonthDay":
        case "Temporal.PlainYearMonth":
        case "Temporal.ZonedDateTime":
          return;
        default:
          if (!is_plain_object(thing)) {
            throw new DevalueError(
              `Cannot stringify arbitrary non-POJOs`,
              keys,
              thing,
              value
            );
          }
          if (enumerable_symbols(thing).length > 0) {
            throw new DevalueError(
              `Cannot stringify POJOs with symbolic keys`,
              keys,
              thing,
              value
            );
          }
          for (const key2 in thing) {
            keys.push(stringify_key(key2));
            walk(thing[key2]);
            keys.pop();
          }
      }
    }
  }
  walk(value);
  const names = /* @__PURE__ */ new Map();
  Array.from(counts).filter((entry) => entry[1] > 1).sort((a, b) => b[1] - a[1]).forEach((entry, i) => {
    names.set(entry[0], get_name(i));
  });
  function stringify3(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (is_primitive(thing)) {
      return stringify_primitive(thing);
    }
    if (custom.has(thing)) {
      return custom.get(thing);
    }
    const type = get_type(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return `Object(${stringify3(thing.valueOf())})`;
      case "RegExp":
        return `new RegExp(${stringify_string(thing.source)}, "${thing.flags}")`;
      case "Date":
        return `new Date(${thing.getTime()})`;
      case "URL":
        return `new URL(${stringify_string(thing.toString())})`;
      case "URLSearchParams":
        return `new URLSearchParams(${stringify_string(thing.toString())})`;
      case "Array":
        const members = (
          /** @type {any[]} */
          thing.map(
            (v, i) => i in thing ? stringify3(v) : ""
          )
        );
        const tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return `[${members.join(",")}${tail}]`;
      case "Set":
      case "Map":
        return `new ${type}([${Array.from(thing).map(stringify3).join(",")}])`;
      case "Int8Array":
      case "Uint8Array":
      case "Uint8ClampedArray":
      case "Int16Array":
      case "Uint16Array":
      case "Int32Array":
      case "Uint32Array":
      case "Float32Array":
      case "Float64Array":
      case "BigInt64Array":
      case "BigUint64Array": {
        let str2 = `new ${type}`;
        if (counts.get(thing.buffer) === 1) {
          const array2 = new thing.constructor(thing.buffer);
          str2 += `([${array2}])`;
        } else {
          str2 += `([${stringify3(thing.buffer)}])`;
        }
        const a = thing.byteOffset;
        const b = a + thing.byteLength;
        if (a > 0 || b !== thing.buffer.byteLength) {
          const m = +/(\d+)/.exec(type)[1] / 8;
          str2 += `.subarray(${a / m},${b / m})`;
        }
        return str2;
      }
      case "ArrayBuffer": {
        const ui8 = new Uint8Array(thing);
        return `new Uint8Array([${ui8.toString()}]).buffer`;
      }
      case "Temporal.Duration":
      case "Temporal.Instant":
      case "Temporal.PlainDate":
      case "Temporal.PlainTime":
      case "Temporal.PlainDateTime":
      case "Temporal.PlainMonthDay":
      case "Temporal.PlainYearMonth":
      case "Temporal.ZonedDateTime":
        return `${type}.from(${stringify_string(thing.toString())})`;
      default:
        const keys2 = Object.keys(thing);
        const obj = keys2.map((key2) => `${safe_key(key2)}:${stringify3(thing[key2])}`).join(",");
        const proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return keys2.length > 0 ? `{${obj},__proto__:null}` : `{__proto__:null}`;
        }
        return `{${obj}}`;
    }
  }
  const str = stringify3(value);
  if (names.size) {
    const params = [];
    const statements = [];
    const values = [];
    names.forEach((name, thing) => {
      params.push(name);
      if (custom.has(thing)) {
        values.push(
          /** @type {string} */
          custom.get(thing)
        );
        return;
      }
      if (is_primitive(thing)) {
        values.push(stringify_primitive(thing));
        return;
      }
      const type = get_type(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values.push(`Object(${stringify3(thing.valueOf())})`);
          break;
        case "RegExp":
          values.push(thing.toString());
          break;
        case "Date":
          values.push(`new Date(${thing.getTime()})`);
          break;
        case "Array":
          values.push(`Array(${thing.length})`);
          thing.forEach((v, i) => {
            statements.push(`${name}[${i}]=${stringify3(v)}`);
          });
          break;
        case "Set":
          values.push(`new Set`);
          statements.push(
            `${name}.${Array.from(thing).map((v) => `add(${stringify3(v)})`).join(".")}`
          );
          break;
        case "Map":
          values.push(`new Map`);
          statements.push(
            `${name}.${Array.from(thing).map(([k, v]) => `set(${stringify3(k)}, ${stringify3(v)})`).join(".")}`
          );
          break;
        case "ArrayBuffer":
          values.push(
            `new Uint8Array([${new Uint8Array(thing).join(",")}]).buffer`
          );
          break;
        default:
          values.push(
            Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}"
          );
          Object.keys(thing).forEach((key2) => {
            statements.push(
              `${name}${safe_prop(key2)}=${stringify3(thing[key2])}`
            );
          });
      }
    });
    statements.push(`return ${str}`);
    return `(function(${params.join(",")}){${statements.join(
      ";"
    )}}(${values.join(",")}))`;
  } else {
    return str;
  }
}
function get_name(num) {
  let name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? `${name}0` : name;
}
function escape_unsafe_char(c2) {
  return escaped[c2] || c2;
}
function escape_unsafe_chars(str) {
  return str.replace(unsafe_chars, escape_unsafe_char);
}
function safe_key(key2) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key2) ? key2 : escape_unsafe_chars(JSON.stringify(key2));
}
function safe_prop(key2) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key2) ? `.${key2}` : `[${escape_unsafe_chars(JSON.stringify(key2))}]`;
}
function stringify_primitive(thing) {
  if (typeof thing === "string") return stringify_string(thing);
  if (thing === void 0) return "void 0";
  if (thing === 0 && 1 / thing < 0) return "-0";
  const str = String(thing);
  if (typeof thing === "number") return str.replace(/^(-)?0\./, "$1.");
  if (typeof thing === "bigint") return thing + "n";
  return str;
}

// node_modules/devalue/src/base64.js
function encode64(arraybuffer) {
  const dv = new DataView(arraybuffer);
  let binaryString = "";
  for (let i = 0; i < arraybuffer.byteLength; i++) {
    binaryString += String.fromCharCode(dv.getUint8(i));
  }
  return binaryToAscii(binaryString);
}
function decode64(string) {
  const binaryString = asciiToBinary(string);
  const arraybuffer = new ArrayBuffer(binaryString.length);
  const dv = new DataView(arraybuffer);
  for (let i = 0; i < arraybuffer.byteLength; i++) {
    dv.setUint8(i, binaryString.charCodeAt(i));
  }
  return arraybuffer;
}
var KEY_STRING = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function asciiToBinary(data) {
  if (data.length % 4 === 0) {
    data = data.replace(/==?$/, "");
  }
  let output = "";
  let buffer = 0;
  let accumulatedBits = 0;
  for (let i = 0; i < data.length; i++) {
    buffer <<= 6;
    buffer |= KEY_STRING.indexOf(data[i]);
    accumulatedBits += 6;
    if (accumulatedBits === 24) {
      output += String.fromCharCode((buffer & 16711680) >> 16);
      output += String.fromCharCode((buffer & 65280) >> 8);
      output += String.fromCharCode(buffer & 255);
      buffer = accumulatedBits = 0;
    }
  }
  if (accumulatedBits === 12) {
    buffer >>= 4;
    output += String.fromCharCode(buffer);
  } else if (accumulatedBits === 18) {
    buffer >>= 2;
    output += String.fromCharCode((buffer & 65280) >> 8);
    output += String.fromCharCode(buffer & 255);
  }
  return output;
}
function binaryToAscii(str) {
  let out = "";
  for (let i = 0; i < str.length; i += 3) {
    const groupsOfSix = [void 0, void 0, void 0, void 0];
    groupsOfSix[0] = str.charCodeAt(i) >> 2;
    groupsOfSix[1] = (str.charCodeAt(i) & 3) << 4;
    if (str.length > i + 1) {
      groupsOfSix[1] |= str.charCodeAt(i + 1) >> 4;
      groupsOfSix[2] = (str.charCodeAt(i + 1) & 15) << 2;
    }
    if (str.length > i + 2) {
      groupsOfSix[2] |= str.charCodeAt(i + 2) >> 6;
      groupsOfSix[3] = str.charCodeAt(i + 2) & 63;
    }
    for (let j = 0; j < groupsOfSix.length; j++) {
      if (typeof groupsOfSix[j] === "undefined") {
        out += "=";
      } else {
        out += KEY_STRING[groupsOfSix[j]];
      }
    }
  }
  return out;
}

// node_modules/devalue/src/constants.js
var UNDEFINED = -1;
var HOLE = -2;
var NAN = -3;
var POSITIVE_INFINITY = -4;
var NEGATIVE_INFINITY = -5;
var NEGATIVE_ZERO = -6;

// node_modules/devalue/src/parse.js
function parse(serialized, revivers) {
  return unflatten(JSON.parse(serialized), revivers);
}
function unflatten(parsed, revivers) {
  if (typeof parsed === "number") return hydrate(parsed, true);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Invalid input");
  }
  const values = (
    /** @type {any[]} */
    parsed
  );
  const hydrated = Array(values.length);
  let hydrating = null;
  function hydrate(index8, standalone = false) {
    if (index8 === UNDEFINED) return void 0;
    if (index8 === NAN) return NaN;
    if (index8 === POSITIVE_INFINITY) return Infinity;
    if (index8 === NEGATIVE_INFINITY) return -Infinity;
    if (index8 === NEGATIVE_ZERO) return -0;
    if (standalone || typeof index8 !== "number") {
      throw new Error(`Invalid input`);
    }
    if (index8 in hydrated) return hydrated[index8];
    const value = values[index8];
    if (!value || typeof value !== "object") {
      hydrated[index8] = value;
    } else if (Array.isArray(value)) {
      if (typeof value[0] === "string") {
        const type = value[0];
        const reviver = revivers && Object.hasOwn(revivers, type) ? revivers[type] : void 0;
        if (reviver) {
          let i = value[1];
          if (typeof i !== "number") {
            i = values.push(value[1]) - 1;
          }
          hydrating ??= /* @__PURE__ */ new Set();
          if (hydrating.has(i)) {
            throw new Error("Invalid circular reference");
          }
          hydrating.add(i);
          hydrated[index8] = reviver(hydrate(i));
          hydrating.delete(i);
          return hydrated[index8];
        }
        switch (type) {
          case "Date":
            hydrated[index8] = new Date(value[1]);
            break;
          case "Set":
            const set = /* @__PURE__ */ new Set();
            hydrated[index8] = set;
            for (let i = 1; i < value.length; i += 1) {
              set.add(hydrate(value[i]));
            }
            break;
          case "Map":
            const map = /* @__PURE__ */ new Map();
            hydrated[index8] = map;
            for (let i = 1; i < value.length; i += 2) {
              map.set(hydrate(value[i]), hydrate(value[i + 1]));
            }
            break;
          case "RegExp":
            hydrated[index8] = new RegExp(value[1], value[2]);
            break;
          case "Object":
            hydrated[index8] = Object(value[1]);
            break;
          case "BigInt":
            hydrated[index8] = BigInt(value[1]);
            break;
          case "null":
            const obj = /* @__PURE__ */ Object.create(null);
            hydrated[index8] = obj;
            for (let i = 1; i < value.length; i += 2) {
              obj[value[i]] = hydrate(value[i + 1]);
            }
            break;
          case "Int8Array":
          case "Uint8Array":
          case "Uint8ClampedArray":
          case "Int16Array":
          case "Uint16Array":
          case "Int32Array":
          case "Uint32Array":
          case "Float32Array":
          case "Float64Array":
          case "BigInt64Array":
          case "BigUint64Array": {
            if (values[value[1]][0] !== "ArrayBuffer") {
              throw new Error("Invalid data");
            }
            const TypedArrayConstructor = globalThis[type];
            const buffer = hydrate(value[1]);
            const typedArray = new TypedArrayConstructor(buffer);
            hydrated[index8] = value[2] !== void 0 ? typedArray.subarray(value[2], value[3]) : typedArray;
            break;
          }
          case "ArrayBuffer": {
            const base64 = value[1];
            if (typeof base64 !== "string") {
              throw new Error("Invalid ArrayBuffer encoding");
            }
            const arraybuffer = decode64(base64);
            hydrated[index8] = arraybuffer;
            break;
          }
          case "Temporal.Duration":
          case "Temporal.Instant":
          case "Temporal.PlainDate":
          case "Temporal.PlainTime":
          case "Temporal.PlainDateTime":
          case "Temporal.PlainMonthDay":
          case "Temporal.PlainYearMonth":
          case "Temporal.ZonedDateTime": {
            const temporalName = type.slice(9);
            hydrated[index8] = Temporal[temporalName].from(value[1]);
            break;
          }
          case "URL": {
            const url = new URL(value[1]);
            hydrated[index8] = url;
            break;
          }
          case "URLSearchParams": {
            const url = new URLSearchParams(value[1]);
            hydrated[index8] = url;
            break;
          }
          default:
            throw new Error(`Unknown type ${type}`);
        }
      } else {
        const array2 = new Array(value.length);
        hydrated[index8] = array2;
        for (let i = 0; i < value.length; i += 1) {
          const n2 = value[i];
          if (n2 === HOLE) continue;
          array2[i] = hydrate(n2);
        }
      }
    } else {
      const object = {};
      hydrated[index8] = object;
      for (const key2 in value) {
        if (key2 === "__proto__") {
          throw new Error("Cannot parse an object with a `__proto__` property");
        }
        const n2 = value[key2];
        object[key2] = hydrate(n2);
      }
    }
    return hydrated[index8];
  }
  return hydrate(0);
}

// node_modules/devalue/src/stringify.js
function stringify(value, reducers) {
  const stringified = [];
  const indexes = /* @__PURE__ */ new Map();
  const custom = [];
  if (reducers) {
    for (const key2 of Object.getOwnPropertyNames(reducers)) {
      custom.push({ key: key2, fn: reducers[key2] });
    }
  }
  const keys = [];
  let p = 0;
  function flatten(thing) {
    if (thing === void 0) return UNDEFINED;
    if (Number.isNaN(thing)) return NAN;
    if (thing === Infinity) return POSITIVE_INFINITY;
    if (thing === -Infinity) return NEGATIVE_INFINITY;
    if (thing === 0 && 1 / thing < 0) return NEGATIVE_ZERO;
    if (indexes.has(thing)) return indexes.get(thing);
    const index9 = p++;
    indexes.set(thing, index9);
    for (const { key: key2, fn } of custom) {
      const value2 = fn(thing);
      if (value2) {
        stringified[index9] = `["${key2}",${flatten(value2)}]`;
        return index9;
      }
    }
    if (typeof thing === "function") {
      throw new DevalueError(`Cannot stringify a function`, keys, thing, value);
    }
    let str = "";
    if (is_primitive(thing)) {
      str = stringify_primitive2(thing);
    } else {
      const type = get_type(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          str = `["Object",${stringify_primitive2(thing)}]`;
          break;
        case "BigInt":
          str = `["BigInt",${thing}]`;
          break;
        case "Date":
          const valid = !isNaN(thing.getDate());
          str = `["Date","${valid ? thing.toISOString() : ""}"]`;
          break;
        case "URL":
          str = `["URL",${stringify_string(thing.toString())}]`;
          break;
        case "URLSearchParams":
          str = `["URLSearchParams",${stringify_string(thing.toString())}]`;
          break;
        case "RegExp":
          const { source, flags } = thing;
          str = flags ? `["RegExp",${stringify_string(source)},"${flags}"]` : `["RegExp",${stringify_string(source)}]`;
          break;
        case "Array":
          str = "[";
          for (let i = 0; i < thing.length; i += 1) {
            if (i > 0) str += ",";
            if (i in thing) {
              keys.push(`[${i}]`);
              str += flatten(thing[i]);
              keys.pop();
            } else {
              str += HOLE;
            }
          }
          str += "]";
          break;
        case "Set":
          str = '["Set"';
          for (const value2 of thing) {
            str += `,${flatten(value2)}`;
          }
          str += "]";
          break;
        case "Map":
          str = '["Map"';
          for (const [key2, value2] of thing) {
            keys.push(
              `.get(${is_primitive(key2) ? stringify_primitive2(key2) : "..."})`
            );
            str += `,${flatten(key2)},${flatten(value2)}`;
            keys.pop();
          }
          str += "]";
          break;
        case "Int8Array":
        case "Uint8Array":
        case "Uint8ClampedArray":
        case "Int16Array":
        case "Uint16Array":
        case "Int32Array":
        case "Uint32Array":
        case "Float32Array":
        case "Float64Array":
        case "BigInt64Array":
        case "BigUint64Array": {
          const typedArray = thing;
          str = '["' + type + '",' + flatten(typedArray.buffer);
          const a = thing.byteOffset;
          const b = a + thing.byteLength;
          if (a > 0 || b !== typedArray.buffer.byteLength) {
            const m = +/(\d+)/.exec(type)[1] / 8;
            str += `,${a / m},${b / m}`;
          }
          str += "]";
          break;
        }
        case "ArrayBuffer": {
          const arraybuffer = thing;
          const base64 = encode64(arraybuffer);
          str = `["ArrayBuffer","${base64}"]`;
          break;
        }
        case "Temporal.Duration":
        case "Temporal.Instant":
        case "Temporal.PlainDate":
        case "Temporal.PlainTime":
        case "Temporal.PlainDateTime":
        case "Temporal.PlainMonthDay":
        case "Temporal.PlainYearMonth":
        case "Temporal.ZonedDateTime":
          str = `["${type}",${stringify_string(thing.toString())}]`;
          break;
        default:
          if (!is_plain_object(thing)) {
            throw new DevalueError(
              `Cannot stringify arbitrary non-POJOs`,
              keys,
              thing,
              value
            );
          }
          if (enumerable_symbols(thing).length > 0) {
            throw new DevalueError(
              `Cannot stringify POJOs with symbolic keys`,
              keys,
              thing,
              value
            );
          }
          if (Object.getPrototypeOf(thing) === null) {
            str = '["null"';
            for (const key2 in thing) {
              keys.push(stringify_key(key2));
              str += `,${stringify_string(key2)},${flatten(thing[key2])}`;
              keys.pop();
            }
            str += "]";
          } else {
            str = "{";
            let started = false;
            for (const key2 in thing) {
              if (started) str += ",";
              started = true;
              keys.push(stringify_key(key2));
              str += `${stringify_string(key2)}:${flatten(thing[key2])}`;
              keys.pop();
            }
            str += "}";
          }
      }
    }
    stringified[index9] = str;
    return index9;
  }
  const index8 = flatten(value);
  if (index8 < 0) return `${index8}`;
  return `[${stringified.join(",")}]`;
}
function stringify_primitive2(thing) {
  const type = typeof thing;
  if (type === "string") return stringify_string(thing);
  if (thing instanceof String) return stringify_string(thing.toString());
  if (thing === void 0) return UNDEFINED.toString();
  if (thing === 0 && 1 / thing < 0) return NEGATIVE_ZERO.toString();
  if (type === "bigint") return `["BigInt","${thing}"]`;
  return String(thing);
}

// .svelte-kit/output/server/chunks/shared.js
init_utils();
var BROWSER = false;
var SVELTE_KIT_ASSETS = "/_svelte_kit_assets";
var ENDPOINT_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"];
var PAGE_METHODS = ["GET", "POST", "HEAD"];
function set_nested_value(object, path_string, value) {
  if (path_string.startsWith("n:")) {
    path_string = path_string.slice(2);
    value = value === "" ? void 0 : parseFloat(value);
  } else if (path_string.startsWith("b:")) {
    path_string = path_string.slice(2);
    value = value === "on";
  }
  deep_set(object, split_path(path_string), value);
}
function convert_formdata(data) {
  const result = {};
  for (let key2 of data.keys()) {
    const is_array = key2.endsWith("[]");
    let values = data.getAll(key2);
    if (is_array) key2 = key2.slice(0, -2);
    if (values.length > 1 && !is_array) {
      throw new Error(`Form cannot contain duplicated keys \u2014 "${key2}" has ${values.length} values`);
    }
    values = values.filter(
      (entry) => typeof entry === "string" || entry.name !== "" || entry.size > 0
    );
    if (key2.startsWith("n:")) {
      key2 = key2.slice(2);
      values = values.map((v) => v === "" ? void 0 : parseFloat(
        /** @type {string} */
        v
      ));
    } else if (key2.startsWith("b:")) {
      key2 = key2.slice(2);
      values = values.map((v) => v === "on");
    }
    set_nested_value(result, key2, is_array ? values : values[0]);
  }
  return result;
}
var BINARY_FORM_CONTENT_TYPE = "application/x-sveltekit-formdata";
var BINARY_FORM_VERSION = 0;
var HEADER_BYTES = 1 + 4 + 2;
async function deserialize_binary_form(request) {
  if (request.headers.get("content-type") !== BINARY_FORM_CONTENT_TYPE) {
    const form_data = await request.formData();
    return { data: convert_formdata(form_data), meta: {}, form_data };
  }
  if (!request.body) {
    throw deserialize_error("no body");
  }
  const content_length = parseInt(request.headers.get("content-length") ?? "");
  if (Number.isNaN(content_length)) {
    throw deserialize_error("invalid Content-Length header");
  }
  const reader = request.body.getReader();
  const chunks = [];
  function get_chunk(index8) {
    if (index8 in chunks) return chunks[index8];
    let i = chunks.length;
    while (i <= index8) {
      chunks[i] = reader.read().then((chunk) => chunk.value);
      i++;
    }
    return chunks[index8];
  }
  async function get_buffer(offset, length) {
    let start_chunk;
    let chunk_start = 0;
    let chunk_index;
    for (chunk_index = 0; ; chunk_index++) {
      const chunk = await get_chunk(chunk_index);
      if (!chunk) return null;
      const chunk_end = chunk_start + chunk.byteLength;
      if (offset >= chunk_start && offset < chunk_end) {
        start_chunk = chunk;
        break;
      }
      chunk_start = chunk_end;
    }
    if (offset + length <= chunk_start + start_chunk.byteLength) {
      return start_chunk.subarray(offset - chunk_start, offset + length - chunk_start);
    }
    const chunks2 = [start_chunk.subarray(offset - chunk_start)];
    let cursor = start_chunk.byteLength - offset + chunk_start;
    while (cursor < length) {
      chunk_index++;
      let chunk = await get_chunk(chunk_index);
      if (!chunk) return null;
      if (chunk.byteLength > length - cursor) {
        chunk = chunk.subarray(0, length - cursor);
      }
      chunks2.push(chunk);
      cursor += chunk.byteLength;
    }
    const buffer = new Uint8Array(length);
    cursor = 0;
    for (const chunk of chunks2) {
      buffer.set(chunk, cursor);
      cursor += chunk.byteLength;
    }
    return buffer;
  }
  const header = await get_buffer(0, HEADER_BYTES);
  if (!header) throw deserialize_error("too short");
  if (header[0] !== BINARY_FORM_VERSION) {
    throw deserialize_error(`got version ${header[0]}, expected version ${BINARY_FORM_VERSION}`);
  }
  const header_view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const data_length = header_view.getUint32(1, true);
  if (HEADER_BYTES + data_length > content_length) {
    throw deserialize_error("data overflow");
  }
  const file_offsets_length = header_view.getUint16(5, true);
  if (HEADER_BYTES + data_length + file_offsets_length > content_length) {
    throw deserialize_error("file offset table overflow");
  }
  const data_buffer = await get_buffer(HEADER_BYTES, data_length);
  if (!data_buffer) throw deserialize_error("data too short");
  let file_offsets;
  let files_start_offset;
  if (file_offsets_length > 0) {
    const file_offsets_buffer = await get_buffer(HEADER_BYTES + data_length, file_offsets_length);
    if (!file_offsets_buffer) throw deserialize_error("file offset table too short");
    file_offsets = /** @type {Array<number>} */
    JSON.parse(text_decoder2.decode(file_offsets_buffer));
    files_start_offset = HEADER_BYTES + data_length + file_offsets_length;
  }
  const [data, meta] = parse(text_decoder2.decode(data_buffer), {
    File: ([name, type, size, last_modified, index8]) => {
      if (files_start_offset + file_offsets[index8] + size > content_length) {
        throw deserialize_error("file data overflow");
      }
      return new Proxy(
        new LazyFile(
          name,
          type,
          size,
          last_modified,
          get_chunk,
          files_start_offset + file_offsets[index8]
        ),
        {
          getPrototypeOf() {
            return File.prototype;
          }
        }
      );
    }
  });
  void (async () => {
    let has_more = true;
    while (has_more) {
      const chunk = await get_chunk(chunks.length);
      has_more = !!chunk;
    }
  })();
  return { data, meta, form_data: null };
}
function deserialize_error(message) {
  return new SvelteKitError(400, "Bad Request", `Could not deserialize binary form: ${message}`);
}
var LazyFile = class _LazyFile {
  /** @type {(index: number) => Promise<Uint8Array<ArrayBuffer> | undefined>} */
  #get_chunk;
  /** @type {number} */
  #offset;
  /**
   * @param {string} name
   * @param {string} type
   * @param {number} size
   * @param {number} last_modified
   * @param {(index: number) => Promise<Uint8Array<ArrayBuffer> | undefined>} get_chunk
   * @param {number} offset
   */
  constructor(name, type, size, last_modified, get_chunk, offset) {
    this.name = name;
    this.type = type;
    this.size = size;
    this.lastModified = last_modified;
    this.webkitRelativePath = "";
    this.#get_chunk = get_chunk;
    this.#offset = offset;
    this.arrayBuffer = this.arrayBuffer.bind(this);
    this.bytes = this.bytes.bind(this);
    this.slice = this.slice.bind(this);
    this.stream = this.stream.bind(this);
    this.text = this.text.bind(this);
  }
  /** @type {ArrayBuffer | undefined} */
  #buffer;
  async arrayBuffer() {
    this.#buffer ??= await new Response(this.stream()).arrayBuffer();
    return this.#buffer;
  }
  async bytes() {
    return new Uint8Array(await this.arrayBuffer());
  }
  /**
   * @param {number=} start
   * @param {number=} end
   * @param {string=} contentType
   */
  slice(start = 0, end = this.size, contentType = this.type) {
    if (start < 0) {
      start = Math.max(this.size + start, 0);
    } else {
      start = Math.min(start, this.size);
    }
    if (end < 0) {
      end = Math.max(this.size + end, 0);
    } else {
      end = Math.min(end, this.size);
    }
    const size = Math.max(end - start, 0);
    const file = new _LazyFile(
      this.name,
      contentType,
      size,
      this.lastModified,
      this.#get_chunk,
      this.#offset + start
    );
    return file;
  }
  stream() {
    let cursor = 0;
    let chunk_index = 0;
    return new ReadableStream({
      start: async (controller) => {
        let chunk_start = 0;
        let start_chunk = null;
        for (chunk_index = 0; ; chunk_index++) {
          const chunk = await this.#get_chunk(chunk_index);
          if (!chunk) return null;
          const chunk_end = chunk_start + chunk.byteLength;
          if (this.#offset >= chunk_start && this.#offset < chunk_end) {
            start_chunk = chunk;
            break;
          }
          chunk_start = chunk_end;
        }
        if (this.#offset + this.size <= chunk_start + start_chunk.byteLength) {
          controller.enqueue(
            start_chunk.subarray(this.#offset - chunk_start, this.#offset + this.size - chunk_start)
          );
          controller.close();
        } else {
          controller.enqueue(start_chunk.subarray(this.#offset - chunk_start));
          cursor = start_chunk.byteLength - this.#offset + chunk_start;
        }
      },
      pull: async (controller) => {
        chunk_index++;
        let chunk = await this.#get_chunk(chunk_index);
        if (!chunk) {
          controller.error("incomplete file data");
          controller.close();
          return;
        }
        if (chunk.byteLength > this.size - cursor) {
          chunk = chunk.subarray(0, this.size - cursor);
        }
        controller.enqueue(chunk);
        cursor += chunk.byteLength;
        if (cursor >= this.size) {
          controller.close();
        }
      }
    });
  }
  async text() {
    return text_decoder2.decode(await this.arrayBuffer());
  }
};
var path_regex = /^[a-zA-Z_$]\w*(\.[a-zA-Z_$]\w*|\[\d+\])*$/;
function split_path(path) {
  if (!path_regex.test(path)) {
    throw new Error(`Invalid path ${path}`);
  }
  return path.split(/\.|\[|\]/).filter(Boolean);
}
function check_prototype_pollution(key2) {
  if (key2 === "__proto__" || key2 === "constructor" || key2 === "prototype") {
    throw new Error(
      `Invalid key "${key2}"`
    );
  }
}
function deep_set(object, keys, value) {
  let current2 = object;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key2 = keys[i];
    check_prototype_pollution(key2);
    const is_array = /^\d+$/.test(keys[i + 1]);
    const exists = Object.hasOwn(current2, key2);
    const inner = current2[key2];
    if (exists && is_array !== Array.isArray(inner)) {
      throw new Error(`Invalid array key ${keys[i + 1]}`);
    }
    if (!exists) {
      current2[key2] = is_array ? [] : {};
    }
    current2 = current2[key2];
  }
  const final_key = keys[keys.length - 1];
  check_prototype_pollution(final_key);
  current2[final_key] = value;
}
function negotiate(accept, types) {
  const parts = [];
  accept.split(",").forEach((str, i) => {
    const match = /([^/ \t]+)\/([^; \t]+)[ \t]*(?:;[ \t]*q=([0-9.]+))?/.exec(str);
    if (match) {
      const [, type, subtype, q = "1"] = match;
      parts.push({ type, subtype, q: +q, i });
    }
  });
  parts.sort((a, b) => {
    if (a.q !== b.q) {
      return b.q - a.q;
    }
    if (a.subtype === "*" !== (b.subtype === "*")) {
      return a.subtype === "*" ? 1 : -1;
    }
    if (a.type === "*" !== (b.type === "*")) {
      return a.type === "*" ? 1 : -1;
    }
    return a.i - b.i;
  });
  let accepted;
  let min_priority = Infinity;
  for (const mimetype of types) {
    const [type, subtype] = mimetype.split("/");
    const priority = parts.findIndex(
      (part) => (part.type === type || part.type === "*") && (part.subtype === subtype || part.subtype === "*")
    );
    if (priority !== -1 && priority < min_priority) {
      accepted = mimetype;
      min_priority = priority;
    }
  }
  return accepted;
}
function is_content_type(request, ...types) {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim() ?? "";
  return types.includes(type.toLowerCase());
}
function is_form_content_type(request) {
  return is_content_type(
    request,
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain",
    BINARY_FORM_CONTENT_TYPE
  );
}
function coalesce_to_error(err) {
  return err instanceof Error || err && /** @type {any} */
  err.name && /** @type {any} */
  err.message ? (
    /** @type {Error} */
    err
  ) : new Error(JSON.stringify(err));
}
function normalize_error(error2) {
  return (
    /** @type {import('../exports/internal/index.js').Redirect | HttpError | SvelteKitError | Error} */
    error2
  );
}
function get_status(error2) {
  return error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : 500;
}
function get_message(error2) {
  return error2 instanceof SvelteKitError ? error2.text : "Internal Error";
}
var escape_html_attr_dict = {
  "&": "&amp;",
  '"': "&quot;"
  // Svelte also escapes < because the escape function could be called inside a `noscript` there
  // https://github.com/sveltejs/svelte/security/advisories/GHSA-8266-84wp-wv5c
  // However, that doesn't apply in SvelteKit
};
var escape_html_dict = {
  "&": "&amp;",
  "<": "&lt;"
};
var surrogates = (
  // high surrogate without paired low surrogate
  "[\\ud800-\\udbff](?![\\udc00-\\udfff])|[\\ud800-\\udbff][\\udc00-\\udfff]|[\\udc00-\\udfff]"
);
var escape_html_attr_regex = new RegExp(
  `[${Object.keys(escape_html_attr_dict).join("")}]|` + surrogates,
  "g"
);
var escape_html_regex = new RegExp(
  `[${Object.keys(escape_html_dict).join("")}]|` + surrogates,
  "g"
);
function escape_html(str, is_attr) {
  const dict = is_attr ? escape_html_attr_dict : escape_html_dict;
  const escaped_str = str.replace(is_attr ? escape_html_attr_regex : escape_html_regex, (match) => {
    if (match.length === 2) {
      return match;
    }
    return dict[match] ?? `&#${match.charCodeAt(0)};`;
  });
  return escaped_str;
}
function method_not_allowed(mod, method) {
  return text(`${method} method not allowed`, {
    status: 405,
    headers: {
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
      // "The server must generate an Allow header field in a 405 status code response"
      allow: allowed_methods(mod).join(", ")
    }
  });
}
function allowed_methods(mod) {
  const allowed = ENDPOINT_METHODS.filter((method) => method in mod);
  if ("GET" in mod && !("HEAD" in mod)) {
    allowed.push("HEAD");
  }
  return allowed;
}
function get_global_name(options2) {
  return `__sveltekit_${options2.version_hash}`;
}
function static_error_page(options2, status, message) {
  let page2 = options2.templates.error({ status, message: escape_html(message) });
  return text(page2, {
    headers: { "content-type": "text/html; charset=utf-8" },
    status
  });
}
async function handle_fatal_error(event, state, options2, error2) {
  error2 = error2 instanceof HttpError ? error2 : coalesce_to_error(error2);
  const status = get_status(error2);
  const body2 = await handle_error_and_jsonify(event, state, options2, error2);
  const type = negotiate(event.request.headers.get("accept") || "text/html", [
    "application/json",
    "text/html"
  ]);
  if (event.isDataRequest || type === "application/json") {
    return json(body2, {
      status
    });
  }
  return static_error_page(options2, status, body2.message);
}
async function handle_error_and_jsonify(event, state, options2, error2) {
  if (error2 instanceof HttpError) {
    return { message: "Unknown Error", ...error2.body };
  }
  const status = get_status(error2);
  const message = get_message(error2);
  return await with_request_store(
    { event, state },
    () => options2.hooks.handleError({ error: error2, event, status, message })
  ) ?? { message };
}
function redirect_response(status, location) {
  const response = new Response(void 0, {
    status,
    headers: { location }
  });
  return response;
}
function clarify_devalue_error(event, error2) {
  if (error2.path) {
    return `Data returned from \`load\` while rendering ${event.route.id} is not serializable: ${error2.message} (${error2.path}). If you need to serialize/deserialize custom types, use transport hooks: https://svelte.dev/docs/kit/hooks#Universal-hooks-transport.`;
  }
  if (error2.path === "") {
    return `Data returned from \`load\` while rendering ${event.route.id} is not a plain object`;
  }
  return error2.message;
}
function serialize_uses(node) {
  const uses = {};
  if (node.uses && node.uses.dependencies.size > 0) {
    uses.dependencies = Array.from(node.uses.dependencies);
  }
  if (node.uses && node.uses.search_params.size > 0) {
    uses.search_params = Array.from(node.uses.search_params);
  }
  if (node.uses && node.uses.params.size > 0) {
    uses.params = Array.from(node.uses.params);
  }
  if (node.uses?.parent) uses.parent = 1;
  if (node.uses?.route) uses.route = 1;
  if (node.uses?.url) uses.url = 1;
  return uses;
}
function has_prerendered_path(manifest2, pathname) {
  return manifest2._.prerendered_routes.has(pathname) || pathname.at(-1) === "/" && manifest2._.prerendered_routes.has(pathname.slice(0, -1));
}
function format_server_error(status, error2, event) {
  const formatted_text = `
\x1B[1;31m[${status}] ${event.request.method} ${event.url.pathname}\x1B[0m`;
  if (status === 404) {
    return formatted_text;
  }
  return `${formatted_text}
${error2.stack}`;
}
function get_node_type(node_id) {
  const parts = node_id?.split("/");
  const filename = parts?.at(-1);
  if (!filename) return "unknown";
  const dot_parts = filename.split(".");
  return dot_parts.slice(0, -1).join(".");
}
var INVALIDATED_PARAM = "x-sveltekit-invalidated";
var TRAILING_SLASH_PARAM = "x-sveltekit-trailing-slash";
function stringify2(data, transport) {
  const encoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.encode]));
  return stringify(data, encoders);
}
function parse_remote_arg(string, transport) {
  if (!string) return void 0;
  const json_string = text_decoder2.decode(
    // no need to add back `=` characters, atob can handle it
    base64_decode(string.replaceAll("-", "+").replaceAll("_", "/"))
  );
  const decoders = Object.fromEntries(Object.entries(transport).map(([k, v]) => [k, v.decode]));
  return parse(json_string, decoders);
}
function create_remote_key(id, payload) {
  return id + "/" + payload;
}

// .svelte-kit/output/server/index.js
init_internal();
init_server();

// .svelte-kit/output/server/chunks/environment.js
var base = "";
var assets = base;
var app_dir = "_app";
var relative = true;
var initial = { base, assets };
function override(paths) {
  base = paths.base;
  assets = paths.assets;
}
function reset() {
  base = initial.base;
  assets = initial.assets;
}

// .svelte-kit/output/server/index.js
init_exports();
init_utils();
init_chunks();

// .svelte-kit/output/server/chunks/internal.js
init_ssr();
init_ssr2();
var public_env = {};
function set_private_env(environment) {
}
function set_public_env(environment) {
  public_env = environment;
}
var read_implementation = null;
function set_read_implementation(fn) {
  read_implementation = fn;
}
var Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page: page2 } = $$props;
  let { constructors } = $$props;
  let { components = [] } = $$props;
  let { form } = $$props;
  let { data_0 = null } = $$props;
  let { data_1 = null } = $$props;
  {
    setContext("__svelte__", stores);
  }
  afterUpdate(stores.page.notify);
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0) $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page2 !== void 0) $$bindings.page(page2);
  if ($$props.constructors === void 0 && $$bindings.constructors && constructors !== void 0) $$bindings.constructors(constructors);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0) $$bindings.components(components);
  if ($$props.form === void 0 && $$bindings.form && form !== void 0) $$bindings.form(form);
  if ($$props.data_0 === void 0 && $$bindings.data_0 && data_0 !== void 0) $$bindings.data_0(data_0);
  if ($$props.data_1 === void 0 && $$bindings.data_1 && data_1 !== void 0) $$bindings.data_1(data_1);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    {
      stores.page.set(page2);
    }
    $$rendered = `  ${constructors[1] ? `${validate_component(constructors[0] || missing_component, "svelte:component").$$render(
      $$result,
      {
        data: data_0,
        params: page2.params,
        this: components[0]
      },
      {
        this: ($$value) => {
          components[0] = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${validate_component(constructors[1] || missing_component, "svelte:component").$$render(
            $$result,
            {
              data: data_1,
              form,
              params: page2.params,
              this: components[1]
            },
            {
              this: ($$value) => {
                components[1] = $$value;
                $$settled = false;
              }
            },
            {}
          )}`;
        }
      }
    )}` : `${validate_component(constructors[0] || missing_component, "svelte:component").$$render(
      $$result,
      {
        data: data_0,
        form,
        params: page2.params,
        this: components[0]
      },
      {
        this: ($$value) => {
          components[0] = $$value;
          $$settled = false;
        }
      },
      {}
    )}`} ${``}`;
  } while (!$$settled);
  return $$rendered;
});
var options = {
  app_template_contains_nonce: false,
  async: false,
  csp: { "mode": "auto", "directives": { "upgrade-insecure-requests": false, "block-all-mixed-content": false }, "reportOnly": { "upgrade-insecure-requests": false, "block-all-mixed-content": false } },
  csrf_check_origin: true,
  csrf_trusted_origins: [],
  embedded: false,
  env_public_prefix: "PUBLIC_",
  env_private_prefix: "",
  hash_routing: false,
  hooks: null,
  // added lazily, via `get_hooks`
  preload_strategy: "modulepreload",
  root: Root,
  service_worker: false,
  service_worker_options: void 0,
  templates: {
    app: ({ head, body: body2, assets: assets2, nonce, env }) => '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <link rel="icon" href="' + assets2 + '/favicon.png" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    ' + head + '\n  </head>\n  <body data-sveltekit-preload-data="hover">\n    <div style="display: contents">' + body2 + "</div>\n  </body>\n</html>\n",
    error: ({ status, message }) => '<!doctype html>\n<html lang="en">\n	<head>\n		<meta charset="utf-8" />\n		<title>' + message + `</title>

		<style>
			body {
				--bg: white;
				--fg: #222;
				--divider: #ccc;
				background: var(--bg);
				color: var(--fg);
				font-family:
					system-ui,
					-apple-system,
					BlinkMacSystemFont,
					'Segoe UI',
					Roboto,
					Oxygen,
					Ubuntu,
					Cantarell,
					'Open Sans',
					'Helvetica Neue',
					sans-serif;
				display: flex;
				align-items: center;
				justify-content: center;
				height: 100vh;
				margin: 0;
			}

			.error {
				display: flex;
				align-items: center;
				max-width: 32rem;
				margin: 0 1rem;
			}

			.status {
				font-weight: 200;
				font-size: 3rem;
				line-height: 1;
				position: relative;
				top: -0.05rem;
			}

			.message {
				border-left: 1px solid var(--divider);
				padding: 0 0 0 1rem;
				margin: 0 0 0 1rem;
				min-height: 2.5rem;
				display: flex;
				align-items: center;
			}

			.message h1 {
				font-weight: 400;
				font-size: 1em;
				margin: 0;
			}

			@media (prefers-color-scheme: dark) {
				body {
					--bg: #222;
					--fg: #ddd;
					--divider: #666;
				}
			}
		</style>
	</head>
	<body>
		<div class="error">
			<span class="status">` + status + '</span>\n			<div class="message">\n				<h1>' + message + "</h1>\n			</div>\n		</div>\n	</body>\n</html>\n"
  },
  version_hash: "14pq5a4"
};
async function get_hooks() {
  let handle;
  let handleFetch;
  let handleError;
  let handleValidationError;
  let init2;
  let reroute;
  let transport;
  return {
    handle,
    handleFetch,
    handleError,
    handleValidationError,
    init: init2,
    reroute,
    transport
  };
}

// .svelte-kit/output/server/index.js
var import_cookie = __toESM(require_cookie(), 1);

// node_modules/set-cookie-parser/lib/set-cookie.js
var defaultParseOptions = {
  decodeValues: true,
  map: false,
  silent: false,
  split: "auto"
  // auto = split strings but not arrays
};
function isForbiddenKey(key2) {
  return typeof key2 !== "string" || key2 in {};
}
function createNullObj() {
  return /* @__PURE__ */ Object.create(null);
}
function isNonEmptyString(str) {
  return typeof str === "string" && !!str.trim();
}
function parseString(setCookieValue, options2) {
  var parts = setCookieValue.split(";").filter(isNonEmptyString);
  var nameValuePairStr = parts.shift();
  var parsed = parseNameValuePair(nameValuePairStr);
  var name = parsed.name;
  var value = parsed.value;
  options2 = options2 ? Object.assign({}, defaultParseOptions, options2) : defaultParseOptions;
  if (isForbiddenKey(name)) {
    return null;
  }
  try {
    value = options2.decodeValues ? decodeURIComponent(value) : value;
  } catch (e3) {
    console.error(
      "set-cookie-parser: failed to decode cookie value. Set options.decodeValues=false to disable decoding.",
      e3
    );
  }
  var cookie = createNullObj();
  cookie.name = name;
  cookie.value = value;
  parts.forEach(function(part) {
    var sides = part.split("=");
    var key2 = sides.shift().trimLeft().toLowerCase();
    if (isForbiddenKey(key2)) {
      return;
    }
    var value2 = sides.join("=");
    if (key2 === "expires") {
      cookie.expires = new Date(value2);
    } else if (key2 === "max-age") {
      var n2 = parseInt(value2, 10);
      if (!Number.isNaN(n2)) cookie.maxAge = n2;
    } else if (key2 === "secure") {
      cookie.secure = true;
    } else if (key2 === "httponly") {
      cookie.httpOnly = true;
    } else if (key2 === "samesite") {
      cookie.sameSite = value2;
    } else if (key2 === "partitioned") {
      cookie.partitioned = true;
    } else if (key2) {
      cookie[key2] = value2;
    }
  });
  return cookie;
}
function parseNameValuePair(nameValuePairStr) {
  var name = "";
  var value = "";
  var nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}
function parseSetCookie(input, options2) {
  options2 = options2 ? Object.assign({}, defaultParseOptions, options2) : defaultParseOptions;
  if (!input) {
    if (!options2.map) {
      return [];
    } else {
      return createNullObj();
    }
  }
  if (input.headers) {
    if (typeof input.headers.getSetCookie === "function") {
      input = input.headers.getSetCookie();
    } else if (input.headers["set-cookie"]) {
      input = input.headers["set-cookie"];
    } else {
      var sch = input.headers[Object.keys(input.headers).find(function(key2) {
        return key2.toLowerCase() === "set-cookie";
      })];
      if (!sch && input.headers.cookie && !options2.silent) {
        console.warn(
          "Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning."
        );
      }
      input = sch;
    }
  }
  var split = options2.split;
  var isArray = Array.isArray(input);
  if (split === "auto") {
    split = !isArray;
  }
  if (!isArray) {
    input = [input];
  }
  input = input.filter(isNonEmptyString);
  if (split) {
    input = input.map(splitCookiesString).flat();
  }
  if (!options2.map) {
    return input.map(function(str) {
      return parseString(str, options2);
    }).filter(Boolean);
  } else {
    var cookies = createNullObj();
    return input.reduce(function(cookies2, str) {
      var cookie = parseString(str, options2);
      if (cookie && !isForbiddenKey(cookie.name)) {
        cookies2[cookie.name] = cookie;
      }
      return cookies2;
    }, cookies);
  }
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString;
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  var cookiesStrings = [];
  var pos = 0;
  var start;
  var ch;
  var lastComma;
  var nextStart;
  var cookiesSeparatorFound;
  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }
  function notSpecialChar() {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  }
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }
  return cookiesStrings;
}
parseSetCookie.parseSetCookie = parseSetCookie;
parseSetCookie.parse = parseSetCookie;
parseSetCookie.parseString = parseString;
parseSetCookie.splitCookiesString = splitCookiesString;

// .svelte-kit/output/server/index.js
function with_resolvers() {
  let resolve2;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve2 = res;
    reject = rej;
  });
  return { promise, resolve: resolve2, reject };
}
var NULL_BODY_STATUS = [101, 103, 204, 205, 304];
var IN_WEBCONTAINER2 = !!globalThis.process?.versions?.webcontainer;
async function render_endpoint(event, event_state, mod, state) {
  const method = (
    /** @type {import('types').HttpMethod} */
    event.request.method
  );
  let handler = mod[method] || mod.fallback;
  if (method === "HEAD" && !mod.HEAD && mod.GET) {
    handler = mod.GET;
  }
  if (!handler) {
    return method_not_allowed(mod, method);
  }
  const prerender = mod.prerender ?? state.prerender_default;
  if (prerender && (mod.POST || mod.PATCH || mod.PUT || mod.DELETE)) {
    throw new Error("Cannot prerender endpoints that have mutative methods");
  }
  if (state.prerendering && !state.prerendering.inside_reroute && !prerender) {
    if (state.depth > 0) {
      throw new Error(`${event.route.id} is not prerenderable`);
    } else {
      return new Response(void 0, { status: 204 });
    }
  }
  event_state.is_endpoint_request = true;
  try {
    const response = await with_request_store(
      { event, state: event_state },
      () => handler(
        /** @type {import('@sveltejs/kit').RequestEvent<Record<string, any>>} */
        event
      )
    );
    if (!(response instanceof Response)) {
      throw new Error(
        `Invalid response from route ${event.url.pathname}: handler should return a Response object`
      );
    }
    if (state.prerendering && (!state.prerendering.inside_reroute || prerender)) {
      const cloned = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: new Headers(response.headers)
      });
      cloned.headers.set("x-sveltekit-prerender", String(prerender));
      if (state.prerendering.inside_reroute && prerender) {
        cloned.headers.set(
          "x-sveltekit-routeid",
          encodeURI(
            /** @type {string} */
            event.route.id
          )
        );
        state.prerendering.dependencies.set(event.url.pathname, { response: cloned, body: null });
      } else {
        return cloned;
      }
    }
    return response;
  } catch (e3) {
    if (e3 instanceof Redirect) {
      return new Response(void 0, {
        status: e3.status,
        headers: { location: e3.location }
      });
    }
    throw e3;
  }
}
function is_endpoint_request(event) {
  const { method, headers: headers2 } = event.request;
  if (ENDPOINT_METHODS.includes(method) && !PAGE_METHODS.includes(method)) {
    return true;
  }
  if (method === "POST" && headers2.get("x-sveltekit-action") === "true") return false;
  const accept = event.request.headers.get("accept") ?? "*/*";
  return negotiate(accept, ["*", "text/html"]) !== "text/html";
}
function compact(arr) {
  return arr.filter(
    /** @returns {val is NonNullable<T>} */
    (val) => val != null
  );
}
var DATA_SUFFIX = "/__data.json";
var HTML_DATA_SUFFIX = ".html__data.json";
function has_data_suffix2(pathname) {
  return pathname.endsWith(DATA_SUFFIX) || pathname.endsWith(HTML_DATA_SUFFIX);
}
function add_data_suffix2(pathname) {
  if (pathname.endsWith(".html")) return pathname.replace(/\.html$/, HTML_DATA_SUFFIX);
  return pathname.replace(/\/$/, "") + DATA_SUFFIX;
}
function strip_data_suffix2(pathname) {
  if (pathname.endsWith(HTML_DATA_SUFFIX)) {
    return pathname.slice(0, -HTML_DATA_SUFFIX.length) + ".html";
  }
  return pathname.slice(0, -DATA_SUFFIX.length);
}
var ROUTE_SUFFIX = "/__route.js";
function has_resolution_suffix2(pathname) {
  return pathname.endsWith(ROUTE_SUFFIX);
}
function add_resolution_suffix2(pathname) {
  return pathname.replace(/\/$/, "") + ROUTE_SUFFIX;
}
function strip_resolution_suffix2(pathname) {
  return pathname.slice(0, -ROUTE_SUFFIX.length);
}
var noop_span = {
  spanContext() {
    return noop_span_context;
  },
  setAttribute() {
    return this;
  },
  setAttributes() {
    return this;
  },
  addEvent() {
    return this;
  },
  setStatus() {
    return this;
  },
  updateName() {
    return this;
  },
  end() {
    return this;
  },
  isRecording() {
    return false;
  },
  recordException() {
    return this;
  },
  addLink() {
    return this;
  },
  addLinks() {
    return this;
  }
};
var noop_span_context = {
  traceId: "",
  spanId: "",
  traceFlags: 0
};
async function record_span({ name, attributes, fn }) {
  {
    return fn(noop_span);
  }
}
function is_action_json_request(event) {
  const accept = negotiate(event.request.headers.get("accept") ?? "*/*", [
    "application/json",
    "text/html"
  ]);
  return accept === "application/json" && event.request.method === "POST";
}
async function handle_action_json_request(event, event_state, options2, server2) {
  const actions = server2?.actions;
  if (!actions) {
    const no_actions_error = new SvelteKitError(
      405,
      "Method Not Allowed",
      `POST method not allowed. No form actions exist for ${"this page"}`
    );
    return action_json(
      {
        type: "error",
        error: await handle_error_and_jsonify(event, event_state, options2, no_actions_error)
      },
      {
        status: no_actions_error.status,
        headers: {
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
          // "The server must generate an Allow header field in a 405 status code response"
          allow: "GET"
        }
      }
    );
  }
  check_named_default_separate(actions);
  try {
    const data = await call_action(event, event_state, actions);
    if (BROWSER) ;
    if (data instanceof ActionFailure) {
      return action_json({
        type: "failure",
        status: data.status,
        // @ts-expect-error we assign a string to what is supposed to be an object. That's ok
        // because we don't use the object outside, and this way we have better code navigation
        // through knowing where the related interface is used.
        data: stringify_action_response(
          data.data,
          /** @type {string} */
          event.route.id,
          options2.hooks.transport
        )
      });
    } else {
      return action_json({
        type: "success",
        status: data ? 200 : 204,
        // @ts-expect-error see comment above
        data: stringify_action_response(
          data,
          /** @type {string} */
          event.route.id,
          options2.hooks.transport
        )
      });
    }
  } catch (e3) {
    const err = normalize_error(e3);
    if (err instanceof Redirect) {
      return action_json_redirect(err);
    }
    return action_json(
      {
        type: "error",
        error: await handle_error_and_jsonify(
          event,
          event_state,
          options2,
          check_incorrect_fail_use(err)
        )
      },
      {
        status: get_status(err)
      }
    );
  }
}
function check_incorrect_fail_use(error2) {
  return error2 instanceof ActionFailure ? new Error('Cannot "throw fail()". Use "return fail()"') : error2;
}
function action_json_redirect(redirect) {
  return action_json({
    type: "redirect",
    status: redirect.status,
    location: redirect.location
  });
}
function action_json(data, init2) {
  return json(data, init2);
}
function is_action_request(event) {
  return event.request.method === "POST";
}
async function handle_action_request(event, event_state, server2) {
  const actions = server2?.actions;
  if (!actions) {
    event.setHeaders({
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
      // "The server must generate an Allow header field in a 405 status code response"
      allow: "GET"
    });
    return {
      type: "error",
      error: new SvelteKitError(
        405,
        "Method Not Allowed",
        `POST method not allowed. No form actions exist for ${"this page"}`
      )
    };
  }
  check_named_default_separate(actions);
  try {
    const data = await call_action(event, event_state, actions);
    if (BROWSER) ;
    if (data instanceof ActionFailure) {
      return {
        type: "failure",
        status: data.status,
        data: data.data
      };
    } else {
      return {
        type: "success",
        status: 200,
        // @ts-expect-error this will be removed upon serialization, so `undefined` is the same as omission
        data
      };
    }
  } catch (e3) {
    const err = normalize_error(e3);
    if (err instanceof Redirect) {
      return {
        type: "redirect",
        status: err.status,
        location: err.location
      };
    }
    return {
      type: "error",
      error: check_incorrect_fail_use(err)
    };
  }
}
function check_named_default_separate(actions) {
  if (actions.default && Object.keys(actions).length > 1) {
    throw new Error(
      "When using named actions, the default action cannot be used. See the docs for more info: https://svelte.dev/docs/kit/form-actions#named-actions"
    );
  }
}
async function call_action(event, event_state, actions) {
  const url = new URL(event.request.url);
  let name = "default";
  for (const param of url.searchParams) {
    if (param[0].startsWith("/")) {
      name = param[0].slice(1);
      if (name === "default") {
        throw new Error('Cannot use reserved action name "default"');
      }
      break;
    }
  }
  const action = actions[name];
  if (!action) {
    throw new SvelteKitError(404, "Not Found", `No action with name '${name}' found`);
  }
  if (!is_form_content_type(event.request)) {
    throw new SvelteKitError(
      415,
      "Unsupported Media Type",
      `Form actions expect form-encoded data \u2014 received ${event.request.headers.get(
        "content-type"
      )}`
    );
  }
  return record_span({
    name: "sveltekit.form_action",
    attributes: {
      "http.route": event.route.id || "unknown"
    },
    fn: async (current2) => {
      const traced_event = merge_tracing(event, current2);
      const result = await with_request_store(
        { event: traced_event, state: event_state },
        () => action(traced_event)
      );
      if (result instanceof ActionFailure) {
        current2.setAttributes({
          "sveltekit.form_action.result.type": "failure",
          "sveltekit.form_action.result.status": result.status
        });
      }
      return result;
    }
  });
}
function uneval_action_response(data, route_id, transport) {
  const replacer = (thing) => {
    for (const key2 in transport) {
      const encoded = transport[key2].encode(thing);
      if (encoded) {
        return `app.decode('${key2}', ${uneval(encoded, replacer)})`;
      }
    }
  };
  return try_serialize(data, (value) => uneval(value, replacer), route_id);
}
function stringify_action_response(data, route_id, transport) {
  const encoders = Object.fromEntries(
    Object.entries(transport).map(([key2, value]) => [key2, value.encode])
  );
  return try_serialize(data, (value) => stringify(value, encoders), route_id);
}
function try_serialize(data, fn, route_id) {
  try {
    return fn(data);
  } catch (e3) {
    const error2 = (
      /** @type {any} */
      e3
    );
    if (data instanceof Response) {
      throw new Error(
        `Data returned from action inside ${route_id} is not serializable. Form actions need to return plain objects or fail(). E.g. return { success: true } or return fail(400, { message: "invalid" });`
      );
    }
    if ("path" in error2) {
      let message = `Data returned from action inside ${route_id} is not serializable: ${error2.message}`;
      if (error2.path !== "") message += ` (data.${error2.path})`;
      throw new Error(message);
    }
    throw error2;
  }
}
function create_async_iterator() {
  let resolved = -1;
  let returned = -1;
  const deferred = [];
  return {
    iterate: (transform = (x) => x) => {
      return {
        [Symbol.asyncIterator]() {
          return {
            next: async () => {
              const next = deferred[++returned];
              if (!next) return { value: null, done: true };
              const value = await next.promise;
              return { value: transform(value), done: false };
            }
          };
        }
      };
    },
    add: (promise) => {
      deferred.push(with_resolvers());
      void promise.then((value) => {
        deferred[++resolved].resolve(value);
      });
    }
  };
}
function server_data_serializer(event, event_state, options2) {
  let promise_id = 1;
  let max_nodes = -1;
  const iterator = create_async_iterator();
  const global = get_global_name(options2);
  function get_replacer(index8) {
    return function replacer(thing) {
      if (typeof thing?.then === "function") {
        const id = promise_id++;
        const promise = thing.then(
          /** @param {any} data */
          (data) => ({ data })
        ).catch(
          /** @param {any} error */
          async (error2) => ({
            error: await handle_error_and_jsonify(event, event_state, options2, error2)
          })
        ).then(
          /**
           * @param {{data: any; error: any}} result
           */
          async ({ data, error: error2 }) => {
            let str;
            try {
              str = uneval(error2 ? [, error2] : [data], replacer);
            } catch {
              error2 = await handle_error_and_jsonify(
                event,
                event_state,
                options2,
                new Error(`Failed to serialize promise while rendering ${event.route.id}`)
              );
              data = void 0;
              str = uneval([, error2], replacer);
            }
            return {
              index: index8,
              str: `${global}.resolve(${id}, ${str.includes("app.decode") ? `(app) => ${str}` : `() => ${str}`})`
            };
          }
        );
        iterator.add(promise);
        return `${global}.defer(${id})`;
      } else {
        for (const key2 in options2.hooks.transport) {
          const encoded = options2.hooks.transport[key2].encode(thing);
          if (encoded) {
            return `app.decode('${key2}', ${uneval(encoded, replacer)})`;
          }
        }
      }
    };
  }
  const strings = (
    /** @type {string[]} */
    []
  );
  return {
    set_max_nodes(i) {
      max_nodes = i;
    },
    add_node(i, node) {
      try {
        if (!node) {
          strings[i] = "null";
          return;
        }
        const payload = { type: "data", data: node.data, uses: serialize_uses(node) };
        if (node.slash) payload.slash = node.slash;
        strings[i] = uneval(payload, get_replacer(i));
      } catch (e3) {
        e3.path = e3.path.slice(1);
        throw new Error(clarify_devalue_error(
          event,
          /** @type {any} */
          e3
        ));
      }
    },
    get_data(csp) {
      const open = `<script${csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ""}>`;
      const close = `<\/script>
`;
      return {
        data: `[${compact(max_nodes > -1 ? strings.slice(0, max_nodes) : strings).join(",")}]`,
        chunks: promise_id > 1 ? iterator.iterate(({ index: index8, str }) => {
          if (max_nodes > -1 && index8 >= max_nodes) {
            return "";
          }
          return open + str + close;
        }) : null
      };
    }
  };
}
function server_data_serializer_json(event, event_state, options2) {
  let promise_id = 1;
  const iterator = create_async_iterator();
  const reducers = {
    ...Object.fromEntries(
      Object.entries(options2.hooks.transport).map(([key2, value]) => [key2, value.encode])
    ),
    /** @param {any} thing */
    Promise: (thing) => {
      if (typeof thing?.then !== "function") {
        return;
      }
      const id = promise_id++;
      let key2 = "data";
      const promise = thing.catch(
        /** @param {any} e */
        async (e3) => {
          key2 = "error";
          return handle_error_and_jsonify(
            event,
            event_state,
            options2,
            /** @type {any} */
            e3
          );
        }
      ).then(
        /** @param {any} value */
        async (value) => {
          let str;
          try {
            str = stringify(value, reducers);
          } catch {
            const error2 = await handle_error_and_jsonify(
              event,
              event_state,
              options2,
              new Error(`Failed to serialize promise while rendering ${event.route.id}`)
            );
            key2 = "error";
            str = stringify(error2, reducers);
          }
          return `{"type":"chunk","id":${id},"${key2}":${str}}
`;
        }
      );
      iterator.add(promise);
      return id;
    }
  };
  const strings = (
    /** @type {string[]} */
    []
  );
  return {
    add_node(i, node) {
      try {
        if (!node) {
          strings[i] = "null";
          return;
        }
        if (node.type === "error" || node.type === "skip") {
          strings[i] = JSON.stringify(node);
          return;
        }
        strings[i] = `{"type":"data","data":${stringify(node.data, reducers)},"uses":${JSON.stringify(
          serialize_uses(node)
        )}${node.slash ? `,"slash":${JSON.stringify(node.slash)}` : ""}}`;
      } catch (e3) {
        e3.path = "data" + e3.path;
        throw new Error(clarify_devalue_error(
          event,
          /** @type {any} */
          e3
        ));
      }
    },
    get_data() {
      return {
        data: `{"type":"data","nodes":[${strings.join(",")}]}
`,
        chunks: promise_id > 1 ? iterator.iterate() : null
      };
    }
  };
}
async function load_server_data({ event, event_state, state, node, parent }) {
  if (!node?.server) return null;
  let is_tracking = true;
  const uses = {
    dependencies: /* @__PURE__ */ new Set(),
    params: /* @__PURE__ */ new Set(),
    parent: false,
    route: false,
    url: false,
    search_params: /* @__PURE__ */ new Set()
  };
  const load = node.server.load;
  const slash = node.server.trailingSlash;
  if (!load) {
    return { type: "data", data: null, uses, slash };
  }
  const url = make_trackable(
    event.url,
    () => {
      if (is_tracking) {
        uses.url = true;
      }
    },
    (param) => {
      if (is_tracking) {
        uses.search_params.add(param);
      }
    }
  );
  if (state.prerendering) {
    disable_search(url);
  }
  const result = await record_span({
    name: "sveltekit.load",
    attributes: {
      "sveltekit.load.node_id": node.server_id || "unknown",
      "sveltekit.load.node_type": get_node_type(node.server_id),
      "http.route": event.route.id || "unknown"
    },
    fn: async (current2) => {
      const traced_event = merge_tracing(event, current2);
      const result2 = await with_request_store(
        { event: traced_event, state: event_state },
        () => load.call(null, {
          ...traced_event,
          fetch: (info, init2) => {
            new URL(info instanceof Request ? info.url : info, event.url);
            return event.fetch(info, init2);
          },
          /** @param {string[]} deps */
          depends: (...deps) => {
            for (const dep of deps) {
              const { href } = new URL(dep, event.url);
              uses.dependencies.add(href);
            }
          },
          params: new Proxy(event.params, {
            get: (target, key2) => {
              if (is_tracking) {
                uses.params.add(key2);
              }
              return target[
                /** @type {string} */
                key2
              ];
            }
          }),
          parent: async () => {
            if (is_tracking) {
              uses.parent = true;
            }
            return parent();
          },
          route: new Proxy(event.route, {
            get: (target, key2) => {
              if (is_tracking) {
                uses.route = true;
              }
              return target[
                /** @type {'id'} */
                key2
              ];
            }
          }),
          url,
          untrack(fn) {
            is_tracking = false;
            try {
              return fn();
            } finally {
              is_tracking = true;
            }
          }
        })
      );
      return result2;
    }
  });
  return {
    type: "data",
    data: result ?? null,
    uses,
    slash
  };
}
async function load_data({
  event,
  event_state,
  fetched,
  node,
  parent,
  server_data_promise,
  state,
  resolve_opts,
  csr
}) {
  const server_data_node = await server_data_promise;
  const load = node?.universal?.load;
  if (!load) {
    return server_data_node?.data ?? null;
  }
  const result = await record_span({
    name: "sveltekit.load",
    attributes: {
      "sveltekit.load.node_id": node.universal_id || "unknown",
      "sveltekit.load.node_type": get_node_type(node.universal_id),
      "http.route": event.route.id || "unknown"
    },
    fn: async (current2) => {
      const traced_event = merge_tracing(event, current2);
      return await with_request_store(
        { event: traced_event, state: event_state },
        () => load.call(null, {
          url: event.url,
          params: event.params,
          data: server_data_node?.data ?? null,
          route: event.route,
          fetch: create_universal_fetch(event, state, fetched, csr, resolve_opts),
          setHeaders: event.setHeaders,
          depends: () => {
          },
          parent,
          untrack: (fn) => fn(),
          tracing: traced_event.tracing
        })
      );
    }
  });
  return result ?? null;
}
function create_universal_fetch(event, state, fetched, csr, resolve_opts) {
  const universal_fetch = async (input, init2) => {
    const cloned_body = input instanceof Request && input.body ? input.clone().body : null;
    const cloned_headers = input instanceof Request && [...input.headers].length ? new Headers(input.headers) : init2?.headers;
    let response = await event.fetch(input, init2);
    const url = new URL(input instanceof Request ? input.url : input, event.url);
    const same_origin = url.origin === event.url.origin;
    let dependency;
    if (same_origin) {
      if (state.prerendering) {
        dependency = { response, body: null };
        state.prerendering.dependencies.set(url.pathname, dependency);
      }
    } else if (url.protocol === "https:" || url.protocol === "http:") {
      const mode = input instanceof Request ? input.mode : init2?.mode ?? "cors";
      if (mode === "no-cors") {
        response = new Response("", {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      } else {
        const acao = response.headers.get("access-control-allow-origin");
        if (!acao || acao !== event.url.origin && acao !== "*") {
          throw new Error(
            `CORS error: ${acao ? "Incorrect" : "No"} 'Access-Control-Allow-Origin' header is present on the requested resource`
          );
        }
      }
    }
    let teed_body;
    const proxy = new Proxy(response, {
      get(response2, key2, receiver) {
        async function push_fetched(body2, is_b64) {
          const status_number = Number(response2.status);
          if (isNaN(status_number)) {
            throw new Error(
              `response.status is not a number. value: "${response2.status}" type: ${typeof response2.status}`
            );
          }
          fetched.push({
            url: same_origin ? url.href.slice(event.url.origin.length) : url.href,
            method: event.request.method,
            request_body: (
              /** @type {string | ArrayBufferView | undefined} */
              input instanceof Request && cloned_body ? await stream_to_string(cloned_body) : init2?.body
            ),
            request_headers: cloned_headers,
            response_body: body2,
            response: response2,
            is_b64
          });
        }
        if (key2 === "body") {
          if (response2.body === null) {
            return null;
          }
          if (teed_body) {
            return teed_body;
          }
          const [a, b] = response2.body.tee();
          void (async () => {
            let result = new Uint8Array();
            for await (const chunk of a) {
              const combined = new Uint8Array(result.length + chunk.length);
              combined.set(result, 0);
              combined.set(chunk, result.length);
              result = combined;
            }
            if (dependency) {
              dependency.body = new Uint8Array(result);
            }
            void push_fetched(base64_encode(result), true);
          })();
          return teed_body = b;
        }
        if (key2 === "arrayBuffer") {
          return async () => {
            const buffer = await response2.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            if (dependency) {
              dependency.body = bytes;
            }
            if (buffer instanceof ArrayBuffer) {
              await push_fetched(base64_encode(bytes), true);
            }
            return buffer;
          };
        }
        async function text2() {
          const body2 = await response2.text();
          if (body2 === "" && NULL_BODY_STATUS.includes(response2.status)) {
            await push_fetched(void 0, false);
            return void 0;
          }
          if (!body2 || typeof body2 === "string") {
            await push_fetched(body2, false);
          }
          if (dependency) {
            dependency.body = body2;
          }
          return body2;
        }
        if (key2 === "text") {
          return text2;
        }
        if (key2 === "json") {
          return async () => {
            const body2 = await text2();
            return body2 ? JSON.parse(body2) : void 0;
          };
        }
        const value = Reflect.get(response2, key2, response2);
        if (value instanceof Function) {
          return Object.defineProperties(
            /**
             * @this {any}
             */
            function() {
              return Reflect.apply(value, this === receiver ? response2 : this, arguments);
            },
            {
              name: { value: value.name },
              length: { value: value.length }
            }
          );
        }
        return value;
      }
    });
    if (csr) {
      const get = response.headers.get;
      response.headers.get = (key2) => {
        const lower = key2.toLowerCase();
        const value = get.call(response.headers, lower);
        if (value && !lower.startsWith("x-sveltekit-")) {
          const included = resolve_opts.filterSerializedResponseHeaders(lower, value);
          if (!included) {
            throw new Error(
              `Failed to get response header "${lower}" \u2014 it must be included by the \`filterSerializedResponseHeaders\` option: https://svelte.dev/docs/kit/hooks#Server-hooks-handle (at ${event.route.id})`
            );
          }
        }
        return value;
      };
    }
    return proxy;
  };
  return (input, init2) => {
    const response = universal_fetch(input, init2);
    response.catch(() => {
    });
    return response;
  };
}
async function stream_to_string(stream) {
  let result = "";
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += text_decoder2.decode(value);
  }
  return result;
}
function hash(...values) {
  let hash2 = 5381;
  for (const value of values) {
    if (typeof value === "string") {
      let i = value.length;
      while (i) hash2 = hash2 * 33 ^ value.charCodeAt(--i);
    } else if (ArrayBuffer.isView(value)) {
      const buffer = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      let i = buffer.length;
      while (i) hash2 = hash2 * 33 ^ buffer[--i];
    } else {
      throw new TypeError("value must be a string or TypedArray");
    }
  }
  return (hash2 >>> 0).toString(36);
}
var replacements = {
  "<": "\\u003C",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var pattern = new RegExp(`[${Object.keys(replacements).join("")}]`, "g");
function serialize_data(fetched, filter, prerendering = false) {
  const headers2 = {};
  let cache_control = null;
  let age = null;
  let varyAny = false;
  for (const [key2, value] of fetched.response.headers) {
    if (filter(key2, value)) {
      headers2[key2] = value;
    }
    if (key2 === "cache-control") cache_control = value;
    else if (key2 === "age") age = value;
    else if (key2 === "vary" && value.trim() === "*") varyAny = true;
  }
  const payload = {
    status: fetched.response.status,
    statusText: fetched.response.statusText,
    headers: headers2,
    body: fetched.response_body
  };
  const safe_payload = JSON.stringify(payload).replace(pattern, (match) => replacements[match]);
  const attrs = [
    'type="application/json"',
    "data-sveltekit-fetched",
    `data-url="${escape_html(fetched.url, true)}"`
  ];
  if (fetched.is_b64) {
    attrs.push("data-b64");
  }
  if (fetched.request_headers || fetched.request_body) {
    const values = [];
    if (fetched.request_headers) {
      values.push([...new Headers(fetched.request_headers)].join(","));
    }
    if (fetched.request_body) {
      values.push(fetched.request_body);
    }
    attrs.push(`data-hash="${hash(...values)}"`);
  }
  if (!prerendering && fetched.method === "GET" && cache_control && !varyAny) {
    const match = /s-maxage=(\d+)/g.exec(cache_control) ?? /max-age=(\d+)/g.exec(cache_control);
    if (match) {
      const ttl = +match[1] - +(age ?? "0");
      attrs.push(`data-ttl="${ttl}"`);
    }
  }
  return `<script ${attrs.join(" ")}>${safe_payload}<\/script>`;
}
var s = JSON.stringify;
function sha256(data) {
  if (!key[0]) precompute();
  const out = init.slice(0);
  const array2 = encode(data);
  for (let i = 0; i < array2.length; i += 16) {
    const w = array2.subarray(i, i + 16);
    let tmp;
    let a;
    let b;
    let out0 = out[0];
    let out1 = out[1];
    let out2 = out[2];
    let out3 = out[3];
    let out4 = out[4];
    let out5 = out[5];
    let out6 = out[6];
    let out7 = out[7];
    for (let i2 = 0; i2 < 64; i2++) {
      if (i2 < 16) {
        tmp = w[i2];
      } else {
        a = w[i2 + 1 & 15];
        b = w[i2 + 14 & 15];
        tmp = w[i2 & 15] = (a >>> 7 ^ a >>> 18 ^ a >>> 3 ^ a << 25 ^ a << 14) + (b >>> 17 ^ b >>> 19 ^ b >>> 10 ^ b << 15 ^ b << 13) + w[i2 & 15] + w[i2 + 9 & 15] | 0;
      }
      tmp = tmp + out7 + (out4 >>> 6 ^ out4 >>> 11 ^ out4 >>> 25 ^ out4 << 26 ^ out4 << 21 ^ out4 << 7) + (out6 ^ out4 & (out5 ^ out6)) + key[i2];
      out7 = out6;
      out6 = out5;
      out5 = out4;
      out4 = out3 + tmp | 0;
      out3 = out2;
      out2 = out1;
      out1 = out0;
      out0 = tmp + (out1 & out2 ^ out3 & (out1 ^ out2)) + (out1 >>> 2 ^ out1 >>> 13 ^ out1 >>> 22 ^ out1 << 30 ^ out1 << 19 ^ out1 << 10) | 0;
    }
    out[0] = out[0] + out0 | 0;
    out[1] = out[1] + out1 | 0;
    out[2] = out[2] + out2 | 0;
    out[3] = out[3] + out3 | 0;
    out[4] = out[4] + out4 | 0;
    out[5] = out[5] + out5 | 0;
    out[6] = out[6] + out6 | 0;
    out[7] = out[7] + out7 | 0;
  }
  const bytes = new Uint8Array(out.buffer);
  reverse_endianness(bytes);
  return btoa(String.fromCharCode(...bytes));
}
var init = new Uint32Array(8);
var key = new Uint32Array(64);
function precompute() {
  function frac(x) {
    return (x - Math.floor(x)) * 4294967296;
  }
  let prime = 2;
  for (let i = 0; i < 64; prime++) {
    let is_prime = true;
    for (let factor = 2; factor * factor <= prime; factor++) {
      if (prime % factor === 0) {
        is_prime = false;
        break;
      }
    }
    if (is_prime) {
      if (i < 8) {
        init[i] = frac(prime ** (1 / 2));
      }
      key[i] = frac(prime ** (1 / 3));
      i++;
    }
  }
}
function reverse_endianness(bytes) {
  for (let i = 0; i < bytes.length; i += 4) {
    const a = bytes[i + 0];
    const b = bytes[i + 1];
    const c2 = bytes[i + 2];
    const d = bytes[i + 3];
    bytes[i + 0] = d;
    bytes[i + 1] = c2;
    bytes[i + 2] = b;
    bytes[i + 3] = a;
  }
}
function encode(str) {
  const encoded = text_encoder2.encode(str);
  const length = encoded.length * 8;
  const size = 512 * Math.ceil((length + 65) / 512);
  const bytes = new Uint8Array(size / 8);
  bytes.set(encoded);
  bytes[encoded.length] = 128;
  reverse_endianness(bytes);
  const words = new Uint32Array(bytes.buffer);
  words[words.length - 2] = Math.floor(length / 4294967296);
  words[words.length - 1] = length;
  return words;
}
var array = new Uint8Array(16);
function generate_nonce() {
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}
var quoted = /* @__PURE__ */ new Set([
  "self",
  "unsafe-eval",
  "unsafe-hashes",
  "unsafe-inline",
  "none",
  "strict-dynamic",
  "report-sample",
  "wasm-unsafe-eval",
  "script"
]);
var crypto_pattern = /^(nonce|sha\d\d\d)-/;
var BaseProvider = class {
  /** @type {boolean} */
  #use_hashes;
  /** @type {boolean} */
  #script_needs_csp;
  /** @type {boolean} */
  #script_src_needs_csp;
  /** @type {boolean} */
  #script_src_elem_needs_csp;
  /** @type {boolean} */
  #style_needs_csp;
  /** @type {boolean} */
  #style_src_needs_csp;
  /** @type {boolean} */
  #style_src_attr_needs_csp;
  /** @type {boolean} */
  #style_src_elem_needs_csp;
  /** @type {import('types').CspDirectives} */
  #directives;
  /** @type {Set<import('types').Csp.Source>} */
  #script_src;
  /** @type {Set<import('types').Csp.Source>} */
  #script_src_elem;
  /** @type {Set<import('types').Csp.Source>} */
  #style_src;
  /** @type {Set<import('types').Csp.Source>} */
  #style_src_attr;
  /** @type {Set<import('types').Csp.Source>} */
  #style_src_elem;
  /** @type {boolean} */
  script_needs_nonce;
  /** @type {boolean} */
  style_needs_nonce;
  /** @type {boolean} */
  script_needs_hash;
  /** @type {string} */
  #nonce;
  /**
   * @param {boolean} use_hashes
   * @param {import('types').CspDirectives} directives
   * @param {string} nonce
   */
  constructor(use_hashes, directives, nonce) {
    this.#use_hashes = use_hashes;
    this.#directives = directives;
    const d = this.#directives;
    this.#script_src = /* @__PURE__ */ new Set();
    this.#script_src_elem = /* @__PURE__ */ new Set();
    this.#style_src = /* @__PURE__ */ new Set();
    this.#style_src_attr = /* @__PURE__ */ new Set();
    this.#style_src_elem = /* @__PURE__ */ new Set();
    const effective_script_src = d["script-src"] || d["default-src"];
    const script_src_elem = d["script-src-elem"];
    const effective_style_src = d["style-src"] || d["default-src"];
    const style_src_attr = d["style-src-attr"];
    const style_src_elem = d["style-src-elem"];
    const style_needs_csp = (directive) => !!directive && !directive.some((value) => value === "unsafe-inline");
    const script_needs_csp = (directive) => !!directive && (!directive.some((value) => value === "unsafe-inline") || directive.some((value) => value === "strict-dynamic"));
    this.#script_src_needs_csp = script_needs_csp(effective_script_src);
    this.#script_src_elem_needs_csp = script_needs_csp(script_src_elem);
    this.#style_src_needs_csp = style_needs_csp(effective_style_src);
    this.#style_src_attr_needs_csp = style_needs_csp(style_src_attr);
    this.#style_src_elem_needs_csp = style_needs_csp(style_src_elem);
    this.#script_needs_csp = this.#script_src_needs_csp || this.#script_src_elem_needs_csp;
    this.#style_needs_csp = this.#style_src_needs_csp || this.#style_src_attr_needs_csp || this.#style_src_elem_needs_csp;
    this.script_needs_nonce = this.#script_needs_csp && !this.#use_hashes;
    this.style_needs_nonce = this.#style_needs_csp && !this.#use_hashes;
    this.script_needs_hash = this.#script_needs_csp && this.#use_hashes;
    this.#nonce = nonce;
  }
  /** @param {string} content */
  add_script(content) {
    if (!this.#script_needs_csp) return;
    const source = this.#use_hashes ? `sha256-${sha256(content)}` : `nonce-${this.#nonce}`;
    if (this.#script_src_needs_csp) {
      this.#script_src.add(source);
    }
    if (this.#script_src_elem_needs_csp) {
      this.#script_src_elem.add(source);
    }
  }
  /** @param {`sha256-${string}`[]} hashes */
  add_script_hashes(hashes) {
    for (const hash2 of hashes) {
      if (this.#script_src_needs_csp) {
        this.#script_src.add(hash2);
      }
      if (this.#script_src_elem_needs_csp) {
        this.#script_src_elem.add(hash2);
      }
    }
  }
  /** @param {string} content */
  add_style(content) {
    if (!this.#style_needs_csp) return;
    const source = this.#use_hashes ? `sha256-${sha256(content)}` : `nonce-${this.#nonce}`;
    if (this.#style_src_needs_csp) {
      this.#style_src.add(source);
    }
    if (this.#style_src_attr_needs_csp) {
      this.#style_src_attr.add(source);
    }
    if (this.#style_src_elem_needs_csp) {
      const sha256_empty_comment_hash = "sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=";
      const d = this.#directives;
      if (d["style-src-elem"] && !d["style-src-elem"].includes(sha256_empty_comment_hash) && !this.#style_src_elem.has(sha256_empty_comment_hash)) {
        this.#style_src_elem.add(sha256_empty_comment_hash);
      }
      if (source !== sha256_empty_comment_hash) {
        this.#style_src_elem.add(source);
      }
    }
  }
  /**
   * @param {boolean} [is_meta]
   */
  get_header(is_meta = false) {
    const header = [];
    const directives = { ...this.#directives };
    if (this.#style_src.size > 0) {
      directives["style-src"] = [
        ...directives["style-src"] || directives["default-src"] || [],
        ...this.#style_src
      ];
    }
    if (this.#style_src_attr.size > 0) {
      directives["style-src-attr"] = [
        ...directives["style-src-attr"] || [],
        ...this.#style_src_attr
      ];
    }
    if (this.#style_src_elem.size > 0) {
      directives["style-src-elem"] = [
        ...directives["style-src-elem"] || [],
        ...this.#style_src_elem
      ];
    }
    if (this.#script_src.size > 0) {
      directives["script-src"] = [
        ...directives["script-src"] || directives["default-src"] || [],
        ...this.#script_src
      ];
    }
    if (this.#script_src_elem.size > 0) {
      directives["script-src-elem"] = [
        ...directives["script-src-elem"] || [],
        ...this.#script_src_elem
      ];
    }
    for (const key2 in directives) {
      if (is_meta && (key2 === "frame-ancestors" || key2 === "report-uri" || key2 === "sandbox")) {
        continue;
      }
      const value = (
        /** @type {string[] | true} */
        directives[key2]
      );
      if (!value) continue;
      const directive = [key2];
      if (Array.isArray(value)) {
        value.forEach((value2) => {
          if (quoted.has(value2) || crypto_pattern.test(value2)) {
            directive.push(`'${value2}'`);
          } else {
            directive.push(value2);
          }
        });
      }
      header.push(directive.join(" "));
    }
    return header.join("; ");
  }
};
var CspProvider = class extends BaseProvider {
  get_meta() {
    const content = this.get_header(true);
    if (!content) {
      return;
    }
    return `<meta http-equiv="content-security-policy" content="${escape_html(content, true)}">`;
  }
};
var CspReportOnlyProvider = class extends BaseProvider {
  /**
   * @param {boolean} use_hashes
   * @param {import('types').CspDirectives} directives
   * @param {string} nonce
   */
  constructor(use_hashes, directives, nonce) {
    super(use_hashes, directives, nonce);
    if (Object.values(directives).filter((v) => !!v).length > 0) {
      const has_report_to = directives["report-to"]?.length ?? 0 > 0;
      const has_report_uri = directives["report-uri"]?.length ?? 0 > 0;
      if (!has_report_to && !has_report_uri) {
        throw Error(
          "`content-security-policy-report-only` must be specified with either the `report-to` or `report-uri` directives, or both"
        );
      }
    }
  }
};
var Csp = class {
  /** @readonly */
  nonce = generate_nonce();
  /** @type {CspProvider} */
  csp_provider;
  /** @type {CspReportOnlyProvider} */
  report_only_provider;
  /**
   * @param {import('./types.js').CspConfig} config
   * @param {import('./types.js').CspOpts} opts
   */
  constructor({ mode, directives, reportOnly }, { prerender }) {
    const use_hashes = mode === "hash" || mode === "auto" && prerender;
    this.csp_provider = new CspProvider(use_hashes, directives, this.nonce);
    this.report_only_provider = new CspReportOnlyProvider(use_hashes, reportOnly, this.nonce);
  }
  get script_needs_hash() {
    return this.csp_provider.script_needs_hash || this.report_only_provider.script_needs_hash;
  }
  get script_needs_nonce() {
    return this.csp_provider.script_needs_nonce || this.report_only_provider.script_needs_nonce;
  }
  get style_needs_nonce() {
    return this.csp_provider.style_needs_nonce || this.report_only_provider.style_needs_nonce;
  }
  /** @param {string} content */
  add_script(content) {
    this.csp_provider.add_script(content);
    this.report_only_provider.add_script(content);
  }
  /** @param {`sha256-${string}`[]} hashes */
  add_script_hashes(hashes) {
    this.csp_provider.add_script_hashes(hashes);
    this.report_only_provider.add_script_hashes(hashes);
  }
  /** @param {string} content */
  add_style(content) {
    this.csp_provider.add_style(content);
    this.report_only_provider.add_style(content);
  }
};
function exec(match, params, matchers) {
  const result = {};
  const values = match.slice(1);
  const values_needing_match = values.filter((value) => value !== void 0);
  let buffered = 0;
  for (let i = 0; i < params.length; i += 1) {
    const param = params[i];
    let value = values[i - buffered];
    if (param.chained && param.rest && buffered) {
      value = values.slice(i - buffered, i + 1).filter((s22) => s22).join("/");
      buffered = 0;
    }
    if (value === void 0) {
      if (param.rest) {
        value = "";
      } else {
        continue;
      }
    }
    if (!param.matcher || matchers[param.matcher](value)) {
      result[param.name] = value;
      const next_param = params[i + 1];
      const next_value = values[i + 1];
      if (next_param && !next_param.rest && next_param.optional && next_value && param.chained) {
        buffered = 0;
      }
      if (!next_param && !next_value && Object.keys(result).length === values_needing_match.length) {
        buffered = 0;
      }
      continue;
    }
    if (param.optional && param.chained) {
      buffered++;
      continue;
    }
    return;
  }
  if (buffered) return;
  return result;
}
function find_route(path, routes, matchers) {
  for (const route of routes) {
    const match = route.pattern.exec(path);
    if (!match) continue;
    const matched = exec(match, route.params, matchers);
    if (matched) {
      return {
        route,
        params: decode_params(matched)
      };
    }
  }
  return null;
}
function generate_route_object(route, url, manifest2) {
  const { errors, layouts, leaf } = route;
  const nodes = [...errors, ...layouts.map((l) => l?.[1]), leaf[1]].filter((n2) => typeof n2 === "number").map((n2) => `'${n2}': () => ${create_client_import(manifest2._.client.nodes?.[n2], url)}`).join(",\n		");
  return [
    `{
	id: ${s(route.id)}`,
    `errors: ${s(route.errors)}`,
    `layouts: ${s(route.layouts)}`,
    `leaf: ${s(route.leaf)}`,
    `nodes: {
		${nodes}
	}
}`
  ].join(",\n	");
}
function create_client_import(import_path, url) {
  if (!import_path) return "Promise.resolve({})";
  if (import_path[0] === "/") {
    return `import('${import_path}')`;
  }
  if (assets !== "") {
    return `import('${assets}/${import_path}')`;
  }
  let path = get_relative_path(url.pathname, `${base}/${import_path}`);
  if (path[0] !== ".") path = `./${path}`;
  return `import('${path}')`;
}
async function resolve_route(resolved_path, url, manifest2) {
  if (!manifest2._.client.routes) {
    return text("Server-side route resolution disabled", { status: 400 });
  }
  const matchers = await manifest2._.matchers();
  const result = find_route(resolved_path, manifest2._.client.routes, matchers);
  return create_server_routing_response(result?.route ?? null, result?.params ?? {}, url, manifest2).response;
}
function create_server_routing_response(route, params, url, manifest2) {
  const headers2 = new Headers({
    "content-type": "application/javascript; charset=utf-8"
  });
  if (route) {
    const csr_route = generate_route_object(route, url, manifest2);
    const body2 = `${create_css_import(route, url, manifest2)}
export const route = ${csr_route}; export const params = ${JSON.stringify(params)};`;
    return { response: text(body2, { headers: headers2 }), body: body2 };
  } else {
    return { response: text("", { headers: headers2 }), body: "" };
  }
}
function create_css_import(route, url, manifest2) {
  const { errors, layouts, leaf } = route;
  let css8 = "";
  for (const node of [...errors, ...layouts.map((l) => l?.[1]), leaf[1]]) {
    if (typeof node !== "number") continue;
    const node_css = manifest2._.client.css?.[node];
    for (const css_path of node_css ?? []) {
      css8 += `'${assets || base}/${css_path}',`;
    }
  }
  if (!css8) return "";
  return `${create_client_import(
    /** @type {string} */
    manifest2._.client.start,
    url
  )}.then(x => x.load_css([${css8}]));`;
}
var updated = {
  ...readable(false),
  check: () => false
};
async function render_response({
  branch,
  fetched,
  options: options2,
  manifest: manifest2,
  state,
  page_config,
  status,
  error: error2 = null,
  event,
  event_state,
  resolve_opts,
  action_result,
  data_serializer
}) {
  if (state.prerendering) {
    if (options2.csp.mode === "nonce") {
      throw new Error('Cannot use prerendering if config.kit.csp.mode === "nonce"');
    }
    if (options2.app_template_contains_nonce) {
      throw new Error("Cannot use prerendering if page template contains %sveltekit.nonce%");
    }
  }
  const { client } = manifest2._;
  const modulepreloads = new Set(client.imports);
  const stylesheets8 = new Set(client.stylesheets);
  const fonts8 = new Set(client.fonts);
  const link_headers = /* @__PURE__ */ new Set();
  const inline_styles = /* @__PURE__ */ new Map();
  let rendered;
  const form_value = action_result?.type === "success" || action_result?.type === "failure" ? action_result.data ?? null : null;
  let base$1 = base;
  let assets$1 = assets;
  let base_expression = s(base);
  const csp = new Csp(options2.csp, {
    prerender: !!state.prerendering
  });
  {
    if (!state.prerendering?.fallback) {
      const segments = event.url.pathname.slice(base.length).split("/").slice(2);
      base$1 = segments.map(() => "..").join("/") || ".";
      base_expression = `new URL(${s(base$1)}, location).pathname.slice(0, -1)`;
      if (!assets || assets[0] === "/" && assets !== SVELTE_KIT_ASSETS) {
        assets$1 = base$1;
      }
    } else if (options2.hash_routing) {
      base_expression = "new URL('.', location).pathname.slice(0, -1)";
    }
  }
  if (page_config.ssr) {
    const props = {
      stores: {
        page: writable(null),
        navigating: writable(null),
        updated
      },
      constructors: await Promise.all(
        branch.map(({ node }) => {
          if (!node.component) {
            throw new Error(`Missing +page.svelte component for route ${event.route.id}`);
          }
          return node.component();
        })
      ),
      form: form_value
    };
    let data2 = {};
    for (let i = 0; i < branch.length; i += 1) {
      data2 = { ...data2, ...branch[i].data };
      props[`data_${i}`] = data2;
    }
    props.page = {
      error: error2,
      params: (
        /** @type {Record<string, any>} */
        event.params
      ),
      route: event.route,
      status,
      url: event.url,
      data: data2,
      form: form_value,
      state: {}
    };
    const render_opts = {
      context: /* @__PURE__ */ new Map([
        [
          "__request__",
          {
            page: props.page
          }
        ]
      ]),
      csp: csp.script_needs_nonce ? { nonce: csp.nonce } : { hash: csp.script_needs_hash }
    };
    const fetch2 = globalThis.fetch;
    try {
      if (BROWSER) ;
      rendered = await with_request_store({ event, state: event_state }, async () => {
        if (relative) override({ base: base$1, assets: assets$1 });
        const maybe_promise = options2.root.render(props, render_opts);
        const rendered2 = options2.async && "then" in maybe_promise ? (
          /** @type {ReturnType<typeof options.root.render> & Promise<any>} */
          maybe_promise.then((r3) => r3)
        ) : maybe_promise;
        if (options2.async) {
          reset();
        }
        const { head: head2, html: html2, css: css8, hashes } = (
          /** @type {ReturnType<typeof options.root.render>} */
          options2.async ? await rendered2 : rendered2
        );
        if (hashes) {
          csp.add_script_hashes(hashes.script);
        }
        return { head: head2, html: html2, css: css8, hashes };
      });
    } finally {
      reset();
    }
    for (const { node } of branch) {
      for (const url of node.imports) modulepreloads.add(url);
      for (const url of node.stylesheets) stylesheets8.add(url);
      for (const url of node.fonts) fonts8.add(url);
      if (node.inline_styles && !client.inline) {
        Object.entries(await node.inline_styles()).forEach(([filename, css8]) => {
          if (typeof css8 === "string") {
            inline_styles.set(filename, css8);
            return;
          }
          inline_styles.set(filename, css8(`${assets$1}/${app_dir}/immutable/assets`, assets$1));
        });
      }
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null }, hashes: { script: [] } };
  }
  const head = new Head(rendered.head, !!state.prerendering);
  let body2 = rendered.html;
  const prefixed = (path) => {
    if (path.startsWith("/")) {
      return base + path;
    }
    return `${assets$1}/${path}`;
  };
  const style = client.inline ? client.inline?.style : Array.from(inline_styles.values()).join("\n");
  if (style) {
    const attributes = [];
    if (csp.style_needs_nonce) attributes.push(`nonce="${csp.nonce}"`);
    csp.add_style(style);
    head.add_style(style, attributes);
  }
  for (const dep of stylesheets8) {
    const path = prefixed(dep);
    const attributes = ['rel="stylesheet"'];
    if (inline_styles.has(dep)) {
      attributes.push("disabled", 'media="(max-width: 0)"');
    } else {
      if (resolve_opts.preload({ type: "css", path })) {
        link_headers.add(`<${encodeURI(path)}>; rel="preload"; as="style"; nopush`);
      }
    }
    head.add_stylesheet(path, attributes);
  }
  for (const dep of fonts8) {
    const path = prefixed(dep);
    if (resolve_opts.preload({ type: "font", path })) {
      const ext = dep.slice(dep.lastIndexOf(".") + 1);
      head.add_link_tag(path, ['rel="preload"', 'as="font"', `type="font/${ext}"`, "crossorigin"]);
      link_headers.add(
        `<${encodeURI(path)}>; rel="preload"; as="font"; type="font/${ext}"; crossorigin; nopush`
      );
    }
  }
  const global = get_global_name(options2);
  const { data, chunks } = data_serializer.get_data(csp);
  if (page_config.ssr && page_config.csr) {
    body2 += `
			${fetched.map(
      (item) => serialize_data(item, resolve_opts.filterSerializedResponseHeaders, !!state.prerendering)
    ).join("\n			")}`;
  }
  if (page_config.csr) {
    const route = manifest2._.client.routes?.find((r3) => r3.id === event.route.id) ?? null;
    if (client.uses_env_dynamic_public && state.prerendering) {
      modulepreloads.add(`${app_dir}/env.js`);
    }
    if (!client.inline) {
      const included_modulepreloads = Array.from(modulepreloads, (dep) => prefixed(dep)).filter(
        (path) => resolve_opts.preload({ type: "js", path })
      );
      for (const path of included_modulepreloads) {
        link_headers.add(`<${encodeURI(path)}>; rel="modulepreload"; nopush`);
        if (options2.preload_strategy !== "modulepreload") {
          head.add_script_preload(path);
        } else {
          head.add_link_tag(path, ['rel="modulepreload"']);
        }
      }
    }
    if (manifest2._.client.routes && state.prerendering && !state.prerendering.fallback) {
      const pathname = add_resolution_suffix2(event.url.pathname);
      state.prerendering.dependencies.set(
        pathname,
        create_server_routing_response(route, event.params, new URL(pathname, event.url), manifest2)
      );
    }
    const blocks = [];
    const load_env_eagerly = client.uses_env_dynamic_public && state.prerendering;
    const properties = [`base: ${base_expression}`];
    if (assets) {
      properties.push(`assets: ${s(assets)}`);
    }
    if (client.uses_env_dynamic_public) {
      properties.push(`env: ${load_env_eagerly ? "null" : s(public_env)}`);
    }
    if (chunks) {
      blocks.push("const deferred = new Map();");
      properties.push(`defer: (id) => new Promise((fulfil, reject) => {
							deferred.set(id, { fulfil, reject });
						})`);
      let app_declaration = "";
      if (Object.keys(options2.hooks.transport).length > 0) {
        if (client.inline) {
          app_declaration = `const app = __sveltekit_${options2.version_hash}.app.app;`;
        } else if (client.app) {
          app_declaration = `const app = await import(${s(prefixed(client.app))});`;
        } else {
          app_declaration = `const { app } = await import(${s(prefixed(client.start))});`;
        }
      }
      const prelude = app_declaration ? `${app_declaration}
							const [data, error] = fn(app);` : `const [data, error] = fn();`;
      properties.push(`resolve: async (id, fn) => {
							${prelude}

							const try_to_resolve = () => {
								if (!deferred.has(id)) {
									setTimeout(try_to_resolve, 0);
									return;
								}
								const { fulfil, reject } = deferred.get(id);
								deferred.delete(id);
								if (error) reject(error);
								else fulfil(data);
							}
							try_to_resolve();
						}`);
    }
    blocks.push(`${global} = {
						${properties.join(",\n						")}
					};`);
    const args = ["element"];
    blocks.push("const element = document.currentScript.parentElement;");
    if (page_config.ssr) {
      const serialized = { form: "null", error: "null" };
      if (form_value) {
        serialized.form = uneval_action_response(
          form_value,
          /** @type {string} */
          event.route.id,
          options2.hooks.transport
        );
      }
      if (error2) {
        serialized.error = uneval(error2);
      }
      const hydrate = [
        `node_ids: [${branch.map(({ node }) => node.index).join(", ")}]`,
        `data: ${data}`,
        `form: ${serialized.form}`,
        `error: ${serialized.error}`
      ];
      if (status !== 200) {
        hydrate.push(`status: ${status}`);
      }
      if (manifest2._.client.routes) {
        if (route) {
          const stringified = generate_route_object(route, event.url, manifest2).replaceAll(
            "\n",
            "\n							"
          );
          hydrate.push(`params: ${uneval(event.params)}`, `server_route: ${stringified}`);
        }
      } else if (options2.embedded) {
        hydrate.push(`params: ${uneval(event.params)}`, `route: ${s(event.route)}`);
      }
      const indent = "	".repeat(load_env_eagerly ? 7 : 6);
      args.push(`{
${indent}	${hydrate.join(`,
${indent}	`)}
${indent}}`);
    }
    const { remote_data: remote_cache } = event_state;
    let serialized_remote_data = "";
    if (remote_cache) {
      const remote = {};
      for (const [info, cache] of remote_cache) {
        if (!info.id) continue;
        for (const key2 in cache) {
          remote[create_remote_key(info.id, key2)] = await cache[key2];
        }
      }
      const replacer = (thing) => {
        for (const key2 in options2.hooks.transport) {
          const encoded = options2.hooks.transport[key2].encode(thing);
          if (encoded) {
            return `app.decode('${key2}', ${uneval(encoded, replacer)})`;
          }
        }
      };
      serialized_remote_data = `${global}.data = ${uneval(remote, replacer)};

						`;
    }
    const boot = client.inline ? `${client.inline.script}

					${serialized_remote_data}${global}.app.start(${args.join(", ")});` : client.app ? `Promise.all([
						import(${s(prefixed(client.start))}),
						import(${s(prefixed(client.app))})
					]).then(([kit, app]) => {
						${serialized_remote_data}kit.start(app, ${args.join(", ")});
					});` : `import(${s(prefixed(client.start))}).then((app) => {
						${serialized_remote_data}app.start(${args.join(", ")})
					});`;
    if (load_env_eagerly) {
      blocks.push(`import(${s(`${base$1}/${app_dir}/env.js`)}).then(({ env }) => {
						${global}.env = env;

						${boot.replace(/\n/g, "\n	")}
					});`);
    } else {
      blocks.push(boot);
    }
    if (options2.service_worker) {
      let opts = "";
      if (options2.service_worker_options != null) {
        const service_worker_options = { ...options2.service_worker_options };
        opts = `, ${s(service_worker_options)}`;
      }
      blocks.push(`if ('serviceWorker' in navigator) {
						addEventListener('load', function () {
							navigator.serviceWorker.register('${prefixed("service-worker.js")}'${opts});
						});
					}`);
    }
    const init_app = `
				{
					${blocks.join("\n\n					")}
				}
			`;
    csp.add_script(init_app);
    body2 += `
			<script${csp.script_needs_nonce ? ` nonce="${csp.nonce}"` : ""}>${init_app}<\/script>
		`;
  }
  const headers2 = new Headers({
    "x-sveltekit-page": "true",
    "content-type": "text/html"
  });
  if (state.prerendering) {
    const csp_headers = csp.csp_provider.get_meta();
    if (csp_headers) {
      head.add_http_equiv(csp_headers);
    }
    if (state.prerendering.cache) {
      head.add_http_equiv(
        `<meta http-equiv="cache-control" content="${state.prerendering.cache}">`
      );
    }
  } else {
    const csp_header = csp.csp_provider.get_header();
    if (csp_header) {
      headers2.set("content-security-policy", csp_header);
    }
    const report_only_header = csp.report_only_provider.get_header();
    if (report_only_header) {
      headers2.set("content-security-policy-report-only", report_only_header);
    }
    if (link_headers.size) {
      headers2.set("link", Array.from(link_headers).join(", "));
    }
  }
  const html = options2.templates.app({
    head: head.build(),
    body: body2,
    assets: assets$1,
    nonce: (
      /** @type {string} */
      csp.nonce
    ),
    env: public_env
  });
  const transformed = await resolve_opts.transformPageChunk({
    html,
    done: true
  }) || "";
  if (!chunks) {
    headers2.set("etag", `"${hash(transformed)}"`);
  }
  return !chunks ? text(transformed, {
    status,
    headers: headers2
  }) : new Response(
    new ReadableStream({
      async start(controller) {
        controller.enqueue(text_encoder2.encode(transformed + "\n"));
        for await (const chunk of chunks) {
          if (chunk.length) controller.enqueue(text_encoder2.encode(chunk));
        }
        controller.close();
      },
      type: "bytes"
    }),
    {
      headers: headers2
    }
  );
}
var Head = class {
  #rendered;
  #prerendering;
  /** @type {string[]} */
  #http_equiv = [];
  /** @type {string[]} */
  #link_tags = [];
  /** @type {string[]} */
  #script_preloads = [];
  /** @type {string[]} */
  #style_tags = [];
  /** @type {string[]} */
  #stylesheet_links = [];
  /**
   * @param {string} rendered
   * @param {boolean} prerendering
   */
  constructor(rendered, prerendering) {
    this.#rendered = rendered;
    this.#prerendering = prerendering;
  }
  build() {
    return [
      ...this.#http_equiv,
      ...this.#link_tags,
      ...this.#script_preloads,
      this.#rendered,
      ...this.#style_tags,
      ...this.#stylesheet_links
    ].join("\n		");
  }
  /**
   * @param {string} style
   * @param {string[]} attributes
   */
  add_style(style, attributes) {
    this.#style_tags.push(
      `<style${attributes.length ? " " + attributes.join(" ") : ""}>${style}</style>`
    );
  }
  /**
   * @param {string} href
   * @param {string[]} attributes
   */
  add_stylesheet(href, attributes) {
    this.#stylesheet_links.push(`<link href="${href}" ${attributes.join(" ")}>`);
  }
  /** @param {string} href */
  add_script_preload(href) {
    this.#script_preloads.push(
      `<link rel="preload" as="script" crossorigin="anonymous" href="${href}">`
    );
  }
  /**
   * @param {string} href
   * @param {string[]} attributes
   */
  add_link_tag(href, attributes) {
    if (!this.#prerendering) return;
    this.#link_tags.push(`<link href="${href}" ${attributes.join(" ")}>`);
  }
  /** @param {string} tag */
  add_http_equiv(tag) {
    if (!this.#prerendering) return;
    this.#http_equiv.push(tag);
  }
};
var PageNodes = class {
  data;
  /**
   * @param {Array<import('types').SSRNode | undefined>} nodes
   */
  constructor(nodes) {
    this.data = nodes;
  }
  layouts() {
    return this.data.slice(0, -1);
  }
  page() {
    return this.data.at(-1);
  }
  validate() {
    for (const layout of this.layouts()) {
      if (layout) {
        validate_layout_server_exports(
          layout.server,
          /** @type {string} */
          layout.server_id
        );
        validate_layout_exports(
          layout.universal,
          /** @type {string} */
          layout.universal_id
        );
      }
    }
    const page2 = this.page();
    if (page2) {
      validate_page_server_exports(
        page2.server,
        /** @type {string} */
        page2.server_id
      );
      validate_page_exports(
        page2.universal,
        /** @type {string} */
        page2.universal_id
      );
    }
  }
  /**
   * @template {'prerender' | 'ssr' | 'csr' | 'trailingSlash'} Option
   * @param {Option} option
   * @returns {Value | undefined}
   */
  #get_option(option) {
    return this.data.reduce(
      (value, node) => {
        return node?.universal?.[option] ?? node?.server?.[option] ?? value;
      },
      /** @type {Value | undefined} */
      void 0
    );
  }
  csr() {
    return this.#get_option("csr") ?? true;
  }
  ssr() {
    return this.#get_option("ssr") ?? true;
  }
  prerender() {
    return this.#get_option("prerender") ?? false;
  }
  trailing_slash() {
    return this.#get_option("trailingSlash") ?? "never";
  }
  get_config() {
    let current2 = {};
    for (const node of this.data) {
      if (!node?.universal?.config && !node?.server?.config) continue;
      current2 = {
        ...current2,
        // TODO: should we override the server config value with the universal value similar to other page options?
        ...node?.universal?.config,
        ...node?.server?.config
      };
    }
    return Object.keys(current2).length ? current2 : void 0;
  }
  should_prerender_data() {
    return this.data.some(
      // prerender in case of trailingSlash because the client retrieves that value from the server
      (node) => node?.server?.load || node?.server?.trailingSlash !== void 0
    );
  }
};
async function respond_with_error({
  event,
  event_state,
  options: options2,
  manifest: manifest2,
  state,
  status,
  error: error2,
  resolve_opts
}) {
  if (event.request.headers.get("x-sveltekit-error")) {
    return static_error_page(
      options2,
      status,
      /** @type {Error} */
      error2.message
    );
  }
  const fetched = [];
  try {
    const branch = [];
    const default_layout = await manifest2._.nodes[0]();
    const nodes = new PageNodes([default_layout]);
    const ssr = nodes.ssr();
    const csr = nodes.csr();
    const data_serializer = server_data_serializer(event, event_state, options2);
    if (ssr) {
      state.error = true;
      const server_data_promise = load_server_data({
        event,
        event_state,
        state,
        node: default_layout,
        // eslint-disable-next-line @typescript-eslint/require-await
        parent: async () => ({})
      });
      const server_data = await server_data_promise;
      data_serializer.add_node(0, server_data);
      const data = await load_data({
        event,
        event_state,
        fetched,
        node: default_layout,
        // eslint-disable-next-line @typescript-eslint/require-await
        parent: async () => ({}),
        resolve_opts,
        server_data_promise,
        state,
        csr
      });
      branch.push(
        {
          node: default_layout,
          server_data,
          data
        },
        {
          node: await manifest2._.nodes[1](),
          // 1 is always the root error
          data: null,
          server_data: null
        }
      );
    }
    return await render_response({
      options: options2,
      manifest: manifest2,
      state,
      page_config: {
        ssr,
        csr
      },
      status,
      error: await handle_error_and_jsonify(event, event_state, options2, error2),
      branch,
      fetched,
      event,
      event_state,
      resolve_opts,
      data_serializer
    });
  } catch (e3) {
    if (e3 instanceof Redirect) {
      return redirect_response(e3.status, e3.location);
    }
    return static_error_page(
      options2,
      get_status(e3),
      (await handle_error_and_jsonify(event, event_state, options2, e3)).message
    );
  }
}
async function handle_remote_call(event, state, options2, manifest2, id) {
  return record_span({
    name: "sveltekit.remote.call",
    attributes: {},
    fn: (current2) => {
      const traced_event = merge_tracing(event, current2);
      return with_request_store(
        { event: traced_event, state },
        () => handle_remote_call_internal(traced_event, state, options2, manifest2, id)
      );
    }
  });
}
async function handle_remote_call_internal(event, state, options2, manifest2, id) {
  const [hash2, name, additional_args] = id.split("/");
  const remotes = manifest2._.remotes;
  if (!remotes[hash2]) error(404);
  const module = await remotes[hash2]();
  const fn = module.default[name];
  if (!fn) error(404);
  const info = fn.__;
  const transport = options2.hooks.transport;
  event.tracing.current.setAttributes({
    "sveltekit.remote.call.type": info.type,
    "sveltekit.remote.call.name": info.name
  });
  let form_client_refreshes;
  try {
    if (info.type === "query_batch") {
      if (event.request.method !== "POST") {
        throw new SvelteKitError(
          405,
          "Method Not Allowed",
          `\`query.batch\` functions must be invoked via POST request, not ${event.request.method}`
        );
      }
      const { payloads } = await event.request.json();
      const args = await Promise.all(
        payloads.map((payload2) => parse_remote_arg(payload2, transport))
      );
      const results = await with_request_store({ event, state }, () => info.run(args, options2));
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "result",
          result: stringify2(results, transport)
        }
      );
    }
    if (info.type === "form") {
      if (event.request.method !== "POST") {
        throw new SvelteKitError(
          405,
          "Method Not Allowed",
          `\`form\` functions must be invoked via POST request, not ${event.request.method}`
        );
      }
      if (!is_form_content_type(event.request)) {
        throw new SvelteKitError(
          415,
          "Unsupported Media Type",
          `\`form\` functions expect form-encoded data \u2014 received ${event.request.headers.get(
            "content-type"
          )}`
        );
      }
      const { data: data2, meta, form_data } = await deserialize_binary_form(event.request);
      if (additional_args && !("id" in data2)) {
        data2.id = JSON.parse(decodeURIComponent(additional_args));
      }
      const fn2 = info.fn;
      const result = await with_request_store({ event, state }, () => fn2(data2, meta, form_data));
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "result",
          result: stringify2(result, transport),
          refreshes: result.issues ? void 0 : await serialize_refreshes(meta.remote_refreshes)
        }
      );
    }
    if (info.type === "command") {
      const { payload: payload2, refreshes } = await event.request.json();
      const arg = parse_remote_arg(payload2, transport);
      const data2 = await with_request_store({ event, state }, () => fn(arg));
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "result",
          result: stringify2(data2, transport),
          refreshes: await serialize_refreshes(refreshes)
        }
      );
    }
    const payload = info.type === "prerender" ? additional_args : (
      /** @type {string} */
      // new URL(...) necessary because we're hiding the URL from the user in the event object
      new URL(event.request.url).searchParams.get("payload")
    );
    const data = await with_request_store(
      { event, state },
      () => fn(parse_remote_arg(payload, transport))
    );
    return json(
      /** @type {RemoteFunctionResponse} */
      {
        type: "result",
        result: stringify2(data, transport)
      }
    );
  } catch (error2) {
    if (error2 instanceof Redirect) {
      return json(
        /** @type {RemoteFunctionResponse} */
        {
          type: "redirect",
          location: error2.location,
          refreshes: await serialize_refreshes(form_client_refreshes)
        }
      );
    }
    const status = error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : 500;
    return json(
      /** @type {RemoteFunctionResponse} */
      {
        type: "error",
        error: await handle_error_and_jsonify(event, state, options2, error2),
        status
      },
      {
        // By setting a non-200 during prerendering we fail the prerender process (unless handleHttpError handles it).
        // Errors at runtime will be passed to the client and are handled there
        status: state.prerendering ? status : void 0,
        headers: {
          "cache-control": "private, no-store"
        }
      }
    );
  }
  async function serialize_refreshes(client_refreshes) {
    const refreshes = state.refreshes ?? {};
    if (client_refreshes) {
      for (const key2 of client_refreshes) {
        if (refreshes[key2] !== void 0) continue;
        const [hash3, name2, payload] = key2.split("/");
        const loader = manifest2._.remotes[hash3];
        const fn2 = (await loader?.())?.default?.[name2];
        if (!fn2) error(400, "Bad Request");
        refreshes[key2] = with_request_store(
          { event, state },
          () => fn2(parse_remote_arg(payload, transport))
        );
      }
    }
    if (Object.keys(refreshes).length === 0) {
      return void 0;
    }
    return stringify2(
      Object.fromEntries(
        await Promise.all(
          Object.entries(refreshes).map(async ([key2, promise]) => [key2, await promise])
        )
      ),
      transport
    );
  }
}
async function handle_remote_form_post(event, state, manifest2, id) {
  return record_span({
    name: "sveltekit.remote.form.post",
    attributes: {},
    fn: (current2) => {
      const traced_event = merge_tracing(event, current2);
      return with_request_store(
        { event: traced_event, state },
        () => handle_remote_form_post_internal(traced_event, state, manifest2, id)
      );
    }
  });
}
async function handle_remote_form_post_internal(event, state, manifest2, id) {
  const [hash2, name, action_id] = id.split("/");
  const remotes = manifest2._.remotes;
  const module = await remotes[hash2]?.();
  let form = (
    /** @type {RemoteForm<any, any>} */
    module?.default[name]
  );
  if (!form) {
    event.setHeaders({
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
      // "The server must generate an Allow header field in a 405 status code response"
      allow: "GET"
    });
    return {
      type: "error",
      error: new SvelteKitError(
        405,
        "Method Not Allowed",
        `POST method not allowed. No form actions exist for ${"this page"}`
      )
    };
  }
  if (action_id) {
    form = with_request_store({ event, state }, () => form.for(JSON.parse(action_id)));
  }
  try {
    const fn = (
      /** @type {RemoteInfo & { type: 'form' }} */
      /** @type {any} */
      form.__.fn
    );
    const { data, meta, form_data } = await deserialize_binary_form(event.request);
    if (action_id && !("id" in data)) {
      data.id = JSON.parse(decodeURIComponent(action_id));
    }
    await with_request_store({ event, state }, () => fn(data, meta, form_data));
    return {
      type: "success",
      status: 200
    };
  } catch (e3) {
    const err = normalize_error(e3);
    if (err instanceof Redirect) {
      return {
        type: "redirect",
        status: err.status,
        location: err.location
      };
    }
    return {
      type: "error",
      error: check_incorrect_fail_use(err)
    };
  }
}
function get_remote_id(url) {
  return url.pathname.startsWith(`${base}/${app_dir}/remote/`) && url.pathname.replace(`${base}/${app_dir}/remote/`, "");
}
function get_remote_action(url) {
  return url.searchParams.get("/remote");
}
var MAX_DEPTH = 10;
async function render_page(event, event_state, page2, options2, manifest2, state, nodes, resolve_opts) {
  if (state.depth > MAX_DEPTH) {
    return text(`Not found: ${event.url.pathname}`, {
      status: 404
      // TODO in some cases this should be 500. not sure how to differentiate
    });
  }
  if (is_action_json_request(event)) {
    const node = await manifest2._.nodes[page2.leaf]();
    return handle_action_json_request(event, event_state, options2, node?.server);
  }
  try {
    const leaf_node = (
      /** @type {import('types').SSRNode} */
      nodes.page()
    );
    let status = 200;
    let action_result = void 0;
    if (is_action_request(event)) {
      const remote_id = get_remote_action(event.url);
      if (remote_id) {
        action_result = await handle_remote_form_post(event, event_state, manifest2, remote_id);
      } else {
        action_result = await handle_action_request(event, event_state, leaf_node.server);
      }
      if (action_result?.type === "redirect") {
        return redirect_response(action_result.status, action_result.location);
      }
      if (action_result?.type === "error") {
        status = get_status(action_result.error);
      }
      if (action_result?.type === "failure") {
        status = action_result.status;
      }
    }
    const should_prerender = nodes.prerender();
    if (should_prerender) {
      const mod = leaf_node.server;
      if (mod?.actions) {
        throw new Error("Cannot prerender pages with actions");
      }
    } else if (state.prerendering) {
      return new Response(void 0, {
        status: 204
      });
    }
    state.prerender_default = should_prerender;
    const should_prerender_data = nodes.should_prerender_data();
    const data_pathname = add_data_suffix2(event.url.pathname);
    const fetched = [];
    const ssr = nodes.ssr();
    const csr = nodes.csr();
    if (ssr === false && !(state.prerendering && should_prerender_data)) {
      if (BROWSER && action_result && !event.request.headers.has("x-sveltekit-action")) ;
      return await render_response({
        branch: [],
        fetched,
        page_config: {
          ssr: false,
          csr
        },
        status,
        error: null,
        event,
        event_state,
        options: options2,
        manifest: manifest2,
        state,
        resolve_opts,
        data_serializer: server_data_serializer(event, event_state, options2)
      });
    }
    const branch = [];
    let load_error = null;
    const data_serializer = server_data_serializer(event, event_state, options2);
    const data_serializer_json = state.prerendering && should_prerender_data ? server_data_serializer_json(event, event_state, options2) : null;
    const server_promises = nodes.data.map((node, i) => {
      if (load_error) {
        throw load_error;
      }
      return Promise.resolve().then(async () => {
        try {
          if (node === leaf_node && action_result?.type === "error") {
            throw action_result.error;
          }
          const server_data = await load_server_data({
            event,
            event_state,
            state,
            node,
            parent: async () => {
              const data = {};
              for (let j = 0; j < i; j += 1) {
                const parent = await server_promises[j];
                if (parent) Object.assign(data, parent.data);
              }
              return data;
            }
          });
          if (node) {
            data_serializer.add_node(i, server_data);
          }
          data_serializer_json?.add_node(i, server_data);
          return server_data;
        } catch (e3) {
          load_error = /** @type {Error} */
          e3;
          throw load_error;
        }
      });
    });
    const load_promises = nodes.data.map((node, i) => {
      if (load_error) throw load_error;
      return Promise.resolve().then(async () => {
        try {
          return await load_data({
            event,
            event_state,
            fetched,
            node,
            parent: async () => {
              const data = {};
              for (let j = 0; j < i; j += 1) {
                Object.assign(data, await load_promises[j]);
              }
              return data;
            },
            resolve_opts,
            server_data_promise: server_promises[i],
            state,
            csr
          });
        } catch (e3) {
          load_error = /** @type {Error} */
          e3;
          throw load_error;
        }
      });
    });
    for (const p of server_promises) p.catch(() => {
    });
    for (const p of load_promises) p.catch(() => {
    });
    for (let i = 0; i < nodes.data.length; i += 1) {
      const node = nodes.data[i];
      if (node) {
        try {
          const server_data = await server_promises[i];
          const data = await load_promises[i];
          branch.push({ node, server_data, data });
        } catch (e3) {
          const err = normalize_error(e3);
          if (err instanceof Redirect) {
            if (state.prerendering && should_prerender_data) {
              const body2 = JSON.stringify({
                type: "redirect",
                location: err.location
              });
              state.prerendering.dependencies.set(data_pathname, {
                response: text(body2),
                body: body2
              });
            }
            return redirect_response(err.status, err.location);
          }
          const status2 = get_status(err);
          const error2 = await handle_error_and_jsonify(event, event_state, options2, err);
          while (i--) {
            if (page2.errors[i]) {
              const index8 = (
                /** @type {number} */
                page2.errors[i]
              );
              const node2 = await manifest2._.nodes[index8]();
              let j = i;
              while (!branch[j]) j -= 1;
              data_serializer.set_max_nodes(j + 1);
              const layouts = compact(branch.slice(0, j + 1));
              const nodes2 = new PageNodes(layouts.map((layout) => layout.node));
              return await render_response({
                event,
                event_state,
                options: options2,
                manifest: manifest2,
                state,
                resolve_opts,
                page_config: {
                  ssr: nodes2.ssr(),
                  csr: nodes2.csr()
                },
                status: status2,
                error: error2,
                branch: layouts.concat({
                  node: node2,
                  data: null,
                  server_data: null
                }),
                fetched,
                data_serializer
              });
            }
          }
          return static_error_page(options2, status2, error2.message);
        }
      } else {
        branch.push(null);
      }
    }
    if (state.prerendering && data_serializer_json) {
      let { data, chunks } = data_serializer_json.get_data();
      if (chunks) {
        for await (const chunk of chunks) {
          data += chunk;
        }
      }
      state.prerendering.dependencies.set(data_pathname, {
        response: text(data),
        body: data
      });
    }
    return await render_response({
      event,
      event_state,
      options: options2,
      manifest: manifest2,
      state,
      resolve_opts,
      page_config: {
        csr,
        ssr
      },
      status,
      error: null,
      branch: ssr === false ? [] : compact(branch),
      action_result,
      fetched,
      data_serializer: ssr === false ? server_data_serializer(event, event_state, options2) : data_serializer
    });
  } catch (e3) {
    if (e3 instanceof Redirect) {
      return redirect_response(e3.status, e3.location);
    }
    return await respond_with_error({
      event,
      event_state,
      options: options2,
      manifest: manifest2,
      state,
      status: e3 instanceof HttpError ? e3.status : 500,
      error: e3,
      resolve_opts
    });
  }
}
function once(fn) {
  let done = false;
  let result;
  return () => {
    if (done) return result;
    done = true;
    return result = fn();
  };
}
async function render_data(event, event_state, route, options2, manifest2, state, invalidated_data_nodes, trailing_slash) {
  if (!route.page) {
    return new Response(void 0, {
      status: 404
    });
  }
  try {
    const node_ids = [...route.page.layouts, route.page.leaf];
    const invalidated = invalidated_data_nodes ?? node_ids.map(() => true);
    let aborted = false;
    const url = new URL(event.url);
    url.pathname = normalize_path(url.pathname, trailing_slash);
    const new_event = { ...event, url };
    const functions = node_ids.map((n2, i) => {
      return once(async () => {
        try {
          if (aborted) {
            return (
              /** @type {import('types').ServerDataSkippedNode} */
              {
                type: "skip"
              }
            );
          }
          const node = n2 == void 0 ? n2 : await manifest2._.nodes[n2]();
          return load_server_data({
            event: new_event,
            event_state,
            state,
            node,
            parent: async () => {
              const data2 = {};
              for (let j = 0; j < i; j += 1) {
                const parent = (
                  /** @type {import('types').ServerDataNode | null} */
                  await functions[j]()
                );
                if (parent) {
                  Object.assign(data2, parent.data);
                }
              }
              return data2;
            }
          });
        } catch (e3) {
          aborted = true;
          throw e3;
        }
      });
    });
    const promises = functions.map(async (fn, i) => {
      if (!invalidated[i]) {
        return (
          /** @type {import('types').ServerDataSkippedNode} */
          {
            type: "skip"
          }
        );
      }
      return fn();
    });
    let length = promises.length;
    const nodes = await Promise.all(
      promises.map(
        (p, i) => p.catch(async (error2) => {
          if (error2 instanceof Redirect) {
            throw error2;
          }
          length = Math.min(length, i + 1);
          return (
            /** @type {import('types').ServerErrorNode} */
            {
              type: "error",
              error: await handle_error_and_jsonify(event, event_state, options2, error2),
              status: error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : void 0
            }
          );
        })
      )
    );
    const data_serializer = server_data_serializer_json(event, event_state, options2);
    for (let i = 0; i < nodes.length; i++) data_serializer.add_node(i, nodes[i]);
    const { data, chunks } = data_serializer.get_data();
    if (!chunks) {
      return json_response(data);
    }
    return new Response(
      new ReadableStream({
        async start(controller) {
          controller.enqueue(text_encoder2.encode(data));
          for await (const chunk of chunks) {
            controller.enqueue(text_encoder2.encode(chunk));
          }
          controller.close();
        },
        type: "bytes"
      }),
      {
        headers: {
          // we use a proprietary content type to prevent buffering.
          // the `text` prefix makes it inspectable
          "content-type": "text/sveltekit-data",
          "cache-control": "private, no-store"
        }
      }
    );
  } catch (e3) {
    const error2 = normalize_error(e3);
    if (error2 instanceof Redirect) {
      return redirect_json_response(error2);
    } else {
      return json_response(await handle_error_and_jsonify(event, event_state, options2, error2), 500);
    }
  }
}
function json_response(json2, status = 200) {
  return text(typeof json2 === "string" ? json2 : JSON.stringify(json2), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "private, no-store"
    }
  });
}
function redirect_json_response(redirect) {
  return json_response(
    /** @type {import('types').ServerRedirectNode} */
    {
      type: "redirect",
      location: redirect.location
    }
  );
}
var INVALID_COOKIE_CHARACTER_REGEX = /[\x00-\x1F\x7F()<>@,;:"/[\]?={} \t]/;
function validate_options(options2) {
  if (options2?.path === void 0) {
    throw new Error("You must specify a `path` when setting, deleting or serializing cookies");
  }
}
function generate_cookie_key(domain, path, name) {
  return `${domain || ""}${path}?${encodeURIComponent(name)}`;
}
function get_cookies(request, url) {
  const header = request.headers.get("cookie") ?? "";
  const initial_cookies = (0, import_cookie.parse)(header, { decode: (value) => value });
  let normalized_url;
  const new_cookies = /* @__PURE__ */ new Map();
  const defaults = {
    httpOnly: true,
    sameSite: "lax",
    secure: url.hostname === "localhost" && url.protocol === "http:" ? false : true
  };
  const cookies = {
    // The JSDoc param annotations appearing below for get, set and delete
    // are necessary to expose the `cookie` library types to
    // typescript users. `@type {import('@sveltejs/kit').Cookies}` above is not
    // sufficient to do so.
    /**
     * @param {string} name
     * @param {import('cookie').CookieParseOptions} [opts]
     */
    get(name, opts) {
      const best_match = Array.from(new_cookies.values()).filter((c2) => {
        return c2.name === name && domain_matches(url.hostname, c2.options.domain) && path_matches(url.pathname, c2.options.path);
      }).sort((a, b) => b.options.path.length - a.options.path.length)[0];
      if (best_match) {
        return best_match.options.maxAge === 0 ? void 0 : best_match.value;
      }
      const req_cookies = (0, import_cookie.parse)(header, { decode: opts?.decode });
      const cookie = req_cookies[name];
      return cookie;
    },
    /**
     * @param {import('cookie').CookieParseOptions} [opts]
     */
    getAll(opts) {
      const cookies2 = (0, import_cookie.parse)(header, { decode: opts?.decode });
      const lookup = /* @__PURE__ */ new Map();
      for (const c2 of new_cookies.values()) {
        if (domain_matches(url.hostname, c2.options.domain) && path_matches(url.pathname, c2.options.path)) {
          const existing = lookup.get(c2.name);
          if (!existing || c2.options.path.length > existing.options.path.length) {
            lookup.set(c2.name, c2);
          }
        }
      }
      for (const c2 of lookup.values()) {
        cookies2[c2.name] = c2.value;
      }
      return Object.entries(cookies2).map(([name, value]) => ({ name, value }));
    },
    /**
     * @param {string} name
     * @param {string} value
     * @param {import('./page/types.js').Cookie['options']} options
     */
    set(name, value, options2) {
      const illegal_characters = name.match(INVALID_COOKIE_CHARACTER_REGEX);
      if (illegal_characters) {
        console.warn(
          `The cookie name "${name}" will be invalid in SvelteKit 3.0 as it contains ${illegal_characters.join(
            " and "
          )}. See RFC 2616 for more details https://datatracker.ietf.org/doc/html/rfc2616#section-2.2`
        );
      }
      validate_options(options2);
      set_internal(name, value, { ...defaults, ...options2 });
    },
    /**
     * @param {string} name
     *  @param {import('./page/types.js').Cookie['options']} options
     */
    delete(name, options2) {
      validate_options(options2);
      cookies.set(name, "", { ...options2, maxAge: 0 });
    },
    /**
     * @param {string} name
     * @param {string} value
     *  @param {import('./page/types.js').Cookie['options']} options
     */
    serialize(name, value, options2) {
      validate_options(options2);
      let path = options2.path;
      if (!options2.domain || options2.domain === url.hostname) {
        if (!normalized_url) {
          throw new Error("Cannot serialize cookies until after the route is determined");
        }
        path = resolve(normalized_url, path);
      }
      return (0, import_cookie.serialize)(name, value, { ...defaults, ...options2, path });
    }
  };
  function get_cookie_header(destination, header2) {
    const combined_cookies = {
      // cookies sent by the user agent have lowest precedence
      ...initial_cookies
    };
    for (const cookie of new_cookies.values()) {
      if (!domain_matches(destination.hostname, cookie.options.domain)) continue;
      if (!path_matches(destination.pathname, cookie.options.path)) continue;
      const encoder = cookie.options.encode || encodeURIComponent;
      combined_cookies[cookie.name] = encoder(cookie.value);
    }
    if (header2) {
      const parsed = (0, import_cookie.parse)(header2, { decode: (value) => value });
      for (const name in parsed) {
        combined_cookies[name] = parsed[name];
      }
    }
    return Object.entries(combined_cookies).map(([name, value]) => `${name}=${value}`).join("; ");
  }
  const internal_queue = [];
  function set_internal(name, value, options2) {
    if (!normalized_url) {
      internal_queue.push(() => set_internal(name, value, options2));
      return;
    }
    let path = options2.path;
    if (!options2.domain || options2.domain === url.hostname) {
      path = resolve(normalized_url, path);
    }
    const cookie_key = generate_cookie_key(options2.domain, path, name);
    const cookie = { name, value, options: { ...options2, path } };
    new_cookies.set(cookie_key, cookie);
  }
  function set_trailing_slash(trailing_slash) {
    normalized_url = normalize_path(url.pathname, trailing_slash);
    internal_queue.forEach((fn) => fn());
  }
  return { cookies, new_cookies, get_cookie_header, set_internal, set_trailing_slash };
}
function domain_matches(hostname, constraint) {
  if (!constraint) return true;
  const normalized = constraint[0] === "." ? constraint.slice(1) : constraint;
  if (hostname === normalized) return true;
  return hostname.endsWith("." + normalized);
}
function path_matches(path, constraint) {
  if (!constraint) return true;
  const normalized = constraint.endsWith("/") ? constraint.slice(0, -1) : constraint;
  if (path === normalized) return true;
  return path.startsWith(normalized + "/");
}
function add_cookies_to_headers(headers2, cookies) {
  for (const new_cookie of cookies) {
    const { name, value, options: options2 } = new_cookie;
    headers2.append("set-cookie", (0, import_cookie.serialize)(name, value, options2));
    if (options2.path.endsWith(".html")) {
      const path = add_data_suffix2(options2.path);
      headers2.append("set-cookie", (0, import_cookie.serialize)(name, value, { ...options2, path }));
    }
  }
}
function create_fetch({ event, options: options2, manifest: manifest2, state, get_cookie_header, set_internal }) {
  const server_fetch = async (info, init2) => {
    const original_request = normalize_fetch_input(info, init2, event.url);
    let mode = (info instanceof Request ? info.mode : init2?.mode) ?? "cors";
    let credentials = (info instanceof Request ? info.credentials : init2?.credentials) ?? "same-origin";
    return options2.hooks.handleFetch({
      event,
      request: original_request,
      fetch: async (info2, init3) => {
        const request = normalize_fetch_input(info2, init3, event.url);
        const url = new URL(request.url);
        if (!request.headers.has("origin")) {
          request.headers.set("origin", event.url.origin);
        }
        if (info2 !== original_request) {
          mode = (info2 instanceof Request ? info2.mode : init3?.mode) ?? "cors";
          credentials = (info2 instanceof Request ? info2.credentials : init3?.credentials) ?? "same-origin";
        }
        if ((request.method === "GET" || request.method === "HEAD") && (mode === "no-cors" && url.origin !== event.url.origin || url.origin === event.url.origin)) {
          request.headers.delete("origin");
        }
        const decoded = decodeURIComponent(url.pathname);
        if (url.origin !== event.url.origin || base && decoded !== base && !decoded.startsWith(`${base}/`)) {
          if (`.${url.hostname}`.endsWith(`.${event.url.hostname}`) && credentials !== "omit") {
            const cookie = get_cookie_header(url, request.headers.get("cookie"));
            if (cookie) request.headers.set("cookie", cookie);
          }
          return fetch(request);
        }
        const prefix = assets || base;
        const filename = (decoded.startsWith(prefix) ? decoded.slice(prefix.length) : decoded).slice(1);
        const filename_html = `${filename}/index.html`;
        const is_asset = manifest2.assets.has(filename) || filename in manifest2._.server_assets;
        const is_asset_html = manifest2.assets.has(filename_html) || filename_html in manifest2._.server_assets;
        if (is_asset || is_asset_html) {
          const file = is_asset ? filename : filename_html;
          if (state.read) {
            const type = is_asset ? manifest2.mimeTypes[filename.slice(filename.lastIndexOf("."))] : "text/html";
            return new Response(state.read(file), {
              headers: type ? { "content-type": type } : {}
            });
          } else if (read_implementation && file in manifest2._.server_assets) {
            const length = manifest2._.server_assets[file];
            const type = manifest2.mimeTypes[file.slice(file.lastIndexOf("."))];
            return new Response(read_implementation(file), {
              headers: {
                "Content-Length": "" + length,
                "Content-Type": type
              }
            });
          }
          return await fetch(request);
        }
        if (has_prerendered_path(manifest2, base + decoded)) {
          return await fetch(request);
        }
        if (credentials !== "omit") {
          const cookie = get_cookie_header(url, request.headers.get("cookie"));
          if (cookie) {
            request.headers.set("cookie", cookie);
          }
          const authorization = event.request.headers.get("authorization");
          if (authorization && !request.headers.has("authorization")) {
            request.headers.set("authorization", authorization);
          }
        }
        if (!request.headers.has("accept")) {
          request.headers.set("accept", "*/*");
        }
        if (!request.headers.has("accept-language")) {
          request.headers.set(
            "accept-language",
            /** @type {string} */
            event.request.headers.get("accept-language")
          );
        }
        const response = await internal_fetch(request, options2, manifest2, state);
        const set_cookie = response.headers.get("set-cookie");
        if (set_cookie) {
          for (const str of splitCookiesString(set_cookie)) {
            const { name, value, ...options3 } = parseString(str, {
              decodeValues: false
            });
            const path = options3.path ?? (url.pathname.split("/").slice(0, -1).join("/") || "/");
            set_internal(name, value, {
              path,
              encode: (value2) => value2,
              .../** @type {import('cookie').CookieSerializeOptions} */
              options3
            });
          }
        }
        return response;
      }
    });
  };
  return (input, init2) => {
    const response = server_fetch(input, init2);
    response.catch(() => {
    });
    return response;
  };
}
function normalize_fetch_input(info, init2, url) {
  if (info instanceof Request) {
    return info;
  }
  return new Request(typeof info === "string" ? new URL(info, url) : info, init2);
}
async function internal_fetch(request, options2, manifest2, state) {
  if (request.signal) {
    if (request.signal.aborted) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    let remove_abort_listener = () => {
    };
    const abort_promise = new Promise((_, reject) => {
      const on_abort = () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      };
      request.signal.addEventListener("abort", on_abort, { once: true });
      remove_abort_listener = () => request.signal.removeEventListener("abort", on_abort);
    });
    const result = await Promise.race([
      respond(request, options2, manifest2, {
        ...state,
        depth: state.depth + 1
      }),
      abort_promise
    ]);
    remove_abort_listener();
    return result;
  } else {
    return await respond(request, options2, manifest2, {
      ...state,
      depth: state.depth + 1
    });
  }
}
var body;
var etag;
var headers;
function get_public_env(request) {
  body ??= `export const env=${JSON.stringify(public_env)}`;
  etag ??= `W/${Date.now()}`;
  headers ??= new Headers({
    "content-type": "application/javascript; charset=utf-8",
    etag
  });
  if (request.headers.get("if-none-match") === etag) {
    return new Response(void 0, { status: 304, headers });
  }
  return new Response(body, { headers });
}
var default_transform = ({ html }) => html;
var default_filter = () => false;
var default_preload = ({ type }) => type === "js" || type === "css";
var page_methods = /* @__PURE__ */ new Set(["GET", "HEAD", "POST"]);
var allowed_page_methods = /* @__PURE__ */ new Set(["GET", "HEAD", "OPTIONS"]);
var respond = propagate_context(internal_respond);
async function internal_respond(request, options2, manifest2, state) {
  const url = new URL(request.url);
  const is_route_resolution_request = has_resolution_suffix2(url.pathname);
  const is_data_request = has_data_suffix2(url.pathname);
  const remote_id = get_remote_id(url);
  {
    const request_origin = request.headers.get("origin");
    if (remote_id) {
      if (request.method !== "GET" && request_origin !== url.origin) {
        const message = "Cross-site remote requests are forbidden";
        return json({ message }, { status: 403 });
      }
    } else if (options2.csrf_check_origin) {
      const forbidden = is_form_content_type(request) && (request.method === "POST" || request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE") && request_origin !== url.origin && (!request_origin || !options2.csrf_trusted_origins.includes(request_origin));
      if (forbidden) {
        const message = `Cross-site ${request.method} form submissions are forbidden`;
        const opts = { status: 403 };
        if (request.headers.get("accept") === "application/json") {
          return json({ message }, opts);
        }
        return text(message, opts);
      }
    }
  }
  if (options2.hash_routing && url.pathname !== base + "/" && url.pathname !== "/[fallback]") {
    return text("Not found", { status: 404 });
  }
  let invalidated_data_nodes;
  if (is_route_resolution_request) {
    url.pathname = strip_resolution_suffix2(url.pathname);
  } else if (is_data_request) {
    url.pathname = strip_data_suffix2(url.pathname) + (url.searchParams.get(TRAILING_SLASH_PARAM) === "1" ? "/" : "") || "/";
    url.searchParams.delete(TRAILING_SLASH_PARAM);
    invalidated_data_nodes = url.searchParams.get(INVALIDATED_PARAM)?.split("").map((node) => node === "1");
    url.searchParams.delete(INVALIDATED_PARAM);
  } else if (remote_id) {
    url.pathname = request.headers.get("x-sveltekit-pathname") ?? base;
    url.search = request.headers.get("x-sveltekit-search") ?? "";
  }
  const headers2 = {};
  const { cookies, new_cookies, get_cookie_header, set_internal, set_trailing_slash } = get_cookies(
    request,
    url
  );
  const event_state = {
    prerendering: state.prerendering,
    transport: options2.hooks.transport,
    handleValidationError: options2.hooks.handleValidationError,
    tracing: {
      record_span
    },
    is_in_remote_function: false
  };
  const event = {
    cookies,
    // @ts-expect-error `fetch` needs to be created after the `event` itself
    fetch: null,
    getClientAddress: state.getClientAddress || (() => {
      throw new Error(
        `${"@sveltejs/adapter-cloudflare"} does not specify getClientAddress. Please raise an issue`
      );
    }),
    locals: {},
    params: {},
    platform: state.platform,
    request,
    route: { id: null },
    setHeaders: (new_headers) => {
      for (const key2 in new_headers) {
        const lower = key2.toLowerCase();
        const value = new_headers[key2];
        if (lower === "set-cookie") {
          throw new Error(
            "Use `event.cookies.set(name, value, options)` instead of `event.setHeaders` to set cookies"
          );
        } else if (lower in headers2) {
          if (lower === "server-timing") {
            headers2[lower] += ", " + value;
          } else {
            throw new Error(`"${key2}" header is already set`);
          }
        } else {
          headers2[lower] = value;
          if (state.prerendering && lower === "cache-control") {
            state.prerendering.cache = /** @type {string} */
            value;
          }
        }
      }
    },
    url,
    isDataRequest: is_data_request,
    isSubRequest: state.depth > 0,
    isRemoteRequest: !!remote_id
  };
  event.fetch = create_fetch({
    event,
    options: options2,
    manifest: manifest2,
    state,
    get_cookie_header,
    set_internal
  });
  if (state.emulator?.platform) {
    event.platform = await state.emulator.platform({
      config: {},
      prerender: !!state.prerendering?.fallback
    });
  }
  let resolved_path = url.pathname;
  if (!remote_id) {
    const prerendering_reroute_state = state.prerendering?.inside_reroute;
    try {
      if (state.prerendering) state.prerendering.inside_reroute = true;
      resolved_path = await options2.hooks.reroute({ url: new URL(url), fetch: event.fetch }) ?? url.pathname;
    } catch {
      return text("Internal Server Error", {
        status: 500
      });
    } finally {
      if (state.prerendering) state.prerendering.inside_reroute = prerendering_reroute_state;
    }
  }
  try {
    resolved_path = decode_pathname(resolved_path);
  } catch {
    return text("Malformed URI", { status: 400 });
  }
  if (
    // the resolved path has been decoded so it should be compared to the decoded url pathname
    resolved_path !== decode_pathname(url.pathname) && !state.prerendering?.fallback && has_prerendered_path(manifest2, resolved_path)
  ) {
    const url2 = new URL(request.url);
    url2.pathname = is_data_request ? add_data_suffix2(resolved_path) : is_route_resolution_request ? add_resolution_suffix2(resolved_path) : resolved_path;
    try {
      const response = await fetch(url2, request);
      const headers22 = new Headers(response.headers);
      if (headers22.has("content-encoding")) {
        headers22.delete("content-encoding");
        headers22.delete("content-length");
      }
      return new Response(response.body, {
        headers: headers22,
        status: response.status,
        statusText: response.statusText
      });
    } catch (error2) {
      return await handle_fatal_error(event, event_state, options2, error2);
    }
  }
  let route = null;
  if (base && !state.prerendering?.fallback) {
    if (!resolved_path.startsWith(base)) {
      return text("Not found", { status: 404 });
    }
    resolved_path = resolved_path.slice(base.length) || "/";
  }
  if (is_route_resolution_request) {
    return resolve_route(resolved_path, new URL(request.url), manifest2);
  }
  if (resolved_path === `/${app_dir}/env.js`) {
    return get_public_env(request);
  }
  if (!remote_id && resolved_path.startsWith(`/${app_dir}`)) {
    const headers22 = new Headers();
    headers22.set("cache-control", "public, max-age=0, must-revalidate");
    return text("Not found", { status: 404, headers: headers22 });
  }
  if (!state.prerendering?.fallback) {
    const matchers = await manifest2._.matchers();
    const result = find_route(resolved_path, manifest2._.routes, matchers);
    if (result) {
      route = result.route;
      event.route = { id: route.id };
      event.params = result.params;
    }
  }
  let resolve_opts = {
    transformPageChunk: default_transform,
    filterSerializedResponseHeaders: default_filter,
    preload: default_preload
  };
  let trailing_slash = "never";
  try {
    const page_nodes = route?.page ? new PageNodes(await load_page_nodes(route.page, manifest2)) : void 0;
    if (route && !remote_id) {
      if (url.pathname === base || url.pathname === base + "/") {
        trailing_slash = "always";
      } else if (page_nodes) {
        if (BROWSER) ;
        trailing_slash = page_nodes.trailing_slash();
      } else if (route.endpoint) {
        const node = await route.endpoint();
        trailing_slash = node.trailingSlash ?? "never";
        if (BROWSER) ;
      }
      if (!is_data_request) {
        const normalized = normalize_path(url.pathname, trailing_slash);
        if (normalized !== url.pathname && !state.prerendering?.fallback) {
          return new Response(void 0, {
            status: 308,
            headers: {
              "x-sveltekit-normalize": "1",
              location: (
                // ensure paths starting with '//' are not treated as protocol-relative
                (normalized.startsWith("//") ? url.origin + normalized : normalized) + (url.search === "?" ? "" : url.search)
              )
            }
          });
        }
      }
      if (state.before_handle || state.emulator?.platform) {
        let config = {};
        let prerender = false;
        if (route.endpoint) {
          const node = await route.endpoint();
          config = node.config ?? config;
          prerender = node.prerender ?? prerender;
        } else if (page_nodes) {
          config = page_nodes.get_config() ?? config;
          prerender = page_nodes.prerender();
        }
        if (state.before_handle) {
          state.before_handle(event, config, prerender);
        }
        if (state.emulator?.platform) {
          event.platform = await state.emulator.platform({ config, prerender });
        }
      }
    }
    set_trailing_slash(trailing_slash);
    if (state.prerendering && !state.prerendering.fallback && !state.prerendering.inside_reroute) {
      disable_search(url);
    }
    const response = await record_span({
      name: "sveltekit.handle.root",
      attributes: {
        "http.route": event.route.id || "unknown",
        "http.method": event.request.method,
        "http.url": event.url.href,
        "sveltekit.is_data_request": is_data_request,
        "sveltekit.is_sub_request": event.isSubRequest
      },
      fn: async (root_span) => {
        const traced_event = {
          ...event,
          tracing: {
            enabled: false,
            root: root_span,
            current: root_span
          }
        };
        return await with_request_store(
          { event: traced_event, state: event_state },
          () => options2.hooks.handle({
            event: traced_event,
            resolve: (event2, opts) => {
              return record_span({
                name: "sveltekit.resolve",
                attributes: {
                  "http.route": event2.route.id || "unknown"
                },
                fn: (resolve_span) => {
                  return with_request_store(
                    null,
                    () => resolve2(merge_tracing(event2, resolve_span), page_nodes, opts).then(
                      (response2) => {
                        for (const key2 in headers2) {
                          const value = headers2[key2];
                          response2.headers.set(
                            key2,
                            /** @type {string} */
                            value
                          );
                        }
                        add_cookies_to_headers(response2.headers, new_cookies.values());
                        if (state.prerendering && event2.route.id !== null) {
                          response2.headers.set("x-sveltekit-routeid", encodeURI(event2.route.id));
                        }
                        resolve_span.setAttributes({
                          "http.response.status_code": response2.status,
                          "http.response.body.size": response2.headers.get("content-length") || "unknown"
                        });
                        return response2;
                      }
                    )
                  );
                }
              });
            }
          })
        );
      }
    });
    if (response.status === 200 && response.headers.has("etag")) {
      let if_none_match_value = request.headers.get("if-none-match");
      if (if_none_match_value?.startsWith('W/"')) {
        if_none_match_value = if_none_match_value.substring(2);
      }
      const etag2 = (
        /** @type {string} */
        response.headers.get("etag")
      );
      if (if_none_match_value === etag2) {
        const headers22 = new Headers({ etag: etag2 });
        for (const key2 of [
          "cache-control",
          "content-location",
          "date",
          "expires",
          "vary",
          "set-cookie"
        ]) {
          const value = response.headers.get(key2);
          if (value) headers22.set(key2, value);
        }
        return new Response(void 0, {
          status: 304,
          headers: headers22
        });
      }
    }
    if (is_data_request && response.status >= 300 && response.status <= 308) {
      const location = response.headers.get("location");
      if (location) {
        return redirect_json_response(new Redirect(
          /** @type {any} */
          response.status,
          location
        ));
      }
    }
    return response;
  } catch (e3) {
    if (e3 instanceof Redirect) {
      const response = is_data_request || remote_id ? redirect_json_response(e3) : route?.page && is_action_json_request(event) ? action_json_redirect(e3) : redirect_response(e3.status, e3.location);
      add_cookies_to_headers(response.headers, new_cookies.values());
      return response;
    }
    return await handle_fatal_error(event, event_state, options2, e3);
  }
  async function resolve2(event2, page_nodes, opts) {
    try {
      if (opts) {
        resolve_opts = {
          transformPageChunk: opts.transformPageChunk || default_transform,
          filterSerializedResponseHeaders: opts.filterSerializedResponseHeaders || default_filter,
          preload: opts.preload || default_preload
        };
      }
      if (options2.hash_routing || state.prerendering?.fallback) {
        return await render_response({
          event: event2,
          event_state,
          options: options2,
          manifest: manifest2,
          state,
          page_config: { ssr: false, csr: true },
          status: 200,
          error: null,
          branch: [],
          fetched: [],
          resolve_opts,
          data_serializer: server_data_serializer(event2, event_state, options2)
        });
      }
      if (remote_id) {
        return await handle_remote_call(event2, event_state, options2, manifest2, remote_id);
      }
      if (route) {
        const method = (
          /** @type {import('types').HttpMethod} */
          event2.request.method
        );
        let response2;
        if (is_data_request) {
          response2 = await render_data(
            event2,
            event_state,
            route,
            options2,
            manifest2,
            state,
            invalidated_data_nodes,
            trailing_slash
          );
        } else if (route.endpoint && (!route.page || is_endpoint_request(event2))) {
          response2 = await render_endpoint(event2, event_state, await route.endpoint(), state);
        } else if (route.page) {
          if (!page_nodes) {
            throw new Error("page_nodes not found. This should never happen");
          } else if (page_methods.has(method)) {
            response2 = await render_page(
              event2,
              event_state,
              route.page,
              options2,
              manifest2,
              state,
              page_nodes,
              resolve_opts
            );
          } else {
            const allowed_methods2 = new Set(allowed_page_methods);
            const node = await manifest2._.nodes[route.page.leaf]();
            if (node?.server?.actions) {
              allowed_methods2.add("POST");
            }
            if (method === "OPTIONS") {
              response2 = new Response(null, {
                status: 204,
                headers: {
                  allow: Array.from(allowed_methods2.values()).join(", ")
                }
              });
            } else {
              const mod = [...allowed_methods2].reduce(
                (acc, curr) => {
                  acc[curr] = true;
                  return acc;
                },
                /** @type {Record<string, any>} */
                {}
              );
              response2 = method_not_allowed(mod, method);
            }
          }
        } else {
          throw new Error("Route is neither page nor endpoint. This should never happen");
        }
        if (request.method === "GET" && route.page && route.endpoint) {
          const vary = response2.headers.get("vary")?.split(",")?.map((v) => v.trim().toLowerCase());
          if (!(vary?.includes("accept") || vary?.includes("*"))) {
            response2 = new Response(response2.body, {
              status: response2.status,
              statusText: response2.statusText,
              headers: new Headers(response2.headers)
            });
            response2.headers.append("Vary", "Accept");
          }
        }
        return response2;
      }
      if (state.error && event2.isSubRequest) {
        const headers22 = new Headers(request.headers);
        headers22.set("x-sveltekit-error", "true");
        return await fetch(request, { headers: headers22 });
      }
      if (state.error) {
        return text("Internal Server Error", {
          status: 500
        });
      }
      if (state.depth === 0) {
        if (BROWSER && event2.url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") ;
        return await respond_with_error({
          event: event2,
          event_state,
          options: options2,
          manifest: manifest2,
          state,
          status: 404,
          error: new SvelteKitError(404, "Not Found", `Not found: ${event2.url.pathname}`),
          resolve_opts
        });
      }
      if (state.prerendering) {
        return text("not found", { status: 404 });
      }
      const response = await fetch(request);
      return new Response(response.body, response);
    } catch (e3) {
      return await handle_fatal_error(event2, event_state, options2, e3);
    } finally {
      event2.cookies.set = () => {
        throw new Error("Cannot use `cookies.set(...)` after the response has been generated");
      };
      event2.setHeaders = () => {
        throw new Error("Cannot use `setHeaders(...)` after the response has been generated");
      };
    }
  }
}
function load_page_nodes(page2, manifest2) {
  return Promise.all([
    // we use == here rather than === because [undefined] serializes as "[null]"
    ...page2.layouts.map((n2) => n2 == void 0 ? n2 : manifest2._.nodes[n2]()),
    manifest2._.nodes[page2.leaf]()
  ]);
}
function propagate_context(fn) {
  return async (req, ...rest) => {
    {
      return fn(req, ...rest);
    }
  };
}
function filter_env(env, allowed, disallowed) {
  return Object.fromEntries(
    Object.entries(env).filter(
      ([k]) => k.startsWith(allowed) && (disallowed === "" || !k.startsWith(disallowed))
    )
  );
}
function set_app(value) {
}
var init_promise;
var current = null;
var Server = class {
  /** @type {import('types').SSROptions} */
  #options;
  /** @type {import('@sveltejs/kit').SSRManifest} */
  #manifest;
  /** @param {import('@sveltejs/kit').SSRManifest} manifest */
  constructor(manifest2) {
    this.#options = options;
    this.#manifest = manifest2;
    if (IN_WEBCONTAINER2) {
      const respond2 = this.respond.bind(this);
      this.respond = async (...args) => {
        const { promise, resolve: resolve2 } = (
          /** @type {PromiseWithResolvers<void>} */
          with_resolvers()
        );
        const previous = current;
        current = promise;
        await previous;
        return respond2(...args).finally(resolve2);
      };
    }
  }
  /**
   * @param {import('@sveltejs/kit').ServerInitOptions} opts
   */
  async init({ env, read }) {
    const { env_public_prefix, env_private_prefix } = this.#options;
    set_private_env(filter_env(env, env_private_prefix, env_public_prefix));
    set_public_env(filter_env(env, env_public_prefix, env_private_prefix));
    if (read) {
      const wrapped_read = (file) => {
        const result = read(file);
        if (result instanceof ReadableStream) {
          return result;
        } else {
          return new ReadableStream({
            async start(controller) {
              try {
                const stream = await Promise.resolve(result);
                if (!stream) {
                  controller.close();
                  return;
                }
                const reader = stream.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
                controller.close();
              } catch (error2) {
                controller.error(error2);
              }
            }
          });
        }
      };
      set_read_implementation(wrapped_read);
    }
    await (init_promise ??= (async () => {
      try {
        const module = await get_hooks();
        this.#options.hooks = {
          handle: module.handle || (({ event, resolve: resolve2 }) => resolve2(event)),
          handleError: module.handleError || (({ status, error: error2, event }) => {
            const error_message = format_server_error(
              status,
              /** @type {Error} */
              error2,
              event
            );
            console.error(error_message);
          }),
          handleFetch: module.handleFetch || (({ request, fetch: fetch2 }) => fetch2(request)),
          handleValidationError: module.handleValidationError || (({ issues }) => {
            console.error("Remote function schema validation failed:", issues);
            return { message: "Bad Request" };
          }),
          reroute: module.reroute || (() => {
          }),
          transport: module.transport || {}
        };
        set_app({
          decoders: module.transport ? Object.fromEntries(Object.entries(module.transport).map(([k, v]) => [k, v.decode])) : {}
        });
        if (module.init) {
          await module.init();
        }
      } catch (e3) {
        {
          throw e3;
        }
      }
    })());
  }
  /**
   * @param {Request} request
   * @param {import('types').RequestOptions} options
   */
  async respond(request, options2) {
    return respond(request, this.#options, this.#manifest, {
      ...options2,
      error: false,
      depth: 0
    });
  }
};

// .svelte-kit/cloudflare-tmp/manifest.js
var manifest = (() => {
  function __memo(fn) {
    let value;
    return () => value ??= value = fn();
  }
  return {
    appDir: "_app",
    appPath: "_app",
    assets: /* @__PURE__ */ new Set([]),
    mimeTypes: {},
    _: {
      client: { start: "_app/immutable/entry/start.BstWpmpO.js", app: "_app/immutable/entry/app.CmrlXZAK.js", imports: ["_app/immutable/entry/start.BstWpmpO.js", "_app/immutable/chunks/BAsHyxeC.js", "_app/immutable/chunks/DyFvLQCM.js", "_app/immutable/chunks/DfWdpNK_.js", "_app/immutable/entry/app.CmrlXZAK.js", "_app/immutable/chunks/DyFvLQCM.js", "_app/immutable/chunks/CmEbjEsd.js"], stylesheets: [], fonts: [], uses_env_dynamic_public: false },
      nodes: [
        __memo(() => Promise.resolve().then(() => (init__(), __exports))),
        __memo(() => Promise.resolve().then(() => (init__2(), __exports2))),
        __memo(() => Promise.resolve().then(() => (init__3(), __exports3))),
        __memo(() => Promise.resolve().then(() => (init__4(), __exports4))),
        __memo(() => Promise.resolve().then(() => (init__5(), __exports5))),
        __memo(() => Promise.resolve().then(() => (init__6(), __exports6))),
        __memo(() => Promise.resolve().then(() => (init__7(), __exports7)))
      ],
      remotes: {},
      routes: [
        {
          id: "/",
          pattern: /^\/$/,
          params: [],
          page: { layouts: [0], errors: [1], leaf: 2 },
          endpoint: null
        },
        {
          id: "/developer/[username]",
          pattern: /^\/developer\/([^/]+?)\/?$/,
          params: [{ "name": "username", "optional": false, "rest": false, "chained": false }],
          page: { layouts: [0], errors: [1], leaf: 3 },
          endpoint: null
        },
        {
          id: "/matches",
          pattern: /^\/matches\/?$/,
          params: [],
          page: { layouts: [0], errors: [1], leaf: 4 },
          endpoint: null
        },
        {
          id: "/search",
          pattern: /^\/search\/?$/,
          params: [],
          page: { layouts: [0], errors: [1], leaf: 5 },
          endpoint: null
        },
        {
          id: "/shortlist",
          pattern: /^\/shortlist\/?$/,
          params: [],
          page: { layouts: [0], errors: [1], leaf: 6 },
          endpoint: null
        }
      ],
      prerendered_routes: /* @__PURE__ */ new Set([]),
      matchers: async () => {
        return {};
      },
      server_assets: {}
    }
  };
})();
var prerendered = /* @__PURE__ */ new Set([]);
var base_path = "";

// .svelte-kit/cloudflare-tmp/_worker.js
async function e(e3, t2) {
  let n2 = "string" != typeof t2 && "HEAD" === t2.method;
  n2 && (t2 = new Request(t2, { method: "GET" }));
  let r3 = await e3.match(t2);
  return n2 && r3 && (r3 = new Response(null, r3)), r3;
}
function t(e3, t2, n2, o2) {
  return ("string" == typeof t2 || "GET" === t2.method) && r(n2) && (n2.headers.has("Set-Cookie") && (n2 = new Response(n2.body, n2)).headers.append("Cache-Control", "private=Set-Cookie"), o2.waitUntil(e3.put(t2, n2.clone()))), n2;
}
var n = /* @__PURE__ */ new Set([200, 203, 204, 300, 301, 404, 405, 410, 414, 501]);
function r(e3) {
  if (!n.has(e3.status)) return false;
  if (~(e3.headers.get("Vary") || "").indexOf("*")) return false;
  let t2 = e3.headers.get("Cache-Control") || "";
  return !/(private|no-cache|no-store)/i.test(t2);
}
function o(n2) {
  return async function(r3, o2) {
    let a = await e(n2, r3);
    if (a) return a;
    o2.defer((e3) => {
      t(n2, r3, e3, o2);
    });
  };
}
var s2 = caches.default;
var c = t.bind(0, s2);
var r2 = e.bind(0, s2);
var e2 = o.bind(0, s2);
var server = new Server(manifest);
var app_path = `/${manifest.appPath}`;
var immutable = `${app_path}/immutable/`;
var version_file = `${app_path}/version.json`;
var worker = {
  async fetch(req, env, context) {
    await server.init({ env });
    let pragma = req.headers.get("cache-control") || "";
    let res = !pragma.includes("no-cache") && await r2(req);
    if (res) return res;
    let { pathname, search } = new URL(req.url);
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
    }
    const stripped_pathname = pathname.replace(/\/$/, "");
    let is_static_asset = false;
    const filename = stripped_pathname.slice(base_path.length + 1);
    if (filename) {
      is_static_asset = manifest.assets.has(filename) || manifest.assets.has(filename + "/index.html") || filename in manifest._.server_assets || filename + "/index.html" in manifest._.server_assets;
    }
    let location = pathname.at(-1) === "/" ? stripped_pathname : pathname + "/";
    if (is_static_asset || prerendered.has(pathname) || pathname === version_file || pathname.startsWith(immutable)) {
      res = await env.ASSETS.fetch(req);
    } else if (location && prerendered.has(location)) {
      if (search) location += search;
      res = new Response("", {
        status: 308,
        headers: {
          location
        }
      });
    } else {
      res = await server.respond(req, {
        // @ts-ignore
        platform: { env, context, caches, cf: req.cf },
        getClientAddress() {
          return req.headers.get("cf-connecting-ip");
        }
      });
    }
    pragma = res.headers.get("cache-control") || "";
    return pragma && res.status < 400 ? c(req, res, context) : res;
  }
};
var worker_default = worker;
export {
  worker_default as default
};
/*! Bundled license information:

cookie/index.js:
  (*!
   * cookie
   * Copyright(c) 2012-2014 Roman Shtylman
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)
*/
//# sourceMappingURL=_worker.js.map
