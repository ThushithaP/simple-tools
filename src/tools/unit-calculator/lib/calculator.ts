import { create, all, type Unit as MathUnit } from 'mathjs'

// Dedicated mathjs instance so we can safely register custom units
// without polluting any other mathjs usage in the app.
export const math = create(all, {})

function safelyCreateUnit(name: string, def: string) {
  try {
    math.createUnit(name, def)
  } catch {
    // unit already exists (e.g. hot reload) - ignore
  }
}

// --- Chemistry-friendly / colloquial custom units -------------------------
// Molarity shorthand: "0.5 M" == "0.5 mol/L"
safelyCreateUnit('M', '1 mol/L')
// Parts-per-million / parts-per-billion as dimensionless ratio units
safelyCreateUnit('ppm', '1e-6')
safelyCreateUnit('ppb', '1e-9')
// Common colloquial speed units mathjs doesn't ship by default
safelyCreateUnit('mph', '1 mi/h')
safelyCreateUnit('knot', '0.514444 m/s')
// Rotational speed and colloquial flow-rate units. Built on "minute" rather
// than "min" - see the note below on why "min" itself is unusable here.
safelyCreateUnit('rpm', '1 cycle/minute')
safelyCreateUnit('gpm', '1 gal/minute')
safelyCreateUnit('cfm', '1 ft^3/minute')

/**
 * NOTE on normality (eq/L): we intentionally do NOT register a bare "eq"
 * unit. An "equivalent" has the same base dimension as a mole, and once
 * such a unit exists in the registry, mathjs's automatic unit-selection
 * can start relabelling ordinary "mol" results as "eq" (and molarity
 * results as "M") any time no explicit target unit is given - which is
 * confusing and, worse, silently wrong for anything but monovalent
 * species. Users who need normality can write it out as "mol/L" with the
 * valence factored in manually (e.g. molarity × equivalents-per-mole).
 *
 * NOTE on torque (N·m): mathjs has no way to represent it separately from
 * energy (J) - both reduce to the exact same base dimensions
 * (kg·m²/s²), so `5 N * 1 m` evaluates straight to "5 J" before our code
 * ever sees it. There is no unit-registry trick that fixes this; it's a
 * genuine limitation of dimensional analysis (torque is a moment/vector
 * quantity, energy is scalar work, and SI unit dimensions alone can't tell
 * them apart). Torque calculations still compute correctly, they just
 * display as energy - worth remembering when reading results.
 *
 * NOTE on "min": mathjs also exposes a `min()` function (as in
 * Math.min), and in this parser bare "min" resolves to that function
 * rather than the "minute" unit - even directly after a number ("1 min"
 * fails). We use the unambiguous "minute" everywhere instead.
 */

export interface UnitGroup {
  name: string
  units: string[]
}

// Common unit families. The FIRST entry in each list is the "canonical"
// unit for that quantity (the natural SI / SI-derived unit: Pa, N, J...) -
// that's what gets shown as the headline result. The rest are practical
// alternative units shown underneath as "= ..." conversions, in the order
// people usually want to see them.
//
// Every entry here also doubles as a "safe landing spot" that we always
// reach via an explicit `.to(canonical)` call - never by trusting mathjs's
// automatic best-unit search - so custom units elsewhere in the registry
// can't hijack the display (see the "M"/"eq" note above).
export const UNIT_GROUPS: UnitGroup[] = [
  { name: 'Pressure', units: ['Pa', 'kPa', 'bar', 'psi', 'atm', 'mmHg'] },
  { name: 'Force', units: ['N', 'kN', 'lbf', 'kgf'] },
  { name: 'Energy', units: ['J', 'kJ', 'cal', 'kWh', 'BTU'] },
  { name: 'Power', units: ['W', 'kW', 'hp'] },
  { name: 'Mass', units: ['kg', 'g', 'mg', 'lb', 'oz'] },
  { name: 'Length', units: ['m', 'cm', 'mm', 'km', 'in', 'ft', 'mi'] },
  { name: 'Area', units: ['m^2', 'cm^2', 'in^2', 'ft^2'] },
  { name: 'Volume', units: ['m^3', 'L', 'mL', 'gal', 'ft^3'] },
  { name: 'Speed', units: ['m/s', 'km/h', 'mph', 'knot'] },
  { name: 'Temperature', units: ['degC', 'K', 'degF'] },
  { name: 'Density', units: ['kg/m^3', 'g/mL', 'g/cm^3', 'lb/ft^3'] },
  { name: 'Amount of substance', units: ['mol', 'mmol'] },
  { name: 'Molarity / Concentration', units: ['mol/L', 'mmol/L', 'M'] },
  { name: 'Molality', units: ['mol/kg', 'mmol/kg'] },
  { name: 'Molar mass', units: ['g/mol', 'kg/mol'] },
  { name: 'Rotational speed', units: ['rad/s', 'rpm'] },
  { name: 'Flow rate', units: ['m^3/s', 'L/minute', 'm^3/h', 'gpm', 'cfm'] },
  { name: 'Time', units: ['s', 'minute', 'h', 'day'] },
]

