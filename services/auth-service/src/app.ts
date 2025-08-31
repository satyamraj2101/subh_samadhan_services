import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import morgan from 'morgan'
import { authRouter } from './routes/auth.routes'
import { errorHandler } from './middleware/error'

const app = express()
app.use(helmet())
app.use(cors({ origin: (process.env.CORS_ORIGIN ?? '').split(',').filter(Boolean) || true, credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))
app.use(morgan('combined'))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }))

app.use('/api/v1/auth', authRouter) // <- this will be defined now
app.use(errorHandler)

export default app
