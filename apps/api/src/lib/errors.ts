import { HTTPException } from "hono/http-exception";

export class ApiError extends HTTPException {
  constructor(status: 400 | 401 | 403 | 404 | 409 | 422 | 500, message: string, details?: unknown) {
    super(status, { message, cause: details });
  }
}

export const notFound = (what = "資源") => new ApiError(404, `${what}不存在`);
export const badRequest = (msg: string, details?: unknown) => new ApiError(400, msg, details);
export const unauthorized = (msg = "請先登入") => new ApiError(401, msg);
export const forbidden = (msg = "沒有權限") => new ApiError(403, msg);
export const conflict = (msg: string) => new ApiError(409, msg);
