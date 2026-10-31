export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Stationery/Study', 'Entertainment/Fun', 'Mobile/Data', 'Accommodation', 'Health', 'Shopping', 'Other'] as const
export const INCOME_CATEGORIES = ['Parents/Guardian', 'Tuition/Classes', 'Freelance/Projects', 'Scholarship', 'Part-time Work', 'Gift', 'Other'] as const
export const FOOD_SUBCATEGORIES = ['Breakfast', 'Lunch', 'Dinner', 'Snacks/Extras'] as const
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]
export type IncomeCategory = typeof INCOME_CATEGORIES[number]
export type FoodSubcategory = typeof FOOD_SUBCATEGORIES[number]
export type TransactionType = 'income' | 'expense'
export type Transaction = {
  id: string
  type: TransactionType
  amountCents: number
  date: string
  category: IncomeCategory | ExpenseCategory
  subcategory?: FoodSubcategory
  note?: string
  createdAt: string
}
