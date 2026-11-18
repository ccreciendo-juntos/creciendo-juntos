import type { NovaActivity } from './types';

export const INITIAL_NOVA_ACTIVITIES: NovaActivity[] = [
  {
    id: 'act_rel_quiz_1',
    title: 'Cuestionario Evaluativo: Valores Cristianos y Sacramentos en la Vida Diaria',
    description: 'Demuestra tu comprensión sobre el mensaje de Jesús y la vivencia de la fe en la comunidad escolar y familiar. Responde cada reactivo con atención.',
    type: 'quiz',
    area: 'Educación Religiosa',
    grade: 4,
    section: 'B',
    due_date: '2026-11-30T23:59',
    created_at: new Date().toISOString(),
    competencies: ['rel_c1', 'rel_c2'],
    capacities: {
      rel_c1: ['rel_c1_cap1', 'rel_c1_cap2'],
      rel_c2: ['rel_c2_cap1', 'rel_c2_cap2']
    },
    max_score: 20,
    time_limit: 15,
    status: 'active',
    questions: [
      {
        id: 'q_rel_1',
        text: '¿Cuál es el significado fundamental de la Parábola del Buen Samaritano para la convivencia actual?',
        type: 'multiple_choice',
        points: 5,
        required: true,
        feedbackCorrect: '¡Excelente! El prójimo es cualquier persona que necesita nuestro auxilio, sin distinción.',
        feedbackIncorrect: 'Recuerda que Jesús nos enseña que el prójimo no depende de la raza o religión, sino de la compasión activa.',
        options: [
          { id: 'opt_1_a', text: 'Ayudar únicamente a los miembros de nuestra propia comunidad o credo.', isCorrect: false },
          { id: 'opt_1_b', text: 'Reconocer como prójimo a toda persona necesitada y actuar con misericordia y justicia.', isCorrect: true },
          { id: 'opt_1_c', text: 'Evitar involucrarnos en los problemas de extraños para proteger nuestra seguridad.', isCorrect: false },
          { id: 'opt_1_d', text: 'Cumplir estrictamente la ley ritual por encima de la caridad humana.', isCorrect: false }
        ]
      },
      {
        id: 'q_rel_2',
        text: '¿Cómo se manifiesta el Sacramento de la Eucaristía en el compromiso moral y social del cristiano?',
        type: 'multiple_choice',
        points: 5,
        required: true,
        feedbackCorrect: '¡Correcto! La Eucaristía nos impulsa a compartir el pan y trabajar por la fraternidad y la justicia.',
        feedbackIncorrect: 'La Eucaristía no es solo un rito ceremonial, es comunión viva que exige fraternidad y servicio solidario.',
        options: [
          { id: 'opt_2_a', text: 'Como un rito aislado que no tiene relación con nuestras acciones en la sociedad.', isCorrect: false },
          { id: 'opt_2_b', text: 'Como fuente de amor que nos compromete a compartir el pan y buscar la justicia con los vulnerables.', isCorrect: true },
          { id: 'opt_2_c', text: 'Como una obligación impuesta que se cumple de manera pasiva.', isCorrect: false },
          { id: 'opt_2_d', text: 'Únicamente como un acto devocional dentro de las paredes del templo.', isCorrect: false }
        ]
      },
      {
        id: 'q_rel_3',
        text: 'De acuerdo a la doctrina social de la Iglesia, ¿qué principio defiende la dignidad inviolable de cada persona desde su concepción hasta su fin natural?',
        type: 'multiple_choice',
        points: 5,
        required: true,
        feedbackCorrect: '¡Muy bien! La dignidad de la persona humana es la base de todos los derechos humanos y la moral católica.',
        feedbackIncorrect: 'El valor de la vida y la persona humana emana de ser imagen y semejanza de Dios.',
        options: [
          { id: 'opt_3_a', text: 'El principio de soberanía económica.', isCorrect: false },
          { id: 'opt_3_b', text: 'El principio de dignidad de la persona humana creada a imagen y semejanza de Dios.', isCorrect: true },
          { id: 'opt_3_c', text: 'El principio del éxito individual competitivo.', isCorrect: false },
          { id: 'opt_3_d', text: 'El utilitarismo social del Estado.', isCorrect: false }
        ]
      },
      {
        id: 'q_rel_4',
        text: 'En relación con la encíclica "Laudato Si\'" del Papa Francisco, ¿cuál es nuestra responsabilidad como creyentes frente a la Creación?',
        type: 'multiple_choice',
        points: 5,
        required: true,
        feedbackCorrect: '¡Exacto! El cuidado de la Casa Común es un deber ecológico, ético y de fe para todos los cristianos.',
        feedbackIncorrect: 'Laudato Si\' enfatiza la conversión ecológica y la protección corresponsable de la naturaleza creada por Dios.',
        options: [
          { id: 'opt_4_a', text: 'Explotar sin límites los recursos naturales para el beneficio económico inmediato.', isCorrect: false },
          { id: 'opt_4_b', text: 'Ejercer una mayordomía responsable, cuidando la "Casa Común" con justicia intergeneracional y solidaridad.', isCorrect: true },
          { id: 'opt_4_c', text: 'Delegar exclusivamente en los gobiernos el cuidado del medio ambiente.', isCorrect: false },
          { id: 'opt_4_d', text: 'Considerar la naturaleza ajena a nuestro proyecto de vida cristiana.', isCorrect: false }
        ]
      }
    ]
  },
  {
    id: 'act_rel_assign_1',
    title: 'Tarea Regular: Análisis y Proyecto Solidario "Creciendo en Comunidad"',
    description: `### Instrucciones de la Actividad:
1. **Lectura y Reflexión:** Lee detenidamente el capítulo 3 del cuaderno Creciendo Juntos de 4° de Secundaria: *"La Fe en Acción Comunitaria"*.
2. **Propuesta Solidaria:** Redacta una propuesta concreta de 1 a 2 páginas donde identifiques una necesidad en tu comunidad o colegio y plantees una acción solidaria inspirada en el Evangelio.
3. **Formato de Entrega:** Puedes subir tu documento en formato PDF, Word o compartir tu enlace de Google Drive con permisos de lectura.
4. **Criterios de Evaluación:** Coherencia doctrinal, viabilidad de la propuesta y argumentación ética.`,
    type: 'assignment',
    area: 'Educación Religiosa',
    grade: 4,
    section: 'B',
    due_date: '2026-11-28T20:00',
    created_at: new Date().toISOString(),
    competencies: ['rel_c1', 'rel_c2'],
    capacities: {
      rel_c1: ['rel_c1_cap2'],
      rel_c2: ['rel_c2_cap1', 'rel_c2_cap2']
    },
    max_score: 20,
    status: 'active',
    allow_file_upload: true,
    allow_link: true,
    allow_text: true
  }
];
