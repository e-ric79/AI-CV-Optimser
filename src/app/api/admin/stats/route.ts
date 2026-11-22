import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [statsRows] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM analyses) AS total_analyses,
        (SELECT COUNT(*) FROM payments) AS total_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') AS total_revenue`
    );
    const statsRowsArray = statsRows as Array<Record<string, unknown>>;
    const stats = statsRowsArray[0];
    const [recentUsers] = await pool.query(
      `SELECT id, full_name, email, analyses_used, analyses_paid, created_at
       FROM users ORDER BY created_at DESC LIMIT 10`
    );
    const [recentAnalyses] = await pool.query(
      `SELECT job_title, ats_score, match_score, created_at
       FROM analyses ORDER BY created_at DESC LIMIT 10`
    );
    const [recentPayments] = await pool.query(
      `SELECT phone, amount, status, created_at
       FROM payments ORDER BY created_at DESC LIMIT 10`
    );
    const [dailyAnalyses] = await pool.query(
      `SELECT created_at FROM analyses
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY created_at ASC`
    );

    return NextResponse.json({
      stats,
      recentUsers,
      recentAnalyses,
      recentPayments,
      dailyAnalyses,
    });
  } catch (err: any) {
    console.error("Admin stats error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
