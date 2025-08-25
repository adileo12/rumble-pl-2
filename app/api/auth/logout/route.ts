import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CookieSetOptions = Parameters<ReturnType<typeof cookies>["set"]>[2];

export async function POST(req: Request) {
  try {
    const host = req.headers.get("host") || "";
    const baseOptions: CookieSetOptions = {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      ...(host.endsWith("havengames.org") ? { domain: ".havengames.org" } : {}),
    };

    // Expire the cookie
    cookies().set("sid", "", {
      ...baseOptions,
      maxAge: 0,
      expires: new Date(0),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[logout] ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
