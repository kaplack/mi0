export function ProductActionIcon({kind}) {
 return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='save'?<path d="M5 3h12l4 4v14H3V3zM7 3v6h9V3M7 21v-8h10v8"/>:kind==='undo'?<path d="m8 4-5 5 5 5M3 9h11a6 6 0 0 1 0 12"/>:kind==='remove'?<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>:<path d="m6 6 12 12M6 18 18 6"/>}</svg>
}
