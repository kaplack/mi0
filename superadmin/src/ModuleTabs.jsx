import { useRef } from 'react'

function TabIcon({ kind }) {
  const paths = {
    publications: <><path d="M5 3h10l4 4v14H5Z" /><path d="M14 3v5h5M8 12h8M8 16h6" /></>,
    payments: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 8V5l14-3v3m-1 7h5v5h-5Z" /></>,
    profile: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 3-3 6 6" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="currentColor" /><circle cx="15" cy="12" r="2" fill="currentColor" /><circle cx="9" cy="18" r="2" fill="currentColor" /></>,
  }
  return <svg className="module-tab-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>
}

export function ModuleTabs({ tabs, activeTab, onChange }) {
  const listRef = useRef(null)
  function handleKeyDown(event, index) {
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    else return
    event.preventDefault()
    onChange(tabs[next].key)
    listRef.current.querySelectorAll('[role="tab"]')[next].focus()
  }
  return <div className="module-tabs" role="tablist" aria-label="Gestión de la microapp" ref={listRef}>
    {tabs.map((tab, index) => <button type="button" role="tab" key={tab.key} id={`module-tab-${tab.key}`} title={tab.label} aria-label={tab.count != null ? `${tab.label}, ${tab.count} pendientes` : tab.label} aria-controls={`module-panel-${tab.key}`} aria-selected={activeTab === tab.key} tabIndex={activeTab === tab.key ? 0 : -1} onClick={() => onChange(tab.key)} onKeyDown={event => handleKeyDown(event, index)}>
      <TabIcon kind={tab.key} /><span className="module-tab-label">{tab.label}</span>{tab.count != null && <span className="tab-count" aria-label={`${tab.count} pendientes`}>{tab.count}</span>}
    </button>)}
  </div>
}
