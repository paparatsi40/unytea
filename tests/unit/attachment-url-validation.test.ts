import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  isSafeAttachmentUrl,
  attachmentUrlSchema,
  attachmentUrlListSchema,
  postAttachmentsSchema,
} from "@/lib/attachments";

/**
 * Stored XSS through post and message attachments.
 *
 * `createPost` did `JSON.parse(formData.get("attachments"))` and wrote the
 * result to the row cast to `never` — no schema at all. `PremiumPostCard`
 * renders every attachment as `<a href={attachment.url}>`, and React does not
 * sanitize `href`: it warns about a `javascript:` URL in development and
 * renders it regardless. A member could store `{"url":"javascript:…"}` and any
 * reader who clicked it executed script on our origin with their session.
 *
 * The same shape existed in direct messages, where `sendMessage` bounded the
 * strings by length only and `MessageBubble` renders the identical `<a href>`,
 * and in `sendChannelMessage`, whose attachments argument was `z.unknown()`.
 *
 * Same class as SEC-10, the JSON-LD stored XSS, so it is closed the same way:
 * one validator on every write path, and a filter at render, because rows
 * written before the validator existed are still in the database.
 */

const REPO_ROOT = path.resolve(__dirname, "../..");

const DANGEROUS = [
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "  javascript:alert(1)",
  "java\nscript:alert(1)",
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "data:image/svg+xml,<svg onload=alert(1)>",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  // Protocol-relative: inherits the page's scheme, and `new URL` cannot parse
  // it without a base.
  "//evil.test/payload.js",
  "/relative/path.png",
  "not a url at all",
  "",
];

const SAFE = [
  "https://utfs.io/f/abc123.png",
  "http://localhost:3000/uploads/x.pdf",
  "https://example.com/a b.png",
  "HTTPS://UTFS.IO/f/abc.png",
];

describe("isSafeAttachmentUrl", () => {
  it.each(DANGEROUS)("rejects %j", (value) => {
    expect(isSafeAttachmentUrl(value)).toBe(false);
  });

  it.each(SAFE)("accepts %j", (value) => {
    expect(isSafeAttachmentUrl(value)).toBe(true);
  });

  it("rejects non-strings", () => {
    expect(isSafeAttachmentUrl(null)).toBe(false);
    expect(isSafeAttachmentUrl(undefined)).toBe(false);
    expect(isSafeAttachmentUrl(123)).toBe(false);
    expect(isSafeAttachmentUrl({ toString: () => "https://ok.test" })).toBe(false);
  });
});

describe("attachmentUrlSchema", () => {
  it.each(DANGEROUS)("refuses %j", (value) => {
    expect(attachmentUrlSchema.safeParse(value).success).toBe(false);
  });

  it("accepts an https upload URL", () => {
    expect(attachmentUrlSchema.safeParse("https://utfs.io/f/abc.png").success).toBe(true);
  });
});

describe("postAttachmentsSchema", () => {
  it("rejects the javascript: payload the write path used to accept", () => {
    const payload = [{ url: "javascript:alert(document.cookie)", name: "invoice.pdf" }];

    expect(postAttachmentsSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a list where only one entry is hostile", () => {
    const payload = [
      { url: "https://utfs.io/f/ok.png", name: "ok", type: "image" },
      { url: "javascript:alert(1)", name: "bad" },
    ];

    // All or nothing: a partial accept would still render the hostile one.
    expect(postAttachmentsSchema.safeParse(payload).success).toBe(false);
  });

  it("accepts a well-formed upload", () => {
    const payload = [{ url: "https://utfs.io/f/abc.png", name: "diagram.png", type: "image" }];

    const parsed = postAttachmentsSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data[0].url).toBe("https://utfs.io/f/abc.png");
  });

  it("rejects a non-array", () => {
    expect(postAttachmentsSchema.safeParse({ url: "https://utfs.io/f/a.png" }).success).toBe(false);
  });

  it("bounds the list length", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ url: `https://utfs.io/f/${i}.png` }));
    expect(postAttachmentsSchema.safeParse(many).success).toBe(false);
  });
});

describe("attachmentUrlListSchema (direct messages)", () => {
  it("rejects a javascript: attachment", () => {
    expect(attachmentUrlListSchema.safeParse(["javascript:alert(1)"]).success).toBe(false);
  });

  it("rejects a data: attachment", () => {
    expect(attachmentUrlListSchema.safeParse(["data:text/html,<script>"]).success).toBe(false);
  });

  it("accepts https attachments", () => {
    expect(attachmentUrlListSchema.safeParse(["https://utfs.io/f/a.png"]).success).toBe(true);
  });
});

describe("every write path validates, and every renderer filters", () => {
  function code(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  }

  function read(relativePath: string): string {
    return code(fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8"));
  }

  it("createPost no longer writes an unvalidated cast", () => {
    const source = read("app/actions/posts.ts");

    expect(source).toContain("postAttachmentsSchema.safeParse");
    // The cast that let anything through.
    expect(source).not.toContain("parsedAttachments as never");
  });

  it("sendMessage bounds attachments to safe URLs", () => {
    const source = read("app/actions/messages.ts");

    expect(source).toContain("attachmentUrlListSchema");
    expect(source).not.toContain("z.array(z.string().max(2000)).max(20)");
  });

  it("sendChannelMessage no longer accepts z.unknown() attachments", () => {
    const source = read("app/actions/channels.ts");

    expect(source).toContain("postAttachmentsSchema");
    expect(source).not.toContain("z.unknown().optional()");
  });

  it("both href renderers filter before rendering", () => {
    // Rows predating validation are still in the database, so the schema alone
    // is not enough.
    for (const file of [
      "components/community/PremiumPostCard.tsx",
      "components/messages/MessageBubble.tsx",
    ]) {
      expect(read(file)).toContain("isSafeAttachmentUrl");
    }
  });
});
