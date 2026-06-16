import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

// Config
import Config from "@config";

// Schema
import * as schema from "@db/schema/schema";

export const expoDb = openDatabaseSync(Config.DB_NAME, { enableChangeListener: true });

export const db = drizzle(expoDb, {
  schema: { ...schema },
});
