// =============================================================================
// PrettyPrinter — formatMoney(value)
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
