import { BUSINESS } from './business'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const DEFAULT_LOGO_URL = SITE_URL
  ? `${SITE_URL.replace(/\/$/, '')}/_LOGO_TCP.png`
  : '/_LOGO_TCP.png'

type EmailTemplateInput = {
  recipientName: string
  message: string
  subject?: string
  logoUrl?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0]
}

export const DEFAULT_EMAIL_SUBJECT = 'Resposta da sua solicitação — Thomas PowerChip'

type AdminNotificationInput = {
  name: string
  email: string
  phone?: string
  vehicle?: string
  year?: string
  message?: string
  adminUrl?: string
}

export function buildAdminNotificationEmail({
  name,
  email,
  phone,
  vehicle,
  year,
  message,
  adminUrl,
}: AdminNotificationInput): string {
  const rows: Array<[string, string]> = [
    ['Nome', name],
    ['E-mail', email],
  ]
  if (phone) rows.push(['Telefone', phone])
  if (vehicle) rows.push(['Veículo', vehicle])
  if (year) rows.push(['Ano', year])

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#888888;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#ebebeb;font-size:14px;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('')

  const messageBlock = message
    ? `<tr>
        <td colspan="2" style="padding:18px 0 4px 0;color:#888888;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Mensagem</td>
       </tr>
       <tr>
        <td colspan="2" style="padding:8px 16px;color:#ebebeb;font-size:14px;line-height:1.6;background:#141414;border:1px solid rgba(255,255,255,0.06);border-radius:8px;">${escapeHtml(message).replace(/\n/g, '<br/>')}</td>
       </tr>`
    : ''

  const ctaBlock = adminUrl
    ? `<tr>
        <td colspan="2" style="padding:24px 0 0 0;">
          <a href="${adminUrl}" style="display:inline-block;padding:11px 20px;background:#e1261c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">
            Abrir no admin →
          </a>
        </td>
       </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Nova solicitação</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#0a0a0a;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#000000;padding:22px 28px;border-bottom:2px solid #e1261c;">
              <div style="color:#e1261c;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;font-family:'Courier New',ui-monospace,monospace;">
                TPC Admin
              </div>
              <div style="color:#ebebeb;font-size:18px;font-weight:500;margin-top:4px;letter-spacing:-0.01em;">
                Nova solicitação de ${escapeHtml(name)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${rowsHtml}
                ${messageBlock}
                ${ctaBlock}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildResponseEmail({
  recipientName,
  message,
  subject = DEFAULT_EMAIL_SUBJECT,
  logoUrl = DEFAULT_LOGO_URL,
}: EmailTemplateInput): string {
  const safeName = escapeHtml(firstName(recipientName))
  const safeBody = escapeHtml(message).replace(/\n/g, '<br/>')
  const safeSubject = escapeHtml(subject)
  const LOGO_URL = logoUrl

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;font-size:1px;opacity:0;">
    Resposta da sua solicitação — Thomas PowerChip. Em breve nosso time fala com você.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#0a0a0a;border-radius:16px;overflow:hidden;">

          <!-- Header / Logo -->
          <tr>
            <td style="background:#000000;padding:28px 32px;border-bottom:3px solid #e1261c;text-align:left;">
              <img
                src="${LOGO_URL}"
                alt="TPC Performance"
                width="140"
                style="display:block;max-width:140px;height:auto;border:0;outline:none;text-decoration:none;"
              />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 12px 32px;background:#0a0a0a;color:#ebebeb;">
              <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:500;color:#ebebeb;letter-spacing:-0.01em;line-height:1.25;">
                Olá, ${safeName}!
              </h1>
              <div style="font-size:15px;line-height:1.65;color:#cccccc;">
                ${safeBody}
              </div>
            </td>
          </tr>

          <!-- CTA WhatsApp -->
          <tr>
            <td style="padding:18px 32px 28px 32px;background:#0a0a0a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#e1261c;border-radius:999px;">
                    <a
                      href="${BUSINESS.whatsappUrl}"
                      style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"
                    >
                      Falar pelo WhatsApp →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature card -->
          <tr>
            <td style="padding:0 32px 32px 32px;background:#0a0a0a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#141414;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
                <tr>
                  <td style="padding:20px 22px;font-size:13px;line-height:1.6;color:#cccccc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <div style="color:#e1261c;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;margin-bottom:8px;">
                      Thomas PowerChip
                    </div>
                    <div style="color:#ebebeb;margin-bottom:10px;">
                      ${BUSINESS.address.street}<br/>
                      ${BUSINESS.address.neighborhood}, ${BUSINESS.address.city} – ${BUSINESS.address.state}<br/>
                      CEP ${BUSINESS.address.cep}
                    </div>
                    <div>
                      <a href="${BUSINESS.whatsappUrl}" style="color:#e1261c;text-decoration:none;">${BUSINESS.phone}</a>
                      &nbsp;·&nbsp;
                      <a href="${BUSINESS.instagramUrl}" style="color:#e1261c;text-decoration:none;">${BUSINESS.instagramHandle}</a>
                      &nbsp;·&nbsp;
                      <a href="mailto:${BUSINESS.email}" style="color:#e1261c;text-decoration:none;">${BUSINESS.email}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#000000;padding:18px 32px;text-align:center;font-size:10px;color:#555555;letter-spacing:0.14em;text-transform:uppercase;font-family:'Courier New',ui-monospace,monospace;">
              Built for Performance
            </td>
          </tr>
        </table>

        <p style="margin:14px 0 0 0;font-size:11px;color:#999999;font-family:-apple-system,sans-serif;">
          Você recebeu este e-mail porque solicitou contato em tpcperformance.com.br
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`
}import { BUSINESS } from './business'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const DEFAULT_LOGO_URL = SITE_URL
  ? `${SITE_URL.replace(/\/$/, '')}/_LOGO_TCP.png`
  : '/_LOGO_TCP.png'

