const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function config(env) {
  const base = String(env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const ownerId = env.SITE_OWNER_USER_ID || "";
  if (!base.startsWith("https://") || !key || !ownerId) return null;
  return { base, key, ownerId };
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch (_) { return false; }
}

async function verifyOwner(request, settings) {
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const response = await fetch(settings.base + "/auth/v1/user", {
    headers: {
      "apikey": settings.key,
      "Authorization": "Bearer " + match[1],
      "Accept": "application/json"
    }
  });
  if (!response.ok) return false;
  const user = await response.json().catch(() => null);
  return Boolean(user && user.id && user.id === settings.ownerId && user.email_confirmed_at);
}

function adminHeaders(settings, prefer = "") {
  const headers = {
    "apikey": settings.key,
    "Authorization": "Bearer " + settings.key,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

async function hashCode(code) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const value = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
  return value.slice(0, 4) + "-" + value.slice(4, 8) + "-" + value.slice(8, 12);
}

export async function onRequest({ request, env }) {
  if (!["GET", "POST", "PATCH"].includes(request.method)) {
    return reply({ error: "不支持的请求方法。" }, 405);
  }
  if (!sameOrigin(request)) return reply({ error: "请求来源不受支持。" }, 403);
  const settings = config(env);
  if (!settings) return reply({ error: "站长管理接口尚未完成配置。" }, 503);

  let isOwner = false;
  try { isOwner = await verifyOwner(request, settings); }
  catch (_) { isOwner = false; }
  if (!isOwner) return reply({ error: "仅站长账号可以管理邀请码。" }, 403);

  if (request.method === "GET") {
    const response = await fetch(
      settings.base + "/rest/v1/invite_codes?select=id,created_at,expires_at,used_at,used_email,revoked_at,reserved_until&order=created_at.desc&limit=100",
      { headers: adminHeaders(settings) }
    );
    const rows = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(rows)) return reply({ error: "无法读取邀请码列表。" }, 502);
    return reply({ codes: rows });
  }

  let input;
  try { input = await request.json(); }
  catch (_) { return reply({ error: "请求数据格式无效。" }, 400); }

  if (request.method === "POST") {
    const count = Number.isInteger(input.count) ? input.count : 1;
    if (count < 1 || count > 20) return reply({ error: "每次只能生成 1–20 个邀请码。" }, 400);
    const created = [];
    for (let index = 0; index < count; index++) {
      const code = makeCode();
      const response = await fetch(settings.base + "/rest/v1/invite_codes", {
        method: "POST",
        headers: adminHeaders(settings, "return=representation"),
        body: JSON.stringify({
          code_hash: await hashCode(code),
          created_by: settings.ownerId
        })
      });
      const rows = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(rows) || !rows[0]) {
        console.error("Invite code creation failed:", response.status);
        return reply({ error: "生成邀请码时发生错误；已成功生成的码不会被撤销，请刷新列表核对。" }, 502);
      }
      created.push({ id: rows[0].id, code, created_at: rows[0].created_at });
    }
    // Plaintext codes are returned only once. Only hashes are stored in the database.
    return reply({ codes: created }, 201);
  }

  const id = typeof input.id === "string" ? input.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return reply({ error: "邀请码 ID 无效。" }, 400);
  const response = await fetch(
    settings.base + "/rest/v1/invite_codes?id=eq." + encodeURIComponent(id) + "&used_at=is.null&revoked_at=is.null",
    {
      method: "PATCH",
      headers: adminHeaders(settings, "return=representation"),
      body: JSON.stringify({ revoked_at: new Date().toISOString(), reserved_token: null, reserved_until: null })
    }
  );
  const rows = await response.json().catch(() => null);
  if (!response.ok) return reply({ error: "无法撤销该邀请码。" }, 502);
  if (!Array.isArray(rows) || !rows.length) return reply({ error: "邀请码不存在、已使用或已撤销。" }, 409);
  return reply({ success: true });
}
