const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const Database = require("better-sqlite3");

const app = express();
const db = new Database("./database/lisan.db");

app.use(cors());
app.use(morgan("dev"));

function normalizeArabic(text = "") {
  return text
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .trim();
}

app.get("/", (req, res) => {
  res.json({
    name: "Lisan ul Arab API",
    endpoints: [
      "/api/search?q=علم",
      "/api/word/كتب",
      "/api/id/9416",
      "/api/random"
    ]
  });
});

app.get("/api/search", (req, res) => {
  const q = req.query.q;

  if (!q) {
    return res.status(400).json({ error: "Missing q parameter" });
  }

  const normalized = normalizeArabic(q);

  const stmt = db.prepare(`
    SELECT *
    FROM entries
    WHERE normalized_word LIKE ?
    LIMIT 50
  `);

  const rows = stmt.all(`%${normalized}%`);

  res.json({
    query: q,
    count: rows.length,
    results: rows
  });
});

app.get("/api/word/:word", (req, res) => {
  const word = req.params.word;
  const normalized = normalizeArabic(word);

  const stmt = db.prepare(`
    SELECT *
    FROM entries
    WHERE normalized_word = ?
  `);

  const rows = stmt.all(normalized);

  res.json({
    word,
    count: rows.length,
    results: rows
  });
});

app.get("/api/id/:id", (req, res) => {
  const stmt = db.prepare(`
    SELECT *
    FROM entries
    WHERE id = ?
  `);

  const row = stmt.get(req.params.id);

  if (!row) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json(row);
});

app.get("/api/random", (req, res) => {
  const stmt = db.prepare(`
    SELECT *
    FROM entries
    ORDER BY RANDOM()
    LIMIT 1
  `);

  const row = stmt.get();

  res.json(row);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});