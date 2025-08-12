export async function POST(req: Request) {
  try {
    const { email = "", password = "" } = await req.json();

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, isAdmin: true, adminPassword: true },
    });

    if (!user || !user.isAdmin || password !== user.adminPassword) {
      return NextResponse.json({ ok: false, error: "Invalid admin credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, user: { id: user.id, name: user.name, isAdmin: true } });
    res.cookies.set("sid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: !!process.env.VERCEL,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error("ADMIN LOGIN ERROR:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
