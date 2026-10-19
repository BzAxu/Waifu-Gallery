// Waifu Gallery: public anime illustration aggregator using multiple image APIs.
(() => {
  const homePage = document.getElementById("top");
  const galleryPage = document.getElementById("galleryPage");
  const footer = document.querySelector("footer");
  const grid = document.getElementById("galleryGrid");
  const status = document.getElementById("galleryStatus");
  const empty = document.getElementById("galleryEmpty");
  const emptyTitle = document.getElementById("galleryEmptyTitle");
  const emptyText = document.getElementById("galleryEmptyText");
  const refreshButton = document.getElementById("galleryRefresh");
  const retryButton = document.getElementById("galleryRetry");
  const moreButton = document.getElementById("galleryMore");
  const sourceSelect = document.getElementById("gallerySourceSelect");
  const tagInput = document.getElementById("galleryTagInput");
  const tagApplyButton = document.getElementById("galleryTagApply");
  const tagHint = document.getElementById("galleryTagHint");
  const tagDialog = document.getElementById("galleryTagDialog");
  const tagDialogOpen = document.getElementById("galleryTagOpen");
  const tagSettingsOpen = document.getElementById("galleryTagSettingsOpen");
  const tagOptions = document.getElementById("galleryTagOptions");
  const tagSelected = document.getElementById("galleryTagSelected");
  const tagCategoryTabs = document.getElementById("galleryTagCategoryTabs");
  const tagClearButton = document.getElementById("galleryTagClear");
  const tagConfirmButton = document.getElementById("galleryTagConfirm");
  const tagDialogHint = document.getElementById("galleryTagDialogHint");
  const columnsSelect = document.getElementById("galleryColumnsSelect");
  const providerStatusList = document.getElementById("galleryProviderStatusList");
  const providerStatusRefresh = document.getElementById("galleryProviderStatusRefresh");
  const providerStatusSummary = document.getElementById("galleryProviderStatusSummary");
  const lightbox = document.getElementById("galleryLightbox");
  const lightboxImage = document.getElementById("galleryLightboxImage");
  const lightboxTitle = document.getElementById("galleryLightboxTitle");
  const sourceLink = document.getElementById("galleryPixivLink");
  if (!homePage || !galleryPage || !grid) return;

  // Keep API requests inside the gallery subpath when proxied through bzaxu.top.
  // On the standalone Pages domain, continue using the normal /api/gallery endpoint.
  function galleryApiUrl(query = "") {
    const prefix = window.location.pathname.startsWith("/Waifu-Gallery") ? "/Waifu-Gallery" : "";
    return prefix + "/api/gallery" + query;
  }

  // Completed images use stable masonry lanes; pending image cards stay in a separate strip below.
  const loadingGrid = document.createElement("div");
  loadingGrid.className = "gallery-grid gallery-loading-grid";
  loadingGrid.setAttribute("aria-hidden", "true");
  loadingGrid.hidden = true;
  if (grid) grid.insertAdjacentElement("afterend", loadingGrid);
  let galleryLanes = [];
  let loadingLanes = [];
  let galleryGeneration = 0;

  function getShortestLane(lanes) {
    if (!lanes.length) return null;
    return lanes.reduce((shortest, current) =>
      current.getBoundingClientRect().height < shortest.getBoundingClientRect().height ? current : shortest,
      lanes[0]);
  }

  function getShortestGalleryLane() {
    if (!galleryLanes.length) setGalleryLaneCount("auto");
    return getShortestLane(galleryLanes);
  }

  function getShortestLoadingLane() {
    if (!loadingLanes.length) setGalleryLaneCount(columnsSelect?.value || "auto");
    return getShortestLane(loadingLanes);
  }

  function updateLoadingGridVisibility() {
    const hasLoadingContent = loadingGrid.querySelector(".gallery-item--pending, .gallery-skeleton-placeholder");
    loadingGrid.hidden = !hasLoadingContent;
  }

  function imageCount() {
    return grid.querySelectorAll(".gallery-item--loaded").length;
  }

  function pendingImageCount() {
    return loadingGrid.querySelectorAll(".gallery-item--pending").length;
  }

  function setGalleryLaneCount(value) {
    const count = ["2", "3", "4", "5"].includes(value)
      ? Number(value)
      : (window.matchMedia("(max-width: 760px)").matches ? 2 : 3);
    const existingItems = [...grid.querySelectorAll(":scope > .gallery-column > *")];
    const existingLoadingItems = [...loadingGrid.querySelectorAll(":scope > .gallery-loading-column > *")];
    galleryLanes = Array.from({ length: count }, () => {
      const lane = document.createElement("div");
      lane.className = "gallery-column";
      return lane;
    });
    loadingLanes = Array.from({ length: count }, () => {
      const lane = document.createElement("div");
      lane.className = "gallery-loading-column";
      return lane;
    });
    grid.replaceChildren(...galleryLanes);
    loadingGrid.replaceChildren(...loadingLanes);
    // Keep completed cards in the existing masonry lanes and loading cards in
    // a separate, matching set of vertical lanes below the completed gallery.
    existingItems.forEach((item) => getShortestGalleryLane().append(item));
    existingLoadingItems.forEach((item, index) => loadingLanes[index % count].append(item));
    if (value === "auto" || !["2", "3", "4", "5"].includes(value)) {
      loadingGrid.style.removeProperty("--gallery-columns");
    } else {
      loadingGrid.style.setProperty("--gallery-columns", value);
    }
    updateLoadingGridVisibility();
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
      // A layout change can move the load-more sentinel into the viewport.
      // Recheck after layout settles so the first screen doesn't remain sparse.
      requestAnimationFrame(() => checkAutoLoad());
      return;
    }
    grid.style.setProperty("--gallery-columns", value);
    if (columnsSelect) columnsSelect.value = value;
    setGalleryLaneCount(value);
    try { localStorage.setItem(columnsStorageKey, value); } catch (_) {}
    requestAnimationFrame(() => checkAutoLoad());
  }
  if (columnsSelect) {
    let savedColumns = "5";
    try {
      const saved = localStorage.getItem(columnsStorageKey);
      if (saved && ["2", "3", "4", "5"].includes(saved)) savedColumns = saved;
    } catch (_) {}
    applyColumnCount(savedColumns);
    columnsSelect.addEventListener("change", () => applyColumnCount(columnsSelect.value));
  }

  // Keep the number of fixed lanes in sync with the responsive CSS grid.
  let laneResizeFrame = 0;
  window.addEventListener("resize", () => {
    if (!columnsSelect || columnsSelect.value !== "auto") return;
    if (laneResizeFrame) cancelAnimationFrame(laneResizeFrame);
    laneResizeFrame = requestAnimationFrame(() => {
      laneResizeFrame = 0;
      const expectedCount = window.matchMedia("(max-width: 760px)").matches ? 2 : 3;
      if (galleryLanes.length !== expectedCount) setGalleryLaneCount("auto");
    });
  }, { passive: true });

  // Add a download action to the image preview without changing the page template.
  const lightboxCard = lightbox.querySelector(".gallery-lightbox-card");
  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.className = "button gallery-download";
  downloadButton.textContent = "↓ 下载图片";
  downloadButton.style.marginTop = "12px";
  downloadButton.style.width = "100%";
  lightboxCard.append(downloadButton);


  // Shared dialog lifecycle: animate both entrance and exit, while respecting reduced-motion preferences.
  const dialogCloseCleanup = new WeakMap();
  function openAnimatedDialog(dialog, bodyClass) {
    if (!dialog) return;
    const previousCleanup = dialogCloseCleanup.get(dialog);
    if (previousCleanup) previousCleanup();
    const panel = dialog.querySelector(".gallery-tag-card, .gallery-settings-card, .gallery-lightbox-card");
    dialog.hidden = false;
    dialog.classList.remove("is-opening", "is-closing");
    document.body.classList.add(bodyClass);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && panel) {
      void dialog.offsetWidth;
      dialog.classList.add("is-opening");
      const onOpenEnd = (event) => {
        if (event.target !== panel || event.animationName !== "galleryDialogPanelIn") return;
        dialog.classList.remove("is-opening");
        dialog.removeEventListener("animationend", onOpenEnd);
      };
      dialog.addEventListener("animationend", onOpenEnd);
    }
  }

  function closeAnimatedDialog(dialog, bodyClass, onClosed) {
    if (!dialog || dialog.hidden) {
      if (onClosed) onClosed();
      return;
    }
    if (dialog.classList.contains("is-closing")) return;
    const panel = dialog.querySelector(".gallery-tag-card, .gallery-settings-card, .gallery-lightbox-card");
    const finishImmediately = () => {
      dialog.hidden = true;
      dialog.classList.remove("is-opening", "is-closing");
      document.body.classList.remove(bodyClass);
      if (onClosed) onClosed();
    };
    if (!panel || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishImmediately();
      return;
    }

    dialog.classList.remove("is-opening");
    void dialog.offsetWidth;
    dialog.classList.add("is-closing");
    let finished = false;
    let timer = 0;
    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      dialog.removeEventListener("animationend", onAnimationEnd);
      if (dialogCloseCleanup.get(dialog) === cleanup) dialogCloseCleanup.delete(dialog);
    };
    const finish = () => {
      if (finished || !dialog.classList.contains("is-closing")) return;
      finished = true;
      cleanup();
      finishImmediately();
    };
    const onAnimationEnd = (event) => {
      if (event.target === panel && event.animationName === "galleryDialogPanelOut") finish();
    };
    dialog.addEventListener("animationend", onAnimationEnd);
    timer = window.setTimeout(finish, 420);
    dialogCloseCleanup.set(dialog, cleanup);
  }

  // Secondary settings menu for all gallery information and source controls.
  const settingsDialog = document.getElementById("gallerySettingsDialog");
  const settingsOpen = document.getElementById("galleryMenuOpen");
  const sidebar = document.getElementById("gallerySidebar");
  const sidebarBackdrop = document.getElementById("gallerySidebarBackdrop");
  const sidebarCloseButton = document.getElementById("gallerySidebarClose");
  const sidebarTagsButton = document.getElementById("gallerySidebarTags");
  const sidebarSettingsButton = document.getElementById("gallerySidebarSettings");
  let sidebarReturnFocus = null;
  function openSidebar() {
    if (!sidebar || !sidebarBackdrop) return;
    sidebarReturnFocus = document.activeElement;
    sidebarBackdrop.hidden = false;
    sidebar.inert = false;
    sidebar.setAttribute("aria-hidden", "false");
    settingsOpen?.setAttribute("aria-expanded", "true");
    document.body.classList.add("gallery-sidebar-open");
    requestAnimationFrame(() => {
      sidebar.classList.add("is-open");
      sidebarBackdrop.classList.add("is-open");
      sidebarCloseButton?.focus({ preventScroll: true });
    });
  }
  function closeSidebar({ restoreFocus = true } = {}) {
    if (!sidebar || !sidebarBackdrop || sidebarBackdrop.hidden) return;
    sidebar.classList.remove("is-open");
    sidebarBackdrop.classList.remove("is-open");
    sidebar.inert = true;
    sidebar.setAttribute("aria-hidden", "true");
    settingsOpen?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("gallery-sidebar-open");
    window.setTimeout(() => {
      if (!sidebar.classList.contains("is-open")) sidebarBackdrop.hidden = true;
    }, 360);
    if (restoreFocus) sidebarReturnFocus?.focus?.({ preventScroll: true });
  }
  settingsOpen?.addEventListener("click", openSidebar);
  sidebarCloseButton?.addEventListener("click", () => closeSidebar());
  sidebarBackdrop?.addEventListener("click", () => closeSidebar());
  sidebarTagsButton?.addEventListener("click", () => { closeSidebar({ restoreFocus: false }); settingsOpen?.focus({ preventScroll: true }); openTagDialog(); });
  sidebarSettingsButton?.addEventListener("click", () => { closeSidebar({ restoreFocus: false }); settingsOpen?.focus({ preventScroll: true }); openSettings(); });
  document.addEventListener("keydown", (event) => {
    if (!sidebar || sidebarBackdrop?.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeSidebar();
      return;
    }
    if (event.key === "Tab") {
      const controls = [...sidebar.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.getClientRects().length);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !sidebar.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  let settingsTrigger = null;
  function openSettings() {
    if (!settingsDialog) return;
    settingsTrigger = document.activeElement;
    openAnimatedDialog(settingsDialog, "gallery-settings-open");
    const closeButton = settingsDialog.querySelector(".gallery-settings-close");
    if (closeButton) closeButton.focus();
  }
  function closeSettings() {
    if (!settingsDialog || settingsDialog.hidden) return;
    closeAnimatedDialog(settingsDialog, "gallery-settings-open", () => {
      if (settingsTrigger && typeof settingsTrigger.focus === "function") settingsTrigger.focus();
    });
  }

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
  let imageBatchSequence = 0;
  let latestImageBatch = null;
  let lastApiLatency = null;
  let lastRequestUsedFallback = false;
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
    const isGalleryEntry = (history.state && history.state.view === "gallery") ||
      new URL(window.location.href).searchParams.get("page") === "gallery";
    const nextRoute = isGalleryEntry ? "gallery" : "home";
    // Closing a history-backed preview returns to the same gallery entry. Do not
    // call renderRoute in that case, because it would jump the page back to top.
    if (nextRoute !== currentRoute) renderRoute(nextRoute);
  });

  function setLoading(value) {
    loading = value;
    if (value) {
      loadingGrid.querySelectorAll(".gallery-skeleton-placeholder").forEach((item) => item.remove());
      // Fifteen fixed portrait placeholders, evenly distributed across the loading lanes.
      for (let i = 0; i < 15; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "gallery-skeleton-placeholder";
        skeleton.setAttribute("aria-hidden", "true");
        loadingLanes[i % loadingLanes.length]?.append(skeleton);
      }
      updateLoadingGridVisibility();
    } else {
      loadingGrid.querySelectorAll(".gallery-skeleton-placeholder").forEach((item) => item.remove());
      updateLoadingGridVisibility();
    }
    refreshButton.disabled = value;
    moreButton.disabled = value;
    retryButton.disabled = value;
    if (sourceSelect) sourceSelect.disabled = value;
    if (tagInput) tagInput.disabled = value || !tagFilteringAvailable();
    if (tagApplyButton) tagApplyButton.disabled = value || !tagFilteringAvailable();
    const sourcePicker = document.querySelector('.gallery-custom-select[data-select-key="source"]');
    if (sourcePicker) {
      const trigger = sourcePicker.querySelector(".gallery-custom-select-trigger");
      const menu = sourcePicker.querySelector(".gallery-custom-select-menu");
      if (trigger) trigger.disabled = value;
      if (menu) {
        menu.querySelectorAll("button").forEach((button) => { button.disabled = value; });
        if (value) menu.hidden = true;
      }
      if (value) sourcePicker.classList.remove("is-open");
      if (trigger && value) trigger.setAttribute("aria-expanded", "false");
    }
    refreshButton.textContent = value ? "加载中…" : "↻ 刷新";
    moreButton.textContent = value ? "正在加载…" : "再看一些 ↓";
    if (value) {
      empty.hidden = true;
      status.textContent = "正在获取公开插画…";
    }
  }

  function showNoImagesState(message = "图片文件暂时无法加载。请尝试切换图片源或重试。") {
    empty.hidden = false;
    emptyTitle.textContent = "暂时无法显示图片";
    emptyText.textContent = message;
  }

  function updateGalleryStatus() {
    if (!status || loading) return;
    const loaded = imageCount();
    const pending = pendingImageCount();
    if (!loaded && !pending) {
      status.textContent = "图片加载失败，可切换图片源或重试";
      return;
    }
    status.textContent = (currentSourceName || "图片源") + " · 已显示 " + loaded + " 张" +
      (pending ? " · " + pending + " 张加载中" : "") +
      (lastApiLatency !== null ? " · API " + lastApiLatency + " ms" : "") +
      (lastRequestUsedFallback ? " · 已自动切换备用源" : "");
  }

  function refreshAutoLoadAfterImages() {
    if (loading || pendingImageCount() > 0) return;
    if (latestImageBatch && latestImageBatch.requestFinished) {
      lastBatchAdded = latestImageBatch.loaded;
    }
    if (scrollObserver && moreButton) {
      autoLoadArmed = true;
      scrollObserver.unobserve(moreButton);
      scrollObserver.observe(moreButton);
      return;
    }
    if (currentRoute === "gallery" && moreButton && lastBatchAdded > 0) {
      requestAnimationFrame(() => {
        if (loading || pendingImageCount() > 0 || currentRoute !== "gallery" || lastBatchAdded <= 0) return;
        if (moreButton.getBoundingClientRect().top < window.innerHeight + 700) {
          loadImages({ targetCount: 100 });
        }
      });
    }
  }

  function settleImageBatch(batch, loaded) {
    if (batch) {
      batch.pending = Math.max(0, batch.pending - 1);
      if (loaded) batch.loaded++;
      else batch.failed++;
    }
    updateGalleryStatus();
    if (!imageCount() && !pendingImageCount() && !loading) {
      showNoImagesState();
    }
    refreshAutoLoadAfterImages();
  }

  function addImage(url, sourceName = "图片源", batch = null) {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    const generation = galleryGeneration;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gallery-item gallery-item--pending";
    const revealIndex = batch ? batch.added : 0;
    card.style.setProperty("--gallery-reveal-delay", Math.min(revealIndex, 8) * 16 + "ms");
    card.setAttribute("aria-label", "查看插画");
    const img = document.createElement("img");
    img.loading = "eager";
    img.decoding = "async";
    img.alt = "插画";
    img.className = "is-loading";
    card.append(img);
    getShortestLoadingLane()?.append(card);
    updateLoadingGridVisibility();
    if (batch) {
      batch.added++;
      batch.pending++;
    }

    card.dataset.sourceUrl = url;
    card.dataset.title = "随机插画";
    let settled = false;
    let loadTimer = 0;

    const clearLoadTimer = () => {
      if (loadTimer) window.clearTimeout(loadTimer);
      loadTimer = 0;
    };
    const failImage = () => {
      if (settled) return;
      settled = true;
      clearLoadTimer();
      card.remove();
      updateLoadingGridVisibility();
      if (generation === galleryGeneration) {
        seen.delete(url);
        if (!imageCount() && !pendingImageCount() && !loading) {
          showNoImagesState("图片文件无法加载。请切换图片源、检查网络或重试。");
        }
      }
      settleImageBatch(batch, false);
    };

    img.addEventListener("load", async () => {
      if (settled) return;
      if (generation !== galleryGeneration) { failImage(); return; }
      try {
        if (typeof img.decode === "function") await img.decode();
      } catch (_) {
        // Some browsers reject decode() even when the image is usable; check natural size below.
      }
      if (settled) return;
      if (generation !== galleryGeneration || !img.naturalWidth || !img.naturalHeight) {
        failImage();
        return;
      }

      img.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
      img.style.height = "auto";
      img.dataset.naturalRatio = img.naturalWidth + ":" + img.naturalHeight;
      settled = true;
      clearLoadTimer();

      // Move the finished image above the loading strip into the shortest masonry lane.
      img.classList.remove("is-loading");
      card.classList.remove("gallery-item--pending");
      card.classList.add("gallery-item--loaded");
      getShortestGalleryLane().append(card);
      updateLoadingGridVisibility();
      empty.hidden = true;
      settleImageBatch(batch, true);
    }, { once: true });

    img.addEventListener("error", failImage, { once: true });
    loadTimer = window.setTimeout(failImage, 20000);
    img.src = url;
    card.addEventListener("click", () => {
      lightboxTrigger = card;
      lightboxImage.src = url;
      lightboxTitle.textContent = card.dataset.title;
      sourceLink.href = url;
      sourceLink.textContent = "查看原图 ↗";
      downloadButton.dataset.downloadUrl = url;
      downloadButton.disabled = false;
      downloadButton.textContent = "↓ 下载图片";
      openAnimatedDialog(lightbox, "gallery-open");
      if (!history.state || !history.state.galleryLightbox) {
        history.pushState({ ...(history.state || {}), view: "gallery", galleryLightbox: true }, "", window.location.href);
      }
      lightbox.querySelector("[data-gallery-close]").focus();
    });
    return true;
  }

  async function loadImages({ reset = false, targetCount = 20 } = {}) {
    if (loading) return;
    if (reset) {
      galleryGeneration++;
      grid.querySelectorAll(".gallery-item").forEach((card) => card.remove());
      grid.querySelectorAll(".gallery-skeleton-placeholder, .gallery-item--pending").forEach((item) => item.remove());
      loadingLanes.forEach((lane) => lane.replaceChildren());
      loadingGrid.hidden = true;
      seen.clear();
      lastRequestUsedFallback = false;
    }
    const targetTotal = imageCount() + pendingImageCount() + Math.max(0, targetCount);
    const batch = {
      id: ++imageBatchSequence,
      added: 0,
      pending: 0,
      loaded: 0,
      failed: 0,
      requestFinished: false
    };
    latestImageBatch = batch;
    setLoading(true);
    try {
      const source = sourceSelect ? sourceSelect.value : "auto";
      let attempts = 0;
      // Request only the number of images still needed. This keeps "load more"
      // batches small and avoids inserting an entire 100-image response by mistake.
      while (imageCount() + pendingImageCount() < targetTotal && attempts < 10) {
        const remaining = targetTotal - imageCount() - pendingImageCount();
        if (remaining <= 0) break;
        attempts++;
        const requestedCount = Math.min(100, remaining);
        const params = new URLSearchParams({ source, count: String(requestedCount) });
        const requestedTags = tagInput && tagFilteringAvailable() ? tagInput.value.trim() : "";
        if (requestedTags) params.set("tags", requestedTags);
        const response = await fetch(galleryApiUrl("?" + params.toString()), {
          method: "GET",
          headers: { "Accept": "application/json" },
          cache: "no-store"
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || ("图片服务返回 HTTP " + response.status));
        if (!Array.isArray(data.files)) throw new Error("图片服务返回的数据格式不正确");
        let batchAdded = 0;
        currentSourceName = data.sourceName || "自动切换";
        lastApiLatency = Number.isFinite(data.latency) ? data.latency : null;
        lastRequestUsedFallback = lastRequestUsedFallback || Boolean(data.fallback);
        for (const url of data.files) {
          if (imageCount() + pendingImageCount() >= targetTotal) break;
          if (addImage(url, currentSourceName, batch)) batchAdded++;
        }
        if (!imageCount() && !pendingImageCount() && batchAdded === 0) {
          throw new Error("暂时没有获取到图片，请稍后重试");
        }
        if (batchAdded === 0) break;
      }
      if (!imageCount() && !pendingImageCount()) {
        throw new Error("暂时没有获取到图片，请稍后重试");
      }
    } catch (error) {
      console.warn("Gallery request failed:", error);
      if (!imageCount() && !pendingImageCount()) {
        empty.hidden = false;
        emptyTitle.textContent = "暂时无法加载画廊";
        emptyText.textContent = (error instanceof Error ? error.message : "图片服务连接失败") + "。请检查网络后重试。";
      }
      status.textContent = imageCount() || pendingImageCount() ? "部分图片加载失败，可重试" : "图片服务连接失败";
      if (providerStatusSummary) providerStatusSummary.textContent = "当前请求失败；可查看各源状态，或切换到自动模式。";
    } finally {
      batch.requestFinished = true;
      setLoading(false);
      if (!imageCount() && !pendingImageCount() && empty.hidden) {
        showNoImagesState("没有可显示的图片。请切换图片源、检查网络或重试。");
      }
      updateGalleryStatus();
      // Re-arm only after pending image requests settle. Only real image loads
      // count as a successful batch, preventing repeated retries of broken URLs.
      refreshAutoLoadAfterImages();
    }
  }

  async function checkProviderStatus() {
    if (!providerStatusList || checkingProviders) return;
    checkingProviders = true;
    if (providerStatusRefresh) { providerStatusRefresh.disabled = true; providerStatusRefresh.textContent = "检测中…"; }
    if (providerStatusSummary) providerStatusSummary.textContent = "正在并行检测各图片源的响应速度…";
    providerStatusList.replaceChildren();
    try {
      const response = await fetch(galleryApiUrl("?mode=status"), { cache: "no-store", headers: { "Accept": "application/json" } });
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
      const response = await fetch(galleryApiUrl("?mode=download&url=" + encodeURIComponent(url)), { cache: "no-store" });
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

  let lightboxCloseFromHistory = false;
  function closeLightbox({ fromHistory = false } = {}) {
    if (lightbox.hidden) return;
    if (lightbox.classList.contains("is-closing")) {
      lightboxCloseFromHistory = lightboxCloseFromHistory || fromHistory;
      return;
    }
    lightboxCloseFromHistory = fromHistory;
    closeAnimatedDialog(lightbox, "gallery-open", () => {
      lightboxImage.removeAttribute("src");
      if (lightboxTrigger) lightboxTrigger.focus();
      lightboxTrigger = null;
      // The initial gallery entry keeps view:"gallery" in history.state, so popping
      // the preview marker closes the dialog without leaving the gallery.
      const shouldGoBack = !lightboxCloseFromHistory && history.state && history.state.galleryLightbox;
      lightboxCloseFromHistory = false;
      if (shouldGoBack) history.back();
    });
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

  const TAG_CATEGORIES = {
    hair: [
      ["black_hair","黑发"],["white_hair","白发"],["blonde_hair","金发"],["brown_hair","棕发"],["blue_hair","蓝发"],["pink_hair","粉发"],["red_hair","红发"],["purple_hair","紫发"],["green_hair","绿发"],["silver_hair","银发"],["grey_hair","灰发"],["orange_hair","橙发"],["multicolored_hair","多色头发"],["gradient_hair","渐变发色"],["long_hair","长发"],["short_hair","短发"],["very_long_hair","超长发"],["twintails","双马尾"],["ponytail","马尾"],["braid","辫子"],["ahoge","呆毛"],["bangs","刘海"],["hair_bun","丸子头"],["side_ponytail","侧马尾"],["curly_hair","卷发"]
    ],
    eyes: [
      ["blue_eyes","蓝眼"],["red_eyes","红眼"],["green_eyes","绿眼"],["brown_eyes","棕眼"],["purple_eyes","紫眼"],["yellow_eyes","黄眼"],["pink_eyes","粉眼"],["golden_eyes","金色眼睛"],["heterochromia","异色瞳"],["closed_eyes","闭眼"],["one_eye_closed","单眼闭合"],["glowing_eyes","发光眼睛"],["eyepatch","眼罩"],["glasses","眼镜"],["sunglasses","太阳镜"]
    ],
    features: [
      ["neko","猫系角色"],["cat_ears","猫耳"],["animal_ears","兽耳"],["fox_ears","狐耳"],["rabbit_ears","兔耳"],["wolf_ears","狼耳"],["elf","精灵"],["pointy_ears","尖耳"],["wings","翅膀"],["black_wings","黑色翅膀"],["white_wings","白色翅膀"],["tail","尾巴"],["fox_tail","狐尾"],["horns","角"],["halo","光环"],["fangs","尖牙"],["fang","小虎牙"],["freckles","雀斑"],["beauty_mark","美人痣"],["animal_tail","动物尾巴"],["robot","机械角色"],["android","仿生人"],["vampire","吸血鬼"],["demon","恶魔"],["angel","天使"],["princess","公主"],["witch","魔女"],["magical_girl","魔法少女"]
    ],
    clothes: [
      ["school_uniform","校服"],["sailor_uniform","水手服"],["serafuku","日式水手服"],["maid","女仆装"],["maid_headdress","女仆头饰"],["kimono","和服"],["yukata","浴衣"],["dress","连衣裙"],["gown","礼服"],["armor","铠甲"],["hoodie","连帽衫"],["sweater","毛衣"],["jacket","夹克"],["coat","外套"],["shirt","衬衫"],["t_shirt","T恤"],["skirt","裙子"],["pleated_skirt","百褶裙"],["shorts","短裤"],["jeans","牛仔裤"],["sundress","夏日裙装"],["gothic","哥特风"],["gothic_lolita","哥特萝莉"],["lolita_fashion","洛丽塔"],["uniform","制服"],["nurse","护士装"],["sportswear","运动服"],["swimsuit","泳装"],["winter_clothes","冬装"],["casual","日常服"],["ribbon","蝴蝶结"],["necktie","领带"],["bowtie","领结"],["gloves","手套"],["thighhighs","过膝袜"],["stockings","长筒袜"],["boots","靴子"],["sneakers","运动鞋"],["hat","帽子"],["crown","王冠"]
    ],
    pose: [
      ["sitting","坐姿"],["standing","站姿"],["lying","躺姿"],["kneeling","跪姿"],["walking","行走"],["running","奔跑"],["jumping","跳跃"],["looking_at_viewer","看向镜头"],["looking_away","望向别处"],["smile","微笑"],["blush","脸红"],["waving","挥手"],["peace_sign","剪刀手"],["arms_up","举起双手"],["crossed_arms","双臂交叉"],["hand_on_cheek","手托脸颊"],["holding","手持物品"],["hug","拥抱"],["back_view","背影"],["profile","侧脸"],["from_above","俯视角度"],["from_below","仰视角度"],["close-up","近景"],["portrait","肖像"],["full_body","全身"]
    ],
    scene: [
      ["outdoors","户外"],["indoors","室内"],["sky","天空"],["clouds","云朵"],["night","夜景"],["starry_sky","星空"],["flowers","花朵"],["cherry_blossoms","樱花"],["forest","森林"],["garden","花园"],["beach","海滩"],["ocean","海洋"],["waterfall","瀑布"],["rain","雨景"],["snow","雪景"],["sunset","日落"],["sunrise","日出"],["city","城市"],["street","街道"],["cafe","咖啡馆"],["bedroom","卧室"],["classroom","教室"],["library","图书馆"],["train","列车"],["landscape","风景"],["fantasy","幻想风"],["magic","魔法"],["sparkles","闪光特效"],["fireworks","烟花"],["moon","月亮"],["water","水景"],["window","窗边"],["ruins","遗迹"],["shrine","神社"],["temple","寺庙"]
    ],
    special: [
      ["original","原创角色"],["fanart","同人作品"],["multiple_girls","多名角色"],["1girl","单人角色"],["2girls","两名角色"],["solo","单人画面"],["chibi","Q版"],["anime_coloring","动画风上色"],["monochrome","黑白画面"],["sketch","草稿风"],["lineart","线稿"],["traditional_media","传统绘画"],["digital_art","数字绘画"],["pixel_art","像素风"],["watercolor","水彩风"],["oil_painting","油画风"],["3d","3D风格"],["realistic","写实风"],["abstract","抽象风"],["minimalism","极简风"],["cute","可爱风"],["kawaii","萌系"],["beautiful","唯美"],["detailed","细节丰富"],["highres","高清"],["absurdres","超高分辨率"],["official_art","官方绘图"],["cover","封面图"],["wallpaper","壁纸"],["transparent_background","透明背景"],["simple_background","简洁背景"],["white_background","白色背景"],["black_background","黑色背景"],["weapon","武器"],["book","书本"],["food","食物"],["music","音乐元素"],["animal","动物"],["bird","鸟类"],["butterfly","蝴蝶"],["flower","单朵花"],["heart","爱心"],["stars","星星装饰"],["jewelry","首饰"],["umbrella","雨伞"],["phone","手机"],["camera","相机"],["sword","剑"],["staff","法杖"],["ribbon","丝带"]
    ]
  };
  let activeTagCategory = "hair";
  let selectedTags = [];
  let tagDialogTrigger = null;
  let tagOptionsAnimationTimer = 0;
  function syncSelectedTagsFromInput() {
    selectedTags = (tagInput && tagInput.value ? tagInput.value.split(/[\s,]+/) : []).map((tag) => tag.trim()).filter(Boolean);
  }
  function tagLabel(tag) { return (Object.values(TAG_CATEGORIES).flat().find((item) => item[0] === tag) || [tag, tag])[1]; }
  function renderSelectedTags() {
    if (!tagSelected) return;
    tagSelected.replaceChildren();
    if (!selectedTags.length) {
      const emptyTag = document.createElement("span"); emptyTag.className = "gallery-tag-none"; emptyTag.textContent = "还没有选择标签"; tagSelected.append(emptyTag);
    } else selectedTags.forEach((tag) => {
      const chip = document.createElement("span"); chip.className = "gallery-tag-selected-chip";
      const name = document.createElement("span"); name.textContent = tagLabel(tag);
      const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", "移除 " + name.textContent);
      remove.addEventListener("click", () => { selectedTags = selectedTags.filter((item) => item !== tag); renderTagOptions(); renderSelectedTags(); });
      chip.append(name, remove); tagSelected.append(chip);
    });
    if (tagConfirmButton) tagConfirmButton.textContent = selectedTags.length ? "应用筛选（" + selectedTags.length + "）" : "清除筛选";
    if (tagSelected) tagSelected.dataset.count = String(selectedTags.length);
  }
  function renderTagOptions() {
    if (!tagOptions) return;
    tagOptions.classList.remove("tag-options-enter");
    if (tagOptionsAnimationTimer) window.clearTimeout(tagOptionsAnimationTimer);
    tagOptions.replaceChildren();
    (TAG_CATEGORIES[activeTagCategory] || []).forEach(([tag, label]) => {
      const button = document.createElement("button"); button.type = "button";
      button.className = "gallery-tag-option" + (selectedTags.includes(tag) ? " is-selected" : "");
      button.setAttribute("aria-pressed", String(selectedTags.includes(tag)));
      const mark = document.createElement("span"); mark.className = "gallery-tag-option-mark"; mark.textContent = selectedTags.includes(tag) ? "✓" : "+";
      const text = document.createElement("span"); text.textContent = label; button.append(mark, text);
      button.addEventListener("click", () => {
        if (selectedTags.includes(tag)) selectedTags = selectedTags.filter((item) => item !== tag);
        else selectedTags.push(tag);
        renderTagOptions(); renderSelectedTags(); updateTagDialogHint();
      });
      tagOptions.append(button);
    });
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void tagOptions.offsetWidth;
      tagOptions.classList.add("tag-options-enter");
      tagOptionsAnimationTimer = window.setTimeout(() => {
        tagOptions.classList.remove("tag-options-enter");
        tagOptionsAnimationTimer = 0;
      }, 320);
    }
  }
  function updateTagDialogHint() {
    if (!tagDialogHint) return;
    tagDialogHint.textContent = !tagFilteringAvailable()
      ? "当前图片源不支持标签筛选，请在画廊设置中切换到自动模式、Nekos API 或 Safebooru。"
      : sourceSelect && sourceSelect.value === "safebooru" ? "Safebooru 将使用安全评级（safe）进行筛选。"
      : sourceSelect && sourceSelect.value === "nekosapi" ? "Nekos API 将使用安全评级（safe）进行筛选。"
      : "自动模式只会查询支持标签的图片源。标签越多，筛选条件越严格。";
  }
  function openTagDialog() {
    if (!tagDialog) return;
    tagDialogTrigger = document.activeElement;
    syncSelectedTagsFromInput(); renderTagOptions(); renderSelectedTags(); updateTagDialogHint();
    openAnimatedDialog(tagDialog, "gallery-tags-open");
    const closeButton = tagDialog.querySelector(".gallery-tag-close"); if (closeButton) closeButton.focus();
  }
  function closeTagDialog() {
    if (!tagDialog || tagDialog.hidden) return;
    closeAnimatedDialog(tagDialog, "gallery-tags-open", () => {
      if (tagDialogTrigger && typeof tagDialogTrigger.focus === "function") tagDialogTrigger.focus();
      tagDialogTrigger = null;
    });
  }
  if (tagDialogOpen) tagDialogOpen.addEventListener("click", openTagDialog);
  if (tagSettingsOpen) tagSettingsOpen.addEventListener("click", openTagDialog);
  if (tagDialog) {
    tagDialog.querySelectorAll("[data-gallery-tag-close]").forEach((button) => button.addEventListener("click", closeTagDialog));
    document.addEventListener("keydown", (event) => { if (!tagDialog.hidden && event.key === "Escape") { event.preventDefault(); closeTagDialog(); } });
  }
  if (tagCategoryTabs) tagCategoryTabs.querySelectorAll("[data-tag-category]").forEach((button) => button.addEventListener("click", () => {
    activeTagCategory = button.dataset.tagCategory;
    tagCategoryTabs.querySelectorAll("[data-tag-category]").forEach((tab) => { const active = tab === button; tab.classList.toggle("is-active", active); tab.setAttribute("aria-selected", String(active)); });
    renderTagOptions();
  }));
  if (tagClearButton) tagClearButton.addEventListener("click", () => { selectedTags = []; renderTagOptions(); renderSelectedTags(); });
  if (tagConfirmButton) tagConfirmButton.addEventListener("click", () => {
    if (tagInput) tagInput.value = selectedTags.join(",");
    if (tagHint) tagHint.textContent = selectedTags.length ? "当前标签：" + selectedTags.map(tagLabel).join("、") : "尚未选择标签。可按类别打开标签选择器。";
    closeTagDialog(); loadImages({ reset: true, targetCount: 100 });
  });

  function tagFilteringAvailable() {
    return !sourceSelect || ["auto", "nekosapi", "safebooru"].includes(sourceSelect.value);
  }
  function updateTagFilterAvailability() {
    const available = tagFilteringAvailable();
    if (tagInput) tagInput.disabled = !available;
    if (tagApplyButton) tagApplyButton.disabled = !available;
    if (tagSettingsOpen) tagSettingsOpen.disabled = loading || !available;
    if (tagDialogOpen) tagDialogOpen.disabled = loading || !available;
    if (tagHint && !available) tagHint.textContent = "当前图片源不支持标签筛选。切换到自动模式、Nekos API 或 Safebooru 即可使用。";
    else if (tagHint && !tagInput.value) tagHint.textContent = "尚未选择标签。可按发色、角色特征、服装和场景分类筛选。";
    updateTagDialogHint();
  }
  refreshButton.addEventListener("click", () => {
    lastRequestUsedFallback = false;
    loadImages({ reset: true, targetCount: 100 });
  });
  if (sourceSelect) sourceSelect.addEventListener("change", () => {
    updateTagFilterAvailability();
    loadImages({ reset: true, targetCount: 100 });
  });
  if (tagApplyButton) tagApplyButton.addEventListener("click", () => loadImages({ reset: true, targetCount: 100 }));
  if (tagInput) tagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !tagInput.disabled) {
      event.preventDefault();
      loadImages({ reset: true, targetCount: 100 });
    }
  });
  updateTagFilterAvailability();
  if (providerStatusRefresh) providerStatusRefresh.addEventListener("click", checkProviderStatus);
  retryButton.addEventListener("click", () => loadImages({ reset: imageCount() === 0, targetCount: imageCount() === 0 ? 100 : 20 }));
  moreButton.addEventListener("click", () => loadImages({ targetCount: 100 }));

  // Reliable infinite scroll: check the sentinel on scroll, resize, and after every batch.
  // This also fills short screens automatically without depending on observer re-entry.
  let autoLoadCheckPending = false;
  function checkAutoLoad() {
    if (autoLoadCheckPending || loading || pendingImageCount() > 0 ||
        currentRoute !== "gallery" || lastBatchAdded <= 0 || !moreButton) return;
    autoLoadCheckPending = true;
    requestAnimationFrame(() => {
      autoLoadCheckPending = false;
      if (loading || pendingImageCount() > 0 || currentRoute !== "gallery" ||
          lastBatchAdded <= 0 || !moreButton) return;
      if (moreButton.getBoundingClientRect().top < window.innerHeight + 700) {
        loadImages({ targetCount: 100 });
      }
    });
  }
  window.addEventListener("scroll", checkAutoLoad, { passive: true });
  window.addEventListener("resize", checkAutoLoad, { passive: true });
  if ("IntersectionObserver" in window && moreButton) {
    scrollObserver = new IntersectionObserver(() => checkAutoLoad(), {
      root: null, rootMargin: "700px 0px", threshold: 0
    });
    scrollObserver.observe(moreButton);
  }

  const initialRoute = "gallery";
  const initialHistoryState = { ...(history.state || {}), view: "gallery" };
  delete initialHistoryState.galleryLightbox;
  history.replaceState(initialHistoryState, "", window.location.href);
  renderRoute(initialRoute);
})();