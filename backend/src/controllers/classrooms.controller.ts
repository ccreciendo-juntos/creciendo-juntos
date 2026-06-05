import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { run, query, getOne } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const createClassroom = async (req: AuthenticatedRequest, res: Response) => {
  const { name, grade, section, academic_year } = req.body;
  const teacherId = req.user?.id;

  if (!name || !grade || !section || !academic_year) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Nombre, grado, sección y año lectivo son campos obligatorios.' }
    });
  }

  const classroomId = `class_${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await run(
      `INSERT INTO classrooms (id, teacher_id, school_id, name, grade, section, academic_year, status, created_at, updated_at)
       VALUES (?, ?, null, ?, ?, ?, ?, 'active', ?, ?)`,
      [classroomId, teacherId, name, parseInt(grade), section, academic_year, now, now]
    );

    await logAudit(teacherId || null, 'CREATE_CLASSROOM', 'classrooms', classroomId, req.ip || null);

    const classroom = await getOne(`SELECT * FROM classrooms WHERE id = ?`, [classroomId]);
    return res.status(201).json({
      success: true,
      message: 'Aula creada con éxito.',
      data: classroom
    });
  } catch (err) {
    console.error('Create classroom error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al crear el aula.' }
    });
  }
};

export const listClassrooms = async (req: AuthenticatedRequest, res: Response) => {
  const teacherId = req.user?.id;
  const role = req.user?.role;

  try {
    let classrooms;
    if (role === 'admin' || role === 'super_admin') {
      classrooms = await query(`SELECT * FROM classrooms ORDER BY created_at DESC`);
    } else {
      classrooms = await query(`SELECT * FROM classrooms WHERE teacher_id = ? ORDER BY created_at DESC`, [teacherId]);
    }

    return res.status(200).json({
      success: true,
      data: classrooms
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar las aulas.' }
    });
  }
};

export const registerStudent = async (req: AuthenticatedRequest, res: Response) => {
  const { classroomId, name, email, document_number } = req.body;

  if (!classroomId || !name || !email) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Aula, nombre y correo son obligatorios.' }
    });
  }

  try {
    const classroom = await getOne(`SELECT id FROM classrooms WHERE id = ?`, [classroomId]);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        error: { code: 'CLASSROOM_NOT_FOUND', message: 'El aula especificada no existe.' }
      });
    }

    // Check if email already registered
    const existingUser = await getOne(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'El correo electrónico ya está registrado.' }
      });
    }

    const studentId = `usr_${Date.now()}_stud`;
    const tempPassword = `temp_${Math.floor(100000 + Math.random() * 900000)}`;
    const hashedPassword = bcrypt.hashSync(tempPassword, 10);
    const now = new Date().toISOString();

    // Create User
    await run(
      `INSERT INTO users (id, name, email, password, phone, document_type, document_number, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, null, 'DNI', ?, 'active', ?, ?)`,
      [studentId, name, email, hashedPassword, document_number || null, now, now]
    );

    // Assign Estudiante Role
    await run(`INSERT INTO user_roles (user_id, role_id) VALUES (?, 'estudiante')`, [studentId]);

    // Create Student Profile
    const studentCode = `STD-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
    const profileId = `sprof_${Date.now()}`;
    await run(
      `INSERT INTO student_profiles (id, user_id, classroom_id, guardian_name, student_code, status, created_at, updated_at)
       VALUES (?, ?, ?, null, ?, 'active', ?, ?)`,
      [profileId, studentId, classroomId, studentCode, now, now]
    );

    // Add to Classroom students list
    await run(`INSERT INTO classroom_students (classroom_id, student_id) VALUES (?, ?)`, [classroomId, studentId]);

    await logAudit(req.user?.id || null, 'REGISTER_STUDENT', 'student_profiles', studentId, req.ip || null);

    return res.status(201).json({
      success: true,
      message: 'Estudiante registrado con éxito.',
      data: {
        id: studentId,
        name,
        email,
        studentCode,
        tempPassword // Share temporary password for testing
      }
    });
  } catch (err) {
    console.error('Register student error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }
    });
  }
};

