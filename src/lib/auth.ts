import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { pool } from '@/lib/db'

export const SESSION_COOKIE = 'cv_session'

export interface AppUser {
  id: number
  full_name: string
  email: string
  is_admin: boolean
  analyses_used: number
  analyses_paid: number
  created_at: Date
}

export function createSessionId() {
  return crypto.randomBytes(32).toString('hex')
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return null

  const [rows] = await pool.execute(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = :sessionId AND s.expires_at > NOW()
     LIMIT 1`,
    { sessionId },
  )
  const users = rows as AppUser[]
  return users[0] || null
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (sessionId) {
    await pool.execute('DELETE FROM sessions WHERE id = :sessionId', { sessionId })
  }
}
