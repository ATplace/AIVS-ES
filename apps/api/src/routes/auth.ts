import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { schema } from "@es/db";
import { loginSchema, registerSchema } from "@es/shared";
import { getDb } from "../lib/db";
import { signToken, optionalAuth, type AuthVars } from "../lib/auth";
import { conflict, unauthorized } from "../lib/errors";

export const authRoutes = new Hono<{ Variables: AuthVars }>();

authRoutes.post("/admin/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDb();
  const u = await db.query.adminUsers.findFirst({ where: eq(schema.adminUsers.email, email.toLowerCase()) });
  if (!u || !(await bcrypt.compare(password, u.passwordHash))) throw unauthorized("帳號或密碼錯誤");
  await db.update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, u.id));
  const token = await signToken({ sub: u.id, kind: "admin", role: u.role as never, email: u.email, name: u.name });
  return c.json({ token, user: { id: u.id, email: u.email, name: u.name, role: u.role } });
});

authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const { email, password, name, phone } = c.req.valid("json");
  const db = getDb();
  const exists = await db.query.customers.findFirst({ where: eq(schema.customers.email, email.toLowerCase()) });
  if (exists) throw conflict("此 Email 已註冊");
  const [u] = await db
    .insert(schema.customers)
    .values({ email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 10), name, phone: phone ?? null })
    .returning();
  const token = await signToken({ sub: u.id, kind: "customer", email: u.email, name: u.name });
  return c.json({ token, user: { id: u.id, email: u.email, name: u.name, phone: u.phone } }, 201);
});

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDb();
  const u = await db.query.customers.findFirst({ where: eq(schema.customers.email, email.toLowerCase()) });
  if (!u || !u.passwordHash || !(await bcrypt.compare(password, u.passwordHash))) throw unauthorized("帳號或密碼錯誤");
  const token = await signToken({ sub: u.id, kind: "customer", email: u.email, name: u.name });
  return c.json({ token, user: { id: u.id, email: u.email, name: u.name, phone: u.phone } });
});

authRoutes.get("/me", optionalAuth, async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ user: null });
  return c.json({ user });
});
