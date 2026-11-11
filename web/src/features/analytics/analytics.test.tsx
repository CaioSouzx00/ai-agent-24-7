import { describe, expect, it } from 'vitest'
import { delta, errorRamp, fmtCompact, fmtDuration, fmtPct } from './lib/format'
import { mergeSeries, pivotTimeseries } from './components/timeseries-chart'
import { useAnalyticsStore } from './store/analytics-store'

describe('analytics formatters & helpers', () => {
  it('formats compact numbers, percentages, durations and deltas', () => {
    expect(fmtCompact(null)).toBe('—')
    expect(fmtCompact(42)).toBe('42')
    expect(fmtCompact(1250)).toBe('1.3k')
    expect(fmtCompact(2_400_000)).toBe('2.4M')

    expect(fmtPct(0.842)).toBe('84.2%')
    expect(fmtPct(null)).toBe('—')

    expect(fmtDuration(0.45)).toBe('450ms')
    expect(fmtDuration(2.34)).toBe('2.34s')
    expect(fmtDuration(125)).toBe('2m 05s')

    expect(delta(120, 100)).toBeCloseTo(0.2)
    expect(delta(100, 0)).toBeNull()

    expect(errorRamp(0.01)).toBe('#D4FF00')
    expect(errorRamp(0.05)).toBe('#FFB000')
    expect(errorRamp(0.15)).toBe('#FF3B30')
  })

  it('pivots and merges time series responses', () => {
    const pivoted = pivotTimeseries(
      {
        metric: 'requests',
        period: '1h',
        step_seconds: 300,
        start: 1000,
        end: 1600,
        group_by: 'channel',
        points: [
          { ts: 1000, value: 5, labels: { channel: 'slack' } },
          { ts: 1000, value: 3, labels: { channel: 'whatsapp' } },
          { ts: 1300, value: 8, labels: { channel: 'slack' } },
        ],
      },
      'channel'
    )
    expect(pivoted.keys).toEqual(['slack', 'whatsapp'])
    expect(pivoted.rows).toHaveLength(2)
    expect(pivoted.rows[0]).toEqual({ ts: 1000, slack: 5, whatsapp: 3 })

    const merged = mergeSeries({
      p50: {
        metric: 'latency_p50',
        period: '1h',
        step_seconds: 300,
        start: 1000,
        end: 1300,
        group_by: null,
        points: [{ ts: 1000, value: 0.4 }],
      },
      p95: {
        metric: 'latency_p95',
        period: '1h',
        step_seconds: 300,
        start: 1000,
        end: 1300,
        group_by: null,
        points: [{ ts: 1000, value: 1.8 }],
      },
    })
    expect(merged).toEqual([{ ts: 1000, p50: 0.4, p95: 1.8 }])
  })

  it('manages cross-filters and zoom state in zustand store', () => {
    const store = useAnalyticsStore.getState()
    store.setChannel('whatsapp')
    store.setOutcomeFilter('handoff')
    store.setRange({ from: 100, to: 200 })
    expect(useAnalyticsStore.getState().channel).toBe('whatsapp')
    expect(useAnalyticsStore.getState().outcomeFilter).toBe('handoff')
    expect(useAnalyticsStore.getState().range).toEqual({ from: 100, to: 200 })

    store.setPeriod('7d')
    expect(useAnalyticsStore.getState().range).toBeNull()
    expect(useAnalyticsStore.getState().period).toBe('7d')

    store.clearCrossFilters()
    expect(useAnalyticsStore.getState().channel).toBe('all')
    expect(useAnalyticsStore.getState().outcomeFilter).toBeNull()
  })
})