type EmailTemplateInput = {
  recipientName: string
  message: string
  subject?: string
  logoUrl?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0]
}

export const DEFAULT_EMAIL_SUBJECT = 'Resposta da sua solicitação — Thomas PowerChip'

type AdminNotificationInput = {
  name: string
  email: string
  phone?: string
  vehicle?: string
  year?: string
  message?: string
  adminUrl?: string
}

export function buildAdminNotificationEmail({
  name,
  email,
  phone,
  vehicle,
  year,
  message,
  adminUrl,
}: AdminNotificationInput): string {
  const rows: Array<[string, string]> = [
    ['Nome', name],
    ['E-mail', email],
  ]
  if (phone) rows.push(['Telefone', phone])
  if (vehicle) rows.push(['Veículo', vehicle])
  if (year) rows.push(['Ano', year])

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#888888;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#ebebeb;font-size:14px;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('')

  const messageBlock = message
    ? `<tr>
        <td colspan="2" style="padding:18px 0 4px 0;color:#888888;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Mensagem</td>
       </tr>
       <tr>
        <td colspan="2" style="padding:8px 16px;color:#ebebeb;font-size:14px;line-height:1.6;background:#141414;border:1px solid rgba(255,255,255,0.06);border-radius:8px;">${escapeHtml(message).replace(/\n/g, '<br/>')}</td>
       </tr>`
    : ''

  const ctaBlock = adminUrl
    ? `<tr>
        <td colspan="2" style="padding:24px 0 0 0;">
          <a href="${adminUrl}" style="display:inline-block;padding:11px 20px;background:#e1261c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">
            Abrir no admin →
          </a>
        </td>
       </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Nova solicitação</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#0a0a0a;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#000000;padding:22px 28px;border-bottom:2px solid #e1261c;">
              <div style="color:#e1261c;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;font-family:'Courier New',ui-monospace,monospace;">
                TPC Admin
              </div>
              <div style="color:#ebebeb;font-size:18px;font-weight:500;margin-top:4px;letter-spacing:-0.01em;">
                Nova solicitação de ${escapeHtml(name)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${rowsHtml}
                ${messageBlock}
                ${ctaBlock}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildResponseEmail({
  recipientName,
  message,
  subject = DEFAULT_EMAIL_SUBJECT,
  logoUrl = DEFAULT_LOGO_URL,
}: EmailTemplateInput): string {
  const safeName = escapeHtml(firstName(recipientName))
  const safeBody = escapeHtml(message).replace(/\n/g, '<br/>')
  const safeSubject = escapeHtml(subject)
  const LOGO_URL = logoUrl

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;font-size:1px;opacity:0;">
    Resposta da sua solicitação — Thomas PowerChip. Em breve nosso time fala com você.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#0a0a0a;border-radius:16px;overflow:hidden;">

          <!-- Header / Logo -->
          <tr>
            <td style="background:#000000;padding:28px 32px;border-bottom:3px solid #e1261c;text-align:left;">
              <img
                src="${LOGO_URL}"
                alt="TPC Performance"
                width="140"
                style="display:block;max-width:140px;height:auto;border:0;outline:none;text-decoration:none;"
              />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 12px 32px;background:#0a0a0a;color:#ebebeb;">
              <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:500;color:#ebebeb;letter-spacing:-0.01em;line-height:1.25;">
                Olá, ${safeName}!
              </h1>
              <div style="font-size:15px;line-height:1.65;color:#cccccc;">
                ${safeBody}
              </div>
            </td>
          </tr>

          <!-- CTA WhatsApp -->
          <tr>
            <td style="padding:18px 32px 28px 32px;background:#0a0a0a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#e1261c;border-radius:999px;">
                    <a
                      href="${BUSINESS.whatsappUrl}"
                      style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"
                    >
                      Falar pelo WhatsApp →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature card -->
          <tr>
            <td style="padding:0 32px 32px 32px;background:#0a0a0a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#141414;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
                <tr>
                  <td style="padding:20px 22px;font-size:13px;line-height:1.6;color:#cccccc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <div style="color:#e1261c;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;margin-bottom:8px;">
                      Thomas PowerChip
                    </div>
                    <div style="color:#ebebeb;margin-bottom:10px;">
                      ${BUSINESS.address.street}<br/>
                      ${BUSINESS.address.neighborhood}, ${BUSINESS.address.city} – ${BUSINESS.address.state}<br/>
                      CEP ${BUSINESS.address.cep}
                    </div>
                    <div>
                      <a href="${BUSINESS.whatsappUrl}" style="color:#e1261c;text-decoration:none;">${BUSINESS.phone}</a>
                      &nbsp;·&nbsp;
                      <a href="${BUSINESS.instagramUrl}" style="color:#e1261c;text-decoration:none;">${BUSINESS.instagramHandle}</a>
                      &nbsp;·&nbsp;
                      <a href="mailto:${BUSINESS.email}" style="color:#e1261c;text-decoration:none;">${BUSINESS.email}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#000000;padding:18px 32px;text-align:center;font-size:10px;color:#555555;letter-spacing:0.14em;text-transform:uppercase;font-family:'Courier New',ui-monospace,monospace;">
              Built for Performance
            </td>
          </tr>
        </table>

        <p style="margin:14px 0 0 0;font-size:11px;color:#999999;font-family:-apple-system,sans-serif;">
          Você recebeu este e-mail porque solicitou contato em tpcperformance.com.br
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`
}
import { BUSINESS } from './business'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const DEFAULT_LOGO_URL = SITE_URL
  ? `${SITE_URL.replace(/\/$/, '')}/_LOGO_TCP.png`
  : '/_LOGO_TCP.png'

