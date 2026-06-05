import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { run, query, getOne } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const listCourses = async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.query;
  let sql = `SELECT * FROM courses WHERE 1=1`;
  const params: any[] = [];

  if (req.user && ['admin', 'super_admin'].includes(req.user.role)) {
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
  } else {
    sql += ` AND status = 'published'`;
  }

  try {
    const courses = await query(sql, params);
    return res.status(200).json({
      success: true,
      data: courses
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar los cursos.' }
    });
  }
};

export const getCourseDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const course = await getOne(`SELECT * FROM courses WHERE id = ?`, [id]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Curso no encontrado.' }
      });
    }

    const modules = await query(
      `SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC`,
      [id]
    );

    for (const m of modules) {
      m.lessons = await query(
        `SELECT id, title, description, content_type, content_url, sort_order FROM lessons WHERE module_id = ? ORDER BY sort_order ASC`,
        [m.id]
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        ...course,
        modules
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener el detalle del curso.' }
    });
  }
};

export const createCourse = async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, price, duration_hours, cover_url, minimum_score, progress_required, status } = req.body;

  if (!title || price === undefined || !duration_hours) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Título, precio y horas son campos obligatorios.' }
    });
  }

  const courseId = `course_${Date.now()}`;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const now = new Date().toISOString();

  try {
    await run(
      `INSERT INTO courses (id, title, slug, description, price, duration_hours, cover_url, minimum_score, progress_required, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        title,
        slug,
        description || null,
        parseFloat(price),
        parseInt(duration_hours),
        cover_url || null,
        minimum_score ? parseFloat(minimum_score) : 14.0,
        progress_required ? parseInt(progress_required) : 100,
        status || 'draft',
        now,
        now
      ]
    );

    await logAudit(req.user?.id || null, 'CREATE_COURSE', 'courses', courseId, req.ip || null);

    return res.status(201).json({
      success: true,
      message: 'Curso creado con éxito.',
      data: { id: courseId, title, slug }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al registrar el curso.' }
    });
  }
};

export const getStudentCourses = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  try {
    const enrollments = await query(
      `SELECT e.*, c.title as course_title, c.cover_url as course_cover, c.duration_hours as course_hours
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.user_id = ?`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: enrollments
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener sus cursos.' }
    });
  }
};

export const completeLesson = async (req: AuthenticatedRequest, res: Response) => {
  const { id: lessonId } = req.params; // Lesson ID
  const userId = req.user?.id;

  try {
    const lesson = await getOne(
      `SELECT l.id, m.course_id FROM lessons l
       JOIN course_modules m ON l.module_id = m.id
       WHERE l.id = ?`,
      [lessonId]
    );

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: { code: 'LESSON_NOT_FOUND', message: 'Lección no encontrada.' }
      });
    }

    const enrollment = await getOne(
      `SELECT id, progress FROM enrollments WHERE user_id = ? AND course_id = ?`,
      [userId, lesson.course_id]
    );

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_ENROLLED', message: 'No se encuentra matriculado en este curso.' }
      });
    }

    // In a full implementation, we track completed lessons in a join table.
    // Here we'll simulate progress increase up to 100%
    const currentProgress = Math.min(enrollment.progress + 25, 100);
    const now = new Date().toISOString();

    await run(
      `UPDATE enrollments SET progress = ?, updated_at = ? WHERE id = ?`,
      [currentProgress, now, enrollment.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Progreso de lección registrado.',
      data: { progress: currentProgress }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al registrar progreso de lección.' }
    });
  }
};

export const generateCertificate = async (req: AuthenticatedRequest, res: Response) => {
  const { enrollmentId } = req.body;

  try {
    const enrollment = await getOne(
      `SELECT e.*, c.title as course_title, c.duration_hours, u.name as user_name
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`,
      [enrollmentId]
    );

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: { code: 'ENROLLMENT_NOT_FOUND', message: 'Matrícula no encontrada.' }
      });
    }

    if (enrollment.progress < 100) {
      return res.status(400).json({
        success: false,
        error: { code: 'INCOMPLETE_COURSE', message: 'Debe completar el 100% del curso para certificarse.' }
      });
    }

    const certificateCode = `CERT-${enrollment.course_id.slice(-4).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const certId = `cert_${Date.now()}`;
    const now = new Date().toISOString();

    // Verify if already certified
    const existingCert = await getOne(`SELECT * FROM certificates WHERE enrollment_id = ?`, [enrollmentId]);
    if (existingCert) {
      return res.status(200).json({
        success: true,
        message: 'El certificado ya había sido generado.',
        data: existingCert
      });
    }

    // Generate Certificate
    const qrUrl = `/certificados/verificar/${certificateCode}`;
    const pdfUrl = `/assets/certificados/${certId}.pdf`;

    await run(
      `INSERT INTO certificates (id, certificate_code, user_id, course_id, enrollment_id, issued_at, hours, pdf_url, qr_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?)`,
      [
        certId,
        certificateCode,
        enrollment.user_id,
        enrollment.course_id,
        enrollmentId,
        now,
        enrollment.duration_hours,
        pdfUrl,
        qrUrl,
        now,
        now
      ]
    );

    // Update enrollment status to completed
    await run(`UPDATE enrollments SET status = 'completed', updated_at = ? WHERE id = ?`, [now, enrollmentId]);

    const newCert = await getOne(`SELECT * FROM certificates WHERE id = ?`, [certId]);
    return res.status(201).json({
      success: true,
      message: 'Certificado emitido con éxito.',
      data: newCert
    });
  } catch (err) {
    console.error('Generate certificate error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al emitir el certificado.' }
    });
  }
};

