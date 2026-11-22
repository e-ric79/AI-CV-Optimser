import axios from 'axios'

const AUTH_URL =
  'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
const STK_URL =
  'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

export async function getMpesaToken(): Promise<string> {
  const consumerKey = process.env.MPESA_CONSUMER_KEY
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET
  if (!consumerKey || !consumerSecret) {
    throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET are required')
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  const res = await axios.get(AUTH_URL, {
    headers: { Authorization: `Basic ${credentials}` },
  })
  return res.data.access_token
}

export async function initiateSTKPush(phone: string, amount: number) {
  const shortcode = process.env.MPESA_SHORTCODE
  const passkey = process.env.MPESA_PASSKEY
  if (!shortcode || !passkey) {
    throw new Error('MPESA_SHORTCODE and MPESA_PASSKEY are required')
  }

  const callbackUrl =
    process.env.MPESA_CALLBACK_URL?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')}/api/mpesa/callback`

  if (
    !callbackUrl ||
    callbackUrl.includes('your-domain') ||
    !callbackUrl.startsWith('https://')
  ) {
    throw new Error(
      'MPESA_CALLBACK_URL must be a public HTTPS callback URL, for example https://example.ngrok.app/api/mpesa/callback',
    )
  }

  const token = await getMpesaToken()
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64')

  const digits = phone.replace(/\D/g, '')
  const formattedPhone =
    digits.startsWith('254')
      ? digits
      : digits.startsWith('0')
        ? `254${digits.slice(1)}`
        : `254${digits}`

  if (!/^254\d{9}$/.test(formattedPhone)) {
    throw new Error('Enter a valid Kenyan phone number')
  }

  const res = await axios.post(
    STK_URL,
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: 'CVOptimizerKE',
      TransactionDesc: 'CV Analysis Payment',
    },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  return res.data
}
