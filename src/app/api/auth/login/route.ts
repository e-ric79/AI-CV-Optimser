import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { createSessionId, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const [rows] = await pool.execute(
    'SELECT id, password_hash FROM users WHERE email = :email LIMIT 1',
    { email: email.trim().toLowerCase() },
  )
  const users = rows as Array<{ id: number; password_hash: string }>
  const user = users[0]

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const sessionId = createSessionId()
  const days = Number(process.env.APP_SESSION_DAYS || 7)
  await pool.execute(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (:id, :userId, DATE_ADD(NOW(), INTERVAL :days DAY))',
    { id: sessionId, userId: user.id, days },
  )

  const res = NextResponse.json({ success: true })
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: days * 24 * 60 * 60,
  })
  return res
}