type EmailTemplateInput = {
  recipientName: string
  message: string
  subject?: string
  logoUrl?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0]
}

export const DEFAULT_EMAIL_SUBJECT = 'Resposta da sua solicitação — Thomas PowerChip'

type AdminNotificationInput = {
  name: string
  email: string
  phone?: string
  vehicle?: string
  year?: string
  message?: string
  adminUrl?: string
}

export function buildAdminNotificationEmail({
  name,
  email,
  phone,
  vehicle,
  year,
  message,
  adminUrl,
}: AdminNotificationInput): string {
  const rows: Array<[string, string]> = [
    ['Nome', name],
    ['E-mail', email],
  ]
  if (phone) rows.push(['Telefone', phone])
  if (vehicle) rows.push(['Veículo', vehicle])
  if (year) rows.push(['Ano', year])

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 0;color:#888888;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;width:120px;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;color:#ebebeb;font-size:14px;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('')

  const messageBlock = message
    ? `<tr>
        <td colspan="2" style="padding:18px 0 4px 0;color:#888888;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">Mensagem</td>
       </tr>
       <tr>
        <td colspan="2" style="padding:8px 16px;color:#ebebeb;font-size:14px;line-height:1.6;background:#141414;border:1px solid rgba(255,255,255,0.06);border-radius:8px;">${escapeHtml(message).replace(/\n/g, '<br/>')}</td>
       </tr>`
    : ''

  const ctaBlock = adminUrl
    ? `<tr>
        <td colspan="2" style="padding:24px 0 0 0;">
          <a href="${adminUrl}" style="display:inline-block;padding:11px 20px;background:#e1261c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">
            Abrir no admin →
          </a>
        </td>
       </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Nova solicitação</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#0a0a0a;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#000000;padding:22px 28px;border-bottom:2px solid #e1261c;">
              <div style="color:#e1261c;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600;font-family:'Courier New',ui-monospace,monospace;">
                TPC Admin
              </div>
              <div style="color:#ebebeb;font-size:18px;font-weight:500;margin-top:4px;letter-spacing:-0.01em;">
                Nova solicitação de ${escapeHtml(name)}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 28px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${rowsHtml}
                ${messageBlock}
                ${ctaBlock}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildResponseEmail({
  recipientName,
  message,
  subject = DEFAULT_EMAIL_SUBJECT,
  logoUrl = DEFAULT_LOGO_URL,
}: EmailTemplateInput): string {
  const safeName = escapeHtml(firstName(recipientName))
  const safeBody = escapeHtml(message).replace(/\n/g, '<br/>')
  const safeSubject = escapeHtml(subject)
  const LOGO_URL = logoUrl

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;font-size:1px;opacity:0;">
    Resposta da sua solicitação — Thomas PowerChip. Em breve nosso time fala com você.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#0a0a0a;border-radius:16px;overflow:hidden;">

          <!-- Header / Logo -->
          <tr>
            <td style="background:#000000;padding:28px 32px;border-bottom:3px solid #e1261c;text-align:left;">
              <img
                src="${LOGO_URL}"
                alt="TPC Performance"
                width="140"
                style="display:block;max-width:140px;height:auto;border:0;outline:none;text-decoration:none;"
              />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 12px 32px;background:#0a0a0a;color:#ebebeb;">
              <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:500;color:#ebebeb;letter-spacing:-0.01em;line-height:1.25;">
                Olá, ${safeName}!
              </h1>
              <div style="font-size:15px;line-height:1.65;color:#cccccc;">
                ${safeBody}
              </div>
            </td>
          </tr>

          <!-- CTA WhatsApp -->
          <tr>
            <td style="padding:18px 32px 28px 32px;background:#0a0a0a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#e1261c;border-radius:999px;">
                    <a
                      href="${BUSINESS.whatsappUrl}"
                      style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"
                    >
                      Falar pelo WhatsApp →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Signature card -->
          <tr>
            <td style="padding:0 32px 32px 32px;background:#0a0a0a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#141414;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
                <tr>
                  <td style="padding:20px 22px;font-size:13px;line-height:1.6;color:#cccccc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <div style="color:#e1261c;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;margin-bottom:8px;">
                      Thomas PowerChip
                    </div>
                    <div style="color:#ebebeb;margin-bottom:10px;">
                      ${BUSINESS.address.street}<br/>
                      ${BUSINESS.address.neighborhood}, ${BUSINESS.address.city} – ${BUSINESS.address.state}<br/>
                      CEP ${BUSINESS.address.cep}
                    </div>
                    <div>
                      <a href="${BUSINESS.whatsappUrl}" style="color:#e1261c;text-decoration:none;">${BUSINESS.phone}</a>
                      &nbsp;·&nbsp;
                      <a href="${BUSINESS.instagramUrl}" style="color:#e1261c;text-decoration:none;">${BUSINESS.instagramHandle}</a>
                      &nbsp;·&nbsp;
                      <a href="mailto:${BUSINESS.email}" style="color:#e1261c;text-decoration:none;">${BUSINESS.email}</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#000000;padding:18px 32px;text-align:center;font-size:10px;color:#555555;letter-spacing:0.14em;text-transform:uppercase;font-family:'Courier New',ui-monospace,monospace;">
              Built for Performance
            </td>
          </tr>
        </table>

        <p style="margin:14px 0 0 0;font-size:11px;color:#999999;font-family:-apple-system,sans-serif;">
          Você recebeu este e-mail porque solicitou contato em tpcperformance.com.br
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`
}

