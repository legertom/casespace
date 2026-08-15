/**
 * Loads `.env.local` for the AI Gateway credential. Next.js does this natively
 * in the app; Vitest does not.
 *
 * This pulls in `DATABASE_URL` too — which on the primary dev machine points at
 * production. Nothing under `evals/` imports a database module, and it should
 * stay that way: evals read fixtures and write nothing.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
