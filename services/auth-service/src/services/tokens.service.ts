import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Response } from 'express'
import { cookieOpts, newFamilyId, signAccessToken, signRefreshToken } from '@libs/auth'

const prisma = new PrismaClient()
const REFRESH_TTL_SEC = Number(process.env.REFRESH_TTL_SEC ?? 604800)

export async function issueTokenPair(userId: string, res: Response, family?: string, ua?: string, ip?: string) {
  const sid = family ?? newFamilyId()
  const access = signAccessToken({ sub: userId, sid, ver: 1 })
  const refresh = signRefreshToken({ sub: userId, sid, ver: 1 })

  const tokenHash = await bcrypt.hash(refresh, 12)
  const expires = new Date(Date.now() + REFRESH_TTL_SEC * 1000)

  await prisma.refreshToken.create({
    data: { userId, tokenHash, userAgent: ua, ipAddr: ip, expiresAt: expires }
  })

  res.cookie('refresh_token', refresh, { ...cookieOpts(), maxAge: REFRESH_TTL_SEC * 1000 })
  return access
}

export async function revokeFamily(userId: string, sid: string) {
  await prisma.refreshToken.deleteMany({ where: { userId, /* if you store sid in tokenHash payload: keep DB minimal */ } })
}
