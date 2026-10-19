export const money = (cents, currency) => new Intl.NumberFormat('es-PE', { style: 'currency', currency }).format(cents / 100)
export const statusLabel = { AVAILABLE: 'Disponible', SOLD_OUT: 'Agotado', HIDDEN: 'Oculto' }
