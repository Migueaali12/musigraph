"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Check, ChevronDown } from "lucide-react"

export interface SelectOption {
  value: string
  label: string
  /** Short label shown on the trigger button (defaults to `label`) */
  display?: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  id?: string
  ariaLabel?: string
  icon?: ReactNode
  align?: "left" | "right"
  disabled?: boolean
  className?: string
}

/**
 * Custom listbox select, matching the header language switcher.
 * Native <select> elements are not used anywhere in the UI.
 */
export function Select({
  value,
  onChange,
  options,
  id,
  ariaLabel,
  icon,
  align = "left",
  disabled,
  className = "",
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return

    const handlePointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  const selected = options.find((opt) => opt.value === value)

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type='button'
        onClick={() => setOpen((prev) => !prev)}
        className='control w-full justify-between'
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span className='flex min-w-0 items-center gap-2'>
          {icon}
          <span className='truncate'>{selected?.display ?? selected?.label ?? ""}</span>
        </span>
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          aria-hidden='true'
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role='listbox'
          aria-label={ariaLabel}
          className={`absolute top-full z-50 mt-2 max-h-72 min-w-full overflow-y-auto rounded-sm border border-border bg-surface py-1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((opt) => {
            const isActive = opt.value === value
            return (
              <button
                key={opt.value}
                type='button'
                role='option'
                aria-selected={isActive}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
                className={`flex w-full items-center gap-3 whitespace-nowrap px-3 py-2 text-left text-[13px] transition-colors hover:bg-surface-elevated ${
                  isActive ? "font-bold text-accent" : "text-foreground"
                }`}
              >
                <span>{opt.label}</span>
                {isActive && (
                  <Check
                    size={13}
                    strokeWidth={1.5}
                    aria-hidden='true'
                    className='ml-auto text-accent'
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