export const importStudents = async (req: AuthenticatedRequest, res: Response) => {
  const { classroomId, students } = req.body; // students: Array<{ name: string, email: string, document_number?: string }>

  if (!classroomId || !students || !Array.isArray(students)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Aula y lista de estudiantes requeridos.' }
    });
  }

  try {
    const classroom = await getOne(`SELECT id FROM classrooms WHERE id = ?`, [classroomId]);
    if (!classroom) {
      return res.status(404).json({
        success: false,
        error: { code: 'CLASSROOM_NOT_FOUND', message: 'El aula no existe.' }
      });
    }

    const importedList: any[] = [];
    const now = new Date().toISOString();

    for (const stud of students) {
      // Validate unique email in DB
      const exists = await getOne(`SELECT id FROM users WHERE email = ?`, [stud.email]);
      if (exists) continue; // skip duplicates

      const studentId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const tempPassword = `cj_${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedPassword = bcrypt.hashSync(tempPassword, 10);
      const studentCode = `STD-${Date.now().toString().slice(-4)}-${Math.floor(10 + Math.random() * 90)}`;
      const profileId = `sprof_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

      await run(
        `INSERT INTO users (id, name, email, password, phone, document_type, document_number, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, null, 'DNI', ?, 'active', ?, ?)`,
        [studentId, stud.name, stud.email, hashedPassword, stud.document_number || null, now, now]
      );

      await run(`INSERT INTO user_roles (user_id, role_id) VALUES (?, 'estudiante')`, [studentId]);

      await run(
        `INSERT INTO student_profiles (id, user_id, classroom_id, guardian_name, student_code, status, created_at, updated_at)
         VALUES (?, ?, ?, null, ?, 'active', ?, ?)`,
        [profileId, studentId, classroomId, studentCode, now, now]
      );

      await run(`INSERT INTO classroom_students (classroom_id, student_id) VALUES (?, ?)`, [classroomId, studentId]);

      importedList.push({
        name: stud.name,
        email: stud.email,
        studentCode,
        tempPassword
      });
    }

    await logAudit(req.user?.id || null, 'IMPORT_STUDENTS_BULK', 'classrooms', classroomId, req.ip || null);

    return res.status(200).json({
      success: true,
      message: `Se importaron ${importedList.length} estudiantes con éxito.`,
      data: importedList
    });
  } catch (err) {
    console.error('Import students bulk error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error procesando la carga masiva.' }
    });
  }
};

export const getClassroomProgress = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const students = await query(
      `SELECT u.id, u.name, u.email, sp.student_code, sp.status
       FROM users u
       JOIN student_profiles sp ON u.id = sp.user_id
       WHERE sp.classroom_id = ?`,
      [id]
    );

    // Get grades summary per student
    const progressList = [];
    for (const student of students) {
      const grades = await query(
        `SELECT g.*, a.title as assessment_title, a.type as assessment_type
         FROM grades g
         JOIN assessments a ON g.assessment_id = a.id
         WHERE g.user_id = ? AND a.classroom_id = ?`,
        [student.id, id]
      );

      const totalGrades = grades.length;
      const averageScore = totalGrades > 0 ? (grades.reduce((sum, g) => sum + g.score, 0) / totalGrades) : 0;

      progressList.push({
        ...student,
        grades,
        averageScore: parseFloat(averageScore.toFixed(2)),
        completedCount: totalGrades
      });
    }

    return res.status(200).json({
      success: true,
      data: progressList
    });
  } catch (err) {
    console.error('Classroom progress error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener progreso de la clase.' }
    });
  }
};

