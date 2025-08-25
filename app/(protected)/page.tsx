import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default function ProtectedRoot() {
  redirect("/home"); // send logged-in users to our new home page
}
