import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_OWNER_USER_ID } from "./auth-config.js";

(() => {
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(SUPABASE_URL) &&
    SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("YOUR_") &&
    !SUPABASE_ANON_KEY.includes("SET_AFTER");
  let supabase = null;
  let session = null;
  let favorites = new Map();
  let favoritesOffset = 0;
  const pageSize = 50;
  let currentMode = "login";
  let lastFocus = null;

  const accountButton = document.createElement("button");
  accountButton.type = "button";
  accountButton.className = "button gallery-account-trigger";
  accountButton.textContent = "账号 / 收藏";
  accountButton.setAttribute("aria-haspopup", "dialog");
  accountButton.setAttribute("aria-expanded", "false");
  const heroBar = document.querySelector(".gallery-hero-bar");
  const menuButton = document.getElementById("galleryMenuOpen");
  if (heroBar) heroBar.insertBefore(accountButton, menuButton || null);

  const dialog = document.createElement("section");
  dialog.className = "gallery-auth-dialog";
  dialog.id = "galleryAuthDialog";
  dialog.hidden = true;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "galleryAuthTitle");
  dialog.innerHTML = `
    <button class="gallery-auth-backdrop" type="button" data-auth-close aria-label="关闭账号面板"></button>
    <div class="gallery-auth-card">
      <button class="gallery-auth-close" type="button" data-auth-close aria-label="关闭">×</button>
      <div class="gallery-auth-eyebrow">WAIFU / ACCOUNT</div>
      <h2 id="galleryAuthTitle">账号与收藏</h2>
      <p class="gallery-auth-description">内测账号需要邀请码。登录后，收藏会跟随账号同步。</p>
      <p class="gallery-auth-status" id="galleryAuthStatus" role="status" aria-live="polite"></p>
      <section id="galleryAuthUnconfigured" class="gallery-auth-note" hidden>
        <strong>账号系统尚未配置</strong>
        <p>请先完成 Supabase 项目配置、数据库迁移和 Cloudflare 环境变量设置。具体步骤见仓库 README。</p>
      </section>
      <section id="galleryAuthSignedOut" hidden>
        <div class="gallery-auth-tabs" role="tablist" aria-label="账号操作">
          <button type="button" data-auth-mode="login" role="tab">登录</button>
          <button type="button" data-auth-mode="register" role="tab">内测注册</button>
        </div>
        <form id="galleryAuthLogin" class="gallery-auth-form">
          <label>邮箱<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="name@example.com"></label>
          <label>密码<input name="password" type="password" autocomplete="current-password" required minlength="8" maxlength="128" placeholder="至少 8 位"></label>
          <button class="button gallery-auth-primary" type="submit">登录</button>
          <button class="gallery-auth-text-button" id="galleryAuthForgot" type="button">忘记密码？发送重置邮件</button>
        </form>
        <form id="galleryAuthRegister" class="gallery-auth-form" hidden>
          <label>邮箱<input name="email" type="email" autocomplete="email" required maxlength="254" placeholder="name@example.com"></label>
          <label>内测邀请码<input name="inviteCode" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" required maxlength="14" pattern="[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}" placeholder="ABCD-EFGH-JK23"></label>
          <p class="gallery-auth-hint">提交后会向邮箱发送邀请链接。打开链接后即可设置密码。每个邀请码仅能注册一次。</p>
          <button class="button gallery-auth-primary" type="submit">验证邀请码并发送邮件</button>
        </form>
      </section>
      <form id="galleryAuthSetPassword" class="gallery-auth-form" hidden>
        <label>设置新密码<input name="password" type="password" autocomplete="new-password" required minlength="8" maxlength="128" placeholder="至少 8 位"></label>
        <label>再次输入密码<input name="confirmPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128" placeholder="再次输入密码"></label>
        <button class="button gallery-auth-primary" type="submit">保存密码</button>
      </form>
      <section id="galleryAuthSignedIn" hidden>
        <div class="gallery-auth-user"><span class="gallery-auth-avatar" aria-hidden="true">✦</span><div><strong id="galleryAuthEmail"></strong><small>已登录</small></div></div>
        <div class="gallery-auth-actions">
          <button class="button" id="galleryAuthShowFavorites" type="button">我的收藏</button>
          <button class="button" id="galleryAuthLogout" type="button">退出登录</button>
        </div>
        <section class="gallery-auth-favorites" id="galleryAuthFavorites" hidden>
          <div class="gallery-auth-section-head"><h3>云端收藏</h3><button class="gallery-auth-text-button" id="galleryAuthRefreshFavorites" type="button">刷新</button></div>
          <p class="gallery-auth-hint" id="galleryAuthFavoritesHint">每次最多加载 50 条。</p>
          <div class="gallery-auth-favorite-list" id="galleryAuthFavoriteList"></div>
          <button class="button gallery-auth-more" id="galleryAuthMoreFavorites" type="button" hidden>加载更多收藏</button>
        </section>
        <section class="gallery-auth-admin" id="galleryAuthAdmin" hidden>
          <div class="gallery-auth-section-head"><h3>站长 · 邀请码</h3><span>仅站长可管理</span></div>
          <form id="galleryAuthGenerateCodes" class="gallery-auth-generate">
            <label>生成数量<input name="count" type="number" min="1" max="20" value="5" required></label>
            <button class="button" type="submit">生成邀请码</button>
          </form>
          <p class="gallery-auth-hint">新生成的邀请码只显示一次，请立即复制保存。数据库只保存哈希值。</p>
          <div id="galleryAuthNewCodes" class="gallery-auth-new-codes" hidden></div>
          <div id="galleryAuthCodeList" class="gallery-auth-code-list"></div>
          <button class="button gallery-auth-more" id="galleryAuthRefreshCodes" type="button">刷新邀请码列表</button>
        </section>
      </section>
    </div>`;
  document.body.append(dialog);

  const $ = (selector) => dialog.querySelector(selector);
  const status = $("#galleryAuthStatus");
  const signedOut = $("#galleryAuthSignedOut");
  const signedIn = $("#galleryAuthSignedIn");
  const setPasswordForm = $("#galleryAuthSetPassword");
  const loginForm = $("#galleryAuthLogin");
  const registerForm = $("#galleryAuthRegister");
  const favoritesSection = $("#galleryAuthFavorites");
  const favoriteList = $("#galleryAuthFavoriteList");
  const favoritesHint = $("#galleryAuthFavoritesHint");
  const moreFavoritesButton = $("#galleryAuthMoreFavorites");
  const adminSection = $("#galleryAuthAdmin");
  const codeList = $("#galleryAuthCodeList");
  const newCodesBox = $("#galleryAuthNewCodes");
  const lightbox = document.getElementById("galleryLightbox");
  const lightboxCard = lightbox?.querySelector(".gallery-lightbox-card");
  const lightboxImage = document.getElementById("galleryLightboxImage");
  const lightboxTitle = document.getElementById("galleryLightboxTitle");
  let favoriteButton = null;

  function setStatus(message = "", kind = "") {
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function openDialog(mode = currentMode) {
    lastFocus = document.activeElement;
    dialog.hidden = false;
    accountButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("gallery-auth-open");
    if (!configured) {
      $("#galleryAuthUnconfigured").hidden = false;
      signedOut.hidden = true;
      signedIn.hidden = true;
      setPasswordForm.hidden = true;
    } else {
      $("#galleryAuthUnconfigured").hidden = true;
      updateAccountView();
      if (!session) showMode(mode);
    }
    dialog.querySelector(".gallery-auth-close").focus({ preventScroll: true });
  }

  function closeDialog() {
    if (dialog.hidden) return;
    dialog.hidden = true;
    accountButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("gallery-auth-open");
    lastFocus?.focus?.({ preventScroll: true });
  }

  function showMode(mode) {
    currentMode = mode === "register" ? "register" : "login";
    loginForm.hidden = currentMode !== "login";
    registerForm.hidden = currentMode !== "register";
    setPasswordForm.hidden = true;
    signedOut.hidden = Boolean(session);
    signedIn.hidden = !session;
    dialog.querySelectorAll("[data-auth-mode]").forEach((button) => {
      const active = button.dataset.authMode === currentMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    setStatus("");
  }

  function updateAccountView() {
    signedOut.hidden = Boolean(session);
    signedIn.hidden = !session;
    if (session) {
      $("#galleryAuthEmail").textContent = session.user.email || "已登录账号";
      adminSection.hidden = !(SITE_OWNER_USER_ID && session.user.id === SITE_OWNER_USER_ID);
      refreshFavoriteButton();
    } else {
      favoritesSection.hidden = true;
      adminSection.hidden = true;
      refreshFavoriteButton();
    }
  }

  function refreshFavoriteButton() {
    if (!favoriteButton || !lightboxImage) return;
    const hasSource = Boolean(lightboxImage.getAttribute("src"));
    const url = hasSource ? (lightboxImage.currentSrc || lightboxImage.src) : "";
    const isSaved = Boolean(session && url && favorites.has(url));
    favoriteButton.textContent = isSaved ? "★ 已收藏" : "☆ 收藏";
    favoriteButton.classList.toggle("is-saved", isSaved);
    favoriteButton.disabled = !configured;
    favoriteButton.title = session ? (isSaved ? "取消收藏" : "保存到云端收藏") : "登录后即可收藏";
  }

  async function ensureClient() {
    if (!configured) throw new Error("账号系统尚未配置，请先完成 README 中的 Supabase 配置。");
    if (supabase) return supabase;
    const module = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = module.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await supabase.auth.getSession();
    session = data.session;
    supabase.auth.onAuthStateChange((event, nextSession) => {
      session = nextSession;
      updateAccountView();
      if (session) {
        void loadFavorites(true);
        if (SITE_OWNER_USER_ID && session.user.id === SITE_OWNER_USER_ID) void loadInviteCodes();
      } else {
        favorites.clear();
        renderFavorites();
      }
      if (!dialog.hidden) {
        if (session) updateAccountView();
        else showMode(currentMode);
      }
      refreshFavoriteButton();
      if (event === "PASSWORD_RECOVERY" || window.location.hash.includes("type=invite") || window.location.hash.includes("type=recovery")) {
        openDialog();
        setPasswordForm.hidden = false;
        signedOut.hidden = true;
        signedIn.hidden = true;
        setStatus("请设置账号密码以完成验证。");
      }
    });
    if (window.location.hash.includes("type=invite") || window.location.hash.includes("type=recovery")) {
      openDialog();
      setPasswordForm.hidden = false;
      signedOut.hidden = true;
      signedIn.hidden = true;
      setStatus("请设置账号密码以完成验证。");
    }
    return supabase;
  }

  accountButton.addEventListener("click", () => openDialog());
  dialog.querySelectorAll("[data-auth-close]").forEach((button) => button.addEventListener("click", closeDialog));
  dialog.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => showMode(button.dataset.authMode)));
  document.addEventListener("keydown", (event) => {
    if (dialog.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
    } else if (event.key === "Tab") {
      const controls = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], select:not([disabled])')]
        .filter((element) => !element.hidden && element.getClientRects().length);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(loginForm);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");
    const submit = loginForm.querySelector('[type="submit"]');
    submit.disabled = true;
    setStatus("正在登录…");
    try {
      const client = await ensureClient();
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setStatus("登录成功。", "success");
      updateAccountView();
    } catch (error) {
      setStatus(error.message || "登录失败，请检查邮箱和密码。", "error");
    } finally { submit.disabled = false; }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(registerForm);
    const email = String(form.get("email") || "").trim().toLowerCase();
    const inviteCode = String(form.get("inviteCode") || "").trim().toUpperCase();
    const submit = registerForm.querySelector('[type="submit"]');
    submit.disabled = true;
    setStatus("正在验证邀请码并发送邀请邮件…");
    try {
      await ensureClient();
      const response = await fetch(authApiUrl("/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email, inviteCode })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "注册请求失败。");
      setStatus(result.message || "邀请邮件已发送，请查收邮箱。", "success");
      registerForm.reset();
    } catch (error) {
      setStatus(error.message || "注册失败，请稍后重试。", "error");
    } finally { submit.disabled = false; }
  });

  $("#galleryAuthForgot").addEventListener("click", async () => {
    const email = String(new FormData(loginForm).get("email") || "").trim().toLowerCase();
    if (!email) return setStatus("请先在邮箱框中填写注册邮箱。", "error");
    try {
      const client = await ensureClient();
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: siteBaseUrl() });
      if (error) throw error;
      setStatus("如果该邮箱已注册，系统会发送密码重置邮件。", "success");
    } catch (error) { setStatus(error.message || "无法发送重置邮件。", "error"); }
  });

  setPasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(setPasswordForm);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    if (password !== confirmPassword) return setStatus("两次输入的密码不一致。", "error");
    if (password.length < 8) return setStatus("密码至少需要 8 位。", "error");
    const submit = setPasswordForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const client = await ensureClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      setPasswordForm.reset();
      setPasswordForm.hidden = true;
      setStatus("密码已保存，账号已就绪。", "success");
      history.replaceState(history.state, "", window.location.pathname + window.location.search);
      const { data } = await client.auth.getSession();
      session = data.session;
      updateAccountView();
    } catch (error) {
      setStatus(error.message || "密码设置失败，请重新打开邮件链接。", "error");
    } finally { submit.disabled = false; }
  });

  $("#galleryAuthLogout").addEventListener("click", async () => {
    try {
      const client = await ensureClient();
      const { error } = await client.auth.signOut();
      if (error) throw error;
      session = null;
      favorites.clear();
      updateAccountView();
      showMode("login");
      setStatus("已退出登录。", "success");
    } catch (error) { setStatus(error.message || "退出登录失败。", "error"); }
  });

  $("#galleryAuthShowFavorites").addEventListener("click", async () => {
    favoritesSection.hidden = !favoritesSection.hidden;
    if (!favoritesSection.hidden) await loadFavorites(true);
  });
  $("#galleryAuthRefreshFavorites").addEventListener("click", () => loadFavorites(true));
  moreFavoritesButton.addEventListener("click", () => loadFavorites(false));

  async function loadFavorites(reset) {
    if (!session) return;
    if (reset) {
      favoritesOffset = 0;
      favorites.clear();
      favoriteList.replaceChildren();
      moreFavoritesButton.hidden = true;
    }
    favoritesHint.textContent = "正在读取云端收藏…";
    try {
      const client = await ensureClient();
      const from = favoritesOffset;
      const to = from + pageSize - 1;
      const { data, error } = await client.from("favorites")
        .select("id,image_url,source,title,created_at")
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      for (const item of data || []) favorites.set(item.image_url, item);
      favoritesOffset += (data || []).length;
      renderFavorites();
      favoritesHint.textContent = favorites.size ? "已加载 " + favorites.size + " 条收藏。" : "还没有收藏图片。打开图片预览后点“收藏”即可保存。";
      moreFavoritesButton.hidden = !data || data.length < pageSize;
      refreshFavoriteButton();
    } catch (error) {
      favoritesHint.textContent = error.message || "读取收藏失败，请检查数据库迁移和 RLS 策略。";
    }
  }

  function renderFavorites() {
    favoriteList.replaceChildren();
    const items = [...favorites.values()];
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "gallery-auth-empty";
      empty.textContent = "这里还没有收藏。";
      favoriteList.append(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement("article");
      row.className = "gallery-auth-favorite";
      const image = document.createElement("img");
      image.loading = "lazy";
      image.alt = item.title || "已收藏插画";
      image.src = item.image_url;
      image.addEventListener("error", () => { image.classList.add("is-broken"); image.alt = "图片链接可能已失效"; }, { once: true });
      const details = document.createElement("div");
      details.className = "gallery-auth-favorite-details";
      const title = document.createElement("strong");
      title.textContent = item.title || "随机插画";
      const date = document.createElement("small");
      date.textContent = item.created_at ? new Date(item.created_at).toLocaleDateString() : "";
      const actions = document.createElement("div");
      actions.className = "gallery-auth-favorite-actions";
      const open = document.createElement("a");
      open.href = item.image_url;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.textContent = "打开原图 ↗";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "取消收藏";
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          const client = await ensureClient();
          const { error } = await client.from("favorites").delete().eq("image_url", item.image_url);
          if (error) throw error;
          favorites.delete(item.image_url);
          renderFavorites();
          favoritesHint.textContent = "已取消收藏。";
          refreshFavoriteButton();
        } catch (error) {
          favoritesHint.textContent = error.message || "取消收藏失败。";
          remove.disabled = false;
        }
      });
      actions.append(open, remove);
      details.append(title, date, actions);
      row.append(image, details);
      favoriteList.append(row);
    }
  }

  function authApiUrl(path) {
    const prefix = window.location.pathname.startsWith("/Waifu-Gallery") ? "/Waifu-Gallery" : "";
    return prefix + "/api/auth" + path;
  }

  function siteBaseUrl() {
    const url = new URL(window.location.href);
    url.hash = "";
    url.search = "";
    if (url.pathname.startsWith("/Waifu-Gallery")) url.pathname = "/Waifu-Gallery/";
    else url.pathname = "/";
    return url.toString();
  }

  async function adminRequest(method, payload = null) {
    if (!session) throw new Error("请先登录站长账号。");
    const response = await fetch(authApiUrl("/admin/codes"), {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "Bearer " + session.access_token
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "站长管理请求失败。");
    return result;
  }

  async function loadInviteCodes() {
    if (!session || !SITE_OWNER_USER_ID || session.user.id !== SITE_OWNER_USER_ID) return;
    codeList.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "gallery-auth-empty";
    loading.textContent = "正在读取邀请码…";
    codeList.append(loading);
    try {
      const result = await adminRequest("GET");
      codeList.replaceChildren();
      if (!result.codes.length) {
        loading.textContent = "还没有邀请码，请生成一批。";
        codeList.append(loading);
        return;
      }
      for (const code of result.codes) {
        const row = document.createElement("div");
        row.className = "gallery-auth-code-row";
        const label = document.createElement("div");
        label.className = "gallery-auth-code-label";
        const strong = document.createElement("strong");
        strong.textContent = code.used_at ? "已使用" : code.revoked_at ? "已撤销" : code.reserved_until && new Date(code.reserved_until) > new Date() ? "注册处理中" : "未使用";
        const meta = document.createElement("small");
        meta.textContent = code.used_email || ("创建于 " + new Date(code.created_at).toLocaleDateString());
        label.append(strong, meta);
        row.append(label);
        if (!code.used_at && !code.revoked_at) {
          const revoke = document.createElement("button");
          revoke.type = "button";
          revoke.textContent = "撤销";
          revoke.addEventListener("click", async () => {
            revoke.disabled = true;
            try { await adminRequest("PATCH", { id: code.id }); await loadInviteCodes(); }
            catch (error) { setStatus(error.message || "撤销失败。", "error"); revoke.disabled = false; }
          });
          row.append(revoke);
        }
        codeList.append(row);
      }
    } catch (error) {
      codeList.replaceChildren();
      const message = document.createElement("p");
      message.className = "gallery-auth-empty";
      message.textContent = error.message || "读取邀请码失败。";
      codeList.append(message);
    }
  }

  $("#galleryAuthGenerateCodes").addEventListener("submit", async (event) => {
    event.preventDefault();
    const count = Number(new FormData(event.currentTarget).get("count"));
    const submit = event.currentTarget.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const result = await adminRequest("POST", { count });
      newCodesBox.replaceChildren();
      result.codes.forEach((entry) => {
        const row = document.createElement("div");
        row.className = "gallery-auth-new-code";
        const code = document.createElement("code");
        code.textContent = entry.code;
        const copy = document.createElement("button");
        copy.type = "button";
        copy.textContent = "复制";
        copy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(entry.code);
            copy.textContent = "已复制";
          } catch (_) { setStatus("浏览器不允许自动复制，请长按邀请码手动复制。", "error"); }
        });
        row.append(code, copy);
        newCodesBox.append(row);
      });
      newCodesBox.hidden = false;
      setStatus("已生成 " + result.codes.length + " 个邀请码。请立即复制保存；关闭后无法再次查看完整码。", "success");
      await loadInviteCodes();
    } catch (error) { setStatus(error.message || "生成邀请码失败。", "error"); }
    finally { submit.disabled = false; }
  });
  $("#galleryAuthRefreshCodes").addEventListener("click", loadInviteCodes);

  if (lightboxCard) {
    favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "button gallery-auth-favorite-toggle";
    favoriteButton.textContent = "☆ 收藏";
    const download = lightboxCard.querySelector(".gallery-download");
    if (download) lightboxCard.insertBefore(favoriteButton, download);
    else lightboxCard.append(favoriteButton);
    lightboxImage?.addEventListener("load", refreshFavoriteButton);
    favoriteButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!session) {
        openDialog("login");
        setStatus("请登录后再收藏图片。");
        return;
      }
      const url = lightboxImage?.currentSrc || lightboxImage?.src;
      if (!url || !url.startsWith("https://")) return setStatus("当前图片地址无效，无法收藏。", "error");
      favoriteButton.disabled = true;
      try {
        const client = await ensureClient();
        if (favorites.has(url)) {
          const { error } = await client.from("favorites").delete().eq("image_url", url);
          if (error) throw error;
          favorites.delete(url);
          setStatus("已取消收藏。", "success");
        } else {
          const { error } = await client.from("favorites").insert({
            user_id: session.user.id,
            image_url: url,
            source: "third-party",
            title: lightboxTitle?.textContent || "随机插画"
          });
          if (error && error.code !== "23505") throw error;
          favorites.set(url, { image_url: url, source: "third-party", title: lightboxTitle?.textContent || "随机插画", created_at: new Date().toISOString() });
          setStatus("已保存到云端收藏。", "success");
        }
        renderFavorites();
        refreshFavoriteButton();
      } catch (error) {
        setStatus(error.message || "收藏操作失败，请检查数据库迁移和 RLS 策略。", "error");
      } finally { refreshFavoriteButton(); }
    });
  }

  async function boot() {
    if (!configured) {
      accountButton.title = "账号系统尚未配置";
      return;
    }
    try {
      await ensureClient();
      updateAccountView();
      if (session) {
        void loadFavorites(true);
        if (SITE_OWNER_USER_ID && session.user.id === SITE_OWNER_USER_ID) void loadInviteCodes();
      }
    } catch (error) {
      console.warn("Waifu-Gallery account initialization failed:", error);
      accountButton.title = "账号服务暂时不可用";
    }
  }

  if (configured) void boot();
})();
