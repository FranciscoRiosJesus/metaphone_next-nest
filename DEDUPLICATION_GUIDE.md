# Deduplication with Double Metaphone — Complete Integration Guide

> A production-ready, step-by-step guide on how name deduplication works in this project and how to apply the same technique to any other project.

---

## Table of Contents

1. [Overview — What Problem Does This Solve?](#1-overview--what-problem-does-this-solve)
2. [The Three Algorithms Explained](#2-the-three-algorithms-explained)
   - 2.1 [Name Normalization](#21-name-normalization)
   - 2.2 [Double Metaphone (Phonetic Encoding)](#22-double-metaphone-phonetic-encoding)
   - 2.3 [Jaro-Winkler Similarity (Fuzzy Matching)](#23-jaro-winkler-similarity-fuzzy-matching)
3. [How the Multi-Layer Strategy Works Together](#3-how-the-multi-layer-strategy-works-together)
4. [Step-by-Step: Adding Deduplication to Your Own Project](#4-step-by-step-adding-deduplication-to-your-own-project)
   - 4.1 [Step 1 — Copy the Shared Library](#41-step-1--copy-the-shared-library)
   - 4.2 [Step 2 — Design Your Database Schema](#42-step-2--design-your-database-schema)
   - 4.3 [Step 3 — Store Derived Fields on Insert](#43-step-3--store-derived-fields-on-insert)
   - 4.4 [Step 4 — Query for Duplicates Before Insert](#44-step-4--query-for-duplicates-before-insert)
   - 4.5 [Step 5 — Add a Unique Constraint (Safety Net)](#45-step-5--add-a-unique-constraint-safety-net)
   - 4.6 [Step 6 — Add Frontend Pre-Check (Optional)](#46-step-6--add-frontend-pre-check-optional)
5. [API Reference — Shared Library Functions](#5-api-reference--shared-library-functions)
6. [Real-World Examples with Expected Output](#6-real-world-examples-with-expected-output)
7. [Tuning the Thresholds](#7-tuning-the-thresholds)
8. [FAQ and Edge Cases](#8-faq-and-edge-cases)

---

## 1. Overview — What Problem Does This Solve?

When users enter names manually, the **same person** can appear multiple times with slight variations:

| Entry A | Entry B | Why it's the same person |
|---------|---------|--------------------------|
| John Smith | john smith | Different casing |
| Nicolás García | Nicolas Garcia | Accents / diacritics |
| Jon Smith | John Smith | Phonetically identical |
| Sara Gonzalez | Sarah Gonzales | Spelling variation |
| De La Cruz | de la cruz | Whitespace and casing |
| Luiz Martinez | Luis Martinez | Phonetically similar |
| Smith | Smyth | Sound-alike surnames |

A simple `===` comparison catches **none** of these. You need three layers of defense:

```
Layer 1: Normalization     → catches casing, accents, whitespace
Layer 2: Phonetic encoding → catches sound-alike names (Jon/John, Sara/Sarah)
Layer 3: Fuzzy similarity  → catches close misspellings (Gonzalez/Gonzales)
```

This project implements all three layers with **zero external dependencies** — the algorithms are self-contained TypeScript.

---

## 2. The Three Algorithms Explained

### 2.1 Name Normalization

**File:** `shared/src/normalize.ts`

Normalization transforms any name into a canonical form so that superficial differences are removed **before** any comparison.

**Pipeline (in order):**

```
Input:  "  Nicolás  De La   Cruz  "
  ↓ Step 1: trim()
"Nicolás  De La   Cruz"
  ↓ Step 2: toLowerCase()
"nicolás  de la   cruz"
  ↓ Step 3: replace known chars (ñ → n)
"nicolás  de la   cruz"
  ↓ Step 4: NFD decomposition + strip combining marks (accents)
"nicolas  de la   cruz"
  ↓ Step 5: remove non-alphanumeric (keep spaces)
"nicolas  de la   cruz"
  ↓ Step 6: collapse multiple spaces → single space
"nicolas de la cruz"
```

**The code:**

```typescript
export function normalizeName(value: string): string {
  if (!value) return '';

  let result = value.trim().toLowerCase();

  // Replace known special characters before NFD
  for (const [char, replacement] of Object.entries(DIACRITICS_MAP)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }

  // NFD decomposition: separate base chars from combining diacritical marks
  result = result.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Remove anything that's not a letter, digit, or space
  result = result.replace(/[^a-z0-9 ]/g, '');

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}
```

**Key concept — NFD decomposition:**
Unicode represents `é` as either one codepoint (`U+00E9`) or two (`e` + `U+0301` combining acute accent). `.normalize('NFD')` always decomposes to the two-codepoint form, then we strip the combining marks with the regex `/[\u0300-\u036f]/g`. This turns `é → e`, `ü → u`, `ö → o`, etc.

**When to use:**
- Always normalize before storing or comparing
- Store the normalized version alongside the original in the database
- Use the normalized version for exact-match lookups

---

### 2.2 Double Metaphone (Phonetic Encoding)

**File:** `shared/src/double-metaphone.ts`

Double Metaphone is the core innovation. It converts a name into a **phonetic code** — a short string that represents how the name *sounds*, not how it's spelled.

#### What is Metaphone?

Metaphone algorithms reduce English words to phonetic codes based on pronunciation rules. For example:

```
"Smith"  → "SM0"    (TH → 0)
"Smyth"  → "SM0"    (TH → 0)
```

Both produce `SM0`, so they're recognized as the same name despite different spellings.

#### Why Double Metaphone (not single)?

The original Metaphone algorithm produces one code per word. **Double Metaphone** produces **two codes** — a primary and an alternate — because many names have multiple valid pronunciations depending on cultural origin:

```
doubleMetaphone("Giovanni")  → ["JFN", "AFNN"]
                                 ↑ Italian    ↑ Germanic
```

When comparing, we check if **any** code from one name matches **any** code from the other. This dramatically reduces false negatives.

#### How it works (simplified)

The algorithm walks through the input string character by character and applies pronunciation rules based on:

1. **The current character**
2. **Surrounding characters** (digraphs, trigraphs)
3. **Position in the word** (start, middle, end)
4. **Language origin detection** (Slavo-Germanic, Romance, etc.)

**Core rules (excerpt of the most important ones):**

| Input Pattern | Primary Code | Alternate Code | Explanation |
|---------------|-------------|----------------|-------------|
| `PH` | `F` | `F` | "ph" sounds like "f" |
| `GH` (after vowel) | `K` | `K` | "gh" as in "ghost" |
| `GH` (word start + I) | `J` | `J` | "gh" as in "Ghislaine" |
| `KN`, `GN`, `PN` (start) | skip first letter | | Silent first consonant |
| `WR` (start) | `R` | `R` | Silent W |
| `C` before `E,I,Y` | `S` | `S` | Soft C: "celery" |
| `C` elsewhere | `K` | `K` | Hard C: "cat" |
| `CH` | `X` or `K` | varies | Context-dependent |
| `TH` | `0` | `T` | "th" → theta sound or T |
| `SH` | `X` | `X` | "sh" sound |
| `SCH` | `SK` | `SK` | Germanic "sch" |
| `J` (start) | `J` | `A` | English J vs. Spanish J |
| `B` | `P` | `P` | B and P are both bilabial |
| `V` | `F` | `F` | V sounds close to F |
| `W` + vowel (start) | `A` | `F` | English W vs. Germanic W |
| `X` | `KS` | `KS` | X = K + S |
| `Z` | `S` | `S` or `TS` | English vs. Germanic Z |
| Vowels (not at start) | *skipped* | *skipped* | Only coded at position 0 |

**Critical detail:** Vowels are only encoded when they appear at the **start** of the word. Internal vowels are ignored. This is why "Jon" and "John" both produce `JN` — the `o` is skipped.

#### The function signature

```typescript
export function doubleMetaphone(input: string): [string, string]
```

- **Input:** A single word (already uppercased internally)
- **Output:** A tuple `[primary, alternate]`, each max 4 characters
- Both codes may be identical if there's only one pronunciation

#### Complete examples

```typescript
doubleMetaphone("John")      // → ["JN",   "AN"  ]
doubleMetaphone("Jon")       // → ["JN",   "AN"  ]
doubleMetaphone("Smith")     // → ["SM0",  "XMT" ]
doubleMetaphone("Smyth")     // → ["SM0",  "XMT" ]
doubleMetaphone("Sarah")     // → ["SR",   "SR"  ]
doubleMetaphone("Sara")      // → ["SR",   "SR"  ]
doubleMetaphone("Gonzalez")  // → ["KNSL", "KNSL"]
doubleMetaphone("Gonzales")  // → ["KNSL", "KNSL"]
doubleMetaphone("Philip")    // → ["FLP",  "FLP" ]
doubleMetaphone("Phillip")   // → ["FLP",  "FLP" ]
doubleMetaphone("Catherine") // → ["K0RN", "KTRN"]
doubleMetaphone("Katherine") // → ["K0RN", "KTRN"]
doubleMetaphone("Nicolas")   // → ["NKLS", "NKLS"]
doubleMetaphone("Nicholas")  // → ["NKLS", "NKLS"]
```

#### How phonetic matching works

Two names are a phonetic match if **any** of their codes overlap:

```typescript
function phoneticKeysMatch(a: [string, string], b: [string, string]): boolean {
  if (!a[0] || !b[0]) return false;
  if (a[0] === b[0]) return true;              // primary vs primary
  if (a[0] === b[1] && b[1] !== '') return true; // primary vs alternate
  if (a[1] === b[0] && a[1] !== '') return true; // alternate vs primary
  if (a[1] !== '' && b[1] !== '' && a[1] === b[1]) return true; // alt vs alt
  return false;
}
```

For full duplicate detection, we require that **both** first name AND last name have phonetic matches. This prevents false positives where unrelated people share a common first name.

---

### 2.3 Jaro-Winkler Similarity (Fuzzy Matching)

**File:** `shared/src/jaro-winkler.ts`

Jaro-Winkler computes a score between `0.0` (completely different) and `1.0` (identical) that measures how similar two strings are, with a bonus for common prefixes.

#### The algorithm in two parts

**Part 1 — Jaro Similarity:**

The Jaro similarity between strings `s1` and `s2` is:

```
jaro = (1/3) × (matches/|s1| + matches/|s2| + (matches - transpositions/2)/matches)
```

Where:
- **matches** = characters that appear in both strings within a "match window" of `floor(max(|s1|, |s2|) / 2) - 1`
- **transpositions** = matched characters that appear in different order

**Part 2 — Winkler's prefix bonus:**

```
jaroWinkler = jaro + (prefixLength × 0.1 × (1 - jaro))
```

Where `prefixLength` is the length of the common prefix (max 4). This gives extra weight to strings that start the same way — useful for names like "Gonzalez" vs "Gonzales" which share a long prefix.

#### Examples with scores

```
jaroWinklerSimilarity("gonzalez", "gonzales")  → 0.95   (very high)
jaroWinklerSimilarity("smith", "smyth")         → 0.88   (high)
jaroWinklerSimilarity("jon", "john")            → 0.93   (high)
jaroWinklerSimilarity("john", "james")          → 0.47   (low — not similar)
jaroWinklerSimilarity("john", "maria")          → < 0.5  (very low)
```

#### Threshold choices in this project

| Threshold | Value | Used for |
|-----------|-------|----------|
| `JARO_WINKLER_THRESHOLD` | `0.92` | Both names must exceed this for a "similar" match |
| `JARO_WINKLER_HIGH_THRESHOLD` | `0.85` | One name phonetic + other name exceeds this = partial match |

---

## 3. How the Multi-Layer Strategy Works Together

The deduplication check runs through **5 layers** in priority order. The first match wins:

```
┌─────────────────────────────────────────────────────────────────┐
│  INPUT: new athlete (firstName, lastName, parentEmail)          │
│                                                                 │
│  Step 1: Normalize all fields                                   │
│          firstName → normalizedFirstName                        │
│          lastName  → normalizedLastName                         │
│          email     → normalizedParentEmail                      │
│                                                                 │
│  Step 2: Compare against ALL existing athletes in DB            │
│                                                                 │
│  For each existing athlete:                                     │
│                                                                 │
│  ┌── Layer 1: EXACT MATCH ────────────────────────────────────┐ │
│  │  normalized first+last names are identical                 │ │
│  │  → confidence = 1.0, level = "exact", action = BLOCK      │ │
│  └────────────────────────────────────────────────────────────┘ │
│           ↓ no match                                            │
│  ┌── Layer 2: PHONETIC MATCH ─────────────────────────────────┐ │
│  │  Double Metaphone codes match for BOTH first AND last      │ │
│  │  → confidence = 0.90, level = "phonetic", action = BLOCK   │ │
│  └────────────────────────────────────────────────────────────┘ │
│           ↓ no match                                            │
│  ┌── Layer 3: SIMILARITY MATCH ───────────────────────────────┐ │
│  │  Jaro-Winkler ≥ 0.92 for BOTH first AND last              │ │
│  │  → confidence = ~0.80, level = "similar", action = WARN    │ │
│  └────────────────────────────────────────────────────────────┘ │
│           ↓ no match                                            │
│  ┌── Layer 4: PARTIAL MATCH ──────────────────────────────────┐ │
│  │  ONE name phonetic match + OTHER name similarity ≥ 0.85   │ │
│  │  → confidence = 0.70, level = "similar", action = WARN     │ │
│  └────────────────────────────────────────────────────────────┘ │
│           ↓ no match                                            │
│  ┌── Layer 5: EMAIL BOOST ────────────────────────────────────┐ │
│  │  Same email + BOTH names similarity ≥ 0.85                 │ │
│  │  → confidence = ~0.70, level = "similar", action = WARN    │ │
│  └────────────────────────────────────────────────────────────┘ │
│           ↓ no match                                            │
│  Result: NOT A DUPLICATE → allow insert                         │
│                                                                 │
│  Email match at any layer: confidence += 0.05–0.10 bonus       │
│                                                                 │
│  DATABASE LAYER (safety net):                                   │
│  Unique constraint on (normalizedFirst, normalizedLast, email)  │
│  → catches race conditions where two requests pass the check    │
│    simultaneously                                               │
└─────────────────────────────────────────────────────────────────┘
```

**Why multiple layers?**
- Layer 1 alone misses "Jon" vs "John"
- Layer 2 alone misses "Gonzalez" vs "Gonzales" (same phonetic code but wouldn't catch slight typos in different-sounding names)
- Layer 3 alone would have too many false positives for short names
- Combined, they cover a much wider range of real-world duplicates

---

## 4. Step-by-Step: Adding Deduplication to Your Own Project

### 4.1 Step 1 — Copy the Shared Library

The entire deduplication logic lives in 4 files with **zero dependencies**:

```
shared/src/
├── normalize.ts         (44 lines)   — name/email normalization
├── double-metaphone.ts  (825 lines)  — phonetic encoding
├── jaro-winkler.ts      (72 lines)   — fuzzy string similarity
├── deduplication.ts     (235 lines)  — the orchestrator that combines all three
└── index.ts             (12 lines)   — public exports
```

**To integrate into your project:**

```bash
# Option A: Copy the files directly
cp -r shared/src/ your-project/src/lib/deduplication/

# Option B: If you have a monorepo, keep it as a shared package
# and reference it in your tsconfig paths
```

No `npm install` needed — these files have zero external dependencies.

### 4.2 Step 2 — Design Your Database Schema

For every field you want to deduplicate against, store three versions:

```
Original field    → what the user typed (display purposes)
Normalized field  → lowercase, no accents, collapsed spaces (exact matching)
Metaphone field   → phonetic code (phonetic matching)
```

**Example Prisma schema:**

```prisma
model Person {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())

  // Original values (as entered by user)
  firstName   String
  lastName    String
  email       String

  // Derived: normalized (for exact matching)
  normalizedFirstName  String
  normalizedLastName   String
  normalizedEmail      String

  // Derived: phonetic (for sound-alike matching)
  metaphoneFirstName   String   // primary code from doubleMetaphone()
  metaphoneLastName    String   // primary code from doubleMetaphone()

  // Unique constraint on normalized values (race condition safety net)
  @@unique([normalizedFirstName, normalizedLastName, normalizedEmail])

  // Indexes for fast lookups
  @@index([normalizedFirstName, normalizedLastName])
  @@index([metaphoneFirstName, metaphoneLastName])
}
```

**SQL equivalent (if not using Prisma):**

```sql
CREATE TABLE persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Original
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,

  -- Normalized
  normalized_first_name TEXT NOT NULL,
  normalized_last_name TEXT NOT NULL,
  normalized_email TEXT NOT NULL,

  -- Phonetic
  metaphone_first_name TEXT NOT NULL,
  metaphone_last_name TEXT NOT NULL,

  -- Safety net
  UNIQUE (normalized_first_name, normalized_last_name, normalized_email)
);

CREATE INDEX idx_persons_normalized ON persons (normalized_first_name, normalized_last_name);
CREATE INDEX idx_persons_metaphone ON persons (metaphone_first_name, metaphone_last_name);
```

**Why store derived fields?**
- You compute normalization and metaphone once at insert time
- Queries use indexed columns instead of computing on-the-fly
- `WHERE normalized_first_name = 'john'` is an instant index lookup
- `WHERE metaphone_first_name = 'JN'` finds all phonetically similar names fast

### 4.3 Step 3 — Store Derived Fields on Insert

Before saving any record, compute and store the derived fields:

```typescript
import {
  normalizeName,
  normalizeEmail,
  getPhoneticKeys,
} from './lib/deduplication';

function preparePersonForInsert(input: {
  firstName: string;
  lastName: string;
  email: string;
}) {
  const normalizedFirstName = normalizeName(input.firstName);
  const normalizedLastName = normalizeName(input.lastName);
  const normalizedEmail = normalizeEmail(input.email);

  // getPhoneticKeys returns [primary, alternate] — we store the primary
  const [metaphoneFirstName] = getPhoneticKeys(input.firstName);
  const [metaphoneLastName] = getPhoneticKeys(input.lastName);

  return {
    // Original
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    // Derived
    normalizedFirstName,
    normalizedLastName,
    normalizedEmail,
    metaphoneFirstName,
    metaphoneLastName,
  };
}
```

### 4.4 Step 4 — Query for Duplicates Before Insert

This is where the magic happens. Before inserting a new record, query the database for potential matches:

```typescript
import { arePotentialDuplicates } from './lib/deduplication';

async function checkForDuplicates(
  newPerson: { firstName: string; lastName: string; email?: string },
  db: YourDatabaseClient,
) {
  // Pre-compute derived fields for the new person
  const normalizedFirst = normalizeName(newPerson.firstName);
  const normalizedLast = normalizeName(newPerson.lastName);
  const [metaphoneFirst] = getPhoneticKeys(newPerson.firstName);
  const [metaphoneLast] = getPhoneticKeys(newPerson.lastName);

  // Step A: Query candidates from DB (fast indexed lookups)
  // We cast a wide net: get anyone with matching normalized OR metaphone names
  const candidates = await db.person.findMany({
    where: {
      OR: [
        // Exact normalized match
        {
          normalizedFirstName: normalizedFirst,
          normalizedLastName: normalizedLast,
        },
        // Phonetic match (either first or last)
        {
          metaphoneFirstName: metaphoneFirst,
          metaphoneLastName: metaphoneLast,
        },
        // Same metaphone first name (for partial matches)
        { metaphoneFirstName: metaphoneFirst },
        // Same metaphone last name (for partial matches)
        { metaphoneLastName: metaphoneLast },
      ],
    },
  });

  // Step B: Run the full multi-layer check on each candidate
  for (const existing of candidates) {
    const result = arePotentialDuplicates(newPerson, {
      firstName: existing.firstName,
      lastName: existing.lastName,
      parentEmail: existing.email,
    });

    if (result.isDuplicate) {
      return {
        isDuplicate: true,
        level: result.level,       // 'exact' | 'phonetic' | 'similar'
        confidence: result.confidence,
        details: result.details,
        matchedPerson: existing,
      };
    }
  }

  return { isDuplicate: false };
}
```

**Key insight:** The database query (Step A) is a **coarse filter** that uses indexed columns to quickly narrow down candidates. The `arePotentialDuplicates` function (Step B) is the **fine-grained check** that applies all three algorithms on the small candidate set. This keeps performance high even with millions of records.

### 4.5 Step 5 — Add a Unique Constraint (Safety Net)

Even with the application-level check, two concurrent requests could both pass the check simultaneously. The database unique constraint catches this:

```typescript
try {
  const person = await db.person.create({ data: preparedData });
  return { success: true, person };
} catch (error) {
  // Prisma unique constraint violation
  if (error.code === 'P2002') {
    return {
      success: false,
      error: 'A person with this exact name and email already exists',
    };
  }
  throw error;
}
```

### 4.6 Step 6 — Add Frontend Pre-Check (Optional)

For the best user experience, check for duplicates **before** the user submits the form:

```typescript
// Call this on blur of the name fields
async function onNameBlur(firstName: string, lastName: string) {
  if (!firstName.trim() || !lastName.trim()) return;

  const response = await fetch('/api/persons/check-duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firstName, lastName }),
  });

  const result = await response.json();

  if (result.isDuplicate) {
    if (result.level === 'exact' || result.level === 'phonetic') {
      showBlockingWarning(result); // Prevent submission
    } else {
      showSoftWarning(result);    // Allow submission with confirmation
    }
  }
}
```

---

## 5. API Reference — Shared Library Functions

### `normalizeName(value: string): string`

Normalizes a name for exact comparison. Handles casing, accents, whitespace.

```typescript
normalizeName("  Nicolás  De La   Cruz  ")  // → "nicolas de la cruz"
normalizeName("JOHN")                        // → "john"
normalizeName("Ñoño")                        // → "nono"
```

### `normalizeEmail(value: string): string`

Normalizes an email (trim + lowercase).

```typescript
normalizeEmail("  User@Example.COM ")  // → "user@example.com"
```

### `doubleMetaphone(input: string): [string, string]`

Returns `[primary, alternate]` phonetic codes (max 4 chars each).

```typescript
doubleMetaphone("John")     // → ["JN",   "AN"  ]
doubleMetaphone("Smith")    // → ["SM0",  "XMT" ]
doubleMetaphone("Gonzalez") // → ["KNSL", "KNSL"]
```

### `getPhoneticKeys(value: string): [string, string]`

Convenience wrapper: normalizes the input, then runs Double Metaphone.

```typescript
getPhoneticKeys("  JOHN  ")  // → ["JN", "AN"]  (normalizes first)
```

### `jaroWinklerSimilarity(s1: string, s2: string): number`

Returns similarity score between `0.0` and `1.0`.

```typescript
jaroWinklerSimilarity("gonzalez", "gonzales")  // → 0.95
jaroWinklerSimilarity("john", "james")          // → 0.47
```

### `arePotentialDuplicates(a: AthleteInput, b: AthleteInput): DuplicateCheckResult`

The main entry point. Compares two persons using all three algorithms in priority order.

```typescript
const result = arePotentialDuplicates(
  { firstName: "Jon", lastName: "Smith" },
  { firstName: "John", lastName: "Smith" }
);
// → {
//   isDuplicate: true,
//   level: "phonetic",
//   confidence: 0.90,
//   emailMatch: false,
//   details: 'Phonetic match: "Jon" ≈ "John" [JN], "Smith" ≈ "Smith" [SM0]'
// }
```

**Return type:**

```typescript
interface DuplicateCheckResult {
  isDuplicate: boolean;
  level: 'exact' | 'phonetic' | 'similar' | 'none';
  confidence: number;   // 0.0 – 1.0
  emailMatch: boolean;
  details: string;      // human-readable explanation
}
```

---

## 6. Real-World Examples with Expected Output

### Example 1: Exact match after normalization

```
Input A:  "JOHN SMITH" (john.smith@gmail.com)
Input B:  "john smith" (john.smith@gmail.com)

Normalized A: "john" "smith"
Normalized B: "john" "smith"

→ Layer 1 HIT: exact match
→ Result: { isDuplicate: true, level: "exact", confidence: 1.0 }
```

### Example 2: Phonetic match (Jon vs John)

```
Input A:  "Jon Smith"
Input B:  "John Smith"

Normalized A: "jon" "smith"
Normalized B: "john" "smith"

Layer 1: "jon" ≠ "john" → MISS

Metaphone A: firstName=["JN","AN"], lastName=["SM0","XMT"]
Metaphone B: firstName=["JN","AN"], lastName=["SM0","XMT"]

firstName codes: "JN" === "JN" ✓
lastName codes:  "SM0" === "SM0" ✓

→ Layer 2 HIT: phonetic match
→ Result: { isDuplicate: true, level: "phonetic", confidence: 0.90 }
```

### Example 3: Similarity match (Gonzalez vs Gonzales)

```
Input A:  "Maria Gonzalez"
Input B:  "Maria Gonzales"

Normalized A: "maria" "gonzalez"
Normalized B: "maria" "gonzales"

Layer 1: "gonzalez" ≠ "gonzales" → MISS

Metaphone A: firstName=["MR","MR"], lastName=["KNSL","KNSL"]
Metaphone B: firstName=["MR","MR"], lastName=["KNSL","KNSL"]

firstName: "MR" === "MR" ✓
lastName:  "KNSL" === "KNSL" ✓

→ Layer 2 HIT: phonetic match
→ Result: { isDuplicate: true, level: "phonetic", confidence: 0.90 }
```

### Example 4: Different people, same first name

```
Input A:  "John Smith"
Input B:  "John Rodriguez"

Layer 1: "smith" ≠ "rodriguez" → MISS
Layer 2: lastName metaphone "SM0" ≠ "RTRS" → MISS
Layer 3: lastName Jaro-Winkler 0.38 < 0.92 → MISS

→ Result: { isDuplicate: false, level: "none" }
```

### Example 5: Accented names

```
Input A:  "Nicolás García"
Input B:  "Nicolas Garcia"

Normalized A: "nicolas" "garcia"   (accents stripped)
Normalized B: "nicolas" "garcia"

→ Layer 1 HIT: exact match after normalization
→ Result: { isDuplicate: true, level: "exact", confidence: 1.0 }
```

---

## 7. Tuning the Thresholds

The deduplication behavior is controlled by two constants in `deduplication.ts`:

```typescript
const JARO_WINKLER_THRESHOLD = 0.92;       // Both names must exceed this
const JARO_WINKLER_HIGH_THRESHOLD = 0.85;  // Partial match threshold
```

**To make detection more aggressive (catch more duplicates):**
- Lower `JARO_WINKLER_THRESHOLD` to `0.88`
- Lower `JARO_WINKLER_HIGH_THRESHOLD` to `0.80`
- Risk: more false positives

**To make detection more conservative (fewer false positives):**
- Raise `JARO_WINKLER_THRESHOLD` to `0.95`
- Raise `JARO_WINKLER_HIGH_THRESHOLD` to `0.90`
- Risk: more duplicates slip through

**Recommended tuning approach:**
1. Start with the default values (`0.92` / `0.85`)
2. Collect a sample of real-world duplicate pairs from your data
3. Run them through `arePotentialDuplicates` and check the results
4. Adjust thresholds until you find the right balance for your use case

**For short names (2–3 chars):** Jaro-Winkler can give high scores even for unrelated names. The phonetic layer (Layer 2) is more reliable for short names. Consider requiring phonetic match for names under 4 characters.

---

## 8. FAQ and Edge Cases

### Q: Does this work for non-English names?

**Partially.** Double Metaphone was designed for English pronunciation rules but handles many European names well (Spanish, Italian, Germanic, Slavic). For fully non-Latin scripts (Chinese, Arabic, Japanese), you would need a different phonetic algorithm.

The normalization layer (accent stripping) works well for Latin-script languages.

### Q: What about middle names?

This implementation compares first + last only. To add middle name support, extend the `AthleteInput` type and add another phonetic comparison layer in `arePotentialDuplicates`.

### Q: What about performance with millions of records?

The two-phase approach (DB index lookup → then fine check) is critical:
- Phase 1: DB query on indexed `metaphone*` and `normalized*` columns → O(log n)
- Phase 2: `arePotentialDuplicates` on 0–20 candidates → O(1)
- Total: O(log n), works fine with millions of records

### Q: Can I use this with MongoDB/MySQL/SQLite?

Yes. The shared library is database-agnostic. You just need to:
1. Store the derived fields (normalized + metaphone)
2. Create indexes on those fields
3. Query candidates using those fields

### Q: What about nicknames (Bill → William, Bob → Robert)?

Double Metaphone does NOT handle nickname mapping. To catch these, maintain a nickname lookup table:

```typescript
const NICKNAMES: Record<string, string[]> = {
  william: ['bill', 'will', 'willy', 'billy', 'liam'],
  robert: ['bob', 'bobby', 'rob', 'robby'],
  // ...
};
```

And check normalized names against this table before the phonetic check.

### Q: Why not just use an npm package like `natural` or `metaphone`?

You can. The advantage of this self-contained implementation:
- **Zero dependencies** — no supply chain risk
- **Full control** — you can modify rules for your domain
- **TypeScript-native** — full type safety
- **Auditable** — you can read and understand every line

### Q: How do I handle the "similar" level in the UI?

Recommended UX pattern:

| Level | UI Action |
|-------|-----------|
| `exact` | Block submission. Show error: "This person already exists." |
| `phonetic` | Block submission. Show error: "A person with a similar-sounding name exists." |
| `similar` | Allow submission with confirmation. Show warning: "This might be a duplicate. Are you sure?" |
| `none` | Allow submission normally. |

---

## Quick-Start Checklist

When integrating into a new project, follow this checklist:

- [ ] Copy `shared/src/` files into your project (4 files, zero deps)
- [ ] Add normalized + metaphone columns to your database schema
- [ ] Add a unique constraint on normalized fields
- [ ] Create indexes on normalized and metaphone columns
- [ ] Compute derived fields before every insert
- [ ] Query for candidates using indexed columns before insert
- [ ] Run `arePotentialDuplicates()` on candidates
- [ ] Handle `exact`/`phonetic` as blocks, `similar` as warnings
- [ ] Catch unique constraint violations as a safety net
- [ ] (Optional) Add frontend blur-check for live feedback

---

*This documentation covers the complete deduplication system as implemented in the `metaphone-test` project. All code is TypeScript with zero external dependencies.*
