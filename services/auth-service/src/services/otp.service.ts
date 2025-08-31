import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Lazy-loaded providers (avoid crashing at import-time)
let sgMail: any | null = null
let twilioClient: any | null = null

const prisma = new PrismaClient()

// ---------- helpers ----------
function randomOtp(length = 6) {
  let s = ''
  for (let i = 0; i < length; i++) s += Math.floor(Math.random() * 10)
  return s
}

function requireSendgrid() {
  const { SENDGRID_API_KEY, OTP_FROM_EMAIL } = process.env
  if (process.env.DEV_FAKE_OTP === 'true') return { fake: true } as const

  if (!SENDGRID_API_KEY || !SENDGRID_API_KEY.startsWith('SG.')) {
    throw new Error('Email OTP not configured: SENDGRID_API_KEY must start with "SG." and OTP_FROM_EMAIL must be set')
  }
  if (!OTP_FROM_EMAIL) {
    throw new Error('Email OTP not configured: set OTP_FROM_EMAIL')
  }
  if (!sgMail) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(SENDGRID_API_KEY)
  }
  return { fake: false, from: OTP_FROM_EMAIL }
}

function requireTwilio() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env
  if (process.env.DEV_FAKE_OTP === 'true') return { fake: true } as const

  if (
    !TWILIO_ACCOUNT_SID || !TWILIO_ACCOUNT_SID.startsWith('AC') ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_VERIFY_SERVICE_SID || !TWILIO_VERIFY_SERVICE_SID.startsWith('VA')
  ) {
    throw new Error(
      'Twilio not configured: set TWILIO_ACCOUNT_SID (AC...), TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID (VA...)'
    )
  }
  if (!twilioClient) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Twilio = require('twilio')
    twilioClient = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  }
  return { fake: false, verifySid: TWILIO_VERIFY_SERVICE_SID, twilioClient }
}

// ---------- public API ----------
export async function startOtp(
  identity: string,
  channel: 'sms' | 'email',
  _purpose: 'password_reset'
) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  if (channel === 'sms') {
    const tw = requireTwilio()
    const otp = randomOtp()
    if (tw.fake) {
      console.log('[DEV_FAKE_OTP] SMS OTP to', identity, '=>', otp)
    } else {
      await tw.twilioClient.verify.v2.services(tw.verifySid)
        .verifications.create({ to: identity, channel: 'sms' })
    }
    // optional audit row
    await prisma.emailVerification.create({
      data: { userId: '00000000-0000-0000-0000-000000000000', tokenHash: identity, expiresAt }
    })
    return
  }

  // email OTP
  const sg = requireSendgrid()
  const otp = randomOtp()
  const tokenHash = await bcrypt.hash(otp, 12)
  await prisma.emailVerification.create({
    data: { userId: '00000000-0000-0000-0000-000000000000', tokenHash, expiresAt }
  })

  if (sg.fake) {
    console.log('[DEV_FAKE_OTP] Email OTP to', identity, '=>', otp)
  } else {
    await sgMail.send({
      to: identity,
      from: sg.from,
      subject: 'Your password reset code',
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    })
  }
}

export async function verifyOtp(
  identity: string,
  channel: 'sms' | 'email',
  otp: string
) {
  if (channel === 'sms') {
    const tw = requireTwilio()
    if (tw.fake) {
      console.log('[DEV_FAKE_OTP] Accepted SMS OTP for', identity, '=>', otp)
      return true
    }
    const check = await tw.twilioClient.verify.v2.services(tw.verifySid)
      .verificationChecks.create({ to: identity, code: otp })
    if (check.status !== 'approved') throw new Error('Invalid OTP')
    return true
  }

  const row = await prisma.emailVerification.findFirst({
    where: { usedAt: null },
    orderBy: { createdAt: 'desc' }
  })
  if (!row || row.expiresAt < new Date()) throw new Error('OTP expired')

  // In DEV_FAKE_OTP mode we accept whatever was logged
  if (process.env.DEV_FAKE_OTP === 'true') {
    console.log('[DEV_FAKE_OTP] Accepted Email OTP for', identity, '=>', otp)
    await prisma.emailVerification.update({ where: { id: row.id }, data: { usedAt: new Date() } })
    return true
  }

  const ok = await bcrypt.compare(otp, row.tokenHash)
  if (!ok) throw new Error('Invalid OTP')
  await prisma.emailVerification.update({ where: { id: row.id }, data: { usedAt: new Date() } })
  return true
}
