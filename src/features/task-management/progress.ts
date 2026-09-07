export function calculateAverageProgress(percentages: number[]): number {
  if (percentages.length === 0) return 0
  const sum = percentages.reduce((acc, value) => acc + value, 0)
  return Math.round(sum / percentages.length)
}
