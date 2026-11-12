import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Règle projet : aucun tiret cadratin (U+2014), demi-cadratin (U+2013) ni
// tiret insécable (U+2011) dans le code de l'application. Ces caractères
// peuvent finir à l'écran dans un texte affiché, ce que le client refuse.
// Écrits en échappements pour que ce fichier ne contienne pas lui-même les
// caractères qu'il recherche.
const BANNED = /[\u2014\u2013\u2011]/;
const IGNORED = new Set(["routeTree.gen.ts"]);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !IGNORED.has(entry)) {
      out.push(full);
    }
  }
  return out;
}

function findBanned(file: string): string[] {
  const lines = readFileSync(file, "utf8").split("\n");
  const hits: string[] = [];
  lines.forEach((line, i) => {
    if (BANNED.test(line)) hits.push(`${file}:${i + 1}: ${line.trim()}`);
  });
  return hits;
}

describe("aucun tiret cadratin dans le code", () => {
  it("ne contient ni tiret cadratin, ni demi-cadratin, ni tiret insécable", () => {
    const files = sourceFiles(join(process.cwd(), "src")).filter(
      (f) => !f.endsWith("no-em-dash.test.ts"),
    );
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.flatMap(findBanned);
    expect(offenders).toEqual([]);
  });
});
