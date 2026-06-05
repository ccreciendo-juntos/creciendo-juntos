import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setActiveDb } from './database/db';

// Import Express controllers
import { register, login, me, forgotPassword } from './controllers/auth.controller';
import { listBooks, getBookDetails, createBook, updateBook, deleteBook } from './controllers/books.controller';
import { createOrder, registerManualPayment, checkoutCard, approvePayment, rejectPayment, myOrders, listAllOrders, getOrderDetails } from './controllers/orders.controller';
import { listCourses, getCourseDetails, createCourse, getStudentCourses, completeLesson, generateCertificate, verifyCertificatePublic, createModule, createLesson, updateCourse, deleteCourse, registerCourseParticipant, importCourseParticipants } from './controllers/courses.controller';
import { createClassroom, listClassrooms, registerStudent, importStudents, getClassroomProgress, createAssessment, submitAssessment, gradeAssessment, getClassroomAssessments, getAssessmentDetails, getAssessmentSubmissions, getStudentAssessments } from './controllers/classrooms.controller';
import { getAdminMetrics, getAuditLogs } from './controllers/reports.controller';

// JWT verification wrapper using jsonwebtoken with nodejs_compat
import jwt from 'jsonwebtoken';

const app = new Hono<{ Bindings: { DB: any, JWT_SECRET: string } }>();

// Enable CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

let dbInitialized = false;

// Request Db Binding Middleware
app.use('*', async (c, next) => {
  setActiveDb(c.env.DB);
  
  if (!dbInitialized && c.env.DB) {
    try {
      // Check if roles table exists and has data
      await c.env.DB.prepare("SELECT id FROM roles LIMIT 1").all();
      dbInitialized = true;
    } catch (err) {
      console.log("D1 Database tables do not exist. Initializing schema...");
      try {
        const { migrationSql } = await import('./database/migrate');
        
        // Strip SQL comments and empty lines, split statements
        const sqlStatements = migrationSql
          .split('\n')
          .map((line: string) => line.replace(/--.*$/, '').trim())
          .join('\n')
          .split(';')
          .map((stmt: string) => stmt.trim())
          .filter((stmt: string) => stmt.length > 0);

        for (const statement of sqlStatements) {
          try {
            await c.env.DB.prepare(statement).run();
          } catch (stmtErr: any) {
            console.error("Failed to execute SQL statement:", statement, stmtErr);
            throw stmtErr;
          }
        }
        
        const { runSeeder } = await import('./database/seed');
        await runSeeder();
        
        console.log("D1 Database initialized and seeded successfully.");
        dbInitialized = true;
      } catch (migrationErr) {
        console.error("D1 local migration or seeding failed:", migrationErr);
      }
    }
  }
  
  await next();
});

const JWT_SECRET = 'creciendo_juntos_super_secret_key_2026';

// Bridge helper to convert Express controller signatures to Hono handlers
const expressToHono = (controllerMethod: any, requireAuth = false, allowedRoles: string[] = []) => {
  return async (c: any) => {
    // Authentication check if required
    let user: any = null;
    if (requireAuth) {
      const authHeader = c.req.header('authorization');
      const token = authHeader && authHeader.split(' ')[1];
      if (!token) {
        return c.json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Token de acceso no proporcionado.' }
        }, 401);
      }
      try {
        user = jwt.verify(token, c.env.JWT_SECRET || JWT_SECRET);
      } catch (err) {
        return c.json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Token de acceso inválido o expirado.' }
        }, 403);
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return c.json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'No tiene permisos para realizar esta acción.' }
        }, 403);
      }
    }

    // Extract request body details if method has body
    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      try {
        body = await c.req.json();
      } catch (err) {
        body = {};
      }
    }

    const req = {
      body,
      query: c.req.query(),
      params: c.req.param(),
      ip: c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || '127.0.0.1',
      user,
      headers: {
        authorization: c.req.header('authorization')
      }
    } as any;

    let responseStatus = 200;
    let responseData: any = null;

    const res = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      }
    } as any;

    try {
      await controllerMethod(req, res);
      return c.json(responseData, responseStatus);
    } catch (err: any) {
      console.error('Worker bridge execution error:', err);
      return c.json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'Error interno en Cloudflare Worker.' }
      }, 500);
    }
  };
};

// --- API ROUTES MAP ---

// 1. Autenticación
app.post('/api/v1/auth/register', expressToHono(register));
app.post('/api/v1/auth/login', expressToHono(login));
app.post('/api/v1/auth/forgot-password', expressToHono(forgotPassword));
app.get('/api/v1/auth/me', expressToHono(me, true));

