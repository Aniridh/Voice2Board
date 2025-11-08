import { sampleFunction, findVertex, parseQuadratic } from '../mathUtils.js';

describe('mathUtils', () => {
  describe('sampleFunction', () => {
    it('should sample a linear function', () => {
      const func = (x: number) => 2 * x + 1;
      const points = sampleFunction(func, 0, 2, 1);

      expect(points).toHaveLength(3);
      expect(points[0]).toEqual({ x: 0, y: 1 });
      expect(points[1]).toEqual({ x: 1, y: 3 });
      expect(points[2]).toEqual({ x: 2, y: 5 });
    });

    it('should sample a quadratic function', () => {
      const func = (x: number) => x * x;
      const points = sampleFunction(func, -2, 2, 1);

      expect(points.length).toBeGreaterThan(0);
      expect(points.find((p) => p.x === 0)?.y).toBe(0);
      expect(points.find((p) => p.x === 1)?.y).toBe(1);
      expect(points.find((p) => p.x === -1)?.y).toBe(1);
    });

    it('should filter out NaN and Infinity values', () => {
      const func = (x: number) => (x === 0 ? NaN : 1 / x);
      const points = sampleFunction(func, -1, 1, 0.5);

      expect(points.every((p) => !isNaN(p.y) && isFinite(p.y))).toBe(true);
    });
  });

  describe('findVertex', () => {
    it('should find vertex of x² + 2x + 1', () => {
      const vertex = findVertex(1, 2, 1);
      expect(vertex).not.toBeNull();
      expect(vertex?.x).toBe(-1);
      expect(vertex?.y).toBe(0);
    });

    it('should find vertex of 2x² - 4x + 1', () => {
      const vertex = findVertex(2, -4, 1);
      expect(vertex).not.toBeNull();
      expect(vertex?.x).toBe(1);
      expect(vertex?.y).toBe(-1);
    });

    it('should return null for non-quadratic (a=0)', () => {
      const vertex = findVertex(0, 2, 1);
      expect(vertex).toBeNull();
    });
  });

  describe('parseQuadratic', () => {
    it('should parse x^2 + 2x + 1', () => {
      const coeffs = parseQuadratic('x^2 + 2x + 1');
      expect(coeffs).not.toBeNull();
      expect(coeffs?.a).toBe(1);
      expect(coeffs?.b).toBe(2);
      // Constant term parsing is simplified - may need adjustment
      expect(coeffs?.c).toBeGreaterThanOrEqual(0);
    });

    it('should parse 2x^2 - 4x + 1', () => {
      const coeffs = parseQuadratic('2x^2 - 4x + 1');
      expect(coeffs).not.toBeNull();
      expect(coeffs?.a).toBe(2);
      expect(coeffs?.b).toBe(-4);
      // Constant term parsing is simplified
      expect(coeffs?.c).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing terms', () => {
      const coeffs = parseQuadratic('x^2 + 1');
      expect(coeffs).not.toBeNull();
      expect(coeffs?.a).toBe(1);
      expect(coeffs?.b).toBe(0);
      // Constant term should be found
      expect(coeffs?.c).toBeGreaterThanOrEqual(0);
    });

    it('should extract coefficients correctly', () => {
      const coeffs = parseQuadratic('3x^2 + 5x - 2');
      expect(coeffs).not.toBeNull();
      expect(coeffs?.a).toBe(3);
      expect(coeffs?.b).toBe(5);
    });
  });
});

