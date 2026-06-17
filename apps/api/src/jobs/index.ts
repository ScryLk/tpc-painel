// Importar aqui garante que cada defineJob() roda e popula o registry
// antes do worker iniciar.
import './notify-whatsapp.js'
import './notify-email.js'
import './expire-reservation.js'
import './export-user-data.js'
import './execute-account-deletion.js'
import './send-marketing-campaign.js'

export { NOTIFY_WHATSAPP_JOB, type NotifyWhatsappData } from './notify-whatsapp.js'
export { NOTIFY_EMAIL_JOB, type NotifyEmailData } from './notify-email.js'
export { EXPIRE_RESERVATION_JOB } from './expire-reservation.js'
export {
  EXPORT_USER_DATA_JOB,
  type ExportUserDataPayload,
} from './export-user-data.js'
export { EXECUTE_ACCOUNT_DELETION_JOB } from './execute-account-deletion.js'
export {
  SEND_MARKETING_CAMPAIGN_JOB,
  type SendMarketingCampaignData,
} from './send-marketing-campaign.js'

export {
  scheduleCron,
  scheduleRepeatable,
  startNotificationsWorker,
} from '../lib/queue.js'
