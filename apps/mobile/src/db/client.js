import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "./migrations";

const expo = openDatabaseSync("cloud_drive.db");
export const db = drizzle(expo);

export async function runMigrations() {
  await migrate(db, migrations);
}
