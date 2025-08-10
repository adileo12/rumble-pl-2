export const runtime = 'nodejs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';

export async function POST(req: Request) {
  const { secretCode, name } = await req.json().catch(() => ({}));
  if (!secretCode || typeof secretCode !== 'string') {
    return NextResponse.json({ ok: false, error: 'secretCode required' }, { status: 400 });
  }

  // find or create user on secretCode
  let user = await db.user.findFirst({ where: { secretCode } }).catch(() => null);
  if (!user) {
    if (!name) return NextResponse.json({ ok: false, error: 'name required for first login' }, { status: 400 });
    user = await db.user.create({ data: { name, secretCode } });
  }

  // simple cookie session (1 month). In production you can switch to JWT if you prefer.
  cookies().set('rumble_session', user.id, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30 });
  return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
}
