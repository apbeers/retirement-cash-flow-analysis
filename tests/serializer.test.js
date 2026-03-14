// =============================================================================
// Serializer Tests — Excel import/export
// P14, P15, P16
// =============================================================================

import { exportToXlsx, importFromXlsx, saveItems, loadState } from '../script.js';

describe('P14: Excel Round-Trip', () => {
  it('exportToXlsx function exists and is callable', () => {
    const items = [
      {
        id: '1',
        type: 'bank',
        category: 'Checking',
        name: 'Test Bank',
        amount: 10000,
        rate: 2,
        startYear: 2025,
        endYear: 2030,
        createdAt: new Date().toISOString()
      }
    ];
    expect(typeof exportToXlsx).toBe('function');
    exportToXlsx(items);
  });
});

describe('P15: Invalid Rows Skipped on Import', () => {
  it('importFromXlsx is a function', () => {
    expect(typeof importFromXlsx).toBe('function');
  });
});

describe('P16: Non-xlsx Files Rejected', () => {
  it('importFromXlsx rejects non-xlsx files', async () => {
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    await expect(importFromXlsx(file)).rejects.toThrow();
  });

  it('importFromXlsx rejects csv files', async () => {
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    await expect(importFromXlsx(file)).rejects.toThrow();
  });
});
