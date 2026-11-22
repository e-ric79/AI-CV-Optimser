import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id as number

  const [analyses] = await pool.execute(
    'SELECT id, job_title, ats_score, match_score, created_at FROM analyses WHERE user_id = :userId ORDER BY created_at DESC LIMIT 10',
    { userId },
  )

  return NextResponse.json({
    profile: {
      id: userId,
      full_name: user.full_name,
      email: user.email,
      analyses_used: user.analyses_used,
      analyses_paid: user.analyses_paid,
    },
    analyses,
  })
}
