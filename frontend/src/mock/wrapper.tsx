// Mock wrapper component that conditionally renders mock content
import { isMockMode } from '@/mock/index'
import type { PropsWithChildren } from 'react'

interface MockWrapperProps extends PropsWithChildren {
  mockComponent: React.ComponentType<any>
  normalComponent: React.ComponentType<any>
  props?: any
}

export const MockWrapper = ({ 
  mockComponent: MockComponent, 
  normalComponent: NormalComponent, 
  props = {} 
}: MockWrapperProps) => {
  if (isMockMode()) {
    return <MockComponent {...props} />
  }
  return <NormalComponent {...props} />
}

// Hook to conditionally use mock or normal components
export const useMockConditional = <T extends any>(mockValue: T, normalValue: T): T => {
  return isMockMode() ? mockValue : normalValue
}
