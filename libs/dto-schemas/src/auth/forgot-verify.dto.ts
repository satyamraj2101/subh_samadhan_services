import { z } from 'zod'
import { e164 } from '../validators'

export const ForgotVerifyDto = z.object({
  identity: z.string().trim().refine(
    (v) => v.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : e164.safeParse(v).success,
    'Provide a valid email or E.164 phone number'
  ),
  channel: z.enum(['sms', 'email']),
  otp: z.string().min(4).max(8)
})
export type ForgotVerifyDtoType = z.infer<typeof ForgotVerifyDto>
