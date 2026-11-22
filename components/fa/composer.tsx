'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

// Auto-growing message box used by the Business Idea Validator's advisor chat.
// Enter sends, Shift + Enter adds a new line.
export function Composer({ placeholder, disabled, onSend }: { placeholder: string; disabled: boolean; onSend: (t: string) => void }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const grow = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(200, el.scrollHeight)}px`
  }
  useEffect(grow, [text])
  useEffect(() => {
    if (!disabled && window.matchMedia('(min-width: 768px)').matches) ref.current?.focus({ preventScroll: true })
  }, [disabled, placeholder])
  const send = () => {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
  }
  return (
    <form
      className={`flex items-end gap-2 rounded-lg border bg-[#111] p-2 transition-colors ${disabled ? 'border-gray-800' : 'border-gray-700 focus-within:border-[#D4A017]'}`}
      onSubmit={(e) => {
        e.preventDefault()
        send()
      }}
    >
      <label htmlFor="fa-composer" className="sr-only">Message HumanFirst AI</label>
      <textarea
        id="fa-composer"
        ref={ref}
        rows={1}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            send()
          }
        }}
        maxLength={2000}
        placeholder={placeholder}
        className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-sm md:text-base text-white placeholder:text-gray-500 focus:outline-none disabled:cursor-not-allowed"
      />
      <button type="submit" disabled={disabled || !text.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[#D4A017] text-black transition-all duration-300 hover:opacity-90 disabled:opacity-40">
        <ArrowUp className="h-5 w-5" />
      </button>
    </form>
  )
}
