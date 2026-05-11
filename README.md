# Lisan ul Arab API

Public Arabic Dictionary API built from the famous Lisan ul Arab lexicon.

## Features

* Arabic word search
* Root-based lookup
* Arabic normalization
* SQLite optimized
* Fast API responses
* REST API
* Open source

---

# Installation

```bash
npm install
```

---

# Add Dataset

Place your JSON file here:

```txt
data/lisanularab.json
```

---

# Build Database

```bash
npm run build-db
```

---

# Start API

```bash
npm start
```

---

# API Endpoints

## Search

```http
GET /api/search?q=علم
```

Example:

```json
{
  "query": "علم",
  "count": 1,
  "results": []
}
```

---

## Exact Word

```http
GET /api/word/كتب
```

---

## Entry by ID

```http
GET /api/id/9416
```

---

## Random Entry

```http
GET /api/random
```

---

# Arabic Normalization

The API automatically normalizes:

* أ إ آ → ا
* ى → ي
* ة → ه
* Harakat removed

This improves Arabic search quality.

---

# Deploy

Works perfectly with:

* Railway
* Render
* VPS
* Docker

---

# License

MIT
