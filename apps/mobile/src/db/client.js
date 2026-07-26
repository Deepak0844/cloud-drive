import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

// Config
import Config from "@config";

// Schema
import * as schema from "@db/schema/schema";

export const expoDb = openDatabaseSync(Config.DB_NAME, { enableChangeListener: true });
// Native code (SqliteProgressWriter, iOS/Android) writes to this same file directly, outside this
// connection, while a transfer is active — without a busy_timeout a mid-write query throws "database
// is locked" instead of waiting. Matches the 5000ms timeout the native writers already use.
expoDb.execSync("PRAGMA busy_timeout = 5000;");

export const db = drizzle(expoDb, {
  schema: { ...schema },
});
