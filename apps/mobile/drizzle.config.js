/** @type {import('drizzle-kit').Config} */
export default {
  schema: "./src/db/schema/schema.js",
  out: "./src/db/migrations",
  dialect: "sqlite",
  driver: "expo",
};
