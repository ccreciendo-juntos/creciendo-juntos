export interface ExperienceVideo {
  id: string;
  tag: string;
  title: string;
  desc: string;
  duration: string;
  bg: string;
  videoUrl: string;
}

export interface LandingConfig {
  brandName: string;
  brandSubtitle: string;
  topBadge: string;
  topBannerText: string;
  topShippingText: string;
  contactEmail: string;
  whatsappNumber: string;
  whatsappLabel: string;
  heroPill: string;
  heroTitleStart: string;
  heroTitleHighlight: string;
  heroTitleEnd: string;
  heroSubtitle: string;
  heroQuote: string;
  heroQuoteAuthor: string;
  ctaPrimaryText: string;
  ctaSecondaryText: string;
  ctaTertiaryText: string;
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
  stat3Value: string;
  stat3Label: string;
  stat4Value: string;
  stat4Label: string;
  programsTitle: string;
  programsSubtitle: string;
  simulacroBadge: string;
  simulacroTitle: string;
  simulacroDesc: string;
  simulacroButton: string;
  footerBrandTitle: string;
  footerBrandSubtitle: string;
  footerCopyright: string;
  experienceTitle: string;
  experienceSubtitle: string;
  experienceVideos: ExperienceVideo[];
}

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  brandName: 'Creciendo Juntos',
  brandSubtitle: 'Educación Religiosa Secundaria',
  topBadge: 'OFICIAL',
  topBannerText: '11 Años Formando Docentes y Estudiantes con Excelencia • 120 Horas Pedagógicas MINEDU',
  topShippingText: 'Envíos físicos y licencias digitales a todo el Perú',
  contactEmail: 'informes@creciendojuntos.com',
  whatsappNumber: '51999999999',
  whatsappLabel: '¿Necesitas ayuda? ¡Escríbenos por WhatsApp!',
  heroPill: '✨ 11 AÑOS FORMANDO DOCENTES QUE AVANZAN, CRECEN Y LOGRAN MÁS',
  heroTitleStart: '11 años formando docentes que ',
  heroTitleHighlight: 'avanzan, crecen',
  heroTitleEnd: ' y logran más.',
  heroSubtitle:
    'Programas 100% prácticos, diseñados por expertos para fortalecer tu crecimiento docente y formar valores cívicos y morales en secundaria de 1° a 5°.',
  heroQuote: '"Crean lo que aprenden, enseñen lo que creen y practiquen lo que enseñan."',
  heroQuoteAuthor: 'San Agustín',
  ctaPrimaryText: 'Explorar Programas 2026',
  ctaSecondaryText: 'Registrarme como Docente',
  ctaTertiaryText: 'Ver Cuadernos 1° a 5°',
  stat1Value: '15,000+',
  stat1Label: 'Estudiantes Formados',
  stat2Value: '350+',
  stat2Label: 'Docentes Capacitados',
  stat3Value: '120+',
  stat3Label: 'Colegios Aliados',
  stat4Value: '99.2%',
  stat4Label: 'Satisfacción',
  programsTitle: 'Programas Especializados',
  programsSubtitle: 'Programas 100% prácticos diseñados para tu crecimiento docente',
  simulacroBadge: 'EXCLUSIVO DOCENTES 2026',
  simulacroTitle: 'Simulacros en Vivo 2026',
  simulacroDesc:
    'Evalúa tus conocimientos pedagógicos y disciplinares en tiempo real con retroalimentación instantánea y ranking nacional.',
  simulacroButton: 'Empezar Simulacro Gratuito',
  footerBrandTitle: 'Colección Creciendo Juntos',
  footerBrandSubtitle: 'Plataforma Educativa Religiosa de Secundaria',
  footerCopyright: 'derechos reservados por E. Alberto M.',
  experienceTitle: 'Experiencia Creciendo Juntos en Acción',
  experienceSubtitle: 'Fragmentos breves de nuestras sesiones dinámicas y testimonios reales.',
  experienceVideos: [
    {
      id: 'vid_1',
      tag: 'Metodología',
      title: 'Metodología Dinámica en Aula',
      desc: 'Estrategias activas con los cuadernos de 1° a 5°.',
      duration: '1:20',
      bg: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=500&auto=format&fit=crop',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    },
    {
      id: 'vid_2',
      tag: 'Plataforma',
      title: 'Aula Virtual Interactiva',
      desc: 'Evaluaciones CNEB, asistencia y tareas en vivo.',
      duration: '0:45',
      bg: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=500&auto=format&fit=crop',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    },
    {
      id: 'vid_3',
      tag: 'Testimonio',
      title: 'Voces de Colegios Aliados',
      desc: 'Resultados reales en valores y formación moral.',
      duration: '2:05',
      bg: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=500&auto=format&fit=crop',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    },
  ],
};
