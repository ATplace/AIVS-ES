import { SignJWT, jwtVerify } from "jose";
import type { Context, MiddlewareHandler } from "hono";
import { env } from "../env";
import { unauthorized, forbidden } from "./errors";
import type { AdminRole } from "@es/shared";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export type TokenPayload = { sub: string; kind: "admin" | "customer"; role?: AdminRole; email: string; name: string };

export async function signToken(payload: TokenPayload, expiresIn = "7d") {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

function extractToken(c: Context): string | null {
  const h = c.req.header("authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return null;
}

export type AuthVars = { user: TokenPayload | null };

/** 解析 token 但不強制 (訪客也可使用) */
export const optionalAuth: MiddlewareHandler<{ Variables: AuthVars }> = async (c, next) => {
  const t = extractToken(c);
  c.set("user", t ? await verifyToken(t) : null);
  await next();
};

export const requireCustomer: MiddlewareHandler<{ Variables: AuthVars }> = async (c, next) => {
  const t = extractToken(c);
  const user = t ? await verifyToken(t) : null;
  if (!user || user.kind !== "customer") throw unauthorized();
  c.set("user", user);
  await next();
};

export const requireAdmin = (roles?: AdminRole[]): MiddlewareHandler<{ Variables: AuthVars }> => async (c, next) => {
  const t = extractToken(c);
  const user = t ? await verifyToken(t) : null;
  if (!user || user.kind !== "admin") throw unauthorized("請以管理員身分登入");
  if (roles && (!user.role || !roles.includes(user.role))) throw forbidden();
  c.set("user", user);
  await next();
};
