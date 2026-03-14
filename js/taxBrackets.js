// =============================================================================
// Tax Brackets — 2025 IRS seed values for federal income tax estimation
// Exports: TAX_BRACKETS_2025
//
// Structure: TAX_BRACKETS_2025[filingStatus] = {
//   ordinary: [{ rate, upTo }],     — marginal income tax brackets
//   ltcg: [{ rate, upTo }],         — long-term capital gains brackets
//   standardDeduction: number,
//   ssTaxThresholdLow: number,      — Social Security provisional income thresholds
//   ssTaxThresholdHigh: number
// }
//
// These are 2025 base values. calcTax() inflates them annually using
// settings.tax.bracketInflationRate (default 2.5%).
// =============================================================================

export const TAX_BRACKETS_2025 = {
  single: {
    ordinary: [
      { rate: 0.10, upTo: 11925 },
      { rate: 0.12, upTo: 48475 },
      { rate: 0.22, upTo: 103350 },
      { rate: 0.24, upTo: 197300 },
      { rate: 0.32, upTo: 250525 },
      { rate: 0.35, upTo: 626350 },
      { rate: 0.37, upTo: Infinity }
    ],
    ltcg: [
      { rate: 0.00, upTo: 48350 },
      { rate: 0.15, upTo: 533400 },
      { rate: 0.20, upTo: Infinity }
    ],
    standardDeduction: 15000,
    ssTaxThresholdLow: 25000,
    ssTaxThresholdHigh: 34000
  },
  married_filing_jointly: {
    ordinary: [
      { rate: 0.10, upTo: 23850 },
      { rate: 0.12, upTo: 96950 },
      { rate: 0.22, upTo: 206700 },
      { rate: 0.24, upTo: 394600 },
      { rate: 0.32, upTo: 501050 },
      { rate: 0.35, upTo: 751600 },
      { rate: 0.37, upTo: Infinity }
    ],
    ltcg: [
      { rate: 0.00, upTo: 96700 },
      { rate: 0.15, upTo: 600050 },
      { rate: 0.20, upTo: Infinity }
    ],
    standardDeduction: 30000,
    ssTaxThresholdLow: 32000,
    ssTaxThresholdHigh: 44000
  }
};
