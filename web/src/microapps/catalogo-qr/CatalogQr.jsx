import { useEffect, useRef, useState } from 'react'
import { listWorkspaces } from '../../services/workspaces'
import { TOKEN_KEY } from '../../services/api'
import {
  getGuestToken,
  saveGuestToken,
  clearGuestToken,
  getLastGuestWorkspaceId,
  attachCatalog
} from '../../services/qrCatalog'
import { useQrCatalog } from './useQrCatalog'
import { CatalogSettings } from './CatalogSettings'
import { CatalogProducts } from './CatalogProducts'
import { CatalogCategories } from './CatalogCategories'
import { CatalogSidebar, CatalogNavigation, CatalogBrand } from './CatalogSidebar'
import { CatalogNavIcon } from './CatalogNavIcon'
import { CatalogShare } from './CatalogShare'
import { WhatsAppIcon } from './WhatsAppIcon'
import './CatalogQr.css'

export function CatalogQr({ workspaceId, onLogin, page, onNavigate }) {
  const [spaces, setSpaces] = useState(null)
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [creatingNew, setCreatingNew] = useState(false)
  const loggedIn = Boolean(localStorage.getItem(TOKEN_KEY))
  const lastGuestId = getLastGuestWorkspaceId()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('key') || params.get('token')
    if (token) {
      if (workspaceId) {
        saveGuestToken(workspaceId, token)
      }
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [workspaceId])

  useEffect(() => {
    let alive = true
    if (!loggedIn) {
      setLoadingSpaces(false)
      return
    }
    listWorkspaces()
      .then(result => {
        if (alive) {
          setSpaces(result.workspaces.filter(w => ['OWNER', 'ADMIN'].includes(w.role)))
          setLoadingSpaces(false)
        }
      })
      .catch(() => {
        if (alive) setLoadingSpaces(false)
      })
    return () => {
      alive = false
    }
  }, [loggedIn])

  const basePath =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/catalogo-qr')
      ? '/catalogo-qr/'
      : '/mi-tienda/'

  // Case 1: Specific workspace requested
  if (workspaceId) {
    const workspace = spaces?.find(w => w.id === workspaceId)
    const hasGuestToken = Boolean(getGuestToken(workspaceId))

    if (workspace) {
      return (
        <CatalogManager
          key={workspace.id}
          workspace={workspace}
          page={page}
          onNavigate={onNavigate}
          onLogin={onLogin}
          loggedIn={loggedIn}
        />
      )
    }
    if (hasGuestToken) {
      return (
        <CatalogManager
          key={workspaceId}
          workspace={{ id: workspaceId, name: 'Mi Tienda', role: 'OWNER' }}
          page={page}
          onNavigate={onNavigate}
          onLogin={onLogin}
          loggedIn={loggedIn}
          isGuestView
        />
      )
    }
    if (loadingSpaces) {
      return (
        <main className="cq cq-shell">
          <p role="status">Cargando tienda…</p>
        </main>
      )
    }
    return (
      <main className="cq cq-shell">
        <a href="/">← Inicio de mi0</a>
        <p role="alert">No tienes permisos para gestionar esta tienda o tu enlace expiró.</p>
        <button className="primary-button" onClick={() => onLogin('login')}>
          Iniciar sesión
        </button>
      </main>
    )
  }

  // Case 2: No workspaceId, user not logged in
  if (!loggedIn) {
    if (lastGuestId && !creatingNew) {
      return (
        <main className="cq cq-shell">
          <a href="/">← Inicio de mi0</a>
          <div className="cq-panel" style={{ maxWidth: 600, margin: '24px auto', textAlign: 'center' }}>
            <span className="cq-eyebrow">MI TIENDA</span>
            <h1 style={{ fontSize: 28 }}>Tienes una tienda activa</h1>
            <p>Ya creaste una tienda en este navegador. Puedes continuar editándola o crear una nueva.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
              <button
                className="primary-button"
                onClick={() => onNavigate(basePath + lastGuestId + '/productos')}
              >
                Ir a mi tienda →
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setCreatingNew(true)
                }}
              >
                Crear otra tienda gratis
              </button>
            </div>
          </div>
        </main>
      )
    }

    // Direct Lazy Creation: Opens straight into "Mi negocio" in memory draft (0 DB calls!)
    const uncreatedWorkspace = { id: null, name: 'Mi Tienda', role: 'OWNER' }
    const initialDraft = {
      isGuest: true,
      workspace: { id: null, name: '', canRename: true, publicSlug: '', suggestedSlug: 'mi-tienda' },
      catalog: null,
      categories: [],
      products: []
    }
    return (
      <CatalogManager
        key="new-guest"
        workspace={uncreatedWorkspace}
        initialData={initialDraft}
        page="negocio"
        onNavigate={onNavigate}
        onLogin={onLogin}
        loggedIn={loggedIn}
        isGuestView
      />
    )
  }

  // Case 3: Logged in user without workspaceId
  if (loadingSpaces) {
    return (
      <main className="cq cq-shell">
        <p role="status">Cargando espacios…</p>
      </main>
    )
  }

  if (creatingNew || !spaces?.length) {
    const uncreatedWorkspace = { id: null, name: 'Mi Tienda', role: 'OWNER' }
    const initialDraft = {
      isGuest: true,
      workspace: { id: null, name: '', canRename: true, publicSlug: '', suggestedSlug: 'mi-tienda' },
      catalog: null,
      categories: [],
      products: []
    }
    return (
      <CatalogManager
        key="new-account-store"
        workspace={uncreatedWorkspace}
        initialData={initialDraft}
        page="negocio"
        onNavigate={onNavigate}
        onLogin={onLogin}
        loggedIn={loggedIn}
        isGuestView
      />
    )
  }

  return (
    <main className="cq cq-shell">
      <a href="/">← Inicio de mi0</a>
      <div className="cq-space-grid-header">
        <div>
          <span className="cq-eyebrow">MI TIENDA</span>
          <h1>Elige el espacio de tu tienda</h1>
          <p>Una tienda por espacio, con tus productos y datos del negocio.</p>
        </div>
        <button className="primary-button" onClick={() => setCreatingNew(true)}>
          + Crear nueva tienda
        </button>
      </div>
      <div className="cq-space-grid">
        {spaces?.map(w => (
          <a className="cq-panel" key={w.id} href={basePath + w.id}>
            <h2>{w.name}</h2>
            <span>Configurar tienda →</span>
          </a>
        ))}
      </div>
    </main>
  )
}

