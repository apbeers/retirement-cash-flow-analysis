// =============================================================================
// Renderer Tests — section filter, badges, empty state
// P17
// =============================================================================

import { SUBCATEGORIES, ALL_TYPES } from '../script.js';

describe('P17: Section Filter Correctness', () => {
  it('SUBCATEGORIES structure is correct for all types', () => {
    ALL_TYPES.forEach(type => {
      expect(SUBCATEGORIES[type]).toBeDefined();
      expect(Array.isArray(SUBCATEGORIES[type])).toBe(true);
      expect(SUBCATEGORIES[type].length).toBeGreaterThan(0);
      SUBCATEGORIES[type].forEach(subcat => {
        expect(typeof subcat).toBe('string');
        expect(subcat.length).toBeGreaterThan(0);
      });
    });
  });

  it('all types have matching subcategories', () => {
    const types = Object.keys(SUBCATEGORIES);
    expect(types.sort()).toEqual(ALL_TYPES.sort());
  });
});
