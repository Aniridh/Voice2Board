import { TutorResponse } from '../types';

export interface DemoSequence {
  name: string;
  description: string;
  actions: TutorResponse['actions'];
}

const DEMO_SEQUENCES_DIR = '/demo-sequences';

export async function loadDemoSequence(filename: string): Promise<DemoSequence | null> {
  try {
    const response = await fetch(`${DEMO_SEQUENCES_DIR}/${filename}`);
    if (!response.ok) {
      console.error(`Failed to load demo sequence: ${filename}`);
      return null;
    }
    const data = await response.json();
    return data as DemoSequence;
  } catch (error) {
    console.error(`Error loading demo sequence ${filename}:`, error);
    return null;
  }
}

export async function getAvailableDemoSequences(): Promise<string[]> {
  // In a real app, you might fetch a manifest file
  // For now, return hardcoded list
  return ['trig.json', 'parabola-vertex.json', 'h2-bond.json'];
}

export function getDemoSequenceName(filename: string): string {
  const names: Record<string, string> = {
    'trig.json': 'Trigonometric Functions',
    'parabola-vertex.json': 'Parabola with Vertex',
    'h2-bond.json': 'Hydrogen Molecule',
  };
  return names[filename] || filename.replace('.json', '');
}

