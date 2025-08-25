// app/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function Root() {
  redirect("/home"); // send logged-in users to our Home dashboard
}