// 2. Libros
app.get('/api/v1/books', expressToHono(listBooks));
app.get('/api/v1/books/:id', expressToHono(getBookDetails));
app.post('/api/v1/admin/books', expressToHono(createBook, true, ['admin', 'super_admin']));
app.put('/api/v1/admin/books/:id', expressToHono(updateBook, true, ['admin', 'super_admin']));
app.delete('/api/v1/admin/books/:id', expressToHono(deleteBook, true, ['admin', 'super_admin']));

// 3. Pedidos y Pagos
app.post('/api/v1/orders', expressToHono(createOrder, true));
app.get('/api/v1/orders/my', expressToHono(myOrders, true));
app.get('/api/v1/orders/:id', expressToHono(getOrderDetails, true));
app.post('/api/v1/payments/manual', expressToHono(registerManualPayment, true));
app.post('/api/v1/payments/card/checkout', expressToHono(checkoutCard, true));

app.get('/api/v1/admin/orders', expressToHono(listAllOrders, true, ['admin', 'super_admin']));
app.put('/api/v1/admin/payments/approve', expressToHono(approvePayment, true, ['admin', 'super_admin']));
app.put('/api/v1/admin/payments/reject', expressToHono(rejectPayment, true, ['admin', 'super_admin']));

// 4. Cursos y Aula Virtual
app.get('/api/v1/courses', expressToHono(listCourses));
app.get('/api/v1/courses/:id', expressToHono(getCourseDetails));
app.post('/api/v1/admin/courses', expressToHono(createCourse, true, ['docente', 'admin', 'super_admin']));
app.put('/api/v1/admin/courses/:id', expressToHono(updateCourse, true, ['docente', 'admin', 'super_admin']));
app.delete('/api/v1/admin/courses/:id', expressToHono(deleteCourse, true, ['docente', 'admin', 'super_admin']));
app.post('/api/v1/admin/courses/:id/register-student', expressToHono(registerCourseParticipant, true, ['admin', 'super_admin']));
app.post('/api/v1/admin/courses/:id/import-students', expressToHono(importCourseParticipants, true, ['admin', 'super_admin']));
app.post('/api/v1/admin/courses/:courseId/modules', expressToHono(createModule, true, ['docente', 'admin', 'super_admin']));
app.post('/api/v1/admin/modules/:moduleId/lessons', expressToHono(createLesson, true, ['docente', 'admin', 'super_admin']));
app.get('/api/v1/student/courses', expressToHono(getStudentCourses, true));
app.post('/api/v1/lessons/:id/complete', expressToHono(completeLesson, true));

// 5. Aulas y Estudiantes
app.post('/api/v1/teacher/classrooms', expressToHono(createClassroom, true, ['docente', 'admin', 'super_admin']));
app.get('/api/v1/teacher/classrooms', expressToHono(listClassrooms, true, ['docente', 'admin', 'super_admin']));
app.post('/api/v1/teacher/classrooms/register-student', expressToHono(registerStudent, true, ['docente', 'admin', 'super_admin']));
app.post('/api/v1/teacher/classrooms/import-students', expressToHono(importStudents, true, ['docente', 'admin', 'super_admin']));
app.get('/api/v1/teacher/classrooms/:id/progress', expressToHono(getClassroomProgress, true, ['docente', 'admin', 'super_admin']));

// 6. Evaluaciones, Tareas y Notas
app.post('/api/v1/assessments', expressToHono(createAssessment, true, ['docente', 'admin', 'super_admin']));
app.post('/api/v1/assessments/submit', expressToHono(submitAssessment, true));
app.put('/api/v1/assessments/grade', expressToHono(gradeAssessment, true, ['docente', 'admin', 'super_admin']));
app.get('/api/v1/classrooms/:id/assessments', expressToHono(getClassroomAssessments, true));
app.get('/api/v1/assessments/:id', expressToHono(getAssessmentDetails, true));
app.get('/api/v1/assessments/:id/submissions', expressToHono(getAssessmentSubmissions, true, ['docente', 'admin', 'super_admin']));
app.get('/api/v1/student/assessments', expressToHono(getStudentAssessments, true));

// 7. Certificados
app.post('/api/v1/certificates/generate', expressToHono(generateCertificate, true));
app.get('/api/v1/certificates/verify/:code', expressToHono(verifyCertificatePublic));

// 8. Reportes y Auditoría
app.get('/api/v1/admin/metrics', expressToHono(getAdminMetrics, true, ['admin', 'super_admin']));
app.get('/api/v1/admin/audit-logs', expressToHono(getAuditLogs, true, ['admin', 'super_admin']));

// Root and Health Check
app.all('/', (c) => {
  return c.json({ status: 'healthy', project: 'Colección Creciendo Juntos Serverless Worker (D1 & Hono)' });
});

export default app;
