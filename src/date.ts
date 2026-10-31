export const todayLocal = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const formatDate = (date: string) => new Intl.DateTimeFormat('en-LK', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`))
