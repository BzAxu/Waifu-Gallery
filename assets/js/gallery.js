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
  const tagModeIncludeButton = document.getElementById("galleryTagModeInclude");
  const tagModeBlockButton = document.getElementById("galleryTagModeBlock");
  const tagSelectedTitle = document.getElementById("galleryTagSelectedTitle");
  const tagDialogDescription = document.getElementById("galleryTagDescription");
  const columnsSelect = document.getElementById("galleryColumnsSelect");
  const providerStatusList = document.getElementById("galleryProviderStatusList");
  const providerStatusRefresh = document.getElementById("galleryProviderStatusRefresh");
  const providerStatusSummary = document.getElementById("galleryProviderStatusSummary");
  const lightbox = document.getElementById("galleryLightbox");
  const lightboxImage = document.getElementById("galleryLightboxImage");
  const lightboxTitle = document.getElementById("galleryLightboxTitle");
  const sourceLink = document.getElementById("galleryPixivLink");
  const favoritesDialog = document.getElementById("galleryFavoritesDialog");
  const favoritesView = document.getElementById("galleryFavoritesView");
  const favoritesGrid = document.getElementById("galleryFavoritesGrid");
  const favoritesEmpty = document.getElementById("galleryFavoritesEmpty");
  const favoritesCount = document.getElementById("galleryFavoritesStatus");
  const sidebarFavoriteCount = document.getElementById("gallerySidebarFavoriteCount");
  const showFavoriteButtonCheckbox = document.getElementById("galleryShowFavoriteButton");
  const favoriteDownloadAllButton = document.getElementById("galleryFavoritesDownloadAll");
  const favoriteSelectAllButton = document.getElementById("galleryFavoritesSelectAll");
  const favoriteMarkDownloadedButton = document.getElementById("galleryFavoritesMarkDownloaded");
  const favoriteClearDownloadTagButton = document.getElementById("galleryFavoritesClearDownloadTag");
  const downloadConfirmDialog = document.getElementById("galleryDownloadConfirm");
  const downloadConfirmExcludeDownloaded = document.getElementById("galleryDownloadConfirmExcludeDownloaded");
  const downloadConfirmSummary = document.getElementById("galleryDownloadConfirmSummary");
  const downloadConfirmCancel = document.getElementById("galleryDownloadConfirmCancel");
  const downloadConfirmStart = document.getElementById("galleryDownloadConfirmStart");
  const favoriteDownloadQueueButton = document.getElementById("galleryFavoritesDownloadQueue");
  const downloadManager = document.getElementById("galleryDownloadManager");
  const downloadManagerQueue = document.getElementById("galleryDownloadManagerQueue");
  const downloadManagerFiles = document.getElementById("galleryDownloadManagerFiles");
  const downloadManagerSummary = document.getElementById("galleryDownloadManagerSummary");
  const downloadFetchLabel = document.getElementById("galleryDownloadFetchLabel");
  const downloadFetchProgress = document.getElementById("galleryDownloadFetchProgress");
  const downloadBytesLabel = document.getElementById("galleryDownloadBytesLabel");
  const downloadZipLabel = document.getElementById("galleryDownloadZipLabel");
  const downloadZipProgress = document.getElementById("galleryDownloadZipProgress");
  const downloadQueueCount = document.getElementById("galleryDownloadQueueCount");
  const downloadFileCount = document.getElementById("galleryDownloadFileCount");
  const downloadManagerCancel = document.getElementById("galleryDownloadManagerCancel");
  const downloadManagerClose = document.getElementById("galleryDownloadManagerClose");
  const favoriteMultiSelectButton = document.getElementById("galleryFavoritesMultiSelect");
  const favoriteDownloadSelectedButton = document.getElementById("galleryFavoritesDownloadSelected");
  const favoriteClearSelectedButton = document.getElementById("galleryFavoritesClearSelected");
  const favoriteClearAllButton = document.getElementById("galleryFavoritesClearAll");
  const favoriteBackButton = document.getElementById("galleryFavoritesBack");
  const favoriteModalCloseButton = document.getElementById("galleryFavoritesModalClose");
  const favoriteEmptyBackButton = document.getElementById("galleryFavoritesEmptyBack");
  const toast = document.getElementById("toast");
  if (!homePage || !galleryPage || !grid) return;

  // Keep API requests inside the gallery subpath when proxied through bzaxu.top.
  // On the standalone Pages domain, continue using the normal /api/gallery endpoint.
  function galleryApiUrl(query = "") {
    const prefix = window.location.pathname.startsWith("/Waifu-Gallery") ? "/Waifu-Gallery" : "";
    return prefix + "/api/gallery" + query;
  }

  // Loaded images and loading placeholders share the same masonry lanes.
  // Pending cards are appended at the end and stay in their lane when loaded.
  let galleryLanes = [];
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

  // Pick a lane by the height of real cards only, ignoring the decorative
  // placeholders pinned to the bottom of each lane.
  function getShortestContentLane() {
    if (!galleryLanes.length) setGalleryLaneCount("auto");
    let shortest = galleryLanes[0] || null;
    let shortestHeight = Infinity;
    for (const lane of galleryLanes) {
      const style = window.getComputedStyle(lane);
      const gap = parseFloat(style.rowGap || style.gap) || 0;
      let height = 0;
      let count = 0;
      for (const item of lane.children) {
        if (item.classList.contains("gallery-skeleton-placeholder")) continue;
        height += item.getBoundingClientRect().height;
        count++;
      }
      if (count > 1) height += gap * (count - 1);
      if (height < shortestHeight) {
        shortest = lane;
        shortestHeight = height;
      }
    }
    return shortest;
  }

  function animatePlaceholderReflow(beforeRects) {
    if (!beforeRects || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const moved = [];
    for (const [item, before] of beforeRects) {
      if (!item.isConnected) continue;
      const after = item.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      item.style.transition = "none";
      item.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      moved.push(item);
    }
    if (!moved.length) return;
    void grid.offsetHeight;
    requestAnimationFrame(() => {
      for (const item of moved) {
        item.style.transition = "transform 360ms cubic-bezier(.2,.75,.25,1)";
        item.style.transform = "translate3d(0, 0, 0)";
      }
      window.setTimeout(() => {
        for (const item of moved) {
          item.style.removeProperty("transition");
          item.style.removeProperty("transform");
        }
      }, 400);
    });
  }

  function insertLoadedCardBeforePlaceholders(card) {
    const lane = getShortestContentLane();
    if (!lane) return;
    const beforeRects = new Map(
      [...grid.querySelectorAll(".gallery-skeleton-placeholder")].map((item) => [item, item.getBoundingClientRect()])
    );
    const firstPlaceholder = lane.querySelector(":scope > .gallery-skeleton-placeholder");
    if (firstPlaceholder) lane.insertBefore(card, firstPlaceholder);
    else lane.append(card);
    animatePlaceholderReflow(beforeRects);
  }

  function removePlaceholdersIfSettled() {
    if (!loading && pendingImageCount() === 0) {
      grid.querySelectorAll(".gallery-skeleton-placeholder").forEach((item) => item.remove());
    }
  }

  // A refresh invalidates previous image requests and releases their timers.
  // Unresolved images are deliberately kept off-DOM, so they can never disturb
  // the masonry lanes or be mistaken for visible gallery cards.
  function cancelPendingImages() {
    for (const record of pendingImages) {
      if (typeof record.cancel === "function") record.cancel();
    }
    pendingImages.clear();
  }

  function imageCount() {
    return grid.querySelectorAll(".gallery-item--loaded").length;
  }

  function pendingImageCount() {
    return pendingImages.size;
  }

  function setGalleryLaneCount(value) {
    const count = ["2", "3", "4", "5"].includes(value)
      ? Number(value)
      : (window.matchMedia("(max-width: 760px)").matches ? 2 : 3);
    const existingItems = [...grid.querySelectorAll(":scope > .gallery-column > *")];
    const placeholders = existingItems.filter((item) => item.classList.contains("gallery-skeleton-placeholder"));
    const galleryItems = existingItems.filter((item) => !item.classList.contains("gallery-skeleton-placeholder"));
    galleryLanes = Array.from({ length: count }, () => {
      const lane = document.createElement("div");
      lane.className = "gallery-column";
      return lane;
    });
    grid.dataset.columns = String(count);
    grid.replaceChildren(...galleryLanes);
    // Reflow loaded cards first, then pin decorative placeholders to the bottom.
    galleryItems.forEach((item) => getShortestGalleryLane().append(item));
    placeholders.forEach((item) => getShortestGalleryLane().append(item));
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
      if (event.key === "Escape" && !menu.hidden) {
        event.preventDefault();
        event.stopPropagation();
        close();
        trigger.focus();
        return;
      }
      if (event.key === "ArrowDown" && menu.hidden) {
        event.preventDefault();
        trigger.click();
        const selected = options.find(({ option }) => option.value === select.value);
        if (selected) selected.item.focus();
      }
    });
    menu.addEventListener("keydown", (event) => {
      const current = options.findIndex(({ item }) => item === document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        trigger.focus();
      }
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
    let savedColumns = "auto";
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
    const panel = dialog.querySelector(".gallery-tag-card, .gallery-settings-card, .gallery-lightbox-card, .gallery-favorites-modal-card, .gallery-download-manager-card");
    dialog.hidden = false;
    dialog.classList.remove("is-opening", "is-closing");
    document.body.classList.add(bodyClass);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && panel) {
      void dialog.offsetWidth;
      dialog.classList.add("is-opening");
      const onOpenEnd = (event) => {
        if (event.target !== panel || !event.animationName.startsWith("galleryDialogPanelIn")) return;
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
    const panel = dialog.querySelector(".gallery-tag-card, .gallery-settings-card, .gallery-lightbox-card, .gallery-favorites-modal-card, .gallery-download-manager-card");
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
      if (event.target === panel && event.animationName.startsWith("galleryDialogPanelOut")) finish();
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
  const sidebarFavoritesButton = document.getElementById("gallerySidebarFavorites");
  const sidebarSettingsButton = document.getElementById("gallerySidebarSettings");

  // Modal priority: image preview > tag picker > settings > download manager > favorites.
  function getTopmostOpenDialog() {
    return [lightbox, tagDialog, settingsDialog, downloadManager, favoritesDialog].find((dialog) =>
      dialog && !dialog.hidden && !dialog.classList.contains("is-closing")
    ) || null;
  }
  function getDialogFocusable(dialog) {
    return [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((element) =>
        !element.hidden &&
        !element.closest("[hidden], [inert]") &&
        !element.classList.contains("gallery-native-select") &&
        !element.matches(".gallery-tag-backdrop, .gallery-settings-backdrop, .gallery-lightbox-backdrop, .gallery-download-manager-backdrop") &&
        element.getClientRects().length > 0 &&
        window.getComputedStyle(element).visibility !== "hidden"
      );
  }
  function trapDialogTab(event, dialog) {
    if (event.key !== "Tab" || getTopmostOpenDialog() !== dialog) return;
    const controls = getDialogFocusable(dialog);
    if (!controls.length) {
      event.preventDefault();
      return;
    }
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  let sidebarOpenFrame = 0;
  let sidebarReturnFocus = null;
  function openSidebar() {
    if (!sidebar || !sidebarBackdrop || sidebar.classList.contains("is-open")) return;
    sidebarReturnFocus = document.activeElement;
    sidebarBackdrop.hidden = false;
    sidebar.inert = false;
    sidebar.setAttribute("aria-hidden", "false");
    settingsOpen?.setAttribute("aria-expanded", "true");
    document.body.classList.add("gallery-sidebar-open");
    if (sidebarOpenFrame) cancelAnimationFrame(sidebarOpenFrame);
    sidebarOpenFrame = requestAnimationFrame(() => {
      sidebarOpenFrame = 0;
      if (sidebarBackdrop.hidden || !document.body.classList.contains("gallery-sidebar-open")) return;
      sidebar.classList.add("is-open");
      sidebarBackdrop.classList.add("is-open");
      sidebarCloseButton?.focus({ preventScroll: true });
    });
  }
  function closeSidebar({ restoreFocus = true } = {}) {
    if (!sidebar || !sidebarBackdrop || sidebarBackdrop.hidden) return;
    if (sidebarOpenFrame) {
      cancelAnimationFrame(sidebarOpenFrame);
      sidebarOpenFrame = 0;
    }
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
    if (!sidebar || sidebarBackdrop?.hidden || !sidebar.classList.contains("is-open") || getTopmostOpenDialog()) return;
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

  function openFavoritesDialog({ fromHistory = false, initial = false } = {}) {
    if (!favoritesDialog || !favoritesDialog.hidden) return;
    favoritesDialogTrigger = document.activeElement;
    favoritesDialogHistoryEntry = !fromHistory && !initial;
    openAnimatedDialog(favoritesDialog, "gallery-favorites-open");
    if (favoritesDialogHistoryEntry) {
      const url = new URL(window.location.href);
      url.searchParams.set("page", "favorites");
      history.pushState({ ...(history.state || {}), view: "gallery", galleryFavoritesDialog: true }, "", url);
    } else if (initial) {
      history.replaceState({ ...(history.state || {}), view: "gallery", galleryFavoritesDialog: true }, "", window.location.href);
    }
    refreshFavoritesView();
    const focusTarget = favoriteModalCloseButton || favoriteBackButton;
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function closeFavoritesDialog({ fromHistory = false } = {}) {
    if (!favoritesDialog || favoritesDialog.hidden) return;
    if (!fromHistory && favoritesDialogHistoryEntry && history.state && history.state.galleryFavoritesDialog) {
      history.back();
      return;
    }
    favoritesDialogHistoryEntry = false;
    closeAnimatedDialog(favoritesDialog, "gallery-favorites-open", () => {
      if (!fromHistory) {
        const url = new URL(window.location.href);
        if (url.searchParams.get("page") === "favorites") url.searchParams.set("page", "gallery");
        history.replaceState({ ...(history.state || {}), view: "gallery", galleryFavoritesDialog: false }, "", url);
      }
      if (favoritesDialogTrigger && typeof favoritesDialogTrigger.focus === "function") favoritesDialogTrigger.focus({ preventScroll: true });
      favoritesDialogTrigger = null;
    });
  }

  if (favoritesDialog) {
    document.addEventListener("keydown", (event) => {
      if (favoritesDialog.hidden || getTopmostOpenDialog() !== favoritesDialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeFavoritesDialog();
      } else {
        trapDialogTab(event, favoritesDialog);
      }
    });
  }

  let downloadManagerTrigger = null;
  function openDownloadManager() {
    if (!downloadManager) return;
    downloadManagerTrigger = document.activeElement;
    openAnimatedDialog(downloadManager, "gallery-download-manager-open");
    if (downloadManagerClose) downloadManagerClose.focus({ preventScroll: true });
  }
  function closeDownloadManager() {
    if (!downloadManager || downloadManager.hidden) return;
    closeAnimatedDialog(downloadManager, "gallery-download-manager-open", () => {
      if (downloadManagerTrigger && typeof downloadManagerTrigger.focus === "function") {
        downloadManagerTrigger.focus({ preventScroll: true });
      }
      downloadManagerTrigger = null;
    });
  }
  if (downloadManager) {
    // The header × button is intentionally wired explicitly; unlike the footer
    // button and backdrop, it does not carry data-download-manager-close.
    downloadManagerClose?.addEventListener("click", closeDownloadManager);
    downloadManager.querySelectorAll("[data-download-manager-close]").forEach((button) =>
      button.addEventListener("click", closeDownloadManager));
    document.addEventListener("keydown", (event) => {
      if (downloadManager.hidden || getTopmostOpenDialog() !== downloadManager) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeDownloadManager();
      } else {
        trapDialogTab(event, downloadManager);
      }
    });
  }

  if (settingsDialog) {
    settingsDialog.querySelectorAll("[data-gallery-settings-close]").forEach((button) => button.addEventListener("click", closeSettings));
    document.addEventListener("keydown", (event) => {
      if (settingsDialog.hidden || getTopmostOpenDialog() !== settingsDialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeSettings();
      } else {
        trapDialogTab(event, settingsDialog);
      }
    });
  }

  const seen = new Set();
  const pendingImages = new Set();
  let loading = false;
  let lastBatchAdded = 1;
  let imageBatchSequence = 0;
  let latestImageBatch = null;
  let lastApiLatency = null;
  let lastRequestUsedFallback = false;
  let autoLoadArmed = true;
  let scrollObserver = null;
  let currentRoute = "home";
  let favoritesDialogTrigger = null;
  let favoritesDialogHistoryEntry = false;
  let lightboxTrigger = null;
  let lightboxSource = "gallery";
  let currentSourceName = "图片源";
  let checkingProviders = false;
  const favoritesStorageKey = "bzaxu-gallery-favorites-v1";
  const favoriteButtonStorageKey = "bzaxu-gallery-show-favorite-button";
  let favorites = readStoredFavorites();
  let showFavoriteButton = readFavoriteButtonPreference();
  let favoritesSelectionMode = false;
  let selectedFavoriteUrls = new Set();
  let downloadingFavorites = false;
  let toastTimer = 0;

  // Favorites are rendered only while their view is active. Building cards in
  // small frame-sized batches prevents one long synchronous task on mobile.
  let favoritesRenderVersion = 0;
  let favoritesRenderFrame = 0;
  let favoritesRenderDirty = true;

  function readStoredFavorites() {
    try {
      const value = JSON.parse(localStorage.getItem(favoritesStorageKey) || "[]");
      if (!Array.isArray(value)) return [];
      const unique = new Map();
      for (const item of value) {
        if (!item || typeof item.url !== "string" ||
            !(item.url.startsWith("https://") || item.url.startsWith("http://"))) continue;
        if (unique.has(item.url)) continue;
        unique.set(item.url, {
          url: item.url,
          title: typeof item.title === "string" ? item.title : "随机插画",
          source: typeof item.source === "string" ? item.source : "图片源",
          addedAt: Number.isFinite(Number(item.addedAt)) ? Number(item.addedAt) : Date.now(),
          downloaded: item.downloaded === true
        });
      }
      return [...unique.values()];
    } catch (_) {
      return [];
    }
  }

  function readFavoriteButtonPreference() {
    try { return localStorage.getItem(favoriteButtonStorageKey) !== "false"; } catch (_) { return true; }
  }

  function saveStoredFavorites() {
    try {
      localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites));
      return true;
    } catch (_) {
      return false;
    }
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function updateFavoriteButton(button, url) {
    const active = favorites.some((item) => item.url === url);
    button.classList.toggle("is-favorite", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", active ? "从本地收藏夹移除" : "加入本地收藏夹");
    button.title = active ? "已收藏，点击移除" : "加入本地收藏夹";
  }

  let favoriteVisibilityAnimationId = 0;
  function animateFavoriteButtonVisibility(visible) {
    const buttons = [...grid.querySelectorAll(".gallery-favorite-toggle")];
    const animationId = ++favoriteVisibilityAnimationId;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    buttons.forEach((button, index) => {
      button.classList.remove("is-showing", "is-hiding");
      if (reducedMotion) {
        button.hidden = !visible;
        button.style.removeProperty("--favorite-visibility-delay");
        return;
      }
      if (!visible && button.hidden) return;
      button.hidden = false;
      button.style.setProperty("--favorite-visibility-delay", Math.min(index, 16) * 32 + "ms");
      void button.offsetWidth;
      button.classList.add(visible ? "is-showing" : "is-hiding");
      const finish = () => {
        if (animationId !== favoriteVisibilityAnimationId) return;
        if (!visible) button.hidden = true;
        button.classList.remove("is-showing", "is-hiding");
        button.style.removeProperty("--favorite-visibility-delay");
      };
      button.addEventListener("animationend", (event) => {
        if (event.target === button) finish();
      }, { once: true });
      window.setTimeout(finish, visible ? 920 : 690);
    });
  }

  function syncFavoriteButtons() {
    grid.querySelectorAll(".gallery-favorite-toggle").forEach((button) => {
      updateFavoriteButton(button, button.dataset.sourceUrl || "");
    });
  }

  function showCenterHeart(card) {
    const heart = card?.querySelector(".gallery-heart-feedback");
    if (!heart) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      heart.classList.add("is-static-visible");
      window.setTimeout(() => heart.classList.remove("is-static-visible"), 650);
      return;
    }
    const animationId = Number(heart.dataset.animationId || "0") + 1;
    heart.dataset.animationId = String(animationId);
    heart.classList.remove("is-animating");
    void heart.offsetWidth;
    heart.classList.add("is-animating");
    const finish = (event) => {
      if (event && event.target !== heart) return;
      if (heart.dataset.animationId !== String(animationId)) return;
      heart.classList.remove("is-animating");
    };
    heart.addEventListener("animationend", finish, { once: true });
    window.setTimeout(() => finish(), 1100);
  }

  function syncFavoriteToolbar() {
    const count = favorites.length;
    const selected = selectedFavoriteUrls.size;
    if (sidebarFavoriteCount) sidebarFavoriteCount.textContent = String(count);
    if (favoritesCount) {
      favoritesCount.textContent = favoritesSelectionMode
        ? `已选 ${selected} / ${count} 张 · 本地保存`
        : `共 ${count} 张 · 保存在当前浏览器`;
    }
    if (favoriteDownloadAllButton) favoriteDownloadAllButton.disabled = count === 0 || downloadingFavorites;
    const allSelected = count > 0 && selected === count;
    if (favoriteSelectAllButton) {
      favoriteSelectAllButton.disabled = !favoritesSelectionMode || count === 0 || downloadingFavorites;
      favoriteSelectAllButton.textContent = allSelected ? "取消全选" : "全选";
    }
    if (favoriteMarkDownloadedButton) favoriteMarkDownloadedButton.disabled = !favoritesSelectionMode || selected === 0 || downloadingFavorites || favorites.every((item) => !selectedFavoriteUrls.has(item.url) || item.downloaded);
    if (favoriteClearDownloadTagButton) favoriteClearDownloadTagButton.disabled = !favoritesSelectionMode || selected === 0 || downloadingFavorites || favorites.every((item) => !selectedFavoriteUrls.has(item.url) || !item.downloaded);
    if (favoriteDownloadQueueButton) favoriteDownloadQueueButton.hidden = !downloadManagerHasRun;
    if (favoriteMultiSelectButton) {
      favoriteMultiSelectButton.disabled = count === 0 || downloadingFavorites;
      favoriteMultiSelectButton.textContent = favoritesSelectionMode ? "取消多选" : "多选";
      favoriteMultiSelectButton.setAttribute("aria-pressed", String(favoritesSelectionMode));
    }
    if (favoriteDownloadSelectedButton) favoriteDownloadSelectedButton.disabled = !favoritesSelectionMode || selected === 0 || downloadingFavorites;
    if (favoriteClearSelectedButton) favoriteClearSelectedButton.disabled = !favoritesSelectionMode || selected === 0 || downloadingFavorites;
    if (favoriteClearAllButton) favoriteClearAllButton.disabled = count === 0 || downloadingFavorites;
  }

  function updateFavoritePreference() {
    showFavoriteButton = Boolean(showFavoriteButtonCheckbox?.checked);
    try { localStorage.setItem(favoriteButtonStorageKey, String(showFavoriteButton)); } catch (_) {}
    animateFavoriteButtonVisibility(showFavoriteButton);
    syncFavoriteButtons();
    showToast(showFavoriteButton ? "已显示缩略图收藏按钮" : "已隐藏缩略图收藏按钮");
  }

  function toggleFavorite(url, title = "随机插画", source = "图片源") {
    const existingIndex = favorites.findIndex((item) => item.url === url);
    let message;
    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      selectedFavoriteUrls.delete(url);
      message = "已从本地收藏夹移除";
    } else {
      favorites.unshift({ url, title, source, addedAt: Date.now() });
      message = "已加入本地收藏夹";
    }
    const persisted = saveStoredFavorites();
    syncFavoriteButtons();
    refreshFavoritesView();
    showToast(persisted ? message : message + "，但浏览器存储不可用，刷新后可能丢失");
  }

  function addFavorite(url, title, source, card) {
    if (favorites.some((item) => item.url === url)) {
      showCenterHeart(card);
      showToast("这张图片已经收藏过了");
      return;
    }
    favorites.unshift({ url, title, source, addedAt: Date.now() });
    const persisted = saveStoredFavorites();
    syncFavoriteButtons();
    refreshFavoritesView();
    showCenterHeart(card);
    showToast(persisted ? "已通过右键加入收藏" : "已加入收藏，但浏览器存储不可用，刷新后可能丢失");
  }

  function removeFavoriteUrls(urls) {
    const removeSet = new Set(urls);
    const before = favorites.length;
    favorites = favorites.filter((item) => !removeSet.has(item.url));
    removeSet.forEach((url) => selectedFavoriteUrls.delete(url));
    if (favorites.length === before) return;
    if (!favorites.length) favoritesSelectionMode = false;
    const persisted = saveStoredFavorites();
    syncFavoriteButtons();
    refreshFavoritesView();
    showToast(persisted ? "已清除所选收藏" : "已暂时清除，但浏览器存储不可用，刷新后可能恢复");
  }

  function cancelFavoriteRender() {
    favoritesRenderVersion++;
    if (favoritesRenderFrame) window.cancelAnimationFrame(favoritesRenderFrame);
    favoritesRenderFrame = 0;
  }

  function createFavoriteCard(item) {
    const card = document.createElement("article");
    card.className = "gallery-favorite-card";
    if (selectedFavoriteUrls.has(item.url)) card.classList.add("is-selected");

    const selection = document.createElement("label");
    selection.className = "gallery-favorite-selection";
    selection.hidden = !favoritesSelectionMode;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedFavoriteUrls.has(item.url);
    checkbox.setAttribute("aria-label", "选择 " + (item.title || "收藏图片"));
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedFavoriteUrls.add(item.url);
      else selectedFavoriteUrls.delete(item.url);
      card.classList.toggle("is-selected", checkbox.checked);
      syncFavoriteToolbar();
    });
    selection.append(checkbox, document.createTextNode("选择"));

    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "gallery-favorite-preview";
    preview.dataset.sourceUrl = item.url;
    preview.dataset.title = item.title || "随机插画";
    preview.setAttribute("aria-label", "预览 " + preview.dataset.title);
    const image = document.createElement("img");
    image.alt = item.title || "收藏的插画";
    image.loading = "lazy";
    image.decoding = "async";
    image.src = item.url;
    preview.append(image);
    preview.addEventListener("click", () => openGalleryLightbox(item.url, item.title, preview, "favorites"));

    const downloadedTag = document.createElement("span");
    downloadedTag.className = "gallery-favorite-local-tag";
    downloadedTag.textContent = "已下载";
    downloadedTag.hidden = !item.downloaded;

    const details = document.createElement("div");
    details.className = "gallery-favorite-details";
    const title = document.createElement("strong");
    title.textContent = item.title || "随机插画";
    const meta = document.createElement("span");
    const date = new Date(item.addedAt);
    meta.textContent = (item.source || "图片源") + " · " + (Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString());
    details.append(title, meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "gallery-favorite-remove";
    remove.textContent = "移除";
    remove.setAttribute("aria-label", "从收藏夹移除 " + (item.title || "图片"));
    remove.addEventListener("click", () => removeFavoriteUrls([item.url]));
    card.append(selection, preview, downloadedTag, details, remove);
    return card;
  }

  function renderFavorites() {
    if (!favoritesGrid || !favoritesEmpty) return;
    if (!favorites.length) {
      favoritesSelectionMode = false;
      selectedFavoriteUrls.clear();
    }
    const stillSaved = new Set(favorites.map((item) => item.url));
    selectedFavoriteUrls = new Set([...selectedFavoriteUrls].filter((url) => stillSaved.has(url)));
    syncFavoriteToolbar();

    // Mutations from the main gallery only mark this view dirty; they must not
    // create hidden cards or start thumbnail requests in the background.
    if (!favoritesDialog || favoritesDialog.hidden) {
      favoritesRenderDirty = true;
      cancelFavoriteRender();
      return;
    }
    if (!favoritesRenderDirty) return;

    cancelFavoriteRender();
    const renderVersion = ++favoritesRenderVersion;
    const items = favorites.slice();

    if (!items.length) {
      favoritesGrid.replaceChildren();
      favoritesGrid.hidden = true;
      favoritesEmpty.hidden = false;
      favoritesRenderDirty = false;
      syncFavoriteToolbar();
      return;
    }

    favoritesEmpty.hidden = true;
    favoritesGrid.hidden = false;
    if (favoritesCount) favoritesCount.textContent = "正在准备 " + items.length + " 张收藏…";

    // Build detached batches of 16 cards. Give the route transition a paint
    // opportunity first, then yield between batches so taps/scroll stay responsive.
    const fragment = document.createDocumentFragment();
    let index = 0;
    const buildBatch = () => {
      favoritesRenderFrame = 0;
      if (renderVersion !== favoritesRenderVersion || !favoritesDialog || favoritesDialog.hidden) {
        favoritesRenderDirty = true;
        return;
      }

      const batch = document.createDocumentFragment();
      const end = Math.min(index + 16, items.length);
      while (index < end) batch.append(createFavoriteCard(items[index++]));
      fragment.append(batch);

      if (index < items.length) {
        favoritesRenderFrame = window.requestAnimationFrame(buildBatch);
        return;
      }
      if (renderVersion !== favoritesRenderVersion || !favoritesDialog || favoritesDialog.hidden) {
        favoritesRenderDirty = true;
        return;
      }

      favoritesGrid.replaceChildren(fragment);
      favoritesGrid.hidden = false;
      favoritesEmpty.hidden = true;
      favoritesRenderDirty = false;
      syncFavoriteToolbar();
    };

    favoritesRenderFrame = window.requestAnimationFrame(() => {
      if (renderVersion !== favoritesRenderVersion || !favoritesDialog || favoritesDialog.hidden) {
        favoritesRenderFrame = 0;
        favoritesRenderDirty = true;
        return;
      }
      favoritesRenderFrame = window.requestAnimationFrame(buildBatch);
    });
  }

  function refreshFavoritesView() {
    favoritesRenderDirty = true;
    renderFavorites();
  }

  function setFavoriteDownloaded(urls, downloaded, notify = true) {
    const urlSet = new Set(urls);
    let changed = 0;
    favorites = favorites.map((item) => {
      if (!urlSet.has(item.url) || item.downloaded === downloaded) return item;
      changed++;
      return { ...item, downloaded };
    });
    if (!changed) {
      if (notify) showToast(downloaded ? "所选图片已标记" : "所选图片没有下载标记");
      return;
    }
    const persisted = saveStoredFavorites();
    refreshFavoritesView();
    if (notify) showToast(persisted ? (downloaded ? `已标记 ${changed} 张` : `已清除 ${changed} 个标记`) : "已更新，但本地存储不可用，刷新后可能恢复");
  }

  function openDownloadConfirm() {
    if (!downloadConfirmDialog || downloadingFavorites) return;
    if (downloadConfirmExcludeDownloaded) downloadConfirmExcludeDownloaded.checked = true;
    syncDownloadConfirmSummary();
    downloadConfirmDialog.hidden = false;
    document.body.classList.add("gallery-download-confirm-open");
    downloadConfirmCancel?.focus();
  }

  function closeDownloadConfirm() {
    if (!downloadConfirmDialog || downloadConfirmDialog.hidden) return;
    downloadConfirmDialog.hidden = true;
    document.body.classList.remove("gallery-download-confirm-open");
    favoriteDownloadAllButton?.focus();
  }

  function syncDownloadConfirmSummary() {
    if (!downloadConfirmSummary) return;
    const exclude = Boolean(downloadConfirmExcludeDownloaded?.checked);
    const count = favorites.filter((item) => !exclude || !item.downloaded).length;
    const skipped = favorites.length - count;
    downloadConfirmSummary.textContent = exclude
      ? `将下载 ${count} 张${skipped ? `，跳过 ${skipped} 张已下载图片` : "，不重复下载已标记图片"}`
      : `将下载全部 ${count} 张收藏图片`;
    if (downloadConfirmStart) downloadConfirmStart.disabled = count === 0 || downloadingFavorites;
  }

  async function downloadFavoriteImage(url, index = 1) {
    const response = await fetch(galleryApiUrl("?mode=download&url=" + encodeURIComponent(url)), { cache: "no-store" });
    if (!response.ok) throw new Error("图片下载失败");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    const type = blob.type.toLowerCase();
    const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : type.includes("avif") ? "avif" : "jpg";
    link.download = `BzAxu-favorite-${Date.now()}-${String(index).padStart(3, "0")}.${extension}`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  }

  const FAVORITE_ZIP_BATCH_SIZE = 50;
  let favoriteDownloadController = null;
  let favoriteDownloadCancelled = false;
  let downloadManagerHasRun = false;
  let jsZipPromise = null;

  function loadJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (jsZipPromise) return jsZipPromise;
    jsZipPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => window.JSZip ? resolve(window.JSZip) : reject(new Error("ZIP 库加载失败"));
      script.onerror = () => {
        jsZipPromise = null;
        reject(new Error("无法加载 ZIP 组件，请检查网络后重试"));
      };
      document.head.append(script);
    });
    return jsZipPromise;
  }

  function setDownloadProgress(fetchDone, fetchTotal, currentBytes = 0, currentTotal = 0, zipPercent = 0) {
    const ratio = fetchTotal ? Math.min(100, Math.round(fetchDone / fetchTotal * 100)) : 0;
    if (downloadFetchLabel) downloadFetchLabel.textContent = `${fetchDone} / ${fetchTotal} 张`;
    if (downloadFetchProgress) downloadFetchProgress.style.width = ratio + "%";
    if (downloadBytesLabel) {
      downloadBytesLabel.textContent = currentTotal > 0
        ? `当前图片 ${formatDownloadBytes(currentBytes)} / ${formatDownloadBytes(currentTotal)}`
        : currentBytes > 0 ? `当前图片已接收 ${formatDownloadBytes(currentBytes)}` : "等待下载数据";
    }
    if (downloadZipLabel) downloadZipLabel.textContent = `ZIP ${Math.round(zipPercent)}%`;
    if (downloadZipProgress) downloadZipProgress.style.width = Math.max(0, Math.min(100, zipPercent)) + "%";
  }

  function formatDownloadBytes(value) {
    if (!Number.isFinite(value) || value < 0) return "—";
    if (value < 1024) return value + " B";
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
    return (value / (1024 * 1024)).toFixed(1) + " MB";
  }

  function extensionForBlob(blob) {
    const type = (blob.type || "").toLowerCase();
    return type.includes("png") ? "png" : type.includes("webp") ? "webp" :
      type.includes("gif") ? "gif" : type.includes("avif") ? "avif" : type.includes("jpeg") ? "jpg" : "jpg";
  }

  function renderDownloadQueue(tasks) {
    if (!downloadManagerQueue) return;
    downloadManagerQueue.replaceChildren();
    tasks.forEach((task) => {
      const row = document.createElement("div");
      row.className = "gallery-download-queue-item";
      row.dataset.taskIndex = String(task.index);
      const title = document.createElement("strong");
      title.textContent = task.filename;
      const detail = document.createElement("span");
      detail.textContent = `${task.urls.length} 张图片 · 等待中`;
      detail.dataset.taskStatus = "true";
      row.append(title, detail);
      downloadManagerQueue.append(row);
      task.element = row;
      task.statusElement = detail;
    });
    if (downloadQueueCount) downloadQueueCount.textContent = `${tasks.length} 个 ZIP`;
  }

  function setDownloadTaskStatus(task, status) {
    task.status = status;
    if (task.statusElement) task.statusElement.textContent = `${task.urls.length} 张图片 · ${status}`;
    if (task.element) {
      task.element.classList.toggle("is-active", status === "正在处理");
      task.element.classList.toggle("is-complete", status === "已下载");
      task.element.classList.toggle("is-failed", status.startsWith("失败"));
      task.element.classList.toggle("is-cancelled", status === "已取消");
    }
  }

  function renderDownloadFiles(urls) {
    if (!downloadManagerFiles) return [];
    downloadManagerFiles.replaceChildren();
    const rows = urls.map((url, index) => {
      const row = document.createElement("div");
      row.className = "gallery-download-file-item";
      const name = document.createElement("span");
      name.textContent = `图片 ${String(index + 1).padStart(3, "0")}`;
      const state = document.createElement("span");
      state.textContent = "等待中";
      state.className = "gallery-download-file-status";
      row.append(name, state);
      downloadManagerFiles.append(row);
      return { row, state, url, index };
    });
    if (downloadFileCount) downloadFileCount.textContent = `${urls.length} 张`;
    return rows;
  }

  async function readImageResponse(response, signal, onProgress) {
    const total = Number(response.headers.get("content-length")) || 0;
    if (!response.body || !response.body.getReader) {
      const blob = await response.blob();
      onProgress(blob.size, total || blob.size);
      return blob;
    }
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    try {
      while (true) {
        if (signal.aborted) throw new DOMException("下载已取消", "AbortError");
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        onProgress(received, total);
      }
    } catch (error) {
      try { await reader.cancel(); } catch (_) {}
      throw error;
    }
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    return new Blob(chunks, { type: contentType });
  }

  async function runFavoriteDownloads(urls) {
    if (!urls.length || downloadingFavorites || !downloadManager) return;
    const tasks = [];
    for (let start = 0; start < urls.length; start += FAVORITE_ZIP_BATCH_SIZE) {
      const chunk = urls.slice(start, start + FAVORITE_ZIP_BATCH_SIZE);
      const taskNumber = tasks.length + 1;
      tasks.push({
        index: taskNumber,
        urls: chunk,
        successfulUrls: [],
        filename: `BzAxu-favorites-${String(taskNumber).padStart(2, "0")}.zip`,
        status: "等待中"
      });
    }

    downloadingFavorites = true;
    favoriteDownloadCancelled = false;
    downloadManagerHasRun = true;
    if (downloadManagerCancel) downloadManagerCancel.textContent = "取消下载";
    favoriteDownloadController = new AbortController();
    syncFavoriteToolbar();
    openDownloadManager();
    renderDownloadQueue(tasks);
    if (downloadManagerSummary) downloadManagerSummary.textContent = `已加入 ${urls.length} 张图片，分为 ${tasks.length} 个 ZIP 任务。`;
    if (downloadManagerCancel) downloadManagerCancel.disabled = false;
    let completedImages = 0;
    let processedImages = 0;
    let failedImages = 0;
    let completedTasks = 0;
    let fatalError = "";

    try {
      const JSZip = await loadJSZip();
      for (const task of tasks) {
        if (favoriteDownloadCancelled) break;
        setDownloadTaskStatus(task, "正在处理");
        const zip = new JSZip();
        const fileRows = renderDownloadFiles(task.urls);
        let taskFailed = 0;
        let taskSucceeded = 0;
        for (let i = 0; i < task.urls.length; i++) {
          if (favoriteDownloadCancelled) break;
          const file = fileRows[i];
          try {
            file.state.textContent = "下载中";
            const response = await fetch(galleryApiUrl("?mode=download&url=" + encodeURIComponent(file.url)), {
              cache: "no-store",
              signal: favoriteDownloadController.signal
            });
            if (!response.ok) throw new Error("HTTP " + response.status);
            const blob = await readImageResponse(response, favoriteDownloadController.signal, (received, total) => {
              setDownloadProgress(processedImages, urls.length, received, total, 0);
              file.state.textContent = total > 0
                ? `下载中 · ${Math.min(100, Math.round(received / total * 100))}%`
                : `接收中 · ${formatDownloadBytes(received)}`;
            });
            const name = `image-${String(task.index * FAVORITE_ZIP_BATCH_SIZE - FAVORITE_ZIP_BATCH_SIZE + i + 1).padStart(4, "0")}.${extensionForBlob(blob)}`;
            zip.file(name, blob);
            task.successfulUrls.push(file.url);
            completedImages++;
            taskSucceeded++;
            file.state.textContent = "已加入 ZIP";
          } catch (error) {
            if (error.name === "AbortError" || favoriteDownloadCancelled) {
              file.state.textContent = "已取消";
              break;
            }
            console.warn("Favorite ZIP item failed:", error);
            taskFailed++;
            failedImages++;
            file.state.textContent = "下载失败";
          }
          processedImages++;
          setDownloadProgress(processedImages, urls.length, 0, 0, 0);
          if (favoritesCount) favoritesCount.textContent = `ZIP 下载中：${completedImages} / ${urls.length} 张`;
        }
        if (favoriteDownloadCancelled) {
          setDownloadTaskStatus(task, "已取消");
          break;
        }
        if (Object.keys(zip.files).length === 0) {
          setDownloadTaskStatus(task, "失败 · 没有可打包的图片");
          continue;
        }
        if (downloadManagerSummary) downloadManagerSummary.textContent = `第 ${task.index} / ${tasks.length} 个 ZIP 正在打包…`;
        try {
          const blob = await zip.generateAsync({ type: "blob", compression: "STORE" }, (metadata) => {
            setDownloadProgress(completedImages, urls.length, 0, 0, metadata.percent || 0);
            if (downloadManagerSummary) downloadManagerSummary.textContent =
              `第 ${task.index} / ${tasks.length} 个 ZIP 打包中 · ${Math.round(metadata.percent || 0)}%`;
          });
          if (favoriteDownloadCancelled) {
            setDownloadTaskStatus(task, "已取消");
            break;
          }
          const objectUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = task.filename;
          document.body.append(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
          setFavoriteDownloaded(task.successfulUrls, true, false);
          completedTasks++;
          setDownloadTaskStatus(task, taskFailed ? `已下载 · ${taskFailed} 张失败` : "已下载");
        } catch (error) {
          console.error("ZIP generation failed:", error);
          setDownloadTaskStatus(task, "失败 · ZIP 生成失败");
          failedImages += taskSucceeded;
        }
      }
    } catch (error) {
      console.error("Unable to initialize ZIP download:", error);
      fatalError = error.message || "ZIP 初始化失败";
      for (const task of tasks) {
        if (!task.status || task.status === "等待中") setDownloadTaskStatus(task, "失败 · ZIP 初始化失败");
      }
      if (downloadManagerSummary) downloadManagerSummary.textContent = fatalError;
      showToast(fatalError);
    } finally {
      downloadingFavorites = false;
      favoriteDownloadController = null;
      syncFavoriteToolbar();
      if (downloadManagerCancel) downloadManagerCancel.disabled = true;
      for (const task of tasks) {
        if (favoriteDownloadCancelled && task.status === "等待中") setDownloadTaskStatus(task, "已取消");
      }
      const summary = fatalError
        ? `任务未完成：${fatalError}`
        : favoriteDownloadCancelled
          ? `已取消：已生成 ${completedTasks} 个 ZIP，失败 ${failedImages} 张`
          : `任务结束：生成 ${completedTasks} 个 ZIP，下载失败 ${failedImages} 张`;
      if (downloadManagerSummary) downloadManagerSummary.textContent = summary;
      if (favoritesCount) favoritesCount.textContent = summary;
      if (downloadManagerCancel) downloadManagerCancel.textContent = "已结束";
      showToast(summary);
    }
  }

  if (favoriteDownloadQueueButton) favoriteDownloadQueueButton.addEventListener("click", openDownloadManager);
  if (favoriteSelectAllButton) favoriteSelectAllButton.addEventListener("click", () => {
    if (!favoritesSelectionMode) return;
    const allSelected = favorites.length > 0 && selectedFavoriteUrls.size === favorites.length;
    selectedFavoriteUrls = allSelected ? new Set() : new Set(favorites.map((item) => item.url));
    refreshFavoritesView();
  });
  if (favoriteMarkDownloadedButton) favoriteMarkDownloadedButton.addEventListener("click", () => {
    setFavoriteDownloaded([...selectedFavoriteUrls], true);
  });
  if (favoriteClearDownloadTagButton) favoriteClearDownloadTagButton.addEventListener("click", () => {
    setFavoriteDownloaded([...selectedFavoriteUrls], false);
  });
  if (favoriteDownloadAllButton) favoriteDownloadAllButton.addEventListener("click", openDownloadConfirm);
  if (downloadConfirmExcludeDownloaded) downloadConfirmExcludeDownloaded.addEventListener("change", syncDownloadConfirmSummary);
  if (downloadConfirmCancel) downloadConfirmCancel.addEventListener("click", closeDownloadConfirm);
  if (downloadConfirmDialog) {
    downloadConfirmDialog.querySelectorAll("[data-download-confirm-close]").forEach((button) => button.addEventListener("click", closeDownloadConfirm));
    if (downloadConfirmStart) downloadConfirmStart.addEventListener("click", () => {
      const exclude = Boolean(downloadConfirmExcludeDownloaded?.checked);
      const urls = favorites.filter((item) => !exclude || !item.downloaded).map((item) => item.url);
      closeDownloadConfirm();
      if (!urls.length) {
        showToast("没有需要下载的图片");
        return;
      }
      runFavoriteDownloads(urls);
    });
    document.addEventListener("keydown", (event) => {
      if (downloadConfirmDialog.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeDownloadConfirm();
      } else trapDialogTab(event, downloadConfirmDialog);
    });
  }

  if (downloadManagerCancel) {
    downloadManagerCancel.addEventListener("click", () => {
      if (!downloadingFavorites || !favoriteDownloadController) return;
      favoriteDownloadCancelled = true;
      favoriteDownloadController.abort();
      downloadManagerCancel.disabled = true;
      if (downloadManagerSummary) downloadManagerSummary.textContent = "正在取消当前任务…";
    });
  }

  function openGalleryLightbox(url, title, trigger, source = "gallery") {
    lightboxTrigger = trigger;
    lightboxSource = source;
    lightboxImage.src = url;
    lightboxTitle.textContent = title || "随机插画";
    sourceLink.href = url;
    sourceLink.textContent = "查看原图 ↗";
    downloadButton.dataset.downloadUrl = url;
    downloadButton.disabled = false;
    downloadButton.textContent = "↓ 下载图片";
    openAnimatedDialog(lightbox, "gallery-open");
    if (!history.state || !history.state.galleryLightbox) {
      history.pushState({ ...(history.state || {}), view: currentRoute, galleryLightbox: true }, "", window.location.href);
    }
    lightbox.querySelector("[data-gallery-close]").focus();
  }

  if (showFavoriteButtonCheckbox) {
    showFavoriteButtonCheckbox.checked = showFavoriteButton;
    showFavoriteButtonCheckbox.addEventListener("change", updateFavoritePreference);
  }
  if (sidebarFavoritesButton) sidebarFavoritesButton.addEventListener("click", () => {
    closeSidebar({ restoreFocus: false });
    openFavoritesDialog();
  });
  if (favoriteBackButton) favoriteBackButton.addEventListener("click", () => closeFavoritesDialog());
  if (favoriteEmptyBackButton) favoriteEmptyBackButton.addEventListener("click", () => closeFavoritesDialog());
  if (favoriteModalCloseButton) favoriteModalCloseButton.addEventListener("click", () => closeFavoritesDialog());
  if (favoritesDialog) favoritesDialog.querySelectorAll("[data-gallery-favorites-close]").forEach((button) => button.addEventListener("click", () => closeFavoritesDialog()));
  if (favoriteMultiSelectButton) favoriteMultiSelectButton.addEventListener("click", () => {
    favoritesSelectionMode = !favoritesSelectionMode;
    selectedFavoriteUrls.clear();
    refreshFavoritesView();
  });
  if (favoriteClearSelectedButton) favoriteClearSelectedButton.addEventListener("click", () => {
    if (!selectedFavoriteUrls.size) return;
    removeFavoriteUrls([...selectedFavoriteUrls]);
  });
  if (favoriteClearAllButton) favoriteClearAllButton.addEventListener("click", () => {
    if (!favorites.length || !window.confirm("确定清除本地收藏夹中的全部图片吗？此操作无法撤销。")) return;
    favorites = [];
    selectedFavoriteUrls.clear();
    const persisted = saveStoredFavorites();
    favoritesSelectionMode = false;
    syncFavoriteButtons();
    refreshFavoritesView();
    showToast(persisted ? "已清除全部收藏" : "已暂时清除，但浏览器存储不可用，刷新后可能恢复");
  });
  // The download-all action is confirmed in the dedicated dialog above.
  if (favoriteDownloadSelectedButton) favoriteDownloadSelectedButton.addEventListener("click", () => {
    const selected = favorites.filter((item) => selectedFavoriteUrls.has(item.url)).map((item) => item.url);
    runFavoriteDownloads(selected);
  });
  renderFavorites();
  syncFavoriteButtons();

  function transition(callback) {
    if (document.startViewTransition) document.startViewTransition(callback);
    else callback();
  }

  function renderRoute(route, { updateHistory = false, replace = false } = {}) {
    const previousRoute = currentRoute;
    const nextRoute = route === "gallery" || route === "favorites" ? route : "home";
    if (previousRoute === "favorites" && nextRoute !== "favorites") {
      // Keep a completed list cached when simply returning to the gallery.
      // Only rebuild if leaving cancels an unfinished batch render.
      if (favoritesRenderFrame) favoritesRenderDirty = true;
      cancelFavoriteRender();
    }
    currentRoute = nextRoute;
    const updateRoute = () => {
      const pageActive = currentRoute !== "home";
      document.body.classList.toggle("gallery-view-active", pageActive);
      homePage.hidden = pageActive;
      galleryPage.hidden = !pageActive;
      const galleryContent = galleryPage.querySelector(".gallery-content");
      if (galleryContent) galleryContent.hidden = currentRoute !== "gallery";
      if (footer) footer.hidden = pageActive;
      window.scrollTo({ top: 0, behavior: "auto" });
      if (updateHistory) {
        const url = new URL(window.location.href);
        if (currentRoute === "home") url.searchParams.delete("page");
        else url.searchParams.set("page", currentRoute);
        history[replace ? "replaceState" : "pushState"]({ view: currentRoute }, "", url);
      }
    };

    // The native View Transition API snapshots the full rendered page. Avoid
    // that expensive snapshot for the favorites route, where a gallery full of
    // image cards and glass effects may be present. Existing CSS view-in
    // animations remain active, and other route transitions are unchanged.
    if (previousRoute === "favorites" || nextRoute === "favorites") updateRoute();
    else transition(updateRoute);
    if (currentRoute === "gallery" && !imageCount() && !loading) loadImages({ reset: true, targetCount: 100 });
    if (currentRoute !== "home") checkProviderStatus();
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
    if (!lightbox.hidden) {
      closeLightbox({ fromHistory: true });
      return;
    }
    const hasFavoritesHistory = Boolean(history.state && history.state.galleryFavoritesDialog);
    if (favoritesDialog && !favoritesDialog.hidden && !hasFavoritesHistory) {
      closeFavoritesDialog({ fromHistory: true });
      return;
    }
    if (favoritesDialog && favoritesDialog.hidden && hasFavoritesHistory) {
      openFavoritesDialog({ fromHistory: true });
      return;
    }
    const stateView = history.state && history.state.view;
    const pageParam = new URL(window.location.href).searchParams.get("page");
    const nextRoute = stateView === "gallery" || pageParam === "gallery" || pageParam === "favorites"
      ? "gallery" : "home";
    // Closing a history-backed preview returns to the same gallery entry. Do not
    // call renderRoute in that case, because it would jump the page back to top.
    if (nextRoute !== currentRoute) renderRoute(nextRoute);
  });

  function setLoading(value) {
    loading = value;
    if (value) {
      grid.querySelectorAll(".gallery-skeleton-placeholder").forEach((item) => item.remove());
      // Fill the visible viewport with placeholders, distributing them explicitly
      // across lanes. Measuring equal/zero-height lanes during refresh can otherwise
      // send every placeholder into the first lane before layout has settled.
      if (!galleryLanes.length) setGalleryLaneCount("auto");
      const laneCount = Math.max(1, galleryLanes.length);
      const gridTop = Math.max(0, grid.getBoundingClientRect().top);
      const visibleHeight = Math.max(window.innerHeight - gridTop, window.innerHeight * 0.75);
      const gridStyle = window.getComputedStyle(grid);
      const laneGap = parseFloat(gridStyle.columnGap || gridStyle.gap) || 10;
      const laneWidth = galleryLanes[0]?.getBoundingClientRect().width ||
        (grid.clientWidth / laneCount);
      const placeholderHeight = Math.max(120, laneWidth * 4 / 3);
      const rowsNeeded = Math.ceil(visibleHeight / (placeholderHeight + laneGap)) + 1;
      const placeholderCount = Math.max(15, laneCount * rowsNeeded);
      for (let i = 0; i < placeholderCount; i++) {
        const skeleton = document.createElement("div");
        skeleton.className = "gallery-skeleton-placeholder";
        skeleton.setAttribute("aria-hidden", "true");
        galleryLanes[i % laneCount].append(skeleton);
      }
    } else {
      removePlaceholdersIfSettled();
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
    // A short batch must be refilled before the viewport auto-loader can
    // start an unrelated "load more" batch.
    if (latestImageBatch && latestImageBatch.refillScheduled) return;
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

  function scheduleShortBatchRefill(batch) {
    if (!batch || batch.generation !== galleryGeneration ||
        !batch.requestFinished || batch.pending > 0 || loading ||
        batch.refillScheduled || imageCount() >= batch.targetTotal) return;
    if (batch.refillAttempts >= 10) {
      status.textContent = "已显示 " + imageCount() + " 张；部分图片加载失败，可重试补齐";
      return;
    }

    batch.refillScheduled = true;
    const deficit = batch.targetTotal - imageCount();
    window.setTimeout(() => {
      if (batch.generation !== galleryGeneration ||
          latestImageBatch !== batch ||
          imageCount() >= batch.targetTotal) return;
      loadImages({
        targetCount: batch.targetTotal - imageCount(),
        replacementAttempts: batch.refillAttempts + 1
      });
    }, 0);
  }

  function settleImageBatch(batch, loaded) {
    if (batch) {
      batch.pending = Math.max(0, batch.pending - 1);
      if (loaded) batch.loaded++;
      else batch.failed++;
    }
    // Old-generation image events may finish after a refresh. They must not
    // update status, remove current placeholders, or trigger new auto-loads.
    if (batch && batch.generation !== galleryGeneration) return;
    updateGalleryStatus();
    removePlaceholdersIfSettled();
    if (!imageCount() && !pendingImageCount() && !loading) {
      showNoImagesState();
    }
    scheduleShortBatchRefill(batch);
    refreshAutoLoadAfterImages();
  }

  function addImage(url, sourceName = "图片源", batch = null) {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    const generation = galleryGeneration;

    // Build the card now, but do not attach it to the gallery until the image
    // has loaded and decoded successfully.
    const card = document.createElement("div");
    card.className = "gallery-item";
    const revealIndex = batch ? batch.added : 0;
    card.style.setProperty("--gallery-reveal-delay", Math.min(revealIndex, 8) * 16 + "ms");
    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.className = "gallery-item-preview";
    previewButton.setAttribute("aria-label", "查看插画");
    previewButton.dataset.sourceUrl = url;
    previewButton.dataset.title = "随机插画";
    const img = document.createElement("img");
    img.loading = "eager";
    img.decoding = "async";
    img.alt = "插画";
    img.className = "is-loading";
    previewButton.append(img);
    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "gallery-favorite-toggle";
    favoriteButton.dataset.sourceUrl = url;
    favoriteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.8 4.6a5.2 5.2 0 0 0-7.4 0L12 6l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4l1.4 1.4L12 20.8l7.4-7.4 1.4-1.4a5.2 5.2 0 0 0 0-7.4Z"/></svg>';
    updateFavoriteButton(favoriteButton, url);
    favoriteButton.hidden = !showFavoriteButton;
    const heartFeedback = document.createElement("span");
    heartFeedback.className = "gallery-heart-feedback";
    heartFeedback.setAttribute("aria-hidden", "true");
    heartFeedback.innerHTML = '<svg viewBox="0 0 24 24" focusable="false"><path d="M20.8 4.6a5.2 5.2 0 0 0-7.4 0L12 6l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4l1.4 1.4L12 20.8l7.4-7.4 1.4-1.4a5.2 5.2 0 0 0 0-7.4Z"/></svg>';
    card.append(previewButton, favoriteButton, heartFeedback);

    card.dataset.sourceUrl = url;
    card.dataset.title = "随机插画";

    const record = {
      generation,
      batch,
      url,
      card,
      img,
      settled: false,
      timer: 0,
      cancel: null
    };
    pendingImages.add(record);
    if (batch) {
      batch.added++;
      batch.pending++;
    }

    const clearLoadTimer = () => {
      if (record.timer) window.clearTimeout(record.timer);
      record.timer = 0;
    };

    const failImage = () => {
      if (record.settled) return;
      record.settled = true;
      clearLoadTimer();
      pendingImages.delete(record);
      card.remove();
      if (generation === galleryGeneration) seen.delete(url);
      settleImageBatch(batch, false);
    };

    const onLoad = async () => {
      if (record.settled) return;
      if (generation !== galleryGeneration) {
        failImage();
        return;
      }
      try {
        if (typeof img.decode === "function") await img.decode();
      } catch (_) {
        // Some browsers reject decode() even when the image is usable.
      }
      if (record.settled) return;
      if (generation !== galleryGeneration || !img.naturalWidth || !img.naturalHeight) {
        failImage();
        return;
      }

      record.settled = true;
      clearLoadTimer();
      pendingImages.delete(record);
      img.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
      img.style.height = "auto";
      img.dataset.naturalRatio = img.naturalWidth + ":" + img.naturalHeight;
      img.classList.remove("is-loading");
      card.classList.add("gallery-item--loaded");

      // Insert the successful image among real cards, immediately above the
      // decorative placeholders that are temporarily pinned to the bottom.
      insertLoadedCardBeforePlaceholders(card);
      empty.hidden = true;
      settleImageBatch(batch, true);
    };

    record.cancel = () => {
      if (record.settled) return;
      record.settled = true;
      clearLoadTimer();
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", failImage);
      img.removeAttribute("src");
    };
    img.addEventListener("load", onLoad, { once: true });
    img.addEventListener("error", failImage, { once: true });
    // Do not discard slow images on a fixed timer; only a real error or refresh cancels them.
    img.src = url;

    previewButton.addEventListener("click", () => openGalleryLightbox(url, card.dataset.title, previewButton, "gallery"));
    previewButton.addEventListener("contextmenu", (event) => {
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      event.preventDefault();
      addFavorite(url, card.dataset.title, sourceName, card);
    });
    favoriteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const wasFavorite = favorites.some((item) => item.url === url);
      toggleFavorite(url, card.dataset.title, sourceName);
      if (!wasFavorite) showCenterHeart(card);
    });
    return true;
  }

  async function loadImages({ reset = false, targetCount = 20, replacementAttempts = 0 } = {}) {
    if (loading) return;
    if (reset) {
      galleryGeneration++;
      cancelPendingImages();
      grid.querySelectorAll(".gallery-item").forEach((card) => card.remove());
      grid.querySelectorAll(".gallery-skeleton-placeholder").forEach((item) => item.remove());
      seen.clear();
      lastRequestUsedFallback = false;
    }
    const targetTotal = imageCount() + pendingImageCount() + Math.max(0, targetCount);
    const batch = {
      id: ++imageBatchSequence,
      generation: galleryGeneration,
      targetTotal,
      replacementAttempts,
      refillScheduled: false,
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
        if (blockedTags.length && (source === "auto" || source === "safebooru")) params.set("blockedTags", blockedTags.join(","));
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
      // A batch is not considered filled until images actually load. Re-request
      // only the missing count, with a bounded retry budget to avoid API loops.
      scheduleShortBatchRefill(batch);
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
      if (lightboxTrigger && lightboxTrigger.isConnected) lightboxTrigger.focus();
      lightboxTrigger = null;
      lightboxSource = "gallery";
      // The initial gallery entry keeps view:"gallery" in history.state, so popping
      // the preview marker closes the dialog without leaving the gallery.
      const shouldGoBack = !lightboxCloseFromHistory && history.state && history.state.galleryLightbox;
      lightboxCloseFromHistory = false;
      if (shouldGoBack) history.back();
    });
  }
  lightbox.querySelectorAll("[data-gallery-close]").forEach((button) => button.addEventListener("click", () => closeLightbox()));
  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden || getTopmostOpenDialog() !== lightbox) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeLightbox();
      return;
    }
    if (event.key === "Tab") {
      trapDialogTab(event, lightbox);
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const cards = lightboxSource === "favorites"
        ? [...favoritesGrid.querySelectorAll(".gallery-favorite-preview")]
        : [...grid.querySelectorAll(".gallery-item-preview")];
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
  const selectedTagsStorageKey = "waifu-gallery-selected-tags-v1";
  const blockedTagsStorageKey = "waifu-gallery-blocked-tags-v1";
  function readStoredTagList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(value)) return [];
      return [...new Set(value.filter((tag) => typeof tag === "string" && /^[\p{L}\p{N}_-]{1,64}$/u.test(tag)))];
    } catch (_) { return []; }
  }
  function saveTagPreferences() {
    try {
      localStorage.setItem(selectedTagsStorageKey, JSON.stringify(selectedTags));
      localStorage.setItem(blockedTagsStorageKey, JSON.stringify(blockedTags));
      return true;
    } catch (_) { return false; }
  }
  let activeTagCategory = "hair";
  let selectedTags = readStoredTagList(selectedTagsStorageKey);
  let blockedTags = readStoredTagList(blockedTagsStorageKey);
  let tagSelectionMode = "include";
  if (tagInput && selectedTags.length) tagInput.value = selectedTags.join(",");
  let tagDialogTrigger = null;
  let tagOptionsAnimationTimer = 0;
  function syncSelectedTagsFromInput() {
    selectedTags = [...new Set((tagInput && tagInput.value ? tagInput.value.split(/[\s,]+/) : []).map((tag) => tag.trim()).filter((tag) => /^[\p{L}\p{N}_-]{1,64}$/u.test(tag)))];
  }
  function activeTagList() { return tagSelectionMode === "block" ? blockedTags : selectedTags; }
  function blockingTagsAvailable() { return !sourceSelect || ["auto", "safebooru"].includes(sourceSelect.value); }
  function syncTagModeButtons() {
    if (tagModeIncludeButton) {
      tagModeIncludeButton.classList.toggle("is-active", tagSelectionMode === "include");
      tagModeIncludeButton.setAttribute("aria-pressed", String(tagSelectionMode === "include"));
    }
    if (tagModeBlockButton) {
      tagModeBlockButton.classList.toggle("is-active", tagSelectionMode === "block");
      tagModeBlockButton.setAttribute("aria-pressed", String(tagSelectionMode === "block"));
    }
    if (tagSelectedTitle) tagSelectedTitle.textContent = "当前标签状态";
    if (tagDialogDescription) tagDialogDescription.textContent =
      "同一份标签列表同时显示筛选与屏蔽状态。切换操作不会切换或重置列表，设置会保存在本地。";
    if (tagClearButton) tagClearButton.textContent = tagSelectionMode === "block" ? "清空屏蔽标签" : "清空筛选标签";
  }
  function tagLabel(tag) { return (Object.values(TAG_CATEGORIES).flat().find((item) => item[0] === tag) || [tag, tag])[1]; }
  function tagState(tag) {
    if (blockedTags.includes(tag)) return "block";
    if (selectedTags.includes(tag)) return "include";
    return "none";
  }
  function renderSelectedTags() {
    if (!tagSelected) return;
    const all = [
      ...selectedTags.map((tag) => ({ tag, state: "include" })),
      ...blockedTags.map((tag) => ({ tag, state: "block" }))
    ];
    const active = new Set(all.map((item) => item.tag));
    tagSelected.querySelectorAll(".gallery-tag-selected-chip").forEach((chip) => {
      if (!active.has(chip.dataset.tag)) chip.remove();
    });
    tagSelected.querySelector(".gallery-tag-none")?.remove();
    for (const { tag, state } of all) {
      let chip = tagSelected.querySelector('.gallery-tag-selected-chip[data-tag="' + CSS.escape(tag) + '"]');
      if (!chip) {
        chip = document.createElement("span");
        chip.className = "gallery-tag-selected-chip";
        chip.dataset.tag = tag;
        const mark = document.createElement("b");
        mark.className = "gallery-tag-chip-state";
        const name = document.createElement("span");
        name.className = "gallery-tag-chip-name";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "移除标签状态");
        remove.addEventListener("click", () => {
          const currentState = tagState(tag);
          if (currentState === "block") blockedTags = blockedTags.filter((item) => item !== tag);
          else if (currentState === "include") selectedTags = selectedTags.filter((item) => item !== tag);
          syncTagOptionStates();
          renderSelectedTags();
          updateTagDialogHint();
        });
        chip.append(mark, name, remove);
        tagSelected.append(chip);
      }
      chip.dataset.state = state;
      chip.classList.toggle("is-blocked", state === "block");
      chip.classList.toggle("is-selected", state === "include");
      const mark = chip.querySelector(".gallery-tag-chip-state");
      const name = chip.querySelector(".gallery-tag-chip-name");
      if (mark) mark.textContent = state === "block" ? "×" : "√";
      if (name) name.textContent = tagLabel(tag);
    }
    if (!all.length) {
      const emptyTag = document.createElement("span");
      emptyTag.className = "gallery-tag-none";
      emptyTag.textContent = "还没有选择或屏蔽标签";
      tagSelected.append(emptyTag);
    }
    syncTagModeButtons();
    if (tagConfirmButton) tagConfirmButton.textContent = "应用设置";
    tagSelected.dataset.count = String(all.length);
  }

  function syncTagOptionStates() {
    if (!tagOptions) return;
    tagOptions.querySelectorAll(".gallery-tag-option").forEach((button) => {
      const state = tagState(button.dataset.tag);
      button.classList.toggle("is-selected", state === "include");
      button.classList.toggle("is-blocked", state === "block");
      button.dataset.state = state;
      button.setAttribute("aria-pressed", String(state !== "none"));
      const mark = button.querySelector(".gallery-tag-option-mark");
      if (mark) mark.textContent = state === "block" ? "×" : state === "include" ? "√" : "+";
    });
  }

  // The category grid is shared by both operations; switching modes only changes
  // what a click does, never which tags are rendered or which states are shown.
  function renderTagOptions({ animate = false } = {}) {
    if (!tagOptions) return;
    tagOptions.classList.remove("tag-options-enter");
    if (tagOptionsAnimationTimer) {
      window.clearTimeout(tagOptionsAnimationTimer);
      tagOptionsAnimationTimer = 0;
    }
    tagOptions.replaceChildren();
    (TAG_CATEGORIES[activeTagCategory] || []).forEach(([tag, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "gallery-tag-option";
      button.dataset.tag = tag;
      const state = tagState(tag);
      button.classList.toggle("is-selected", state === "include");
      button.classList.toggle("is-blocked", state === "block");
      button.dataset.state = state;
      button.setAttribute("aria-pressed", String(state !== "none"));
      const mark = document.createElement("span");
      mark.className = "gallery-tag-option-mark";
      mark.textContent = state === "block" ? "×" : state === "include" ? "√" : "+";
      const text = document.createElement("span");
      text.textContent = label;
      button.append(mark, text);
      button.addEventListener("click", () => {
        const currentState = tagState(tag);
        if (tagSelectionMode === "block") {
          if (currentState === "block") blockedTags = blockedTags.filter((item) => item !== tag);
          else {
            blockedTags = [...blockedTags, tag];
            selectedTags = selectedTags.filter((item) => item !== tag);
          }
        } else {
          if (currentState === "include") selectedTags = selectedTags.filter((item) => item !== tag);
          else {
            selectedTags = [...selectedTags, tag];
            blockedTags = blockedTags.filter((item) => item !== tag);
          }
        }
        syncTagOptionStates();
        renderSelectedTags();
        updateTagDialogHint();
      });
      tagOptions.append(button);
    });
    if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void tagOptions.offsetWidth;
      tagOptions.classList.add("tag-options-enter");
      tagOptionsAnimationTimer = window.setTimeout(() => {
        tagOptions.classList.remove("tag-options-enter");
        tagOptionsAnimationTimer = 0;
      }, 560);
    }
  }
  function updateTagDialogHint() {
    if (!tagDialogHint) return;
    tagDialogHint.textContent = !tagFilteringAvailable()
      ? "当前图片源不支持标签筛选，请切换到自动模式、Nekos API 或 Safebooru。"
      : tagSelectionMode === "block" && !blockingTagsAvailable()
        ? "当前图片源不支持屏蔽标签；切换到自动模式或 Safebooru 后生效。"
        : sourceSelect && sourceSelect.value === "safebooru"
          ? (tagSelectionMode === "block" ? "屏蔽标签会从 Safebooru 结果中排除。" : "Safebooru 将使用安全评级（safe）进行筛选。")
          : sourceSelect && sourceSelect.value === "nekosapi"
            ? "Nekos API 支持筛选标签；屏蔽标签需切换到自动模式或 Safebooru。"
            : (tagSelectionMode === "block" ? "自动模式会优先使用支持排除标签的 Safebooru。" : "自动模式只会查询支持标签的图片源。标签越多，筛选条件越严格。");
  }
  function openTagDialog() {
    if (!tagDialog) return;
    tagDialogTrigger = document.activeElement;
    syncSelectedTagsFromInput();
    tagSelectionMode = "include";
    syncTagModeButtons();
    renderTagOptions(); renderSelectedTags(); updateTagDialogHint();
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
    document.addEventListener("keydown", (event) => {
      if (tagDialog.hidden || getTopmostOpenDialog() !== tagDialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeTagDialog();
      } else {
        trapDialogTab(event, tagDialog);
      }
    });
  }
  if (tagModeIncludeButton) tagModeIncludeButton.addEventListener("click", () => { tagSelectionMode = "include"; syncTagModeButtons(); updateTagDialogHint(); });
  if (tagModeBlockButton) tagModeBlockButton.addEventListener("click", () => { tagSelectionMode = "block"; syncTagModeButtons(); updateTagDialogHint(); });
  if (tagCategoryTabs) tagCategoryTabs.querySelectorAll("[data-tag-category]").forEach((button) => button.addEventListener("click", () => {
    activeTagCategory = button.dataset.tagCategory;
    tagCategoryTabs.querySelectorAll("[data-tag-category]").forEach((tab) => { const active = tab === button; tab.classList.toggle("is-active", active); tab.setAttribute("aria-selected", String(active)); });
    renderTagOptions({ animate: true });
  }));
  if (tagClearButton) tagClearButton.addEventListener("click", () => {
    if (tagSelectionMode === "block") blockedTags = [];
    else selectedTags = [];
    syncTagOptionStates();
    renderSelectedTags();
    updateTagDialogHint();
  });
  if (tagConfirmButton) tagConfirmButton.addEventListener("click", () => {
    if (tagInput) tagInput.value = selectedTags.join(",");
    const persisted = saveTagPreferences();
    if (tagHint) {
      const includeText = selectedTags.length ? "筛选：" + selectedTags.map(tagLabel).join("、") : "未设置筛选标签";
      const blockText = blockedTags.length ? "屏蔽：" + blockedTags.map(tagLabel).join("、") : "未设置屏蔽标签";
      tagHint.textContent = includeText + " · " + blockText + (persisted ? " · 已保存" : " · 保存失败");
    }
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
    else if (tagHint && blockedTags.length && !blockingTagsAvailable()) tagHint.textContent = "已保存屏蔽标签；切换到自动模式或 Safebooru 后生效。";
    else if (tagHint && !tagInput.value && !blockedTags.length) tagHint.textContent = "尚未选择标签。可按类别筛选或屏蔽标签。";
    updateTagDialogHint();
  }
  refreshButton.addEventListener("click", () => {
    syncSelectedTagsFromInput(); saveTagPreferences();
    lastRequestUsedFallback = false;
    loadImages({ reset: true, targetCount: 100 });
  });
  if (sourceSelect) sourceSelect.addEventListener("change", () => {
    syncSelectedTagsFromInput(); saveTagPreferences();
    updateTagFilterAvailability();
    loadImages({ reset: true, targetCount: 100 });
  });
  if (tagApplyButton) tagApplyButton.addEventListener("click", () => { syncSelectedTagsFromInput(); saveTagPreferences(); loadImages({ reset: true, targetCount: 100 }); });
  if (tagInput) tagInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !tagInput.disabled) {
      event.preventDefault();
      syncSelectedTagsFromInput(); saveTagPreferences(); loadImages({ reset: true, targetCount: 100 });
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

  const initialPageParam = new URL(window.location.href).searchParams.get("page");
  const initialRoute = "gallery";
  const initialHistoryState = { ...(history.state || {}), view: initialRoute };
  delete initialHistoryState.galleryLightbox;
  if (initialPageParam === "favorites") initialHistoryState.galleryFavoritesDialog = true;
  else delete initialHistoryState.galleryFavoritesDialog;
  history.replaceState(initialHistoryState, "", window.location.href);
  renderRoute(initialRoute);
  if (initialPageParam === "favorites") openFavoritesDialog({ initial: true });
})();