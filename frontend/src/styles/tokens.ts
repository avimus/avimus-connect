export const colors = {
  primary: '#775EFC',
  primaryHover: '#8370FC',
  primaryMuted: 'rgba(119, 94, 252, 0.15)',
  background: '#0A0A0F',
  surface: '#16162A',
  surfaceHover: '#1A1A2E',
  border: 'rgba(119, 94, 252, 0.2)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',
  text: '#F0F0FF',
  textMuted: 'rgba(240, 240, 255, 0.5)',
  textSubtle: 'rgba(240, 240, 255, 0.3)',
  success: '#22C55E',
  warning: '#EAB308',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',
  orange: '#F97316',
  gray: '#6B7280',
} as const

export const glass = {
  bg: 'rgba(255, 255, 255, 0.04)',
  bgHover: 'rgba(255, 255, 255, 0.08)',
  border: '1px solid rgba(119, 94, 252, 0.2)',
  backdropFilter: 'blur(12px)',
  shadow: '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
  shadowHover: '0 8px 32px rgba(119, 94, 252, 0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
} as const

export const statusColors: Record<string, string> = {
  online: '#22C55E',
  offline: '#EF4444',
  waiting_qr: '#EAB308',
  error: '#F97316',
  unknown: '#6B7280',
} as const
