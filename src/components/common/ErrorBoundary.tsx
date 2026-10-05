"use client"

import { Component, ReactNode } from "react"
import { AlertTriangle } from "lucide-react"
import type { Dictionary } from "@/dictionaries/getDictionary"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  dict?: Dictionary
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const dict = this.props.dict
      return (
        this.props.fallback || (
          <div className='flex flex-col items-center justify-center p-8 text-center'>
            <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-elevated'>
              <AlertTriangle className='h-8 w-8 text-coral-deep dark:text-coral-vibrant' />
            </div>
            <h3 className='mb-2 text-xl font-bold text-foreground'>
              {dict?.error.somethingWrong ?? "Algo salió mal"}
            </h3>
            <p className='mb-4 text-muted-foreground'>
              {this.state.error?.message || (dict?.error.unexpected ?? "Error inesperado")}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className='rounded-lg bg-coral-deep px-4 py-2 text-white transition-colors hover:bg-coral-deep/90'
            >
              {dict?.error.tryAgain ?? "Intentar de nuevo"}
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}
