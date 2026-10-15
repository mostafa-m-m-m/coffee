"use client";

import { createAuthClient } from "better-auth/react";

/** Browser side of Better Auth: only used for the optional "Continue with Google" button. */
export const authClient = createAuthClient();
