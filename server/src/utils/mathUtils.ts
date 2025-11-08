/**
 * Sample points from a mathematical function
 * @param func Function to sample (x) => y
 * @param start Start of range
 * @param end End of range
 * @param step Step size
 * @returns Array of {x, y} points
 */
export function sampleFunction(
  func: (x: number) => number,
  start: number,
  end: number,
  step: number = 0.1
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let x = start; x <= end; x += step) {
    const y = func(x);
    if (!isNaN(y) && isFinite(y)) {
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * Find the vertex of a quadratic function ax² + bx + c
 * @param a Coefficient of x²
 * @param b Coefficient of x
 * @param c Constant term
 * @returns Vertex coordinates {x, y} or null if not a quadratic
 */
export function findVertex(a: number, b: number, c: number): { x: number; y: number } | null {
  if (a === 0) {
    return null; // Not a quadratic
  }

  const x = -b / (2 * a);
  const y = a * x * x + b * x + c;

  return { x, y };
}

/**
 * Extract coefficients from a quadratic expression string
 * Assumes format: "ax^2 + bx + c" or variations
 * @param expression Expression string
 * @returns {a, b, c} coefficients or null if parsing fails
 */
export function parseQuadratic(expression: string): { a: number; b: number; c: number } | null {
  // Simple regex-based parser for common formats
  // This is a simplified version - in production, use a proper math parser
  const cleaned = expression.replace(/\s+/g, '').toLowerCase();

  // Match patterns like: ax^2, bx, c
  const x2Match = cleaned.match(/([+-]?\d*\.?\d*)x\^?2/);
  const xMatch = cleaned.match(/([+-]?\d*\.?\d*)x(?!\^|\d)/);
  
  // For constant term, find standalone numbers (not part of coefficients)
  // Simple approach: find numbers at the end or with +/-
  let c = 0;
  // Try to match constant at the end: ... + c or ... - c
  const constMatch = cleaned.match(/([+-])(\d+\.?\d*)$/);
  if (constMatch) {
    c = parseFloat(constMatch[1] + constMatch[2]);
  } else {
    // Try to match standalone positive number
    const posConstMatch = cleaned.match(/(?:^|[+-])(\d+\.?\d*)(?!x)/);
    if (posConstMatch && !cleaned.includes(posConstMatch[1] + 'x')) {
      c = parseFloat(posConstMatch[1]);
    }
  }

  const a = x2Match
    ? parseFloat(x2Match[1] || (x2Match[1] === '-' ? '-1' : '1'))
    : 0;
  const b = xMatch ? parseFloat(xMatch[1] || (xMatch[1] === '-' ? '-1' : '1')) : 0;

  if (a === 0 && b === 0 && c === 0) {
    return null;
  }

  return { a, b, c };
}
