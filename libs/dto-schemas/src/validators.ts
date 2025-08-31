import { z } from 'zod'

/** Basic E.164 validator (e.g. +919999999999). Adjust if you allow local formats. */
export const e164 = z.string().regex(/^\+[1-9]\d{6,14}$/, 'Invalid phone number (E.164 required)')

/** Strong password (you can relax/strengthen as needed) */
export const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/\d/, 'Password must contain a number')

/** ISO date (YYYY-MM-DD) → coerces to Date */
export const isoDateToDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  .transform((s) => new Date(`${s}T00:00:00.000Z`))

/** Helper to wrap Zod errors into a consistent API error payload */
export function zodToHttp(err: unknown) {
  if (err instanceof z.ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'One or more fields are invalid.',
          details: err.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message
          }))
        }
      }
    }
  }
  return null
}
