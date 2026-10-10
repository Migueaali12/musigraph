"use client"

import { useSyncExternalStore } from "react"

const QUERY = "(prefers-color-scheme: dark)"

let mediaQueryList: MediaQueryList | null = null
function getMediaQueryList(): MediaQueryList {
  if (!mediaQueryList) mediaQueryList = window.matchMedia(QUERY)
  return mediaQueryList
}

function subscribe(onStoreChange: () => void) {
  const mql = getMediaQueryList()
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

export function useSystemPrefersDark() {
  return useSyncExternalStore(
    subscribe,
    () => getMediaQueryList().matches,
    () => false
  )
}
