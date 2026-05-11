# Lisan ul Arab API

Arabic dictionary API built from a large JSON dataset.

## Features

- Arabic normalization
- Root search
- Full text search
- SQLite optimized
- REST API
- Ready for GitHub + Railway/Render deploy

## Install

```bash
npm install
```

## Add Dataset

Put your JSON file as:

```txt
data/lisanularab.json
```

## Build Database

```bash
npm run build-db
```

## Run

```bash
npm start
```

## Endpoints

### Search

```txt
GET /api/search?q=علم
```

### Word

```txt
GET /api/word/أبد
```

### ID

```txt
GET /api/id/9416
```

### Random

```txt
GET /api/random
```

## Deploy

Works on:
- Railway
- Render
- VPS
- Docker