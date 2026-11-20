import assert from "node:assert/strict";
import { connectApp } from "./cdp-client.mjs";

function tripJourney() {
  const id = name => document.getElementById(name);
  const results = () => [...document.querySelectorAll("article.res")];
  function enter(name, value) {
    const input = id(name);
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const firstRender = results().length === 10;
  const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
  let manualCopy;
  try {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    document.querySelector(".copybtn").click();
    const text = document.querySelector(".manual-copy textarea");
    manualCopy = text === document.activeElement && text.value.includes("5. ") && !text.value.includes("6. ");
  } finally {
    if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard);
    else delete navigator.clipboard;
  }
  id("kidsToggle").click();
  const age = document.querySelector("#kidList input");
  enter(age.id, "25");
  const invalidAge = !age.validity.valid && results().length === 0;
  enter(age.id, "2");
  const familyResult = id("results").textContent.includes("1 child");
  document.querySelector("#kidList button").click();
  const removed = !id("kidsToggle").checked && document.activeElement === id("kidsToggle");
  id("start").closest("details").open = true;
  enter("start", "2030-03-09");
  enter("end", "2030-03-11");
  const dates = id("nights").value === "2" && id("nights").readOnly;
  enter("end", "2030-03-01");
  const badDates = !id("end").validity.valid && results().length === 0;
  enter("end", "2030-03-11");
  const originalTotals = results().map(card => card.querySelector(".big").textContent).join();
  enter("origin", "sea");
  const flight = document.querySelector(".flightlink");
  const fareQuery = new URL(flight.href).searchParams.get("q");
  const airport = originalTotals === results().map(card => card.querySelector(".big").textContent).join()
    && fareQuery.includes("from SEA") && fareQuery.includes("2030-03-11")
    && id("results").textContent.includes("Dallas") && flight.rel.includes("noreferrer");
  enter("budget", "1");
  const totals = results().map(card => Number(card.querySelector(".big").textContent.replace(/[^0-9]/g, "")));
  const closestOverages = totals.length > 1 && totals.every((cost, i) => !i || cost >= totals[i - 1]);
  id("shortOnly").click();
  document.querySelector('[data-style="snow"]').click();
  id("styleOnly").click();
  const matches = results().every(card => card.querySelector(".rchips").textContent.includes("Snow"));
  id("tripForm").requestSubmit();
  return {
    firstRender, manualCopy, invalidAge, familyResult, removed, dates, badDates, airport, closestOverages,
    matches: matches && results().length > 0, focus: document.activeElement === id("resultsTitle"),
    fits: document.documentElement.scrollWidth <= innerWidth
  };
}

function explorerJourney() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const first = tabs[0];
  first.focus();
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  const why = document.getElementById("cWhy");
  const visibleGraph = tabs[1].getAttribute("aria-selected") === "true" &&
    tabs[1] === document.activeElement && why.width > 0 && why.getBoundingClientRect().width > 0;
  const q = document.getElementById("toggleQ");
  q.click();
  const toggled = q.getAttribute("aria-pressed") === "false";
  const motion = document.querySelector("#why .motion-toggle");
  const before = motion.textContent;
  motion.click();
  const pause = motion.textContent !== before;
  tabs[2].click();
  const stage = document.querySelectorAll("button.stage")[2];
  stage.click();
  const stageSelected = stage.getAttribute("aria-pressed") === "true";
  tabs[3].click();
  const fits = document.documentElement.scrollWidth <= innerWidth;
  tabs[0].click();
  return { visibleGraph, toggled, pause, stageSelected, fits,
    slidersLabeled: [...document.querySelectorAll("input[type=range]")].every(input => input.labels.length === 1),
    returned: document.getElementById("cPhasor").width > 0
  };
}

for (const width of [320, 390, 1440]) {
  const app = await connectApp({ width });
  try {
    const root = process.env.ROOST_APP_URL || "http://127.0.0.1:8765/index.html";
    for (const [file, journey] of [["roost-destination-finder.html", tripJourney], ["iq-rfsoc-explorer.html", explorerJourney]]) {
      const page = new URL(file, root).href;
      await app.send("Page.navigate", { url: page });
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        try { ready = await app.evaluate("location.href === " + JSON.stringify(page) + " && document.readyState === 'complete'"); } catch {}
        if (ready) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.ok(ready, file + " loaded");
      const result = await app.evaluate("(" + journey.toString() + ")()");
      for (const [check, value] of Object.entries(result)) assert.ok(value, file + " " + width + "px " + check);
      console.log("PASS", file, width + "px", Object.keys(result).length, "checks");
    }
    assert.deepEqual(app.errors, []);
  } finally { await app.close(); }
}
