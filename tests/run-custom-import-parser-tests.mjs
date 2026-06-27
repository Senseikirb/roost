import assert from "node:assert/strict";

function safeUrl(value) {
  let raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) {
    if (/^[^\s/@]+\.[^\s]+/.test(raw)) raw = `https://${raw}`;
    else return "";
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function textOnly(value) {
  return String(value || "").replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function csvRows(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(value);
      value = "";
    } else if (ch === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (ch !== "\r") {
      value += ch;
    }
  }
  if (quoted) throw new Error("Malformed CSV quote.");
  row.push(value);
  rows.push(row);
  return rows.filter((r) => r.some((c) => String(c || "").trim()));
}

function parseCsv(text) {
  const rows = csvRows(text);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one link.");
  const headers = rows.shift().map((h) => String(h || "").trim().toLowerCase());
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] || "";
    });
    return normalize({
      title: obj.title || obj.name,
      url: obj.url || obj.href,
      description: obj.description || obj.desc,
      section: obj.section,
      tags: obj.tags,
      favorite: obj.favorite
    });
  }).filter(Boolean);
}

function parseBookmarkHtml(text) {
  const out = [];
  const sectionMatch = String(text).match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
  const section = sectionMatch ? textOnly(sectionMatch[1]) : "Bookmarks";
  const linkRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(String(text)))) {
    const attrs = match[1];
    const href = (attrs.match(/\bhref=["']([^"']+)["']/i) || [])[1] || "";
    const tags = (attrs.match(/\btags=["']([^"']+)["']/i) || [])[1] || "";
    const description = (attrs.match(/\bdescription=["']([^"']+)["']/i) || [])[1] || "";
    const normalized = normalize({ title: textOnly(match[2]), url: href, description, section, tags });
    if (normalized) out.push(normalized);
  }
  return out;
}

function parseOpml(text) {
  const s = String(text || "");
  const openNonSelfClosing = (s.match(/<outline\b(?:(?!\/>)[^>])*>/gi) || []).length;
  const closing = (s.match(/<\/outline>/gi) || []).length;
  if (!/<opml\b/i.test(s) || openNonSelfClosing > closing) {
    throw new Error("OPML/XML is malformed.");
  }
  const out = [];
  const outlineRe = /<outline\b([^>]*)\/>/gi;
  let match;
  while ((match = outlineRe.exec(s))) {
    const attrs = match[1];
    const attr = (name) => (attrs.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i")) || [])[1] || "";
    const normalized = normalize({
      title: attr("title") || attr("text") || attr("xmlUrl") || attr("htmlUrl"),
      url: attr("htmlUrl") || attr("xmlUrl") || attr("url"),
      description: attr("description") || "Feed subscription",
      section: "Feeds",
      tags: "feed,opml",
      icon: "RSS"
    });
    if (normalized) out.push(normalized);
  }
  return out;
}

function normalize(item) {
  const url = safeUrl(item.url);
  if (!url) return null;
  return {
    title: textOnly(item.title || url).slice(0, 120),
    url,
    description: textOnly(item.description || "").slice(0, 500),
    sectionTitle: textOnly(item.section || "Imported").slice(0, 80),
    tags: String(item.tags || "").split(/[;,]/).map((t) => textOnly(t).slice(0, 32)).filter(Boolean).slice(0, 12),
    icon: textOnly(item.icon || "").slice(0, 12),
    favorite: item.favorite === true || String(item.favorite || "").toLowerCase() === "true"
  };
}

function withDuplicates(items, existingUrls = []) {
  const seen = Object.fromEntries(existingUrls.map((url) => [safeUrl(url).toLowerCase(), true]));
  return items.map((item) => {
    const duplicate = !!seen[item.url.toLowerCase()];
    seen[item.url.toLowerCase()] = true;
    return { ...item, duplicate };
  });
}

const csv = parseCsv(`title,url,description,section,tags,favorite
OpenAI,https://openai.com,AI lab,Research,"ai,docs",true
Example,example.com,Plain domain,General,,false`);
assert.equal(csv.length, 2);
assert.equal(csv[1].url, "https://example.com/");

assert.throws(() => parseCsv('title,url\n"Broken,https://example.com'), /Malformed CSV/);

const bookmarks = parseBookmarkHtml(`<DL><DT><H3>Research</H3><DT><A HREF="https://example.org" TAGS="paper"><script>alert(1)</script>Example</A><DT><A HREF="javascript:alert(1)">Bad</A></DL>`);
assert.equal(bookmarks.length, 1);
assert.equal(bookmarks[0].title, "Example");
assert.equal(bookmarks[0].sectionTitle, "Research");

const opml = parseOpml(`<opml><body><outline text="Feeds"><outline text="Ars" xmlUrl="https://feeds.arstechnica.com/arstechnica/index" htmlUrl="https://arstechnica.com/"/></outline></body></opml>`);
assert.equal(opml.length, 1);
assert.equal(opml[0].sectionTitle, "Feeds");

assert.throws(() => parseOpml("<opml><body><outline text=\"Broken\"></body></opml>"), /malformed/i);

const duplicatePreview = withDuplicates(csv, ["https://openai.com/"]);
assert.equal(duplicatePreview[0].duplicate, true);
assert.equal(duplicatePreview[1].duplicate, false);

console.log("custom import parser fixtures passed");
