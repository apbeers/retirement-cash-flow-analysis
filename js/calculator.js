// =============================================================================
// Calculator — calcItemValue, calcItemBalance, calc401kBalance,
//              calcLoanSchedule, calcTax, calcProjection, calcStats
// Depends on: constants.js, taxBrackets.js
// =============================================================================

import { ASSET_TYPES } from './constants.js';
import { TAX_BRACKETS_2025 } from './taxBrackets.js';

export function calcItemValue(item, year) {
  if (year < item.startYear || year > item.endYear) return 0;
  return item.amount * Math.pow(1 + item.rate / 100, year - item.startYear);
}

export function calcItemBalance(item, year, balanceCache, projectionEndYear) {
  var startYear = item.startYear;
  var effectiveEndYear = item.endYear == null ? projectionEndYear : item.endYear;

  if (year < startYear || (effectiveEndYear != null && year > effectiveEndYear)) return 0;

  if (!balanceCache[item.id]) {
    balanceCache[item.id] = {};
  }

  var cache = balanceCache[item.id];

  if (cache[startYear - 1] === undefined) {
    cache[startYear - 1] = item.amount;
  }

  for (var y = startYear; y <= year; y++) {
    if (cache[y] !== undefined) continue;

    if (effectiveEndYear != null && y > effectiveEndYear) {
      cache[y] = 0;
      continue;
    }

    var prevBalance = cache[y - 1];
    if (prevBalance === undefined) {
      prevBalance = 0;
    }

    var annualContrib = 0;
    if (item.contributionAmount != null && item.contributionAmount > 0) {
      annualContrib = item.contributionFrequency === 'monthly'
        ? item.contributionAmount * 12
        : item.contributionAmount;
    }

    var annualWithdraw = 0;
    if (item.withdrawalAmount != null && item.withdrawalAmount > 0) {
      annualWithdraw = item.withdrawalFrequency === 'monthly'
        ? item.withdrawalAmount * 12
        : item.withdrawalAmount;
    }

    var balance = (prevBalance + annualContrib - annualWithdraw) * (1 + item.rate / 100);
    cache[y] = Math.max(0, balance);
  }

  return cache[year];
}

export function calc401kBalance(item, year, balanceCache, projectionEndYear) {
  var startYear = item.startYear;
  var effectiveEndYear = item.endYear == null ? projectionEndYear : item.endYear;

  if (year < startYear || (effectiveEndYear != null && year > effectiveEndYear)) return 0;

  if (!balanceCache[item.id]) {
    balanceCache[item.id] = {};
  }

  var cache = balanceCache[item.id];

  if (cache[startYear - 1] === undefined) {
    cache[startYear - 1] = item.amount;
  }

  var config = item.retirement401k || {};
  var employeeContribution = config.employeeContribution || 0;
  var employerMatchPct = config.employerMatchPct || 0;
  var employerMatchCapPct = config.employerMatchCapPct || 0;
  var annualSalary = config.annualSalary || 0;
  var vestingYears = config.vestingYears || 0;
  var withdrawalStartYear = config.withdrawalStartYear;

  for (var y = startYear; y <= year; y++) {
    if (cache[y] !== undefined) continue;

    if (effectiveEndYear != null && y > effectiveEndYear) {
      cache[y] = 0;
      continue;
    }

    var prevBalance = cache[y - 1];
    if (prevBalance === undefined) {
      prevBalance = 0;
    }

    var rate = item.rate || 0;

    if (withdrawalStartYear != null && y >= withdrawalStartYear) {
      var annualWithdraw = 0;
      if (item.withdrawalAmount != null && item.withdrawalAmount > 0) {
        annualWithdraw = item.withdrawalFrequency === 'monthly'
          ? item.withdrawalAmount * 12
          : item.withdrawalAmount;
      }
      cache[y] = Math.max(0, (prevBalance - annualWithdraw) * (1 + rate / 100));
    } else {
      var yearsActive = y - startYear;
      var employerMatch = 0;
      if (vestingYears <= 0 || yearsActive >= vestingYears) {
        var matchableAmount = Math.min(employeeContribution, annualSalary * employerMatchCapPct / 100);
        employerMatch = matchableAmount * employerMatchPct / 100;
      }
      cache[y] = (prevBalance + employeeContribution + employerMatch) * (1 + rate / 100);
    }
  }

  return cache[year];
}

