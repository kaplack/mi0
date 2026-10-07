export function MicroappCard({ tool, onOpen }) {
  return (
    <article className="tool-card">
      <div className={'tool-icon ' + tool.tone}>{tool.icon}</div>
      <span className={'tag ' + tool.tone}>{tool.category}</span>
      <h3>{tool.title}</h3>
      <p>{tool.description}</p>
      {tool.available ? (
        <button className="tool-open-button" type="button" onClick={() => onOpen(tool.code)}>Abrir →</button>
      ) : (
        <span className="tool-coming-soon">Próximamente</span>
      )}
    </article>
  )
}
