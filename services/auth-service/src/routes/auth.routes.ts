import { Router } from 'express'
import { PrismaClient, UserStatus, AuthProvider } from '@prisma/client'
// DTOs – import concrete files (avoid barrel issues)
import { RegisterDto } from '@libs/dto-schemas/src/auth/register.dto'
import { LoginDto } from '@libs/dto-schemas/src/auth/login.dto'
import { ForgotStartDto } from '@libs/dto-schemas/src/auth/forgot-start.dto'
import { ForgotVerifyDto } from '@libs/dto-schemas/src/auth/forgot-verify.dto'
import { ResetPasswordDto } from '@libs/dto-schemas/src/auth/reset-password.dto'

import { comparePassword, cookieOpts, hashPassword, verifyAccess } from '../../../../libs/auth/src/index'
import { z } from 'zod'
import { issueTokenPair } from '../services/tokens.service'
import { authUrl, exchangeCodeForProfile } from '../services/google.service'
import { startOtp, verifyOtp } from '../services/otp.service'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()
export const authRouter = Router()

function parse<T extends z.ZodTypeAny>(schema: T, body: unknown) {
  return schema.parse(body)
}

async function buildProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const roles = await prisma.userRole.findMany({ where: { userId }, include: { role: { include: { perms: { include: { permission: true } } } } } })
  const roleCodes = roles.map(r => r.role.code)
  const permissions = Array.from(new Set(roles.flatMap(r => r.role.perms.map(p => p.permission.code))))
  return {
    user: {
      id: user!.id,
      email: user!.email,
      fullName: user!.fullName,
      phoneE164: user!.phoneE164,
      status: user!.status,
      isEmailVerified: user!.isEmailVerified,
      createdAt: user!.createdAt
    },
    roles: roleCodes,
    permissions
  }
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const dto = parse(RegisterDto, req.body)
    const exists = await prisma.user.findUnique({ where: { email: dto.email } })
    if (exists) return res.status(409).json({ error: { message: 'Email already in use' } })
    const fullName = `${dto.firstName} ${dto.lastName}`.trim()
    const passwordHash = await hashPassword(dto.password)

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName,
        phoneE164: dto.mobile,
        status: UserStatus.ACTIVE
      }
    })

    // Link PASSWORD provider account (optional, but keeps model consistent)
    await prisma.authAccount.create({
      data: {
        userId: user.id,
        provider: AuthProvider.PASSWORD,
        providerAccountId: user.email,
        providerEmail: user.email
      }
    })

    // Default CUSTOMER role if it exists
    const customer = await prisma.role.findUnique({ where: { code: 'CUSTOMER' } })
    if (customer) {
      await prisma.userRole.create({ data: { userId: user.id, roleId: customer.id } })
    }

    const access = await issueTokenPair(user.id, res, undefined, req.get('user-agent') ?? undefined, req.ip)
    const profile = await buildProfile(user.id)
    res.status(201).json({ token: access, ...profile })
  } catch (e) { next(e) }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const dto = parse(LoginDto, req.body)
    const user = await prisma.user.findUnique({ where: { email: dto.email } })
    if (!user || !user.passwordHash) return res.status(401).json({ error: { message: 'Invalid credentials' } })
    const ok = await comparePassword(dto.password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: { message: 'Invalid credentials' } })

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    const access = await issueTokenPair(user.id, res, undefined, req.get('user-agent') ?? undefined, req.ip)
    const profile = await buildProfile(user.id)
    res.json({ token: access, ...profile })
  } catch (e) { next(e) }
})

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const incoming = req.cookies?.['refresh_token']
    if (!incoming) return res.status(401).json({ error: { message: 'No refresh token' } })
    const dec = jwt.decode(incoming) as any
    if (!dec?.sub) return res.status(401).json({ error: { message: 'Invalid token' } })
    // (You can implement anti-reuse rotation family verification if you also persist sid family)
    const access = await issueTokenPair(dec.sub, res, dec.sid, req.get('user-agent') ?? undefined, req.ip)
    const profile = await buildProfile(dec.sub)
    res.json({ token: access, ...profile })
  } catch (e) { next(e) }
})

