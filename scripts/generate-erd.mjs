// Writes docs/erd.md (a Mermaid entity-relationship diagram) from prisma/schema.prisma,
// so the diagram can never drift from the real tables.   npm run docs:erd
import { readFileSync, writeFileSync } from "node:fs";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const models = [...schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)].map(([, name, body]) => ({
  name,
  lines: body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@")),
}));
const names = new Set(models.map((m) => m.name));

const mermaidType = (t) => t.replace(/[?\[\]]/g, "").replace(/\W/g, "_");

let out = "erDiagram\n";
const rels = [];
for (const m of models) {
  out += `  ${m.name} {\n`;
  for (const line of m.lines) {
    const [field, rawType, ...rest] = line.split(/\s+/);
    const base = rawType.replace(/[?\[\]]/g, "");
    if (names.has(base)) {
      // a relation field: only the side holding the foreign key (it has @relation(fields: ...)) draws the line
      if (line.includes("fields:"))
        rels.push(`  ${base} ||--${rawType.endsWith("?") ? "o|" : "o{"} ${m.name} : "${field}"`);
      continue;
    }
    const keys = [
      rest.join(" ").includes("@id") ? "PK" : "",
      rest.join(" ").includes("@unique") ? "UK" : "",
    ]
      .filter(Boolean)
      .join(",");
    out += `    ${mermaidType(rawType)} ${field}${keys ? ` ${keys}` : ""}\n`;
  }
  out += "  }\n";
}
out += [...new Set(rels)].join("\n") + "\n";

writeFileSync(
  new URL("../docs/erd.md", import.meta.url),
  `# Entity relationship diagram\n\nGenerated from \`prisma/schema.prisma\` by \`npm run docs:erd\`. Do not edit by hand.\n\n\`\`\`mermaid\n${out}\`\`\`\n`,
);
console.log(`docs/erd.md: ${models.length} tables, ${new Set(rels).size} relations`);
