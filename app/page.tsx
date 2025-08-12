export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function Root() {
  const sid = cookies().get("sid")?.value;
  if (sid) return redirect("/home");
  return redirect("/login");
}