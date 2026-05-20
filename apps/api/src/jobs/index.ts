// Importar aqui garante que cada defineJob() roda e popula o registry
// antes do worker iniciar.
import './notify-whatsapp.js'
import './notify-email.js'
import './expire-reservation.js'

export { NOTIFY_WHATSAPP_JOB, type NotifyWhatsappData } from './notify-whatsapp.js'
export { NOTIFY_EMAIL_JOB, type NotifyEmailData } from './notify-email.js'
export { EXPIRE_RESERVATION_JOB } from './expire-reservation.js'

export { scheduleRepeatable, startNotificationsWorker } from '../lib/queue.js'
