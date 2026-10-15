import { toNextJsHandler } from "better-auth/next-js";
import { authServer } from "@/lib/auth";

// Better Auth: /api/auth/sign-in/email, /sign-out, /get-session ...
// (register, forgot, reset and verify have their own routes next to this one)
export const { GET, POST } = toNextJsHandler(authServer);
