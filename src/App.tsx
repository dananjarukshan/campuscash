import { useMemo, useRef, useState } from 'react'
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { defaultFilters, filterTransactions, getCategoryBreakdown, getDailyExpenses, getRange, getTotals, inDateRange, type DateRange, type RangePreset, type TransactionFilters } from './analytics'
import { BACKUP_VERSION, MAX_BACKUP_BYTES, parseBackup, type BackupPayload } from './backup'
import { todayLocal, formatDate } from './date'
import { formatLkr, parseAmountToCents } from './money'
import { loadTransactions, saveTransactions } from './storage'
import { EXPENSE_CATEGORIES, FOOD_SUBCATEGORIES, INCOME_CATEGORIES, type Transaction, type TransactionType } from './types'

type Form = { type: TransactionType; amount: string; date: string; category: Transaction['category']; subcategory: string; note: string }
const emptyForm = (type: TransactionType = 'expense'): Form => ({ type, amount: '', date: todayLocal(), category: type === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0], subcategory: '', note: '' })
const rangeLabel = (preset: RangePreset) => ({ today: 'Today', week: 'This Week (Monday start)', month: 'This Month', custom: 'Custom Date Range' })[preset]
const colours = ['#0f766e', '#f59e0b', '#2563eb', '#db2777', '#7c3aed', '#16a34a', '#ea580c', '#475569', '#0891b2']

