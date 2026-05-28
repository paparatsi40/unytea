const fs = require("fs");
const text = fs.readFileSync(__dirname + "/lint-output.txt", "utf8");
const lines = text.split(/\r?\n/);

const issues = [];
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
    issues.push({
      file: currentFile,
      severity: issueM[3],
      message: issueM[4],
      rule: issueM[5],
    });
  }
}

console.log("Total parsed:", issues.length);
const warnings = issues.filter((i) => i.severity === "warning");
const errors = issues.filter((i) => i.severity === "error");
console.log("  errors:", errors.length);
console.log("  warnings:", warnings.length);

const byRule = {};
for (const w of warnings) {
  byRule[w.rule] = (byRule[w.rule] || 0) + 1;
}

console.log("\n=== Warning distribution by rule ===");
const sorted = Object.entries(byRule).sort((a, b) => b[1] - a[1]);
for (const [rule, count] of sorted) {
  console.log(count.toString().padStart(4) + " | " + rule);
}

// Also map "Error:" prefix warnings (React Compiler) to file count
console.log("\n=== React Compiler rules (by message reason, since rule name format differs) ===");
const compilerMessages = {};
for (const w of warnings) {
  if (w.message.startsWith("Error: ")) {
    const reason = w.message.substring(7); // strip "Error: "
    compilerMessages[reason] = (compilerMessages[reason] || 0) + 1;
  }
}
const sortedMsg = Object.entries(compilerMessages).sort((a, b) => b[1] - a[1]);
for (const [msg, count] of sortedMsg) {
  console.log(count.toString().padStart(4) + " | " + msg);
}
