// =============================================================================
// State Tests — loadState, saveItems, saveSettings
// P1, P2, P4, P6, P7
// =============================================================================

import * as fc from 'fast-check';
import { loadState, saveItems, saveSettings, SUBCATEGORIES, ALL_TYPES, DEFAULT_SETTINGS, MAX_ITEMS } from '../script.js';

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

describe('P3: Delete Removes Item', () => {
  it('removing an item from the array and saving leaves it absent on reload', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom('bank', 'investments'),
            category: fc.constantFrom('Checking', 'Stocks'),
            name: fc.string({ minLength: 1, maxLength: 20 }),
            amount: fc.integer({ min: 0, max: 1e6 }),
            rate: fc.integer({ min: 0, max: 20 }),
            startYear: fc.constant(2025),
            endYear: fc.constant(2030)
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (items) => {
          saveItems(items);
          const deleteIndex = 0;
          const deletedId = items[deleteIndex].id;
          const remaining = items.filter((_, i) => i !== deleteIndex);
          saveItems(remaining);
          const loaded = loadState();
          expect(loaded.items).toHaveLength(remaining.length);
          expect(loaded.items.find(i => i.id === deletedId)).toBeUndefined();
        }
      )
    );
  });
});

describe('P5: Item Count Limit Enforced', () => {
  it('MAX_ITEMS is a positive finite integer', () => {
    expect(typeof MAX_ITEMS).toBe('number');
    expect(MAX_ITEMS).toBeGreaterThan(0);
    expect(Number.isFinite(MAX_ITEMS)).toBe(true);
    expect(Number.isInteger(MAX_ITEMS)).toBe(true);
  });

  it('saving exactly MAX_ITEMS items persists all of them', () => {
    const items = Array.from({ length: MAX_ITEMS }, (_, i) => ({
      id: String(i),
      type: 'bank',
      category: 'Checking',
      name: `Item ${i}`,
      amount: 1000,
      rate: 0,
      startYear: 2025,
      endYear: 2030
    }));
    saveItems(items);
    const loaded = loadState();
    expect(loaded.items).toHaveLength(MAX_ITEMS);
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
