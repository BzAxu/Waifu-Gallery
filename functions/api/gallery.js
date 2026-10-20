const PROVIDERS = [
  {
    id: "nekosapi",
    name: "Nekos API",
    kind: "SFW 图片 · 标签筛选",
    url: "https://api.nekosapi.com/v4/images/random?limit=10&rating=safe",
    headers: { "Accept": "application/json" },
    batchSize: 10,
    supportsTags: true,
    supportsBlockedTags: true,
    buildUrl: (tags) => {
      const target = new URL("https://api.nekosapi.com/v4/images/random?limit=10&rating=safe");
      tags.forEach((tag) => target.searchParams.append("tags", tag));
      return target.toString();
    },
    parse: (data) => Array.isArray(data) ? data.map((item) => item.url) : [],
    parseItems: (data) => Array.isArray(data) ? data.map((item) => ({
      url: item && item.url,
      tags: Array.isArray(item && item.tags) ? item.tags.map((tag) =>
        typeof tag === "string" ? tag : tag && (tag.name || tag.slug || tag.tag)
      ).filter(Boolean) : null
    })) : []
  },
  {
    id: "nekosbest",
    name: "NEKOS.BEST",
    kind: "SFW 动漫图 / GIF",
    url: "https://nekos.best/api/v2/neko?amount=10",
    headers: { "Accept": "application/json", "User-Agent": "BzAxuHomepage/1.0 (public SFW gallery)" },
    batchSize: 10,
    parse: (data) => Array.isArray(data.results) ? data.results.map((item) => item.url) : []
  },
  {
    id: "nekosmoe",
    name: "Nekos.moe",
    kind: "SFW 动漫图片 · 随机",
    url: "https://nekos.moe/api/v1/random/image?nsfw=false&count=10",
    headers: { "Accept": "application/json", "User-Agent": "Waifu-Gallery/1.0 (public SFW image gallery)" },
    batchSize: 10,
    parse: (data) => Array.isArray(data.images)
      ? data.images.filter((item) => item && typeof item.id === "string").map((item) => "https://nekos.moe/image/" + encodeURIComponent(item.id) + ".jpg")
      : []
  },
  {
    id: "nekoslife",
    name: "Nekos.life",
    kind: "SFW 随机动漫图",
    url: "https://nekos.life/api/v2/img/neko",
    headers: { "Accept": "application/json" },
    parse: (data) => data && typeof data.url === "string" ? [data.url] : []
  },
  {
    id: "icatw",
    name: "Anime Image Gateway",
    kind: "多源随机动漫图",
    url: "https://api.icatw.site/api/v1/images/random?category=anime",
    headers: { "Accept": "application/json" },
    parse: (data) => data && data.success && data.data && typeof data.data.url === "string" ? [data.data.url] : []
  },
  {
    id: "waifuim",
    name: "Waifu.im",
    kind: "SFW 图片 · 标签筛选与屏蔽",
    url: "https://api.waifu.im/images?IsNsfw=False&PageSize=10",
    headers: { "Accept": "application/json" },
    batchSize: 10,
    supportsTags: true,
    supportsBlockedTags: true,
    buildUrl: (tags, blockedTags = []) => {
      const target = new URL("https://api.waifu.im/images");
      target.searchParams.set("IsNsfw", "False");
      target.searchParams.set("PageSize", "10");
      tags.forEach((tag) => target.searchParams.append("IncludedTags", tag));
      blockedTags.forEach((tag) => target.searchParams.append("ExcludedTags", tag));
      return target.toString();
    },
    parse: (data) => Array.isArray(data.items) ? data.items.map((item) => item.url) : [],
    parseItems: (data) => Array.isArray(data.items) ? data.items.map((item) => ({
      url: item && item.url,
      tags: Array.isArray(item && item.tags) ? item.tags.map((tag) =>
        typeof tag === "string" ? tag : tag && (tag.name || tag.slug || tag.tag)
      ).filter(Boolean) : null
    })) : []
  },
  {
    id: "waifupics-waifu",
    name: "Waifu.pics · Waifu",
    kind: "SFW 随机动漫图",
    url: "https://api.waifu.pics/sfw/waifu",
    headers: { "Accept": "application/json" },
    parse: (data) => data && typeof data.url === "string" ? [data.url] : []
  },
  {
    id: "waifupics-neko",
    name: "Waifu.pics · Neko",
    kind: "SFW 猫耳角色图",
    url: "https://api.waifu.pics/sfw/neko",
    headers: { "Accept": "application/json" },
    parse: (data) => data && typeof data.url === "string" ? [data.url] : []
  },
  {
    id: "safebooru",
    name: "Safebooru",
    kind: "safe 图片 · 标签筛选",
    url: "https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=rating%3Asafe&limit=20",
    headers: { "Accept": "application/json", "User-Agent": "Waifu-Gallery/1.0 (public safe image gallery)" },
    batchSize: 20,
    supportsTags: true,
    supportsBlockedTags: true,
    buildUrl: (tags, blockedTags = []) => {
      const target = new URL("https://safebooru.org/index.php");
      target.searchParams.set("page", "dapi");
      target.searchParams.set("s", "post");
      target.searchParams.set("q", "index");
      target.searchParams.set("json", "1");
      // Random ordering prevents every refresh from returning Safebooru's same first page.
      target.searchParams.set("tags", ["rating:safe", "order:random", ...tags, ...blockedTags.map((tag) => "-" + tag)].join(" "));
      target.searchParams.set("limit", "20");
      return target.toString();
    },
    parse: (data) => Array.isArray(data) ? data.map((item) => item.file_url).filter((url) => typeof url === "string" && url.length > 0) : [],
    parseItems: (data) => Array.isArray(data) ? data.map((item) => ({
      url: item && item.file_url,
      tags: typeof (item && item.tags) === "string" ? item.tags.split(/\\s+/).filter(Boolean) : null
    })) : []
  }
];

