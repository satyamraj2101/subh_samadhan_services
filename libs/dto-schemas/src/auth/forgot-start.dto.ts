import { z } from 'zod'
import { e164 } from '../validators'

export const ForgotStartDto = z.object({
  identity: z.string().trim().refine(
    (v) => v.includes('@') ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : e164.safeParse(v).success,
    'Provide a valid email or E.164 phone number'
  ),
  channel: z.enum(['sms', 'email'])
})
export type ForgotStartDtoType = z.infer<typeof ForgotStartDto>
