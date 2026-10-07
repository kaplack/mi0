export const tools = [
  { code: 'sorteos', icon: '★', title: 'Sorteos', description: 'Elige un ganador al azar de forma rápida y gratis.', category: 'Utilidades', tone: 'mint', available: true },
  { code: 'sorteos-avanzado', icon: '★', title: 'Sorteos Avanzado', description: 'Varios premios y resultados guardados. Gratis con cuenta; publica por S/4.90.', category: 'Utilidades', tone: 'violet', available: true },
]

export const categories = ['Todas', ...new Set(tools.map((tool) => tool.category))]