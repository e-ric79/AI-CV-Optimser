import { NextResponse } from 'next/server'
import { deleteCurrentSession, SESSION_COOKIE } from '@/lib/auth'

export async function POST() {
  await deleteCurrentSession()
  const res = NextResponse.json({ success: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
