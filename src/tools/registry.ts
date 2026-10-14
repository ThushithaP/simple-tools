import type { ComponentType } from 'react'
import { UnitCalculatorPage } from './unit-calculator/UnitCalculatorPage'
import DilutionTitrationSimulator from './dilution-titration-simulator'
import ElectrolysisSimulator from './electrolysis-simulator'
import WavesSoundSimulator from './waves-sound-simulator'
import OpticsSimulator from './optics-simulator'
import SemiconductorSimulator from './semiconductor-simulator'
import HomeElectricitySimulator from './home-electricity-simulator'
import EmInductionSimulator from './em-induction-simulator'
import Shapes3DSimulator from './shapes-3d-simulator'
import HeatTransferSimulator from './heat-transfer-simulator'

export interface ToolMeta {
  id: string
  title: string
  description: string
  path: string
  icon: string
  component: ComponentType
}

/**
 * Every tool in the app registers itself here once. The home page renders
 * this list as cards, and the router matches a path to a tool's page
 * component - adding a new tool never means touching routing code, just
 * adding an entry here (and building the tool under src/tools/<id>/).
 */
export const TOOLS: ToolMeta[] = [
  {
    id: 'unit-calculator',
    title: 'Unit-Aware Smart Calculator',
    description:
      'Perform calculations with units for pressure, energy, concentration, temperature, and more without manual conversions.',
    path: '/unit-calculator',
    icon: '🧮',
    component: UnitCalculatorPage,
  },
  {
    id: 'dilution-titration-simulator',
    title: 'Dilution & Titration Simulator',
    description:
      'Calculate dilution factors, prepare solutions of target concentration, and simulate acid–base titrations with step-by-step results.',
    path: '/dilution-titration-simulator',
    icon: '🧪',
    component: DilutionTitrationSimulator,
  },
  {
    id: 'electrolysis-simulator',
    title: 'Electrolysis Simulator',
    description:
      'Model electrolytic cells by calculating charge, current, time, moles of product, and mass of material deposited at electrodes.',
    path: '/electrolysis-simulator',
    icon: '⚡',
    component: ElectrolysisSimulator,
  },
  {
    id: 'waves-sound-simulator',
    title: 'Waves & Sound Simulator',
    description:
      'Visualize wave properties and sound phenomena: frequency, wavelength, speed, interference, standing waves, and Doppler effect.',
    path: '/waves-sound-simulator',
    icon: '🔊',
    component: WavesSoundSimulator,
  },
  {
    id: 'optics-simulator',
    title: 'Optics Simulator',
    description:
      'Simulate ray optics and wave optics: lenses, mirrors, refraction, reflection, image formation, and basic interference/diffraction.',
    path: '/optics-simulator',
    icon: '🔭',
    component: OpticsSimulator,
  },
  {
    id: 'semiconductor-simulator',
    title: 'Semiconductor Simulator',
    description:
      'Explore semiconductor behavior: band structure, doping, carrier concentration, p–n junctions, and basic diode characteristics.',
    path: '/semiconductor-simulator',
    icon: '🔌',
    component: SemiconductorSimulator,
  },
  {
    id: 'home-electricity-simulator',
    title: 'Home Electricity Simulator',
    description:
      'Model household circuits: series/parallel wiring, power consumption, energy cost, fuses, and safety devices.',
    path: '/home-electricity-simulator',
    icon: '🏠',
    component: HomeElectricitySimulator,
  },
  {
    id: 'em-induction-simulator',
    title: 'EM Induction Simulator',
    description:
      'Study electromagnetic induction: Faraday’s law, Lenz’s law, moving conductors, changing flux, and induced EMF in coils.',
    path: '/em-induction-simulator',
    icon: '🧲',
    component: EmInductionSimulator,
  },
  {
    id: 'shapes-3d-simulator',
    title: '3D Shapes Simulator',
    description:
      'Visualize and analyze 3D geometry: volume, surface area, cross-sections, and transformations for common solids.',
    path: '/shapes-3d-simulator',
    icon: '🧊',
    component: Shapes3DSimulator,
  },
  {
    id: 'heat-transfer-simulator',
    title: 'Heat Transfer Simulator',
    description:
      'Visualize and analyze 3D geometry: volume, surface area, cross-sections, and transformations for common solids.',
    path: '/heat-transfer-simulator',
    icon: '🧊',
    component: HeatTransferSimulator,
  },
];

export function findToolByPath(path: string): ToolMeta | undefined {
  return TOOLS.find((tool) => tool.path === path)
}