export function calcLoanSchedule(loanConfig, itemStartYear, projectionEndYear) {
  var loanAmount = loanConfig.loanAmount || 0;
  var annualInterestRate = loanConfig.annualInterestRate || 0;
  var monthlyPayment = loanConfig.monthlyPayment || 0;
  var escrowMonthly = loanConfig.escrowMonthly || 0;
  var propertyTaxAnnual = loanConfig.propertyTaxAnnual || 0;
  var extraMonthlyPayment = loanConfig.extraMonthlyPayment || 0;

  var monthlyRate = annualInterestRate / 12 / 100;
  var totalPayment = monthlyPayment + extraMonthlyPayment;
  var balance = loanAmount;
  var schedule = [];

  for (var year = itemStartYear; year <= projectionEndYear; year++) {
    var openingBalance = balance;
    var yearPrincipal = 0;
    var yearInterest = 0;
    var yearEscrow = 0;

    for (var m = 0; m < 12; m++) {
      if (balance <= 0) break;

      var interestCharge = balance * monthlyRate;
      var principalCharge = Math.min(totalPayment - interestCharge, balance);
      if (principalCharge < 0) principalCharge = 0;

      balance = Math.max(0, balance - principalCharge);
      yearPrincipal += principalCharge;
      yearInterest += interestCharge;
      yearEscrow += escrowMonthly;
    }

    yearEscrow += propertyTaxAnnual;

    schedule.push({
      year: year,
      openingBalance: openingBalance,
      principalPaid: yearPrincipal,
      interestPaid: yearInterest,
      escrowPaid: yearEscrow,
      closingBalance: balance
    });

    if (balance <= 0) {
      for (var ry = year + 1; ry <= projectionEndYear; ry++) {
        schedule.push({
          year: ry,
          openingBalance: 0,
          principalPaid: 0,
          interestPaid: 0,
          escrowPaid: 0,
          closingBalance: 0
        });
      }
      break;
    }
  }

  return schedule;
}

export function inflateBrackets(brackets, inflationFactor) {
  return brackets.map(function(b) {
    return {
      rate: b.rate,
      upTo: b.upTo === Infinity ? Infinity : Math.round(b.upTo * inflationFactor)
    };
  });
}

export function applyMarginalBrackets(taxableIncome, brackets) {
  var tax = 0;
  var prevUpTo = 0;
  for (var i = 0; i < brackets.length; i++) {
    var bracket = brackets[i];
    if (taxableIncome <= prevUpTo) break;
    var taxableInBracket = Math.min(taxableIncome, bracket.upTo) - prevUpTo;
    tax += taxableInBracket * bracket.rate;
    prevUpTo = bracket.upTo;
  }
  return tax;
}

export function determineLTCGTax(taxableOrdinaryIncome, ltcgIncome, ltcgBrackets) {
  if (ltcgIncome <= 0) return 0;
  var tax = 0;
  var ordinaryEnd = taxableOrdinaryIncome;
  var ltcgRemaining = ltcgIncome;
  for (var i = 0; i < ltcgBrackets.length; i++) {
    var bracket = ltcgBrackets[i];
    if (ltcgRemaining <= 0) break;
    var bracketStart = i === 0 ? 0 : ltcgBrackets[i - 1].upTo;
    var bracketEnd = bracket.upTo;
    var consumed = Math.max(0, Math.min(ordinaryEnd, bracketEnd) - bracketStart);
    var available = (bracketEnd === Infinity ? ltcgRemaining : bracketEnd - bracketStart) - consumed;
    if (available <= 0) continue;
    var taxableHere = Math.min(ltcgRemaining, available);
    tax += taxableHere * bracket.rate;
    ltcgRemaining -= taxableHere;
  }
  return tax;
}