export const createAssessment = async (req: AuthenticatedRequest, res: Response) => {
  const { title, type, classroomId, startAt, endAt, maxScore, questions } = req.body;

  if (!title || !type || !classroomId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Título, tipo (quiz/exam/task) y aula son requeridos.' }
    });
  }

  const assessmentId = `assess_${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await run(
      `INSERT INTO assessments (id, title, type, course_id, classroom_id, start_at, end_at, max_score, status, created_at, updated_at)
       VALUES (?, ?, ?, null, ?, ?, ?, ?, 'published', ?, ?)`,
      [assessmentId, title, type, classroomId, startAt || null, endAt || null, maxScore ? parseFloat(maxScore) : 20.0, now, now]
    );

    // If quiz/exam, insert questions
    if (questions && Array.isArray(questions)) {
      for (const q of questions) {
        const qId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        await run(
          `INSERT INTO questions (id, assessment_id, text, type, options, correct_answer, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [qId, assessmentId, q.text, q.type, JSON.stringify(q.options || []), q.correct_answer || null, now, now]
        );
      }
    }

    await logAudit(req.user?.id || null, 'CREATE_ASSESSMENT', 'assessments', assessmentId, req.ip || null);

    return res.status(201).json({
      success: true,
      message: 'Evaluación/Tarea creada y asignada con éxito.',
      data: { id: assessmentId, title, type }
    });
  } catch (err) {
    console.error('Create assessment error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al registrar la evaluación.' }
    });
  }
};

export const submitAssessment = async (req: AuthenticatedRequest, res: Response) => {
  const { assessmentId, answers } = req.body; // answers: Array<{ questionId: string, answerText: string }>
  const userId = req.user?.id;

  if (!assessmentId || !answers || !Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'ID de evaluación y respuestas requeridos.' }
    });
  }

  try {
    const assessment = await getOne(`SELECT * FROM assessments WHERE id = ?`, [assessmentId]);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: { code: 'ASSESSMENT_NOT_FOUND', message: 'Evaluación no encontrada.' }
      });
    }

    const now = new Date().toISOString();
    let score = 0;
    let autoGraded = true;

    // Check attempt limits
    const existingGrade = await getOne(`SELECT id FROM grades WHERE assessment_id = ? AND user_id = ?`, [assessmentId, userId]);
    if (existingGrade) {
      return res.status(400).json({
        success: false,
        error: { code: 'ATTEMPT_LIMIT_EXCEEDED', message: 'Ya has enviado esta evaluación anteriormente.' }
      });
    }

    // Process each answer
    for (const ans of answers) {
      const q = await getOne(`SELECT * FROM questions WHERE id = ?`, [ans.questionId]);
      if (!q) continue;

      const isCorrect = q.correct_answer === ans.answerText;
      const questionScore = isCorrect ? (assessment.max_score / answers.length) : 0;
      score += questionScore;

      if (q.type === 'open') {
        autoGraded = false; // requires manual grading
      }

      const ansId = `ans_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      await run(
        `INSERT INTO answers (id, question_id, user_id, answer_text, score, feedback, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, null, ?, ?)`,
        [ansId, ans.questionId, userId, ans.answerText, autoGraded ? questionScore : null, now, now]
      );
    }

    // Save final grade
    const gradeId = `grd_${Date.now()}`;
    await run(
      `INSERT INTO grades (id, assessment_id, user_id, score, feedback, attempts_left, graded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [gradeId, assessmentId, userId, autoGraded ? score : 0, autoGraded ? 'Autocalificado por el sistema' : 'Pendiente de calificación docente', now, now, now]
    );

    return res.status(200).json({
      success: true,
      message: autoGraded ? 'Evaluación enviada y autocalificada con éxito.' : 'Evaluación enviada. Pendiente de calificación docente.',
      data: { score: autoGraded ? score : null }
    });
  } catch (err) {
    console.error('Submit assessment error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al enviar respuestas.' }
    });
  }
};

