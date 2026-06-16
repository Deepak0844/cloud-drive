import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

// Migrations
import migrations from "@db/migrations/migrations";

// DB Client
import { db } from "@db/client";

export function useDbMigrations() {
  return useMigrations(db, migrations);
}