export function calcTax(taxInputs, settings) {
  var year = taxInputs.year;
  var traditional401kWithdrawals = taxInputs.traditional401kWithdrawals || 0;
  var bankInterest = taxInputs.bankInterest || 0;
  var ltcgIncome = taxInputs.ltcgIncome || 0;
  var annualSocialSecurityBenefit = taxInputs.annualSocialSecurityBenefit || 0;
  var socialSecurityStartYear = taxInputs.socialSecurityStartYear;

  var filingStatus = (settings.tax && settings.tax.filingStatus) || 'single';
  var bracketInflationRate = (settings.tax && settings.tax.bracketInflationRate != null)
    ? settings.tax.bracketInflationRate : 2.5;

  var seedBrackets = TAX_BRACKETS_2025[filingStatus] || TAX_BRACKETS_2025.single;

  var inflationFactor = year > 2025
    ? Math.pow(1 + bracketInflationRate / 100, year - 2025)
    : 1.0;

  var inflatedOrdinaryBrackets = inflateBrackets(seedBrackets.ordinary, inflationFactor);
  var inflatedLTCGBrackets = inflateBrackets(seedBrackets.ltcg, inflationFactor);
  var inflatedStdDeduction = Math.round(seedBrackets.standardDeduction * inflationFactor);
  var inflatedSSLow = Math.round(seedBrackets.ssTaxThresholdLow * inflationFactor);
  var inflatedSSHigh = Math.round(seedBrackets.ssTaxThresholdHigh * inflationFactor);

  var ordinaryIncomeBeforeSS = traditional401kWithdrawals + bankInterest;

  var taxableSocialSecurity = 0;
  if (socialSecurityStartYear != null && year >= socialSecurityStartYear && annualSocialSecurityBenefit > 0) {
    var provisionalIncome = ordinaryIncomeBeforeSS + 0.5 * annualSocialSecurityBenefit;
    if (provisionalIncome > inflatedSSHigh) {
      taxableSocialSecurity = 0.85 * annualSocialSecurityBenefit;
    } else if (provisionalIncome > inflatedSSLow) {
      taxableSocialSecurity = 0.50 * annualSocialSecurityBenefit;
    } else {
      taxableSocialSecurity = 0;
    }
  }

  var ordinaryIncome = ordinaryIncomeBeforeSS + taxableSocialSecurity;
  var taxableOrdinaryIncome = Math.max(0, ordinaryIncome - inflatedStdDeduction);
  var ordinaryTax = applyMarginalBrackets(taxableOrdinaryIncome, inflatedOrdinaryBrackets);
  var ltcgTax = determineLTCGTax(taxableOrdinaryIncome, ltcgIncome, inflatedLTCGBrackets);
  var totalEstimatedTax = ordinaryTax + ltcgTax;

  return {
    ordinaryIncome: ordinaryIncome,
    ltcgIncome: ltcgIncome,
    taxableSocialSecurity: taxableSocialSecurity,
    standardDeduction: inflatedStdDeduction,
    taxableOrdinaryIncome: taxableOrdinaryIncome,
    ordinaryTax: ordinaryTax,
    ltcgTax: ltcgTax,
    totalEstimatedTax: totalEstimatedTax
  };
}

