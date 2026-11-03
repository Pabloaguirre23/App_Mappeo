import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

export function Panel({ title, subtitle, onClose, children }: PanelProps) {
  return (
    <aside
      role="dialog"
      aria-label={title}
      className="absolute inset-x-0 bottom-0 z-[500] flex max-h-[min(62dvh,640px)] flex-col rounded-t-3xl bg-paper shadow-[0_-8px_30px_rgba(28,36,48,0.18)] md:inset-y-4 md:left-auto md:right-4 md:max-h-none md:w-[380px] md:rounded-3xl md:shadow-xl"
    >
      <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line md:hidden" />
      <header className="flex items-start gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg leading-tight font-bold">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-black/5"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </aside>
  )
}
