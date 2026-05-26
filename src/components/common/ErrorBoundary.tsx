"use client"

import { Component, ReactNode } from "react"
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
            <div className='w-16 h-16 rounded-full bg-red-500 flex items-center justify-center mb-4'>
              <svg
                className='w-8 h-8 text-white'
                fill='currentColor'
                viewBox='0 0 24 24'
              >
                <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
              </svg>
            </div>
            <h3 className='text-xl font-bold text-white mb-2'>
              {dict?.error.somethingWrong ?? "Algo salió mal"}
            </h3>
            <p className='text-gray-300 mb-4'>
              {this.state.error?.message || (dict?.error.unexpected ?? "Error inesperado")}
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className='bg-coral-vibrant text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-colors'
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
