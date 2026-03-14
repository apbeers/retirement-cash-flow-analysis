// =============================================================================
// Serializer — exportToXlsx(items), importFromXlsx(file)
// Depends on: XLSX (global from CDN)
// =============================================================================

const _XLSX = typeof XLSX !== 'undefined' ? XLSX : (typeof require !== 'undefined' ? require('xlsx') : null);

export function exportToXlsx(items) {
  if (!_XLSX) return;

  const headers = [
    'id', 'type', 'category', 'name', 'amount', 'rate', 'startYear', 'endYear', 'createdAt',
    'contributionAmount', 'contributionFrequency', 'contributionEndYear', 'withdrawalAmount', 'withdrawalFrequency',
    'loanAmount', 'loanAnnualInterestRate', 'loanMonthlyPayment', 'loanEscrowMonthly',
    'loanPropertyTaxAnnual', 'loanExtraMonthlyPayment',
    'employeeContribution', 'employerMatchPct', 'employerMatchCapPct', 'annualSalary',
    'vestingYears', 'withdrawalStartYear'
  ];

  const rows = items.map(item => {
    const loan = item.loan || {};
    const r401k = item.retirement401k || {};
    return [
      item.id, item.type, item.category, item.name, item.amount, item.rate,
      item.startYear, item.endYear == null ? '' : item.endYear, item.createdAt,
      item.contributionAmount != null ? item.contributionAmount : '',
      item.contributionFrequency != null ? item.contributionFrequency : '',
      item.contributionEndYear != null ? item.contributionEndYear : '',
      item.withdrawalAmount != null ? item.withdrawalAmount : '',
      item.withdrawalFrequency != null ? item.withdrawalFrequency : '',
      loan.loanAmount != null ? loan.loanAmount : '',
      loan.annualInterestRate != null ? loan.annualInterestRate : '',
      loan.monthlyPayment != null ? loan.monthlyPayment : '',
      loan.escrowMonthly != null ? loan.escrowMonthly : '',
      loan.propertyTaxAnnual != null ? loan.propertyTaxAnnual : '',
      loan.extraMonthlyPayment != null ? loan.extraMonthlyPayment : '',
      r401k.employeeContribution != null ? r401k.employeeContribution : '',
      r401k.employerMatchPct != null ? r401k.employerMatchPct : '',
      r401k.employerMatchCapPct != null ? r401k.employerMatchCapPct : '',
      r401k.annualSalary != null ? r401k.annualSalary : '',
      r401k.vestingYears != null ? r401k.vestingYears : '',
      r401k.withdrawalStartYear != null ? r401k.withdrawalStartYear : ''
    ];
  });

  const wsData = [headers, ...rows];
  const ws = _XLSX.utils.aoa_to_sheet(wsData);
  const wb = _XLSX.utils.book_new();
  _XLSX.utils.book_append_sheet(wb, ws, 'Items');
  _XLSX.writeFile(wb, 'retirement-cash-flow.xlsx');
}

export function importFromXlsx(file) {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.xlsx')) {
      return reject(new Error('Only .xlsx files are supported. No data was changed.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = _XLSX.read(data, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = _XLSX.utils.sheet_to_json(ws, { defval: '' });

        const requiredFields = ['type', 'category', 'name', 'amount', 'startYear'];
        const items = [];
        let skipped = 0;

        for (const row of rows) {
          const missing = requiredFields.some(f => row[f] === '' || row[f] === null || row[f] === undefined);
          if (missing) { skipped++; continue; }

          const numOrNull = (val) => (val === '' || val === null || val === undefined) ? null : Number(val);
          const strOrNull = (val) => (val === '' || val === null || val === undefined) ? null : String(val);

          const endYearRaw = row.endYear;
          const endYear = (endYearRaw === '' || endYearRaw === null || endYearRaw === undefined) ? null : Number(endYearRaw);

          const contributionAmount = numOrNull(row.contributionAmount);
          const contributionFrequency = strOrNull(row.contributionFrequency);
          const contributionEndYear = numOrNull(row.contributionEndYear);
          const withdrawalAmount = numOrNull(row.withdrawalAmount);
          const withdrawalFrequency = strOrNull(row.withdrawalFrequency);

          const loanAmount = numOrNull(row.loanAmount);
          const loanAnnualInterestRate = numOrNull(row.loanAnnualInterestRate);
          const loanMonthlyPayment = numOrNull(row.loanMonthlyPayment);
          const loanEscrowMonthly = numOrNull(row.loanEscrowMonthly);
          const loanPropertyTaxAnnual = numOrNull(row.loanPropertyTaxAnnual);
          const loanExtraMonthlyPayment = numOrNull(row.loanExtraMonthlyPayment);

          const hasLoan = loanAmount != null || loanAnnualInterestRate != null || loanMonthlyPayment != null ||
                          loanEscrowMonthly != null || loanPropertyTaxAnnual != null || loanExtraMonthlyPayment != null;

          const loan = hasLoan ? {
            loanAmount: loanAmount || 0, annualInterestRate: loanAnnualInterestRate || 0,
            monthlyPayment: loanMonthlyPayment || 0, escrowMonthly: loanEscrowMonthly || 0,
            propertyTaxAnnual: loanPropertyTaxAnnual || 0, extraMonthlyPayment: loanExtraMonthlyPayment || 0
          } : null;

          const employeeContribution = numOrNull(row.employeeContribution);
          const employerMatchPct = numOrNull(row.employerMatchPct);
          const employerMatchCapPct = numOrNull(row.employerMatchCapPct);
          const annualSalary = numOrNull(row.annualSalary);
          const vestingYears = numOrNull(row.vestingYears);
          const withdrawalStartYear = numOrNull(row.withdrawalStartYear);

          const has401k = employeeContribution != null || employerMatchPct != null || employerMatchCapPct != null ||
                          annualSalary != null || vestingYears != null || withdrawalStartYear != null;

          const retirement401k = has401k ? {
            employeeContribution: employeeContribution || 0, employerMatchPct: employerMatchPct || 0,
            employerMatchCapPct: employerMatchCapPct || 0, annualSalary: annualSalary || 0,
            vestingYears: vestingYears || 0, withdrawalStartYear: withdrawalStartYear
          } : null;

          items.push({
            id: row.id || '', type: row.type, category: row.category, name: row.name,
            amount: Number(row.amount), rate: Number(row.rate) || 0,
            startYear: Number(row.startYear), endYear: endYear,
            createdAt: row.createdAt || '',
            contributionAmount, contributionFrequency, contributionEndYear, withdrawalAmount, withdrawalFrequency,
            loan, retirement401k
          });
        }

        resolve({ items, skipped });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}
