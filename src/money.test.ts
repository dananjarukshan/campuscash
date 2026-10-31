import { describe, expect, it } from 'vitest'
import { parseAmountToCents } from './money'
describe('parseAmountToCents', () => {
  it('converts valid LKR input to integer cents', () => { expect(parseAmountToCents('1,250.50')).toBe(125050) })
  it('rejects zero, negative and excessive precision', () => { expect(parseAmountToCents('0')).toBeNull(); expect(parseAmountToCents('-2')).toBeNull(); expect(parseAmountToCents('2.999')).toBeNull() })
})
