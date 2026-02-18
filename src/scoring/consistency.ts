// src/scoring/consistency.ts

export function computeConsistency(contributionDates: string[]): number {
  if (contributionDates.length < 3) return 0;

  // Bucket contributions by month (last 24 months)
  const now = new Date();
  const months = new Array(24).fill(0);

  for (const dateStr of contributionDates) {
    const date = new Date(dateStr);
    const monthsAgo = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
    if (monthsAgo >= 0 && monthsAgo < 24) {
      months[monthsAgo]++;
    }
  }

  // Only consider months within the developer's active window
  const activeMonths = months.filter(m => m > 0);
  if (activeMonths.length <= 1) return 10; // Minimal consistency for single-month activity

  // Coefficient of variation
  const mean = activeMonths.reduce((a, b) => a + b, 0) / activeMonths.length;
  const variance = activeMonths.reduce((sum, m) => sum + (m - mean) ** 2, 0) / activeMonths.length;
  const cv = Math.sqrt(variance) / mean;

  // Also factor in coverage: what % of last 24 months had activity?
  const coverage = activeMonths.length / 24;

  // consistency = (1 - cv) * coverage, normalized to 0-100
  const raw = Math.max(0, (1 - cv) * coverage);
  return Math.max(0, Math.min(100, raw * 100));
}
