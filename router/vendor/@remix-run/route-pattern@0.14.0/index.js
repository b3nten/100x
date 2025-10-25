// src/lib/split.ts
function split(source) {
  let protocol;
  let hostname;
  let port;
  let pathname;
  let search;
  let searchStart = source.indexOf("?");
  if (searchStart !== -1) {
    search = [searchStart + 1, source.length];
    source = source.slice(0, searchStart);
  }
  let index = 0;
  let solidusIndex = source.indexOf("://");
  if (solidusIndex !== -1) {
    if (solidusIndex !== 0) {
      protocol = [0, solidusIndex];
    }
    index = solidusIndex + 3;
    let hostEndIndex = source.indexOf("/", index);
    if (hostEndIndex === -1) hostEndIndex = source.length;
    let colonIndex = source.lastIndexOf(":", hostEndIndex - 1);
    if (colonIndex !== -1 && colonIndex >= index) {
      let isPort = true;
      for (let i = colonIndex + 1; i < hostEndIndex; i++) {
        let char = source.charCodeAt(i);
        if (char < 48 || char > 57) {
          isPort = false;
          break;
        }
      }
      if (isPort && colonIndex + 1 < hostEndIndex) {
        hostname = [index, colonIndex];
        port = [colonIndex + 1, hostEndIndex];
      } else {
        hostname = [index, hostEndIndex];
      }
    } else {
      hostname = [index, hostEndIndex];
    }
    index = hostEndIndex === source.length ? hostEndIndex : hostEndIndex + 1;
  }
  if (index !== source.length) {
    if (source.charAt(index) === "/") {
      index += 1;
    }
    pathname = [index, source.length];
  }
  return { protocol, hostname, port, pathname, search };
}

// src/lib/search-constraints.ts
function parseSearchConstraints(search) {
  let constraints = /* @__PURE__ */ new Map();
  for (let part of search.split("&")) {
    if (part === "") continue;
    let eqIndex = part.indexOf("=");
    if (eqIndex === -1) {
      let name2 = decodeSearchComponent(part);
      let existing2 = constraints.get(name2);
      if (!existing2) {
        constraints.set(name2, { requireAssignment: false, allowBare: true });
      }
      continue;
    }
    let name = decodeSearchComponent(part.slice(0, eqIndex));
    let valuePart = part.slice(eqIndex + 1);
    let existing = constraints.get(name);
    if (!existing) {
      existing = { requireAssignment: true, allowBare: false };
      constraints.set(name, existing);
    } else {
      existing.requireAssignment = true;
      existing.allowBare = false;
    }
    if (valuePart.length > 0) {
      let decodedValue = decodeSearchComponent(valuePart);
      if (!existing.requiredValues) existing.requiredValues = /* @__PURE__ */ new Set();
      existing.requiredValues.add(decodedValue);
    }
  }
  return constraints;
}
function parseSearch(search) {
  if (search.startsWith("?")) search = search.slice(1);
  let namesWithoutAssignment = /* @__PURE__ */ new Set(), namesWithAssignment = /* @__PURE__ */ new Set(), valuesByKey = /* @__PURE__ */ new Map();
  if (search.length > 0) {
    for (let part of search.split("&")) {
      if (part === "") continue;
      let eqIndex = part.indexOf("=");
      if (eqIndex === -1) {
        let name2 = decodeSearchComponent(part);
        namesWithoutAssignment.add(name2);
        continue;
      }
      let name = decodeSearchComponent(part.slice(0, eqIndex));
      let valuePart = part.slice(eqIndex + 1);
      namesWithAssignment.add(name);
      let value = decodeSearchComponent(valuePart);
      let set = valuesByKey.get(name) ?? /* @__PURE__ */ new Set();
      if (!valuesByKey.has(name)) valuesByKey.set(name, set);
      set.add(value);
    }
  }
  return { namesWithoutAssignment, namesWithAssignment, valuesByKey };
}
function decodeSearchComponent(text) {
  try {
    return decodeURIComponent(text.replace(/\+/g, " "));
  } catch {
    return text;
  }
}

// src/lib/parse.ts
var ParseError = class extends Error {
  source;
  position;
  partName;
  constructor(description, partName, source, position) {
    super(`${description} in ${partName}`);
    this.name = "ParseError";
    this.source = source;
    this.position = position;
    this.partName = partName;
  }
};
function parse(source) {
  let protocol;
  let hostname;
  let port;
  let pathname;
  let search;
  let searchConstraints;
  let ranges = split(source);
  if (ranges.protocol) {
    protocol = parsePart("protocol", "", source, ...ranges.protocol);
  }
  if (ranges.hostname) {
    hostname = parsePart("hostname", ".", source, ...ranges.hostname);
  }
  if (ranges.port) {
    port = source.slice(...ranges.port);
  }
  if (ranges.pathname) {
    pathname = parsePart("pathname", "/", source, ...ranges.pathname);
  }
  if (ranges.search) {
    search = source.slice(...ranges.search);
    searchConstraints = parseSearchConstraints(search);
  }
  return { protocol, hostname, port, pathname, search, searchConstraints };
}
var identifierMatcher = /^[a-zA-Z_$][a-zA-Z_$0-9]*/;
function parsePart(partName, sep, source, start, end) {
  let tokens = [];
  let currentTokens = tokens;
  let tokensStack = [tokens];
  let openIndexes = [];
  let appendText = (text) => {
    let lastToken = currentTokens.at(-1);
    if (lastToken?.type === "text") {
      lastToken.value += text;
    } else {
      currentTokens.push({ type: "text", value: text });
    }
  };
  let i = start;
  while (i < end) {
    let char = source[i];
    if (char === sep) {
      currentTokens.push({ type: "separator" });
      i += 1;
      continue;
    }
    if (char === ":") {
      i += 1;
      let remaining = source.slice(i, end);
      let name = identifierMatcher.exec(remaining)?.[0];
      if (!name) throw new ParseError("missing variable name", partName, source, i);
      currentTokens.push({ type: "variable", name });
      i += name.length;
      continue;
    }
    if (char === "*") {
      i += 1;
      let remaining = source.slice(i, end);
      let name = identifierMatcher.exec(remaining)?.[0];
      if (name) {
        currentTokens.push({ type: "wildcard", name });
        i += name.length;
      } else {
        currentTokens.push({ type: "wildcard" });
      }
      continue;
    }
    if (char === "(") {
      tokensStack.push(currentTokens = []);
      openIndexes.push(i);
      i += 1;
      continue;
    }
    if (char === ")") {
      if (tokensStack.length === 1) throw new ParseError("unmatched )", partName, source, i);
      let tokens2 = tokensStack.pop();
      currentTokens = tokensStack[tokensStack.length - 1];
      currentTokens.push({ type: "optional", tokens: tokens2 });
      openIndexes.pop();
      i += 1;
      continue;
    }
    if (char === "\\") {
      let next = source.at(i + 1);
      if (!next || i + 1 >= end) throw new ParseError("dangling escape", partName, source, i);
      appendText(next);
      i += 2;
      continue;
    }
    appendText(char);
    i += 1;
  }
  if (openIndexes.length > 0) {
    throw new ParseError("unmatched (", partName, source, openIndexes[0]);
  }
  return tokens;
}

