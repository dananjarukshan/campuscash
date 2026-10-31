import type { Transaction, TransactionType } from './types'

export type DateRange = { start: string; end: string }
export type RangePreset = 'today' | 'week' | 'month' | 'custom'
export type TransactionFilters = {
  type: 'all' | TransactionType
  category: string
  subcategory: string
  start: string
  end: string
  note: string
}

const dateValue = (date: string) => new Date(`${date}T00:00:00`)
const formatLocal = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const getRange = (preset: RangePreset, today = new Date(), custom: DateRange = { start: formatLocal(today), end: formatLocal(today) }): DateRange => {
  const end = formatLocal(today)
  if (preset === 'today') return { start: end, end }
  if (preset === 'custom') return custom
  const start = new Date(today.getFullYear(), today.getMonth(), preset === 'week' ? today.getDate() - ((today.getDay() + 6) % 7) : 1)
  return { start: formatLocal(start), end }
}

export const inDateRange = (date: string, range: DateRange) => date >= range.start && date <= range.end
export const filterTransactions = (transactions: Transaction[], filters: TransactionFilters) => transactions.filter(t => (
  (filters.type === 'all' || t.type === filters.type) &&
  (!filters.category || t.category === filters.category) &&
  (!filters.subcategory || t.subcategory === filters.subcategory) &&
  (!filters.start || t.date >= filters.start) &&
  (!filters.end || t.date <= filters.end) &&
  (!filters.note || (t.note ?? '').toLocaleLowerCase().includes(filters.note.toLocaleLowerCase()))
))

export const getTotals = (transactions: Transaction[]) => transactions.reduce((totals, transaction) => {
  if (transaction.type === 'income') totals.income += transaction.amountCents
  else totals.expense += transaction.amountCents
  totals.net = totals.income - totals.expense
  return totals
}, { income: 0, expense: 0, net: 0 })

export const getCategoryBreakdown = (transactions: Transaction[]) => {
  const values = new Map<string, number>()
  transactions.filter(t => t.type === 'expense').forEach(t => values.set(t.category, (values.get(t.category) ?? 0) + t.amountCents))
  return Array.from(values, ([name, value]) => ({ name, value }))
}

export const getDailyExpenses = (transactions: Transaction[], range: DateRange) => {
  const values: { date: string; expense: number }[] = []
  for (let cursor = dateValue(range.start); formatLocal(cursor) <= range.end; cursor.setDate(cursor.getDate() + 1)) values.push({ date: formatLocal(cursor), expense: 0 })
  const byDate = new Map(values.map(value => [value.date, value]))
  transactions.filter(t => t.type === 'expense' && inDateRange(t.date, range)).forEach(t => { const day = byDate.get(t.date); if (day) day.expense += t.amountCents })
  return values
}

export const defaultFilters = (): TransactionFilters => ({ type: 'all', category: '', subcategory: '', start: '', end: '', note: '' })