const CACHE_HEADERS = { "Cache-Control": "no-store" };
const TIMEOUT_MS = 30000;

function json(body, status = 200) {
  return Response.json(body, { status, headers: CACHE_HEADERS });
}

function normalizeTag(value) {
  return String(value || "").trim().toLowerCase().replace(/[\\s-]+/g, "_");
}

async function requestProvider(provider, tags = [], blockedTags = []) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const requestUrl = provider.buildUrl ? provider.buildUrl(tags, blockedTags) : provider.url;
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: provider.headers,
      signal: controller.signal
    });
    const elapsed = Date.now() - started;
    if (!response.ok) {
      return { provider: provider.id, name: provider.name, ok: false, latency: elapsed, error: "HTTP " + response.status };
    }
    if (provider.directImage) {
      const imageUrl = response.url;
      if (response.body) response.body.cancel().catch(() => {});
      if (typeof imageUrl === "string" && imageUrl.startsWith("https://")) {
        return { provider: provider.id, name: provider.name, ok: true, latency: elapsed, files: [imageUrl] };
      }
      return { provider: provider.id, name: provider.name, ok: false, latency: elapsed, error: "没有取得图片地址" };
    }
    const data = await response.json();
    let files;
    if (blockedTags.length && provider.parseItems) {
      const items = provider.parseItems(data);
      const blocked = new Set(blockedTags.map(normalizeTag));
      // Fail closed: when a provider doesn't return usable tag metadata, never
      // return an image that might violate the user's blocked-tag preferences.
      files = items.filter((item) => {
        if (!item || typeof item.url !== "string" || !item.url.startsWith("https://") || !Array.isArray(item.tags)) return false;
        const itemTags = new Set(item.tags.map(normalizeTag));
        return ![...blocked].some((tag) => itemTags.has(tag));
      }).map((item) => item.url);
    } else {
      files = provider.parse(data).filter((url) => typeof url === "string" && url.startsWith("https://"));
      if (blockedTags.length) files = [];
    }
    if (!files.length) {
      return { provider: provider.id, name: provider.name, ok: false, latency: elapsed, error: blockedTags.length ? "没有找到带有可验证标签且符合屏蔽条件的图片" : "返回数据中没有可用图片" };
    }
    return { provider: provider.id, name: provider.name, ok: true, latency: elapsed, files };
  } catch (error) {
    return {
      provider: provider.id,
      name: provider.name,
      ok: false,
      latency: Date.now() - started,
      error: error && error.name === "AbortError" ? "请求超时" : "连接失败"
    };
  } finally {
    clearTimeout(timer);
  }
}

