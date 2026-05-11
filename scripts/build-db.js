const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const jsonPath = path.join(__dirname, "..", "data", "lisanularab.json");

if (!fs.existsSync(jsonPath)) {
  console.log("Missing data/lisanularab.json");
  process.exit(1);
}

const raw = fs.readFileSync(jsonPath, "utf8");
const data = JSON.parse(raw);

const dbPath = path.join(__dirname, "..", "database", "lisan.db");

fs.mkdirSync(path.join(__dirname, "..", "database"), { recursive: true });

const db = new Database(dbPath);

function normalizeArabic(text = "") {
  return text
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .trim();
}

db.exec(`
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY,
  word TEXT,
  normalized_word TEXT,
  meanings TEXT
);
`);

db.exec("DELETE FROM entries");

const insert = db.prepare(`
INSERT INTO entries (
  id,
  word,
  normalized_word,
  meanings
)
VALUES (?, ?, ?, ?)
`);

const transaction = db.transaction((rows) => {
  for (const row of rows) {
    insert.run(
      row.id,
      row.word,
      normalizeArabic(row.word),
      row.meanings
    );
  }
});

transaction(data);

db.exec(`
CREATE INDEX IF NOT EXISTS idx_normalized_word
ON entries(normalized_word);
`);

console.log("Database built successfully.");