export function computeMedian(numbers: number[]): number | null {
  if (!numbers || numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const a = sorted[mid - 1];
    const b = sorted[mid];
    if (a === undefined || b === undefined) return null;
    return (a + b) / 2;
  }
  const val = sorted[mid];
  return val === undefined ? null : val;
}

export function computeSuccessRate(decisions: string[]): number | null {
  if (!decisions || decisions.length === 0) return null;
  const successes = decisions.filter(d => d.toLowerCase() === 'scale' || d.toLowerCase() === 'extend').length;
  return (successes / decisions.length) * 100;
}

export function computeScaleUpRate(decisions: string[]): number | null {
  if (!decisions || decisions.length === 0) return null;
  const scales = decisions.filter(d => d.toLowerCase() === 'scale').length;
  return (scales / decisions.length) * 100;
}