function App() {
  const initial = loadTransactions()
  const [transactions, setTransactions] = useState<Transaction[]>(initial.transactions)
  const [notice, setNotice] = useState(initial.error ?? '')
  const [storageHealthy, setStorageHealthy] = useState(!initial.error)
  const [form, setForm] = useState<Form>(emptyForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [preset, setPreset] = useState<RangePreset>('month')
  const [customRange, setCustomRange] = useState<DateRange>({ start: todayLocal(), end: todayLocal() })
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters())
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLElement>(null)
  const amountInputRef = useRef<HTMLInputElement>(null)
  const range = useMemo(() => getRange(preset, new Date(), customRange), [preset, customRange])
  const ranged = useMemo(() => transactions.filter(t => inDateRange(t.date, range)), [transactions, range])
  const totals = useMemo(() => getTotals(ranged), [ranged])
  const breakdown = useMemo(() => getCategoryBreakdown(ranged), [ranged])
  const daily = useMemo(() => getDailyExpenses(ranged, range), [ranged, range])
  const visible = useMemo(() => filterTransactions(transactions, filters).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)), [transactions, filters])

  const update = (next: Transaction[]) => {
    setTransactions(next)
    if (!storageHealthy) { setNotice('Stored data could not be read, so this change cannot be saved. Existing records were not overwritten.'); return }
    const error = saveTransactions(next); setNotice(error ?? ''); if (error) setStorageHealthy(false)
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const amountCents = parseAmountToCents(form.amount)
    if (!amountCents || !dateIsValid(form.date) || !form.category || (form.type === 'expense' && form.category === 'Food' && !form.subcategory) || form.note.length > 500) { setNotice('Please check the form fields and try again.'); return }
    const record: Transaction = { id: editingId ?? crypto.randomUUID(), type: form.type, amountCents, date: form.date, category: form.category, ...(form.subcategory ? { subcategory: form.subcategory as Transaction['subcategory'] } : {}), ...(form.note ? { note: form.note } : {}), createdAt: editingId ? transactions.find(t => t.id === editingId)?.createdAt ?? new Date().toISOString() : new Date().toISOString() }
    update(editingId ? transactions.map(t => t.id === editingId ? record : t) : [record, ...transactions]); setForm(emptyForm(form.type)); setEditingId(null)
  }
  const edit = (t: Transaction) => { setForm({ type: t.type, amount: (t.amountCents / 100).toFixed(2), date: t.date, category: t.category, subcategory: t.subcategory ?? '', note: t.note ?? '' }); setEditingId(t.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const remove = (id: string) => { if (window.confirm('Delete this transaction? This cannot be undone.')) update(transactions.filter(t => t.id !== id)) }
  const exportBackup = () => {
    const payload: BackupPayload = { app: 'CampusCash', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), transactions, preferences: { rangePreset: preset, customRange } }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `campuscash-backup-${todayLocal()}.json`; anchor.click(); URL.revokeObjectURL(url)
  }
  const importBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
    if (file.size > MAX_BACKUP_BYTES) { setNotice('Backup file is too large. The maximum size is 2 MB.'); return }
    setImporting(true)
    try {
      const result = parseBackup(await file.text(), new Set(transactions.map(t => t.id)))
      if (result.error || !result.payload) { setNotice(result.error ?? 'Backup could not be imported.'); return }
      const mode = window.prompt(`Import ${result.payload.transactions.length} records. Type "merge" to add new records, or "replace" to replace all current records.`)?.toLowerCase()
      if (mode !== 'merge' && mode !== 'replace') return
      if (!window.confirm(`Confirm ${mode} import? Existing records will be ${mode === 'replace' ? 'replaced' : 'kept where IDs match'}.`)) return
      const imported = mode === 'replace' ? result.payload.transactions : [...transactions, ...result.payload.transactions.filter(t => !transactions.some(existing => existing.id === t.id))]
      update(imported)
      if (result.payload.preferences.rangePreset && ['today', 'week', 'month', 'custom'].includes(result.payload.preferences.rangePreset)) setPreset(result.payload.preferences.rangePreset as RangePreset)
      if (result.payload.preferences.customRange?.start && result.payload.preferences.customRange?.end) setCustomRange(result.payload.preferences.customRange)
      setNotice(`Imported ${result.payload.transactions.length} records. ${result.duplicateIds} duplicate IDs were skipped during merge.`)
    } catch { setNotice('The backup file could not be read. Please choose a valid CampusCash JSON backup.') }
    finally { setImporting(false) }
  }
  const clearFilters = () => setFilters(defaultFilters())
  const focusAddExpense = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => amountInputRef.current?.focus(), 250)
  }
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5"><div><p className="text-sm font-bold uppercase tracking-widest text-teal-700">CampusCash</p><h1 className="text-2xl font-black tracking-tight">Your money, made clear.</h1></div><div className="flex items-center gap-2"><button className="primary cta-button" onClick={focusAddExpense}>Add Expense</button><span className="hidden rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 sm:inline">LKR tracker</span></div></div></header>
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="notice" role="status"><strong>Private by design.</strong> Records stay in this browser only. They are never uploaded, do not sync across devices, and can be lost when browser storage is cleared.</div>
      {notice && <div className="alert" role="alert">{notice}<button className="ml-3 underline" onClick={() => setNotice('')}>Dismiss</button></div>}
      <section className="card"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="section-title">Analytics</h2><p className="muted">All summaries below cover <strong>{rangeLabel(preset)}</strong>: {range.start} to {range.end}.</p></div><div className="flex flex-wrap gap-2">{(['today', 'week', 'month', 'custom'] as RangePreset[]).map(option => <button key={option} className={`range-btn ${preset === option ? 'selected' : ''}`} onClick={() => setPreset(option)}>{rangeLabel(option)}</button>)}</div></div>
        {preset === 'custom' && <div className="mb-4 grid gap-3 sm:grid-cols-2"><label>Start date<input type="date" value={customRange.start} onChange={e => setCustomRange({ ...customRange, start: e.target.value })} /></label><label>End date<input type="date" value={customRange.end} min={customRange.start} onChange={e => setCustomRange({ ...customRange, end: e.target.value })} /></label></div>}
        <div className="grid gap-3 sm:grid-cols-3"><Summary label={`Total income · ${rangeLabel(preset)}`} value={totals.income} tone="income" /><Summary label={`Total expense · ${rangeLabel(preset)}`} value={totals.expense} tone="expense" /><Summary label={`Net balance · ${rangeLabel(preset)}`} value={totals.net} tone={totals.net >= 0 ? 'balance' : 'expense'} /></div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2"><ChartCard title={`Expenses by category · ${rangeLabel(preset)}`} empty={!breakdown.length} emptyText="No expenses in this time range yet. Add an expense to see category proportions."><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{breakdown.map((entry, index) => <Cell key={entry.name} fill={colours[index % colours.length]} />)}</Pie><Tooltip formatter={formatTooltipMoney} /><Legend /></PieChart></ResponsiveContainer></div><DataTable headers={['Category', 'Expense']} rows={breakdown.map(item => [item.name, formatLkr(item.value)])} /></ChartCard><ChartCard title={`Expenses by day · ${rangeLabel(preset)}`} empty={!daily.some(day => day.expense > 0)} emptyText="No expenses in this time range yet. Daily spending will appear here."><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={daily}><XAxis dataKey="date" tickFormatter={value => value.slice(5)} /><YAxis tickFormatter={value => `Rs ${value / 100}`} /><Tooltip labelFormatter={value => formatDate(String(value))} formatter={formatTooltipMoney} /><Bar dataKey="expense" name="Expense" fill="#f59e0b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div><DataTable headers={['Date', 'Expense']} rows={daily.filter(day => day.expense > 0).map(day => [formatDate(day.date), formatLkr(day.expense)])} /></ChartCard></div>
      </section>
      <section className="card" ref={formRef}><div className="mb-5 flex items-center justify-between"><div><h2 className="section-title">{editingId ? 'Edit transaction' : 'Add a transaction'}</h2><p className="muted">Keep your daily spending and income in one place.</p></div>{editingId && <button className="text-sm font-semibold text-slate-500 underline" onClick={() => { setEditingId(null); setForm(emptyForm()) }}>Cancel edit</button>}</div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><label>Type<select value={form.type} onChange={e => setForm(emptyForm(e.target.value as TransactionType))}><option value="expense">Expense</option><option value="income">Income</option></select></label><label>Amount (LKR)<input ref={amountInputRef} inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required /><small>Positive amounts only</small></label><label>Date<input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Form['category'], subcategory: '' })}>{(form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(category => <option key={category}>{category}</option>)}</select></label>{form.type === 'expense' && form.category === 'Food' && <label>Food subcategory<select value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} required><option value="">Select one</option>{FOOD_SUBCATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>}<label className="sm:col-span-2">Note <span className="font-normal text-slate-400">(optional)</span><textarea maxLength={500} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="e.g. rice and curry" rows={2} /><small>{form.note.length}/500</small></label><button className="primary sm:col-span-2" type="submit">{editingId ? 'Save changes' : 'Add transaction'}</button></form>
      </section>
      <section className="card"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="section-title">Transaction history</h2><p className="muted">{visible.length} record{visible.length === 1 ? '' : 's'} matching filters</p></div><button className="secondary" onClick={clearFilters}>Clear Filters</button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><label>Type<select value={filters.type} onChange={e => setFilters({ ...filters, type: e.target.value as TransactionFilters['type'] })}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expense</option></select></label><label>Category<select value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value, subcategory: '' })}><option value="">All categories</option>{[...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])].map(category => <option key={category}>{category}</option>)}</select></label><label>Food subcategory<select value={filters.subcategory} onChange={e => setFilters({ ...filters, subcategory: e.target.value })}><option value="">All food subcategories</option>{FOOD_SUBCATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label><label>From<input type="date" value={filters.start} onChange={e => setFilters({ ...filters, start: e.target.value })} /></label><label>To<input type="date" value={filters.end} onChange={e => setFilters({ ...filters, end: e.target.value })} /></label><label>Search notes<input value={filters.note} onChange={e => setFilters({ ...filters, note: e.target.value })} placeholder="Search note text" /></label></div>
        {visible.length === 0 ? <div className="empty mt-5">No transactions match these filters.</div> : <ul className="mt-4 divide-y divide-slate-100">{visible.map(t => <li key={t.id} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><div className="flex items-center gap-2"><span className={`dot ${t.type}`} aria-hidden="true" /><p className="truncate font-semibold">{t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}</p></div><p className="mt-1 truncate text-sm text-slate-500">{formatDate(t.date)}{t.note ? ` · ${t.note}` : ''}</p></div><div className="flex shrink-0 items-center gap-3"><strong className={t.type === 'income' ? 'text-emerald-700' : 'text-slate-800'}>{t.type === 'income' ? '+' : '-'}{formatLkr(t.amountCents)}</strong><button className="icon-btn" onClick={() => edit(t)}>Edit</button><button className="icon-btn danger" onClick={() => remove(t.id)}>Delete</button></div></li>)}</ul>}
      </section>
      <section className="card"><h2 className="section-title">Backup and recovery</h2><p className="muted">JSON backups stay on your device. CampusCash never uploads financial data.</p><div className="mt-4 flex flex-wrap gap-3"><button className="secondary" onClick={exportBackup}>Export all records</button><button className="secondary" disabled={importing} onClick={() => fileInput.current?.click()}>{importing ? 'Checking backup…' : 'Import backup'}</button><input ref={fileInput} className="hidden" type="file" accept="application/json,.json" onChange={importBackup} /></div><p className="mt-3 text-xs text-slate-500">Imports are schema-checked, limited to 2 MB, and require an explicit merge or replace confirmation. Keep backups safe; clearing browser storage can remove local records.</p></section>
    </div>
  </main>
}
const dateIsValid = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [year, month, day] = date.split('-').map(Number)
  const local = new Date(year, month - 1, day)
  return local.getFullYear() === year && local.getMonth() === month - 1 && local.getDate() === day
}
function Summary({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className={`summary ${tone}`}><p>{label}</p><strong>{formatLkr(value)}</strong></div> }
function ChartCard({ title, empty, emptyText, children }: { title: string; empty: boolean; emptyText: string; children: React.ReactNode }) { return <div><h3 className="mb-2 font-bold">{title}</h3>{empty ? <div className="empty">{emptyText}</div> : children}</div> }
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <table className="chart-table"><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row[0]}>{row.map(cell => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table> }
const formatTooltipMoney = (value: unknown) => formatLkr(typeof value === 'number' ? value : Number(value ?? 0))
export default App
