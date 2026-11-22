import { NextRequest, NextResponse } from 'next/server'
import { initiateSTKPush } from '@/lib/mpesa'
import { getCurrentUser } from '@/lib/auth'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { phone, amount } = await req.json()
    if (!phone || !amount) {
      return NextResponse.json({ error: 'Phone and amount required' }, { status: 400 })
    }

    const mpesaRes = await initiateSTKPush(phone, amount)

    // Save pending payment
    await pool.execute(
      `INSERT INTO payments
       (user_id, phone, amount, status, checkout_request_id, merchant_request_id)
       VALUES (:userId, :phone, :amount, 'pending', :checkoutRequestId, :merchantRequestId)`,
      {
        userId: user.id,
        phone,
        amount,
        checkoutRequestId: mpesaRes.CheckoutRequestID || null,
        merchantRequestId: mpesaRes.MerchantRequestID || null,
      },
    )

    return NextResponse.json({ success: true, data: mpesaRes })
  } catch (err: any) {
    console.error('M-Pesa error:', err)
    const darajaMessage =
      err?.response?.data?.errorMessage ||
      err?.response?.data?.message
    return NextResponse.json(
      { error: darajaMessage || err.message || 'Payment failed' },
      { status: err?.response?.status === 400 ? 400 : 500 },
    )
  }
}