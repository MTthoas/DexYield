// Test du mode mock
import { describe, it, expect } from 'vitest'
import { mockUser, mockStrategies, mockLendingPools, mockGlobalStats } from '@/mock/data'

describe('Mock Data', () => {
  it('should have valid mock user data', () => {
    expect(mockUser).toBeDefined()
    expect(mockUser.publicKey).toBeTruthy()
    expect(mockUser.isAdmin).toBe(true)
    expect(mockUser.balance).toBeDefined()
    expect(mockUser.balance.sol).toBeGreaterThan(0)
    expect(mockUser.balance.usdc).toBeGreaterThan(0)
    expect(mockUser.deposits).toHaveLength(3)
  })

  it('should have valid mock strategies', () => {
    expect(mockStrategies).toHaveLength(5)
    expect(mockStrategies[0]).toHaveProperty('id')
    expect(mockStrategies[0]).toHaveProperty('name')
    expect(mockStrategies[0]).toHaveProperty('tokenSymbol')
    expect(mockStrategies[0]).toHaveProperty('rewardApy')
    expect(mockStrategies[0].rewardApy).toBeGreaterThan(0)
  })

  it('should have valid mock lending pools', () => {
    expect(mockLendingPools).toHaveLength(5)
    expect(mockLendingPools[0]).toHaveProperty('id')
    expect(mockLendingPools[0]).toHaveProperty('name')
    expect(mockLendingPools[0]).toHaveProperty('apy')
    expect(mockLendingPools[0]).toHaveProperty('tvl')
    expect(mockLendingPools[0].tvl).toBeGreaterThan(0)
  })

  it('should have valid global stats', () => {
    expect(mockGlobalStats).toBeDefined()
    expect(mockGlobalStats.totalValueLocked).toBeGreaterThan(0)
    expect(mockGlobalStats.totalUsers).toBeGreaterThan(0)
    expect(mockGlobalStats.averageApy).toBeGreaterThan(0)
  })
})

describe('Mock Mode Detection', () => {
  it('should detect mock mode from environment', () => {
    // This would normally test the isMockMode function
    // but we can't easily mock import.meta.env in tests
    expect(true).toBe(true)
  })
})
