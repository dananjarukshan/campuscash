import { describe, expect, it } from 'vitest'
import { filterTransactions, getDailyExpenses, getRange, getTotals, inDateRange } from './analytics'
import type { Transaction } from './types'

const record = (type: Transaction['type'], amountCents: number, date: string, category = 'Other'): Transaction => ({ id: `${type}-${amountCents}-${date}`, type, amountCents, date, category: category as Transaction['category'], createdAt: `${date}T10:00:00` })

describe('analytics', () => {
  const records = [record('income', 500000, '2026-10-12', 'Parents/Guardian'), record('expense', 28000, '2026-10-12', 'Food'), record('expense', 15000, '2026-10-13', 'Transport')]
  it('calculates allowance, lunch and transport net as LKR 4,570', () => expect(getTotals(records).net).toBe(457000))
  it('uses inclusive local calendar date bounds', () => { const range = { start: '2026-10-12', end: '2026-10-12' }; expect(records.filter(t => inDateRange(t.date, range))).toHaveLength(2) })
  it('starts weekly ranges on Monday', () => expect(getRange('week', new Date(2026, 9, 14))).toEqual({ start: '2026-10-12', end: '2026-10-14' }))
  it('fills each day in the selected range', () => expect(getDailyExpenses(records, { start: '2026-10-12', end: '2026-10-14' })).toEqual([{ date: '2026-10-12', expense: 28000 }, { date: '2026-10-13', expense: 15000 }, { date: '2026-10-14', expense: 0 }]))
  it('filters by type, category, subcategory, dates and note text', () => {
    const food = { ...records[1], subcategory: 'Lunch' as const, note: 'rice and curry' }
    expect(filterTransactions([...records, food], { type: 'expense', category: 'Food', subcategory: 'Lunch', start: '2026-10-12', end: '2026-10-12', note: 'RICE' })).toEqual([food])
  })
})
