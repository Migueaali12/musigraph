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
            <AlertTriangle
              className='mb-4 h-5 w-5 text-accent'
              strokeWidth={1.5}
              aria-hidden='true'
            />
            <h3 className='mb-2 text-lg font-bold'>
              {dict?.error.somethingWrong ?? "Algo salió mal"}
            </h3>
            <p className='mb-4 text-[13px] text-muted'>
              {this.state.error?.message || (dict?.error.unexpected ?? "Error inesperado")}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className='btn btn-primary'
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
