// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  const { secretCode, name } = await req.json();

  if (!secretCode) {
    return NextResponse.json({ ok: false, error: 'secretCode required' }, { status: 400 });
  }

  // Look up by unique secretCode
  let user = await db.user.findUnique({ where: { secretCode } }).catch(() => null);

  if (!user) {
    if (!name) {
      return NextResponse.json(
        { ok: false, error: 'name required for first login' },
        { status: 400 }
      );
    }

    // generate a short join code (6 uppercase chars)
    const joinCode =
      crypto.randomBytes(4).toString('base64').replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase() ||
      Math.random().toString(36).slice(2, 8).toUpperCase();

    user = await db.user.create({
      data: {
        name,
        displayName: name,     // satisfy required field
        joinCode,              // satisfy required field
        secretCode,
      },
    });
  }

  // …set cookie / session as you already do
  return NextResponse.json({ ok: true, userId: user.id });
}
