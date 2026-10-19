// Waifu Gallery: public anime illustration aggregator using multiple image APIs.
(() => {
  const homePage = document.getElementById("top");
  const galleryPage = document.getElementById("galleryPage");
  const footer = document.querySelector("footer");
  const grid = document.getElementById("galleryGrid");
  const loadingGrid = document.createElement("div");
  loadingGrid.className = "gallery-grid gallery-loading-grid";
  loadingGrid.setAttribute("aria-hidden", "true");
  if (grid) grid.insertAdjacentElement("afterend", loadingGrid);
  const status = document.getElementById("galleryStatus");
  const empty = document.getElementById("galleryEmpty");
  const emptyTitle = document.getElementById("galleryEmptyTitle");
  const emptyText = document.getElementById("galleryEmptyText");
  const refreshButton = document.getElementById("galleryRefresh");
  const retryButton = document.getElementById("galleryRetry");
  const moreButton = document.getElementById("galleryMore");
  const sourceSelect = document.getElementById("gallerySourceSelect");
  const columnsSelect = document.getElementById("galleryColumnsSelect");
  const providerStatusList = document.getElementById("galleryProviderStatusList");
  const providerStatusRefresh = document.getElementById("galleryProviderStatusRefresh");
  const providerStatusSummary = document.getElementById("galleryProviderStatusSummary");
  const lightbox = document.getElementById("galleryLightbox");
  const lightboxImage = document.getElementById("galleryLightboxImage");
  const lightboxTitle = document.getElementById("galleryLightboxTitle");
  const sourceLink = document.getElementById("galleryPixivLink");
  if (!homePage || !galleryPage || !grid) return;

  // Stable masonry lanes: adding a later image never rebalances existing cards.
  let galleryLanes = [];
  let imageSequence = 0;
  let nextSequenceToRender = 0;
  let galleryGeneration = 0;
  const readyImages = new Map();

  function imageCount() {
    return grid.querySelectorAll(".gallery-item").length;
  }

  function setGalleryLaneCount(value) {
    const count = ["2", "3", "4", "5"].includes(value)
      ? Number(value)
      : (window.matchMedia("(max-width: 760px)").matches ? 2 : 3);
    const existingCards = [...grid.querySelectorAll(".gallery-item")];
    galleryLanes = Array.from({ length: count }, () => {
      const lane = document.createElement("div");
      lane.className = "gallery-column";
      return lane;
    });
    grid.replaceChildren(...galleryLanes);
    // Rebuild only when the user changes the column setting; keep card order.
    existingCards.forEach((card) => {
      const lane = galleryLanes.reduce((shortest, current) =>
        current.scrollHeight < shortest.scrollHeight ? current : shortest, galleryLanes[0]);
      lane.append(card);
    });
  }

  function flushReadyImages() {
    while (readyImages.has(nextSequenceToRender)) {
      const card = readyImages.get(nextSequenceToRender);
      readyImages.delete(nextSequenceToRender++);
      if (!card) continue;
      const lane = galleryLanes.reduce((shortest, current) =>
        current.scrollHeight < shortest.scrollHeight ? current : shortest, galleryLanes[0]);
      lane.append(card);
    }
  }

  // Custom theme-matched dropdowns; native selects remain as the state bridge.
  function enhanceSelect(select, key) {
    if (!select || select.dataset.customized === "true") return;
    select.dataset.customized = "true";
    select.classList.add("gallery-native-select");
    const wrapper = document.createElement("div");
    wrapper.className = "gallery-custom-select";
    wrapper.dataset.selectKey = key;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "gallery-custom-select-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    const valueText = document.createElement("span");
    valueText.className = "gallery-custom-select-value";
    const chevron = document.createElement("span");
    chevron.className = "gallery-custom-select-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.textContent = "⌄";
    trigger.append(valueText, chevron);
    const menu = document.createElement("div");
    menu.className = "gallery-custom-select-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    const options = [...select.options].map((option) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "gallery-custom-select-option";
      item.setAttribute("role", "option");
      item.dataset.value = option.value;
      item.textContent = option.textContent;
      item.addEventListener("click", () => {
        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        sync();
        close();
        trigger.focus();
      });
      menu.append(item);
      return { option, item };
    });
    function sync() {
      const selected = options.find(({ option }) => option.value === select.value) || options[0];
      valueText.textContent = selected ? selected.option.textContent : "";
      options.forEach(({ option, item }) => {
        const active = option.value === select.value;
        item.classList.toggle("is-selected", active);
        item.setAttribute("aria-selected", String(active));
      });
    }
    function close() {
      menu.hidden = true;
      wrapper.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
    trigger.addEventListener("click", () => {
      const opening = menu.hidden;
      document.querySelectorAll(".gallery-custom-select.is-open").forEach((other) => {
        other.classList.remove("is-open");
        const otherMenu = other.querySelector(".gallery-custom-select-menu");
        const otherTrigger = other.querySelector(".gallery-custom-select-trigger");
        if (otherMenu) otherMenu.hidden = true;
        if (otherTrigger) otherTrigger.setAttribute("aria-expanded", "false");
      });
      if (opening) {
        menu.hidden = false;
        wrapper.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      } else close();
    });
    wrapper.append(trigger, menu);
    select.insertAdjacentElement("afterend", wrapper);
    sync();
    select.addEventListener("change", sync);
    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) close();
    });
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowDown" && menu.hidden) {
        event.preventDefault();
        trigger.click();
        const selected = options.find(({ option }) => option.value === select.value);
        if (selected) selected.item.focus();
      }
    });
    menu.addEventListener("keydown", (event) => {
      const current = options.findIndex(({ item }) => item === document.activeElement);
      if (event.key === "Escape") { event.preventDefault(); close(); trigger.focus(); }
      else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
        options[next].item.focus();
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (current >= 0) options[current].item.click();
      }
    });
  }
  enhanceSelect(columnsSelect, "columns");
  enhanceSelect(sourceSelect, "source");

  // Keep each thumbnail's natural aspect ratio and allow users to choose a masonry column count.
  const columnsStorageKey = "bzaxu-gallery-columns";
  function applyColumnCount(value) {
    if (!grid) return;
    if (value === "auto" || !["2", "3", "4", "5"].includes(value)) {
      grid.style.removeProperty("--gallery-columns");
      if (columnsSelect) columnsSelect.value = "auto";
      setGalleryLaneCount("auto");
      try { localStorage.removeItem(columnsStorageKey); } catch (_) {}
      return;
    }
    grid.style.setProperty("--gallery-columns", value);
    if (columnsSelect) columnsSelect.value = value;
    setGalleryLaneCount(value);
    try { localStorage.setItem(columnsStorageKey, value); } catch (_) {}
  }
  if (columnsSelect) {
    let savedColumns = "auto";
    try {
      const saved = localStorage.getItem(columnsStorageKey);
      if (saved && ["2", "3", "4", "5"].includes(saved)) savedColumns = saved;
    } catch (_) {}
    applyColumnCount(savedColumns);
    columnsSelect.addEventListener("change", () => applyColumnCount(columnsSelect.value));
  }

  // Add a download action to the image preview without changing the page template.
  const lightboxCard = lightbox.querySelector(".gallery-lightbox-card");
  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.className = "button gallery-download";
  downloadButton.textContent = "↓ 下载图片";
  downloadButton.style.marginTop = "12px";
  downloadButton.style.width = "100%";
  lightboxCard.append(downloadButton);


  // Secondary settings menu for all gallery information and source controls.
  const settingsDialog = document.getElementById("gallerySettingsDialog");
  const settingsOpen = document.getElementById("galleryMenuOpen");
  let settingsTrigger = null;
  function openSettings() {
    if (!settingsDialog) return;
    settingsTrigger = document.activeElement;
    settingsDialog.hidden = false;
    document.body.classList.add("gallery-settings-open");
    const closeButton = settingsDialog.querySelector(".gallery-settings-close");
    if (closeButton) closeButton.focus();
  }
  function closeSettings() {
    if (!settingsDialog || settingsDialog.hidden) return;
    settingsDialog.hidden = true;
    document.body.classList.remove("gallery-settings-open");
    if (settingsTrigger && typeof settingsTrigger.focus === "function") settingsTrigger.focus();
  }
  if (settingsOpen) settingsOpen.addEventListener("click", openSettings);
  if (settingsDialog) {
    settingsDialog.querySelectorAll("[data-gallery-settings-close]").forEach((button) => button.addEventListener("click", closeSettings));
    document.addEventListener("keydown", (event) => {
      if (settingsDialog.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeSettings();
      } else if (event.key === "Tab") {
        const controls = [...settingsDialog.querySelectorAll("button, select")].filter((el) => !el.disabled);
        if (!controls.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  const seen = new Set();
  let loading = false;
  let lastBatchAdded = 1;
  let autoLoadArmed = true;
  let scrollObserver = null;
  let currentRoute = "home";
  let lightboxTrigger = null;
  let currentSourceName = "图片源";
  let checkingProviders = false;

  function transition(callback) {
    if (document.startViewTransition) document.startViewTransition(callback);
    else callback();
  }

  function renderRoute(route, { updateHistory = false, replace = false } = {}) {
    currentRoute = route === "gallery" ? "gallery" : "home";
    transition(() => {
      const isGallery = currentRoute === "gallery";
      document.body.classList.toggle("gallery-view-active", isGallery);
      homePage.hidden = isGallery;
      galleryPage.hidden = !isGallery;
      if (footer) footer.hidden = isGallery;
      window.scrollTo({ top: 0, behavior: "auto" });
      if (updateHistory) {
        const url = new URL(window.location.href);
        if (isGallery) url.searchParams.set("page", "gallery");
        else url.searchParams.delete("page");
        history[replace ? "replaceState" : "pushState"]({ view: currentRoute }, "", url);
      }
    });
    if (currentRoute === "gallery" && !imageCount() && !loading) loadImages({ reset: true, targetCount: 100 });
    if (currentRoute === "gallery") checkProviderStatus();
  }

  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-gallery-open]");
    if (open) {
      event.preventDefault();
      if (currentRoute !== "gallery") renderRoute("gallery", { updateHistory: true });
      return;
    }
    const home = event.target.closest("[data-gallery-home]");
    if (home && currentRoute === "gallery") {
      event.preventDefault();
      renderRoute("home", { updateHistory: true, replace: true });
    }
  });

  window.addEventListener("popstate", () => {
    // A Back action should dismiss the open image preview before leaving the gallery.
    if (!lightbox.hidden) {
      closeLightbox({ fromHistory: true });
      return;
    }
    renderRoute(new URL(window.location.href).searchParams.get("page") === "gallery" ? "gallery" : "home");
  });

  function setLoading(value) {
    loading = value;
    refreshButton.disabled = value;
    moreButton.disabled = value;
    retryButton.disabled = value;
    refreshButton.textContent = value ? "加载中…" : "↻ 刷新";
    moreButton.textContent = value ? "正在加载…" : "再看一些 ↓";
    if (value) {
      empty.hidden = true;
      status.textContent = "正在获取公开插画…";
    }
  }

  function addImage(url, sourceName = "图片源") {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    const sequence = imageSequence++;
    const generation = galleryGeneration;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gallery-item";
    card.setAttribute("aria-label", "查看插画");
    const img = document.createElement("img");
    img.loading = "eager";
    img.decoding = "async";
    img.alt = "插画";
    img.className = "is-loading";

    // Keep the unfinished image in a separate loading strip below the gallery.
    // Only move it into the gallery after the browser has fully loaded it.
    card.classList.add("gallery-item--pending");
    card.append(img);
    loadingGrid.append(card);

    img.addEventListener("load", () => {
      if (generation !== galleryGeneration) { card.remove(); return; }
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        img.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
        img.style.height = "auto";
        img.dataset.naturalRatio = img.naturalWidth + ":" + img.naturalHeight;
      }
      img.classList.remove("is-loading");
      card.classList.remove("gallery-item--pending");
      card.classList.add("gallery-item--loaded");
      // Queue by API order; only render in order, then place in the shortest fixed lane.
      readyImages.set(sequence, card);
      flushReadyImages();
    }, { once: true });

    img.addEventListener("error", () => {
      card.remove();
      if (generation !== galleryGeneration) return;
      seen.delete(url);
      readyImages.set(sequence, null);
      flushReadyImages();
    }, { once: true });

    img.src = url;
    card.dataset.sourceUrl = url;
    card.dataset.title = "随机插画";
    card.addEventListener("click", () => {
      lightboxTrigger = card;
      lightboxImage.src = url;
      lightboxTitle.textContent = card.dataset.title;
      sourceLink.href = url;
      sourceLink.textContent = "查看原图 ↗";
      downloadButton.dataset.downloadUrl = url;
      downloadButton.disabled = false;
      downloadButton.textContent = "↓ 下载图片";
      lightbox.hidden = false;
      document.body.classList.add("gallery-open");
      if (!history.state || !history.state.galleryLightbox) {
        history.pushState({ ...(history.state || {}), view: "gallery", galleryLightbox: true }, "", window.location.href);
      }
      lightbox.querySelector("[data-gallery-close]").focus();
    });
    return true;
  }

  async function loadImages({ reset = false, targetCount = 20 } = {}) {
    if (loading) return;
    let added = 0;
    if (reset) {
      galleryGeneration++;
      imageSequence = 0;
      nextSequenceToRender = 0;
      readyImages.clear();
      grid.querySelectorAll(".gallery-item").forEach((card) => card.remove());
      loadingGrid.replaceChildren();
      seen.clear();
    }
    const targetTotal = imageCount() + loadingGrid.children.length + Math.max(0, targetCount);
    setLoading(true);
    try {
      const source = sourceSelect ? sourceSelect.value : "auto";
      let attempts = 0;
      let lastLatency = null;
      let usedFallback = false;
      // Some public sources return only a small batch per request. Keep requesting
      // until the requested number of usable cards is queued, without endless retries.
      while (imageCount() + loadingGrid.children.length < targetTotal && attempts < 10) {
        attempts++;
        const response = await fetch("/api/gallery?source=" + encodeURIComponent(source) + "&count=100", {
          method: "GET",
          headers: { "Accept": "application/json" },
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || ("图片服务返回 HTTP " + response.status));
        if (!Array.isArray(data.files)) throw new Error("图片服务返回的数据格式不正确");
        let batchAdded = 0;
        currentSourceName = data.sourceName || "自动切换";
        lastLatency = Number.isFinite(data.latency) ? data.latency : null;
        usedFallback = usedFallback || Boolean(data.fallback);
        data.files.forEach((url) => {
          if (addImage(url, currentSourceName)) {
            batchAdded++;
            added++;
          }
        });
        if (!imageCount() && !loadingGrid.children.length) {
          throw new Error("暂时没有获取到图片，请稍后重试");
        }
        if (batchAdded === 0) break;
      }
      if (!imageCount() && !loadingGrid.children.length) {
        throw new Error("暂时没有获取到图片，请稍后重试");
      }
      const visibleCount = imageCount();
      const pendingCount = loadingGrid.children.length;
      status.textContent = currentSourceName + " · 已显示 " + visibleCount + " 张" +
        (pendingCount ? " · 另有 " + pendingCount + " 张加载中" : "") +
        " · API " + (lastLatency !== null ? lastLatency + " ms" : "响应正常") +
        (usedFallback ? " · 已自动切换备用源" : "");
    } catch (error) {
      console.warn("Gallery request failed:", error);
      if (!imageCount() && !loadingGrid.children.length) {
        empty.hidden = false;
        emptyTitle.textContent = "暂时无法加载画廊";
        emptyText.textContent = (error instanceof Error ? error.message : "图片服务连接失败") + "。请检查网络后重试。";
      }
      status.textContent = imageCount() || loadingGrid.children.length ? "部分图片加载失败，可重试" : "图片服务连接失败";
      if (providerStatusSummary) providerStatusSummary.textContent = "当前请求失败；可查看各源状态，或切换到自动模式。";
    } finally {
      lastBatchAdded = added;
      setLoading(false);
      // Re-evaluate the sentinel after a batch so short pages can fill the viewport,
      // while the no-new-images guard prevents endless automatic retries.
      if (scrollObserver && moreButton) {
        autoLoadArmed = true;
        scrollObserver.unobserve(moreButton);
        scrollObserver.observe(moreButton);
      }
    }
  }

  async function checkProviderStatus() {
    if (!providerStatusList || checkingProviders) return;
    checkingProviders = true;
    if (providerStatusRefresh) { providerStatusRefresh.disabled = true; providerStatusRefresh.textContent = "检测中…"; }
    if (providerStatusSummary) providerStatusSummary.textContent = "正在并行检测各图片源的响应速度…";
    providerStatusList.replaceChildren();
    try {
      const response = await fetch("/api/gallery?mode=status", { cache: "no-store", headers: { "Accept": "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.providers)) throw new Error(data.error || "状态接口暂时不可用");
      let online = 0;
      data.providers.forEach((provider) => {
        if (provider.ok) online++;
        const row = document.createElement("div");
        row.className = "gallery-provider-row" + (provider.ok ? " is-online" : " is-offline");
        const main = document.createElement("div");
        main.className = "gallery-provider-main";
        const name = document.createElement("strong");
        name.textContent = provider.name;
        const detail = document.createElement("span");
        detail.textContent = provider.ok ? "响应正常" : (provider.error || "不可用");
        main.append(name, detail);
        const metric = document.createElement("span");
        metric.className = "gallery-provider-latency";
        metric.textContent = Number.isFinite(provider.latency) ? provider.latency + " ms" : "—";
        const dot = document.createElement("span");
        dot.className = "gallery-provider-dot";
        dot.setAttribute("aria-hidden", "true");
        row.append(dot, main, metric);
        providerStatusList.append(row);
      });
      if (providerStatusSummary) providerStatusSummary.textContent = "在线 " + online + " / " + data.providers.length + " · 检测时间 " + new Date(data.checkedAt || Date.now()).toLocaleTimeString();
    } catch (error) {
      if (providerStatusSummary) providerStatusSummary.textContent = "状态检测失败：" + (error instanceof Error ? error.message : "网络错误");
    } finally {
      checkingProviders = false;
      if (providerStatusRefresh) { providerStatusRefresh.disabled = false; providerStatusRefresh.textContent = "重新检测"; }
    }
  }

  downloadButton.addEventListener("click", async () => {
    const url = downloadButton.dataset.downloadUrl;
    if (!url || downloadButton.disabled) return;
    const originalText = "↓ 下载图片";
    downloadButton.disabled = true;
    downloadButton.textContent = "正在准备下载…";
    try {
      const response = await fetch("/api/gallery?mode=download&url=" + encodeURIComponent(url), { cache: "no-store" });
      if (!response.ok) throw new Error("图片下载失败");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      const type = blob.type.toLowerCase();
      const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : type.includes("avif") ? "avif" : "jpg";
      link.download = "BzAxu-illustration-" + Date.now() + "." + extension;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      downloadButton.textContent = "✓ 已开始下载";
    } catch (error) {
      console.warn("Image download failed:", error);
      downloadButton.textContent = "无法直接下载，请点“查看原图”后保存";
    } finally {
      window.setTimeout(() => {
        downloadButton.disabled = false;
        if (downloadButton.textContent === "✓ 已开始下载" || downloadButton.textContent.startsWith("无法直接下载")) {
          downloadButton.textContent = originalText;
        }
      }, 2200);
    }
  });

  function closeLightbox({ fromHistory = false } = {}) {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxImage.removeAttribute("src");
    document.body.classList.remove("gallery-open");
    if (lightboxTrigger) lightboxTrigger.focus();
    lightboxTrigger = null;
    // Closing the preview should not navigate away from the gallery.
    // Clear the modal marker in-place instead of calling history.back(), which
    // could resolve to the empty home view on a direct gallery visit.
    if (!fromHistory && history.state && history.state.galleryLightbox) {
      const nextState = { ...history.state };
      delete nextState.galleryLightbox;
      history.replaceState(nextState, "", window.location.href);
    }
  }
  lightbox.querySelectorAll("[data-gallery-close]").forEach((button) => button.addEventListener("click", () => closeLightbox()));
  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const cards = [...grid.querySelectorAll(".gallery-item")];
      const index = cards.indexOf(lightboxTrigger);
      const next = cards[index + (event.key === "ArrowRight" ? 1 : -1)];
      if (next) {
        lightboxTrigger = next;
        lightboxImage.src = next.dataset.sourceUrl;
        lightboxTitle.textContent = next.dataset.title;
        sourceLink.href = next.dataset.sourceUrl;
        downloadButton.dataset.downloadUrl = next.dataset.sourceUrl;
        downloadButton.disabled = false;
        downloadButton.textContent = "↓ 下载图片";
      }
    }
  });

  refreshButton.addEventListener("click", () => loadImages({ reset: true, targetCount: 100 }));
  if (sourceSelect) sourceSelect.addEventListener("change", () => loadImages({ reset: true, targetCount: 100 }));
  if (providerStatusRefresh) providerStatusRefresh.addEventListener("click", checkProviderStatus);
  retryButton.addEventListener("click", () => loadImages({ reset: imageCount() === 0, targetCount: imageCount() === 0 ? 100 : 20 }));
  moreButton.addEventListener("click", () => loadImages({ targetCount: 20 }));

  // Infinite scroll: prefetch the next batch before the user reaches the bottom.
  // Re-arm only after the sentinel leaves the prefetch area; never spin on empty batches.
  if ("IntersectionObserver" in window && moreButton) {
    scrollObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          autoLoadArmed = true;
          continue;
        }
        if (autoLoadArmed && !loading && currentRoute === "gallery" && lastBatchAdded > 0) {
          autoLoadArmed = false;
          loadImages({ targetCount: 20 });
        }
      }
    }, { root: null, rootMargin: "700px 0px", threshold: 0 });
    scrollObserver.observe(moreButton);
  } else {
    // Fallback for older browsers without IntersectionObserver.
    let scrollCheckPending = false;
    window.addEventListener("scroll", () => {
      if (scrollCheckPending || loading || currentRoute !== "gallery" || lastBatchAdded <= 0) return;
      scrollCheckPending = true;
      requestAnimationFrame(() => {
        scrollCheckPending = false;
        const rect = moreButton.getBoundingClientRect();
        if (rect.top < window.innerHeight + 700) loadImages({ targetCount: 20 });
      });
    }, { passive: true });
  }

  const initialRoute = "gallery";
  renderRoute(initialRoute, { replace: true });
})();