authRouter.post('/logout', async (req, res, next) => {
  try {
    res.clearCookie('refresh_token', { ...cookieOpts() })
    res.status(204).send()
  } catch (e) { next(e) }
})

// Google SSO
authRouter.get('/google', (_req, res) => {
  const state = 'csrfState' // TODO: generate and save to session if you keep server session
  res.redirect(authUrl(state))
})

authRouter.get('/google/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code)
    const { profile } = await exchangeCodeForProfile(code)
    const email = profile.email as string

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          fullName: `${profile.given_name ?? ''} ${profile.family_name ?? ''}`.trim() || (profile.name as string),
          isEmailVerified: true,
          status: UserStatus.ACTIVE
        }
      })
      const customer = await prisma.role.findUnique({ where: { code: 'CUSTOMER' } })
      if (customer) await prisma.userRole.create({ data: { userId: user.id, roleId: customer.id } })
    }

    // Link GOOGLE account if not linked
    const existingLink = await prisma.authAccount.findFirst({
      where: { userId: user.id, provider: AuthProvider.GOOGLE }
    })
    if (!existingLink) {
      await prisma.authAccount.create({
        data: {
          userId: user.id,
          provider: AuthProvider.GOOGLE,
          providerAccountId: profile.sub,
          providerEmail: email
        }
      })
    }

    const access = await issueTokenPair(user.id, res, undefined, req.get('user-agent') ?? undefined, req.ip)
    const payload = await buildProfile(user.id)
    res.json({ token: access, ...payload })
  } catch (e) { next(e) }
})

// Forgot password via OTP (email or sms)
authRouter.post('/forgot/start', async (req, res, next) => {
  try {
    const dto = parse(ForgotStartDto, req.body)
    await startOtp(dto.identity, dto.channel, 'password_reset')
    res.json({ message: 'OTP sent if account exists' })
  } catch (e) { next(e) }
})

authRouter.post('/forgot/verify', async (req, res, next) => {
  try {
    const dto = parse(ForgotVerifyDto, req.body)
    await verifyOtp(dto.identity, dto.channel, dto.otp)
    // issue short-lived reset token (store hash in PasswordReset)
    const plaintext = cryptoRandom(24)
    const hash = await bcrypt.hash(plaintext, 12)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    // link it to a user if exists:
    const user = dto.identity.includes('@')
      ? await prisma.user.findUnique({ where: { email: dto.identity } })
      : await prisma.user.findFirst({ where: { phoneE164: dto.identity } })

    if (user) {
      await prisma.passwordReset.create({ data: { userId: user.id, tokenHash: hash, expiresAt } })
    }
    res.json({ resetToken: plaintext }) // client sends this to /forgot/reset
  } catch (e) { next(e) }
})

authRouter.post('/forgot/reset', async (req, res, next) => {
  try {
    const dto = parse(ResetPasswordDto, req.body)
    const row = await prisma.passwordReset.findFirst({ where: { usedAt: null }, orderBy: { createdAt: 'desc' } })
    if (!row || row.expiresAt < new Date()) return res.status(400).json({ error: { message: 'Reset token invalid/expired' } })
    const ok = await bcrypt.compare(dto.resetToken, row.tokenHash)
    if (!ok) return res.status(400).json({ error: { message: 'Reset token invalid/expired' } })

    await prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 12), passwordVersion: { increment: 1 } } })
    await prisma.passwordReset.update({ where: { id: row.id }, data: { usedAt: new Date() } })
    res.status(204).send()
  } catch (e) { next(e) }
})

authRouter.get('/me', async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: { message: 'Unauthorized' } })
    const token = header.slice(7)
    const payload = verifyAccess(token)
    const out = await buildProfile(payload.sub)
    res.json(out)
  } catch (e) { next(e) }
})

function cryptoRandom(bytes = 24) {
  return require('crypto').randomBytes(bytes).toString('hex')
}
