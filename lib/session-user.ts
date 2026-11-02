import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STUDY_COOKIE, verifySessionToken } from "./auth";

/** For pages: the signed-in username; sends anyone else to the login page. */
export async function requireUser(): Promise<string> {
  const store = await cookies();
  const user = verifySessionToken(store.get(STUDY_COOKIE)?.value);
  if (!user) redirect("/login");
  return user;
}
