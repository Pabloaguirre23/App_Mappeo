import { useEffect, useRef, type ReactNode } from 'react'

type PanelProps = {
  title: string
  subtitle?: string
  swipeToClose?: boolean
  onClose: () => void
  children: ReactNode
}

export function Panel({ title, subtitle, swipeToClose = false, onClose, children }: PanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const panel = panelRef.current
    const scroller = scrollerRef.current
    if (!panel || !swipeToClose) return

    let startY = 0
    let startX = 0
    let lastY = 0
    let lastTime = 0
    let velocity = 0
    let tracking = false
    let dragging = false
    let offset = 0
    let fromScroller = false
    let ignoreClick = false
    let closeTimer = 0

    function begin(x: number, y: number, time: number, target: EventTarget | null) {
      startX = x
      startY = y
      lastY = y
      lastTime = time
      velocity = 0
      offset = 0
      tracking = true
      dragging = false
      fromScroller = Boolean(scroller?.contains(target as Node))
    }

    function move(x: number, y: number, time: number, preventDefault: () => void) {
      if (!tracking) return
      const deltaY = y - startY
      const deltaX = x - startX
      const dt = time - lastTime
      if (dt > 0) velocity = (y - lastY) / dt
      lastY = y
      lastTime = time

      if (!dragging) {
        if (Math.abs(deltaY) < 8 && Math.abs(deltaX) < 8) return
        const scrollingContent = fromScroller && (scroller?.scrollTop ?? 0) > 0
        if (deltaY < 0 || Math.abs(deltaX) > Math.abs(deltaY) || scrollingContent) {
          tracking = false
          return
        }
        dragging = true
      }

      preventDefault()
      offset = deltaY
      panel.style.transition = 'none'
      panel.style.transform = `translateY(${deltaY}px)`
    }

    function end() {
      if (!tracking) return
      const shouldClose = dragging && (offset > 80 || (offset > 28 && velocity > 0.55))
      tracking = false
      dragging = false
      if (!shouldClose) {
        panel.style.transition = 'transform 180ms ease'
        panel.style.transform = ''
        return
      }
      ignoreClick = true
      panel.style.transition = 'transform 180ms ease'
      panel.style.transform = 'translateY(110%)'
      closeTimer = window.setTimeout(() => onCloseRef.current(), 180)
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      begin(touch.clientX, touch.clientY, event.timeStamp, event.target)
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      move(touch.clientX, touch.clientY, event.timeStamp, () => event.preventDefault())
    }

    function onClick(event: MouseEvent) {
      if (!ignoreClick) return
      ignoreClick = false
      event.preventDefault()
      event.stopPropagation()
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      const target = event.target
      if (target instanceof Element && target.closest('button, a, input, textarea, select')) return
      begin(event.clientX, event.clientY, event.timeStamp, event.target)
      panel.setPointerCapture(event.pointerId)
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      move(event.clientX, event.clientY, event.timeStamp, () => event.preventDefault())
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      end()
    }

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('touchmove', onTouchMove, { passive: false })
    panel.addEventListener('touchend', end)
    panel.addEventListener('touchcancel', end)
    panel.addEventListener('pointerdown', onPointerDown)
    panel.addEventListener('pointermove', onPointerMove)
    panel.addEventListener('pointerup', onPointerUp)
    panel.addEventListener('pointercancel', onPointerUp)
    panel.addEventListener('click', onClick, true)
    return () => {
      window.clearTimeout(closeTimer)
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('touchmove', onTouchMove)
      panel.removeEventListener('touchend', end)
      panel.removeEventListener('touchcancel', end)
      panel.removeEventListener('pointerdown', onPointerDown)
      panel.removeEventListener('pointermove', onPointerMove)
      panel.removeEventListener('pointerup', onPointerUp)
      panel.removeEventListener('pointercancel', onPointerUp)
      panel.removeEventListener('click', onClick, true)
    }
  }, [swipeToClose])

  return (
    <aside
      ref={panelRef}
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
          className="grid size-11 shrink-0 place-items-center rounded-xl hover:bg-ink/5"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            ×
          </span>
        </button>
      </header>
      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </aside>
  )
}