async function collectProviderImages(provider, count, tags = [], blockedTags = []) {
  const results = [];
  const maxRequests = Math.min(count, provider.batchSize ? 100 : 20);
  // When blocking tags, rejected images must be replaced with fresh requests.
  // Bound retries to avoid an unending loop if the provider has no matching results.
  const requestBudget = blockedTags.length ? Math.min(300, maxRequests * 3) : maxRequests;
  const perCall = provider.batchSize || 1;
  let requestsMade = 0;
  while (results.length < maxRequests && requestsMade < requestBudget) {
    const remainingBudget = Math.ceil((requestBudget - requestsMade) / perCall);
    const neededCalls = Math.ceil((maxRequests - results.length) / perCall);
    const groupSize = Math.min(5, remainingBudget, Math.max(1, neededCalls));
    const group = await Promise.all(Array.from({ length: groupSize }, () => requestProvider(provider, tags, blockedTags)));
    requestsMade += groupSize * perCall;
    for (const result of group) {
      if (result.ok && Array.isArray(result.files)) results.push(...result.files);
    }
  }
  const unique = [...new Set(results)];
  return unique.slice(0, maxRequests);
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  const selected = url.searchParams.get("source") || "auto";
  const requestedCount = Number.parseInt(url.searchParams.get("count") || "100", 10);
  const count = Number.isFinite(requestedCount) ? Math.max(1, Math.min(100, requestedCount)) : 100;
  const rawTags = url.searchParams.getAll("tags").join(",");
  const tags = [...new Set(rawTags.split(/[\s,]+/).map((tag) => tag.trim()).filter(Boolean))];
  const rawBlockedTags = url.searchParams.getAll("blockedTags").join(",");
  const blockedTags = [...new Set(rawBlockedTags.split(/[\s,]+/).map((tag) => tag.trim()).filter(Boolean))];
  const validTag = (tag) => /^[a-zA-Z0-9_-]{1,64}$/.test(tag);
  if (tags.some((tag) => !validTag(tag)) || blockedTags.some((tag) => !validTag(tag))) {
    return json({ error: "标签格式无效：标签只能使用字母、数字、下划线或连字符。" }, 400);
  }
  if (blockedTags.length && !["auto", "safebooru", "waifuim", "nekosapi"].includes(selected)) {
    return json({ error: "屏蔽标签仅支持自动模式或 Safebooru 图片源。请切换图片源后重试。" }, 400);
  }

  if (mode === "download") {
    const rawImageUrl = url.searchParams.get("url");
    let imageUrl;
    try {
      imageUrl = new URL(rawImageUrl || "");
    } catch (_) {
      return json({ error: "无效的图片地址" }, 400);
    }
    const isPublicHttps = (candidate) => {
      const hostname = candidate.hostname.toLowerCase().replace(/\.$/, "");
      // Reject IP literals entirely; image sources should provide public hostnames.
      const isIpv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
      const isIpv6 = hostname.startsWith("[") || hostname.includes(":");
      const blockedSuffixes = [
        "localhost", "local", "internal", "test", "invalid", "example",
        "home", "lan", "localdomain"
      ];
      return candidate.protocol === "https:" &&
        !candidate.username && !candidate.password &&
        !isIpv4 && !isIpv6 &&
        hostname.includes(".") &&
        !blockedSuffixes.some((part) => hostname === part || hostname.endsWith("." + part)) &&
        ["443", ""].includes(candidate.port);
    };
    if (!isPublicHttps(imageUrl)) return json({ error: "仅支持公开 HTTPS 图片地址" }, 400);
    try {
      // Validate each redirect target before issuing the next request.
      let target = imageUrl;
      let imageResponse;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        for (let redirects = 0; redirects <= 4; redirects++) {
          imageResponse = await fetch(target.href, {
            headers: { "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
            signal: controller.signal,
            redirect: "manual"
          });
          if (![301, 302, 303, 307, 308].includes(imageResponse.status)) break;
          const location = imageResponse.headers.get("location");
          if (!location || redirects === 4) {
            if (imageResponse.body) imageResponse.body.cancel().catch(() => {});
            return json({ error: "图片重定向次数过多或地址无效" }, 502);
          }
          const nextTarget = new URL(location, target);
          if (!isPublicHttps(nextTarget)) {
            if (imageResponse.body) imageResponse.body.cancel().catch(() => {});
            return json({ error: "图片重定向地址不受支持" }, 400);
          }
          if (imageResponse.body) imageResponse.body.cancel().catch(() => {});
          target = nextTarget;
        }
      } finally {
        clearTimeout(timer);
      }
      if (!imageResponse || !imageResponse.ok) {
        const statusCode = imageResponse ? imageResponse.status : 502;
        if (imageResponse && imageResponse.body) imageResponse.body.cancel().catch(() => {});
        return json({ error: "图片服务器返回 HTTP " + statusCode }, 502);
      }
      const contentType = imageResponse.headers.get("content-type") || "application/octet-stream";
      if (!contentType.toLowerCase().startsWith("image/")) {
        if (imageResponse.body) imageResponse.body.cancel().catch(() => {});
        return json({ error: "目标地址没有返回图片文件" }, 415);
      }
      const maxBytes = 20 * 1024 * 1024;
      const declaredLength = Number(imageResponse.headers.get("content-length"));
      if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
        if (imageResponse.body) imageResponse.body.cancel().catch(() => {});
        return json({ error: "图片文件超过 20 MB 限制" }, 413);
      }
      const extension = contentType.toLowerCase().includes("png") ? "png" :
        contentType.toLowerCase().includes("webp") ? "webp" :
        contentType.toLowerCase().includes("gif") ? "gif" :
        contentType.toLowerCase().includes("avif") ? "avif" : "jpg";
      const headers = new Headers({
        "Content-Type": contentType,
        "Content-Disposition": 'attachment; filename="BzAxu-illustration.' + extension + '"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      // Enforce the size cap while streaming, including responses without Content-Length.
      let streamedBytes = 0;
      const limitedBody = imageResponse.body
        ? imageResponse.body.pipeThrough(new TransformStream({
            transform(chunk, controller) {
              streamedBytes += chunk.byteLength;
              if (streamedBytes > maxBytes) {
                controller.error(new Error("图片文件超过 20 MB 限制"));
                return;
              }
              controller.enqueue(chunk);
            }
          }))
        : null;
      return new Response(limitedBody, { status: 200, headers });
    } catch (error) {
      return json({ error: error && error.name === "AbortError" ? "下载图片超时" : "图片服务器暂时无法下载" }, 502);
    }
  }

  if (mode === "status") {
    const activeProviders = PROVIDERS.filter((provider) => !provider.retired);
    const results = await Promise.all(activeProviders.map(requestProvider));
    return json({
      providers: results.map(({ provider, name, ok, latency, error }) => ({
        id: provider, name, ok, latency, error: error || null
      })),
      checkedAt: new Date().toISOString()
    });
  }

  const activeProviders = PROVIDERS.filter((provider) => !provider.retired);
  const selectedProvider = activeProviders.find((provider) => provider.id === selected);
  if (tags.length && selected !== "auto" && (!selectedProvider || !selectedProvider.supportsTags)) {
    return json({ error: "当前图片源不支持标签筛选。请选择自动模式、Nekos API 或 Safebooru。" }, 400);
  }
  const candidates = selected === "auto"
    ? [...activeProviders].filter((provider) => blockedTags.length
        ? provider.supportsBlockedTags && typeof provider.parseItems === "function"
        : (!tags.length || provider.supportsTags))
        .sort((a, b) => blockedTags.length
          ? (a.id === "nekosapi" ? -1 : b.id === "nekosapi" ? 1 : a.id === "waifuim" ? -1 : b.id === "waifuim" ? 1 : (b.batchSize || 0) - (a.batchSize || 0))
          : (b.batchSize || 0) - (a.batchSize || 0))
    : activeProviders.filter((provider) => provider.id === selected);

  if (!candidates.length) return json({ error: "没有支持当前标签筛选的图片源。" }, 400);

  const failures = [];
  for (const provider of candidates) {
    const started = Date.now();
    const files = await collectProviderImages(provider, count, tags, blockedTags);
    if (files.length) {
      return json({
        files,
        source: provider.id,
        sourceName: provider.name,
        latency: Date.now() - started,
        fallback: selected === "auto" && failures.length > 0,
        failures
      });
    }
    failures.push({ source: provider.id, name: provider.name, error: "未能获取图片", latency: null });
    if (selected !== "auto") break;
  }

  return json({
    error: "当前没有可用的图片源，请查看各源状态后重试。",
    failures
  }, 502);
}
