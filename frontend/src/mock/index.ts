// Mock mode configuration and router
import { MockProvider } from './context'
import React from 'react'

export const MockApp = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(MockProvider, null, children)
}

export const isMockMode = () => {
  return import.meta.env.MODE === 'mock' || import.meta.env.VITE_MODE === 'mock'
}

// Debug function to check mock mode
export const debugMockMode = () => {
  console.log('🎭 Mock Mode Debug:')
  console.log('import.meta.env.MODE:', import.meta.env.MODE)
  console.log('import.meta.env.VITE_MODE:', import.meta.env.VITE_MODE)
  console.log('isMockMode():', isMockMode())
}
