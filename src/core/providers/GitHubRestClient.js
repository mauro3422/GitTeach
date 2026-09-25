const DEFAULT_API_BASE = 'https://api.github.com';
const DEFAULT_API_VERSION = '2026-03-10';
const DEFAULT_USER_AGENT = 'GitTeach';

function asPositiveInteger(value, field, fallback) {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved < 1) {
    throw new Error(`${field} must be an integer >= 1.`);
  }
  return resolved;
}

function cleanToken(value) {
  if (value === null || value === undefined) return null;
  const token = String(value).trim();
  return token || null;
}

function headerValue(headers, name) {
  return headers?.get?.(name) ?? null;
}

function parseInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRateLimit(headers) {
  return Object.freeze({
    limit: parseInteger(headerValue(headers, 'x-ratelimit-limit')),
    remaining: parseInteger(headerValue(headers, 'x-ratelimit-remaining')),
    used: parseInteger(headerValue(headers, 'x-ratelimit-used')),
    resetEpochSeconds: parseInteger(headerValue(headers, 'x-ratelimit-reset')),
    resource: headerValue(headers, 'x-ratelimit-resource'),
    retryAfterSeconds: parseInteger(headerValue(headers, 'retry-after'))
  });
}

function retryAtFromRateLimit(rateLimit, nowMs, secondary = false) {
  if (rateLimit.retryAfterSeconds !== null) {
    return new Date(nowMs + rateLimit.retryAfterSeconds * 1000).toISOString();
  }
  if (rateLimit.remaining === 0 && rateLimit.resetEpochSeconds !== null) {
    return new Date(rateLimit.resetEpochSeconds * 1000).toISOString();
  }
  if (secondary) return new Date(nowMs + 60_000).toISOString();
  return null;
}

function parseAcceptedPermissions(headers) {
  const value = headerValue(headers, 'x-accepted-github-permissions');
  if (!value) return [];
  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function linkNext(linkHeader) {
  if (!linkHeader) return null;
  for (const part of String(linkHeader).split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="([^"]+)"/i);
    if (match && match[2].split(/\s+/).includes('next')) return match[1];
  }
  return null;
}

async function responseMessage(response) {
  try {
    const payload = await response.clone().json();
    return typeof payload?.message === 'string' ? payload.message : '';
  } catch {
    return '';
  }
}

function redactUrl(url) {
  const safe = new URL(url);
  safe.username = '';
  safe.password = '';
  for (const key of [...safe.searchParams.keys()]) {
    if (/token|secret|key|auth/i.test(key)) safe.searchParams.set(key, '[redacted]');
  }
  return safe.toString();
}

export class GitHubTransportError extends Error {
  constructor(message, { code = 'github-transport-error', status = null, retryAt = null, rateLimit = null, acceptedPermissions = [], url = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.retryAt = retryAt;
    this.rateLimit = rateLimit;
    this.acceptedPermissions = Object.freeze([...acceptedPermissions]);
    this.url = url ? redactUrl(url) : null;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      status: this.status,
      retryAt: this.retryAt,
      rateLimit: this.rateLimit,
      acceptedPermissions: this.acceptedPermissions,
      url: this.url,
      message: this.message
    };
  }
}

export class GitHubAuthenticationError extends GitHubTransportError {}
export class GitHubPermissionError extends GitHubTransportError {}
export class GitHubRateLimitError extends GitHubTransportError {}
export class GitHubNotAccessibleError extends GitHubTransportError {}
export class GitHubProtocolError extends GitHubTransportError {}

export class MemoryGitHubHttpCache {
  #entries = new Map();

  async get(key) {
    return this.#entries.get(key) ?? null;
  }

  async set(key, value) {
    this.#entries.set(key, Object.freeze({ ...value }));
  }

  async delete(key) {
    this.#entries.delete(key);
  }

  get size() {
    return this.#entries.size;
  }
}

export class GitHubRestClient {
  #fetch;
  #getAccessToken;
  #getCachePartition;
  #cache;
  #tail = Promise.resolve();
  #baseUrl;
  #apiVersion;
  #userAgent;
  #now;
  #defaultMaxPages;
  #defaultMaxItems;
  #requestTimeoutMs;
  #blockedUntilMs = 0;
  #lastRateLimit = null;

