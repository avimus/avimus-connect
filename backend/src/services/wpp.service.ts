import axios, { AxiosError } from 'axios'
import { env } from '../config/env'

const wpp = axios.create({
  baseURL: env.WPP_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

export class WppAuthError extends Error {
  constructor(sessionId: string) {
    super(`WPPConnect token inválido para sessão: ${sessionId}`)
    this.name = 'WppAuthError'
  }
}

type WppRawStatus =
  | 'CONNECTED' | 'isLogged'
  | 'INITIALIZING' | 'QRCODE'
  | 'DISCONNECTED' | 'notLogged' | 'CLOSED'
  | boolean | string

export type NormalizedStatus = 'online' | 'offline' | 'waiting_qr' | 'error' | 'unknown'

function normalizeStatus(raw: WppRawStatus): NormalizedStatus {
  if (raw === true)  return 'online'   // check-connection-session retorna boolean true quando conectado
  if (raw === false) return 'offline'
  switch (raw) {
    case 'CONNECTED':
    case 'isLogged':      return 'online'
    case 'INITIALIZING':
    case 'QRCODE':        return 'waiting_qr'
    case 'DISCONNECTED':
    case 'notLogged':
    case 'CLOSED':        return 'offline'
    default:              return 'unknown'
  }
}

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

function isAuthError(err: unknown): boolean {
  return (err as AxiosError)?.response?.status === 401
}

function maskToken(t: string): string {
  return t.length > 10 ? `${t.substring(0, 10)}...` : '***'
}

function maskUrl(url: string): string {
  return url.replace(env.WPP_SECRET_KEY, '[SECRET]')
}

// 1. CRIAR INSTÂNCIA — gera Bearer token para a sessão
export async function generateToken(sessionId: string): Promise<string> {
  const path = `/api/${sessionId}/${env.WPP_SECRET_KEY}/generate-token`
  console.log(`[WPP:generateToken] POST ${env.WPP_BASE_URL}${maskUrl(path)}`)
  try {
    const res = await wpp.post<{ token: string }>(path)
    console.log(`[WPP:generateToken] response ${res.status}: token=${maskToken(res.data.token)}`)
    return res.data.token
  } catch (err) {
    const e = err as AxiosError
    console.error(`[WPP:generateToken] erro ${e.response?.status ?? 'rede'}: ${JSON.stringify(e.response?.data ?? e.message)}`)
    throw err
  }
}

// 2. STATUS DA SESSÃO — usado no polling a cada 30s
export async function checkConnection(sessionId: string, token: string): Promise<NormalizedStatus> {
  const path = `/api/${sessionId}/check-connection-session`
  console.log(`[WPP:checkConnection] GET ${env.WPP_BASE_URL}${path} | token: ${maskToken(token)}`)
  try {
    const res = await wpp.get<{ status: WppRawStatus }>(path, { headers: authHeader(token) })
    const normalized = normalizeStatus(res.data.status)
    console.log(`[WPP:checkConnection] response ${res.status}: raw=${res.data.status} → ${normalized}`)
    return normalized
  } catch (err) {
    const e = err as AxiosError
    if (isAuthError(err)) {
      console.warn(`[WPP:checkConnection] 401 — WppAuthError para "${sessionId}"`)
      throw new WppAuthError(sessionId)
    }
    console.warn(`[WPP:checkConnection] falha ${e.response?.status ?? 'rede'} para "${sessionId}" → unknown`)
    return 'unknown'
  }
}

// 3. QR CODE
export async function getQRCode(sessionId: string, token: string): Promise<string | null> {
  const path = `/api/${sessionId}/qrcode-session`
  console.log(`[WPP:getQRCode] GET ${env.WPP_BASE_URL}${path} | token: ${maskToken(token)}`)
  try {
    const res = await wpp.get<{ qrcode: string | null }>(path, { headers: authHeader(token) })
    const qrPresent = !!res.data.qrcode
    console.log(`[WPP:getQRCode] response ${res.status}: qrcode=${qrPresent ? `presente (${res.data.qrcode!.length} chars)` : 'ausente'}`)
    return res.data.qrcode ?? null
  } catch (err) {
    const e = err as AxiosError
    if (isAuthError(err)) {
      console.warn(`[WPP:getQRCode] 401 — WppAuthError para "${sessionId}"`)
      throw new WppAuthError(sessionId)
    }
    console.warn(`[WPP:getQRCode] falha ${e.response?.status ?? 'rede'} para "${sessionId}" → null`)
    return null
  }
}

// 4 & 5. INICIAR / RECONECTAR SESSÃO — retorna qrcode se o WPP entregar na resposta
export async function startSession(sessionId: string, token: string): Promise<string | null> {
  const path = `/api/${sessionId}/start-session`
  console.log(`[WPP:startSession] POST ${env.WPP_BASE_URL}${path} | token: ${maskToken(token)}`)
  try {
    const res = await wpp.post<{ qrcode?: string }>(path, {}, { headers: authHeader(token) })
    const qrcode = res.data?.qrcode ?? null
    console.log(`[WPP:startSession] response ${res.status}: qrcode=${qrcode ? `presente (${qrcode.length} chars)` : 'ausente'} | raw=${JSON.stringify(res.data)}`)
    return qrcode
  } catch (err) {
    const e = err as AxiosError
    if (isAuthError(err)) {
      console.warn(`[WPP:startSession] 401 — WppAuthError para "${sessionId}"`)
      throw new WppAuthError(sessionId)
    }
    console.error(`[WPP:startSession] erro ${e.response?.status ?? 'rede'} para "${sessionId}": ${JSON.stringify(e.response?.data ?? e.message)}`)
    throw err
  }
}

// 6. DESCONECTAR / FECHAR SESSÃO (best-effort, nunca lança)
export async function closeSession(sessionId: string, token?: string): Promise<void> {
  const path = `/api/${sessionId}/close-session`
  console.log(`[WPP:closeSession] POST ${env.WPP_BASE_URL}${path} | token: ${token ? maskToken(token) : 'sem token'}`)
  try {
    const headers = token ? authHeader(token) : {}
    const res = await wpp.post(path, {}, { headers })
    console.log(`[WPP:closeSession] response ${res.status}`)
  } catch (err) {
    const e = err as AxiosError
    console.warn(`[WPP:closeSession] erro ${e.response?.status ?? 'rede'} para "${sessionId}" (best-effort, ignorado)`)
  }
}

// 7. STATUS DETALHADO — retorna apenas o status normalizado (usado no polling e wpp-status)
export async function getDetailedStatus(sessionId: string, token: string): Promise<NormalizedStatus> {
  const path = `/api/${sessionId}/status-session`
  console.log(`[WPP:getDetailedStatus] GET ${env.WPP_BASE_URL}${path} | token: ${maskToken(token)}`)
  try {
    const res = await wpp.get<{ status: WppRawStatus }>(path, { headers: authHeader(token) })
    const normalized = normalizeStatus(res.data.status)
    console.log(`[WPP:getDetailedStatus] response ${res.status}: raw=${res.data.status} → ${normalized}`)
    return normalized
  } catch (err) {
    const e = err as AxiosError
    if (isAuthError(err)) {
      console.warn(`[WPP:getDetailedStatus] 401 — WppAuthError para "${sessionId}"`)
      throw new WppAuthError(sessionId)
    }
    console.warn(`[WPP:getDetailedStatus] falha ${e.response?.status ?? 'rede'} para "${sessionId}" → unknown`)
    return 'unknown'
  }
}

// 8. STATUS + QR CODE — retorna status normalizado e qrcode da mesma chamada status-session
export async function getStatusSession(
  sessionId: string,
  token: string
): Promise<{ status: NormalizedStatus; qrcode: string | null }> {
  const path = `/api/${sessionId}/status-session`
  console.log(`[WPP:getStatusSession] GET ${env.WPP_BASE_URL}${path} | token: ${maskToken(token)}`)
  try {
    const res = await wpp.get<{ status: WppRawStatus; qrcode?: string }>(path, { headers: authHeader(token) })
    const status = normalizeStatus(res.data.status)
    const qrcode = res.data.qrcode ?? null
    console.log(`[WPP:getStatusSession] response ${res.status}: raw=${res.data.status} → ${status} | qrcode=${qrcode ? `presente (${qrcode.length} chars)` : 'ausente'}`)
    return { status, qrcode }
  } catch (err) {
    const e = err as AxiosError
    if (isAuthError(err)) {
      console.warn(`[WPP:getStatusSession] 401 — WppAuthError para "${sessionId}"`)
      throw new WppAuthError(sessionId)
    }
    console.warn(`[WPP:getStatusSession] falha ${e.response?.status ?? 'rede'} para "${sessionId}"`)
    return { status: 'unknown', qrcode: null }
  }
}
