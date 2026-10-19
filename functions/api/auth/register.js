const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function config(env) {
  const base = String(env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!base.startsWith("https://") || !key) return null;
  return { base, key };
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch (_) { return false; }
}

async function hashCode(code) {
  const bytes = new TextEncoder().encode(code.trim().toUpperCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function rpc(settings, name, body) {
  const response = await fetch(settings.base + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      "apikey": settings.key,
      "Authorization": "Bearer " + settings.key,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(body)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Supabase RPC " + name + " failed with HTTP " + response.status);
  return result;
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return reply({ error: "请求来源不受支持。" }, 403);
  const settings = config(env);
  if (!settings) return reply({ error: "账号系统尚未配置 Supabase 服务端密钥。" }, 503);

  let input;
  try { input = await request.json(); }
  catch (_) { return reply({ error: "请求数据格式无效。" }, 400); }

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const code = typeof input.inviteCode === "string" ? input.inviteCode.trim().toUpperCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return reply({ error: "请输入有效的邮箱地址。" }, 400);
  }
  if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code)) {
    return reply({ error: "邀请码格式无效，请检查后重试。" }, 400);
  }

  const codeHash = await hashCode(code);
  const reservationToken = crypto.randomUUID();
  try {
    const reserved = await rpc(settings, "reserve_invite_code", {
      p_code_hash: codeHash,
      p_email: email,
      p_token: reservationToken
    });
    if (reserved !== true) return reply({ error: "邀请码无效、已使用、已撤销或已过期。" }, 400);
  } catch (error) {
    console.error("Invite reservation failed:", error);
    return reply({ error: "邀请码服务暂时不可用，请稍后重试。" }, 503);
  }

  const requestUrl = new URL(request.url);
  const prefix = requestUrl.pathname.startsWith("/Waifu-Gallery/") ? "/Waifu-Gallery/" : "/";
  const siteBase = String(env.SITE_BASE_URL || (requestUrl.origin + prefix)).replace(/\/+$/, "") + "/";
  let inviteSent = false;
  try {
    const inviteResponse = await fetch(settings.base + "/auth/v1/invite?redirect_to=" + encodeURIComponent(siteBase), {
      method: "POST",
      headers: {
        "apikey": settings.key,
        "Authorization": "Bearer " + settings.key,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({ email })
    });
    const inviteResult = await inviteResponse.json().catch(() => ({}));
    if (!inviteResponse.ok) {
      await rpc(settings, "release_invite_code", {
        p_code_hash: codeHash,
        p_token: reservationToken
      }).catch(() => false);
      const message = inviteResponse.status === 422
        ? "该邮箱可能已经注册，请尝试登录或联系站长。"
        : "暂时无法发送邀请邮件，请稍后重试或联系站长。";
      console.warn("Supabase invite request failed:", inviteResponse.status);
      return reply({ error: message }, inviteResponse.status === 429 ? 429 : 400);
    }

    inviteSent = true;
    let completed = false;
    try {
      completed = await rpc(settings, "complete_invite_code", {
        p_code_hash: codeHash,
        p_email: email,
        p_token: reservationToken
      });
    } catch (completionError) {
      console.error("Invitation sent but invite-code completion failed:", completionError);
    }
    if (completed !== true) {
      // Do not release a code after the invitation has already been sent.
      console.error("Invitation sent but invite-code completion needs manual review.");
      return reply({ message: "邀请邮件已发送。若该邀请码仍显示为处理中，请联系站长核对。" }, 200);
    }
    return reply({ message: "邀请邮件已发送，请查收邮箱并打开邮件链接设置密码。若未收到，请检查垃圾邮件。" });
  } catch (error) {
    console.error("Invite request failed:", error);
    // Only release the reservation if the invitation was not sent. Otherwise
    // releasing could allow the same single-use code to invite another address.
    if (!inviteSent) {
      await rpc(settings, "release_invite_code", {
        p_code_hash: codeHash,
        p_token: reservationToken
      }).catch(() => false);
    }
    return reply({ error: inviteSent
      ? "邀请邮件已发送，但邀请码状态确认失败，请联系站长核对，不要重复使用该码。"
      : "邀请服务暂时不可用，请稍后重试。" }, inviteSent ? 200 : 503);
  }
}
