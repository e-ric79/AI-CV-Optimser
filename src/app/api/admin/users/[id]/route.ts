import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!user.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await context.params
  const [profileRows] = await pool.execute(
    `SELECT id, full_name, email, analyses_used, analyses_paid, created_at
     FROM users WHERE id = :id LIMIT 1`,
    { id },
  )
  const profiles = profileRows as Array<Record<string, unknown>>
  if (!profiles[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const [analyses] = await pool.execute(
    `SELECT id, job_title, ats_score, match_score, readability_score, result, paid, created_at
     FROM analyses WHERE user_id = :id ORDER BY created_at DESC`,
    { id },
  )
  return NextResponse.json({ profile: profiles[0], analyses })
}
