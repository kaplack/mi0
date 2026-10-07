export const tools = [
  { code: 'sorteos', icon: '★', title: 'Sorteos', description: 'Elige un ganador al azar de forma rápida y gratis.', category: 'Utilidades', tone: 'mint', available: true },
]

export const categories = ['Todas', ...new Set(tools.map((tool) => tool.category))]
