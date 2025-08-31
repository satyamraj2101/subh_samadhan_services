import { z } from 'zod'

export const LoginDto = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8)
})

export type LoginDtoType = z.infer<typeof LoginDto>
