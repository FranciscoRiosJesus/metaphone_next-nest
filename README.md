# Athlete Dedup Manager

Full-stack application for managing athletes with **robust deduplication** using Double Metaphone, Jaro-Winkler similarity, and normalized exact matching.

## Architecture

```
metaphone-test/
├── shared/       # Deduplication library (Double Metaphone, normalization, Jaro-Winkler)
├── backend/      # NestJS + Prisma + PostgreSQL
└── frontend/     # Next.js 14 (App Router) + Tailwind CSS
```

## Deduplication Strategy

Multi-layer approach:

| Layer | Method | Action |
|-------|--------|--------|
| 1 | **Exact normalized match** (lowercase, no accents, collapsed spaces) | BLOCK |
| 2 | **Double Metaphone** phonetic match on both first AND last name | BLOCK |
| 3 | **Jaro-Winkler** similarity ≥ 0.92 on both names | WARN / BLOCK |
| 4 | **Partial phonetic + similarity** (one phonetic + other ≥ 0.85) | WARN |
| 5 | **Same parent email** amplifies confidence on any match | Boost |
| DB | **Unique constraint** on normalized first+last+email | BLOCK (race condition safety) |

### Examples detected as duplicates:
- Jon / John, Sara / Sarah, Luis / Luiz
- Smith / Smyth, Gonzalez / Gonzales
- Nicolás / Nicolas (accent stripping)
- De La Cruz / de la cruz (normalization)

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** running locally
- **npm** or **yarn**

## Setup

### 1. Database

```bash
# Create the database
createdb athlete_dedup

# Or via psql:
psql -c "CREATE DATABASE athlete_dedup;"
```

### 2. Shared Library

```bash
cd shared
npm install
npm test        # Run deduplication unit tests
```

### 3. Backend

```bash
cd backend
npm install

# Configure database URL (edit .env if needed)
# Default: postgresql://postgres:postgres@localhost:5432/athlete_dedup

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init

# Optional: seed sample data
npm run prisma:seed

# Start dev server (port 4000)
npm run start:dev

# Run tests
npm test
```

### 4. Frontend

```bash
cd frontend
npm install

# Start dev server (port 3000)
npm run dev

# Run tests
npm test
```

### 5. Access the app

Open http://localhost:3000

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/athletes` | List all athletes |
| POST | `/athletes` | Create athlete (with dedup check) |
| POST | `/athletes/check-duplicate` | Pre-check for duplicates |

## Testing

```bash
# Shared library tests (normalization, metaphone, deduplication)
cd shared && npm test

# Backend tests (service unit tests)
cd backend && npm test

# Frontend tests (component tests with Vitest + RTL)
cd frontend && npm test
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Lucide Icons, Vitest
- **Backend**: NestJS 10, Prisma 5, class-validator
- **Database**: PostgreSQL with normalized + metaphone derived columns
- **Shared**: Custom Double Metaphone, Jaro-Winkler, normalization utilities
# metaphone_next-nest
