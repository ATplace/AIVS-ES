import { REPO_ROOT } from "@es/db";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.join(REPO_ROOT, ".env") });

export const env = {
  PORT: Number(process.env.API_PORT ?? 4000),
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-secret-change-me",
  API_PUBLIC_URL: process.env.API_PUBLIC_URL ?? "http://localhost:4000",
  WEB_PUBLIC_URL: process.env.WEB_PUBLIC_URL ?? "http://localhost:3000",
  ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL ?? "http://localhost:3001",
};
