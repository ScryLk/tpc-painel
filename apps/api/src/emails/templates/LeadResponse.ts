// Email enviado pro cliente (lead) quando admin responde no painel.
// Formato signature TPC com botão de WhatsApp + endereço completo.

import { BUSINESS } from '../business.js'

export interface LeadResponseProps {
  recipientName: string
  message: string
  subject?: string
  logoUrl?: string
}

const DEFAULT_SUBJECT = 'Resposta da sua solicitação · Thomas PowerChip'

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const firstName = (full: string): string => full.trim().split(/\s+/)[0] ?? full

export const buildLeadResponseEmail = ({
  recipientName,
  message,
  subject = DEFAULT_SUBJECT,
  logoUrl,
}: LeadResponseProps): { subject: string; html: string } => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const resolvedLogo =
    logoUrl ?? `${siteUrl.replace(/\/$/, '')}/_LOGO_TCP.png`

  const safeName = escapeHtml(firstName(recipientName))
  const safeBody = escapeHtml(message).replace(/\n/g, '<br/>')
  const safeSubject = escapeHtml(subject)

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;line-height:0;font-size:1px;opacity:0;">
    Resposta da sua solicitação · Thomas PowerChip. Em breve nosso time fala com você.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#0a0a0a;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background:#000000;padding:28px 32px;border-bottom:3px solid #e1261c;text-align:left;">
              <img
                src="${resolvedLogo}"
                alt="TPC Performance"
                width="140"
                style="display:block;max-width:140px;height:auto;border:0;outline:none;text-decoration:none;"
              />
            </td>
          </tr>

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

          <tr>
            <td style="padding:0 32px 32px 32px;background:#0a0a0a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#141414;border-radius:12px;border:1px solid rgba(255,255,255,0.08);">
                <tr>
                  <td style="padding:20px 22px;font-size:13px;line-height:1.6;color:#cccccc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    <div style="color:#e1261c;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-weight:600;margin-bottom:8px;">
                      ${BUSINESS.name}
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

  return { subject, html }
}
