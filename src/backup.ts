import { EXPENSE_CATEGORIES, FOOD_SUBCATEGORIES, INCOME_CATEGORIES, type Transaction } from './types'

export const BACKUP_VERSION = 1
export const MAX_BACKUP_BYTES = 2_000_000
export type BackupPayload = { app: 'CampusCash'; version: number; exportedAt: string; transactions: Transaction[]; preferences: { rangePreset?: string; customRange?: { start: string; end: string } } }
export type ImportResult = { payload?: BackupPayload; error?: string; duplicateIds: number }
const datePattern = /^\d{4}-\d{2}-\d{2}$/
const dateIsValid = (date: string) => {
  if (!datePattern.test(date)) return false
  const [year, month, day] = date.split('-').map(Number)
  const local = new Date(year, month - 1, day)
  return local.getFullYear() === year && local.getMonth() === month - 1 && local.getDate() === day
}
const isTransaction = (value: unknown): value is Transaction => {
  if (!value || typeof value !== 'object') return false
  const t = value as Partial<Transaction>
  const categoryIsValid = t.type === 'expense' ? typeof t.category === 'string' && EXPENSE_CATEGORIES.includes(t.category as typeof EXPENSE_CATEGORIES[number]) : typeof t.category === 'string' && INCOME_CATEGORIES.includes(t.category as typeof INCOME_CATEGORIES[number])
  const foodIsValid = t.category === 'Food' ? t.type === 'expense' && typeof t.subcategory === 'string' && FOOD_SUBCATEGORIES.includes(t.subcategory as typeof FOOD_SUBCATEGORIES[number]) : t.subcategory === undefined
  return typeof t.id === 'string' && t.id.length > 0 && (t.type === 'income' || t.type === 'expense') && typeof t.amountCents === 'number' && Number.isSafeInteger(t.amountCents) && t.amountCents > 0 && typeof t.date === 'string' && dateIsValid(t.date) && categoryIsValid && typeof t.createdAt === 'string' && (t.note === undefined || (typeof t.note === 'string' && t.note.length <= 500)) && foodIsValid
}
export const parseBackup = (text: string, existingIds: Set<string>): ImportResult => {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) return { error: 'Backup file is too large. The maximum size is 2 MB.', duplicateIds: 0 }
  try {
    const value: unknown = JSON.parse(text.replace(/^\uFEFF/, ''))
    if (!value || typeof value !== 'object') return { error: 'Backup must contain a JSON object.', duplicateIds: 0 }
    const payload = value as Partial<BackupPayload>
    if (payload.app !== 'CampusCash' || payload.version !== BACKUP_VERSION || !Array.isArray(payload.transactions) || !payload.transactions.every(isTransaction)) return { error: 'This file is not a valid CampusCash backup.', duplicateIds: 0 }
    const unique = new Set<string>()
    const transactions = payload.transactions.filter(t => { if (unique.has(t.id)) return false; unique.add(t.id); return true })
    return { payload: { app: 'CampusCash', version: BACKUP_VERSION, exportedAt: typeof payload.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString(), transactions, preferences: payload.preferences ?? {} }, duplicateIds: transactions.filter(t => existingIds.has(t.id)).length }
  } catch { return { error: 'The backup file could not be read as JSON.', duplicateIds: 0 } }
}