const pageKeys = { productos: 'products', categorias: 'categories', negocio: 'settings', qr: 'share' }

function CatalogManager({
  workspace,
  initialData = null,
  page,
  onNavigate,
  onLogin,
  loggedIn,
  isGuestView = false
}) {
  const state = useQrCatalog(workspace.id, initialData)
  const { data } = state
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('mi0_catalog_sidebar') === 'collapsed')
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [copiedAdmin, setCopiedAdmin] = useState(false)
  const heading = useRef(null)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => setKeyboardOpen(window.innerHeight - viewport.height > 150)
    viewport.addEventListener('resize', update)
    return () => viewport.removeEventListener('resize', update)
  }, [])

  // Auto attach if coming back from login
  useEffect(() => {
    const transfer = localStorage.getItem('mi0_catalog_transfer')
    if (loggedIn && transfer && (data?.isGuest || isGuestView) && workspace.id) {
      try {
        const pending = JSON.parse(transfer)
        if (pending.workspaceId === workspace.id && pending.token) {
          attachCatalog(pending.workspaceId, pending.token)
            .then(() => {
              localStorage.removeItem('mi0_catalog_transfer')
              clearGuestToken(pending.workspaceId)
              state.reload()
            })
            .catch(() => {})
        }
      } catch {}
    }
  }, [loggedIn, data?.isGuest, isGuestView, workspace.id, state])

  const active = data && !data.catalog ? 'settings' : pageKeys[page] || 'products'
  const catalog = data?.catalog
  const business = catalog?.name || data?.workspace?.name || workspace.name || 'Tu negocio'
  const tool = catalog?.presentation === 'MENU' ? 'Carta QR' : 'Mi Tienda'
  const isGuest = Boolean(data?.isGuest || isGuestView)

  const basePath =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/catalogo-qr')
      ? '/catalogo-qr/'
      : '/mi-tienda/'

  function navigate(key, path, targetWorkspaceId) {
    const currentId = targetWorkspaceId || workspace.id
    if (!currentId) return
    if (state.busy || (!data?.catalog && key !== 'settings')) return
    const url = basePath + currentId + '/' + path
    if (onNavigate) {
      onNavigate(url)
      window.scrollTo({ top: 0, behavior: 'instant' })
      requestAnimationFrame(() => {
        const title = heading.current?.querySelector('section:not([hidden]) h2')
        if (title) {
          title.tabIndex = -1
          title.focus({ preventScroll: true })
        }
      })
    } else {
      location.href = url
    }
  }

  function collapse() {
    setCollapsed(value => {
      localStorage.setItem('mi0_catalog_sidebar', value ? 'expanded' : 'collapsed')
      return !value
    })
  }

  async function handleAttach() {
    const token = getGuestToken(workspace.id)
    if (!token) return
    if (!loggedIn) {
      localStorage.setItem('mi0_catalog_transfer', JSON.stringify({ workspaceId: workspace.id, token }))
      if (onLogin) onLogin('register')
      return
    }
    setAttaching(true)
    try {
      await attachCatalog(workspace.id, token)
      clearGuestToken(workspace.id)
      localStorage.removeItem('mi0_catalog_transfer')
      await state.reload()
    } catch (err) {
      alert(err.message || 'No se pudo vincular la tienda.')
    } finally {
      setAttaching(false)
    }
  }

  const guestToken = workspace.id ? getGuestToken(workspace.id) : null
  const adminUrl =
    workspace.id && typeof window !== 'undefined'
      ? `${window.location.origin}${basePath}${workspace.id}?key=${guestToken || ''}`
      : ''
  const waShareText = `Hola, este es mi enlace PRIVADO para editar mi tienda (${business}):\n${adminUrl}\n\n(Guarda este mensaje para no perder el acceso a la administración)`
  const phoneTarget = catalog?.whatsapp ? catalog.whatsapp.replace(/[^\d]/g, '') : ''
  const waUrl = phoneTarget
    ? `https://wa.me/${phoneTarget}?text=${encodeURIComponent(waShareText)}`
    : `https://wa.me/?text=${encodeURIComponent(waShareText)}`

  async function handleCopyAdminLink() {
    if (!adminUrl) return
    try {
      await navigator.clipboard.writeText(adminUrl)
      setCopiedAdmin(true)
      setTimeout(() => setCopiedAdmin(false), 2500)
    } catch {
      window.prompt('Copia tu enlace privado para editar:', adminUrl)
    }
  }

  const effectiveWorkspace = {
    ...workspace,
    name: data?.workspace?.name || workspace.name
  }

  return (
    <main
      className={
        'cq cq-app-shell' +
        (collapsed ? ' cq-app-collapsed' : '') +
        (keyboardOpen ? ' cq-keyboard-open' : '')
      }
    >
      <CatalogSidebar
        workspace={effectiveWorkspace}
        data={data}
        active={active}
        busy={state.busy}
        onNavigate={navigate}
        collapsed={collapsed}
        onCollapse={collapse}
      />
      <div ref={heading} className="cq-app-main">
        <header className="cq-app-mobile-header">
          <CatalogBrand name={business} logo={catalog?.logoUrl} tool={tool} />
          <a href="/" className="cq-mobile-return" aria-label="Volver a mi0">
            <CatalogNavIcon name="back" />
            <span>mi0</span>
          </a>
        </header>

        {isGuest && workspace.id && (
          <div className="cq-guest-banner" role="status">
            <div className="cq-guest-banner-text">
              <strong>⚡ Estás administrando tu tienda sin cuenta</strong>
              <p>
                Tu tienda ya está activa y pública. Para que siempre puedas volver a entrar a{' '}
                <strong>editar tus productos y precios</strong> desde cualquier celular o PC, guarda tu enlace
                privado de administración:
              </p>
            </div>
            <div className="cq-guest-banner-actions">
              <button
                type="button"
                className="secondary-button cq-btn-copy"
                onClick={handleCopyAdminLink}
                title="Copiar enlace privado para administrar"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{copiedAdmin ? '¡Enlace copiado!' : 'Copiar enlace para editar'}</span>
              </button>

              {guestToken && (
                <a className="cq-btn-wa" href={waUrl} target="_blank" rel="noreferrer" title="Enviar enlace de edición a mi WhatsApp">
                  <WhatsAppIcon />
                  <span>Enviar a mi WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                className="secondary-button cq-btn-secure"
                onClick={handleAttach}
                disabled={attaching}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>{attaching ? 'Vinculando…' : loggedIn ? 'Vincular a mi cuenta' : 'Crear cuenta gratis para asegurar'}</span>
              </button>
            </div>
          </div>
        )}

        {state.error && (
          <p className="cq-error" role="alert">
            {state.error} <button onClick={state.reload} disabled={state.busy}>Actualizar</button>
          </p>
        )}
        {state.notice && <p className="cq-notice" role="status">{state.notice}</p>}

        {!data ? (
          !state.error && <p role="status">Cargando tu tienda…</p>
        ) : (
          <>
            <section className="cq-app-section cq-panel" aria-label="Productos" hidden={active !== 'products'}>
              {catalog && <CatalogProducts workspaceId={workspace.id} data={data} state={state} />}
            </section>
            <section className="cq-app-section cq-panel" aria-label="Categorías" hidden={active !== 'categories'}>
              {catalog && <CatalogCategories workspaceId={workspace.id} data={data} state={state} />}
            </section>
            <section className="cq-app-section cq-panel cq-settings-panel" aria-label="Mi negocio" hidden={active !== 'settings'}>
              <CatalogSettings
                key={catalog?.code || 'new'}
                workspaceId={workspace.id}
                data={data}
                state={state}
                onCreated={newId => {
                  const targetUrl = basePath + newId + '/productos'
                  if (onNavigate) {
                    onNavigate(targetUrl)
                    window.scrollTo({ top: 0, behavior: 'instant' })
                  } else {
                    window.location.href = targetUrl
                  }
                }}
              />
            </section>
            <section className="cq-app-section cq-panel" aria-label="QR y enlace" hidden={active !== 'share'}>
              {catalog && <CatalogShare catalog={catalog} />}
            </section>
          </>
        )}
      </div>
      <CatalogNavigation
        workspaceId={workspace.id}
        active={active}
        disabled={!catalog}
        busy={state.busy}
        onNavigate={navigate}
        mobile
      />
    </main>
  )
}