  constructor({
    fetchImpl = globalThis.fetch,
    getAccessToken = null,
    getCachePartition = null,
    cache = new MemoryGitHubHttpCache(),
    baseUrl = DEFAULT_API_BASE,
    apiVersion = DEFAULT_API_VERSION,
    userAgent = DEFAULT_USER_AGENT,
    now = () => Date.now(),
    maxPages = 10,
    maxItems = 1000,
    requestTimeoutMs = 15_000
  } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('GitHubRestClient requires fetchImpl.');
    if (getAccessToken !== null && typeof getAccessToken !== 'function') {
      throw new Error('getAccessToken must be a function when supplied.');
    }
    if (getCachePartition !== null && typeof getCachePartition !== 'function') {
      throw new Error('getCachePartition must be a function when supplied.');
    }
    if (!cache || typeof cache.get !== 'function' || typeof cache.set !== 'function') {
      throw new Error('GitHubRestClient cache must implement get/set.');
    }
    if (typeof now !== 'function') throw new Error('now must be a function.');
    const timeoutMs = asPositiveInteger(requestTimeoutMs, 'requestTimeoutMs', 15_000);

    const parsedBase = new URL(baseUrl);
    if (parsedBase.protocol !== 'https:' && parsedBase.hostname !== '127.0.0.1' && parsedBase.hostname !== 'localhost') {
      throw new Error('GitHubRestClient baseUrl must use HTTPS outside localhost.');
    }

    this.#fetch = fetchImpl;
    this.#getAccessToken = getAccessToken;
    this.#getCachePartition = getCachePartition;
    this.#cache = cache;
    this.#baseUrl = parsedBase.toString().replace(/\/$/, '');
    this.#apiVersion = String(apiVersion);
    this.#userAgent = String(userAgent);
    this.#now = now;
    this.#defaultMaxPages = asPositiveInteger(maxPages, 'maxPages', 10);
    this.#defaultMaxItems = asPositiveInteger(maxItems, 'maxItems', 1000);
    this.#requestTimeoutMs = timeoutMs;
  }

