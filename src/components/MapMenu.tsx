import { useEffect, useRef, useState } from 'react'

type MapMenuProps = {
  dark: boolean
  onToggleDark: () => void
  onExit: () => void
}

export function MapMenu({ dark, onToggleDark, onExit }: MapMenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="grid size-11 place-items-center rounded-xl border border-line bg-surface text-ink shadow-sm"
        aria-label="Menú"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-line bg-surface p-2 shadow-lg"
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={dark}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm font-bold hover:bg-paper"
            onClick={onToggleDark}
          >
            Modo oscuro
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full ${dark ? 'bg-ink' : 'bg-line'}`}
              aria-hidden="true"
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full ${dark ? 'left-5 bg-paper' : 'left-0.5 bg-surface'}`}
              />
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-bold hover:bg-paper"
            onClick={() => {
              setOpen(false)
              onExit()
            }}
          >
            Salir
          </button>
        </div>
      ) : null}
    </div>
  )
}
