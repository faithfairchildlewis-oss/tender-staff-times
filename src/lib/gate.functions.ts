import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "node:crypto";

const sessionConfig = {
  password: process.env["SESSION_SECRET"]!, // server-only; 64 chars
  name: "site-gate",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  },
};

type GateSession = { unlocked?: boolean };

/** Hash both sides to equal-length digests so timingSafeEqual won't throw on
 *  a length mismatch (which itself leaks through timing). */
function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Check whether the current session is unlocked. Called from the root
 *  beforeLoad on every navigation. */
export const checkGate = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await useSession<GateSession>(sessionConfig);
    return { unlocked: Boolean(session.data.unlocked) };
  },
);

/** Unlock the site — validates the password, sets the session flag. */
export const unlockSite = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    if (!expected) throw new Error("SITE_PASSWORD is not set");

    if (!passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }

    const session = await useSession<GateSession>(sessionConfig);
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

/** Lock the site — clears the session so the password must be re-entered. */
export const lockSite = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig);
  await session.clear();
  return { ok: true as const };
});

/** Redirect helper — throw from beforeLoad to bounce locked visitors. */
export async function requireUnlocked() {
  const session = await useSession<GateSession>(sessionConfig);
  if (!session.data.unlocked) throw redirect({ to: "/unlock" });
  return session;
}
