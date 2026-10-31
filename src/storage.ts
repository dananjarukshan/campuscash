import type { Transaction } from './types'
const KEY = 'campuscash.transactions'
const VERSION = 1
type Envelope = { version: number; transactions: Transaction[] }
export const loadTransactions = (): { transactions: Transaction[]; error?: string } => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { transactions: [] }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || (parsed as Envelope).version !== VERSION || !Array.isArray((parsed as Envelope).transactions)) return { transactions: [], error: 'Stored data was not recognised. Your existing records were left untouched.' }
    return { transactions: (parsed as Envelope).transactions }
  } catch {
    return { transactions: [], error: 'Stored records could not be read. Your existing data was left untouched.' }
  }
}
export const saveTransactions = (transactions: Transaction[]): string | undefined => {
  try { localStorage.setItem(KEY, JSON.stringify({ version: VERSION, transactions } satisfies Envelope)) }
  catch { return 'Could not save this change. Your browser storage may be full; existing records were kept.' }
}
