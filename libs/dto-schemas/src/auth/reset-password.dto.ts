import { z } from 'zod'
import { strongPassword } from '../validators'

export const ResetPasswordDto = z.object({
  resetToken: z.string().min(16),
  newPassword: strongPassword
})

export type ResetPasswordDtoType = z.infer<typeof ResetPasswordDto>
