import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { createSessionId, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { full_name, email, password } = await req.json()
  if (!full_name || !email || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Name, email and an 8-character password are required' }, { status: 400 })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const [result] = await pool.execute(
      'INSERT INTO users (full_name, email, password_hash) VALUES (:fullName, :email, :passwordHash)',
      { fullName: full_name.trim(), email: email.trim().toLowerCase(), passwordHash },
    )
    const insert = result as { insertId: number }
    const sessionId = createSessionId()
    const days = Number(process.env.APP_SESSION_DAYS || 7)

    await pool.execute(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (:id, :userId, DATE_ADD(NOW(), INTERVAL :days DAY))',
      { id: sessionId, userId: insert.insertId, days },
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
  } catch (err: unknown) {
    const dbError = err as { code?: string }
    if (dbError.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Could not create account' }, { status: 500 })
  }
}
