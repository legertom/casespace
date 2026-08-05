import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js auto-loads .env.local, but drizzle-kit does not — load it here.
config({ path: ".env.local" });
config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
