import type { Unit as MathUnit } from 'mathjs'
import { math, findCanonicalUnit, formatSig, formatUnitClean, isExplicitConversion } from './calculator'

export interface Step {
  /** The operands/values going into this step, e.g. "3.2 kg × 9.81 m/s²" */
  input: string
  /** What that collapses to, e.g. "31.392 N" */
  output: string
}

const MUL_DIV_POW = new Set(['multiply', 'divide', 'pow'])
const ADD_SUB = new Set(['add', 'subtract'])

function isUnitValue(v: unknown): v is MathUnit {
  return v instanceof math.Unit
}

function formatValue(v: unknown, sig: number): string {
  if (isUnitValue(v)) return formatUnitClean(v, sig)
  if (typeof v === 'number') return formatSig(v, sig)
  try {
    return math.format(v, { precision: sig })
  } catch {
    return String(v)
  }
}

function canonicalDisplay(raw: unknown, sig: number): string {
  if (isUnitValue(raw)) {
    const canonical = findCanonicalUnit(raw)
    return formatValue(canonical ?? raw, sig)
  }
  return formatValue(raw, sig)
}

function prettyText(node: any): string {
  // mathjs's Node#toString() renders "s ^ 2" / "cm ^ 2" with spaces around
  // the caret - tidy that up so it reads like what the user actually typed.
  return node.toString().replace(/\s*\^\s*/g, '^')
}

/** True if this subtree crosses a parenthesis or an add/subtract - i.e. it's
 * combining two independently-computed chunks rather than just building a
 * single quantity via implicit multiplication (like "9.81 m/s^2"). */
function containsParenOrAddSub(node: any): boolean {
  if (!node) return false
  if (node.type === 'ParenthesisNode') return true
  if (node.type === 'OperatorNode' && ADD_SUB.has(node.fn)) return true
  if (Array.isArray(node.args)) return node.args.some(containsParenOrAddSub)
  if (node.content) return containsParenOrAddSub(node.content)
  return false
}

/** Counts leaf (constant/symbol) nodes - used to tell a bare typed quantity
 * like "15 psi" (2 leaves) apart from a real multi-factor calculation. */
function countLeaves(node: any): number {
  if (!node) return 0
  if (node.type === 'ConstantNode' || node.type === 'SymbolNode') return 1
  if (Array.isArray(node.args) && node.args.length > 0) {
    return node.args.reduce((sum: number, a: any) => sum + countLeaves(a), 0)
  }
  if (node.content) return countLeaves(node.content)
  return 1
}

/**
 * Walk the parsed expression tree, recording a human-readable step for
 * every "real" combination of two quantities: crossing a parenthesis,
 * crossing +/-, or the outermost multiply/divide/pow chain. A pure
 * multiply/divide/pow chain with no parens or +/- inside it (e.g.
 * "9.81 m/s^2", or "3.2 kg * 9.81 m/s^2") is treated as ONE quantity and
 * collapsed into a single step, matching how a person would read it -
 * mathjs's own parser otherwise decomposes it into a flat left-associative
 * chain of individual multiplications that would be noisy to show one by
 * one.
 *
 * This is a best-effort derivation trace, not a re-implementation of
 * mathjs's evaluator - the authoritative result still comes from
 * calculator.ts's evaluate(), which evaluates the whole expression
 * independently.
 */
export function buildSteps(expr: string, sig: number): Step[] {
  if (!expr || !expr.trim()) return []
  // An explicit "X to <unit>" conversion is a single deliberate action -
  // a derivation would just be noise, so skip it.
  if (isExplicitConversion(expr)) return []

  // Match the extra precision evaluate() uses for the headline result, so
  // the final step's number lines up with what the result card shows.
  sig = Math.max(sig + 3, 7)

  let root: any
  try {
    root = math.parse(expr)
  } catch {
    return []
  }

  const steps: Step[] = []

  function evalNode(node: any): unknown {
    return node.compile().evaluate()
  }

  /** parentIsSameMonomial: true if our caller is itself the multiply/divide/pow
   * chain we're already part of (so we should stay silent and let them step). */
  function visit(node: any, parentIsSameMonomial: boolean): { value: unknown; display: string } {
    switch (node.type) {
      case 'ParenthesisNode':
        return visit(node.content, false)

      case 'ConstantNode':
      case 'SymbolNode': {
        let value: unknown
        try {
          value = evalNode(node)
        } catch {
          value = undefined
        }
        return { value, display: prettyText(node) }
      }

      case 'OperatorNode': {
        const args: any[] = node.args ?? []
        if (args.length !== 2) {
          // Unary operators etc. - evaluate as a leaf, no step.
          try {
            const value = evalNode(node)
            return { value, display: prettyText(node) }
          } catch {
            return { value: undefined, display: prettyText(node) }
          }
        }

        const isAddSub = ADD_SUB.has(node.fn)
        const isMulDivPow = MUL_DIV_POW.has(node.fn)

        if (isMulDivPow && !containsParenOrAddSub(node)) {
          // Pure "unit-building" chain (e.g. "3.2 kg * 9.81 m / s^2").
          // Only the topmost node of such a chain should emit a step;
          // nested nodes just stay quiet and let the parent do it.
          if (parentIsSameMonomial) {
            return { value: undefined, display: prettyText(node) }
          }
          let raw: unknown
          try {
            raw = evalNode(node)
          } catch {
            return { value: undefined, display: prettyText(node) }
          }
          const involvesUnit = isUnitValue(raw)
          const output = canonicalDisplay(raw, sig)
          const input = prettyText(node)
          if (involvesUnit && countLeaves(node) > 2 && input.replace(/\s+/g, '') !== output.replace(/\s+/g, '')) {
            steps.push({ input, output })
          }
          return { value: raw, display: output }
        }

        // A "real" combination: either add/subtract, or a multiply/divide
        // that spans a parenthesis boundary (e.g. dividing two
        // independently-parenthesized quantities).
        const left = visit(args[0], false)
        const right = visit(args[1], false)
        let raw: unknown
        try {
          raw = evalNode(node)
        } catch {
          return { value: undefined, display: prettyText(node) }
        }
        const involvesUnit = isUnitValue(left.value) || isUnitValue(right.value) || isUnitValue(raw)
        const output = canonicalDisplay(raw, sig)
        if (involvesUnit) {
          const symbol = isAddSub ? (node.fn === 'add' ? '+' : '−') : node.op ?? '?'
          steps.push({ input: `${left.display} ${symbol} ${right.display}`, output })
        }
        return { value: raw, display: output }
      }

      default: {
        try {
          const value = evalNode(node)
          return { value, display: prettyText(node) }
        } catch {
          return { value: undefined, display: prettyText(node) }
        }
      }
    }
  }

  try {
    visit(root, false)
  } catch {
    return []
  }

  return steps
}