export const verifyCertificatePublic = async (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.params;

  try {
    const certs = await query(
      `SELECT cert.*, u.name as student_name, u.document_number as student_dni, c.title as course_title
       FROM certificates cert
       JOIN users u ON cert.user_id = u.id
       JOIN courses c ON cert.course_id = c.id
       WHERE cert.certificate_code = ? OR u.document_number = ?
       ORDER BY cert.issued_at DESC`,
      [code, code]
    );

    if (certs.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'CERTIFICATE_NOT_FOUND', message: 'No se encontraron certificados con el código o DNI ingresado.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: certs[0], // first match for compatibility
      all: certs
    });
  } catch (err) {
    console.error('Verify certificate error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al verificar certificado.' }
    });
  }
};

export const createModule = async (req: AuthenticatedRequest, res: Response) => {
  const { courseId } = req.params;
  const { title, sort_order } = req.body;
  if (!title) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Título es requerido.' }
    });
  }
  const moduleId = `mod_${Date.now()}`;
  const now = new Date().toISOString();
  try {
    await run(
      `INSERT INTO course_modules (id, course_id, title, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [moduleId, courseId, title, sort_order || 1, now, now]
    );
    await logAudit(req.user?.id || null, 'CREATE_MODULE', 'course_modules', moduleId, req.ip || null);
    return res.status(201).json({
      success: true,
      data: { id: moduleId, title, course_id: courseId }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al registrar el módulo.' }
    });
  }
};

export const createLesson = async (req: AuthenticatedRequest, res: Response) => {
  const { moduleId } = req.params;
  const { title, description, content_type, content_url, content_body, sort_order } = req.body;
  if (!title || !content_type) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Título y tipo de contenido son obligatorios.' }
    });
  }
  const lessonId = `les_${Date.now()}`;
  const now = new Date().toISOString();
  try {
    await run(
      `INSERT INTO lessons (id, module_id, title, description, content_type, content_url, content_body, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [lessonId, moduleId, title, description || null, content_type, content_url || null, content_body || null, sort_order || 1, now, now]
    );
    await logAudit(req.user?.id || null, 'CREATE_LESSON', 'lessons', lessonId, req.ip || null);
    return res.status(201).json({
      success: true,
      data: { id: lessonId, title, module_id: moduleId }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al registrar la lección.' }
    });
  }
};

export const updateCourse = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, price, duration_hours, cover_url, minimum_score, progress_required, status } = req.body;

  if (!title || price === undefined || !duration_hours) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Título, precio y horas son campos obligatorios.' }
    });
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const now = new Date().toISOString();

  try {
    const course = await getOne(`SELECT id FROM courses WHERE id = ?`, [id]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Curso no encontrado.' }
      });
    }

    await run(
      `UPDATE courses SET title = ?, slug = ?, description = ?, price = ?, duration_hours = ?, cover_url = ?, minimum_score = ?, progress_required = ?, status = ?, updated_at = ? WHERE id = ?`,
      [
        title,
        slug,
        description || null,
        parseFloat(price),
        parseInt(duration_hours),
        cover_url || null,
        minimum_score ? parseFloat(minimum_score) : 14.0,
        progress_required ? parseInt(progress_required) : 100,
        status || 'draft',
        now,
        id
      ]
    );

    await logAudit(req.user?.id || null, 'UPDATE_COURSE', 'courses', id, req.ip || null);

    return res.status(200).json({
      success: true,
      message: 'Curso actualizado con éxito.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al actualizar el curso.' }
    });
  }
};

export const deleteCourse = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const course = await getOne(`SELECT id FROM courses WHERE id = ?`, [id]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'Curso no encontrado.' }
      });
    }

    await run(`DELETE FROM courses WHERE id = ?`, [id]);
    await logAudit(req.user?.id || null, 'DELETE_COURSE', 'courses', id, req.ip || null);

    return res.status(200).json({
      success: true,
      message: 'Curso eliminado con éxito.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al eliminar el curso.' }
    });
  }
};