  #enqueue(operation) {
    const task = this.#tail.then(operation);
    this.#tail = task.catch(() => undefined);
    return task;
  }

  getRateLimitState() {
    const nowMs = this.#now();
    return Object.freeze({
      blocked: this.#blockedUntilMs > nowMs,
      retryAt: this.#blockedUntilMs > nowMs ? new Date(this.#blockedUntilMs).toISOString() : null,
      rateLimit: this.#lastRateLimit
    });
  }

  #rememberRateLimit(rateLimit, retryAt = null) {
    this.#lastRateLimit = rateLimit;
    if (!retryAt) return;
    const retryMs = Date.parse(retryAt);
    if (Number.isFinite(retryMs) && retryMs > this.#blockedUntilMs) this.#blockedUntilMs = retryMs;
  }

  #assertNotRateLimited(url) {
    const state = this.getRateLimitState();
    if (!state.blocked) return;
    throw new GitHubRateLimitError('GitHub API backoff is still active; no network request was sent.', {
      code: 'github-rate-limit-active',
      retryAt: state.retryAt,
      rateLimit: state.rateLimit,
      url: url.toString()
    });
  }

  #resolveUrl(pathOrUrl) {
    const url = new URL(pathOrUrl, `${this.#baseUrl}/`);
    const base = new URL(this.#baseUrl);
    if (url.origin !== base.origin) {
      throw new GitHubProtocolError('GitHub pagination/request URL changed origin.', {
        code: 'github-cross-origin-url',
        url: url.toString()
      });
    }
    return url;
  }

  async #token() {
    if (!this.#getAccessToken) return null;
    try {
      return cleanToken(await this.#getAccessToken());
    } catch {
      throw new GitHubAuthenticationError('GitHub credential provider failed.', {
        code: 'github-token-provider'
      });
    }
  }
  async #cachePartition(token) {
    if (!token) return 'public';
    if (!this.#getCachePartition) return null;
    try {
      const value = String(await this.#getCachePartition()).trim();
      return value ? `connection:${value}` : null;
    } catch {
      throw new GitHubProtocolError('GitHub cache partition provider failed.', {
        code: 'github-cache-partition-provider'
      });
    }
  }


  async #performGet(pathOrUrl, { useCache = true } = {}) {
    const url = this.#resolveUrl(pathOrUrl);
    this.#assertNotRateLimited(url);
    const token = await this.#token();
    const cachePartition = useCache ? await this.#cachePartition(token) : null;
    const cacheEnabled = Boolean(useCache && cachePartition);
    const cacheKey = cacheEnabled
      ? (cachePartition === 'public' ? url.toString() : `${cachePartition}\n${url}`)
      : null;
    const cached = cacheEnabled ? await this.#cache.get(cacheKey) : null;
    const headers = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': this.#apiVersion,
      'User-Agent': this.#userAgent
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (cached?.etag) headers['If-None-Match'] = cached.etag;
    else if (cached?.lastModified) headers['If-Modified-Since'] = cached.lastModified;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#requestTimeoutMs);
    let response;
    try {
      response = await this.#fetch(url, { method: 'GET', headers, signal: controller.signal });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new GitHubTransportError('GitHub request timed out.', {
          code: 'github-timeout',
          url: url.toString()
        });
      }
      throw new GitHubTransportError('GitHub network request failed.', {
        code: 'github-network-error',
        url: url.toString()
      });
    } finally {
      clearTimeout(timeout);
    }

    const rateLimit = parseRateLimit(response.headers);
    this.#rememberRateLimit(rateLimit);
    const responseLink = headerValue(response.headers, 'link');

    if (response.status === 304) {
      if (!cached || !Object.hasOwn(cached, 'value')) {
        throw new GitHubProtocolError('GitHub returned 304 without a cached representation.', {
          code: 'github-cache-miss-304',
          status: 304,
          rateLimit,
          url: url.toString()
        });
      }
      return {
        value: cached.value,
        status: 304,
        fromCache: true,
        rateLimit,
        etag: cached.etag ?? null,
        lastModified: cached.lastModified ?? null,
        link: responseLink ?? cached.link ?? null,
        url: url.toString()
      };
    }

    if (!response.ok) {
      const message = await responseMessage(response);
      const secondaryRateLimit = /secondary rate limit/i.test(message);
      const rateLimited = response.status === 429
        || (response.status === 403 && (rateLimit.remaining === 0 || rateLimit.retryAfterSeconds !== null || secondaryRateLimit));
      const acceptedPermissions = parseAcceptedPermissions(response.headers);
      const safeUrl = url.toString();

      if (rateLimited) {
        const retryAt = retryAtFromRateLimit(
          rateLimit,
          this.#now(),
          secondaryRateLimit || response.status === 429
        );
        this.#rememberRateLimit(rateLimit, retryAt);
        throw new GitHubRateLimitError('GitHub API rate limit reached; request was not retried automatically.', {
          code: secondaryRateLimit ? 'github-secondary-rate-limit' : 'github-rate-limit',
          status: response.status,
          retryAt,
          rateLimit,
          url: safeUrl
        });
      }
      if (response.status === 401) {
        throw new GitHubAuthenticationError('GitHub authentication is required or no longer valid.', {
          code: 'github-authentication',
          status: 401,
          rateLimit,
          url: safeUrl
        });
      }
      if (response.status === 403) {
        throw new GitHubPermissionError('GitHub denied access to this resource.', {
          code: 'github-permission',
          status: 403,
          rateLimit,
          acceptedPermissions,
          url: safeUrl
        });
      }
      if (response.status === 404) {
        throw new GitHubNotAccessibleError('GitHub resource was not found or is not accessible to the current identity.', {
          code: 'github-not-accessible',
          status: 404,
          rateLimit,
          url: safeUrl
        });
      }
      throw new GitHubTransportError(`GitHub request failed with HTTP ${response.status}.`, {
        code: 'github-http-error',
        status: response.status,
        rateLimit,
        url: safeUrl
      });
    }

    const value = response.status === 204 ? null : await response.json();
    const entry = {
      value,
      etag: headerValue(response.headers, 'etag'),
      lastModified: headerValue(response.headers, 'last-modified'),
      link: responseLink
    };
    if (cacheEnabled && (entry.etag || entry.lastModified)) await this.#cache.set(cacheKey, entry);

    return {
      value,
      status: response.status,
      fromCache: false,
      rateLimit,
      etag: entry.etag,
      lastModified: entry.lastModified,
      link: responseLink,
      url: url.toString()
    };
  }

  getJson(pathOrUrl, options = {}) {
    return this.#enqueue(() => this.#performGet(pathOrUrl, options));
  }

  async getPaginated(pathOrUrl, { maxPages = this.#defaultMaxPages, maxItems = this.#defaultMaxItems, useCache = true } = {}) {
    const pageLimit = asPositiveInteger(maxPages, 'maxPages', this.#defaultMaxPages);
    const itemLimit = asPositiveInteger(maxItems, 'maxItems', this.#defaultMaxItems);
    const items = [];
    let pagesFetched = 0;
    let next = pathOrUrl;
    let truncated = false;
    let lastRateLimit = null;

    while (next && pagesFetched < pageLimit && items.length < itemLimit) {
      const page = await this.getJson(next, { useCache });
      if (!Array.isArray(page.value)) {
        throw new GitHubProtocolError('Paginated GitHub endpoint returned a non-array payload.', {
          code: 'github-pagination-shape',
          status: page.status,
          rateLimit: page.rateLimit,
          url: page.url
        });
      }
      pagesFetched += 1;
      lastRateLimit = page.rateLimit;
      const remainingSlots = itemLimit - items.length;
      items.push(...page.value.slice(0, remainingSlots));
      const candidateNext = linkNext(page.link);
      if (page.value.length > remainingSlots) {
        truncated = true;
        next = candidateNext;
        break;
      }
      next = candidateNext;
    }

    if (next) truncated = true;
    return Object.freeze({
      items: Object.freeze(items),
      pagesFetched,
      truncated,
      nextUrl: next ? this.#resolveUrl(next).toString() : null,
      rateLimit: lastRateLimit
    });
  }

  listAuthenticatedRepositories(options = {}) {
    const params = new URLSearchParams({ per_page: '100', sort: 'full_name', direction: 'asc' });
    return this.getPaginated(`/user/repos?${params}`, options);
  }

  async getRepositoryTopics(owner, repo, { useCache = true } = {}) {
    const response = await this.getJson(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/topics`, { useCache });
    if (!response.value || !Array.isArray(response.value.names)) {
      throw new GitHubProtocolError('GitHub topics endpoint returned an invalid payload.', {
        code: 'github-topics-shape',
        status: response.status,
        rateLimit: response.rateLimit,
        url: response.url
      });
    }
    const names = [...new Set(response.value.names.map((name) => String(name).trim().toLowerCase()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    return Object.freeze({
      names: Object.freeze(names),
      fromCache: response.fromCache,
      rateLimit: response.rateLimit
    });
  }

  listReleases(owner, repo, options = {}) {
    return this.getPaginated(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=100`, options);
  }

  listPullRequests(owner, repo, { state = 'all', ...options } = {}) {
    const params = new URLSearchParams({ state, per_page: '100', sort: 'created', direction: 'asc' });
    return this.getPaginated(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${params}`, options);
  }

  listIssues(owner, repo, { state = 'all', ...options } = {}) {
    const params = new URLSearchParams({ state, per_page: '100', sort: 'created', direction: 'asc' });
    return this.getPaginated(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?${params}`, options);
  }

  listPullRequestReviews(owner, repo, pullNumber, options = {}) {
    if (!Number.isInteger(pullNumber) || pullNumber < 1) throw new Error('pullNumber must be an integer >= 1.');
    return this.getPaginated(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/reviews?per_page=100`, options);
  }
}

export const GITHUB_REST_API_VERSION = DEFAULT_API_VERSION;
