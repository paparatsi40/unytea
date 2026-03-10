const fs = require("fs");

const content = fs.readFileSync("app/[locale]/page.tsx", "utf8");
const lines = content.split("\n");

console.log("File has " + lines.length + " lines");
console.log("First 10 lines:");
lines.slice(0, 10).forEach((l, i) => console.log((i+1) + ": " + l.substring(0, 80)));
