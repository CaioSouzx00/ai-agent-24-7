import { describe, expect, it } from 'vitest'
import { formatNumber, formatRelativeTime, truncate } from './formatters'

describe('Formatters unit tests', () => {
  it('formats numbers with thousands separators', () => {
    expect(formatNumber(12500)).toBe('12,500')
    expect(formatNumber(0)).toBe('0')
  })

  it('truncates long strings properly', () => {
    expect(truncate('Hello world', 5)).toBe('Hello…')
    expect(truncate('Short', 10)).toBe('Short')
    expect(truncate('', 5)).toBe('')
  })

  it('formats relative time', () => {
    const now = Math.floor(Date.now() / 1000)
    expect(formatRelativeTime(now)).toBe('just now')
    expect(formatRelativeTime(now - 120)).toBe('2m ago')
    expect(formatRelativeTime(now - 7200)).toBe('2h ago')
  })
})
