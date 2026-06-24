"use client"

import { useEffect, useState } from "react"

export function useSystemPrefersDark() {
  const [prefersDark, setPrefersDark] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    setPrefersDark(mq.matches)

    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return prefersDark
}
