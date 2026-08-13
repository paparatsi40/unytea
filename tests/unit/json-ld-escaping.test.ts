import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { jsonLdSafe } from "@/lib/json-ld";

/**
 * SEC-10 — stored XSS via unescaped JSON-LD.
 *
 * `JSON.stringify` escapes quotes and backslashes but not `<` or `/`, so a
 * session title containing `</script><script>alert(1)</script>` terminated the
 * JSON-LD block and executed. The public session page carries host-controlled
 * text (title, description, host name, community name) and is crawled and
 * shared, so any host could have hit every visitor — including authenticated
 * ones arriving from an in-app link. CSP does not help: `script-src` still
 * includes `'unsafe-inline'`.
 */

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

describe("jsonLdSafe — script-block breakout", () => {
  const BREAKOUT = "</script><script>alert(1)</script>";

  it("escapes the closing tag so the block cannot be terminated", () => {
    const out = jsonLdSafe({ name: BREAKOUT });

    // The literal sequence must not survive anywhere in the output.
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c");
  });

  it("is a real regression — plain JSON.stringify does contain the breakout", () => {
    // Pins why this helper exists; if this ever fails, the threat model changed.
    expect(JSON.stringify({ name: BREAKOUT })).toContain("</script>");
  });

  it("escapes > as well, so no tag can be formed", () => {
    const out = jsonLdSafe({ name: "<img src=x onerror=alert(1)>" });
    expect(out).not.toContain(">");
    expect(out).toContain("\\u003e");
  });

  it("escapes & so entity sequences cannot be reinterpreted", () => {
    const out = jsonLdSafe({ name: "a &lt;b" });
    expect(out).not.toContain("&");
    expect(out).toContain("\\u0026");
  });

  it("escapes U+2028, which is legal JSON but a JS line terminator", () => {
    const out = jsonLdSafe({ name: `a${LINE_SEPARATOR}b` });
    expect(out).not.toContain(LINE_SEPARATOR);
    expect(out).toContain("\\u2028");
  });

  it("escapes U+2029", () => {
    const out = jsonLdSafe({ name: `a${PARAGRAPH_SEPARATOR}b` });
    expect(out).not.toContain(PARAGRAPH_SEPARATOR);
    expect(out).toContain("\\u2029");
  });

  it("escapes hostile text nested deep in the object", () => {
    const out = jsonLdSafe({
      "@type": "Event",
      organizer: { "@type": "Organization", name: BREAKOUT },
      performer: [{ name: `evil${LINE_SEPARATOR}` }],
    });
    expect(out).not.toContain("<");
    expect(out).not.toContain(LINE_SEPARATOR);
  });
});

describe("jsonLdSafe — the data still round-trips", () => {
  it("parses back to exactly the original value", () => {
    const original = {
      "@context": "https://schema.org",
      name: "</script><script>alert(1)</script>",
      description: `line${LINE_SEPARATOR}break & <b>bold</b>`,
      count: 42,
      nested: { list: ["<a>", "&", ">"] },
    };

    // Crawlers must see the real values; only the raw bytes differ.
    expect(JSON.parse(jsonLdSafe(original))).toEqual(original);
  });

  it("leaves ordinary text untouched", () => {
    expect(jsonLdSafe({ name: "Weekly office hours" })).toBe(
      JSON.stringify({ name: "Weekly office hours" })
    );
  });

  it("never returns undefined for a non-serializable value", () => {
    // Assigning `undefined` to __html would print the text "undefined".
    expect(jsonLdSafe(undefined)).toBe("null");
    expect(jsonLdSafe(() => {})).toBe("null");
  });
});

/**
 * Every JSON-LD injection site must go through the helper. Grepping the tree is
 * what makes this a guarantee rather than a spot-check: a new page that reaches
 * for JSON.stringify fails here.
 */
describe("every JSON-LD injection site uses the helper", () => {
  const REPO_ROOT = path.resolve(__dirname, "../..");

  function walk(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (![".next", "node_modules"].includes(entry.name)) walk(p, out);
      } else if (/\.tsx?$/.test(entry.name)) out.push(p);
    }
    return out;
  }

  const files = [
    ...walk(path.join(REPO_ROOT, "app")),
    ...walk(path.join(REPO_ROOT, "components")),
  ];

  /** Lines that inject into __html using JSON.stringify. */
  function offendingLines(source: string): string[] {
    return source
      .split("\n")
      .filter((line) => line.includes("__html") && line.includes("JSON.stringify"));
  }

  it("no __html assignment uses raw JSON.stringify", () => {
    const offenders = files.flatMap((f) =>
      offendingLines(fs.readFileSync(f, "utf8")).map(
        (l) => `${path.relative(REPO_ROOT, f).split(path.sep).join("/")}: ${l.trim()}`
      )
    );
    expect(offenders).toEqual([]);
  });

  it("the known JSON-LD components call jsonLdSafe", () => {
    const sites = [
      "components/sessions/SessionJsonLd.tsx",
      "app/[locale]/blog/[slug]/page.tsx",
      "app/layout.tsx",
    ];
    for (const site of sites) {
      const source = fs.readFileSync(path.join(REPO_ROOT, site), "utf8");
      expect(source, `${site} should use jsonLdSafe`).toContain("jsonLdSafe");
    }
  });

  it("finds the files it claims to scan", () => {
    expect(files.length).toBeGreaterThan(100);
  });
});

/**
 * The regex sanitizer that used to sit in lib/validations.ts was bypassable
 * (`<scr<script>ipt>`) and lived one import away from the real one.
 */
describe("lib/sanitize.ts is the only HTML sanitizer", () => {
  const REPO_ROOT = path.resolve(__dirname, "../..");

  it("lib/validations.ts no longer exports a sanitizeHtml", () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, "lib/validations.ts"), "utf8");
    expect(source).not.toMatch(/export\s+function\s+sanitizeHtml\b/);
  });

  it("exactly one HTML sanitizer is exported across lib/", () => {
    const libFiles = fs
      .readdirSync(path.join(REPO_ROOT, "lib"), { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".ts"))
      .map((e) => path.join(REPO_ROOT, "lib", e.name));

    const exporters = libFiles.filter((f) =>
      /export\s+function\s+sanitizeHTML?\b/i.test(fs.readFileSync(f, "utf8"))
    );

    expect(exporters.map((f) => path.basename(f))).toEqual(["sanitize.ts"]);
  });

  it("the surviving sanitizer is allowlist-based, not regex stripping", () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, "lib/sanitize.ts"), "utf8");
    expect(source).toContain("sanitize-html");
    expect(source).toContain("allowedTags");
  });
});
