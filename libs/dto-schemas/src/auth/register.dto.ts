import { z } from 'zod'
import { e164, isoDateToDate, strongPassword } from '../validators'

export const RegisterDto = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  mobile: e164,
  email: z.string().email().max(254),
  password: strongPassword,
  dob: isoDateToDate
})

export type RegisterDtoType = z.infer<typeof RegisterDto>