export const registerCourseParticipant = async (req: AuthenticatedRequest, res: Response) => {
  const { courseId, name, email, document_number } = req.body;

  if (!courseId || !name || !email) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Curso, nombre y correo son obligatorios.' }
    });
  }

  try {
    const course = await getOne(`SELECT id FROM courses WHERE id = ?`, [courseId]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'El curso especificado no existe.' }
      });
    }

    // Check if user exists
    let user = await getOne(`SELECT id FROM users WHERE email = ?`, [email]);
    let userId = user ? user.id : null;
    let tempPassword = '';

    if (!user) {
      // Create User
      userId = `usr_${Date.now()}_stud`;
      tempPassword = `temp_${Math.floor(100000 + Math.random() * 900000)}`;
      const hashedPassword = bcrypt.hashSync(tempPassword, 10);
      const now = new Date().toISOString();

      await run(
        `INSERT INTO users (id, name, email, password, phone, document_type, document_number, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, null, 'DNI', ?, 'active', ?, ?)`,
        [userId, name, email, hashedPassword, document_number || null, now, now]
      );

      // Assign Estudiante Role
      await run(`INSERT INTO user_roles (user_id, role_id) VALUES (?, 'estudiante')`, [userId]);

      // Create Student Profile
      const studentCode = `STD-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
      const profileId = `sprof_${Date.now()}`;
      await run(
        `INSERT INTO student_profiles (id, user_id, classroom_id, guardian_name, student_code, status, created_at, updated_at)
         VALUES (?, ?, null, null, ?, 'active', ?, ?)`,
        [profileId, userId, studentCode, now, now]
      );
    }

    // Check if already enrolled in this course
    const existingEnrollment = await getOne(`SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`, [userId, courseId]);
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_ENROLLED', message: 'El participante ya está matriculado en este curso.' }
      });
    }

    const enrollmentId = `enr_${Date.now()}`;
    const now = new Date().toISOString();
    await run(
      `INSERT INTO enrollments (id, user_id, course_id, status, progress, score, created_at, updated_at)
       VALUES (?, ?, ?, 'active', 0, 0, ?, ?)`,
      [enrollmentId, userId, courseId, now, now]
    );

    await logAudit(req.user?.id || null, 'ENROLL_STUDENT_MANUAL', 'enrollments', enrollmentId, req.ip || null);

    return res.status(201).json({
      success: true,
      message: 'Participante matriculado con éxito.',
      data: {
        userId,
        name,
        email,
        tempPassword: tempPassword || null
      }
    });
  } catch (err) {
    console.error('Enroll student manual error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al matricular participante.' }
    });
  }
};

export const importCourseParticipants = async (req: AuthenticatedRequest, res: Response) => {
  const { courseId, participants } = req.body;

  if (!courseId || !participants || !Array.isArray(participants)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Curso y lista de participantes requeridos.' }
    });
  }

  try {
    const course = await getOne(`SELECT id FROM courses WHERE id = ?`, [courseId]);
    if (!course) {
      return res.status(404).json({
        success: false,
        error: { code: 'COURSE_NOT_FOUND', message: 'El curso no existe.' }
      });
    }

    const importedList: any[] = [];
    const now = new Date().toISOString();

    for (const part of participants) {
      let user = await getOne(`SELECT id FROM users WHERE email = ?`, [part.email]);
      let userId = user ? user.id : null;
      let tempPassword = '';

      if (!user) {
        userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        tempPassword = `cj_${Math.floor(1000 + Math.random() * 9000)}`;
        const hashedPassword = bcrypt.hashSync(tempPassword, 10);
        const studentCode = `STD-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
        const profileId = `sprof_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

        await run(
          `INSERT INTO users (id, name, email, password, phone, document_type, document_number, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, null, 'DNI', ?, 'active', ?, ?)`,
          [userId, part.name, part.email, hashedPassword, part.document_number || null, now, now]
        );

        await run(`INSERT INTO user_roles (user_id, role_id) VALUES (?, 'estudiante')`, [userId]);

        await run(
          `INSERT INTO student_profiles (id, user_id, classroom_id, guardian_name, student_code, status, created_at, updated_at)
           VALUES (?, ?, null, null, ?, 'active', ?, ?)`,
          [profileId, userId, studentCode, now, now]
        );
      }

      const isEnrolled = await getOne(`SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?`, [userId, courseId]);
      if (!isEnrolled) {
        const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        await run(
          `INSERT INTO enrollments (id, user_id, course_id, status, progress, score, created_at, updated_at)
           VALUES (?, ?, ?, 'active', 0, 0, ?, ?)`,
          [enrollmentId, userId, courseId, now, now]
        );

        importedList.push({
          name: part.name,
          email: part.email,
          tempPassword: tempPassword || 'cuenta existente'
        });
      }
    }

    await logAudit(req.user?.id || null, 'IMPORT_COURSE_PARTICIPANTS_BULK', 'courses', courseId, req.ip || null);

    return res.status(200).json({
      success: true,
      message: `Se matricularon ${importedList.length} participantes con éxito.`,
      data: importedList
    });
  } catch (err) {
    console.error('Import course participants error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error procesando la carga masiva al curso.' }
    });
  }
};
