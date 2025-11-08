import { create, all } from 'mathjs';

// Create a mathjs instance with all functions
const math = create(all);

export function parseMathExpression(expression: string): (x: number) => number {
  // Clean up the expression (replace common variations)
  let cleaned = expression
    .replace(/\^/g, '^') // Keep caret for power
    .replace(/\*\*/g, '^') // Replace ** with ^
    .trim();

  // Create a function that evaluates the expression for a given x
  return (x: number): number => {
    try {
      // Replace x with the actual value
      const expr = cleaned.replace(/x/g, `(${x})`);
      const result = math.evaluate(expr);
      return typeof result === 'number' ? result : NaN;
    } catch (error) {
      console.error('Error evaluating expression:', error);
      return NaN;
    }
  };
}

export function isValidMathExpression(expression: string): boolean {
  try {
    // Test with a sample value
    const testFunc = parseMathExpression(expression);
    const result = testFunc(1);
    return !isNaN(result) && isFinite(result);
  } catch {
    return false;
  }
}

