import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/validations/auth";
import { ApiError, errorResponse } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { setPassword } from "@/lib/services/credentials";
import { notify } from "@/lib/email/dispatch";
import { sendVerifyEmail } from "@/lib/email/emails";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (!(await rateLimit(`register:${ip}`, 5, 10 * 60_000))) {
      throw new ApiError(429, "RATE_LIMITED");
    }

    const parsed = registerSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
      throw new ApiError(400, "VALIDATION", { fields });
    }

    const { name, email, password, locale } = parsed.data;
    const normalized = email.toLowerCase();
    if (await db.user.findUnique({ where: { email: normalized } })) {
      throw new ApiError(409, "EMAIL_TAKEN", { fields: { email: "validation.emailTaken" } });
    }

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email: normalized, ...(locale && { locale }) },
        select: { id: true, email: true, name: true, locale: true },
      });
      await setPassword(created.id, password, tx);
      return created;
    });
    notify(() => sendVerifyEmail(user));
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
