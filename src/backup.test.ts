import { describe, expect, it } from 'vitest'
import { parseBackup } from './backup'

const valid = JSON.stringify({ app: 'CampusCash', version: 1, exportedAt: '2026-10-31T00:00:00.000Z', transactions: [{ id: 'one', type: 'expense', amountCents: 100, date: '2026-10-31', category: 'Food', subcategory: 'Lunch', createdAt: '2026-10-31T00:00:00.000Z' }], preferences: {} })
describe('backup validation', () => {
  it('accepts a valid versioned backup', () => expect(parseBackup(valid, new Set()).payload?.transactions).toHaveLength(1))
  it('accepts a UTF-8 BOM commonly added by Windows editors', () => expect(parseBackup(`\uFEFF${valid}`, new Set()).payload?.transactions).toHaveLength(1))
  it('rejects malformed schemas and reports duplicate IDs', () => { expect(parseBackup('{"app":"Other"}', new Set()).error).toBeTruthy(); expect(parseBackup(valid, new Set(['one'])).duplicateIds).toBe(1) })
})
