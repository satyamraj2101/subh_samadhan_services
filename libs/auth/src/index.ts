import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomBytes, randomUUID } from 'crypto'
import slugify from 'slugify'

const ACCESS_TTL = process.env.ACCESS_TTL ?? '15m'
const REFRESH_TTL_SEC = Number(process.env.REFRESH_TTL_SEC ?? 60 * 60 * 24 * 7) // 7d
const ACCESS_SECRET = process.env.ACCESS_SECRET!
const REFRESH_SECRET = process.env.REFRESH_SECRET!

export type JwtPayload = {
  sub: string   // userId
  sid: string   // session/family id
  ver: number   // rotation version
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL, algorithm: 'HS256' })
}
export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TTL_SEC, algorithm: 'HS256' })
}
export function verifyAccess(token: string) {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload
}
export function verifyRefresh(token: string) {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload
}

export async function hashPassword(pw: string) {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(pw, salt)
}
export function comparePassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash)
}

export function cookieOpts(isProd = process.env.NODE_ENV === 'production') {
  return { httpOnly: true, secure: isProd, sameSite: 'strict' as const, path: '/' }
}

export function newFamilyId() { return randomUUID() }

export function newUsername(fullName: string) {
  const base = slugify(fullName, { lower: true, strict: true })
  return `${base}-${randomBytes(2).toString('hex')}`
}
