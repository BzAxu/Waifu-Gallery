const PROVIDERS = [
  {
    id: "nekosapi",
    name: "Nekos API",
    kind: "开源动漫图 · safe 筛选",
    url: "https://api.nekosapi.com/v4/images/random/file?rating=safe",
    headers: { "Accept": "image/*" },
    directImage: true,
    parse: () => []
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
    id: "icatw",
    name: "Anime Image Gateway",
    kind: "多源随机动漫图",
    url: "https://api.icatw.site/api/v1/images/random?category=anime",
    headers: { "Accept": "application/json" },
    parse: (data) => data && data.success && data.data && typeof data.data.url === "string" ? [data.data.url] : []
  },
  {
    id: "waifuim",
    name: "Waifu.im（旧源）",
    kind: "旧服务 · 计划停运",
    retired: true,
    url: "https://api.waifu.im/images?IsNsfw=False&PageSize=10",
    headers: { "Accept": "application/json" },
    parse: (data) => Array.isArray(data.items) ? data.items.map((item) => item.url) : []
  }
];

const CACHE_HEADERS = { "Cache-Control": "no-store" };
const TIMEOUT_MS = 6500;

function json(body, status = 200) {
  return Response.json(body, { status, headers: CACHE_HEADERS });
}

async function requestProvider(provider) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(provider.url, {
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
    const urls = provider.parse(data).filter((url) => typeof url === "string" && url.startsWith("https://"));
    if (!urls.length) {
      return { provider: provider.id, name: provider.name, ok: false, latency: elapsed, error: "返回数据中没有可用图片" };
    }
    return { provider: provider.id, name: provider.name, ok: true, latency: elapsed, files: urls };
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

async function collectProviderImages(provider, count) {
  const results = [];
  const maxRequests = Math.min(count, provider.batchSize ? 100 : 20);
  // Request in small parallel groups to avoid overwhelming public APIs.
  const perCall = provider.batchSize || 1;
  const callsNeeded = Math.ceil(maxRequests / perCall);
  for (let offset = 0; offset < callsNeeded && results.length < maxRequests; offset += 5) {
    const groupSize = Math.min(5, callsNeeded - offset);
    const group = await Promise.all(Array.from({ length: groupSize }, () => requestProvider(provider)));
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
  const candidates = selected === "auto"
    ? [...activeProviders].sort((a, b) => (b.batchSize || 0) - (a.batchSize || 0))
    : activeProviders.filter((provider) => provider.id === selected);

  if (!candidates.length) return json({ error: "未知的图片源" }, 400);

  const failures = [];
  for (const provider of candidates) {
    const started = Date.now();
    const files = await collectProviderImages(provider, count);
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
