import type { Competency, GradeValue } from './types';

export const RELIGION_AREA_NAME = 'Educación Religiosa';

export const RELIGION_COMPETENCIES: Competency[] = [
  {
    id: 'rel_c1',
    name: 'Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente, comprendiendo la doctrina de su propia religión, abierto al diálogo con las que le son cercanas',
    shortName: 'CONSTRUYE SU IDENTIDAD COMO PERSONA HUMANA, AMADA POR DIOS...',
    capacities: [
      {
        id: 'rel_c1_cap1',
        name: 'Conoce a Dios y asume su identidad religiosa y espiritual como persona digna, libre y trascendente',
        shortName: 'CONOCE A DIOS Y ASUME SU IDENTIDAD RELIGIOSA Y ESPIRITUAL'
      },
      {
        id: 'rel_c1_cap2',
        name: 'Cultiva y valora las manifestaciones religiosas de su entorno argumentando su fe de manera comprensible y respetuosa',
        shortName: 'CULTIVA Y VALORA LAS MANIFESTACIONES RELIGIOSAS DE SU ENTORNO'
      }
    ]
  },
  {
    id: 'rel_c2',
    name: 'Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida en coherencia con su creencia religiosa',
    shortName: 'ASUME LA EXPERIENCIA DEL ENCUENTRO PERSONAL Y COMUNITARIO CON DIOS...',
    capacities: [
      {
        id: 'rel_c2_cap1',
        name: 'Transforma su entorno desde el encuentro personal y comunitario con Dios y desde la fe que profesa',
        shortName: 'TRANSFORMA SU ENTORNO DESDE EL ENCUENTRO PERSONAL Y COMUNITARIO CON DIOS'
      },
      {
        id: 'rel_c2_cap2',
        name: 'Actúa coherentemente en razón de su fe según los principios de su conciencia moral en situaciones concretas de la vida',
        shortName: 'ACTÚA COHERENTEMENTE EN RAZÓN DE SU FE SEGÚN LOS PRINCIPIOS DE SU CONCIENCIA MORAL'
      }
    ]
  }
];

export const TRANSVERSAL_COMPETENCIES: Competency[] = [
  {
    id: 'trans_c1',
    name: 'Se desenvuelve en los entornos virtuales generados por las TIC',
    shortName: 'SE DESENVUELVE EN ENTORNOS VIRTUALES GENERADOS POR LAS TIC',
    isTransversal: true,
    capacities: [
      { id: 'trans_c1_cap1', name: 'Personaliza entornos virtuales', shortName: 'PERSONALIZA ENTORNOS VIRTUALES' },
      { id: 'trans_c1_cap2', name: 'Gestiona información del entorno virtual', shortName: 'GESTIONA INFORMACIÓN DEL ENTORNO VIRTUAL' },
      { id: 'trans_c1_cap3', name: 'Interactúa en entornos virtuales', shortName: 'INTERACTÚA EN ENTORNOS VIRTUALES' },
      { id: 'trans_c1_cap4', name: 'Crea objetos virtuales en diversos formatos', shortName: 'CREA OBJETOS VIRTUALES EN DIVERSOS FORMATOS' }
    ]
  },
  {
    id: 'trans_c2',
    name: 'Gestiona su aprendizaje de manera autónoma',
    shortName: 'GESTIONA SU APRENDIZAJE DE MANERA AUTÓNOMA',
    isTransversal: true,
    capacities: [
      { id: 'trans_c2_cap1', name: 'Define metas de aprendizaje', shortName: 'DEFINE METAS DE APRENDIZAJE' },
      { id: 'trans_c2_cap2', name: 'Organiza acciones estratégicas para alcanzar sus metas', shortName: 'ORGANIZA ACCIONES ESTRATÉGICAS' },
      { id: 'trans_c2_cap3', name: 'Monitorea y ajusta su desempeño durante el proceso de aprendizaje', shortName: 'MONITOREA Y AJUSTA SU DESEMPEÑO' }
    ]
  }
];

// Cálculo de promedio ponderado según escala literal cualitativa MINEDU
const GRADE_POINTS: Record<string, number> = {
  AD: 4,
  A: 3,
  B: 2,
  C: 1
};

export function calculateCompetencyAverage(capacityGrades: GradeValue[]): GradeValue {
  const valid = capacityGrades.filter((g): g is 'AD' | 'A' | 'B' | 'C' => g === 'AD' || g === 'A' || g === 'B' || g === 'C');
  if (valid.length === 0) return '';

  const total = valid.reduce((acc, g) => acc + GRADE_POINTS[g], 0);
  const avg = total / valid.length;

  if (avg >= 3.5) return 'AD';
  if (avg >= 2.5) return 'A';
  if (avg >= 1.5) return 'B';
  return 'C';
}

export function calculateFinalGrade(compGrades: GradeValue[]): GradeValue {
  return calculateCompetencyAverage(compGrades);
}

// Estilos de badge de logro (AD: violeta/azul, A: verde esmeralda, B: amarillo ámbar, C: rojo coral)
export function getGradeBadgeClass(grade: GradeValue): string {
  switch (grade) {
    case 'AD':
      return 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm ring-1 ring-violet-400 font-bold';
    case 'A':
      return 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-300 font-bold';
    case 'B':
      return 'bg-amber-400 text-slate-900 shadow-sm ring-1 ring-amber-300 font-bold';
    case 'C':
      return 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-300 font-bold';
    default:
      return 'bg-slate-100 text-slate-400 border border-slate-200';
  }
}

export function getGradeTextClass(grade: GradeValue): string {
  switch (grade) {
    case 'AD':
      return 'text-indigo-600 font-black';
    case 'A':
      return 'text-emerald-600 font-black';
    case 'B':
      return 'text-amber-600 font-black';
    case 'C':
      return 'text-rose-600 font-black';
    default:
      return 'text-slate-400';
  }
}