export interface Conversion {
  unit: string
  value: number
  formatted: string
}

export interface EvalResult {
  ok: boolean
  error?: string
  expr: string
  isUnit: boolean
  /** The headline result: canonical SI unit, unless the user explicitly asked for a specific unit via "to ...". */
  primaryFormatted: string
  primaryValue: number
  primaryUnit?: string
  /** Same value re-expressed in other practical units from the same family */
  conversions: Conversion[]
  /** LaTeX for the primary result, ready to paste into a document */
  latex: string
  /** Tab-separated text that pastes cleanly into Excel/Sheets as two cells */
  excelText: string
}

/**
 * Format a number to `sig` significant figures without floating-point
 * rounding artifacts (toPrecision handles this far more robustly than
 * manual factor-based rounding, which drifts for negative digit counts).
 *
 * We always round via toPrecision but then hand the *rounded number* back
 * to JS's own Number->string conversion (String(...)) rather than keeping
 * toPrecision's string output verbatim - toPrecision switches to
 * exponential notation as soon as the integer digit count exceeds `sig`
 * (e.g. 10800000 at 7 sig figs becomes "1.080000e+7"), which looks wrong
 * for everyday-sized numbers. JS's native Number->string only goes
 * exponential for genuinely extreme magnitudes (~1e21 or ~1e-7), which is
 * what we actually want here.
 */
export function formatSig(value: number, sig = 4): string {
  if (!isFinite(value)) return String(value)
  if (value === 0) return '0'
  const rounded = parseFloat(value.toPrecision(Math.max(sig, 1)))
  return String(rounded).replace(/e\+?(-?)/, 'e$1')
}

function unitToLatex(unitStr: string): string {
  return unitStr
    .replace(/\^(-?\d+)/g, '^{$1}')
    .replace(/\*/g, '\\cdot ')
    .replace(/\s+/g, '\\,')
}

export function splitFormatted(s: string): { value: string; unit: string } {
  const parts = s.split(' ')
  return { value: parts[0], unit: parts.slice(1).join(' ') }
}

/**
 * Format a Unit as "<number> <unit>" without ever falling back to mathjs's
 * own eager exponential notation for the number - we only ask mathjs what
 * unit symbol it landed on, then render the number ourselves via formatSig.
 */
export function formatUnitClean(u: MathUnit, sig: number): string {
  const peek = u.format({ precision: Math.max(sig, 1) })
  const unitStr = splitFormatted(peek).unit
  const value = u.toNumber(unitStr)
  return `${formatSig(value, sig)} ${unitStr}`
}

export function findGroupFor(result: MathUnit): UnitGroup | null {
  for (const group of UNIT_GROUPS) {
    for (const candidate of group.units) {
      try {
        result.toNumber(candidate)
        return group
      } catch {
        continue
      }
    }
  }
  return null
}

/**
 * Try to express a Unit in its group's canonical unit (e.g. kg·m/s² -> N,
 * N/m² -> Pa), via an explicit `.to()` call. Returns null if no group
 * matches this quantity's dimensions.
 */
