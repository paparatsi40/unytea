const fs = require("fs");
const text = fs.readFileSync(__dirname + "/lint-output.txt", "utf8");
const lines = text.split(/\r?\n/);

const errors = [];
let currentFile = null;
const fileLineRe = /^([A-Z]:\\.+\.[a-z]+)$/;
const issueLineRe = /^\s+(\d+):(\d+)\s+(error|warning)\s+(.+?)\s+(\S+)$/;

for (const line of lines) {
  const fileM = line.match(fileLineRe);
  if (fileM) {
    currentFile = fileM[1];
    continue;
  }
  const issueM = line.match(issueLineRe);
  if (issueM && currentFile) {
    errors.push({
      file: currentFile,
      line: +issueM[1],
      col: +issueM[2],
      severity: issueM[3],
      message: issueM[4],
      rule: issueM[5],
    });
  }
}

const errorOnly = errors.filter((e) => e.severity === "error");
console.log("Total errors parsed:", errorOnly.length);
console.log("Total warnings parsed:", errors.filter((e) => e.severity === "warning").length);

const byRule = {};
for (const e of errorOnly) {
  byRule[e.rule] = byRule[e.rule] || [];
  byRule[e.rule].push(e);
}

console.log("\n=== Errors by rule ===");
const sorted = Object.entries(byRule).sort((a, b) => b[1].length - a[1].length);
for (const [rule, items] of sorted) {
  const samples = Array.from(
    new Set(
      items.map(function (i) {
        const parts = i.file.split("\\");
        const last = parts.slice(-2).join("/");
        return last + ":" + i.line;
      })
    )
  ).slice(0, 2);
  console.log(items.length.toString().padStart(4) + " | " + rule);
  console.log("         samples: " + samples.join(", "));
}

// Files affected per rule (for risky)
console.log("\n=== Risky rules — all unique files ===");
const riskyRules = [
  "react-hooks/exhaustive-deps",
  "react-hooks/rules-of-hooks",
  "@typescript-eslint/no-explicit-any",
  "@typescript-eslint/ban-ts-comment",
];
for (const [rule, items] of sorted) {
  if (
    riskyRules.includes(rule) ||
    rule.toLowerCase().includes("react-hooks") ||
    rule.toLowerCase().includes("react-compiler")
  ) {
    const files = Array.from(new Set(items.map((i) => i.file)));
    console.log("\n" + rule + " (" + items.length + " issues across " + files.length + " files):");
    files.forEach((f) => console.log("  " + f.replace("C:\\unytea\\", "")));
  }
}
