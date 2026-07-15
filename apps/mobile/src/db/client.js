import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

// Config
import Config from "@config";

// Schema
import * as schema from "@db/schema/schema";

export const expoDb = openDatabaseSync(Config.DB_NAME, { enableChangeListener: true });
// Native code (iOS SqliteProgressWriter.swift / Android SqliteProgressWriter.kt) writes to this
// same file directly, outside this connection, while a transfer is active — without a
// busy_timeout, SQLite's default of 0 means any query that lands mid-write on the other side
// throws "database is locked" immediately instead of waiting. Matches the 5000ms timeout the
// native writers already use on both platforms.
expoDb.execSync("PRAGMA busy_timeout = 5000;");

export const db = drizzle(expoDb, {
  schema: { ...schema },
});
