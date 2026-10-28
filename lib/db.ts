import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { seedStarterDeck } from "./starter-deck";

// Local dev uses a SQLite file (gitignored). Production points
// STUDY_DATABASE_URL at a Turso/libSQL database, since Vercel's filesystem
// doesn't persist.
const DEFAULT_URL = "file:.data/study.db";

const SCHEMA = [
  // Logins: scrypt "salt:hash" per username (see lib/auth.ts).
  `CREATE TABLE IF NOT EXISTS study_users (
    username TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // One JSON value per key (see lib/settings.ts).
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // A card plus its FSRS memory state. Cloze notes become one row per cloze number.
  `CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'basic',
    front TEXT NOT NULL,
    back TEXT NOT NULL DEFAULT '',
    extra TEXT NOT NULL DEFAULT '',
    cloze_index INTEGER NOT NULL DEFAULT 0,
    topic_id TEXT,
    tags TEXT NOT NULL DEFAULT '',
    suspended INTEGER NOT NULL DEFAULT 0,
    flagged INTEGER NOT NULL DEFAULT 0,
    due TEXT NOT NULL,
    stability REAL NOT NULL DEFAULT 0,
    difficulty REAL NOT NULL DEFAULT 0,
    elapsed_days INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    learning_steps INTEGER NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    state INTEGER NOT NULL DEFAULT 0,
    last_review TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS cards_due ON cards (due)`,
  `CREATE INDEX IF NOT EXISTS cards_deck ON cards (deck_id)`,
  // Every grade given; prev holds the card's state before it, for undo.
  `CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    prev_state INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    reviewed_at TEXT NOT NULL,
    local_date TEXT NOT NULL,
    prev TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS reviews_date ON reviews (local_date)`,
  // Confidence (0 = not rated, 1–5) per AAMC outline topic (ids from lib/outline.ts).
  `CREATE TABLE IF NOT EXISTS topic_ratings (
    topic_id TEXT PRIMARY KEY,
    confidence INTEGER NOT NULL DEFAULT 0,
    content_done INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // The study plan. start_min is minutes after local midnight (null = any time that day).
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    start_min INTEGER,
    duration_min INTEGER NOT NULL DEFAULT 60,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'custom',
    section TEXT NOT NULL DEFAULT '',
    topic_id TEXT,
    notes TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0,
    auto INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS tasks_date ON tasks (date)`,
  `CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'full_length',
    cp INTEGER,
    cars INTEGER,
    bb INTEGER,
    ps INTEGER,
    reviewed INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS mistakes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT '',
    section TEXT NOT NULL DEFAULT '',
    topic_id TEXT,
    reason TEXT NOT NULL DEFAULT 'content',
    question TEXT NOT NULL DEFAULT '',
    takeaway TEXT NOT NULL DEFAULT '',
    card_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Study time. An open session has ended_at NULL; at most one is open at a time.
  // local_date is the day it started, in the study time zone (drives the heatmap).
  `CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    local_date TEXT NOT NULL,
    minutes INTEGER NOT NULL DEFAULT 0,
    section TEXT NOT NULL DEFAULT '',
    topic_id TEXT,
    task_id INTEGER,
    notes TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_date ON sessions (local_date)`,
];

let ready: Promise<Client> | null = null;

async function init(): Promise<Client> {
  const url = process.env.STUDY_DATABASE_URL || DEFAULT_URL;
  if (url.startsWith("file:")) mkdirSync(dirname(resolve(url.slice(5))), { recursive: true });
  const client = createClient({ url, authToken: process.env.STUDY_DATABASE_AUTH_TOKEN });
  await client.execute("PRAGMA foreign_keys = ON");
  await client.batch(SCHEMA, "write");
  await seedStarterDeck(client);
  return client;
}

export function getDb(): Promise<Client> {
  if (!ready) {
    ready = init().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

/** Rows as plain objects (libSQL rows are array-like and don't JSON-serialize cleanly). */
export async function all<T>(sql: string, args: (string | number | null)[] = []): Promise<T[]> {
  const db = await getDb();
  const rs = await db.execute({ sql, args });
  return rs.rows.map((r) => ({ ...r }) as T);
}

export async function one<T>(sql: string, args: (string | number | null)[] = []): Promise<T | null> {
  return (await all<T>(sql, args))[0] ?? null;
}

export async function run(sql: string, args: (string | number | null)[] = []) {
  const db = await getDb();
  return db.execute({ sql, args });
}
