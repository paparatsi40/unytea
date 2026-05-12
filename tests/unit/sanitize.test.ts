import { describe, it, expect } from "vitest";
import { sanitizeHTML } from "@/lib/sanitize";

describe("sanitizeHTML", () => {
  describe("Tiptap allowlist", () => {
    it("preserves paragraphs and inline formatting", () => {
      const input = "<p>Hello <strong>bold</strong> and <em>italic</em></p>";
      expect(sanitizeHTML(input)).toBe(input);
    });

    it("preserves headings", () => {
      const input = "<h1>Title</h1><h2>Subtitle</h2>";
      expect(sanitizeHTML(input)).toBe(input);
    });

    it("preserves lists", () => {
      const input = "<ul><li>One</li><li>Two</li></ul>";
      expect(sanitizeHTML(input)).toBe(input);
    });

    it("preserves blockquotes and code blocks", () => {
      const input = "<blockquote>Quote</blockquote><pre><code>code</code></pre>";
      expect(sanitizeHTML(input)).toBe(input);
    });
  });

  describe("XSS prevention", () => {
    it("strips script tags", () => {
      const input = "<p>Hello</p><script>alert(1)</script>";
      expect(sanitizeHTML(input)).toBe("<p>Hello</p>");
    });

    it("strips event handlers", () => {
      const input = '<p onclick="alert(1)">Click me</p>';
      const output = sanitizeHTML(input);
      expect(output).toBe("<p>Click me</p>");
      expect(output).not.toContain("onclick");
    });

    it("blocks javascript: hrefs", () => {
      const input = '<a href="javascript:alert(1)">link</a>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain("javascript:");
    });

    it("blocks iframes", () => {
      const input = '<p>safe</p><iframe src="evil.com"></iframe>';
      expect(sanitizeHTML(input)).toBe("<p>safe</p>");
    });

    it("blocks data: URIs in href", () => {
      const input = '<a href="data:text/html,<script>alert(1)</script>">link</a>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain("data:text");
    });

    it("strips style attribute (potential CSS injection)", () => {
      const input = '<p style="background:url(javascript:alert(1))">x</p>';
      const output = sanitizeHTML(input);
      expect(output).not.toContain("style=");
    });

    it("strips unknown tags", () => {
      const input = "<custom-tag>x</custom-tag>";
      const output = sanitizeHTML(input);
      expect(output).not.toContain("custom-tag");
    });
  });

  describe("Safe links and images", () => {
    it("preserves https links", () => {
      const input = '<a href="https://example.com">link</a>';
      expect(sanitizeHTML(input)).toContain('href="https://example.com"');
    });

    it("preserves images with https sources", () => {
      const input = '<img src="https://example.com/photo.jpg" alt="photo">';
      const output = sanitizeHTML(input);
      expect(output).toContain('src="https://example.com/photo.jpg"');
      expect(output).toContain('alt="photo"');
    });

    it("preserves mailto links", () => {
      const input = '<a href="mailto:test@example.com">email</a>';
      expect(sanitizeHTML(input)).toContain("mailto:test@example.com");
    });
  });

  describe("Edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(sanitizeHTML("")).toBe("");
    });

    it("handles plain text without tags", () => {
      expect(sanitizeHTML("just plain text")).toBe("just plain text");
    });

    it("handles malformed HTML gracefully", () => {
      const input = "<p>unclosed <strong>tags";
      const output = sanitizeHTML(input);
      expect(output).toContain("unclosed");
      expect(output).toContain("tags");
    });
  });
});