export function calcProjection(items, settings) {
  const result = [];
  const endYear = settings.startYear + settings.projectionYears - 1;
  const balanceCache = {};

  const loanSchedules = {};
  for (const item of items) {
    if (item.loan && item.loan.loanAmount > 0) {
      loanSchedules[item.id] = calcLoanSchedule(item.loan, item.startYear, endYear);
    }
  }

  for (let year = settings.startYear; year <= endYear; year++) {
    const byType = {
      bank: 0, investments: 0, property: 0, vehicles: 0,
      rentals: 0, inflows: 0, outflows: 0,
      traditional401k: 0, roth401k: 0
    };

    for (const item of items) {
      const effectiveEndYear = item.endYear == null ? endYear : item.endYear;
      const active = year >= item.startYear && year <= effectiveEndYear;
      if (!active) continue;

      if (ASSET_TYPES.includes(item.type)) {
        const is401k = (item.category === 'Traditional 401(k)' || item.category === 'Roth 401(k)') && item.retirement401k;
        const hasContribOrWithdraw = (item.contributionAmount != null && item.contributionAmount > 0) ||
                                      (item.withdrawalAmount != null && item.withdrawalAmount > 0);
        let itemValue = 0;

        if (is401k) {
          itemValue = calc401kBalance(item, year, balanceCache, endYear);
        } else if ((item.type === 'bank' || item.type === 'investments') && hasContribOrWithdraw) {
          itemValue = calcItemBalance(item, year, balanceCache, endYear);
        } else if ((item.type === 'property' || item.type === 'vehicles') && loanSchedules[item.id]) {
          const assetValue = item.endYear == null
            ? item.amount * Math.pow(1 + item.rate / 100, year - item.startYear)
            : calcItemValue(item, year);
          const scheduleEntry = loanSchedules[item.id].find(e => e.year === year);
          const loanBalance = scheduleEntry ? scheduleEntry.closingBalance : 0;
          itemValue = assetValue - loanBalance;

          if (scheduleEntry && scheduleEntry.openingBalance > 0) {
            const loan = item.loan;
            const annualLoanOutflow = ((loan.monthlyPayment || 0) + (loan.escrowMonthly || 0) + (loan.extraMonthlyPayment || 0)) * 12;
            const propertyTaxOutflow = loan.propertyTaxAnnual || 0;
            byType.outflows += annualLoanOutflow + propertyTaxOutflow;
          }
        } else {
          if (item.endYear == null) {
            itemValue = item.amount * Math.pow(1 + item.rate / 100, year - item.startYear);
          } else {
            itemValue = calcItemValue(item, year);
          }
        }

        byType[item.type] += itemValue;

        if (item.category === 'Traditional 401(k)') {
          byType.traditional401k += itemValue;
        } else if (item.category === 'Roth 401(k)') {
          byType.roth401k += itemValue;
        }
      } else if (item.type === 'inflows') {
        byType.inflows += item.amount;
      } else if (item.type === 'outflows') {
        byType.outflows += item.amount;
      }
    }

    const grossNetWorth =
      byType.bank + byType.investments + byType.property +
      byType.vehicles + byType.rentals +
      byType.inflows - byType.outflows;

    let traditional401kWithdrawals = 0;
    let bankInterest = 0;
    let ltcgIncome = 0;

    for (const item of items) {
      const effectiveEndYear = item.endYear == null ? endYear : item.endYear;
      const active = year >= item.startYear && year <= effectiveEndYear;
      if (!active) continue;

      if (item.category === 'Traditional 401(k)' && item.retirement401k &&
          item.retirement401k.withdrawalStartYear != null && year >= item.retirement401k.withdrawalStartYear) {
        let annualWithdraw = 0;
        if (item.withdrawalAmount != null && item.withdrawalAmount > 0) {
          annualWithdraw = item.withdrawalFrequency === 'monthly'
            ? item.withdrawalAmount * 12
            : item.withdrawalAmount;
        }
        traditional401kWithdrawals += annualWithdraw;
      }

      if (item.type === 'bank' && item.rate > 0) {
        const balance = balanceCache[item.id] && balanceCache[item.id][year] != null
          ? balanceCache[item.id][year]
          : (item.endYear == null
              ? item.amount * Math.pow(1 + item.rate / 100, year - item.startYear)
              : calcItemValue(item, year));
        bankInterest += balance * item.rate / 100;
      }

      if (item.type === 'investments' && (item.category === 'Stocks' || item.category === 'ETFs') &&
          item.withdrawalAmount != null && item.withdrawalAmount > 0) {
        ltcgIncome += item.withdrawalFrequency === 'monthly'
          ? item.withdrawalAmount * 12
          : item.withdrawalAmount;
      }
    }

    const taxInputs = {
      year: year,
      traditional401kWithdrawals: traditional401kWithdrawals,
      bankInterest: bankInterest,
      ltcgIncome: ltcgIncome,
      annualSocialSecurityBenefit: (settings.tax && settings.tax.annualSocialSecurityBenefit) || 0,
      socialSecurityStartYear: (settings.tax && settings.tax.socialSecurityStartYear) || null
    };

    const tax = calcTax(taxInputs, settings);
    const netWorth = grossNetWorth - tax.totalEstimatedTax;

    result.push({ year, netWorth, byType, tax });
  }

  return result;
}

export function calcStats(items, settings) {
  const year = settings.startYear;
  let totalAssets = 0;
  let annualInflow = 0;
  let annualOutflow = 0;

  for (const item of items) {
    const effectiveEndYear = item.endYear == null ? (settings.startYear + (settings.projectionYears || 30) - 1) : item.endYear;
    if (year < item.startYear || year > effectiveEndYear) continue;

    if (ASSET_TYPES.includes(item.type)) {
      totalAssets += item.amount;
    } else if (item.type === 'inflows') {
      annualInflow += item.amount;
    } else if (item.type === 'outflows') {
      annualOutflow += item.amount;
    }
  }

  return { totalAssets, annualInflow, annualOutflow };
}
