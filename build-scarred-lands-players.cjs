/**
 * Re-runnable: build the player-safe, sharded data for scarred-lands/players.html
 * from the full GM CSVs in scarred-lands/data/.
 *
 *  - drops GM-only columns:  NPCs -> Tactics_Note, Connections ;  groups -> Current_Purpose
 *  - shards NPCs by Region into data-players/npcs-<slug>.csv (+ _GR)
 *  - builds data-players/index.csv (+ _GR): 13 light columns, every NPC
 *  - copies groups (stripped) + settlements whole
 *  - every output stays caret-delimited (^), UTF-8 with BOM, CRLF
 *
 * Line-based on "^": safe because the campaign CSV invariant guarantees no field
 * contains a caret or a newline (verified: row count == line count).
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const IN = path.join(ROOT, "scarred-lands", "data");
const OUT = path.join(ROOT, "scarred-lands", "data-players");
fs.mkdirSync(OUT, { recursive: true });

const BOM = "﻿";
const readLines = (p) => {
  let t = fs.readFileSync(p, "utf8");
  if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);
  return t.split(/\r?\n/).filter((l) => l.length > 0);
};
const writeCsv = (p, headerLine, rowLines) => {
  fs.writeFileSync(p, BOM + [headerLine, ...rowLines].join("\r\n") + "\r\n", "utf8");
  return fs.statSync(p).size;
};
const kb = (n) => (n / 1024).toFixed(0) + " KB";
const slug = (s) =>
  s.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// EN & GR NPC files are column-position-identical (only headers 1,2,8,11,12,15-24
// are renamed in Greek). So we operate by INDEX and write CANONICAL ENGLISH headers
// on both, keeping Greek values — players.html then reads one fixed schema.
const NPC_HEADER_EN = ["ID","Name","Gender","Ancestry","Class","Subclass","Level","CR","Role","Faction","Region","Settlement","Disposition","AC","HP","Main_Attack","Attack_Bonus","Damage","Key_Spells","Constellation","Notable_Items","First_Met","Speech_Quirks","Tactics_Note","Connections"];
const REGION_AT = 10;
const DROP_IDX = new Set([23, 24]);              // Tactics_Note, Connections (GM-only)
const KEEP_FULL = NPC_HEADER_EN.map((_, i) => i).filter((i) => !DROP_IDX.has(i)); // 0..22
const KEEP_INDEX = [0,1,2,3,4,5,6,7,8,9,10,11,12]; // ID..Disposition

function processNpcFile(inName, suffix) {
  const lines = readLines(path.join(IN, inName));
  const src = lines[0].split("^");
  if (src.length !== NPC_HEADER_EN.length)
    throw new Error(`${inName}: expected ${NPC_HEADER_EN.length} columns, found ${src.length} — schema changed; update NPC_HEADER_EN / DROP_IDX before re-running.`);
  // The English export must match the canonical schema by name; we slice GM columns by INDEX,
  // so a silent column reorder/rename would leak or mislabel data. Fail loud instead. (The Greek
  // file renames headers, so only positions can be checked there — the length check above covers it.)
  if (suffix === "") {
    const mismatch = NPC_HEADER_EN.findIndex((name, i) => src[i] !== name);
    if (mismatch >= 0)
      throw new Error(`${inName}: column ${mismatch} is "${src[mismatch]}", expected "${NPC_HEADER_EN[mismatch]}" — schema changed; update NPC_HEADER_EN / DROP_IDX (Tactics_Note, Connections) before re-running.`);
  }
  const regionAt = REGION_AT;
  const keepFull = KEEP_FULL;
  const keepIndex = KEEP_INDEX;

  const fullHeader = keepFull.map((i) => NPC_HEADER_EN[i]).join("^");
  const indexHeader = keepIndex.map((i) => NPC_HEADER_EN[i]).join("^");

  const shards = new Map(); // slug -> {region, rows[]}
  const indexRows = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = lines[li].split("^");
    const region = cells[regionAt] || "Unknown";
    const sl = slug(region);
    if (!shards.has(sl)) shards.set(sl, { region, rows: [] });
    shards.get(sl).rows.push(keepFull.map((i) => cells[i] ?? "").join("^"));
    indexRows.push(keepIndex.map((i) => cells[i] ?? "").join("^"));
  }

  const indexSize = writeCsv(path.join(OUT, `index${suffix}.csv`), indexHeader, indexRows);
  const shardInfo = [];
  for (const [sl, { region, rows }] of [...shards].sort((a, b) => a[0].localeCompare(b[0]))) {
    const size = writeCsv(path.join(OUT, `npcs-${sl}${suffix}.csv`), fullHeader, rows);
    shardInfo.push({ region, sl, rows: rows.length, size });
  }
  return { total: indexRows.length, indexSize, shardInfo };
}

function processGroups() {
  const lines = readLines(path.join(IN, "scarred_lands_groups.csv"));
  const header = lines[0].split("^");
  const keep = header.map((_, i) => i).filter((i) => header[i] !== "Current_Purpose");
  const out = writeCsv(
    path.join(OUT, "groups.csv"),
    keep.map((i) => header[i]).join("^"),
    lines.slice(1).map((l) => { const c = l.split("^"); return keep.map((i) => c[i] ?? "").join("^"); })
  );
  return { rows: lines.length - 1, size: out };
}

function copySettlements() {
  const lines = readLines(path.join(IN, "scarred_lands_settlements.csv"));
  const size = writeCsv(path.join(OUT, "settlements.csv"), lines[0], lines.slice(1));
  return { rows: lines.length - 1, size };
}

console.log("NPCs — English:");
const en = processNpcFile("scarred_lands_npcs_v2.csv", "");
console.log(`  index.csv: ${en.total} rows, ${kb(en.indexSize)}${en.indexSize > 1.5 * 1024 * 1024 ? "  <-- OVER 1.5MB" : "  (ok)"}`);
en.shardInfo.forEach((s) => console.log(`  npcs-${s.sl}.csv: ${s.rows} rows, ${kb(s.size)}  [${s.region}]`));

console.log("NPCs — Greek:");
const gr = processNpcFile("scarred_lands_npcs_v2_GR.csv", "_GR");
console.log(`  index_GR.csv: ${gr.total} rows, ${kb(gr.indexSize)}${gr.indexSize > 1.5 * 1024 * 1024 ? "  <-- OVER 1.5MB" : "  (ok)"}`);
gr.shardInfo.forEach((s) => console.log(`  npcs-${s.sl}_GR.csv: ${s.rows} rows, ${kb(s.size)}`));

const g = processGroups();
console.log(`Groups (Current_Purpose stripped): ${g.rows} rows, ${kb(g.size)}`);
const s = copySettlements();
console.log(`Settlements (whole): ${s.rows} rows, ${kb(s.size)}`);

const slugsEN = en.shardInfo.map((x) => x.sl);
console.log("\nRegion slugs (share these with the simulator position hook):");
console.log("  " + en.shardInfo.map((x) => `${x.region} => ${x.sl}`).join("\n  "));
