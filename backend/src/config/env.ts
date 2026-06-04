import 'dotenv/config'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRY: process.env['JWT_EXPIRY'] ?? '24h',
  WPP_BASE_URL: requireEnv('WPP_BASE_URL'),
  WPP_SECRET_KEY: requireEnv('WPP_SECRET_KEY'),
  RESEND_API_KEY: requireEnv('RESEND_API_KEY'),
  RESEND_FROM: process.env['RESEND_FROM'] ?? 'noreply@avimus.com.br',
  ADMIN_EMAIL: requireEnv('ADMIN_EMAIL'),
  ADMIN_PASSWORD: requireEnv('ADMIN_PASSWORD'),
  PORT: parseInt(process.env['PORT'] ?? '3001', 10),
  NODE_ENV: process.env['NODE_ENV'] ?? 'development',
  APP_URL: process.env['APP_URL'] ?? 'http://localhost:3000',
}
