export const citaStates = { PENDING: 'Pendiente de confirmación', CONFIRMED: 'Confirmada', CANCELLED: 'Cancelada', EXPIRED: 'Vencida' }
export function dateLabel(instant, timezone, withDate = true) {
  return new Intl.DateTimeFormat('es-PE', { timeZone: timezone, ...(withDate ? { day: 'numeric', month: 'short', year: 'numeric' } : {}), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(instant))
}
export const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const minuteLabel = minute => String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0')
export const timeMinute = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

export const citaPages = { agenda: 'Agenda', pendientes: 'Pendientes', profesionales: 'Profesionales', configuracion: 'Configuración', qr: 'QR y enlace' }
