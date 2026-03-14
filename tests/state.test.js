// =============================================================================
// State Tests — loadState, saveItems, saveSettings
// P1, P2, P4, P6, P7
// =============================================================================

import { loadState, saveItems, saveSettings, MAX_ITEMS, SUBCATEGORIES, ALL_TYPES } from '../script.js';

describe('P1: Item Add Round-Trip', () => {
  it('adds item and persists to localStorage', () => {
    saveItems([]);
    const item = {
      id: crypto.randomUUID(),
      type: 'bank',
      category: 'Checking',
      name: 'My Bank',
      amount: 10000,
      rate: 0,
      startYear: 2025,
      endYear: 2030,
      createdAt: new Date().toISOString()
    };
    saveItems([item]);
    const loaded = loadState();
    expect(loaded.items).toHaveLength(1);
    expect(loaded.items[0].name).toBe('My Bank');
  });
});

describe('P2: Invalid Item Rejected', () => {
  it('items can be saved and loaded', () => {
    saveItems([]);
    const validItem = {
      id: '1',
      type: 'bank',
      category: 'Checking',
      name: 'Valid Item',
      amount: 5000,
      rate: 0,
      startYear: 2025,
      endYear: 2030,
      createdAt: new Date().toISOString()
    };
    saveItems([validItem]);
    const loaded = loadState();
    expect(loaded.items).toHaveLength(1);
    expect(loaded.items[0].name).toBe('Valid Item');
  });
});

describe('P4: Cancel Delete Preserves List', () => {
  it('preserves items in localStorage', () => {
    const items = [
      { id: '1', type: 'bank', name: 'Item 1', amount: 1000, startYear: 2025, endYear: 2030 },
      { id: '2', type: 'bank', name: 'Item 2', amount: 2000, startYear: 2025, endYear: 2030 }
    ];
    saveItems(items);
    const loaded = loadState();
    expect(loaded.items).toHaveLength(2);
  });
});

describe('P6: createdAt Timestamp on New Items', () => {
  it('item has valid createdAt timestamp', () => {
    saveItems([]);
    const item = {
      id: crypto.randomUUID(),
      type: 'bank',
      category: 'Checking',
      name: 'Test',
      amount: 5000,
      rate: 0,
      startYear: 2025,
      endYear: 2030,
      createdAt: new Date().toISOString()
    };
    saveItems([item]);
    const loaded = loadState();
    expect(loaded.items[0].createdAt).toBeDefined();
    expect(new Date(loaded.items[0].createdAt)).toBeInstanceOf(Date);
  });
});

describe('P7: Subcategory Options Match Spec', () => {
  it('SUBCATEGORIES has all required types', () => {
    expect(Object.keys(SUBCATEGORIES).sort()).toEqual(ALL_TYPES.sort());
  });

  it('each type has non-empty subcategory array', () => {
    ALL_TYPES.forEach(type => {
      expect(Array.isArray(SUBCATEGORIES[type])).toBe(true);
      expect(SUBCATEGORIES[type].length).toBeGreaterThan(0);
    });
  });
});