// src/lib/href.ts
var MissingParamError = class extends Error {
  paramName;
  constructor(paramName) {
    super(`Missing required parameter: ${paramName}`);
    this.name = "MissingParamError";
    this.paramName = paramName;
  }
};
function createHrefBuilder() {
  return (pattern, ...args) => formatHref(parse(typeof pattern === "string" ? pattern : pattern.source), ...args);
}
function formatHref(parsed, params, searchParams) {
  params = params ?? {};
  let href = "";
  if (parsed.hostname != null) {
    let protocol = parsed.protocol != null ? resolveTokens(parsed.protocol, "", params) : "https";
    let hostname = resolveTokens(parsed.hostname, ".", params);
    let port = parsed.port != null ? `:${parsed.port}` : "";
    href += `${protocol}://${hostname}${port}`;
  }
  if (parsed.pathname != null) {
    let pathname = resolveTokens(parsed.pathname, "/", params);
    href += pathname.startsWith("/") ? pathname : `/${pathname}`;
  } else {
    href += "/";
  }
  if (searchParams) {
    href += `?${new URLSearchParams(searchParams)}`;
  } else if (parsed.search) {
    href += `?${parsed.search}`;
  }
  return href;
}
function resolveTokens(tokens, sep, params) {
  let str = "";
  for (let token of tokens) {
    if (token.type === "variable" || token.type === "wildcard") {
      let name = token.name ?? "*";
      if (params[name] == null) throw new MissingParamError(name);
      str += String(params[name]);
    } else if (token.type === "text") {
      str += token.value;
    } else if (token.type === "separator") {
      str += sep;
    } else if (token.type === "optional") {
      try {
        str += resolveTokens(token.tokens, sep, params);
      } catch (error) {
        if (!(error instanceof MissingParamError)) {
          throw error;
        }
      }
    }
  }
  return str;
}

// src/lib/stringify.ts
function stringify(parsed) {
  let str = "";
  if (parsed.hostname != null) {
    let protocol = parsed.protocol != null ? stringifyTokens(parsed.protocol) : "";
    let hostname = parsed.hostname != null ? stringifyTokens(parsed.hostname, ".") : "";
    let port = parsed.port != null ? `:${parsed.port}` : "";
    str += `${protocol}://${hostname}${port}`;
  }
  if (parsed.pathname != null) {
    let pathname = stringifyTokens(parsed.pathname, "/");
    str += startsWithSeparator(parsed.pathname) ? pathname : `/${pathname}`;
  } else {
    str += "/";
  }
  if (parsed.search) {
    str += `?${parsed.search}`;
  } else if (parsed.searchConstraints != null) {
    let search = stringifySearchConstraints(parsed.searchConstraints);
    if (search !== "") {
      str += `?${search}`;
    }
  }
  return str;
}
function startsWithSeparator(tokens) {
  if (tokens.length === 0) return false;
  let firstToken = tokens[0];
  if (firstToken.type === "separator") return true;
  if (firstToken.type === "optional" && firstToken.tokens && firstToken.tokens.length > 0) {
    return startsWithSeparator(firstToken.tokens);
  }
  return false;
}
function stringifyTokens(tokens, sep = "") {
  let str = "";
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    if (token.type === "variable") {
      str += `:${token.name}`;
    } else if (token.type === "wildcard") {
      str += `*${token.name ?? ""}`;
    } else if (token.type === "text") {
      str += token.value;
    } else if (token.type === "separator") {
      str += sep;
    } else if (token.type === "optional") {
      str += `(${stringifyTokens(token.tokens, sep)})`;
    }
  }
  return str;
}
function stringifySearchConstraints(search) {
  let parts = [];
  for (let [key, value] of search.entries()) {
    if (value.allowBare && !value.requireAssignment) {
      parts.push(key);
    } else if (value.requiredValues && value.requiredValues.size > 0) {
      for (let requiredValue of value.requiredValues) {
        parts.push(`${key}=${requiredValue}`);
      }
    } else if (value.requireAssignment) {
      parts.push(`${key}=`);
    }
  }
  return parts.join("&");
}

// src/lib/join.ts
function join(a, b) {
  let { protocol, hostname, port } = b.hostname != null ? b : a;
  let pathname = joinPathnames(a.pathname, b.pathname);
  let searchConstraints = joinSearchConstraints(a.searchConstraints, b.searchConstraints);
  return stringify({
    protocol,
    hostname,
    port,
    pathname,
    searchConstraints
  });
}
function joinPathnames(a, b) {
  if (b == null || b.length === 0) return a;
  if (a == null || a.length === 0) return b;
  let tokens = [...a];
  if (tokens.length > 0 && tokens[tokens.length - 1].type === "separator") {
    tokens.pop();
  }
  let inputStartsWithSeparator = startsWithSeparator(b);
  if (b.length === 1 && b[0].type === "separator") {
    return tokens;
  }
  if (!inputStartsWithSeparator) {
    tokens.push({ type: "separator" });
  }
  tokens.push(...b);
  return tokens;
}
function joinSearchConstraints(baseSearch, inputSearch) {
  if (inputSearch == null) return baseSearch;
  if (baseSearch == null) return inputSearch;
  let merged = new Map(baseSearch);
  for (let [key, inputConstraint] of inputSearch.entries()) {
    let baseConstraint = merged.get(key);
    if (baseConstraint == null) {
      merged.set(key, inputConstraint);
    } else {
      let mergedConstraint = {
        requireAssignment: baseConstraint.requireAssignment || inputConstraint.requireAssignment,
        allowBare: baseConstraint.allowBare && inputConstraint.allowBare,
        requiredValues: void 0
      };
      if (baseConstraint.requiredValues || inputConstraint.requiredValues) {
        mergedConstraint.requiredValues = /* @__PURE__ */ new Set([
          ...baseConstraint.requiredValues || [],
          ...inputConstraint.requiredValues || []
        ]);
      }
      merged.set(key, mergedConstraint);
    }
  }
  return merged;
}

