// Email enviado pro admin TPC quando um lead novo chega pela landing.
// Renderiza dados do lead + CTA pro painel admin.

export interface LeadAdminNotificationProps {
  name: string
  email: string
  phone?: string | null
  vehicle?: string | null
  year?: string | null
  message?: string | null
  adminUrl?: string
}

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const buildLeadAdminNotificationEmail = ({
  name,
  email,
  phone,
  vehicle,
  year,
  message,
  adminUrl,
}: LeadAdminNotificationProps): { subject: string; html: string } => {
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
        </tr>`,
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

  const html = `<!DOCTYPE html>
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

  return {
    subject: `Novo lead da landing: ${name}`,
    html,
  }
}
