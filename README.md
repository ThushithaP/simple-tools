# Simple Tools

A collection of interactive science and maths tools for O-Level / Grade 11 students, lab technicians, and teachers. It is built as a single installable PWA. Every tool is a self-contained page registered in one central list, and the home page renders a card for each.

## Tools

| | Tool | What it covers |
|---|---|---|
| 🧮 | **Unit-Aware Smart Calculator** | Calculations with units (pressure, energy, concentration, temperature, and more) without manual conversions. Powered by `mathjs`. |
| 🧪 | **Dilution & Titration Simulator** | C₁V₁ = C₂V₂ dilutions (including multi-step), strong acid / strong base titrations with a live pH curve, indicator colour change (phenolphthalein, methyl orange, bromothymol blue), and automatic endpoint detection. |
| ⚡ | **Electrolysis Simulator** | Electrolysis of CuSO₄, NaCl, and acidified water with inert or active electrodes. Ion migration, half-equations, and Faraday's-law mass and gas-volume calculations. |
| 🔊 | **Waves & Sound Simulator** | Wave on a string (fixed, loose, and open ends), longitudinal sound waves, two-source interference with beats, and standing waves in strings and pipes. Includes real audio output. |
| 🔭 | **Optics Simulator** | Plane mirrors, concave and convex mirrors, refraction (Snell's law, total internal reflection), and converging and diverging lenses with principal-ray diagrams. |
| 🔌 | **Semiconductor Simulator** | Band theory and doping, p-n junction electrostatics, diode I-V curves (Shockley equation), half-wave, full-wave, and filtered rectifiers, and BJT switch and amplifier circuits. |
| 🏠 | **Home Electricity Simulator** | Series vs parallel circuits, household wiring, fuses, MCBs, RCDs and earthing, power and energy cost, appliance efficiency, and a multimeter fault-finding challenge. |
| 🧲 | **EM Induction Simulator** | Faraday's law, Lenz's law, AC and DC generators, DC motor back-EMF, and transformers. |
| 🧊 | **3D Shapes Simulator** | 12 solids with click-to-select, recolourable faces, and live surface area and volume, plus a unit-cube builder with per-face painting and cut-out. |
| 🌡️ | **Heat Transfer Simulator** | Conduction, convection, radiation, specific heat capacity, and phase changes with heating and cooling curves. |

## Tech stack

- **React 18** and **TypeScript 5.5**
- **Vite 5** (dev server and build)
- **Tailwind CSS 3.4** with PostCSS and Autoprefixer
- **mathjs**, used by the unit calculator
- **three**, **@react-three/fiber**, **@react-three/drei**, used by the 3D Shapes Simulator only

Everything else (charts, ray diagrams, circuit diagrams, particle views) is plain SVG or Canvas 2D. There is no charting library.

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Type-check only (`tsc --noEmit`) |

### 3D dependencies

The 3D Shapes Simulator needs three extra packages. If they are not in `package.json` yet:

```bash
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

Use versions compatible with React 18 (`@react-three/fiber` 8.x and `@react-three/drei` 9.x).

### Installing as an app (PWA)

Build and serve the production bundle (`npm run build && npm run preview`, or your deployed URL) in Chrome, Edge, or Safari, then use **Install app** or **Add to Home Screen**. Service workers only run on a production build served over HTTPS or `localhost`, so test installability with `preview`, not `dev`.

## Project structure

```
src/
  App.tsx
  main.tsx
  index.css
  components/
    AppShell.tsx          # page chrome
    Link.tsx              # client-side navigation link
    ToolCard.tsx          # card shown on the home page
  lib/
    router.tsx            # minimal client-side router
    useLocalStorage…      # localStorage-backed state hook
  pages/
    HomePage.tsx          # renders one ToolCard per registry entry
  tools/
    registry.ts           # the single list of all tools (see below)
    unit-calculator/
    dilution-titration-simulator/
    electrolysis-simulator/
    waves-sound-simulator/
    optics-simulator/
    semiconductor-simulator/
    home-electricity-simulator/
    em-induction-simulator/
    shapes-3d-simulator/
    heat-transfer-simulator/
```

Each simulator folder follows the same shape:

```
<tool-id>/
  index.tsx        # default export: the page component (tabs or modes live here)
  physics.ts       # formulas and numerical models, kept free of React
  types.ts
  components/      # shared controls, charts, and diagrams for this tool
  modes/           # one file per tab or mode (where the tool has several)
```

Keeping the maths in `physics.ts`, separate from the UI, means every formula can be checked on its own against worked examples. The 3D tool splits this into `geometry.ts` (closed-form area and volume) and `geometryBuilders.ts` (the actual 3D vertices).

## Adding a new tool

1. Create `src/tools/<tool-id>/index.tsx` with a default-exported page component.
2. Register it in `src/tools/registry.ts`:

```ts
import MyNewTool from './my-new-tool';

export const TOOLS: ToolMeta[] = [
  // ...existing tools
  {
    id: 'my-new-tool',
    title: 'My New Tool',
    description: 'One or two sentences shown on the home-page card.',
    path: '/my-new-tool',
    icon: '🧩',
    component: MyNewTool,
  },
];
```

The home page and router both read from `TOOLS`, so no other file needs to change.

| Field | Purpose |
|---|---|
| `id` | Unique, kebab-case identifier; matches the folder name |
| `title` | Card heading and page title |
| `description` | Short summary on the home-page card |
| `path` | Route, `/` + `id` |
| `icon` | Emoji shown on the card |
| `component` | The page component to render |

## Conventions used across the simulators

- **Physics first.** Formulas live in `physics.ts` and are written in the textbook form, so they can be checked against standard worked examples.
- **Real models where the topic is dynamic.** Wave propagation, heat conduction, motor speed-up, and phase-change plateaus are time-stepped numerical models, not canned animations.
- **Teaching simplifications are labelled.** Where a model is deliberately simplified (the nominal diffusivity in the conduction rod, the bell-shaped flux curve in the induction tools, the mid-rail bias assumption in the transistor amplifier), it is noted in the code comments.
- **Accessibility basics.** 44 × 44 px touch targets, ARIA labels on controls and diagrams, and text labels alongside colour.
- **Dark theme, SVG and Canvas only.** No heavy rendering library except `three` in the 3D tool.

## Known differences from the source specs

A few figures in the original specs do not reproduce exactly from their own formulas. The tools use the textbook formulas as written rather than adjusting constants to force a match:

| Where | Spec says | Formula gives | Why |
|---|---|---|---|
| Semiconductor: depletion width, N_A = N_D = 10¹⁶ cm⁻³ | ≈ 0.3 µm | ≈ 0.42 µm | Standard abrupt-junction formula with silicon's relative permittivity of 11.7 |
| EM Induction: AC generator preset, A = 0.01 m² | ε₀ ≈ 50.2 V | 502 V | 50.2 V corresponds to A = 0.001 m² (10 cm²) |
| Home Electricity: old vs new fridge saving | ≈ 900 kWh/year | 1095 kWh/year at 365 days | 900 kWh needs 300 days/year; the days-per-year slider reproduces it |
| Heat Transfer: black-body net radiation at 500 K, ε = 0.95 | ≈ 2840 W | ≈ 2930 W | About 3% rounding difference |

## Not yet implemented

These are known gaps across the simulators, not bugs:

- Quiz and assessment modes
- One-click preset buttons for the sample scenarios
- Pan, pinch-zoom, and a dark/light toggle
- Save, export, and share of experiments
- Reynolds and Nusselt numbers and a multi-layer wall view in the Heat Transfer tool
- In the 3D Shapes tool: shape combining and splitting, markers, annotation drawing, lesson authoring, undo/redo, and camera preset views

## Licence

