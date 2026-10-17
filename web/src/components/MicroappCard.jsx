import { MicroappIcon } from './MicroappIcon'
export function MicroappCard({ tool, onOpen }) {
  return (
    <article className="tool-card home-tool-card">
      <div className="tool-card-heading"><a href={'/microapps/' + tool.code} className={'tool-icon ' + tool.tone} aria-label={'Ver detalles de ' + tool.title}><MicroappIcon url={tool.iconUrl} fallback={tool.icon} /></a>
      <span className={'tag ' + tool.tone}>{tool.category}</span></div>
      <h3><a href={'/microapps/' + tool.code}>{tool.title}</a></h3>
      <p>{tool.description}</p>
      {tool.available ? (
        <div className="tool-card-actions"><button className="tool-open-button" type="button" onClick={() => onOpen(tool.code)}>Usar microapp →</button><a className="tool-details-link" href={'/microapps/' + tool.code}>Ver detalles</a></div>
      ) : (
        <span className="tool-coming-soon">Próximamente</span>
      )}
    </article>
  )
}
