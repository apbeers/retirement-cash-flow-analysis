// =============================================================================
// PrettyPrinter — human-readable dollar formatting
// Exports: formatMoney
//
// formatMoney(1500000) → "$1.5M"
// formatMoney(45300)   → "$45.3K"
// formatMoney(500)     → "$500"
// =============================================================================

export function formatMoney(value) {
  if (value >= 1_000_000) {
    return '$' + (value / 1_000_000).toFixed(1) + 'M';
  } else if (value >= 1_000) {
    return '$' + (value / 1_000).toFixed(1) + 'K';
  } else {
    return '$' + Math.round(value);
  }
}
