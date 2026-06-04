import { Resend } from 'resend'
import { env } from '../config/env'

const resend = new Resend(env.RESEND_API_KEY)

export async function sendInviteEmail(params: {
  to: string
  tenantName: string
  token: string
}): Promise<void> {
  const activationUrl = `${env.APP_URL}/activate/${params.token}`

  const { data, error } = await resend.emails.send({
    from: env.RESEND_FROM,
    to: params.to,
    subject: `Convite Ávimus Connect — ${params.tenantName}`,
    html: `
      <div style="font-family: Montserrat, sans-serif; background: #0A0A0F; color: #F0F0FF; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #775EFC; margin-bottom: 8px;">Ávimus Connect</h1>
        <h2 style="font-weight: 500; margin-bottom: 24px;">Você foi convidado</h2>
        <p style="color: rgba(240,240,255,0.7); margin-bottom: 32px;">
          Sua conta na Ávimus Connect foi criada. Clique no botão abaixo para ativar sua conta e definir sua senha.
          Este link expira em 72 horas.
        </p>
        <a href="${activationUrl}"
           style="display: inline-block; background: #775EFC; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Ativar Minha Conta
        </a>
        <p style="color: rgba(240,240,255,0.4); margin-top: 32px; font-size: 12px;">
          Ou copie este link: ${activationUrl}
        </p>
      </div>
    `,
  })

  console.log('[email] sendInviteEmail → to:', params.to)
  console.log('[email] sendInviteEmail → data:', JSON.stringify(data, null, 2))
  console.log('[email] sendInviteEmail → error:', JSON.stringify(error, null, 2))
}

export async function sendAlertEmail(params: {
  to: string
  instanceName: string
  occurredAt: Date
  panelUrl: string
}): Promise<void> {
  const dateStr = params.occurredAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  await resend.emails.send({
    from: env.RESEND_FROM,
    to: params.to,
    subject: `⚠️ Instância "${params.instanceName}" desconectada`,
    html: `
      <div style="font-family: Montserrat, sans-serif; background: #0A0A0F; color: #F0F0FF; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #775EFC; margin-bottom: 8px;">Ávimus Connect</h1>
        <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h2 style="color: #EF4444; margin: 0 0 8px 0;">Instância Desconectada</h2>
          <p style="margin: 0; color: rgba(240,240,255,0.7);">
            <strong>${params.instanceName}</strong> perdeu a conexão em ${dateStr}
          </p>
        </div>
        <a href="${params.panelUrl}"
           style="display: inline-block; background: #775EFC; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Acessar Painel e Reconectar
        </a>
      </div>
    `,
  })
}