export function findCanonicalUnit(unit: MathUnit): MathUnit | null {
  for (const group of UNIT_GROUPS) {
    try {
      return unit.to(group.units[0])
    } catch {
      continue
    }
  }
  return null
}

/** Whether the expression is an explicit "X to <unit>" conversion request. */
export function isExplicitConversion(expr: string): boolean {
  return /\bto\b/i.test(expr)
}

export function evaluate(expr: string, sig = 4): EvalResult {
  const base: EvalResult = {
    ok: false,
    expr,
    isUnit: false,
    primaryFormatted: '',
    primaryValue: NaN,
    conversions: [],
    latex: '',
    excelText: '',
  }

  if (!expr || !expr.trim()) {
    return { ...base, error: '' }
  }

  let result: unknown
  try {
    result = math.evaluate(expr)
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : 'Could not parse expression' }
  }

  // Unit-bearing result, e.g. "15 psi + 2.3 bar" or "(3.2 kg * 9.81 m/s^2) / 25 cm^2"
  if (result instanceof math.Unit) {
    const rawUnit = result as MathUnit
    const explicit = isExplicitConversion(expr)

    // Prefer the natural SI-derived unit (Pa, N, J...) as the headline
    // result - unless the user explicitly asked to convert "to" something
    // specific, in which case we respect that. Either way we only ever
    // reach a unit via an explicit `.to()` call, never bare auto-format.
    let primaryUnitObj: MathUnit = rawUnit
    if (!explicit) {
      const canonical = findCanonicalUnit(rawUnit)
      if (canonical) primaryUnitObj = canonical
    }

    // A bit more precision for the headline value than the sig-fig slider
    // controls, so it reads like a real calculated result (e.g. "12558.72 Pa").
    const headlineSig = Math.max(sig + 3, 7)
    let primaryFormatted: string
    let primaryUnitStr: string
    let primaryValue: number
    try {
      primaryFormatted = formatUnitClean(primaryUnitObj, headlineSig)
      const parts = splitFormatted(primaryFormatted)
      primaryUnitStr = parts.unit
      primaryValue = parseFloat(parts.value)
    } catch (err) {
      return { ...base, error: err instanceof Error ? err.message : 'Could not format result' }
    }

    const group = findGroupFor(primaryUnitObj)
    const conversions: Conversion[] = []
    const normalize = (s: string) => s.replace(/\s+/g, '')
    if (group) {
      for (const candidate of group.units) {
        if (normalize(candidate) === normalize(primaryUnitStr)) continue
        try {
          const value = primaryUnitObj.toNumber(candidate)
          conversions.push({ unit: candidate, value, formatted: `${formatSig(value, sig)} ${candidate}` })
        } catch {
          continue
        }
      }
    }

    const latex = `${formatSig(primaryValue, headlineSig)}\\ \\mathrm{${unitToLatex(primaryUnitStr)}}`
    const excelText = `${formatSig(primaryValue, headlineSig)}\t${primaryUnitStr}`

    return {
      ok: true,
      expr,
      isUnit: true,
      primaryFormatted,
      primaryValue,
      primaryUnit: primaryUnitStr,
      conversions,
      latex,
      excelText,
    }
  }

  // Plain numeric / scalar result, e.g. "3 + 4 * 2"
  if (typeof result === 'number') {
    const formatted = formatSig(result, sig)
    return {
      ok: true,
      expr,
      isUnit: false,
      primaryFormatted: formatted,
      primaryValue: result,
      conversions: [],
      latex: formatted,
      excelText: formatted,
    }
  }

  // Fallback for other mathjs types (BigNumber, Fraction, Complex, Matrix...)
  try {
    const formatted = math.format(result, { precision: sig })
    return {
      ok: true,
      expr,
      isUnit: false,
      primaryFormatted: formatted,
      primaryValue: NaN,
      conversions: [],
      latex: formatted,
      excelText: formatted,
    }
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : 'Unsupported result type' }
  }
}
