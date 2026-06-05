import { exec } from './db';

export const migrationSql = `
-- 1. Roles table
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

-- 2. Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  phone TEXT,
  document_type TEXT,
  document_number TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, suspended
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. User Roles join table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 4. Schools table
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ruc TEXT UNIQUE,
  address TEXT,
  contact_email TEXT,
  status TEXT DEFAULT 'active', -- active, suspended, inactive
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 5. Teacher Profiles table
CREATE TABLE IF NOT EXISTS teacher_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  school_id TEXT,
  specialty TEXT,
  phone TEXT,
  document_number TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
);

-- 6. Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  school_id TEXT,
  name TEXT NOT NULL,
  grade INTEGER NOT NULL, -- 1 to 5 (secondary)
  section TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, inactive
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
);

-- 7. Student Profiles table
CREATE TABLE IF NOT EXISTS student_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  classroom_id TEXT,
  guardian_name TEXT,
  student_code TEXT UNIQUE,
  status TEXT DEFAULT 'active', -- active, inactive, retired
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL
);

-- 8. Books table
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  grade INTEGER NOT NULL, -- 1 to 5
  description TEXT,
  author TEXT,
  isbn TEXT UNIQUE,
  digital_price REAL NOT NULL,
  physical_price REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  cover_url TEXT,
  status TEXT DEFAULT 'published', -- draft, published, hidden, out_of_stock
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 9. Book Files table
CREATE TABLE IF NOT EXISTS book_files (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- 10. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL DEFAULT 0,
  total REAL NOT NULL,
  payment_status TEXT DEFAULT 'pending', -- pending, validating, paid, rejected
  delivery_status TEXT DEFAULT 'not_apply', -- not_apply, pending, prepared, shipped, delivered
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  book_id TEXT,
  course_id TEXT,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  type TEXT NOT NULL, -- digital_book, physical_book, course
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
);

-- 12. Payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  method TEXT NOT NULL, -- yape, transfer, card
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, validating, approved, rejected, cancelled
  voucher_url TEXT,
  transaction_id TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 13. Courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price REAL NOT NULL,
  duration_hours INTEGER NOT NULL,
  cover_url TEXT,
  minimum_score REAL DEFAULT 14.0,
  progress_required INTEGER DEFAULT 100,
  status TEXT DEFAULT 'published', -- draft, published, closed
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 14. Course Modules table
CREATE TABLE IF NOT EXISTS course_modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 15. Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL, -- video, pdf, text, link
  content_url TEXT,
  content_body TEXT,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (module_id) REFERENCES course_modules(id) ON DELETE CASCADE
);

-- 16. Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- pending, active, completed, dropped, blocked
  progress INTEGER DEFAULT 0, -- percentage
  score REAL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- 17. Classroom Students table
CREATE TABLE IF NOT EXISTS classroom_students (
  classroom_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  PRIMARY KEY (classroom_id, student_id),
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 18. Assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- quiz, exam, task
  course_id TEXT, -- nullable if for classroom directly
  classroom_id TEXT, -- nullable if for course directly
  start_at TEXT,
  end_at TEXT,
  max_score REAL DEFAULT 20.0,
  status TEXT DEFAULT 'draft', -- draft, published, closed
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE
);

-- 19. Questions table
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL, -- multiple_choice, true_false, open
  options TEXT, -- JSON array of strings
  correct_answer TEXT, -- index of correct option or true/false
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- 20. Answers table
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  score REAL,
  feedback TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 21. Grades table
CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  score REAL NOT NULL,
  feedback TEXT,
  attempts_left INTEGER DEFAULT 1,
  graded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 22. Certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  certificate_code TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  enrollment_id TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  hours INTEGER NOT NULL,
  pdf_url TEXT,
  qr_url TEXT,
  status TEXT DEFAULT 'issued', -- issued, cancelled, replaced
  cancel_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
);

-- 23. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- system, email, whatsapp
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 24. Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
`;

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  console.log('Running database migrations...');
  exec(migrationSql)
    .then(() => {
      console.log('Database migrations completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