export const gradeAssessment = async (req: AuthenticatedRequest, res: Response) => {
  const { gradeId, score, feedback } = req.body;
  const teacherId = req.user?.id;

  if (score === undefined) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El puntaje es obligatorio.' }
    });
  }

  try {
    const grade = await getOne(`SELECT * FROM grades WHERE id = ?`, [gradeId]);
    if (!grade) {
      return res.status(404).json({
        success: false,
        error: { code: 'GRADE_NOT_FOUND', message: 'Registro de calificación no encontrado.' }
      });
    }

    const now = new Date().toISOString();
    await run(
      `UPDATE grades
       SET score = ?, feedback = ?, graded_at = ?, updated_at = ?
       WHERE id = ?`,
      [parseFloat(score), feedback || null, now, now, gradeId]
    );

    await logAudit(teacherId || null, 'GRADE_STUDENT', 'grades', gradeId, req.ip || null);

    return res.status(200).json({
      success: true,
      message: 'Estudiante calificado con éxito.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al calificar al estudiante.' }
    });
  }
};

export const getClassroomAssessments = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // classroomId
  try {
    const assessments = await query(
      `SELECT * FROM assessments WHERE classroom_id = ? ORDER BY created_at DESC`,
      [id]
    );
    for (const a of assessments) {
      const qCount = await getOne(`SELECT COUNT(*) as cnt FROM questions WHERE assessment_id = ?`, [a.id]);
      a.questions_count = qCount ? qCount.cnt : 0;
    }
    return res.status(200).json({
      success: true,
      data: assessments
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar evaluaciones.' }
    });
  }
};

export const getAssessmentDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const assessment = await getOne(`SELECT * FROM assessments WHERE id = ?`, [id]);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Evaluación no encontrada.' }
      });
    }
    const questions = await query(`SELECT * FROM questions WHERE assessment_id = ?`, [id]);
    for (const q of questions) {
      try {
        q.options = JSON.parse(q.options || '[]');
      } catch {
        q.options = [];
      }
    }
    assessment.questions = questions;
    return res.status(200).json({
      success: true,
      data: assessment
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener detalle de la evaluación.' }
    });
  }
};

export const getAssessmentSubmissions = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params; // assessmentId
  try {
    const submissions = await query(
      `SELECT g.*, u.name as user_name, u.email as user_email
       FROM grades g
       JOIN users u ON g.user_id = u.id
       WHERE g.assessment_id = ?
       ORDER BY g.created_at DESC`,
      [id]
    );
    for (const sub of submissions) {
      const ans = await query(
        `SELECT a.*, q.text as question_text, q.type as question_type
         FROM answers a
         JOIN questions q ON a.question_id = q.id
         WHERE a.user_id = ? AND q.assessment_id = ?`,
        [sub.user_id, id]
      );
      sub.answers = ans;
    }
    return res.status(200).json({
      success: true,
      data: submissions
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener entregas.' }
    });
  }
};

export const getStudentAssessments = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    const enrolledClassrooms = await query(
      `SELECT classroom_id FROM classroom_students WHERE student_id = ?`,
      [userId]
    );
    if (enrolledClassrooms.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    const classroomIds = enrolledClassrooms.map(c => c.classroom_id);
    const placeholders = classroomIds.map(() => '?').join(',');
    const assessments = await query(
      `SELECT a.*, c.name as classroom_name
       FROM assessments a
       JOIN classrooms c ON a.classroom_id = c.id
       WHERE a.classroom_id IN (${placeholders}) AND a.status = 'published'
       ORDER BY a.created_at DESC`,
      classroomIds
    );
    for (const a of assessments) {
      const grade = await getOne(
        `SELECT * FROM grades WHERE assessment_id = ? AND user_id = ?`,
        [a.id, userId]
      );
      a.my_grade = grade || null;
    }
    return res.status(200).json({
      success: true,
      data: assessments
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener evaluaciones del alumno.' }
    });
  }
};
