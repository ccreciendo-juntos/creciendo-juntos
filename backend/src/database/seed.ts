import bcrypt from 'bcryptjs';
import { run } from './db';

const hashPassword = (password: string) => {
  return bcrypt.hashSync(password, 10);
};

export const runSeeder = async () => {
  console.log('Running seeder...');
  const now = new Date().toISOString();

  try {
    // 1. Seed Roles
    console.log('Seeding roles...');
    const roles = [
      { id: 'super_admin', name: 'Super Administrador', description: 'Acceso total al sistema' },
      { id: 'admin', name: 'Administrador', description: 'Gestión operativa de la plataforma' },
      { id: 'admin_institucional', name: 'Administrador Institucional', description: 'Gestión de colegios y docentes' },
      { id: 'docente', name: 'Docente', description: 'Compra de materiales y gestión de aulas' },
      { id: 'estudiante', name: 'Estudiante', description: 'Acceso a material y resolución de tareas' }
    ];

    for (const r of roles) {
      await run(
        `INSERT OR IGNORE INTO roles (id, name, description) VALUES (?, ?, ?)`,
        [r.id, r.name, r.description]
      );
    }

    // 2. Seed Test Users
    console.log('Seeding users...');
    const users = [
      {
        id: 'user_admin_1',
        name: 'Administrador Principal',
        email: 'admin@creciendojuntos.com',
        password: hashPassword('admin123'),
        phone: '987654321',
        document_type: 'DNI',
        document_number: '10000001',
        role_id: 'admin'
      },
      {
        id: 'user_docente_1',
        name: 'Prof. Carlos Mendoza',
        email: 'docente@creciendojuntos.com',
        password: hashPassword('docente123'),
        phone: '987654322',
        document_type: 'DNI',
        document_number: '20000002',
        role_id: 'docente'
      },
      {
        id: 'user_estudiante_1',
        name: 'Ana María Gómez',
        email: 'estudiante@creciendojuntos.com',
        password: hashPassword('estudiante123'),
        phone: '987654323',
        document_type: 'DNI',
        document_number: '30000003',
        role_id: 'estudiante'
      }
    ];

    for (const u of users) {
      // Insert User
      await run(
        `INSERT OR IGNORE INTO users (id, name, email, password, phone, document_type, document_number, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [u.id, u.name, u.email, u.password, u.phone, u.document_type, u.document_number, now, now]
      );

      // Insert User Role
      await run(
        `INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)`,
        [u.id, u.role_id]
      );
    }

    // 3. Seed Books (1° to 5° of secondary school)
    console.log('Seeding books...');
    const books = [
      {
        id: 'book_1_sec',
        title: 'Creciendo Juntos - 1° de Secundaria',
        subtitle: '"Dios creó los Cielos y la Tierra" (Gén 1,1)',
        grade: 1,
        description: 'Explora los fundamentos de la fe, la creación del universo y el crecimiento moral en el primer año de educación secundaria.',
        author: 'Equipo Editorial Creciendo Juntos',
        isbn: '978-612-000-001-0',
        digital_price: 35.00,
        physical_price: 65.00,
        stock: 150,
        cover_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop'
      },
      {
        id: 'book_2_sec',
        title: 'Creciendo Juntos - 2° de Secundaria',
        subtitle: '"Ustedes son mis amigos..." (Jn 15,14)',
        grade: 2,
        description: 'Una guía completa para afianzar los lazos de amistad con Jesús y los valores morales y cívicos con un enfoque interactivo.',
        author: 'Equipo Editorial Creciendo Juntos',
        isbn: '978-612-000-002-7',
        digital_price: 35.00,
        physical_price: 65.00,
        stock: 120,
        cover_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=300&auto=format&fit=crop'
      },
      {
        id: 'book_3_sec',
        title: 'Creciendo Juntos - 3° de Secundaria',
        subtitle: '"Que todos sean uno..." (Jn 17,21)',
        grade: 3,
        description: 'Lecciones profundas sobre la vida comunitaria, la iglesia local, la ética social y la unidad en la fe.',
        author: 'Equipo Editorial Creciendo Juntos',
        isbn: '978-612-000-003-4',
        digital_price: 40.00,
        physical_price: 70.00,
        stock: 100,
        cover_url: 'https://images.unsplash.com/photo-1548623917-2fbf0f12c93b?q=80&w=300&auto=format&fit=crop'
      },
      {
        id: 'book_4_sec',
        title: 'Creciendo Juntos - 4° de Secundaria',
        subtitle: '"Ven y sígueme" (Lc 5,27)',
        grade: 4,
        description: 'Análisis de los dilemas éticos contemporáneos, el llamado al discipulado y el compromiso moral del joven católico.',
        author: 'Equipo Editorial Creciendo Juntos',
        isbn: '978-612-000-004-1',
        digital_price: 40.00,
        physical_price: 70.00,
        stock: 90,
        cover_url: 'https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?q=80&w=300&auto=format&fit=crop'
      },
      {
        id: 'book_5_sec',
        title: 'Creciendo Juntos - 5° de Secundaria',
        subtitle: '"Ustedes son sal de la tierra y luz del mundo" (Mt 5, 13-14)',
        grade: 5,
        description: 'Preparación final para el egreso escolar: proyecto de vida, fe en acción, testimonio social y valores del Evangelio.',
        author: 'Equipo Editorial Creciendo Juntos',
        isbn: '978-612-000-005-8',
        digital_price: 45.00,
        physical_price: 75.00,
        stock: 200,
        cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=300&auto=format&fit=crop'
      }
    ];

    for (const b of books) {
      await run(
        `INSERT OR IGNORE INTO books (id, title, subtitle, grade, description, author, isbn, digital_price, physical_price, stock, cover_url, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
        [b.id, b.title, b.subtitle, b.grade, b.description, b.author, b.isbn, b.digital_price, b.physical_price, b.stock, b.cover_url, now, now]
      );
    }

    // 4. Seed Courses
    console.log('Seeding courses...');
    const courses = [
      {
        id: 'course_1',
        title: 'Capacitación Metodológica para Docentes de Educación Religiosa',
        slug: 'capacitacion-docente-metodologia',
        description: 'Estrategias innovadoras de enseñanza, dinámicas de grupo y uso de cuadernos de trabajo interactivos en el aula de secundaria.',
        price: 150.00,
        duration_hours: 40,
        cover_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=300&auto=format&fit=crop',
        minimum_score: 14.0,
        progress_required: 100
      },
      {
        id: 'course_2',
        title: 'Seminario de Ética, Moral y Juventud Contemporánea',
        slug: 'seminario-etica-moral-juventud',
        description: 'Abordaje de desafíos éticos en la juventud actual a la luz de los cuadernos Creciendo Juntos de 4° y 5° de secundaria.',
        price: 80.00,
        duration_hours: 24,
        cover_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=300&auto=format&fit=crop',
        minimum_score: 14.0,
        progress_required: 100
      }
    ];

    for (const c of courses) {
      await run(
        `INSERT OR IGNORE INTO courses (id, title, slug, description, price, duration_hours, cover_url, minimum_score, progress_required, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?)`,
        [c.id, c.title, c.slug, c.description, c.price, c.duration_hours, c.cover_url, c.minimum_score, c.progress_required, now, now]
      );

      // Seed Course Modules
      const modules = [
        { id: `${c.id}_mod_1`, title: 'Módulo 1: Introducción y Fundamentos', sort_order: 1 },
        { id: `${c.id}_mod_2`, title: 'Módulo 2: Aplicación en el Aula', sort_order: 2 }
      ];

      for (const m of modules) {
        await run(
          `INSERT OR IGNORE INTO course_modules (id, course_id, title, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [m.id, c.id, m.title, m.sort_order, now, now]
        );

        // Seed Lessons
        const lessons = [
          {
            id: `${m.id}_less_1`,
            title: 'Lección 1.1: Marco doctrinal y pedagógico',
            description: 'Video introductorio al marco pedagógico de los cuadernos de trabajo Creciendo Juntos.',
            content_type: 'video',
            content_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
            content_body: 'En esta lección revisaremos las bases metodológicas del curso.',
            sort_order: 1
          },
          {
            id: `${m.id}_less_2`,
            title: 'Lección 1.2: Guía metodológica en PDF',
            description: 'Lectura obligatoria y guía práctica de aplicación.',
            content_type: 'pdf',
            content_url: '/assets/guia_metodologica_sample.pdf',
            content_body: 'Descarga y revisa esta guía detallada con dinámicas de grupo.',
            sort_order: 2
          }
        ];

        for (const l of lessons) {
          await run(
            `INSERT OR IGNORE INTO lessons (id, module_id, title, description, content_type, content_url, content_body, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [l.id, m.id, l.title, l.description, l.content_type, l.content_url, l.content_body, l.sort_order, now, now]
          );
        }
      }
    }

    console.log('Seeder completed successfully.');
  } catch (err) {
    console.error('Seeder failed:', err);
  }
};

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  runSeeder()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
