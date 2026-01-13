import { defineConfig } from "prisma/config";
import path from "path";
import dotenv from "dotenv";

// Load .env file
dotenv.config({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Use DIRECT_URL for migrations/db push, fallback to DATABASE_URL
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
