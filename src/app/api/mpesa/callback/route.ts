import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const stk = body?.Body?.stkCallback
    if (!stk) return NextResponse.json({ ok: true })

    const resultCode = stk.ResultCode
    const receipt = stk.CallbackMetadata?.Item?.find(
      (i: any) => i.Name === 'MpesaReceiptNumber'
    )?.Value
    const phone = stk.CallbackMetadata?.Item?.find(
      (i: any) => i.Name === 'PhoneNumber'
    )?.Value?.toString()

    if (resultCode === 0 && phone) {
      // Payment successful — update payment record
      const checkoutRequestId = stk.CheckoutRequestID
      const [paymentRows] = await pool.execute(
        `SELECT id, user_id FROM payments
         WHERE checkout_request_id = :checkoutRequestId AND status = 'pending'
         LIMIT 1`,
        { checkoutRequestId },
      )
      const payments = paymentRows as Array<{ id: number; user_id: number }>
      if (payments[0]) {
        await pool.execute(
          `UPDATE payments SET status = 'completed', mpesa_receipt = :receipt
           WHERE id = :paymentId`,
          { receipt: receipt || null, paymentId: payments[0].id },
        )
        await pool.execute(
          'UPDATE users SET analyses_paid = analyses_paid + 1 WHERE id = :userId',
          { userId: payments[0].user_id },
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Callback error:', err)
    return NextResponse.json({ ok: true })
  }
}