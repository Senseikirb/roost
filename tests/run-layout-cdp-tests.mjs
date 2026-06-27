import http from "node:http";

const CDP_PORT = Number(process.env.ROOST_CDP_PORT || 9223);
const APP_URL = process.env.ROOST_APP_URL || "http://127.0.0.1:8765/index.html";
const EXPECTED_LINK_CARDS = 786;
const EXPECTED_RUNTIME_SECTIONS = 35;

function getJson(path, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: CDP_PORT, path, method }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(new Error(`Bad JSON from ${path}: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function cdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const waiters = [];
    const runtimeErrors = [];

    ws.onerror = (error) => reject(error);
    ws.onopen = () => {
      function send(method, params = {}) {
        const id = nextId++;
        ws.send(JSON.stringify({ id, method, params }));
        return new Promise((res, rej) => pending.set(id, { res, rej, method }));
      }

      function waitEvent(method, timeout = 15000, predicate = () => true) {
        return new Promise((res, rej) => {
          const waiter = {
            method,
            predicate,
            res: (payload) => {
              clearTimeout(timer);
              res(payload);
            }
          };
          const timer = setTimeout(() => {
            const idx = waiters.indexOf(waiter);
            if (idx !== -1) waiters.splice(idx, 1);
            rej(new Error(`Timed out waiting for ${method}`));
          }, timeout);
          waiters.push(waiter);
        });
      }

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
          const item = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) item.rej(new Error(`${item.method}: ${msg.error.message}`));
          else item.res(msg.result || {});
          return;
        }

        if (msg.method === "Runtime.exceptionThrown") {
          const ex = msg.params && msg.params.exceptionDetails;
          runtimeErrors.push((ex && ((ex.exception && (ex.exception.description || ex.exception.value)) || ex.text)) || "Runtime exception");
        }

        for (let i = 0; i < waiters.length; i += 1) {
          const waiter = waiters[i];
          if (waiter.method === msg.method && waiter.predicate(msg.params || {})) {
            waiters.splice(i, 1);
            waiter.res(msg.params || {});
            break;
          }
        }
      };

      resolve({ ws, send, waitEvent, runtimeErrors });
    };
  });
}

const seedStorageScript = `
try {
  sessionStorage.removeItem("roost_next_step_skipped");
  localStorage.removeItem("roost_layout_v1");
  localStorage.removeItem("roost_mission_intro_v1");
  localStorage.removeItem("roost_tip_state_v1");
  localStorage.removeItem("roost_recent_commands_v1");
  localStorage.removeItem("roost_views_v1");
  localStorage.removeItem("roost_custom_feeds_v1");
  localStorage.removeItem("roost_accessibility_v1");
  localStorage.removeItem("roost_link_health_v1");
  localStorage.removeItem("roost_boards_v1");
  localStorage.removeItem("roost_readlater_v1");
  localStorage.removeItem("roost_session_v1");
  localStorage.removeItem("roost_restore_undo_v1");
  localStorage.removeItem("roost_import_history_v1");
  localStorage.removeItem("roost_workbench_v1");
  localStorage.removeItem("roost_quests_v1");
  localStorage.removeItem("roost_achievements_v1");
  localStorage.setItem("roost_settings_v1", JSON.stringify({
    headlines: true,
    newsMode: "all",
    searchScope: "all",
    ambient: false,
    wireCollapsed: false,
    todayCollapsed: false
  }));
  localStorage.setItem("roost_onboarding_v1", JSON.stringify({
    version: 1,
    profile: "runtime-test",
    completed: true,
    skipped: false,
    step: 4,
    data: {
      displayName: "",
      intendedUse: "research",
      customUse: "",
      modules: { wire: true, today: true, missionExample: true, workbench: true, diagrams: true, kidZone: true },
      news: true,
      density: "comfort",
      visualMode: "default",
      starterSections: ["quick-access", "ai-apps", "ai-learn", "research", "news", "kid-zone"]
    },
    layoutApplied: true,
    createdAt: "2026-06-21T00:00:00.000Z",
    updatedAt: "2026-06-21T00:00:00.000Z"
  }));
  localStorage.setItem("roost_mission_v1", JSON.stringify({
    completed: { w1_a0: { t: "sentinel" } },
    notes: {},
    selectedWeek: 1,
    filterTrack: "all",
    filterMode: "all",
    missionStatement: "sentinel",
    resourceStatus: {},
    resourceQuery: "",
    resourceCat: "all",
    sideQuests: {},
    questTrack: "all",
    leadership: {},
    leadershipCat: "all",
    projects: {}
  }));
  localStorage.setItem("roost_custom_sections_v1", JSON.stringify([
    { id: "csec_test", title: "Runtime Custom", order: 0, hidden: false, createdAt: "2026-06-21T00:00:00.000Z", updatedAt: "2026-06-21T00:00:00.000Z" }
  ]));
  localStorage.setItem("roost_custom_links_v1", JSON.stringify([
    { id: "clink_test", title: "Runtime Custom Link", url: "https://example.com/custom", description: "Fixture link", sectionId: "csec_test", tags: ["test"], icon: "T", favorite: true, hidden: false, createdAt: "2026-06-21T00:00:00.000Z", updatedAt: "2026-06-21T00:00:00.000Z" }
  ]));
} catch (error) {}
`;

async function main() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This Node runtime does not provide WebSocket.");
  }

  const target = await getJson("/json/new?about:blank", "PUT");
  const client = await cdpClient(target.webSocketDebuggerUrl);
  const { send, waitEvent, runtimeErrors } = client;

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: seedStorageScript });

  async function evalValue(expression) {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Evaluation failed");
    return result.result.value;
  }
  async function evalJson(expression) {
    const json = await evalValue(`Promise.resolve(${expression}).then((value) => JSON.stringify(value))`);
    return JSON.parse(json);
  }

  async function navigate(width) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    const load = waitEvent("Page.loadEventFired", 20000).catch(() => null);
    await send("Page.navigate", { url: `${APP_URL}?runtime=${width}` });
    await load;
    const boot = await evalJson(`new Promise(resolve => { let n = 0; function status(){ const hooks = window.roostTestHooks; const widgets = hooks && hooks.layoutWidgetDefinitions ? hooks.layoutWidgetDefinitions() : []; const state = { hooks: !!hooks, editor: !!document.getElementById("v3-layout-edit"), dock: !!document.getElementById("roost-dock"), widgetCount: widgets.length, hasCustomWidget: widgets.some((w) => w.id === "csec_test" && w.kind === "Custom Section"), hasMissionWidget: widgets.some((w) => w.id === "mission-control"), hasLockedLauncher: widgets.some((w) => w.id === "launcher" && w.locked), readyState: document.readyState }; state.ready = state.hooks && state.editor && state.dock && state.hasCustomWidget && state.hasMissionWidget && state.hasLockedLauncher; return state; } (function poll(){ const current = status(); if (current.ready) resolve(current); else if (++n > 240) resolve(current); else setTimeout(poll, 50); })(); })`);
    if (!boot.ready) throw new Error(`Boot did not complete at ${width}: ${JSON.stringify(boot)}`);
  }

  const widthResults = [];
  for (const width of [360, 390, 768, 1440]) {
    await navigate(width);
    widthResults.push(await evalJson(`(() => {
      const beforeOpen = document.body.classList.contains("roost-layout-editing");
      const edit = document.getElementById("v3-layout-edit");
      edit && edit.click();
      const editor = document.getElementById("roost-layout-editor");
      const rect = editor.getBoundingClientRect();
      const editorFit = rect.left >= -1 && rect.right <= window.innerWidth + 1 && rect.bottom <= window.innerHeight + 1;
      const buttons = editor.querySelectorAll("button").length;
      const active = document.body.classList.contains("roost-layout-editing") && editor.classList.contains("open");
      const done = editor.querySelector("[data-layout-done]");
      done && done.click();
      const helpTrigger = document.getElementById("help-trigger");
      helpTrigger && helpTrigger.click();
      const helpOverlay = document.getElementById("help-overlay");
      const helpCard = helpOverlay && helpOverlay.querySelector(".help-card");
      const helpRect = helpCard ? helpCard.getBoundingClientRect() : { left: 9999, right: 9999, bottom: 9999 };
      const helpFit = !!helpCard && helpRect.left >= -1 && helpRect.right <= window.innerWidth + 1 && helpRect.bottom <= window.innerHeight + 1;
      const helpActions = helpOverlay ? helpOverlay.querySelectorAll("[data-help-action]").length : 0;
      const helpText = helpOverlay ? helpOverlay.textContent : "";
      const helpFocused = helpOverlay ? helpOverlay.contains(document.activeElement) : false;
      const pageWrap = document.querySelector(".page-wrapper");
      const helpBackgroundLocked = !!pageWrap && (pageWrap.inert === true || pageWrap.getAttribute("aria-hidden") === "true");
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      const helpClosed = helpOverlay ? !helpOverlay.classList.contains("visible") : false;
      const helpBackgroundRestored = !!pageWrap && pageWrap.inert !== true && pageWrap.getAttribute("aria-hidden") !== "true";
      const importPrimary = document.getElementById("roost-import-bookmarks-primary");
      const importPrimaryVisible = !!importPrimary && importPrimary.offsetParent !== null;
      if (importPrimary) importPrimary.click();
      const importModalOpen = !!document.querySelector(".roost-modal.open");
      const importModalTitle = (document.getElementById("roost-modal-title") || {}).textContent || "";
      const importControls = !!document.getElementById("custom-import-type") && !!document.getElementById("custom-preview-import");
      const importFocusInModal = !!document.querySelector(".roost-modal.open") && document.querySelector(".roost-modal.open").contains(document.activeElement);
      const modalBackgroundLocked = !!pageWrap && (pageWrap.inert === true || pageWrap.getAttribute("aria-hidden") === "true");
      const modalClose = document.getElementById("roost-modal-x");
      modalClose && modalClose.click();
      const importFocusRestored = document.activeElement === importPrimary;
      const modalBackgroundRestored = !!pageWrap && pageWrap.inert !== true && pageWrap.getAttribute("aria-hidden") !== "true";
      const dockToggle = document.getElementById("roost-dock-toggle");
      const dockMenu = document.getElementById("roost-dock-menu");
      const dockClosedHidden = !!dockToggle && !!dockMenu && dockMenu.hidden && dockMenu.getAttribute("aria-hidden") === "true" && dockToggle.getAttribute("aria-expanded") === "false";
      if (dockToggle) dockToggle.click();
      const dockOpenVisible = !!dockToggle && !!dockMenu && !dockMenu.hidden && dockMenu.getAttribute("aria-hidden") === "false" && dockToggle.getAttribute("aria-expanded") === "true";
      const iqTool = document.querySelector('#roost-dock a[href="iq-rfsoc-explorer.html"]');
      const destinationTool = document.querySelector('#roost-dock a[href="roost-destination-finder.html"]');
      const dockSiblingTools = !!iqTool && !!destinationTool && /Where To/.test(destinationTool.textContent || "");
      const destinationRect = destinationTool ? destinationTool.getBoundingClientRect() : { width: 0, height: 0 };
      const menuStyle = dockMenu ? getComputedStyle(dockMenu) : null;
      const dockMenuSurface = !!menuStyle &&
        menuStyle.backgroundColor !== "rgba(0, 0, 0, 0)" &&
        menuStyle.borderTopStyle !== "none";
      const dockCompactTools = destinationRect.width > 0 &&
        destinationRect.width <= Math.min(230, window.innerWidth - 24) &&
        destinationRect.height >= 36 &&
        destinationRect.height <= 48;
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
      const dockEscClosed = !!dockToggle && !!dockMenu && dockMenu.hidden && dockToggle.getAttribute("aria-expanded") === "false" && document.activeElement === dockToggle;
      const widgets = window.roostTestHooks.layoutWidgetDefinitions();
      return {
        width: window.innerWidth,
        linkCards: document.querySelectorAll("main .link-card").length,
        sections: document.querySelectorAll("main .section[id]:not(#pinned):not(#recent)").length,
        widgets: widgets.length,
        hasCustomWidget: widgets.some((w) => w.id === "csec_test" && w.kind === "Custom Section"),
        hasMissionWidget: widgets.some((w) => w.id === "mission-control"),
        hasLockedLauncher: widgets.some((w) => w.id === "launcher" && w.locked),
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        editorFit,
        editorButtons: buttons,
        editorOpened: active,
        wasEditingBeforeOpen: beforeOpen,
        helpFit,
        helpActions,
        helpFocused,
        helpClosed,
        helpBackgroundLocked,
        helpBackgroundRestored,
        helpHasCoreText: /Import Bookmarks/.test(helpText) && /Backup/.test(helpText) && /Mission Control/.test(helpText),
        importPrimaryVisible,
        importModalOpen,
        importModalTitle,
        importControls,
        importFocusInModal,
        modalBackgroundLocked,
        importFocusRestored,
        modalBackgroundRestored,
        dockClosedHidden,
        dockOpenVisible,
        dockSiblingTools,
        dockMenuSurface,
        dockCompactTools,
        dockEscClosed
      };
    })()`));
  }

  await navigate(390);
  const curatedSpecialtySections = await evalJson(`(() => {
    const battle = document.getElementById("battle-history");
    const defense = document.getElementById("defense-industry");
    const philosophy = document.getElementById("philosophy");
    const leadership = document.getElementById("leadership");
    const briefing = document.getElementById("briefing-room");
    const navBattle = document.querySelector('#nav-tabs a[href="#battle-history"]');
    const navDefense = document.querySelector('#nav-tabs a[href="#defense-industry"]');
    const navPhilosophy = document.querySelector('#nav-tabs a[href="#philosophy"]');
    const navLeadership = document.querySelector('#nav-tabs a[href="#leadership"]');
    const navBriefing = document.querySelector('#nav-tabs a[href="#briefing-room"]');
    const jumpBattle = document.querySelector('.v3-section-launcher a[href="#battle-history"][data-v3-group="learn"]');
    const jumpDefense = document.querySelector('.v3-section-launcher a[href="#defense-industry"][data-v3-group="media"]');
    const jumpPhilosophy = document.querySelector('.v3-section-launcher a[href="#philosophy"][data-v3-group="learn"]');
    const jumpLeadership = document.querySelector('.v3-section-launcher a[href="#leadership"][data-v3-group="learn"]');
    const jumpBriefing = document.querySelector('.v3-section-launcher a[href="#briefing-room"][data-v3-group="learn"]');
    const learnButton = document.querySelector('[data-v3-view="learn"]');
    if (learnButton) learnButton.click();
    const learnShowsBriefing = !!briefing && briefing.getAttribute("data-hidden") !== "true";
    const learnShowsBattle = !!battle && battle.getAttribute("data-hidden") !== "true";
    const learnShowsPhilosophy = !!philosophy && philosophy.getAttribute("data-hidden") !== "true";
    const learnShowsLeadership = !!leadership && leadership.getAttribute("data-hidden") !== "true";
    const learnHidesDefense = !!defense && defense.getAttribute("data-hidden") === "true";
    const mediaButton = document.querySelector('[data-v3-view="media"]');
    if (mediaButton) mediaButton.click();
    const mediaShowsDefense = !!defense && defense.getAttribute("data-hidden") !== "true";
    const mediaHidesBriefing = !!briefing && briefing.getAttribute("data-hidden") === "true";
    const mediaHidesBattle = !!battle && battle.getAttribute("data-hidden") === "true";
    const mediaHidesPhilosophy = !!philosophy && philosophy.getAttribute("data-hidden") === "true";
    const mediaHidesLeadership = !!leadership && leadership.getAttribute("data-hidden") === "true";
    const allButton = document.querySelector('[data-v3-view="all"]');
    if (allButton) allButton.click();
    const input = document.getElementById("search-input");
    if (input) {
      input.value = "c4isr";
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    const searchText = document.body.textContent || "";
    const c4isr = Array.from(document.querySelectorAll("#defense-industry .link-card")).filter((card) => /C4ISRNET/.test(card.textContent || ""))[0];
    const westPoint = Array.from(document.querySelectorAll("#battle-history .link-card")).filter((card) => /West Point/.test(card.textContent || ""))[0];
    if (input) {
      input.value = "just war";
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    const warEthics = Array.from(document.querySelectorAll("#philosophy .link-card")).filter((card) => /Philosophy of War/.test(card.textContent || ""))[0];
    if (input) {
      input.value = "radical candor";
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    const radicalCandor = Array.from(document.querySelectorAll("#leadership .link-card")).filter((card) => /Radical Candor/.test(card.textContent || ""))[0];
    if (input) {
      input.value = "cjadc2";
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    const cjadc2 = Array.from(document.querySelectorAll("#briefing-room .link-card")).filter((card) => /CJADC2/.test(card.textContent || ""))[0];
    if (input) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    return {
      battleExists: !!battle,
      defenseExists: !!defense,
      philosophyExists: !!philosophy,
      leadershipExists: !!leadership,
      briefingExists: !!briefing,
      battleCount: !!battle && battle.querySelectorAll(".link-card").length === 12,
      defenseCount: !!defense && defense.querySelectorAll(".link-card").length === 12,
      philosophyCount: !!philosophy && philosophy.querySelectorAll(".link-card").length === 24,
      leadershipCount: !!leadership && leadership.querySelectorAll(".link-card").length === 24,
      briefingCount: !!briefing && briefing.querySelectorAll(".link-card").length === 24,
      leadershipLabelCount: !!leadership && /24/.test((leadership.querySelector(".section-count") || {}).textContent || ""),
      briefingLabelCount: !!briefing && /24/.test((briefing.querySelector(".section-count") || {}).textContent || ""),
      navEntries: !!navBattle && !!navDefense && !!navPhilosophy && !!navLeadership && !!navBriefing && !!jumpBattle && !!jumpDefense && !!jumpPhilosophy && !!jumpLeadership && !!jumpBriefing,
      groupedViews: learnShowsBriefing && learnShowsBattle && learnShowsPhilosophy && learnShowsLeadership && learnHidesDefense && mediaShowsDefense && mediaHidesBriefing && mediaHidesBattle && mediaHidesPhilosophy && mediaHidesLeadership,
      searchFindsDefense: !!c4isr && c4isr.getAttribute("data-hidden") !== "true" && /C4ISRNET/.test(searchText),
      searchFindsPhilosophy: !!warEthics && warEthics.getAttribute("data-hidden") !== "true",
      searchFindsLeadership: !!radicalCandor && radicalCandor.getAttribute("data-hidden") !== "true",
      searchFindsBriefing: !!cjadc2 && cjadc2.getAttribute("data-hidden") !== "true",
      battleLinkPresent: !!westPoint && /^https:\\/\\/dhc\\.westpoint\\.edu\\//.test(westPoint.href)
    };
  })()`);

  await navigate(390);
  const backToTopButton = await evalJson(`new Promise((resolve) => {
    const btn = document.getElementById("back-to-top");
    const dock = document.getElementById("roost-dock-toggle");
    const maxScroll = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    window.scrollTo(0, maxScroll);
    setTimeout(() => {
      window.dispatchEvent(new Event("scroll"));
      setTimeout(() => {
      const rect = btn ? btn.getBoundingClientRect() : { left: 9999, right: 9999, top: 9999, bottom: 9999, width: 0, height: 0 };
      const dockRect = dock ? dock.getBoundingClientRect() : { left: -1, right: -1, top: -1, bottom: -1 };
      const overlapsDock = !!btn && !!dock &&
        rect.left < dockRect.right && rect.right > dockRect.left &&
        rect.top < dockRect.bottom && rect.bottom > dockRect.top;
      const style = btn ? getComputedStyle(btn) : {};
      const before = {
        exists: !!btn,
        visible: !!btn && btn.classList.contains("visible") && style.pointerEvents !== "none" && style.opacity !== "0",
        touchTarget: rect.width >= 44 && rect.height >= 44,
        withinViewport: rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight,
        aboveDock: !dock || rect.bottom <= dockRect.top - 4,
        noDockOverlap: !overlapsDock
      };
      if (btn) btn.click();
      let tries = 0;
      (function poll() {
        if (window.scrollY < 8 || tries++ > 40) {
          resolve(Object.assign(before, { returnedTop: window.scrollY < 8 }));
      } else {
        setTimeout(poll, 50);
      }
      })();
      }, 120);
    }, 80);
  })`);

  await navigate(1440);
  const beforeLauncherEnter = await evalJson(`(() => {
    const input = document.getElementById("search-input");
    input.focus();
    input.value = "import";
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    return {
      noResultsVisible: !!document.querySelector(".no-results.visible"),
      activeText: (document.querySelector(".roost-command-item.is-selected") || {}).textContent || "",
      itemCount: document.querySelectorAll(".roost-command-item").length
    };
  })()`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await evalValue(`new Promise(resolve => setTimeout(() => resolve(true), 250))`);
  const afterLauncherEnter = await evalJson(`(() => {
    const result = {
      href: location.href,
      modalOpen: !!document.querySelector(".roost-modal.open"),
      modalTitle: (document.getElementById("roost-modal-title") || {}).textContent || ""
    };
    const close = document.getElementById("roost-modal-x");
    if (close) close.click();
    const input = document.getElementById("search-input");
    if (input) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    return result;
  })()`);
  const launcher = { beforeEnter: beforeLauncherEnter, afterEnter: afterLauncherEnter };

  const beforeHelpEnter = await evalJson(`(() => {
    const input = document.getElementById("search-input");
    input.focus();
    input.value = "help";
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    return {
      noResultsVisible: !!document.querySelector(".no-results.visible"),
      activeText: (document.querySelector(".roost-command-item.is-selected") || {}).textContent || "",
      itemCount: document.querySelectorAll(".roost-command-item").length
    };
  })()`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await evalValue(`new Promise(resolve => setTimeout(() => resolve(true), 250))`);
  const afterHelpEnter = await evalJson(`(() => {
    const overlay = document.getElementById("help-overlay");
    const result = {
      helpOpen: !!overlay && overlay.classList.contains("visible"),
      helpTitle: (document.getElementById("help-title") || {}).textContent || "",
      helpFocused: !!overlay && overlay.contains(document.activeElement)
    };
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    return result;
  })()`);
  const helpLauncher = { beforeEnter: beforeHelpEnter, afterEnter: afterHelpEnter };

  const keyboardShortcuts = await evalJson(`(() => {
    const input = document.getElementById("search-input");
    input.focus();
    input.value = "keyboard shortcuts";
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    const item = Array.from(document.querySelectorAll(".roost-command-item")).filter((node) => /Keyboard Shortcuts/.test(node.textContent || ""))[0];
    const commandVisible = !!item;
    if (item) item.click();
    const modalOpen = !!document.querySelector(".roost-modal.open");
    const title = (document.getElementById("roost-modal-title") || {}).textContent || "";
    const bodyText = (document.getElementById("roost-modal-body") || {}).textContent || "";
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    const closed = !document.querySelector(".roost-modal.open");
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true }));
    const helpOpen = !!document.querySelector("#help-overlay.visible");
    const helpTitle = (document.getElementById("help-title") || {}).textContent || "";
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    return {
      commandVisible,
      modalOpen,
      titleOk: title === "Keyboard Shortcuts",
      content: /Ctrl\\/Cmd\\+K/.test(bodyText) && /Esc/.test(bodyText) && /Tab/.test(bodyText),
      closed,
      questionStillHelp: helpOpen && /Start Here/.test(helpTitle)
    };
  })()`);

  const interaction = await evalJson(`(() => {
    const beforeMission = localStorage.getItem("roost_mission_v1");
    document.getElementById("v3-layout-edit").click();
    const editor = document.getElementById("roost-layout-editor");
    const opened = editor.classList.contains("open") && document.body.classList.contains("roost-layout-editing");
    const launcherHideDisabled = !!editor.querySelector("[data-layout-hide='launcher']:disabled");
    editor.querySelector("[data-layout-preset='Morning']").click();
    const previewOpen = !!editor.querySelector("#roost-layout-preview.on [data-layout-apply-preset='Morning']");
    const keyBeforeApplyNull = localStorage.getItem("roost_layout_v1") === null;
    editor.querySelector("[data-layout-apply-preset='Morning']").click();
    const morning = JSON.parse(localStorage.getItem("roost_layout_v1") || "{}");
    const backupHasLayout = !!window.roostTestHooks.backupPayload(false).data.roost_layout_v1;
    const move = editor.querySelector("[data-layout-move='quick-access'][data-dir='1']");
    if (move) move.click();
    const customAfterMove = (JSON.parse(localStorage.getItem("roost_layout_v1") || "{}").preset === "Custom");
    const hideWire = editor.querySelector("[data-layout-hide='wire']");
    if (hideWire) hideWire.click();
    const wireHidden = document.querySelector(".roost-wire").classList.contains("roost-layout-hidden");
    const showWire = editor.querySelector("[data-layout-hide='wire']");
    if (showWire) showWire.click();
    const wireShown = !document.querySelector(".roost-wire").classList.contains("roost-layout-hidden");
    const size = editor.querySelector("[data-layout-size='quick-access']");
    if (size) {
      size.value = "compact";
      size.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const compact = document.getElementById("quick-access").classList.contains("roost-widget-compact");
    const resetWidget = editor.querySelector("[data-layout-reset-widget='quick-access']");
    if (resetWidget) resetWidget.click();
    const resetCompact = !document.getElementById("quick-access").classList.contains("roost-widget-compact");
    const resetAll = editor.querySelector("[data-layout-reset]");
    if (resetAll) resetAll.click();
    const resetKey = localStorage.getItem("roost_layout_v1") === null;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    const closed = !editor.classList.contains("open") && !document.body.classList.contains("roost-layout-editing");
    const afterMission = localStorage.getItem("roost_mission_v1");
    return {
      opened,
      launcherHideDisabled,
      previewOpen,
      keyBeforeApplyNull,
      morningPreset: morning.preset,
      morningTopOrder: morning.topOrder,
      backupHasLayout,
      customAfterMove,
      wireHidden,
      wireShown,
      compact,
      resetCompact,
      resetKey,
      closed,
      missionPreserved: beforeMission === afterMission
    };
  })()`);

  const missionIntro = await evalJson(`(() => {
    const beforeMission = localStorage.getItem("roost_mission_v1");
    const existingModalClose = document.getElementById("roost-modal-x");
    if (document.querySelector(".roost-modal.open") && existingModalClose) existingModalClose.click();
    localStorage.removeItem("roost_mission_intro_v1");
    window.roostTestHooks.setMissionExampleForTest(false);
    const intro = document.getElementById("roost-mission-intro");
    const visible = !!intro && intro.offsetParent !== null;
    const text = intro ? intro.textContent : "";
    const preview = intro && intro.querySelector("[data-mission-intro-preview]");
    if (preview) preview.click();
    const previewOpen = !!document.querySelector(".roost-modal.open");
    const previewTitle = (document.getElementById("roost-modal-title") || {}).textContent || "";
    const pageWrap = document.querySelector(".page-wrapper");
    const previewBackgroundLocked = !!pageWrap && (pageWrap.inert === true || pageWrap.getAttribute("aria-hidden") === "true");
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    const hide = intro && intro.querySelector("[data-mission-intro-hide]");
    if (hide) hide.click();
    const introRemoved = !document.getElementById("roost-mission-intro");
    const hiddenStored = JSON.parse(localStorage.getItem("roost_mission_intro_v1") || "{}").hidden === true;
    window.roostTestHooks.setMissionExampleForTest(true);
    const enabledRemoved = !document.getElementById("roost-mission-intro");
    const missionSurface = !!document.getElementById("mission-control");
    const afterMission = localStorage.getItem("roost_mission_v1");
    return {
      visible,
      hasText: /Mission Control Academy/.test(text) && /optional/.test(text),
      previewOpen,
      previewTitle,
      previewBackgroundLocked,
      introRemoved,
      hiddenStored,
      enabledRemoved,
      missionSurface,
      missionPreserved: beforeMission === afterMission
    };
  })()`);

  const memoryHealth = await evalJson(`(() => {
    const dockToggle = document.getElementById("roost-dock-toggle");
    if (dockToggle) dockToggle.click();
    const backupButton = document.querySelector('#roost-dock [data-action="backup"]');
    if (backupButton) backupButton.click();
    const modalOpen = !!document.querySelector(".roost-modal.open");
    const title = (document.getElementById("roost-modal-title") || {}).textContent || "";
    const health = document.getElementById("backup-health");
    const healthText = health ? health.textContent : "";
    const hasHealth = !!health && /Memory Health/.test(healthText) && /Last export/.test(healthText);
    const beforeMeta = localStorage.getItem("roost_backup_meta_v1");
    const download = document.getElementById("backup-download");
    if (download) download.click();
    const afterMeta = JSON.parse(localStorage.getItem("roost_backup_meta_v1") || "{}");
    const healthAfter = health ? health.textContent : "";
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    return {
      modalOpen,
      title,
      hasHealth,
      wroteMeta: !!afterMeta.lastExportedAt && afterMeta.method === "download",
      healthUpdated: /Last export/.test(healthAfter),
      noPriorMetaRequired: beforeMeta === null || typeof beforeMeta === "string"
    };
  })()`);

  const restoreUndo = await evalJson(`(() => {
    localStorage.removeItem("roost_restore_undo_v1");
    const original = JSON.stringify({
      headlines: true,
      newsMode: "all",
      searchScope: "all",
      ambient: false,
      wireCollapsed: false,
      todayCollapsed: false
    });
    localStorage.setItem("roost_settings_v1", original);
    const payload = window.roostTestHooks.backupPayload(false);
    payload.data.roost_settings_v1 = JSON.stringify({
      headlines: false,
      newsMode: "saved",
      searchScope: "links",
      ambient: true,
      wireCollapsed: true,
      todayCollapsed: true
    });
    payload.data.roost_restore_undo_v1 = JSON.stringify({ version: 1, shouldSkip: true });
    const safe = window.roostTestHooks.safeRestoreData(payload.data);
    const safeSkippedTransient = !safe.roost_restore_undo_v1;
    window.confirm = () => true;
    const backupButton = document.querySelector('#roost-dock [data-action="backup"]');
    if (backupButton) backupButton.click();
    const text = document.getElementById("backup-text");
    if (text) text.value = JSON.stringify(payload);
    const restore = document.getElementById("backup-restore");
    if (restore) restore.click();
    const changed = /"headlines":false/.test(localStorage.getItem("roost_settings_v1") || "");
    const undoState = window.roostTestHooks.restoreUndoState();
    const undoButton = document.getElementById("backup-undo-restore");
    const undoEnabled = !!undoButton && !undoButton.disabled;
    const backupSkipsUndo = !window.roostTestHooks.backupPayload(false).data.roost_restore_undo_v1;
    if (undoButton) undoButton.click();
    const restored = localStorage.getItem("roost_settings_v1") === original;
    const undoCleared = window.roostTestHooks.restoreUndoState() === null && localStorage.getItem("roost_restore_undo_v1") === null;
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    return {
      safeSkippedTransient,
      changed,
      undoCaptured: !!undoState && undoState.keys.indexOf("roost_settings_v1") !== -1,
      undoEnabled,
      backupSkipsUndo,
      restored,
      undoCleared
    };
  })()`);

  const configPacks = await evalJson(`(() => {
    const packLink = { id: "clink_pack", title: "Pack Link", url: "https://example.com/pack", description: "Pack fixture", sectionId: "csec_pack", tags: ["pack"], icon: "P", favorite: false, hidden: false, createdAt: "2026-06-23T00:00:00.000Z", updatedAt: "2026-06-23T00:00:00.000Z" };
    const packSection = { id: "csec_pack", title: "Pack Section", order: 0, hidden: false, createdAt: "2026-06-23T00:00:00.000Z", updatedAt: "2026-06-23T00:00:00.000Z" };
    localStorage.setItem("roost_custom_sections_v1", JSON.stringify([packSection]));
    localStorage.setItem("roost_custom_links_v1", JSON.stringify([packLink]));
    localStorage.setItem("roost_custom_feeds_v1", JSON.stringify([{ id: "feed_pack", label: "Pack Feed", url: "https://example.com/feed.xml", wire: true, sectionId: "news", createdAt: "2026-06-23T00:00:00.000Z", updatedAt: "2026-06-23T00:00:00.000Z" }]));
    localStorage.setItem("roost_readlater_v1", JSON.stringify([{ title: "Private Article", link: "https://example.com/private" }]));
    localStorage.setItem("roost_mission_v1", JSON.stringify({ completed: { private: true } }));
    const pack = window.roostTestHooks.configPackPayload();
    const data = pack.data || {};
    const excludesPrivate = !data.roost_readlater_v1 && !data.roost_mission_v1 && pack.includesPersonalProgress === false;
    const includesConfig = !!data.roost_custom_links_v1 && !!data.roost_custom_sections_v1 && !!data.roost_custom_feeds_v1;
    const safe = window.roostTestHooks.safeConfigPackData(Object.assign({}, data, { roost_readlater_v1: "[]", roost_mission_v1: "{}" }));
    const safeExcludesPrivate = !safe.roost_readlater_v1 && !safe.roost_mission_v1;
    localStorage.removeItem("roost_custom_sections_v1");
    localStorage.removeItem("roost_custom_links_v1");
    localStorage.removeItem("roost_custom_feeds_v1");
    localStorage.setItem("roost_readlater_v1", JSON.stringify([{ title: "Keep Me", link: "https://example.com/keep" }]));
    const applied = window.roostTestHooks.importConfigPackText(JSON.stringify(pack));
    const restoredLink = window.roostTestHooks.customLinks().some((link) => link.url === "https://example.com/pack");
    const restoredFeed = window.roostTestHooks.customFeeds().some((feed) => feed.id === "feed_pack");
    const privatePreserved = /Keep Me/.test(localStorage.getItem("roost_readlater_v1") || "");
    const backupButton = document.querySelector('#roost-dock [data-action="backup"]');
    if (backupButton) backupButton.click();
    const modalText = (document.getElementById("roost-modal-body") || {}).textContent || "";
    const packText = document.getElementById("pack-text");
    if (packText) packText.value = JSON.stringify(pack);
    const preview = document.getElementById("pack-preview");
    if (preview) preview.click();
    const previewText = (document.getElementById("pack-preview-box") || {}).textContent || "";
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    localStorage.setItem("roost_custom_sections_v1", JSON.stringify([
      { id: "csec_test", title: "Runtime Custom", order: 0, hidden: false, createdAt: "2026-06-21T00:00:00.000Z", updatedAt: "2026-06-21T00:00:00.000Z" }
    ]));
    localStorage.setItem("roost_custom_links_v1", JSON.stringify([
      { id: "clink_test", title: "Runtime Custom Link", url: "https://example.com/custom", description: "Fixture link", sectionId: "csec_test", tags: ["test"], icon: "T", favorite: true, hidden: false, createdAt: "2026-06-21T00:00:00.000Z", updatedAt: "2026-06-21T00:00:00.000Z" }
    ]));
    return {
      schema: pack.schema === "the-roost.config-pack.v1",
      excludesPrivate,
      includesConfig,
      safeExcludesPrivate,
      appliedKeys: applied.keys.length >= 3,
      restoredLink,
      restoredFeed,
      privatePreserved,
      modalHasPack: /Configuration Pack/.test(modalText) && /Download Pack/.test(modalText),
      previewShowsKeys: /configuration key/.test(previewText)
    };
  })()`);

  const offlineStatus = await evalJson(`(() => {
    const offline = window.roostTestHooks.setOfflineStatusForTest(true);
    const el = document.getElementById("roost-offline-status");
    const offlineClass = !!el && el.classList.contains("is-offline");
    const shellMeta = JSON.parse(localStorage.getItem("roost_shell_status_v1") || "{}");
    const online = window.roostTestHooks.setOfflineStatusForTest(false);
    window.roostTestHooks.setOfflineStatusForTest(null);
    return {
      exists: !!el,
      offlineVisible: offline && offline.hidden === false,
      offlineText: offline && /Offline/.test(offline.text) && /local tools/.test(offline.text),
      offlineClass,
      onlineRecoverable: online && typeof online.text === "string",
      wroteShellMeta: shellMeta.version === 1 && !!shellMeta.lastOnlineAt
    };
  })()`);

  const newsFreshness = await evalJson(`(async () => {
    const urls = ["https://feeds.npr.org/1001/rss.xml", "http://feeds.bbci.co.uk/news/rss.xml"];
    urls.forEach((url, idx) => {
      localStorage.setItem(window.roostTestHooks.cacheKey(url), JSON.stringify({
        t: Date.now() - 3600000,
        items: [
        {
          title: "Very old fixture headline " + idx,
          link: "https://example.com/news-old-" + idx,
          desc: "Old fixture description",
          date: new Date(Date.now() - 160 * 86400000).toISOString(),
          source: "Fixture"
        },
        {
          title: "Cached fixture headline " + idx,
          link: "https://example.com/news-fresh-" + idx,
          desc: "Fixture description",
          date: new Date(Date.now() - 7200000).toISOString(),
          source: "Fixture"
        }]
      }));
    });
    const sec = document.getElementById("news");
    await window.roostTestHooks.loadSectionHeads(sec, { advance: false });
    const age = sec && sec.querySelector(".roost-news-age");
    const meta = window.roostTestHooks.feedCacheMeta(urls);
    const text = sec ? sec.textContent || "" : "";
    return {
      rendered: !!age,
      staleClass: !!age && age.classList.contains("stale"),
      staleText: !!age && /Stale/.test(age.textContent),
      metaStale: !!meta && meta.stale === true,
      linkSafe: !!sec && !!sec.querySelector('.roost-heads a[href^="https://example.com/news-fresh-"]'),
      staleItemsHidden: !/Very old fixture headline/.test(text),
      freshItemsShown: /Cached fixture headline/.test(text)
    };
  })()`);

  const feedEntityDecoding = await evalJson(`(() => {
    const xml = '<rss><channel><item><title>This puzzle game&amp;#8217;s simple premise hides depth</title><link>https://example.com/entity</link><description>Smith &amp;amp; Wesson &amp;#8212; brief</description><pubDate>Sat, 27 Jun 2026 12:00:00 GMT</pubDate></item></channel></rss>';
    const item = window.roostTestHooks.parseFeed(xml, "Fixture")[0] || {};
    const apostrophe = String.fromCharCode(8217);
    const dash = String.fromCharCode(8212);
    return {
      titleDecoded: (item.title || "").includes("game" + apostrophe + "s"),
      numericEntityHidden: !/&#8217;/.test(item.title || ""),
      descriptionDecoded: (item.desc || "").includes("Wesson " + dash + " brief"),
      safeLinkPreserved: item.link === "https://example.com/entity"
    };
  })()`);

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 3, mobile: true });
  await evalValue(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  const sectionHeadlineControls = await evalJson(`(async () => {
    const urls = ["https://feeds.npr.org/1001/rss.xml", "http://feeds.bbci.co.uk/news/rss.xml"];
    urls.forEach((url, idx) => {
      localStorage.setItem(window.roostTestHooks.cacheKey(url), JSON.stringify({
        t: Date.now() - 3600000,
        items: [{
          title: "Mobile fixture headline " + idx,
          link: "https://example.com/mobile-news-" + idx,
          desc: "Mobile fixture description",
          date: new Date(Date.now() - 7200000).toISOString(),
          source: "Fixture"
        }]
      }));
    });
    const sec = document.getElementById("news");
    const search = document.getElementById("search-input");
    if (search) {
      search.value = "";
      search.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    let strip = sec && sec.querySelector(".roost-heads");
    if (sec && !strip) {
      strip = document.createElement("div");
      strip.className = "roost-heads";
      const header = sec.querySelector(".section-header");
      if (header && header.parentNode) header.parentNode.insertBefore(strip, header.nextSibling);
    }
    if (strip) strip._cfg = window.roostTestHooks.sectionFeedConfig("news");
    if (sec) await window.roostTestHooks.loadSectionHeads(sec, { advance: false });
    const refresh = sec && sec.querySelector("[data-roost-refresh-section]");
    const save = sec && sec.querySelector(".roost-feat-wrap [data-save-article]");
    const refreshRect = refresh ? refresh.getBoundingClientRect() : null;
    const saveRect = save ? save.getBoundingClientRect() : null;
    function overlaps(a, b) {
      return !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }
    return {
      refreshRendered: !!refreshRect && refreshRect.width > 0 && refreshRect.height > 0,
      saveRendered: !!saveRect && saveRect.width > 0 && saveRect.height > 0,
      noSaveRefreshOverlap: !overlaps(refreshRect, saveRect),
      controlsInViewport: !!refreshRect && !!saveRect && refreshRect.right <= window.innerWidth && saveRect.right <= window.innerWidth && refreshRect.left >= 0 && saveRect.left >= 0
    };
  })()`);
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  const wireTopicDrilldown = await evalJson(`(async () => {
    const now = Date.now();
    const slug = (value) => String(value || "topic").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "topic";
    window.roostTestHooks.effectiveWireFeeds().filter((bucket) => !bucket.custom).forEach((bucket, bucketIdx) => {
      bucket.feeds.forEach((url, feedIdx) => {
        let items = [{
          title: bucket.label + " fixture headline " + feedIdx,
          link: "https://example.com/wire-" + slug(bucket.label) + "-" + feedIdx,
          desc: "Wire fixture",
          date: new Date(now - (bucketIdx + feedIdx + 1) * 60000).toISOString(),
          source: bucket.label + " Fixture"
        }];
        if (bucket.label === "Defense" && feedIdx === 0) {
          items = [
            { title: "Defense fixture headline A", link: "https://example.com/wire-defense-a", desc: "First defense fixture", date: new Date(now - 60000).toISOString(), source: "Defense Fixture" },
            { title: "Defense fixture headline B", link: "https://example.com/wire-defense-b", desc: "Second defense fixture", date: new Date(now - 120000).toISOString(), source: "Defense Fixture" }
          ];
        }
        localStorage.setItem(window.roostTestHooks.cacheKey(url), JSON.stringify({ t: now, items }));
      });
    });
    const allMode = document.querySelector('[data-wire-mode="all"]');
    if (allMode && allMode.getAttribute("aria-pressed") !== "true") {
      allMode.click();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await window.roostTestHooks.loadWire({ preferCache: true });
    const grid = document.getElementById("roost-wire-grid");
    const topicButtons = () => Array.from((grid || document).querySelectorAll("[data-wire-topic-next]"));
    const defenseButton = topicButtons().find((btn) => /^Defense/.test((btn.textContent || "").trim()));
    const beforeCell = defenseButton && defenseButton.closest(".roost-wire-cell");
    const beforeHeadline = beforeCell ? ((beforeCell.querySelector(".headline") || {}).textContent || "") : "";
    const beforeLink = beforeCell && beforeCell.querySelector(".roost-wire-link") ? beforeCell.querySelector(".roost-wire-link").href : "";
    const beforeCount = grid ? grid.querySelectorAll(".roost-wire-cell").length : 0;
    if (defenseButton) defenseButton.click();
    let afterButton = null;
    let afterCell = null;
    let afterHeadline = "";
    let afterLink = "";
    for (let i = 0; i < 10; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      afterButton = topicButtons().find((btn) => /^Defense/.test((btn.textContent || "").trim()));
      afterCell = afterButton && afterButton.closest(".roost-wire-cell");
      afterHeadline = afterCell ? ((afterCell.querySelector(".headline") || {}).textContent || "") : "";
      afterLink = afterCell && afterCell.querySelector(".roost-wire-link") ? afterCell.querySelector(".roost-wire-link").href : "";
      if (/Defense fixture headline B/.test(afterHeadline)) break;
    }
    const wireText = grid ? grid.textContent || "" : "";
    const afterCount = grid ? grid.querySelectorAll(".roost-wire-cell").length : 0;
    return {
      actionExists: !!defenseButton,
      actionAccessible: !!defenseButton && /another Defense headline/.test(defenseButton.getAttribute("aria-label") || ""),
      initialHeadline: /Defense fixture headline A/.test(beforeHeadline) && /wire-defense-a/.test(beforeLink),
      headlineAdvanced: /Defense fixture headline B/.test(afterHeadline),
      linkAdvanced: /wire-defense-b/.test(afterLink),
      cellsStable: beforeCount === afterCount && afterCount >= 6,
      otherTopicsRemain: ["Tech", "AI", "Gaming", "Finance", "Priority"].every((label) => wireText.includes(label)),
      modeUnchanged: !!allMode && allMode.getAttribute("aria-pressed") === "true"
    };
  })()`);

  const dailyTip = await evalJson(`(() => {
    localStorage.removeItem("roost_tip_state_v1");
    window.roostTestHooks.renderTodayDashboard();
    const tip = document.getElementById("roost-daily-tip");
    const action = tip && tip.querySelector("[data-tip-action]");
    const dismiss = tip && tip.querySelector("[data-tip-dismiss]");
    if (dismiss) dismiss.click();
    const stored = JSON.parse(localStorage.getItem("roost_tip_state_v1") || "{}");
    const removed = !document.getElementById("roost-daily-tip");
    window.roostTestHooks.renderTodayDashboard();
    const staysDismissed = !document.getElementById("roost-daily-tip");
    return {
      visible: !!tip && /Local tip/.test(tip.textContent),
      hasAction: !!action,
      hasDismiss: !!dismiss,
      dismissedStored: stored.version === 1 && !!stored.dismissedDate && !!stored.tipId,
      removed,
      staysDismissed
    };
  })()`);

  const dailyQuestDeck = await evalJson(`(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem("roost_quests_v1", JSON.stringify({
      version: 1,
      date: today,
      quests: [
        { id: "spark-note", completedAt: "" },
        { id: "launch-session", completedAt: "" },
        { id: "scan-wire", completedAt: "" }
      ]
    }));
    window.roostTestHooks.renderTodayDashboard();
    const deck = document.getElementById("roost-quest-deck");
    const rows = deck ? deck.querySelectorAll(".roost-quest-row") : [];
    const open = deck && deck.querySelector("[data-quest-action='workbench']");
    if (open) open.click();
    const workbenchOpened = ((document.getElementById("roost-modal-title") || {}).textContent || "").indexOf("Workbench") !== -1;
    const close = document.getElementById("roost-modal-x");
    if (close) close.click();
    const complete = document.querySelector("#roost-quest-deck [data-quest-complete='launch-session']");
    if (complete) complete.click();
    const state = window.roostTestHooks.dailyQuestState();
    const completed = state.quests.filter((quest) => !!quest.completedAt).length;
    const deckText = (document.getElementById("roost-quest-deck") || {}).textContent || "";
    const backupHasQuests = !!window.roostTestHooks.backupPayload(false).data.roost_quests_v1;
    return {
      visible: !!deck && /Daily Quest Deck/.test(deck.textContent),
      rows: rows.length === 3,
      workbenchOpened,
      completedStored: completed === 1,
      countUpdated: /1\\/3/.test(deckText),
      backupHasQuests
    };
  })()`);

  const achievementHints = await evalJson(`(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.removeItem("roost_achievements_v1");
    localStorage.removeItem("roost_readlater_v1");
    localStorage.removeItem("roost_workbench_v1");
    localStorage.removeItem("roost_boards_v1");
    localStorage.removeItem("roost_link_notes_v1");
    localStorage.setItem("roost_quests_v1", JSON.stringify({
      version: 1,
      date: today,
      quests: [
        { id: "spark-note", completedAt: "" },
        { id: "launch-session", completedAt: "" },
        { id: "scan-wire", completedAt: "" }
      ]
    }));
    localStorage.setItem("kfl_recent_v1", JSON.stringify(Array.from({ length: 9 }, (_, index) => ({
      title: "Runtime Recent " + index,
      href: "https://example.com/recent-" + index,
      t: Date.now() - index
    }))));
    const hints = window.roostTestHooks.nextAchievementHints(3);
    const first = hints[0] || {};
    const achievements = document.querySelector('#roost-dock [data-action="achievements"]');
    if (achievements) achievements.click();
    const title = (document.getElementById("roost-modal-title") || {}).textContent || "";
    const body = document.getElementById("roost-modal-body");
    const text = body ? body.textContent : "";
    const action = body && body.querySelector("[data-achievement-action]");
    const actionText = action ? action.textContent : "";
    const actionKind = action ? action.getAttribute("data-achievement-action") : "";
    if (action) action.click();
    const panel = document.getElementById("roost-command-panel");
    const input = document.getElementById("search-input");
    const modal = document.querySelector(".roost-modal");
    return {
      hasHints: hints.length === 3,
      firstFlightPattern: first.id === "ten_recent" && first.remaining === 1 && first.current === 9,
      modalOpen: title === "Achievements" && !!body,
      renderedHints: /Closest Next Badges/.test(text) && /Flight Pattern/.test(text) && /1 to go/.test(text),
      actionVisible: actionText === "Open Launcher" && actionKind === "launcher",
      actionOpensLauncher: !!panel && panel.hidden === false && document.activeElement === input,
      actionClosesModal: !!modal && !modal.classList.contains("open")
    };
  })()`);

  const nextLearningStep = await evalJson(`(() => {
    const beforeMission = localStorage.getItem("roost_mission_v1");
    sessionStorage.removeItem("roost_next_step_skipped");
    window.roostTestHooks.renderTodayDashboard();
    const step = document.getElementById("roost-next-step");
    const start = step && step.querySelector("[data-next-step-start]");
    const safeLink = start ? /^https?:\\/\\//.test(start.getAttribute("data-link") || "") : false;
    const skip = step && step.querySelector("[data-next-step-skip]");
    if (skip) skip.click();
    const removed = !document.getElementById("roost-next-step");
    const stored = sessionStorage.getItem("roost_next_step_skipped");
    window.roostTestHooks.renderTodayDashboard();
    const staysHidden = !document.getElementById("roost-next-step");
    const afterMission = localStorage.getItem("roost_mission_v1");
    return {
      visible: !!step && /Next learning step/.test(step.textContent),
      hasStart: !!start,
      safeLink,
      hasSkip: !!skip,
      removed,
      sessionStored: !!stored,
      staysHidden,
      missionPreserved: beforeMission === afterMission
    };
  })()`);

  const readLaterTriage = await evalJson(`(() => {
    localStorage.setItem("roost_readlater_v1", JSON.stringify([
      { title: "Old shape article", link: "https://example.com/read-later-old", source: "Fixture", savedAt: "2026-06-22T00:00:00.000Z" }
    ]));
    window.roostTestHooks.renderTodayDashboard();
    const dockButton = document.querySelector('#roost-dock [data-action="readlater"]');
    if (dockButton) dockButton.click();
    const modalOpen = !!document.querySelector(".roost-modal.open");
    const title = (document.getElementById("roost-modal-title") || {}).textContent || "";
    const status = document.querySelector("[data-readlater-status]");
    const defaultedNew = !!status && status.value === "new";
    const priority = document.querySelector("[data-readlater-priority]");
    if (priority) priority.click();
    const note = document.querySelector("[data-readlater-note]");
    if (note) {
      note.value = "offline summary for the saved article";
      note.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const statusAfterPriority = document.querySelector("[data-readlater-status]");
    if (statusAfterPriority) {
      statusAfterPriority.value = "done";
      statusAfterPriority.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const stored = window.roostTestHooks.readLaterItems()[0] || {};
    const active = window.roostTestHooks.readLaterActiveItems();
    const allFilter = document.querySelector("[data-readlater-filter='all']");
    if (allFilter) allFilter.click();
    const bodyText = (document.getElementById("roost-modal-body") || {}).textContent || "";
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    const backupHasReadLater = !!window.roostTestHooks.backupPayload(false).data.roost_readlater_v1;
    return {
      modalOpen,
      titleOk: title === "Read Later",
      defaultedNew,
      priorityStored: stored.priority === "high",
      noteStored: /offline summary/.test(stored.note || ""),
      doneStored: stored.status === "done" && stored.archived === false,
      activeCountUpdated: active.length === 0,
      allFilterShowsDone: /Old shape article/.test(bodyText) && /done/i.test(bodyText),
      backupHasReadLater
    };
  })()`);

  const readLaterSaveToggle = await evalJson(`(() => {
    localStorage.removeItem("roost_readlater_v1");
    const host = document.createElement("div");
    host.innerHTML = '<button class="roost-save-article" type="button" data-save-article data-title="Toggle fixture article" data-link="https://example.com/read-later-toggle" data-source="Fixture" data-date="2026-06-27T12:00:00.000Z">Save</button>';
    document.body.appendChild(host);
    const btn = host.querySelector("[data-save-article]");
    window.roostTestHooks.bindArticleSaveButtons(host);
    if (btn) btn.click();
    const savedAfterFirst = window.roostTestHooks.readLaterLinkSaved("https://example.com/read-later-toggle");
    const buttonSaved = !!btn && btn.textContent === "Saved" && btn.getAttribute("aria-pressed") === "true" && btn.classList.contains("is-saved");
    if (btn) btn.click();
    const removedAfterSecond = !window.roostTestHooks.readLaterLinkSaved("https://example.com/read-later-toggle");
    const buttonReset = !!btn && btn.textContent === "Save" && btn.getAttribute("aria-pressed") === "false" && !btn.classList.contains("is-saved");
    host.remove();
    return {
      savedAfterFirst,
      buttonSaved,
      removedAfterSecond,
      buttonReset
    };
  })()`);

  const sessionPlanner = await evalJson(`(() => {
    localStorage.removeItem("roost_session_v1");
    window.roostTestHooks.renderTodayDashboard();
    const dockButton = document.querySelector('#roost-dock [data-action="session"]');
    if (dockButton) dockButton.click();
    const modalOpen = !!document.querySelector(".roost-modal.open");
    const title = (document.getElementById("roost-modal-title") || {}).textContent || "";
    const goal = document.getElementById("session-goal");
    const timebox = document.getElementById("session-timebox");
    const links = document.getElementById("session-links");
    const note = document.getElementById("session-note");
    if (goal) goal.value = "Ship Roost session planner";
    if (timebox) timebox.value = "45";
    if (links) links.value = "https://example.com/resource";
    if (note) note.value = "Keep the scope local and offline.";
    const save = document.getElementById("session-save");
    if (save) save.click();
    const stored = window.roostTestHooks.sessionState();
    const active = window.roostTestHooks.activeSessionState();
    const todayText = (document.getElementById("roost-today") || {}).textContent || "";
    const summary = document.getElementById("session-summary");
    if (summary) summary.value = "Saved the local planner path.";
    const complete = document.getElementById("session-complete");
    if (complete) complete.click();
    const done = window.roostTestHooks.sessionState();
    const backupHasSession = !!window.roostTestHooks.backupPayload(false).data.roost_session_v1;
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    return {
      dockVisible: !!dockButton,
      modalOpen,
      titleOk: title === "Session Planner",
      savedGoal: stored.goal === "Ship Roost session planner",
      savedTimebox: stored.timebox === "45",
      savedPlainText: /example\\.com\\/resource/.test(stored.links || "") && /offline/.test(stored.note || ""),
      activeHook: !!active && active.goal === "Ship Roost session planner",
      todayShowsSession: /Current session/.test(todayText) && /Ship Roost session planner/.test(todayText),
      completedDone: done.status === "done" && /Saved the local planner path/.test(done.summary || ""),
      completedAt: !!done.completedAt,
      backupHasSession
    };
  })()`);

  const productionParserFixtures = await evalJson(`(() => {
    const hooks = window.roostTestHooks;
    const csv = [
      "title,url,description,section,tags,favorite",
      "OpenAI Fixture,https://example.com/parser-one,AI lab,Research,ai,true",
      "Plain Domain,example.com,Plain domain,General,,false",
      "Duplicate Fixture,https://example.com/parser-one,Duplicate,Research,duplicate,false"
    ].join("\\n");
    const csvPreview = hooks.buildCustomImportPreview(csv, "csv");
    let malformedCsv = false;
    try {
      hooks.buildCustomImportPreview('title,url\\n"Broken,https://example.com', "csv");
    } catch (error) {
      malformedCsv = /Malformed CSV quote/.test(error && error.message || "");
    }
    const bookmarkPreview = hooks.buildCustomImportPreview('<DL><DT><H3>Research</H3><DL><DT><A HREF="https://example.org" TAGS="paper"><script>alert(1)</script>Example</A><DT><A HREF="javascript:alert(1)">Bad</A></DL></DL>', "bookmarks");
    let unsafeRejected = false;
    try {
      hooks.buildCustomImportPreview('<DL><DT><A HREF="javascript:alert(1)">Bad</A></DL>', "bookmarks");
    } catch (error) {
      unsafeRejected = /No safe http\\/https links/.test(error && error.message || "");
    }
    const opmlPreview = hooks.buildCustomImportPreview('<opml><body><outline text="Feeds"><outline text="Ars" xmlUrl="https://feeds.arstechnica.com/arstechnica/index" htmlUrl="https://arstechnica.com/"/></outline></body></opml>', "opml");
    let malformedOpml = false;
    try {
      hooks.buildCustomImportPreview('<opml><body><outline text="Broken"></body></opml>', "opml");
    } catch (error) {
      malformedOpml = /OPML\\/XML is malformed/.test(error && error.message || "");
    }
    return {
      hookPresent: !!(hooks && hooks.buildCustomImportPreview),
      csvCount: csvPreview.items.length === 3,
      csvPlainDomain: csvPreview.items[1].url === "https://example.com/",
      csvDuplicate: csvPreview.items[2].duplicate === true && csvPreview.duplicates.length === 1,
      malformedCsv,
      bookmarkSafeOnly: bookmarkPreview.items.length === 1 && bookmarkPreview.items[0].url === "https://example.org/",
      bookmarkScriptRemoved: bookmarkPreview.items[0].title === "Example",
      unsafeRejected,
      opmlCount: opmlPreview.items.length === 1 && opmlPreview.items[0].sectionTitle === "Feeds",
      malformedOpml
    };
  })()`);

  const customImportUndo = await evalJson(`(() => {
    localStorage.removeItem("roost_import_history_v1");
    const beforeLinks = window.roostTestHooks.customLinks();
    const beforeSections = window.roostTestHooks.customSections();
    const csv = [
      "title,url,description,section,tags",
      "Undo Import Fixture,https://example.com/import-undo,Imported fixture,Undo Runtime,undo"
    ].join("\\n");
    const preview = window.roostTestHooks.buildCustomImportPreview(csv, "csv");
    const result = window.roostTestHooks.applyCustomImport(preview, "skip");
    const importedLink = window.roostTestHooks.customLinks().filter((link) => link.url === "https://example.com/import-undo")[0];
    const importedSection = window.roostTestHooks.customSections().filter((section) => section.title === "Undo Runtime")[0];
    const history = window.roostTestHooks.importHistory();
    window.confirm = () => true;
    const customButton = document.querySelector('#roost-dock [data-action="customlinks"]');
    if (customButton) customButton.click();
    const importTab = document.querySelector('[data-custom-tab="import"]');
    if (importTab) importTab.click();
    const undoButton = document.getElementById("custom-undo-import");
    const undoEnabled = !!undoButton && !undoButton.disabled;
    if (undoButton) undoButton.click();
    const afterLinks = window.roostTestHooks.customLinks();
    const afterSections = window.roostTestHooks.customSections();
    const afterHistory = window.roostTestHooks.importHistory();
    const backupHasHistory = !!window.roostTestHooks.backupPayload(false).data.roost_import_history_v1;
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    return {
      importedOne: result.imported === 1 && result.undoable === 1,
      stampedLink: !!importedLink && importedLink.importBatchId === result.batchId,
      stampedSection: !!importedSection && importedSection.importBatchId === result.batchId,
      historyRecorded: history.length && history[0].id === result.batchId && history[0].linkIds.indexOf(importedLink.id) !== -1,
      undoEnabled,
      removedLink: !afterLinks.some((link) => link.url === "https://example.com/import-undo"),
      keptOriginal: afterLinks.some((link) => link.id === "clink_test" && link.url === "https://example.com/custom"),
      removedEmptySection: !afterSections.some((section) => section.title === "Undo Runtime"),
      countsRestored: afterLinks.length === beforeLinks.length && afterSections.length === beforeSections.length,
      historyMarkedUndone: afterHistory.length && !!afterHistory[0].undoneAt,
      backupHasHistory
    };
  })()`);

  const workbenchSearchPin = await evalJson(`(() => {
    localStorage.setItem("roost_workbench_v1", JSON.stringify([
      { id: 101, title: "Alpha field plan", method: "Free Brainstorm", body: "alpha launch notes", t: "2026-06-20T12:00:00.000Z" },
      { id: 102, title: "Beta pinned candidate", method: "SCAMPER", body: "beta refine this idea", t: "2026-06-21T12:00:00.000Z" }
    ]));
    const dockButton = document.querySelector('#roost-dock [data-action="workbench"]');
    if (dockButton) dockButton.click();
    const modalOpen = !!document.querySelector(".roost-modal.open");
    const title = (document.getElementById("roost-modal-title") || {}).textContent || "";
    const normalized = window.roostTestHooks.workbenchNotes();
    const search = document.getElementById("wb-search");
    if (search) {
      search.value = "beta";
      search.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const searchText = (document.getElementById("wb-list") || {}).textContent || "";
    const filter = document.getElementById("wb-method-filter");
    if (filter) {
      filter.value = "SCAMPER";
      filter.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const filterText = (document.getElementById("wb-list") || {}).textContent || "";
    const pin = document.querySelector("#wb-list [data-pin]");
    if (pin) pin.click();
    const pinnedStored = window.roostTestHooks.workbenchNotes().filter((note) => /Beta/.test(note.title))[0];
    if (search) {
      search.value = "";
      search.dispatchEvent(new Event("input", { bubbles: true }));
    }
    if (filter) {
      filter.value = "all";
      filter.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const rows = Array.from(document.querySelectorAll("#wb-list .wb-note"));
    const firstText = rows[0] ? rows[0].textContent : "";
    const backupHasWorkbench = !!window.roostTestHooks.backupPayload(false).data.roost_workbench_v1;
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    return {
      modalOpen,
      titleOk: /Workbench/.test(title),
      oldNotesDefaulted: normalized.length === 2 && normalized.every((note) => note.pinned === false),
      searchFindsBetaOnly: /Beta pinned candidate/.test(searchText) && !/Alpha field plan/.test(searchText),
      filterKeepsBeta: /Beta pinned candidate/.test(filterText) && !/Alpha field plan/.test(filterText),
      pinStored: !!pinnedStored && pinnedStored.pinned === true,
      pinnedFirst: rows.length === 2 && rows[0].classList.contains("pinned") && /Beta pinned candidate/.test(firstText),
      backupHasWorkbench
    };
  })()`);

  const recentCommands = await evalJson(`(() => {
    localStorage.removeItem("roost_recent_commands_v1");
    const input = document.getElementById("search-input");
    input.focus();
    input.value = "help";
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    const helpItem = Array.from(document.querySelectorAll(".roost-command-item")).filter((item) => /Open Help/.test(item.textContent))[0];
    if (helpItem) helpItem.click();
    const storedAfterRun = window.roostTestHooks.recentCommands();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    const headings = Array.from(document.querySelectorAll(".roost-command-heading")).map((item) => item.textContent || "").join("\\n");
    const recentResultText = Array.from(document.querySelectorAll(".roost-command-item")).map((item) => item.textContent || "").join("\\n");
    const dockToggle = document.getElementById("roost-dock-toggle");
    if (dockToggle) dockToggle.click();
    const backupButton = document.querySelector('#roost-dock [data-action="backup"]');
    if (backupButton) backupButton.click();
    const clear = document.getElementById("backup-clear-recent-commands");
    if (clear) clear.click();
    const cleared = window.roostTestHooks.recentCommands().length === 0 && localStorage.getItem("roost_recent_commands_v1") === null;
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    return {
      stored: storedAfterRun.length && storedAfterRun[0].title === "Open Help",
      recentGroupVisible: /Recent Commands/.test(headings),
      recentResultVisible: /Open Help/.test(recentResultText),
      clearButtonVisible: !!clear,
      cleared
    };
  })()`);

  const calmStart = await evalJson(`(() => {
    const beforeMission = localStorage.getItem("roost_mission_v1");
    const state = window.roostTestHooks.applyCalmStart();
    const settings = JSON.parse(localStorage.getItem("roost_settings_v1") || "{}");
    const wire = document.querySelector(".roost-wire");
    const today = document.getElementById("roost-today");
    const quick = document.getElementById("quick-access");
    const input = document.getElementById("search-input");
    if (input) {
      input.focus();
      input.value = "calm";
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    const activeText = (document.querySelector(".roost-command-item.is-selected") || {}).textContent || "";
    const resultText = Array.from(document.querySelectorAll(".roost-command-item")).map((item) => item.textContent || "").join("\\n");
    const afterMission = localStorage.getItem("roost_mission_v1");
    return {
      quietPreset: state.preset === "Quiet",
      wireHidden: !!wire && wire.classList.contains("roost-layout-hidden"),
      todayCollapsed: !!today && today.classList.contains("roost-surface-collapsed"),
      settingsCollapsed: settings.wireCollapsed === true && settings.todayCollapsed === true,
      quickVisible: !!quick && !quick.classList.contains("roost-layout-hidden"),
      commandFindable: /Apply Calm Start/.test(resultText) && /Apply Calm Start/.test(activeText),
      missionPreserved: beforeMission === afterMission
    };
  })()`);

  const savedHomeViews = await evalJson(`(() => {
    const beforeMission = localStorage.getItem("roost_mission_v1");
    localStorage.removeItem("roost_views_v1");
    const learning = window.roostTestHooks.applyHomeView("learning");
    const settingsAfterLearning = JSON.parse(localStorage.getItem("roost_settings_v1") || "{}");
    const viewStateAfterLearning = JSON.parse(localStorage.getItem("roost_views_v1") || "{}");
    const saved = window.roostTestHooks.saveCurrentHomeView("Runtime Saved View");
    const viewStateAfterSave = JSON.parse(localStorage.getItem("roost_views_v1") || "{}");
    const backupHasViews = !!window.roostTestHooks.backupPayload(false).data.roost_views_v1;
    const todayHasStrip = !!document.querySelector("#roost-today [data-home-view='morning']");
    const dockHasViews = !!document.querySelector('#roost-dock [data-action="views"]');
    const input = document.getElementById("search-input");
    input.focus();
    input.value = "home views";
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    const commandFindable = Array.from(document.querySelectorAll(".roost-command-item")).some((item) => /Open Home Views/.test(item.textContent));
    const afterMission = localStorage.getItem("roost_mission_v1");
    return {
      appliedLearning: !!learning && learning.id === "learning",
      learningSettings: settingsAfterLearning.searchScope === "mission" && settingsAfterLearning.newsMode === "ai",
      activeStored: viewStateAfterLearning.activeId === "learning",
      savedCustom: !!saved && viewStateAfterSave.custom && viewStateAfterSave.custom.some((view) => view.name === "Runtime Saved View"),
      backupHasViews,
      todayHasStrip,
      dockHasViews,
      commandFindable,
      missionPreserved: beforeMission === afterMission
    };
  })()`);

  const currentViewSnapshot = await evalJson(`(() => {
    localStorage.setItem("roost_readlater_v1", JSON.stringify([{ title: "Snapshot Private", link: "https://example.com/snapshot-private" }]));
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
      searchInput.value = "";
      searchInput.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    }
    const section = document.querySelector("main .section[id]");
    const hiddenTitle = section ? ((section.querySelector("h2, h3, .section-title") || section).textContent || section.id).trim().replace(/\\s+/g, " ") : "";
    if (section) section.setAttribute("data-hidden", "true");
    const mdWithout = window.roostTestHooks.currentViewSnapshotMarkdown(false);
    const dataWithout = window.roostTestHooks.currentViewSnapshotData(false);
    const mdWith = window.roostTestHooks.currentViewSnapshotMarkdown(true);
    if (section) section.setAttribute("data-hidden", "false");
    const button = document.querySelector('#roost-dock [data-action="views"]');
    if (button) button.click();
    const modalText = (document.getElementById("roost-modal-body") || {}).textContent || "";
    const preview = document.getElementById("snapshot-preview");
    const refresh = document.getElementById("snapshot-refresh");
    if (refresh) refresh.click();
    const previewText = preview ? preview.value : "";
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    return {
      markdownHeader: /The Roost Current View Snapshot/.test(mdWithout),
      hasVisibleSections: dataWithout.sections.length > 0 && /Visible links/.test(mdWithout),
      hiddenExcluded: hiddenTitle ? mdWithout.indexOf(hiddenTitle) === -1 : true,
      readLaterExcludedByDefault: !/Snapshot Private/.test(mdWithout),
      readLaterIncludedWhenAsked: /Snapshot Private/.test(mdWith),
      modalHasSnapshot: /Current View Snapshot/.test(modalText) && !!preview && !!refresh,
      previewFilled: /The Roost Current View Snapshot/.test(previewText)
    };
  })()`);

  const boardTemplates = await evalJson(`(() => {
    const beforeMission = localStorage.getItem("roost_mission_v1");
    localStorage.removeItem("roost_boards_v1");
    const dockButton = document.querySelector('#roost-dock [data-action="boards"]');
    if (dockButton) dockButton.click();
    const modalOpen = !!document.querySelector(".roost-modal.open");
    const title = (document.getElementById("roost-modal-title") || {}).textContent || "";
    const templateButtons = Array.from(document.querySelectorAll("[data-board-template]"));
    const aiButton = templateButtons.filter((btn) => btn.getAttribute("data-board-template") === "ai-build-sprint")[0];
    if (aiButton) aiButton.click();
    const firstBoards = window.roostTestHooks.boards();
    const firstBoard = firstBoards.filter((board) => board.templateId === "ai-build-sprint")[0];
    const firstCount = firstBoard && firstBoard.links ? firstBoard.links.length : 0;
    const aiButtonAgain = document.querySelector("[data-board-template='ai-build-sprint']");
    if (aiButtonAgain) aiButtonAgain.click();
    const secondBoards = window.roostTestHooks.boards();
    const secondBoard = secondBoards.filter((board) => board.templateId === "ai-build-sprint")[0];
    const hrefs = secondBoard && secondBoard.links ? secondBoard.links.map((link) => link.href) : [];
    const bodyText = (document.getElementById("roost-modal-body") || {}).textContent || "";
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    const afterMission = localStorage.getItem("roost_mission_v1");
    return {
      modalOpen,
      titleOk: title === "Boards",
      templatesVisible: templateButtons.length >= 4 && templateButtons.every((btn) => !btn.disabled),
      applied: !!firstBoard && firstBoard.name === "AI Build Sprint" && firstCount >= 4,
      deduped: !!secondBoard && secondBoard.links.length === firstCount && new Set(hrefs).size === hrefs.length,
      rendered: /Starter Templates/.test(bodyText) && /AI Build Sprint/.test(bodyText),
      backupHasBoards: !!window.roostTestHooks.backupPayload(false).data.roost_boards_v1,
      missionPreserved: beforeMission === afterMission
    };
  })()`);

  const localTags = await evalJson(`(() => {
    const card = document.querySelector("#quick-access .link-card[href]") || document.querySelector("main .link-card[href]");
    const href = card ? new URL(card.href).href : "";
    const title = card ? ((card.querySelector(".card-label") || {}).textContent || "Tagged") : "Tagged";
    const notes = window.roostTestHooks.linkNotes();
    notes[href] = { title, section: "quick-access", status: "useful", rating: "3", tags: ["runtime-tag"], note: "runtime searchable note", updatedAt: new Date().toISOString() };
    window.roostTestHooks.saveLinkNotes(notes);
    const marked = card && card.classList.contains("roost-has-tags");
    const allScope = document.querySelector('[data-search-scope="all"]');
    if (allScope) allScope.click();
    const input = document.getElementById("search-input");
    input.focus();
    input.value = "runtime-tag";
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    const visible = card && card.getAttribute("data-hidden") === "false";
    const launcherText = Array.from(document.querySelectorAll(".roost-command-item")).map((item) => item.textContent || "").join("\\n");
    const backupHasNotes = !!window.roostTestHooks.backupPayload(false).data.roost_link_notes_v1;
    return {
      marked,
      visible,
      launcherIncludesTag: /runtime-tag/.test(launcherText),
      termsIncludeTag: /runtime-tag/.test(window.roostTestHooks.linkNoteTerms(href)),
      backupHasNotes
    };
  })()`);

  const customFeeds = await evalJson(`(async () => {
    const feedUrl = "https://example.com/runtime-feed.xml";
    window.roostTestHooks.saveCustomFeeds([{ id: "feed_runtime", label: "Runtime Feed", url: feedUrl, wire: true, sectionId: "news", createdAt: "2026-06-22T00:00:00.000Z", updatedAt: "2026-06-22T00:00:00.000Z" }]);
    localStorage.setItem(window.roostTestHooks.cacheKey(feedUrl), JSON.stringify({
      t: Date.now(),
      items: [{ title: "Runtime custom feed headline", link: "https://example.com/runtime-feed-story", desc: "Custom feed fixture", date: new Date().toISOString(), source: "Runtime Feed" }]
    }));
    window.roostTestHooks.applyHomeView("morning");
    const effectiveWire = window.roostTestHooks.effectiveWireFeeds();
    const newsCfg = window.roostTestHooks.sectionFeedConfig("news");
    await window.roostTestHooks.loadWire({ preferCache: true });
    const wireText = (document.getElementById("roost-wire-grid") || {}).textContent || "";
    const dockButton = document.querySelector('#roost-dock [data-action="customlinks"]');
    if (dockButton) dockButton.click();
    const modalOpen = !!document.querySelector(".roost-modal.open");
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    const backupHasFeeds = !!window.roostTestHooks.backupPayload(false).data.roost_custom_feeds_v1;
    return {
      stored: window.roostTestHooks.customFeeds().length === 1,
      effectiveWire: effectiveWire.some((feed) => feed.label === "Runtime Feed" && feed.custom === true),
      sectionMerged: !!newsCfg && newsCfg.feeds.includes(feedUrl),
      wireRendered: /Runtime custom feed headline/.test(wireText),
      managerReachable: modalOpen,
      backupHasFeeds
    };
  })()`);

  const accessibility = await evalJson(`(() => {
    window.roostTestHooks.saveAccessibilityPrefs({ textScale: "large", contrast: "strong", focus: "strong", motion: "reduced" });
    const prefs = window.roostTestHooks.accessibilityPrefs();
    const classes = document.body.classList;
    const dockHasAccess = !!document.querySelector('#roost-dock [data-action="accessibility"]');
    const backupHasAccess = !!window.roostTestHooks.backupPayload(false).data.roost_accessibility_v1;
    return {
      prefsStored: prefs.textScale === "large" && prefs.contrast === "strong" && prefs.focus === "strong" && prefs.motion === "reduced",
      classesApplied: classes.contains("roost-text-large") && classes.contains("roost-contrast-strong") && classes.contains("roost-focus-strong") && classes.contains("roost-reduce-motion"),
      dockHasAccess,
      backupHasAccess
    };
  })()`);

  const linkHealth = await evalJson(`(() => {
    const candidates = window.roostTestHooks.linkHealthCandidates("visible", 5);
    const fixture = candidates[0] || { href: "https://example.com/health", title: "Health Fixture", section: "fixture" };
    const results = {};
    results[fixture.href] = { href: fixture.href, title: fixture.title || "Health Fixture", status: "opaque", detail: "Reached by browser; status hidden by site", checkedAt: new Date().toISOString() };
    window.roostTestHooks.saveLinkHealthState({ results });
    const button = document.querySelector('#roost-dock [data-action="linkhealth"]');
    if (button) button.click();
    const modalOpen = !!document.querySelector(".roost-modal.open");
    const title = (document.getElementById("roost-modal-title") || {}).textContent || "";
    const text = (document.getElementById("roost-modal-body") || {}).textContent || "";
    const summary = window.roostTestHooks.linkHealthCoverageSummary();
    const report = window.roostTestHooks.linkHealthCoverageMarkdown();
    const copy = document.getElementById("health-copy-report");
    const close = document.getElementById("roost-modal-x");
    close && close.click();
    const backupHasHealth = !!window.roostTestHooks.backupPayload(false).data.roost_link_health_v1;
    return {
      candidatesFound: candidates.length > 0,
      modalOpen,
      titleOk: title === "Link Health",
      resultRendered: /Reached by browser/.test(text) && /opaque/.test(text),
      coverageRendered: /Coverage Summary/.test(text) && /checked visible/.test(text),
      coverageCounts: summary.checkedVisible >= 1 && summary.uncheckedVisible >= 0 && summary.sections.length > 0,
      reportMarkdown: /The Roost Link Health Coverage/.test(report) && /Section Coverage/.test(report),
      copyVisible: !!copy,
      backupHasHealth
    };
  })()`);

  const emptyStateCards = await evalJson(`(() => {
    window.confirm = () => false;
    localStorage.removeItem("roost_readlater_v1");
    localStorage.removeItem("roost_boards_v1");
    localStorage.removeItem("roost_workbench_v1");
    localStorage.removeItem("roost_link_health_v1");
    localStorage.removeItem("roost_custom_links_v1");
    localStorage.removeItem("roost_custom_sections_v1");
    localStorage.removeItem("roost_backup_meta_v1");
    function closeModal() {
      const close = document.getElementById("roost-modal-x");
      if (close) close.click();
    }
    function openTool(action) {
      closeModal();
      const btn = document.querySelector('#roost-dock [data-action="' + action + '"]');
      if (btn) btn.click();
      return (document.getElementById("roost-modal-body") || {});
    }
    const readLaterBody = openTool("readlater");
    const readLater = !!readLaterBody.querySelector("[data-empty-card] [data-empty-action='wire']");
    closeModal();
    const workbenchBody = openTool("workbench");
    const workbench = !!workbenchBody.querySelector("[data-empty-card] [data-empty-action='wb-cornell']");
    closeModal();
    const boardsBody = openTool("boards");
    const boards = !!boardsBody.querySelector("[data-empty-card] [data-empty-action='board-create']");
    closeModal();
    const customBody = openTool("customlinks");
    const custom = !!customBody.querySelector("[data-empty-card] [data-empty-action='addlink']") && !!customBody.querySelector("[data-empty-card] [data-empty-action='import']");
    closeModal();
    const healthBody = openTool("linkhealth");
    const health = !!healthBody.querySelector("[data-empty-card] [data-empty-action='health-visible']");
    closeModal();
    const backupBody = openTool("backup");
    const backup = !!backupBody.querySelector("[data-empty-card] [data-empty-action='backup-download']");
    closeModal();
    return { readLater, workbench, boards, custom, health, backup };
  })()`);

  const finalState = await evalJson(`(() => ({
    layoutKey: localStorage.getItem("roost_layout_v1"),
    editorOpenCount: document.querySelectorAll(".roost-layout-editor.open").length,
    hooks: !!window.roostTestHooks,
    commandHasLayout: !!window.roostTestHooks && window.roostTestHooks.layoutWidgetDefinitions().some((w) => w.id === "launcher")
  }))()`);

  await send("Emulation.clearDeviceMetricsOverride");
  client.ws.close();

  const failed = [];
  for (const item of widthResults) {
    if (item.linkCards !== EXPECTED_LINK_CARDS) failed.push(`link count at ${item.width}: ${item.linkCards}/${EXPECTED_LINK_CARDS}`);
    if (item.sections !== EXPECTED_RUNTIME_SECTIONS) failed.push(`section count at ${item.width}: ${item.sections}/${EXPECTED_RUNTIME_SECTIONS}`);
    if (!item.editorFit || !item.editorOpened || item.editorButtons < 10) failed.push(`editor fit/open at ${item.width}`);
    if (!item.hasCustomWidget || !item.hasMissionWidget || !item.hasLockedLauncher) failed.push(`widget mapping at ${item.width}`);
    if (item.overflow > 2) failed.push(`horizontal overflow at ${item.width}: ${item.overflow}`);
  }
  Object.keys(curatedSpecialtySections).forEach((key) => {
    if (curatedSpecialtySections[key] !== true) failed.push(`curated specialty sections ${key}`);
  });
  Object.keys(backToTopButton).forEach((key) => {
    if (backToTopButton[key] !== true) failed.push(`back to top ${key}`);
  });
  Object.keys(interaction).forEach((key) => {
    if (key === "morningPreset") {
      if (interaction[key] !== "Morning") failed.push(key);
      return;
    }
    if (key === "morningTopOrder") {
      if (!Array.isArray(interaction[key]) || interaction[key][0] !== "launcher") failed.push(key);
      return;
    }
    if (interaction[key] !== true) failed.push(key);
  });
  if (launcher.beforeEnter.noResultsVisible) failed.push("launcher import showed no-results");
  if (!launcher.beforeEnter.activeText.includes("Manage Custom Links")) failed.push("launcher import active command");
  if (launcher.beforeEnter.itemCount < 1) failed.push("launcher import results");
  if (!launcher.afterEnter.modalOpen || launcher.afterEnter.modalTitle !== "Custom Links") failed.push("launcher import enter activation");
  if (!/^http:\/\/127\.0\.0\.1/.test(launcher.afterEnter.href)) failed.push("launcher import external navigation");
  Object.keys(missionIntro).forEach((key) => {
    if (key === "previewTitle") {
      if (missionIntro[key] !== "Mission Control Preview") failed.push("mission intro preview title");
      return;
    }
    if (missionIntro[key] !== true) failed.push(`mission intro ${key}`);
  });
  Object.keys(memoryHealth).forEach((key) => {
    if (key === "title") {
      if (memoryHealth[key] !== "Backup / Restore") failed.push("memory health modal title");
      return;
    }
    if (memoryHealth[key] !== true) failed.push(`memory health ${key}`);
  });
  Object.keys(restoreUndo).forEach((key) => {
    if (restoreUndo[key] !== true) failed.push(`restore undo ${key}`);
  });
  Object.keys(configPacks).forEach((key) => {
    if (configPacks[key] !== true) failed.push(`config packs ${key}`);
  });
  Object.keys(offlineStatus).forEach((key) => {
    if (offlineStatus[key] !== true) failed.push(`offline status ${key}`);
  });
  Object.keys(newsFreshness).forEach((key) => {
    if (newsFreshness[key] !== true) failed.push(`news freshness ${key}`);
  });
  Object.keys(feedEntityDecoding).forEach((key) => {
    if (feedEntityDecoding[key] !== true) failed.push(`feed entity decoding ${key}`);
  });
  Object.keys(sectionHeadlineControls).forEach((key) => {
    if (sectionHeadlineControls[key] !== true) failed.push(`section headline controls ${key}`);
  });
  Object.keys(wireTopicDrilldown).forEach((key) => {
    if (wireTopicDrilldown[key] !== true) failed.push(`wire topic drilldown ${key}`);
  });
  Object.keys(dailyTip).forEach((key) => {
    if (dailyTip[key] !== true) failed.push(`daily tip ${key}`);
  });
  Object.keys(dailyQuestDeck).forEach((key) => {
    if (dailyQuestDeck[key] !== true) failed.push(`daily quest deck ${key}`);
  });
  Object.keys(achievementHints).forEach((key) => {
    if (achievementHints[key] !== true) failed.push(`achievement hints ${key}`);
  });
  Object.keys(nextLearningStep).forEach((key) => {
    if (nextLearningStep[key] !== true) failed.push(`next learning step ${key}`);
  });
  Object.keys(readLaterTriage).forEach((key) => {
    if (readLaterTriage[key] !== true) failed.push(`read later triage ${key}`);
  });
  Object.keys(readLaterSaveToggle).forEach((key) => {
    if (readLaterSaveToggle[key] !== true) failed.push(`read later save toggle ${key}`);
  });
  Object.keys(sessionPlanner).forEach((key) => {
    if (sessionPlanner[key] !== true) failed.push(`session planner ${key}`);
  });
  Object.keys(productionParserFixtures).forEach((key) => {
    if (productionParserFixtures[key] !== true) failed.push(`production parser fixtures ${key}`);
  });
  Object.keys(customImportUndo).forEach((key) => {
    if (customImportUndo[key] !== true) failed.push(`custom import undo ${key}`);
  });
  Object.keys(workbenchSearchPin).forEach((key) => {
    if (workbenchSearchPin[key] !== true) failed.push(`workbench search pin ${key}`);
  });
  Object.keys(recentCommands).forEach((key) => {
    if (recentCommands[key] !== true) failed.push(`recent commands ${key}`);
  });
  Object.keys(calmStart).forEach((key) => {
    if (calmStart[key] !== true) failed.push(`calm start ${key}`);
  });
  Object.keys(savedHomeViews).forEach((key) => {
    if (savedHomeViews[key] !== true) failed.push(`saved home views ${key}`);
  });
  Object.keys(currentViewSnapshot).forEach((key) => {
    if (currentViewSnapshot[key] !== true) failed.push(`current view snapshot ${key}`);
  });
  Object.keys(boardTemplates).forEach((key) => {
    if (boardTemplates[key] !== true) failed.push(`board templates ${key}`);
  });
  Object.keys(localTags).forEach((key) => {
    if (localTags[key] !== true) failed.push(`local tags ${key}`);
  });
  Object.keys(customFeeds).forEach((key) => {
    if (customFeeds[key] !== true) failed.push(`custom feeds ${key}`);
  });
  Object.keys(accessibility).forEach((key) => {
    if (accessibility[key] !== true) failed.push(`accessibility ${key}`);
  });
  Object.keys(linkHealth).forEach((key) => {
    if (linkHealth[key] !== true) failed.push(`link health ${key}`);
  });
  Object.keys(emptyStateCards).forEach((key) => {
    if (emptyStateCards[key] !== true) failed.push(`empty state cards ${key}`);
  });
  if (runtimeErrors.length) failed.push(`runtime errors: ${runtimeErrors.join(" | ")}`);

  for (const item of widthResults) {
    if (!item.helpFit || !item.helpClosed || !item.helpFocused || item.helpActions < 8 || !item.helpHasCoreText || !item.helpBackgroundLocked || !item.helpBackgroundRestored) failed.push(`quick start help at ${item.width}`);
    if (!item.importPrimaryVisible || !item.importModalOpen || item.importModalTitle !== "Custom Links" || !item.importControls || !item.importFocusInModal || !item.modalBackgroundLocked || !item.importFocusRestored || !item.modalBackgroundRestored) failed.push(`primary import at ${item.width}`);
    if (!item.dockClosedHidden || !item.dockOpenVisible || !item.dockEscClosed) failed.push(`dock accessibility at ${item.width}`);
    if (!item.dockSiblingTools) failed.push(`dock sibling tools at ${item.width}`);
    if (!item.dockMenuSurface || !item.dockCompactTools) failed.push(`dock compact surface at ${item.width}`);
  }
  if (helpLauncher.beforeEnter.noResultsVisible) failed.push("launcher help showed no-results");
  if (!helpLauncher.beforeEnter.activeText.includes("Open Help")) failed.push("launcher help active command");
  if (helpLauncher.beforeEnter.itemCount < 1) failed.push("launcher help results");
  if (!helpLauncher.afterEnter.helpOpen || helpLauncher.afterEnter.helpTitle !== "Start Here" || !helpLauncher.afterEnter.helpFocused) failed.push("launcher help enter activation");
  Object.keys(keyboardShortcuts).forEach((key) => {
    if (keyboardShortcuts[key] !== true) failed.push(`keyboard shortcuts ${key}`);
  });

  const report = { widthResults, curatedSpecialtySections, backToTopButton, launcher, helpLauncher, keyboardShortcuts, interaction, missionIntro, memoryHealth, restoreUndo, configPacks, offlineStatus, newsFreshness, feedEntityDecoding, sectionHeadlineControls, wireTopicDrilldown, dailyTip, dailyQuestDeck, achievementHints, nextLearningStep, readLaterTriage, readLaterSaveToggle, sessionPlanner, productionParserFixtures, customImportUndo, workbenchSearchPin, recentCommands, calmStart, savedHomeViews, currentViewSnapshot, localTags, customFeeds, accessibility, linkHealth, emptyStateCards, finalState, runtimeErrors, failed };
  console.log(JSON.stringify(report, null, 2));
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
