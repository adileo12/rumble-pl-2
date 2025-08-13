import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find the admin user by username
    const adminUser = await db.user.findUnique({
      where: { username },
      select: { id: true, displayName: true, passwordHash: true, isAdmin: true },
    });

    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { ok: false, error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    // Compare plain text password with hashed password in DB
    const isMatch = await bcrypt.compare(password, adminUser.passwordHash);

    if (!isMatch) {
      return NextResponse.json(
        { ok: false, error: "Invalid admin credentials" },
        { status: 401 }
      );
    }

    // You can set a cookie or token here for admin session
    // Example:
    // const token = createAuthToken(adminUser.id);
    // setCookie(res, 'admin_token', token);

    return NextResponse.json({
      ok: true,
      message: "Admin login successful",
      admin: {
        id: adminUser.id,
        displayName: adminUser.displayName,
        isAdmin: adminUser.isAdmin,
      },
    });
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
