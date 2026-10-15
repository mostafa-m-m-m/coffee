import { z } from "zod";

/**
 * Zod 4 probes for `eval` to speed up parsing, and our Content Security Policy rightly forbids it:
 * the probe is caught, but the browser logs a policy violation. Browsers parse small form data, so
 * they use the interpreter and never probe. Imported first by the client providers.
 */
z.config({ jitless: true });