// src/lib/route-pattern.ts
var RoutePattern = class _RoutePattern {
  /**
   * The source string that was used to create this pattern.
   */
  source;
  /**
   * Whether to ignore case when matching URL pathnames.
   */
  ignoreCase;
  #parsed;
  #compiled;
  constructor(source, options) {
    this.source = typeof source === "string" ? source : source.source;
    this.ignoreCase = options?.ignoreCase === true;
    this.#parsed = parse(this.source);
  }
  /**
   * Generate a href (URL) for this pattern.
   *
   * @param params The parameters to use in the href.
   * @param searchParams The search parameters to use in the href.
   * @returns The href
   */
  href(...args) {
    return formatHref(this.#parsed, ...args);
  }
  /**
   * Join this pattern with another pattern. This is useful when building a pattern
   * relative to a base pattern.
   *
   * Note: The returned pattern will use the same options as this pattern.
   *
   * @param input The pattern to join with
   * @returns The joined pattern
   */
  join(input) {
    let parsedInput = parse(typeof input === "string" ? input : input.source);
    return new _RoutePattern(join(this.#parsed, parsedInput), {
      ignoreCase: this.ignoreCase
    });
  }
  /**
   * Match a URL against this pattern.
   *
   * @param url The URL to match
   * @returns The parameters if the URL matches this pattern, `null` otherwise
   */
  match(url) {
    if (typeof url === "string") url = new URL(url);
    let { matchOrigin, matcher, paramNames } = this.#compile();
    let pathname = this.ignoreCase ? url.pathname.toLowerCase() : url.pathname;
    let match = matcher.exec(matchOrigin ? `${url.origin}${pathname}` : pathname);
    if (match === null) return null;
    let params = {};
    for (let i = 0; i < paramNames.length; i++) {
      let paramName = paramNames[i];
      params[paramName] = match[i + 1];
    }
    if (this.#parsed.searchConstraints != null && !matchSearch(url.search, this.#parsed.searchConstraints)) {
      return null;
    }
    return { url, params };
  }
  #compile() {
    if (this.#compiled) return this.#compiled;
    this.#compiled = compilePattern(this.#parsed, this.ignoreCase);
    return this.#compiled;
  }
  /**
   * Test if a URL matches this pattern.
   *
   * @param url The URL to test
   * @returns `true` if the URL matches this pattern, `false` otherwise
   */
  test(url) {
    return this.match(url) !== null;
  }
  toString() {
    return this.source;
  }
};
function compilePattern(parsed, ignoreCase) {
  let { protocol, hostname, port, pathname } = parsed;
  let matchOrigin = hostname !== void 0;
  let matcher;
  let paramNames = [];
  if (matchOrigin) {
    let protocolSource = protocol ? tokensToRegExpSource(protocol, "", ".*", paramNames, true) : "[^:]+";
    let hostnameSource = hostname ? tokensToRegExpSource(hostname, ".", "[^.]+?", paramNames, true) : "[^/:]+";
    let portSource = port !== void 0 ? `:${regexpEscape(port)}` : "(?::[0-9]+)?";
    let pathnameSource = pathname ? tokensToRegExpSource(pathname, "/", "[^/]+?", paramNames, ignoreCase) : "";
    matcher = new RegExp(`^${protocolSource}://${hostnameSource}${portSource}/${pathnameSource}$`);
  } else {
    let pathnameSource = pathname ? tokensToRegExpSource(pathname, "/", "[^/]+?", paramNames, ignoreCase) : "";
    matcher = new RegExp(`^/${pathnameSource}$`);
  }
  return { matchOrigin, matcher, paramNames };
}
function tokensToRegExpSource(tokens, sep, paramRegExpSource, paramNames, forceLowerCase) {
  let source = "";
  for (let token of tokens) {
    if (token.type === "variable") {
      paramNames.push(token.name);
      source += `(${paramRegExpSource})`;
    } else if (token.type === "wildcard") {
      if (token.name) {
        paramNames.push(token.name);
        source += `(.*)`;
      } else {
        source += `(?:.*)`;
      }
    } else if (token.type === "text") {
      source += regexpEscape(forceLowerCase ? token.value.toLowerCase() : token.value);
    } else if (token.type === "separator") {
      source += regexpEscape(sep);
    } else if (token.type === "optional") {
      source += `(?:${tokensToRegExpSource(token.tokens, sep, paramRegExpSource, paramNames, forceLowerCase)})?`;
    }
  }
  return source;
}
function regexpEscape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function matchSearch(search, constraints) {
  let { namesWithoutAssignment, namesWithAssignment, valuesByKey } = parseSearch(search);
  for (let [key, constraint] of constraints) {
    let hasAssigned = namesWithAssignment.has(key), hasBare = namesWithoutAssignment.has(key), values = valuesByKey.get(key);
    if (constraint.requiredValues && constraint.requiredValues.size > 0) {
      if (!values) return false;
      for (let value of constraint.requiredValues) {
        if (!values.has(value)) return false;
      }
      continue;
    }
    if (constraint.requireAssignment) {
      if (!hasAssigned) return false;
      continue;
    }
    if (!(hasAssigned || hasBare)) return false;
  }
  return true;
}

// src/lib/regexp-matcher.ts
var RegExpMatcher = class {
  #pairs = [];
  #count = 0;
  add(pattern, data) {
    let routePattern = typeof pattern === "string" ? new RoutePattern(pattern) : pattern;
    this.#pairs.push({ pattern: routePattern, data });
    this.#count++;
  }
  match(url) {
    if (typeof url === "string") url = new URL(url);
    for (let { pattern, data } of this.#pairs) {
      let match = pattern.match(url);
      if (match) {
        return { data, params: match.params, url: match.url };
      }
    }
    return null;
  }
  *matchAll(url) {
    if (typeof url === "string") url = new URL(url);
    for (let { pattern, data } of this.#pairs) {
      let match = pattern.match(url);
      if (match) {
        yield { data, params: match.params, url: match.url };
      }
    }
  }
  get size() {
    return this.#count;
  }
};

// src/lib/trie-matcher.ts
var TrieMatcher = class {
  #pathnameOnlyRoot;
  #originRoot;
  #patternCount = 0;
  #maxTraversalStates;
  #nodeIdCounter = 0;
  #maxOptionalDepth = 5;
  constructor(options) {
    this.#pathnameOnlyRoot = this.#createNode();
    this.#originRoot = this.#createOriginNode();
    this.#maxTraversalStates = options?.maxTraversalStates ?? 1e4;
    this.#maxOptionalDepth = options?.maxOptionalDepth ?? 5;
  }
  /**
   * Add a pattern to the trie
   */
  add(pattern, node) {
    let routePattern = typeof pattern === "string" ? new RoutePattern(pattern) : pattern;
    let parsed = parse(routePattern.source);
    let maxDepthInPattern = 0;
    if (parsed.protocol)
      maxDepthInPattern = Math.max(
        maxDepthInPattern,
        this.#maxOptionalDepthInTokens(parsed.protocol)
      );
    if (parsed.hostname)
      maxDepthInPattern = Math.max(
        maxDepthInPattern,
        this.#maxOptionalDepthInTokens(parsed.hostname)
      );
    if (parsed.pathname)
      maxDepthInPattern = Math.max(
        maxDepthInPattern,
        this.#maxOptionalDepthInTokens(parsed.pathname)
      );
    if (maxDepthInPattern > this.#maxOptionalDepth) {
      throw new Error(
        `Pattern exceeds maxOptionalDepth (${this.#maxOptionalDepth}): ${routePattern.source}`
      );
    }
    let isOrigin = parsed.protocol || parsed.hostname || parsed.port;
    if (isOrigin) {
      if (parsed.protocol) {
        if (parsed.protocol.length === 1 && parsed.protocol[0].type === "variable") {
          if (!this.#originRoot.protocolVariableChild) {
            this.#originRoot.protocolVariableChild = {
              paramName: parsed.protocol[0].name,
              node: { hostnameRoot: this.#createHostnameNode() }
            };
          }
          this.#addHostnamePattern(
            this.#originRoot.protocolVariableChild.node.hostnameRoot,
            parsed.hostname || [],
            parsed.port,
            parsed.pathname,
            routePattern,
            node,
            parsed.searchConstraints,
            parsed
          );
        } else {
          let protocolVariants = this.#expandProtocolOptionals(parsed.protocol);
          for (let protocolKey of protocolVariants) {
            let existing = this.#originRoot.protocolChildren.get(protocolKey);
            if (!existing) {
              existing = { hostnameRoot: this.#createHostnameNode() };
              this.#originRoot.protocolChildren.set(protocolKey, existing);
            }
            this.#addHostnamePattern(
              existing.hostnameRoot,
              parsed.hostname || [],
              parsed.port,
              parsed.pathname,
              routePattern,
              node,
              parsed.searchConstraints,
              parsed
            );
          }
        }
      } else {
        if (!this.#originRoot.anyProtocolChild) {
          this.#originRoot.anyProtocolChild = { hostnameRoot: this.#createHostnameNode() };
        }
        this.#addHostnamePattern(
          this.#originRoot.anyProtocolChild.hostnameRoot,
          parsed.hostname || [],
          parsed.port,
          parsed.pathname,
          routePattern,
          node,
          parsed.searchConstraints,
          parsed
        );
      }
    } else {
      let root = this.#pathnameOnlyRoot;
      if (!parsed.pathname) {
        this.#addPatternMatch(root, routePattern, node, [], false, parsed.searchConstraints, parsed);
        this.#updateDepthUp(root);
        this.#patternCount++;
        return;
      }
      this.#buildPathTrie(
        root,
        parsed.pathname,
        routePattern,
        node,
        parsed.searchConstraints,
        parsed
      );
    }
    this.#patternCount++;
  }
  /**
   * Find the best match for a URL
   */
  match(url) {
    let urlObj = typeof url === "string" ? new URL(url) : url;
    let parsedUrl = {
      protocol: urlObj.protocol.slice(0, -1).toLowerCase(),
      hostname: urlObj.hostname.toLowerCase(),
      hostnameLabels: urlObj.hostname.toLowerCase().split(".").reverse(),
      port: urlObj.port,
      pathname: urlObj.pathname.replace(/^\/+/, "").replace(/\/+$/, ""),
      segments: urlObj.pathname.replace(/^\/+/, "").replace(/\/+$/, "").split("/").filter((s) => s !== ""),
      search: urlObj.search,
      searchParsed: parseSearch(urlObj.search)
    };
    let segments = parsedUrl.segments;
    let originMatch = null;
    if (parsedUrl.protocol || parsedUrl.hostname || parsedUrl.port) {
      originMatch = this.#tryOriginMatch(parsedUrl, segments, urlObj);
      if (originMatch) return originMatch;
    }
    let staticMatch = this.#tryStaticPathMatch(segments, urlObj.search, urlObj);
    if (staticMatch) return staticMatch;
    let pathnameMatches = this.#findPathnameMatches(segments, urlObj.search, true);
    if (pathnameMatches.length > 0) {
      let best = pathnameMatches[0];
      return { data: best.match.node, params: best.state.params, url: urlObj };
    }
    return null;
  }
  /**
   * Find all matches for a URL
   */
  *matchAll(url) {
    let urlObj = typeof url === "string" ? new URL(url) : url;
    let pathname = urlObj.pathname;
    if (pathname.startsWith("/")) {
      pathname = pathname.slice(1);
    }
    if (pathname.endsWith("/") && pathname.length > 0) {
      pathname = pathname.slice(0, -1);
    }
    let segments = pathname === "" ? [] : pathname.split("/").filter((s) => s !== "");
    let allMatches = [];
    allMatches.push(...this.#findOriginMatches(urlObj, segments, urlObj.search, false));
    let staticAll = this.#tryStaticPathAll(segments, urlObj.search, urlObj);
    allMatches.push(...staticAll);
    allMatches.push(...this.#findPathnameMatches(segments, urlObj.search, false));
    allMatches.sort(
      (a, b) => this.#finalScore(b.match, b.state) - this.#finalScore(a.match, a.state)
    );
    for (let match of allMatches) {
      yield {
        data: match.match.node,
        params: match.state.params,
        url: urlObj
      };
    }
  }
  /**
   * Number of patterns in the trie
   */
  get size() {
    return this.#patternCount;
  }
  // Private implementation methods
  #finalScore(match, state) {
    return match.specificity + state.specificity;
  }
  #updateDepthUp(node) {
    let minD = node.patterns.length > 0 ? 0 : Infinity;
    let maxD = node.patterns.length > 0 ? 0 : 0;
    let updateDepth = (child, minIncrement, maxIncrement) => {
      let childDMin = child.minDepthToTerminal ?? Infinity;
      let childDMax = child.maxDepthToTerminal ?? 0;
      minD = Math.min(minD, childDMin + minIncrement);
      maxD = Math.max(maxD, childDMax + maxIncrement);
    };
    for (let child of node.staticChildren.values()) updateDepth(child, 1, 1);
    for (let entry of node.shapeChildren.values()) updateDepth(entry.node, 1, 1);
    if (node.variableChild) updateDepth(node.variableChild, 1, 1);
    if (node.wildcardEdge) updateDepth(node.wildcardEdge.continuation, 0, 100);
    for (let opt of node.optionalEdges) updateDepth(opt.continuation, 0, 0);
    node.minDepthToTerminal = minD === Infinity ? void 0 : minD;
    node.maxDepthToTerminal = maxD;
    if (node.parent) this.#updateDepthUp(node.parent);
  }
  #createNode() {
    let node = {
      staticChildren: /* @__PURE__ */ new Map(),
      shapeChildren: /* @__PURE__ */ new Map(),
      optionalEdges: [],
      patterns: [],
      minDepthToTerminal: void 0,
      maxDepthToTerminal: void 0,
      parent: void 0
    };
    node.id = this.#nodeIdCounter++;
    return node;
  }
  #createOriginNode() {
    return {
      protocolChildren: /* @__PURE__ */ new Map()
    };
  }
  #createHostnameNode() {
    return {
      staticChildren: /* @__PURE__ */ new Map(),
      portChildren: /* @__PURE__ */ new Map()
    };
  }
  #expandProtocolOptionals(protocolTokens) {
    if (protocolTokens.length !== 2 || protocolTokens[0].type !== "text" || protocolTokens[1].type !== "optional") {
      return [stringifyTokens(protocolTokens).toLowerCase()];
    }
    let baseText = protocolTokens[0].value;
    let optionalToken = protocolTokens[1];
    if (optionalToken.tokens.length !== 1 || optionalToken.tokens[0].type !== "text") {
      return [stringifyTokens(protocolTokens).toLowerCase()];
    }
    let optionalText = optionalToken.tokens[0].value;
    return [baseText.toLowerCase(), (baseText + optionalText).toLowerCase()];
  }
  #addHostnamePattern(hostnameNode, hostnameTokens, port, pathnameTokens, pattern, userNode, searchConstraints, parsed) {
    let reversedLabels = this.#reverseHostnameLabels(hostnameTokens);
    let finalHostnameNode = this.#traverseHostnameLabels(hostnameNode, reversedLabels);
    let pathnameTrie;
    if (port !== void 0) {
      let existing = finalHostnameNode.portChildren.get(port);
      if (!existing) {
        existing = this.#createNode();
        finalHostnameNode.portChildren.set(port, existing);
      }
      pathnameTrie = existing;
    } else {
      if (!finalHostnameNode.defaultPathnameTrie) {
        finalHostnameNode.defaultPathnameTrie = this.#createNode();
      }
      pathnameTrie = finalHostnameNode.defaultPathnameTrie;
    }
    if (pathnameTokens) {
      this.#buildPathTrie(
        pathnameTrie,
        pathnameTokens,
        pattern,
        userNode,
        searchConstraints,
        parsed
      );
      this.#updateDepthUp(pathnameTrie);
    } else {
      this.#addPatternMatch(pathnameTrie, pattern, userNode, [], true, searchConstraints, parsed);
      this.#updateDepthUp(pathnameTrie);
    }
  }
  #reverseHostnameLabels(hostnameTokens) {
    let labels = this.#groupTokensIntoSegments(hostnameTokens);
    return labels.reverse();
  }
  #traverseHostnameLabels(startNode, labels) {
    let currentNode = startNode;
    for (let label of labels) {
      if (label.length === 1 && label[0].type === "text") {
        let labelText = label[0].value.toLowerCase();
        let child = currentNode.staticChildren.get(labelText);
        if (!child) {
          child = this.#createHostnameNode();
          currentNode.staticChildren.set(labelText, child);
          child.parent = currentNode;
        }
        currentNode = child;
      } else if (label.length === 1 && label[0].type === "variable") {
        if (!currentNode.variableChild) {
          let childNode = this.#createHostnameNode();
          childNode.parent = currentNode;
          currentNode.variableChild = {
            paramName: label[0].name,
            node: childNode
          };
        }
        currentNode = currentNode.variableChild.node;
      } else if (label.length === 1 && label[0].type === "wildcard") {
        if (!currentNode.wildcardChild) {
          currentNode.wildcardChild = {
            paramName: label[0].name,
            node: this.#createHostnameNode()
          };
          currentNode.wildcardChild.node.parent = currentNode;
        }
        currentNode = currentNode.wildcardChild.node;
      } else {
        if (!currentNode.variableChild) {
          currentNode.variableChild = {
            paramName: "hostname_segment",
            node: this.#createHostnameNode()
          };
          currentNode.variableChild.node.parent = currentNode;
        }
        currentNode = currentNode.variableChild.node;
      }
    }
    return currentNode;
  }
  #buildPathTrie(node, tokens, pattern, userNode, searchConstraints, parsed) {
    this.#buildTokenPath(node, tokens, pattern, (finalNode) => {
      this.#addPatternMatch(finalNode, pattern, userNode, [], false, searchConstraints, parsed);
      this.#updateDepthUp(finalNode);
    });
  }
  #buildTokenPath(node, tokens, pattern, onComplete) {
    if (tokens.length === 0) {
      onComplete(node);
      return;
    }
    let optionalIdx = this.#findInterSegmentOptional(tokens);
    if (optionalIdx !== -1) {
      let [before, opt, after] = [
        tokens.slice(0, optionalIdx),
        tokens[optionalIdx],
        tokens.slice(optionalIdx + 1)
      ];
      let branchNode = before.length > 0 ? this.#walkTokens(node, before, pattern) : node;
      let continuation = this.#createNode();
      continuation.parent = branchNode;
      branchNode.optionalEdges.push({ continuation });
      if (opt.tokens.length > 0) {
        this.#buildTokenPath(branchNode, opt.tokens, pattern, (endNode) => {
          endNode.optionalEdges.push({ continuation });
        });
      }
      this.#buildTokenPath(continuation, after, pattern, onComplete);
      return;
    }
    if (this.#hasIntraSegmentOptionals(tokens)) {
      for (let expanded of this.#expandIntraSegmentOptionals(tokens)) {
        let finalNode2 = this.#walkTokens(node, expanded, pattern);
        onComplete(finalNode2);
      }
      return;
    }
    let finalNode = this.#walkTokens(node, tokens, pattern);
    onComplete(finalNode);
  }
  #maxOptionalDepthInTokens(tokens) {
    let maxDepth = 0;
    for (let token of tokens) {
      if (token.type === "optional") {
        let childDepth = this.#maxOptionalDepthInTokens(token.tokens);
        maxDepth = Math.max(maxDepth, 1 + childDepth);
      }
    }
    return maxDepth;
  }
  #walkTokens(node, tokens, pattern) {
    let current = node;
    let segments = this.#groupTokensIntoSegments(tokens);
    for (let segment of segments) {
      current = this.#walkSegment(current, segment, pattern);
    }
    return current;
  }
  #walkSegment(node, segment, pattern) {
    if (segment.length === 0) return node;
    if (segment.length === 1) {
      let token = segment[0];
      if (token.type === "text") {
        let key = pattern.ignoreCase ? token.value.toLowerCase() : token.value;
        let child = node.staticChildren.get(key) ?? this.#createNode();
        if (!node.staticChildren.has(key)) {
          node.staticChildren.set(key, child);
          child.parent = node;
          if (pattern.ignoreCase) {
            node.hasIgnoreCasePatterns = true;
            child.hasIgnoreCasePatterns = true;
          }
        }
        return child;
      }
      if (token.type === "variable") {
        if (!node.variableChild) {
          node.variableChild = { ...this.#createNode(), paramName: token.name };
          node.variableChild.parent = node;
        }
        return node.variableChild;
      }
      if (token.type === "wildcard") {
        if (!node.wildcardEdge) {
          let continuation = this.#createNode();
          continuation.parent = node;
          node.wildcardEdge = { paramName: token.name, continuation };
        }
        return node.wildcardEdge.continuation;
      }
      throw new Error(`Unexpected token type: ${token.type}`);
    }
    if (segment.length > 1) {
      let shapeKey = this.#getSimpleShapeKey(segment, pattern.ignoreCase);
      let shapeEntry = node.shapeChildren.get(shapeKey);
      if (!shapeEntry) {
        let child = this.#createNode();
        child.parent = node;
        shapeEntry = { node: child, tokens: segment, ignoreCase: pattern.ignoreCase };
        node.shapeChildren.set(shapeKey, shapeEntry);
        if (pattern.ignoreCase) {
          node.hasIgnoreCasePatterns = true;
          shapeEntry.node.hasIgnoreCasePatterns = true;
        }
      }
      return shapeEntry.node;
    }
    return node;
  }
  #findInterSegmentOptional(tokens) {
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      if (token.type === "optional") {
        let hasPathSeparator = token.tokens.some(
          (t) => t.type === "separator" && (tokens[i - 1]?.type !== "separator" || i === 0)
        );
        if (hasPathSeparator) {
          return i;
        }
      }
    }
    return -1;
  }
  #hasIntraSegmentOptionals(tokens) {
    return tokens.some((t) => t.type === "optional");
  }
  #expandIntraSegmentOptionals(tokens) {
    let optionalIndex = tokens.findIndex((t) => t.type === "optional");
    if (optionalIndex === -1) {
      return [tokens];
    }
    let beforeOptional = tokens.slice(0, optionalIndex);
    let optionalToken = tokens[optionalIndex];
    let afterOptional = tokens.slice(optionalIndex + 1);
    let optionalExpansions = this.#expandIntraSegmentOptionals(optionalToken.tokens);
    let remainingExpansions = this.#expandIntraSegmentOptionals(afterOptional);
    let result = [];
    for (let remaining of remainingExpansions) {
      result.push([...beforeOptional, ...remaining]);
    }
    for (let optionalExpansion of optionalExpansions) {
      for (let remaining of remainingExpansions) {
        result.push([...beforeOptional, ...optionalExpansion, ...remaining]);
      }
    }
    return result;
  }
  #groupTokensIntoSegments(tokens) {
    let segments = [];
    let currentSegment = [];
    for (let token of tokens) {
      if (token.type === "separator") {
        if (currentSegment.length > 0) {
          segments.push(currentSegment);
          currentSegment = [];
        }
      } else {
        currentSegment.push(token);
      }
    }
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    return segments;
  }
  #getSimpleShapeKey(tokens, ignoreCase) {
    return tokens.map((t) => {
      if (t.type === "text") return `L:${ignoreCase ? t.value.toLowerCase() : t.value}`;
      if (t.type === "variable") return `V:${t.name}`;
      if (t.type === "wildcard") return `W:${t.name || ""}`;
      return t.type;
    }).join(",");
  }
  #addPatternMatch(node, pattern, userNode, paramNames, matchOrigin, searchConstraints, parsed) {
    let existingPattern = node.patterns.find((p) => p.pattern.source === pattern.source);
    if (existingPattern) {
      return;
    }
    let specificity = this.#calculateSpecificity(parsed, searchConstraints);
    node.patterns.push({
      pattern,
      node: userNode,
      paramNames,
      matchOrigin,
      searchConstraints,
      specificity,
      ignoreCase: pattern.ignoreCase
    });
    node.patterns.sort((a, b) => b.specificity - a.specificity);
    this.#updateDepthUp(node);
  }
  #calculateSpecificity(parsed, searchConstraints) {
    let specificity = 0;
    if (!parsed) {
      return specificity;
    }
    if (parsed.protocol || parsed.hostname || parsed.port) {
      specificity += 1e4;
    }
    if (searchConstraints && searchConstraints.size > 0) {
      specificity += 1e3;
    }
    if (parsed.pathname) {
      for (let token of parsed.pathname) {
        if (token.type === "text") {
          specificity += 100;
        } else if (token.type === "variable") {
          specificity += 10;
        } else if (token.type === "wildcard") {
          specificity += 1;
        } else if (token.type === "optional") {
          specificity -= 1;
        }
      }
    }
    return specificity;
  }
  #matchShape(shapeEntry, segment) {
    let normalizedSegment = shapeEntry.ignoreCase ? segment.toLowerCase() : segment;
    let pos = 0;
    let params = {};
    let spec = 0;
    for (let i = 0; i < shapeEntry.tokens.length; i++) {
      let token = shapeEntry.tokens[i];
      if (token.type === "text") {
        let lit = shapeEntry.ignoreCase ? token.value.toLowerCase() : token.value;
        if (!normalizedSegment.startsWith(lit, pos)) return null;
        pos += lit.length;
        spec += 100;
      } else if (token.type === "variable") {
        let start = pos;
        let nextLit = "";
        for (let j = i + 1; j < shapeEntry.tokens.length; j++) {
          let nextToken = shapeEntry.tokens[j];
          if (nextToken.type === "text") {
            nextLit = shapeEntry.ignoreCase ? nextToken.value.toLowerCase() : nextToken.value;
            break;
          }
        }
        let end = nextLit ? normalizedSegment.indexOf(nextLit, pos) : normalizedSegment.length;
        if (end === -1 && nextLit) return null;
        let value = segment.slice(start, end !== -1 ? end : void 0);
        params[token.name] = value;
        pos = end !== -1 ? end : pos;
        spec += 10;
      } else if (token.type === "wildcard") {
        let value = segment.slice(pos);
        if (token.name) params[token.name] = value;
        pos = segment.length;
        spec += 1;
      }
    }
    if (pos !== normalizedSegment.length) return null;
    return { params, specificity: spec };
  }
  #findOriginMatches(url, segments, urlSearch, earlyExit) {
    let results = [];
    let protocol = url.protocol.slice(0, -1).toLowerCase();
    let protocolNode = this.#originRoot.protocolChildren.get(protocol);
    if (protocolNode) {
      this.#matchHostnameAndPathname(protocolNode, url, segments, results, {}, urlSearch, earlyExit);
      if (earlyExit && results.length > 0) return results;
    }
    if (this.#originRoot.protocolVariableChild) {
      let protocolParams = { [this.#originRoot.protocolVariableChild.paramName]: protocol };
      this.#matchHostnameAndPathname(
        this.#originRoot.protocolVariableChild.node,
        url,
        segments,
        results,
        protocolParams,
        urlSearch,
        earlyExit
      );
      if (earlyExit && results.length > 0) return results;
    }
    if (this.#originRoot.anyProtocolChild) {
      this.#matchHostnameAndPathname(
        this.#originRoot.anyProtocolChild,
        url,
        segments,
        results,
        {},
        urlSearch,
        earlyExit
      );
      if (earlyExit && results.length > 0) return results;
    }
    if (!earlyExit) {
      results.sort(
        (a, b) => this.#finalScore(b.match, b.state) - this.#finalScore(a.match, a.state)
      );
    }
    return results;
  }
  #findPathnameMatches(segments, urlSearch, earlyExit) {
    let initialState = {
      segments,
      segmentIndex: 0,
      params: {},
      specificity: 0,
      nodeId: this.#pathnameOnlyRoot.id
    };
    return this.#bestFirstTraversal(this.#pathnameOnlyRoot, initialState, earlyExit, urlSearch);
  }
  #matchHostnameAndPathname(protocolNode, url, segments, results, protocolParams, urlSearch, earlyExit) {
    let hostname = url.hostname.toLowerCase();
    let hostnameLabels = hostname.split(".").reverse();
    let hostnameMatches = this.#matchHostnameLabels(protocolNode.hostnameRoot, hostnameLabels, 0, {
      ...protocolParams
    });
    for (let { node: hostnameNode, params: hostnameParams } of hostnameMatches) {
      if (url.port) {
        let portTrie = hostnameNode.portChildren.get(url.port);
        if (portTrie) {
          this.#matchPathnameInTrie(
            portTrie,
            segments,
            hostnameParams,
            results,
            urlSearch,
            earlyExit
          );
        }
      }
      if (hostnameNode.defaultPathnameTrie) {
        this.#matchPathnameInTrie(
          hostnameNode.defaultPathnameTrie,
          segments,
          hostnameParams,
          results,
          urlSearch,
          earlyExit
        );
      }
    }
  }
  #matchHostnameLabels(node, labels, labelIndex, params) {
    let results = [];
    if (labelIndex >= labels.length) {
      results.push({ node, params });
      return results;
    }
    let currentLabel = labels[labelIndex];
    let staticChild = node.staticChildren.get(currentLabel);
    if (staticChild) {
      results.push(...this.#matchHostnameLabels(staticChild, labels, labelIndex + 1, params));
    }
    if (node.variableChild) {
      let newParams = { ...params };
      newParams[node.variableChild.paramName] = currentLabel;
      results.push(
        ...this.#matchHostnameLabels(node.variableChild.node, labels, labelIndex + 1, newParams)
      );
    }
    if (node.wildcardChild) {
      let remainingLabels = labels.slice(labelIndex).reverse().join(".");
      let newParams = { ...params };
      if (node.wildcardChild.paramName) {
        newParams[node.wildcardChild.paramName] = remainingLabels;
      }
      results.push({ node: node.wildcardChild.node, params: newParams });
    }
    return results;
  }
  #matchPathnameInTrie(pathnameTrie, segments, hostnameParams, results, urlSearch, earlyExit) {
    let initialState = {
      segments,
      segmentIndex: 0,
      params: { ...hostnameParams },
      specificity: 1e3,
      // Origin patterns get higher base specificity
      nodeId: pathnameTrie.id
    };
    let traversalResults = this.#bestFirstTraversal(
      pathnameTrie,
      initialState,
      earlyExit,
      urlSearch
    );
    results.push(...traversalResults);
  }
  #matchSearch(search, constraints) {
    let { namesWithoutAssignment, namesWithAssignment, valuesByKey } = parseSearch(search);
    for (let [key, constraint] of constraints) {
      let hasAssigned = namesWithAssignment.has(key);
      let hasBare = namesWithoutAssignment.has(key);
      let values = valuesByKey.get(key);
      if (constraint.requiredValues && constraint.requiredValues.size > 0) {
        if (!values) return false;
        for (let value of constraint.requiredValues) {
          if (!values.has(value)) return false;
        }
        continue;
      }
      if (constraint.requireAssignment) {
        if (!hasAssigned) return false;
        continue;
      }
      if (!(hasAssigned || hasBare)) return false;
    }
    return true;
  }
  /**
   * Best-first traversal with priority queue
   * Returns results sorted by combined specificity (highest first)
   * If earlyExit is true, returns immediately after finding first valid match
   */
  #bestFirstTraversal(startNode, startState, earlyExit, urlSearch) {
    let results = [];
    let bestSpec = earlyExit ? -Infinity : 0;
    let stack = [];
    let initial = {
      node: startNode,
      state: startState,
      priority: this.#calculatePriority(startNode, startState)
    };
    stack.push(initial);
    let visited = /* @__PURE__ */ new Set();
    let statesExplored = 0;
    while (stack.length > 0 && statesExplored < this.#maxTraversalStates) {
      let current = stack.pop();
      statesExplored++;
      let { node, state } = current;
      let dedupKey = `${state.nodeId ?? node.id}:${state.segmentIndex}`;
      if (state.wildcardSpan) {
        dedupKey += `:${state.wildcardSpan}`;
      }
      if (visited.has(dedupKey)) continue;
      visited.add(dedupKey);
      if (earlyExit && state.specificity < bestSpec - 100) continue;
      if (state.segmentIndex === state.segments.length) {
        for (let pattern of node.patterns) {
          if (pattern.searchConstraints) {
            let searchToMatch = urlSearch ?? "";
            if (!this.#matchSearch(searchToMatch, pattern.searchConstraints)) continue;
          }
          let score = this.#finalScore(pattern, state);
          results.push({ match: pattern, state: { ...state } });
          if (earlyExit) {
            bestSpec = Math.max(bestSpec, score);
            if (results.length > 1)
              results.sort(
                (a, b) => this.#finalScore(b.match, b.state) - this.#finalScore(a.match, a.state)
              );
            return results.slice(0, 1);
          }
        }
      }
      let optionalStates = [];
      for (let optionalEdge of node.optionalEdges) {
        this.#expandOptionalStates(optionalEdge, node, state, optionalStates, earlyExit, bestSpec);
      }
      optionalStates = optionalStates.filter((s) => !earlyExit || s.priority >= bestSpec - 50);
      optionalStates.sort((a, b) => b.priority - a.priority);
      for (let i = optionalStates.length - 1; i >= 0; i--) {
        stack.push(optionalStates[i]);
      }
      if (state.segmentIndex >= state.segments.length) continue;
      let childStates = [];
      this.#expandTraversalState(node, state, childStates, earlyExit, bestSpec);
      childStates = childStates.filter((s) => !earlyExit || s.priority >= bestSpec - 50);
      childStates.sort((a, b) => b.priority - a.priority);
      for (let i = childStates.length - 1; i >= 0; i--) {
        stack.push(childStates[i]);
      }
    }
    results.sort((a, b) => this.#finalScore(b.match, b.state) - this.#finalScore(a.match, a.state));
    return results;
  }
  #calculatePriority(node, state) {
    let currentSpecificity = state.specificity;
    let remainingSegments = state.segments.length - state.segmentIndex;
    let estimatedRemaining = 0;
    if (node.minDepthToTerminal !== void 0 && remainingSegments > 0) {
      estimatedRemaining = Math.min(remainingSegments, node.minDepthToTerminal) * 50;
    } else {
      estimatedRemaining = remainingSegments * 50;
    }
    return currentSpecificity + estimatedRemaining;
  }
  #getStaticChild(node, segment) {
    let child = node.staticChildren.get(segment);
    if (!child && node.hasIgnoreCasePatterns) {
      child = node.staticChildren.get(segment.toLowerCase());
    }
    return child;
  }
  #expandTraversalState(node, state, states, earlyExit, bestSpec) {
    let currentSegment = state.segments[state.segmentIndex];
    let staticChild = this.#getStaticChild(node, currentSegment);
    if (staticChild) {
      let newState = {
        ...state,
        segmentIndex: state.segmentIndex + 1,
        specificity: state.specificity + 100,
        nodeId: staticChild.id
      };
      let ts = {
        node: staticChild,
        state: newState,
        priority: this.#calculatePriority(staticChild, newState)
      };
      if (!earlyExit || ts.priority >= bestSpec - 50) {
        states.push(ts);
      }
    }
    for (let [shapeKey, shapeEntry] of node.shapeChildren) {
      let matchResult = this.#matchShape(shapeEntry, currentSegment);
      if (matchResult) {
        let newState = {
          ...state,
          segmentIndex: state.segmentIndex + 1,
          params: { ...state.params, ...matchResult.params },
          specificity: state.specificity + matchResult.specificity,
          nodeId: shapeEntry.node.id
        };
        let ts = {
          node: shapeEntry.node,
          state: newState,
          priority: this.#calculatePriority(shapeEntry.node, newState)
        };
        if (!earlyExit || ts.priority >= bestSpec - 50) {
          states.push(ts);
        }
      }
    }
    if (node.variableChild) {
      let newParams = { ...state.params };
      newParams[node.variableChild.paramName] = currentSegment;
      let newState = {
        ...state,
        segmentIndex: state.segmentIndex + 1,
        params: newParams,
        specificity: state.specificity + 10,
        nodeId: node.variableChild.id
      };
      let ts = {
        node: node.variableChild,
        state: newState,
        priority: this.#calculatePriority(node.variableChild, newState)
      };
      if (!earlyExit || ts.priority >= bestSpec - 50) {
        states.push(ts);
      }
    }
    if (node.wildcardEdge) {
      this.#expandWildcardStates(node.wildcardEdge, state, states, earlyExit, bestSpec);
    }
  }
  #expandOptionalStates(optionalEdge, currentNode, state, states, earlyExit, bestSpec) {
    let skipState = {
      ...state,
      nodeId: optionalEdge.continuation.id,
      // Lower priority for skipping (less specific)
      specificity: state.specificity - 1
    };
    let skipTraversal = {
      node: optionalEdge.continuation,
      state: skipState,
      priority: this.#calculatePriority(optionalEdge.continuation, skipState)
    };
    if (!earlyExit || skipTraversal.priority >= bestSpec - 50) {
      states.push(skipTraversal);
    }
  }
  #expandWildcardStates(wildcardEdge, state, states, earlyExit, bestSpec) {
    let remaining = state.segments.length - state.segmentIndex;
    let continuation = wildcardEdge.continuation;
    let minConsume = 0;
    let maxConsume = remaining;
    if (continuation.minDepthToTerminal !== void 0) {
      maxConsume = Math.min(maxConsume, remaining - continuation.minDepthToTerminal);
    }
    if (continuation.maxDepthToTerminal !== void 0) {
      minConsume = Math.max(minConsume, remaining - continuation.maxDepthToTerminal);
    }
    if (minConsume > maxConsume) return;
    for (let consumeCount = maxConsume; consumeCount >= minConsume; consumeCount--) {
      let consumedSegments = state.segments.slice(
        state.segmentIndex,
        state.segmentIndex + consumeCount
      );
      let newParams = { ...state.params };
      if (wildcardEdge.paramName) {
        newParams[wildcardEdge.paramName] = consumedSegments.join("/");
      }
      let newState = {
        ...state,
        segmentIndex: state.segmentIndex + consumeCount,
        params: newParams,
        specificity: state.specificity + 1,
        nodeId: continuation.id,
        wildcardSpan: `${state.segmentIndex}-${state.segmentIndex + consumeCount}`
      };
      let ts = {
        node: continuation,
        state: newState,
        priority: this.#calculatePriority(continuation, newState)
      };
      if (!earlyExit || ts.priority >= bestSpec - 50) {
        states.push(ts);
      }
    }
  }
  #tryOriginMatch(parsedUrl, segments, urlObj) {
    let results = this.#findOriginMatches(urlObj, segments, parsedUrl.search, true);
    if (results.length > 0) {
      let best = results[0];
      return { data: best.match.node, params: best.state.params, url: urlObj };
    }
    return null;
  }
  #tryPathnameMatch(pathnameTrie, segments, baseParams, search, urlObj) {
    let initialState = {
      segments,
      segmentIndex: 0,
      params: { ...baseParams },
      specificity: 1e3,
      nodeId: pathnameTrie.id
    };
    let results = this.#bestFirstTraversal(pathnameTrie, initialState, true, search);
    if (results.length > 0) {
      let best = results[0];
      return { data: best.match.node, params: best.state.params, url: urlObj };
    }
    return null;
  }
  #tryStaticPathMatch(segments, search, url) {
    let results = this.#walkStaticPath(segments, search, false);
    if (results.length > 0) {
      let best = results[0];
      return { data: best.match.node, params: {}, url };
    }
    return null;
  }
  #tryStaticPathAll(segments, search, url) {
    return this.#walkStaticPath(segments, search, true);
  }
  #walkStaticPath(segments, search, collectAll) {
    let current = this.#pathnameOnlyRoot;
    let pathNodes = collectAll ? [current] : [];
    for (let seg of segments) {
      let child = this.#getStaticChild(current, seg);
      if (!child) return [];
      current = child;
      if (collectAll) pathNodes.push(current);
    }
    let matches = [];
    let nodesToCheck = collectAll ? pathNodes : [current];
    for (let node of nodesToCheck) {
      for (let pattern of node.patterns) {
        if (pattern.searchConstraints && !this.#matchSearch(search, pattern.searchConstraints))
          continue;
        let state = {
          segments,
          segmentIndex: segments.length,
          params: {},
          specificity: 0,
          nodeId: node.id
        };
        matches.push({ match: pattern, state });
        if (!collectAll) return matches;
      }
    }
    return matches.sort((a, b) => b.match.specificity - a.match.specificity);
  }
};
export {
  MissingParamError,
  ParseError,
  RegExpMatcher,
  RoutePattern,
  TrieMatcher,
  createHrefBuilder
};
//# sourceMappingURL=index.js.map
