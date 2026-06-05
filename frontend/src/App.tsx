import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, User, LogOut, Award, Plus, Trash2, 
  Upload, Search, ArrowRight, QrCode, TrendingUp, Check, FileDown,
  MessageSquare, Play, Star, GraduationCap, CheckCircle, Flame, Phone
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import { request } from './services/api';

// Interface types
interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  document_type?: string;
  document_number?: string;
}

interface Book {
  id: string;
  title: string;
  subtitle: string;
  grade: number;
  description: string;
  author: string;
  isbn: string;
  digital_price: number;
  physical_price: number;
  stock: number;
  cover_url: string;
  status: string;
}

interface CartItem {
  id: string;
  title: string;
  type: 'book_digital' | 'book_physical' | 'course';
  price: number;
  quantity: number;
  cover_url: string;
}

export default function App() {
  // Navigation State
  const [currentView, setCurrentView] = useState<'landing' | 'catalog' | 'cart' | 'checkout' | 'verify-cert' | 'dashboard'>('landing');
  
  // Landing Page Interactive State
  const [waInteractions, setWaInteractions] = useState(() => parseInt(localStorage.getItem('wa_interactions') || '387'));
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user', text: string }>>([
    { sender: 'bot', text: '¡Hola! Bienvenido a la Colección Creciendo Juntos. ¿En qué podemos ayudarte hoy? 😊' }
  ]);
  const [activeReelIndex, setActiveReelIndex] = useState<number | null>(null);
  
  const handleChatOption = (option: string, reply: string) => {
    setChatMessages(prev => [...prev, { sender: 'user', text: option }]);
    setTimeout(() => {
      setChatMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    }, 600);
  };

  const handleWaClick = () => {
    const newCount = waInteractions + 1;
    setWaInteractions(newCount);
    localStorage.setItem('wa_interactions', newCount.toString());
    window.open('https://wa.me/51999999999?text=Hola,%20deseo%20información%20sobre%20la%20Colección%20Creciendo%20Juntos', '_blank');
  };
  
  // Auth State
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('cj_token'));
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState<{ name: string; email: string; password: string; role: string; avatar_url?: string }>({ name: '', email: '', password: '', role: 'docente', avatar_url: '' });

  // Catalog State
  const [books, setBooks] = useState<Book[]>([]);
  const [filterGrade, setFilterGrade] = useState<number | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseSearch, setCourseSearch] = useState('');

  // Tab Navigation States
  const [adminTab, setAdminTab] = useState<'metrics' | 'books' | 'orders' | 'courses' | 'templates' | 'audit'>('metrics');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Dashboard & Operations State
  const [dashMetrics, setDashMetrics] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [currentClassroom, setCurrentClassroom] = useState<any>(null);
  const [studentProgress, setStudentProgress] = useState<any[]>([]);
  const [showCreateClassroom, setShowCreateClassroom] = useState(false);
  const [classroomForm, setClassroomForm] = useState<{ name: string; grade: string; section: string; academic_year: string; banner_url?: string }>({ name: '', grade: '1', section: 'A', academic_year: '2026', banner_url: '' });
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentForm, setStudentForm] = useState<{ name: string; email: string; document_number: string; avatar_url?: string }>({ name: '', email: '', document_number: '', avatar_url: '' });
  const [showImportStudents, setShowImportStudents] = useState(false);
  const [importText, setImportText] = useState('');
  const [importedCreds, setImportedCreds] = useState<any[]>([]);
  
  // Evaluation & Certificate State
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifiedCert, setVerifiedCert] = useState<any>(null);

  // --- NEW WORKSPACE STATES FOR EXTENDED FEATURES ---
  // Certificate Template Configuration
  const [certTemplate, setCertTemplate] = useState({
    borderColor: '#1a56db',
    primaryColor: '#1a56db',
    accentColor: '#d09a0a',
    titleText: 'CERTIFICADO DE PARTICIPACIÓN',
    footerText: 'Validado en tiempo real a través de la red perimetral de Cloudflare Pages & Supabase.'
  });

  // Book CRUD Modal State
  const [showBookModal, setShowBookModal] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState({
    title: '', subtitle: '', grade: 1, description: '', author: '', isbn: '',
    digital_price: 0, physical_price: 0, stock: 0, cover_url: '', status: 'published'
  });

  // Course CRUD Modal State
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '', description: '', price: 0, duration_hours: 120, cover_url: '',
    minimum_score: 14, progress_required: 100, status: 'published'
  });

  // Curriculum Modules & Lessons Creation State
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [moduleForm, setModuleForm] = useState<{ title: string; sort_order: number; image_url?: string }>({ title: '', sort_order: 1, image_url: '' });
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '', description: '', content_type: 'video', content_url: '', content_body: '', sort_order: 1
  });
  const [activeModuleForLesson, setActiveModuleForLesson] = useState<string | null>(null);
  const [activeLessonToView, setActiveLessonToView] = useState<any | null>(null);

  // Order validation rejection dialog
  const [reviewOrder, setReviewOrder] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Classroom tabs for Docente
  const [classroomTab, setClassroomTab] = useState<'students' | 'materials' | 'assessments' | 'grading'>('students');

  // Teacher assessments list and creation
  const [classroomAssessments, setClassroomAssessments] = useState<any[]>([]);
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState<{ title: string; type: string; startAt: string; endAt: string; maxScore: number; questions: any[]; image_url?: string }>({
    title: '', type: 'quiz', startAt: '', endAt: '', maxScore: 20,
    questions: [] as any[], image_url: ''
  });
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('multiple_choice');
  const [newQuestionOptions, setNewQuestionOptions] = useState(['', '', '', '']);
  const [newQuestionCorrect, setNewQuestionCorrect] = useState('0');

  // Submissions and grading state for Docente
  const [selectedAssessmentForGrading, setSelectedAssessmentForGrading] = useState<any>(null);
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [gradingForm, setGradingForm] = useState({ score: 14, feedback: '' });

  // Student active assessments
  const [studentAssessments, setStudentAssessments] = useState<any[]>([]);
  const [activeAssessmentForStudent, setActiveAssessmentForStudent] = useState<any>(null);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [yapeVoucher, setYapeVoucher] = useState('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=200&auto=format&fit=crop');

  // Load Initial Data
  useEffect(() => {
    fetchBooks();
    fetchCourses();
    if (token) {
      fetchCurrentUser();
    }
  }, [token]);

  // Sync operations when user/role changes
  useEffect(() => {
    if (user) {
      if (user.role === 'admin' || user.role === 'super_admin') {
        fetchAdminMetrics();
        fetchAdminOrders();
        fetchAuditLogs();
      } else if (user.role === 'docente') {
        fetchTeacherClassrooms();
      } else if (user.role === 'estudiante') {
        fetchStudentCourses();
        fetchStudentAssessmentsList();
      }
    }
  }, [user]);

  const fetchCurrentUser = async () => {
    const res = await request('/auth/me');
    if (res.success && res.data) {
      setUser(res.data);
    } else {
      handleLogout();
    }
  };

  const fetchBooks = async () => {
    const res = await request('/books');
    if (res.success && res.data) {
      setBooks(res.data);
    }
  };

  const fetchCourses = async () => {
    const res = await request('/courses');
    if (res.success && res.data) {
      setCourses(res.data);
    }
  };

  const fetchAdminMetrics = async () => {
    const res = await request('/admin/metrics');
    if (res.success && res.data) {
      setDashMetrics(res.data);
    }
  };

  const fetchAdminOrders = async () => {
    const res = await request('/admin/orders');
    if (res.success && res.data) {
      setOrders(res.data);
    }
  };

  const fetchAuditLogs = async () => {
    const res = await request('/admin/audit-logs');
    if (res.success && res.data) {
      setAuditLogs(res.data);
    }
  };

  const fetchTeacherClassrooms = async () => {
    const res = await request('/teacher/classrooms');
    if (res.success && res.data) {
      setClassrooms(res.data);
    }
  };

  const fetchStudentCourses = async () => {
    const res = await request('/student/courses');
    if (res.success && res.data) {
      setStudentEnrollments(res.data);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await request('/auth/login', 'POST', loginForm);
    if (res.success && res.data) {
      localStorage.setItem('cj_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      setShowAuthModal(false);
      setCurrentView('dashboard');
    } else {
      alert(res.error?.message || 'Error al iniciar sesión.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await request('/auth/register', 'POST', registerForm);
    if (res.success) {
      alert('Registro exitoso. Ya puede iniciar sesión.');
      setAuthMode('login');
    } else {
      alert(res.error?.message || 'Error al registrarse.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cj_token');
    setToken(null);
    setUser(null);
    setCurrentView('landing');
  };

  const handleVerifyCert = async (code: string) => {
    const res = await request(`/certificates/verify/${code}`);
    if (res.success && res.data) {
      setVerifiedCert(res.data);
    } else {
      setVerifiedCert(null);
      alert('Certificado no encontrado o inválido.');
    }
  };

  // Cart operations
  const addToCart = (book: Book, format: 'digital' | 'physical') => {
    const id = `${book.id}_${format}`;
    const price = format === 'digital' ? book.digital_price : book.physical_price;
    const exists = cart.find(item => item.id === id);

    if (exists) {
      if (format === 'physical') {
        setCart(cart.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item));
      }
    } else {
      setCart([...cart, {
        id,
        title: `${book.title} (${format === 'digital' ? 'Digital' : 'Físico'})`,
        type: format === 'digital' ? 'book_digital' : 'book_physical',
        price,
        quantity: 1,
        cover_url: book.cover_url
      }]);
    }
    alert(`${book.title} agregado al carrito.`);
  };

  const addCourseToCart = (course: any) => {
    const exists = cart.find(item => item.id === course.id);
    if (exists) {
      alert('Este curso ya está en su carrito.');
      return;
    }
    setCart([...cart, {
      id: course.id,
      title: course.title,
      type: 'course',
      price: course.price,
      quantity: 1,
      cover_url: course.cover_url
    }]);
    alert(`${course.title} agregado al carrito.`);
  };

  const handleCheckout = async (paymentMethod: 'card' | 'yape') => {
    const items = cart.map(item => ({
      id: item.id.split('_')[0],
      type: item.type,
      quantity: item.quantity
    }));

    const orderRes = await request('/orders', 'POST', { items, notes: checkoutNotes });
    if (orderRes.success && orderRes.data) {
      const orderId = orderRes.data.orderId;
      if (paymentMethod === 'card') {
        const cardRes = await request('/payments/card/checkout', 'POST', { orderId, cardNumber: '4111222233334444' });
        if (cardRes.success) {
          alert('Pago con tarjeta aprobado con éxito. ¡Acceso a recursos habilitado!');
          setCart([]);
          setCurrentView('dashboard');
        }
      } else {
        const payRes = await request('/payments/manual', 'POST', {
          orderId,
          method: 'yape',
          voucherUrl: yapeVoucher
        });
        if (payRes.success) {
          alert('Comprobante enviado con éxito. Esperando aprobación del administrador.');
          setCart([]);
          setCurrentView('dashboard');
        }
      }
    }
  };

  // Docente: Classroom Operations
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await request('/teacher/classrooms', 'POST', classroomForm);
    if (res.success) {
      fetchTeacherClassrooms();
      setShowCreateClassroom(false);
    }
  };

  const handleSelectClassroom = async (classroom: any) => {
    setCurrentClassroom(classroom);
    const res = await request(`/teacher/classrooms/${classroom.id}/progress`);
    if (res.success && res.data) {
      setStudentProgress(res.data);
    }
    fetchClassroomAssessments(classroom.id);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await request('/teacher/classrooms/register-student', 'POST', {
      classroomId: currentClassroom.id,
      ...studentForm
    });
    if (res.success && res.data) {
      alert(`Estudiante registrado. Contraseña temporal: ${res.data.tempPassword}`);
      handleSelectClassroom(currentClassroom);
      setShowAddStudent(false);
    }
  };

  const handleImportStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const studentsList = JSON.parse(importText);
      const res = await request('/teacher/classrooms/import-students', 'POST', {
        classroomId: currentClassroom.id,
        students: studentsList
      });
      if (res.success && res.data) {
        setImportedCreds(res.data);
        handleSelectClassroom(currentClassroom);
      }
    } catch (err) {
      alert('Formato JSON inválido. Verifique la plantilla.');
    }
  };

  // Admin Payment Approvals
  const handleApprovePayment = async (payId: string) => {
    const res = await request('/admin/payments/approve', 'PUT', { paymentId: payId });
    if (res.success) {
      alert('Pago aprobado.');
      fetchAdminOrders();
      fetchAdminMetrics();
    }
  };

  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrder) return;
    const res = await request('/admin/payments/reject', 'PUT', {
      paymentId: reviewOrder.payment_id || reviewOrder.id,
      rejectionReason
    });
    if (res.success) {
      alert('Pago rechazado y notificado.');
      setReviewOrder(null);
      setRejectionReason('');
      fetchAdminOrders();
      fetchAdminMetrics();
    } else {
      alert(res.error?.message || 'Error al rechazar pago.');
    }
  };

  // File upload converter with client-side image compression
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 800; // max size in px
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75); // compress to JPEG 75% quality
            callback(dataUrl);
          } else {
            if (event.target && typeof event.target.result === 'string') {
              callback(event.target.result);
            }
          }
        };
        if (event.target && typeof event.target.result === 'string') {
          img.src = event.target.result;
        }
      };
      reader.readAsDataURL(file);
    } else {
      // PDF or other documents
      if (file.size > 2 * 1024 * 1024) {
        alert('El archivo no debe superar los 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          callback(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- ADMIN BOOKS CRUD ---
  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingBook ? `/admin/books/${editingBook.id}` : '/admin/books';
    const method = editingBook ? 'PUT' : 'POST';
    const res = await request(url, method, bookForm);
    if (res.success) {
      alert(editingBook ? 'Libro actualizado con éxito.' : 'Libro creado con éxito.');
      setShowBookModal(false);
      setEditingBook(null);
      fetchBooks();
    } else {
      alert(res.error?.message || 'Error al guardar libro.');
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('¿Está seguro de eliminar este libro?')) return;
    const res = await request(`/admin/books/${bookId}`, 'DELETE');
    if (res.success) {
      alert('Libro eliminado con éxito.');
      fetchBooks();
    } else {
      alert(res.error?.message || 'Error al eliminar libro.');
    }
  };

  // --- ADMIN COURSES CRUD & CURRICULUM ---
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEditing = editingCourse && editingCourse.id;
    const url = isEditing ? `/admin/courses/${editingCourse.id}` : '/admin/courses';
    const method = isEditing ? 'PUT' : 'POST';
    const res = await request(url, method, courseForm);
    if (res.success) {
      alert(isEditing ? 'Curso actualizado con éxito.' : 'Curso registrado con éxito.');
      setShowCourseModal(false);
      if (isEditing) {
        // Refresh details
        const details = await request(`/courses/${editingCourse.id}`);
        if (details.success) setEditingCourse(details.data);
      }
      fetchCourses();
    } else {
      alert(res.error?.message || 'Error al guardar curso.');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este curso por completo? Se eliminarán todas sus unidades, lecciones y matrículas asociadas.')) {
      return;
    }
    const res = await request(`/admin/courses/${courseId}`, 'DELETE');
    if (res.success) {
      alert('Curso eliminado con éxito.');
      setEditingCourse(null);
      fetchCourses();
    } else {
      alert(res.error?.message || 'Error al eliminar el curso.');
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    const res = await request(`/admin/courses/${editingCourse.id}/modules`, 'POST', moduleForm);
    if (res.success) {
      alert('Módulo creado con éxito.');
      setShowModuleModal(false);
      setModuleForm({ title: '', sort_order: 1 });
      // Reload course details
      const courseDetails = await request(`/courses/${editingCourse.id}`);
      if (courseDetails.success) {
        setEditingCourse(courseDetails.data);
      }
      fetchCourses();
    } else {
      alert(res.error?.message || 'Error al crear módulo.');
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModuleForLesson || !editingCourse) return;
    const res = await request(`/admin/modules/${activeModuleForLesson}/lessons`, 'POST', lessonForm);
    if (res.success) {
      alert('Lección/Material agregado con éxito.');
      setShowLessonModal(false);
      setLessonForm({ title: '', description: '', content_type: 'video', content_url: '', content_body: '', sort_order: 1 });
      // Reload course details
      const courseDetails = await request(`/courses/${editingCourse.id}`);
      if (courseDetails.success) {
        setEditingCourse(courseDetails.data);
      }
      fetchCourses();
    } else {
      alert(res.error?.message || 'Error al crear lección.');
    }
  };

  // --- TEACHER ASSESSMENTS & GRADING ---
  const fetchClassroomAssessments = async (classroomId: string) => {
    const res = await request(`/classrooms/${classroomId}/assessments`);
    if (res.success && res.data) {
      setClassroomAssessments(res.data);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (assessmentForm.questions.length === 0) {
      alert('Debe agregar al menos una pregunta.');
      return;
    }
    const res = await request('/assessments', 'POST', {
      ...assessmentForm,
      classroomId: currentClassroom.id
    });
    if (res.success) {
      alert('Evaluación asignada correctamente al aula.');
      setShowCreateAssessment(false);
      setAssessmentForm({ title: '', type: 'quiz', startAt: '', endAt: '', maxScore: 20, questions: [] });
      fetchClassroomAssessments(currentClassroom.id);
    } else {
      alert(res.error?.message || 'Error al crear evaluación.');
    }
  };

  const addQuestionToForm = () => {
    if (!newQuestionText) return;
    const newQ = {
      text: newQuestionText,
      type: newQuestionType,
      options: newQuestionType === 'multiple_choice' ? newQuestionOptions.filter(o => o !== '') : ['Verdadero', 'Falso'],
      correct_answer: newQuestionCorrect
    };
    setAssessmentForm({
      ...assessmentForm,
      questions: [...assessmentForm.questions, newQ]
    });
    setNewQuestionText('');
    setNewQuestionOptions(['', '', '', '']);
    setNewQuestionCorrect('0');
  };

  const handleOpenGrading = async (assessmentId: string) => {
    const assessment = classroomAssessments.find(a => a.id === assessmentId);
    setSelectedAssessmentForGrading(assessment);
    const res = await request(`/assessments/${assessmentId}/submissions`);
    if (res.success && res.data) {
      setSubmissionsList(res.data);
      setClassroomTab('grading');
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmission || !selectedAssessmentForGrading) return;
    const res = await request('/assessments/grade', 'PUT', {
      gradeId: gradingSubmission.id,
      score: parseFloat(gradingForm.score.toString()),
      feedback: gradingForm.feedback
    });
    if (res.success) {
      alert('Calificación registrada con éxito.');
      setGradingSubmission(null);
      handleOpenGrading(selectedAssessmentForGrading.id);
      if (currentClassroom) handleSelectClassroom(currentClassroom);
    } else {
      alert(res.error?.message || 'Error al calificar.');
    }
  };

  // --- STUDENT ASSESSMENTS ---
  const fetchStudentAssessmentsList = async () => {
    const res = await request('/student/assessments');
    if (res.success && res.data) {
      setStudentAssessments(res.data);
    }
  };

  const handleStudentSubmitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = Object.entries(studentAnswers).map(([qId, ansText]) => ({
      questionId: qId,
      answerText: ansText
    }));
    const res = await request('/assessments/submit', 'POST', {
      assessmentId: activeAssessmentForStudent.id,
      answers: formatted
    });
    if (res.success) {
      alert(res.data.score !== null ? `Enviado con éxito. Su calificación automática es: ${res.data.score} / 20` : 'Enviado con éxito. Pendiente de calificación docente.');
      setActiveAssessmentForStudent(null);
      setStudentAnswers({});
      fetchStudentAssessmentsList();
      if (currentClassroom) handleSelectClassroom(currentClassroom);
    } else {
      alert(res.error?.message || 'Error al enviar respuestas.');
    }
  };

  // jsPDF Certificate generation
  // jsPDF Certificate generation matching ACRECERTI (A4 Landscape)
  const downloadPdfCertificate = async (cert: any) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Cream background
    doc.setFillColor(255, 254, 247);
    doc.rect(0, 0, 297, 210, 'F');

    // --- Corner stripes top-left ---
    doc.setFillColor(11, 90, 117); // teal
    doc.triangle(0, 0, 45, 0, 0, 45, 'F');

    doc.setFillColor(196, 155, 60); // gold
    doc.triangle(0, 45, 0, 52, 52, 0, 'F');
    doc.triangle(0, 45, 45, 0, 52, 0, 'F');

    doc.setFillColor(238, 230, 212); // beige
    doc.triangle(0, 52, 0, 55, 55, 0, 'F');
    doc.triangle(0, 52, 52, 0, 55, 0, 'F');

    // --- Corner stripes bottom-right ---
    doc.setFillColor(11, 90, 117);
    doc.triangle(297, 210, 252, 210, 297, 165, 'F');

    doc.setFillColor(196, 155, 60);
    doc.triangle(297, 165, 297, 158, 245, 210, 'F');
    doc.triangle(297, 165, 252, 210, 245, 210, 'F');

    doc.setFillColor(238, 230, 212);
    doc.triangle(297, 158, 297, 155, 242, 210, 'F');
    doc.triangle(297, 158, 245, 210, 242, 210, 'F');

    // Headers
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(196, 155, 60);
    doc.text('Acreditación y Certificación', 148.5, 28, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(13);
    doc.setTextColor(55, 65, 81);
    doc.text('La Dirección de Acreditación, OTORGA el presente:', 148.5, 38, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(11, 90, 117);
    doc.text('DIPLOMA DE RECONOCIMIENTO', 148.5, 52, { align: 'center' });

    // Participant Name (times italic gold)
    doc.setFont('times', 'italic');
    doc.setFontSize(38);
    doc.setTextColor(196, 155, 60);
    const displayName = cert.student_name || cert.user_name || 'Participante';
    doc.text(displayName, 148.5, 78, { align: 'center' });

    // Gold centered line with diamond ornament
    doc.setDrawColor(196, 155, 60);
    doc.setLineWidth(0.5);
    doc.line(98, 86, 142, 86);
    doc.line(155, 86, 199, 86);
    doc.setFillColor(196, 155, 60);
    doc.triangle(148.5, 84, 146.5, 86, 150.5, 86, 'F');
    doc.triangle(148.5, 88, 146.5, 86, 150.5, 86, 'F');

    // Program label
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.text('Por haber completado satisfactoriamente el programa de:', 148.5, 98, { align: 'center' });

    // Course Name
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(11, 90, 117);
    doc.text(cert.course_title || 'Capacitación Docente', 148.5, 112, { align: 'center' });

    // Hours & score details
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    const scoreText = cert.score && cert.score > 0 ? cert.score.toFixed(1) : 'N/A';
    const durationText = cert.hours || 120;
    doc.text(`ha demostrado que cumple satisfactoriamente con los requisitos académicos con una duración`, 148.5, 128, { align: 'center' });
    doc.text(`de ${durationText} horas académicas y obteniendo una calificación de ${scoreText}.`, 148.5, 134, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Acreditado y respaldado oficialmente por ACRECERTI.', 148.5, 146, { align: 'center' });

    const dateStr = cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE');
    doc.setFont('Helvetica', 'bold');
    doc.text(`Emitido el: ${dateStr}`, 148.5, 152, { align: 'center' });

    // Signatures lines and titles
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);

    // Left Signature
    doc.line(35, 180, 95, 180);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text('Dra. Virna López', 65, 184, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    doc.text('Presidenta', 65, 188, { align: 'center' });

    // Right Signature
    doc.line(202, 180, 262, 180);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 41, 55);
    doc.text('Nítida Carranza', 232, 184, { align: 'center' });
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    doc.text('Directora Ejecutiva', 232, 188, { align: 'center' });

    // QR Code Generation
    const code = cert.certificate_code || `CERT-${Date.now().toString().slice(-6)}`;
    const verifyUrl = `${window.location.origin}/verify-cert?code=${code}`;

    try {
      const qrDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 150;
          canvas.height = 150;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
          } else {
            reject(new Error('Canvas context error'));
          }
        };
        img.onerror = () => reject(new Error('QR Load error'));
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;
      });

      doc.addImage(qrDataUrl, 'JPEG', 138.5, 160, 20, 20);
    } catch (qrErr) {
      console.error('Failed to load QR code image in PDF:', qrErr);
      doc.rect(138.5, 160, 20, 20);
      doc.setFontSize(6);
      doc.text('QR CODE', 148.5, 170, { align: 'center' });
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(11, 90, 117);
    doc.text(`N° ACRE-${code.replace(/^CERT-/, '')}`, 148.5, 184, { align: 'center' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(156, 163, 175);
    doc.text(`Validar: ${verifyUrl}`, 148.5, 187, { align: 'center' });

    doc.save(`certificado_${code}.pdf`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 py-4 shadow-sm">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
            <div className="w-10 h-10 rounded-full bg-[#1e293b] border border-white/25 flex items-center justify-center text-white text-xs font-bold font-serif relative shadow-premium">
              <span className="text-sm">✝</span>
              <span className="absolute text-[7px] bottom-0.5 font-sans tracking-widest text-gray-300">CJ</span>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-primary tracking-tight">Creciendo Juntos</h1>
              <p className="text-xs text-gray-500">Educación Religiosa Secundaria</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <button className="text-sm font-semibold hover:text-primary transition-colors" onClick={() => { setCurrentView('catalog'); setFilterGrade(null); setTimeout(() => document.getElementById('seccion-libros')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Libros</button>
            <button className="text-sm font-semibold hover:text-primary transition-colors" onClick={() => { setCurrentView('catalog'); setTimeout(() => document.getElementById('seccion-capacitaciones')?.scrollIntoView({ behavior: 'smooth' }), 100); }}>Capacitaciones</button>
            <button className="text-sm font-semibold hover:text-primary transition-colors" onClick={() => { setCurrentView('verify-cert'); setVerifiedCert(null); }}>Verificar Certificado</button>
            {user && (
              <button className="text-sm font-semibold text-primary hover:underline transition-colors" onClick={() => setCurrentView('dashboard')}>Mi Panel</button>
            )}
            
            <div className="flex items-center gap-6">
              <div className="relative cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setCurrentView('cart')}>
                <ShoppingCart className="w-6 h-6 text-gray-700" />
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-error text-white rounded-full px-1.5 py-0.5 text-3xs font-extrabold animate-pulse">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </div>
              
              {user ? (
                <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-800">{user.name}</span>
                  <button className="btn btn-secondary px-3 py-1.5" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}>
                  Acceder
                </button>
              )}
            </div>
          </nav>
        </div>
      </header>

      {/* CORE PAGES ROUTER */}
      <main className="flex-1 py-8">
        <div className="container mx-auto px-6">
          {currentView === 'landing' && (
            <div className="space-y-16 animate-fade-in pb-16">
              {/* URGENCY & TRUST BANNER */}
              <div className="bg-amber-500 text-white font-bold py-2.5 px-4 text-center rounded-xl flex items-center justify-center gap-2 text-xs md:text-sm animate-pulse shadow-md">
                <Flame className="w-4 h-4 fill-white" />
                <span>¡OFERTA EXCLUSIVA 2026! 20% de descuento en licencias digitales y capacitaciones pedagógicas esta semana.</span>
              </div>

              {/* HERO SECTION */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-primary-dark to-teal-950 text-white p-8 md:p-16 shadow-premium">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
                  <div className="flex-1 space-y-8">
                    <span className="inline-flex items-center gap-1.5 bg-teal-400/20 text-teal-300 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest border border-teal-500/30">
                      <GraduationCap className="w-3.5 h-3.5" /> Educación Religiosa Secundaria
                    </span>
                    <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
                      Formando valores cívicos y morales <span className="text-yellow-400">con excelencia</span>
                    </h2>
                    <p className="text-gray-300 text-lg md:text-xl font-light leading-relaxed max-w-2xl">
                      La solución pedagógica integral preferida por más de 150 colegios. Libros interactivos estructurados, guías metodológicas docentes y aula virtual en una sola plataforma serverless de alta velocidad.
                    </p>
                    
                    {/* Doctrinal Quote Banner */}
                    <div className="border-l-4 border-yellow-400 pl-4 py-2 italic bg-white/5 rounded-r-2xl max-w-xl">
                      <p className="text-sm md:text-base text-gray-200">"Crean lo que aprenden, enseñen lo que creen y practiquen lo que enseñan."</p>
                      <span className="text-xs text-yellow-400/80 block mt-1 font-semibold">— San Agustín</span>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <button className="btn btn-primary bg-yellow-500 hover:bg-yellow-400 text-gray-900 border-none shadow-lg px-8 py-3.5 font-extrabold text-sm md:text-base flex items-center gap-2 transform hover:-translate-y-0.5 transition-all animate-bounce" onClick={() => setCurrentView('catalog')}>
                        Comprar Cuadernos <ArrowRight className="w-5 h-5" />
                      </button>
                      <button className="btn border border-white/30 bg-white/10 hover:bg-white/20 text-white px-8 py-3.5 font-bold text-sm md:text-base rounded-xl transform hover:-translate-y-0.5 transition-all" onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}>
                        Registrarme como Docente
                      </button>
                    </div>
                  </div>
                  <div className="w-full lg:w-2/5 flex justify-center relative">
                    <div className="absolute -inset-4 bg-teal-500/20 rounded-full blur-3xl"></div>
                    <img 
                      src="https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=500&auto=format&fit=crop" 
                      alt="Colección Creciendo Juntos Libros" 
                      className="relative z-10 w-72 md:w-80 h-96 object-cover rounded-2xl shadow-2xl border-4 border-white/10 transform hover:rotate-2 hover:scale-105 transition-all duration-500" 
                    />
                  </div>
                </div>
              </div>

              {/* STATS / TRUST LOGROS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { value: "15,000+", label: "Estudiantes formados" },
                  { value: "350+", label: "Docentes certificados" },
                  { value: "120+", label: "Colegios afiliados" },
                  { value: "99.2%", label: "Satisfacción docente" }
                ].map((stat, i) => (
                  <div key={i} className="glass-panel text-center p-6 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="text-3xl md:text-4xl font-black text-primary-dark">{stat.value}</div>
                    <div className="text-xs md:text-sm text-gray-500 mt-1 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* REELS / VIDEO CLIPS INTERACTIVOS */}
              <div className="space-y-6">
                <div className="text-center md:text-left space-y-2">
                  <h3 className="text-3xl font-black text-gray-800 tracking-tight">Experiencia Creciendo Juntos en Acción</h3>
                  <p className="text-gray-500 max-w-xl">Observa pequeños fragmentos de nuestras sesiones dinámicas y testimonios en video.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { title: "Metodología Dinámica", duration: "1:20 min", bg: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=400&auto=format&fit=crop", video: "https://www.w3schools.com/html/mov_bbb.mp4" },
                    { title: "Aula Virtual Activa", duration: "0:45 min", bg: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=400&auto=format&fit=crop", video: "https://www.w3schools.com/html/mov_bbb.mp4" },
                    { title: "Testimonio del Colegio", duration: "2:05 min", bg: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=400&auto=format&fit=crop", video: "https://www.w3schools.com/html/mov_bbb.mp4" }
                  ].map((reel, index) => (
                    <div key={index} className="group relative overflow-hidden rounded-2xl aspect-[9/16] bg-slate-900 shadow-lg cursor-pointer transform hover:-translate-y-2 transition-all duration-300" onClick={() => setActiveReelIndex(index)}>
                      <img src={reel.bg} alt={reel.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90"></div>
                      
                      {/* Play Button Icon Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/25 group-hover:bg-white/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-all transform group-hover:scale-110">
                          <Play className="w-7 h-7 fill-white ml-1" />
                        </div>
                      </div>
                      
                      {/* Reel Metadata */}
                      <div className="absolute bottom-4 left-4 right-4 text-white space-y-1">
                        <div className="text-xs text-teal-400 font-bold uppercase tracking-wider">{reel.duration}</div>
                        <h4 className="font-extrabold text-base leading-tight">{reel.title}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REELS VIDEO LIGHTBOX MODAL */}
              {activeReelIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                  <div className="relative w-full max-w-md bg-black rounded-3xl overflow-hidden shadow-2xl animate-scale-up">
                    <button className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white text-xl flex items-center justify-center" onClick={() => setActiveReelIndex(null)}>×</button>
                    <video 
                      controls 
                      autoPlay 
                      className="w-full aspect-[9/16] object-cover" 
                      src="https://www.w3schools.com/html/mov_bbb.mp4"
                    ></video>
                  </div>
                </div>
              )}

              {/* PRODUCTS & CATALOG HIGHLIGHTS SECTION */}
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                  <div>
                    <h3 className="text-3xl font-black text-gray-800 tracking-tight">Nuestros Cuadernos de Trabajo</h3>
                    <p className="text-gray-500">Material didáctico estructurado de primer nivel para cada grado de secundaria.</p>
                  </div>
                  <button className="btn btn-secondary flex items-center gap-1.5 font-bold" onClick={() => setCurrentView('catalog')}>
                    Ver Catálogo Completo <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { grade: 1, title: "Creciendo Juntos 1° de Secundaria", desc: "Introducción a los fundamentos de la fe, valores familiares y moral básica.", price: 45.00, img: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400&auto=format&fit=crop" },
                    { grade: 3, title: "Creciendo Juntos 3° de Secundaria", desc: "El rol de la fe en la juventud contemporánea, historia eclesial y valores cívicos.", price: 45.00, img: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=400&auto=format&fit=crop", best: true },
                    { grade: 5, title: "Creciendo Juntos 5° de Secundaria", desc: "Preparación moral y ética para el egreso escolar y proyecto de vida cristiano.", price: 45.00, img: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=400&auto=format&fit=crop" }
                  ].map((book, i) => (
                    <div key={i} className="glass-panel group overflow-hidden bg-white border border-gray-100 flex flex-col hover:shadow-premium transform hover:-translate-y-1 transition-all duration-300">
                      <div className="relative aspect-video overflow-hidden bg-gray-100">
                        {book.best && (
                          <span className="absolute top-3 right-3 z-10 bg-yellow-500 text-gray-900 font-extrabold text-xs px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                            <Star className="w-3 h-3 fill-gray-900" /> RECOMENDADO
                          </span>
                        )}
                        <img src={book.img} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <span className="text-2xs font-extrabold tracking-widest text-teal-600 uppercase font-mono">{book.grade}° Grado de Secundaria</span>
                          <h4 className="font-extrabold text-lg text-slate-800 leading-snug group-hover:text-primary transition-colors">{book.title}</h4>
                          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{book.desc}</p>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <span className="text-xl font-black text-primary-dark">S/ {book.price.toFixed(2)}</span>
                          <button className="btn btn-secondary text-2xs py-2 px-4 font-bold border border-gray-200 group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-all" onClick={() => setCurrentView('catalog')}>
                            Explorar Detalle
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SEMINARIOS / TRAINING BANNER */}
              <div id="seccion-capacitaciones" className="bg-gradient-to-r from-teal-500 to-indigo-600 rounded-3xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center gap-8 shadow-lg">
                <div className="flex-1 space-y-4">
                  <span className="bg-white/20 text-white font-extrabold text-2xs px-3.5 py-1 rounded-full uppercase tracking-wider">Capacitaciones Docentes</span>
                  <h3 className="text-3xl font-black leading-tight">Seminario de Didáctica, Ética y Juventud 2026</h3>
                  <p className="text-teal-50/90 text-sm md:text-base leading-relaxed">
                    Potencia tus clases de Educación Religiosa con herramientas de aula virtual, dinámicas de valores y descarga de tu certificado validado con firma y código QR al finalizar.
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs md:text-sm font-semibold">
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-yellow-300" /> 100% Virtual</span>
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-yellow-300" /> 120 Horas Pedagógicas</span>
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-yellow-300" /> Certificado con Código QR</span>
                  </div>
                </div>
                <div className="flex flex-col items-center md:items-end justify-center min-w-[200px] space-y-3">
                  <button className="btn bg-white hover:bg-teal-50 text-indigo-700 font-extrabold border-none shadow-md px-6 py-3.5 w-full transform hover:scale-105 transition-all text-center" onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}>
                    Inscribirme Gratis
                  </button>
                  <button className="text-xs text-white/90 hover:underline hover:text-white transition-colors" onClick={() => setCurrentView('verify-cert')}>
                    Verificar mi certificado anterior
                  </button>
                </div>
              </div>

              {/* TESTIMONIALS */}
              <div className="space-y-8 text-center">
                <h3 className="text-3xl font-black text-gray-800 tracking-tight">¿Qué dicen los Colegios y Docentes?</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { quote: "La integración del aula virtual ha facilitado el control de tareas y la participación. Los alumnos disfrutan mucho la lectura digital.", author: "Prof. María Elena Rivas", role: "Docente de Religión - Colegio Santa Ana" },
                    { quote: "Los certificados QR y las capacitaciones de la Colección son excelentes y totalmente oficiales. La metodología es sumamente didáctica.", author: "Lic. Carlos Alberto Torres", role: "Director Pedagógico - IEP San Agustín" },
                    { quote: "Libros impresos de excelente calidad con ilustraciones hermosas y actividades muy bien pensadas para los adolescentes de hoy.", author: "Prof. Juana Inés Cruz", role: "Docente de 1° a 5° - Colegio Fe y Alegría" }
                  ].map((t, idx) => (
                    <div key={idx} className="glass-panel p-8 bg-white border border-gray-100 shadow-sm relative flex flex-col justify-between hover:shadow-md transition-shadow duration-300">
                      <div className="text-yellow-400 flex justify-center gap-1 mb-4">
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400" />)}
                      </div>
                      <p className="text-gray-600 text-sm italic leading-relaxed">"{t.quote}"</p>
                      <div className="mt-6 border-t border-gray-50 pt-4">
                        <h5 className="font-extrabold text-sm text-slate-800">{t.author}</h5>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">{t.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WHATSAPP FLOAT BUTTON WITH LIVE CLICK COUNTER */}
              <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-100 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                <div className="space-y-2 text-center md:text-left">
                  <h4 className="text-xl font-extrabold text-emerald-800 flex items-center justify-center md:justify-start gap-2">
                    <Phone className="w-5 h-5 fill-emerald-800" /> ¿Necesitas atención por WhatsApp?
                  </h4>
                  <p className="text-emerald-700/80 text-sm max-w-xl">
                    Chatea en vivo con nuestros asesores para pedidos institucionales, libros y material para colegios. 
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button className="btn bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold border-none shadow-md px-6 py-3 flex items-center gap-2 transform hover:scale-105 transition-all" onClick={handleWaClick}>
                    <span>Conversar ahora</span>
                    <span className="bg-emerald-800 text-white px-2 py-0.5 rounded-full text-xs font-mono">{waInteractions} clics</span>
                  </button>
                  <span className="text-emerald-700 text-3xs font-mono uppercase tracking-wider">Contador de consultas activo</span>
                </div>
              </div>

              {/* INTERACTIVE CHATBOOK (FAST CONTACT MODAL) */}
              <div className="fixed bottom-6 right-6 z-40">
                {!chatOpen ? (
                  <button className="w-14 h-14 bg-primary hover:bg-primary-dark text-white rounded-full flex items-center justify-center shadow-premium transform hover:scale-110 transition-all cursor-pointer animate-bounce" onClick={() => setChatOpen(true)}>
                    <MessageSquare className="w-6 h-6" />
                  </button>
                ) : (
                  <div className="w-80 md:w-96 bg-white rounded-3xl shadow-premium border border-gray-100 overflow-hidden flex flex-col max-h-[450px] animate-slide-up">
                    {/* Chat Header */}
                    <div className="bg-primary text-white p-4 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-ping"></div>
                        <h4 className="font-extrabold text-sm">Asistente Creciendo Juntos</h4>
                      </div>
                      <button className="text-white hover:text-gray-200 text-lg font-light" onClick={() => setChatOpen(false)}>×</button>
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[280px] text-xs">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`p-3 rounded-2xl max-w-[80%] leading-relaxed shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 text-gray-700 rounded-tl-none'}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chat Quick Options Footer */}
                    <div className="bg-gray-50 p-3 border-t border-gray-100 space-y-1.5">
                      <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider mb-1 px-1">Respuestas rápidas:</div>
                      <div className="flex flex-wrap gap-1.5">
                        <button className="bg-white hover:bg-primary-light text-primary border border-gray-100 hover:border-primary-light text-3xs px-2 py-1.5 rounded-full transition-colors" onClick={() => handleChatOption(
                          '¿Cómo comprar?', 
                          'Puedes comprar los libros impresos y digitales seleccionando la opción "Libros" del menú superior y agregando el producto al carrito. Aceptamos depósitos y tarjetas de crédito.'
                        )}>🛍️ ¿Cómo comprar?</button>
                        <button className="bg-white hover:bg-primary-light text-primary border border-gray-100 hover:border-primary-light text-3xs px-2 py-1.5 rounded-full transition-colors" onClick={() => handleChatOption(
                          '¿Tienen demostración?', 
                          '¡Sí! En los módulos del curso, nuestros docentes y estudiantes pueden visualizar los temas, ver videos instructivos de YouTube y descargar fragmentos en PDF.'
                        )}>📚 ¿Demostración?</button>
                        <button className="bg-white hover:bg-primary-light text-primary border border-gray-100 hover:border-primary-light text-3xs px-2 py-1.5 rounded-full transition-colors" onClick={() => handleChatOption(
                          '¿El certificado es oficial?', 
                          '¡Totalmente! Los certificados emitidos tienen 120 horas pedagógicas oficiales y un código QR único con el cual cualquier institución puede validar su autenticidad.'
                        )}>🎓 ¿Certificado oficial?</button>
                        <button className="bg-white hover:bg-primary-light text-primary border border-gray-100 hover:border-primary-light text-3xs px-2 py-1.5 rounded-full transition-colors" onClick={() => handleChatOption(
                          'Hablar con un asesor', 
                          'Te redirigiré al WhatsApp oficial de soporte de inmediato para una asistencia personalizada.'
                        )}>💬 Hablar con Asesor</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === 'catalog' && (
            <div id="seccion-libros" className="space-y-8 animate-fade-in">
              <h2 className="text-3xl font-black text-gray-800">Catálogo de Cuadernos de Trabajo</h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <button className={`btn ${filterGrade === null ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterGrade(null)}>Todos los Grados</button>
                {[1, 2, 3, 4, 5].map(g => (
                  <button key={g} className={`btn ${filterGrade === g ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterGrade(g)}>{g}° de Secundaria</button>
                ))}
              </div>

              {/* Books Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {books
                  .filter(b => filterGrade === null || b.grade === filterGrade)
                  .map(book => (
                    <div key={book.id} className="glass-panel flex flex-col h-full overflow-hidden hover:shadow-premium transition-all duration-300 relative group">
                      {/* Promotional Badge (from uploaded image) */}
                      <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm">
                        {book.grade === 1 ? '-16%' : book.grade === 2 ? '-12%' : 'PROMO'}
                      </span>
                      <span className="absolute top-3 right-3 bg-yellow-400 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm flex items-center gap-0.5">
                        DELIVERY GRATIS
                      </span>

                      <div className="h-56 w-full overflow-hidden bg-gray-100 relative">
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                          <span className="text-white text-xs font-semibold">ISBN: {book.isbn}</span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <h4 className="font-extrabold text-gray-800 text-sm leading-snug">{book.title}</h4>
                          <p className="text-xs text-accent-dark italic font-semibold">{book.subtitle}</p>
                          <p className="text-[11px] text-gray-500 line-clamp-3">{book.description}</p>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs font-semibold text-gray-700 border-t border-gray-150 pt-3">
                            <div>
                              <span className="block text-gray-400 text-[10px]">Digital:</span>
                              <span className="text-sm font-extrabold text-primary">S/. {book.digital_price.toFixed(2)}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-gray-400 text-[10px]">Físico:</span>
                              <span className="text-sm font-extrabold text-slate-700">S/. {book.physical_price.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-4">
                            <button className="btn bg-gray-150 text-slate-800 hover:bg-gray-200 text-xs px-2 py-2 border-none font-bold" onClick={() => addToCart(book, 'digital')}>COMPRA DIGITAL</button>
                            <button className="btn bg-yellow-400 text-slate-900 hover:bg-yellow-500 text-xs px-2 py-2 border-none font-black tracking-wide" onClick={() => addToCart(book, 'physical')}>COMPRA FÍSICA</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Courses in Catalog */}
              <div id="seccion-capacitaciones" className="pt-12 border-t border-gray-200 space-y-8">
                
                {/* Search Bar - Grupo Auge Style */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h2 className="text-3xl font-black text-gray-800">Capacitaciones y Cursos Docentes</h2>
                  <div className="relative w-full md:w-80">
                    <input 
                      type="text" 
                      placeholder="Busca tu curso..." 
                      className="form-control pl-10"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                    />
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Sub-navigation Pill Bar (from uploaded image) */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['Cursos Populares 🔥', 'Cursos Gratuitos 🎁', 'Masterclass 🎓', 'Cuentas Oficiales 💰', 'Testimonios ⭐', 'Tutoriales 📚', 'Tutoriales 📝'].map((pill, idx) => (
                    <button 
                      key={idx} 
                      className="btn btn-secondary text-xs px-4 py-2 font-semibold bg-white border border-gray-200 rounded-full shadow-sm hover:bg-primary-light hover:text-primary hover:border-primary shrink-0"
                      onClick={() => alert(`Filtrando por: ${pill}`)}
                    >
                      {pill}
                    </button>
                  ))}
                </div>

                {/* Banner Nombramiento Docente 2026 */}
                <div className="glass-panel flex flex-col md:flex-row gap-6 p-8 items-center bg-gradient-to-r from-slate-900 via-slate-850 to-primary-dark text-white rounded-2xl overflow-hidden relative shadow-premium">
                  <div className="flex-1 space-y-4 z-10">
                    <span className="bg-yellow-400 text-slate-900 text-2xs font-extrabold uppercase px-2.5 py-1 rounded-full">E. Alberto M.</span>
                    <h3 className="text-3xl md:text-4xl font-black text-yellow-400 tracking-tight">NOMBRAMIENTO DOCENTE 2026</h3>
                    <ul className="text-xs space-y-2 text-gray-300 pl-1 list-none font-medium">
                      <li className="flex items-center gap-1.5"><span className="text-yellow-400">▶</span> Clases en vivo <strong>con especialistas</strong></li>
                      <li className="flex items-center gap-1.5"><span className="text-yellow-400">▶</span> Material actualizado y <strong>alineado al MINEDU</strong></li>
                      <li className="flex items-center gap-1.5"><span className="text-yellow-400">▶</span> Simulacros exigentes <strong>en tiempo real</strong></li>
                      <li className="flex items-center gap-1.5"><span className="text-yellow-400">▶</span> Comunidad docente con <strong>asesoría personalizada</strong></li>
                    </ul>
                  </div>
                  <div className="w-full md:w-2/5 flex justify-center relative z-10">
                    <img 
                      src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=300&auto=format&fit=crop" 
                      alt="Docente" 
                      className="w-56 h-40 object-cover rounded-xl border border-white/20 shadow-lg"
                    />
                  </div>
                </div>

                {/* Courses Grid with Premium Play Overlay */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {courses
                    .filter(c => c.title.toLowerCase().includes(courseSearch.toLowerCase()) || c.description.toLowerCase().includes(courseSearch.toLowerCase()))
                    .map(c => (
                      <div key={c.id} className="glass-panel flex flex-col h-full overflow-hidden hover:shadow-premium transition-all duration-300 group">
                        
                        {/* Course Image with simulated Video Play Button */}
                        <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                          <img src={c.cover_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <span className="absolute top-3 left-3 bg-green-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10 uppercase">
                            {c.id === 'course_1' ? 'Nombramiento' : 'Ascenso'}
                          </span>
                          
                          {/* Play video overlay from uploaded image */}
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer group-hover:bg-black/45 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                              <span className="text-primary text-lg pl-0.5">▶</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-extrabold text-gray-800 text-sm leading-snug">{c.title}</h4>
                            <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{c.description}</p>
                          </div>
                          <div className="border-t border-gray-100 pt-4">
                            <div className="flex justify-between items-center text-xs font-semibold text-gray-700">
                              <span className="text-gray-400">Duración: {c.duration_hours} hrs</span>
                              <span className="text-base font-black text-primary">S/. {c.price.toFixed(2)}</span>
                            </div>
                            <button className="btn bg-yellow-400 text-slate-900 hover:bg-yellow-500 w-full mt-4 border-none font-black tracking-wide py-2.5" onClick={() => addCourseToCart(c)}>
                              INSCRIBIRME
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {currentView === 'cart' && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-3xl font-black text-gray-800">Su Carrito de Compras</h2>
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto" />
                  <p className="text-gray-500">Su carrito está vacío. ¡Explore nuestro catálogo!</p>
                  <button className="btn btn-primary mt-4" onClick={() => setCurrentView('catalog')}>Ir al Catálogo</button>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    {cart.map(item => (
                      <div key={item.id} className="glass-panel flex gap-4 p-4 items-center justify-between">
                        <img src={item.cover_url} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
                        <div className="flex-1 pl-2">
                          <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                          <span className="text-sm font-bold text-primary">S/. {item.price.toFixed(2)}</span>
                        </div>
                        <button className="btn btn-secondary p-2 text-error hover:bg-error-light/30 border-none" onClick={() => setCart(cart.filter(i => i.id !== item.id))}>
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="w-full lg:w-96 glass-panel p-6 h-fit space-y-6">
                    <h3 className="font-bold text-xl text-gray-800">Resumen del Pedido</h3>
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                      <span className="text-gray-500">Total:</span>
                      <span className="text-2xl font-black text-primary">S/. {cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</span>
                    </div>
                    <textarea 
                      placeholder="Notas adicionales para el envío o pedido..." 
                      className="form-control h-20" 
                      value={checkoutNotes}
                      onChange={(e) => setCheckoutNotes(e.target.value)}
                    />
                    <button className="btn btn-primary w-full py-3" onClick={() => setCurrentView('checkout')}>Continuar al Checkout</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentView === 'checkout' && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-3xl font-black text-gray-800">Checkout & Método de Pago</h2>
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-1 space-y-6">
                  <h3 className="font-bold text-xl text-gray-800">Seleccione su método de pago</h3>
                  
                  {/* Tarjeta sandbox */}
                  <div className="glass-panel p-6 space-y-4">
                    <h4 className="font-bold text-lg text-gray-800">Pago Inmediato con Tarjeta de Crédito/Débito</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Simulación segura sin cargos reales. Los accesos a libros digitales se habilitarán automáticamente.</p>
                    <button className="btn btn-primary" onClick={() => handleCheckout('card')}>Pagar con Tarjeta (Demo)</button>
                  </div>

                  {/* Yape manual */}
                  <div className="glass-panel p-6 space-y-4 bg-white rounded-2xl">
                    <h4 className="font-bold text-lg text-gray-800">Pago Manual (Yape / Transferencia Bancaria)</h4>
                    <p className="text-xs text-gray-500 leading-relaxed">Escanee el código QR Yape o transfiera a la cuenta BCP. Adjunte su comprobante de pago en imagen desde su dispositivo.</p>
                    <div className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-100 justify-between">
                      <div className="flex items-center gap-3">
                        <QrCode className="w-12 h-12 text-gray-600 animate-pulse" />
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-gray-800">YAPE: 987 654 321</p>
                          <p className="text-2xs text-gray-400">Titular: Colección Creciendo Juntos S.A.C.</p>
                          <p className="text-2xs text-gray-400">BCP: 191-1234567-0-89</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 w-full sm:w-auto">
                        <label className="btn btn-secondary text-xs cursor-pointer flex items-center gap-1.5 w-full justify-center">
                          <Upload className="w-4 h-4" /> Seleccionar Comprobante
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setYapeVoucher(url))} />
                        </label>
                        {yapeVoucher.startsWith('data:') ? (
                          <span className="text-[10px] text-success font-bold flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /> Cargado listo</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Formato: JPG, PNG</span>
                        )}
                      </div>
                    </div>
                    {yapeVoucher && (
                      <div className="mt-2 flex justify-center border p-2 bg-gray-50 rounded-lg max-h-36 overflow-hidden">
                        <img src={yapeVoucher} alt="Voucher" className="h-32 object-contain" />
                      </div>
                    )}
                    <button className="btn btn-accent w-full font-black mt-2" onClick={() => handleCheckout('yape')}>Confirmar Envío de Pago</button>
                  </div>
                </div>

                <div className="w-full lg:w-96 glass-panel p-6 h-fit space-y-4">
                  <h3 className="font-bold text-xl text-gray-800">Total a pagar</h3>
                  <div className="flex justify-between items-center text-xl font-bold text-primary">
                    <span>Total:</span>
                    <span>S/. {cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'verify-cert' && (
            <div className="max-w-2xl mx-auto animate-fade-in">
              <div className="glass-panel p-8 text-center space-y-6">
                <Award className="w-16 h-16 text-primary mx-auto" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-gray-800">Verificación Pública de Certificados</h2>
                  <p className="text-sm text-gray-500">Ingrese el código único del certificado para verificar su autenticidad.</p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Código de Certificado (ej. CERT-...)" 
                    className="form-control"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <button className="btn btn-primarypx-6" onClick={() => handleVerifyCert(verificationCode)}>Verificar</button>
                </div>

                {verifiedCert && (
                  <div className="glass-panel p-6 text-left bg-primary-light/35 border-l-4 border-primary space-y-3">
                    <h3 className="font-bold text-lg text-primary-dark">Certificado Válido</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                      <p><strong>Participante:</strong> {verifiedCert.student_name}</p>
                      <p><strong>Capacitación:</strong> {verifiedCert.course_title}</p>
                      <p><strong>Horas Lectivas:</strong> {verifiedCert.hours} horas</p>
                      <p><strong>Fecha Emisión:</strong> {new Date(verifiedCert.issued_at).toLocaleDateString()}</p>
                      <p className="md:col-span-2"><strong>Estado:</strong> <span className="text-success font-bold">{verifiedCert.status.toUpperCase()}</span></p>
                    </div>
                    <button className="btn btn-secondary text-xs px-3 py-2 mt-4 flex items-center gap-1.5" onClick={() => downloadPdfCertificate(verifiedCert)}>
                      <FileDown className="w-4 h-4" /> Descargar PDF Oficial
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentView === 'dashboard' && user && (
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-3xl font-black text-gray-800">Mi Panel ({user.role.toUpperCase()})</h2>
              
              {/* ADMIN VIEW */}
              {(user.role === 'admin' || user.role === 'super_admin') && (
                <div className="space-y-8">
                  {/* Admin Sub-navigation Tabs */}
                  <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
                    <button className={`btn text-xs font-semibold py-2 px-4 rounded-lg ${adminTab === 'metrics' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('metrics')}>Métricas & Gráficos</button>
                    <button className={`btn text-xs font-semibold py-2 px-4 rounded-lg ${adminTab === 'books' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('books')}>Gestión Libros</button>
                    <button className={`btn text-xs font-semibold py-2 px-4 rounded-lg ${adminTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('orders')}>Pedidos y Pagos</button>
                    <button className={`btn text-xs font-semibold py-2 px-4 rounded-lg ${adminTab === 'courses' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('courses')}>Cursos y Certificados</button>
                    <button className={`btn text-xs font-semibold py-2 px-4 rounded-lg ${adminTab === 'templates' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('templates')}>Plantilla Certificado</button>
                    <button className={`btn text-xs font-semibold py-2 px-4 rounded-lg ${adminTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdminTab('audit')}>Auditoría de Acciones</button>
                  </div>

                  {adminTab === 'metrics' && (
                    <div className="space-y-8 animate-fade-in">
                      {/* Metrics Bar */}
                      {dashMetrics && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                          <div className="glass-panel p-6 text-center space-y-2">
                            <span className="block text-sm text-gray-400 font-semibold uppercase">Ventas Totales</span>
                            <span className="text-3xl font-black text-primary">S/. {dashMetrics.totalSales.toFixed(2)}</span>
                          </div>
                          <div className="glass-panel p-6 text-center space-y-2">
                            <span className="block text-sm text-gray-400 font-semibold uppercase">Pagos por Validar</span>
                            <span className="text-3xl font-black text-warning">{dashMetrics.pendingPayments}</span>
                          </div>
                          <div className="glass-panel p-6 text-center space-y-2">
                            <span className="block text-sm text-gray-400 font-semibold uppercase">Usuarios Activos</span>
                            <span className="text-3xl font-black text-success">{dashMetrics.activeUsers}</span>
                          </div>
                          <div className="glass-panel p-6 text-center space-y-2">
                            <span className="block text-sm text-gray-400 font-semibold uppercase">Cursos Activos</span>
                            <span className="text-3xl font-black text-slate-700">{dashMetrics.activeCourses}</span>
                          </div>
                        </div>
                      )}

                      {/* Recharts Analytics */}
                      <div className="glass-panel p-6 space-y-4">
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" /> Rendimiento de Ventas por Libros (S/.)
                        </h3>
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                              { name: '1° Sec', ventas: 1200 },
                              { name: '2° Sec', ventas: 1550 },
                              { name: '3° Sec', ventas: 980 },
                              { name: '4° Sec', ventas: 1100 },
                              { name: '5° Sec', ventas: 1800 }
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="ventas" fill="#1a56db" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'books' && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xl text-gray-800">Catálogo de Libros en Inventario</h3>
                        <button className="btn btn-primary text-xs" onClick={() => { setEditingBook(null); setBookForm({ title: '', subtitle: '', grade: 1, description: '', author: '', isbn: '', digital_price: 15, physical_price: 35, stock: 100, cover_url: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=200&auto=format&fit=crop', status: 'published' }); setShowBookModal(true); }}>+ Agregar Libro</button>
                      </div>
                      <div className="glass-panel overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-primary-light border-b border-gray-200 text-sm font-semibold">
                              <th className="p-4">Título</th>
                              <th className="p-4">Grado</th>
                              <th className="p-4">Precio Digital</th>
                              <th className="p-4">Precio Físico</th>
                              <th className="p-4">Stock Físico</th>
                              <th className="p-4">Estado</th>
                              <th className="p-4">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {books.map(b => (
                              <tr key={b.id} className="border-b border-gray-150 text-sm">
                                <td className="p-4 font-bold">{b.title}</td>
                                <td className="p-4">{b.grade}° de Secundaria</td>
                                <td className="p-4">S/. {b.digital_price.toFixed(2)}</td>
                                <td className="p-4">S/. {b.physical_price.toFixed(2)}</td>
                                <td className="p-4 font-semibold">{b.stock} unidades</td>
                                <td className="p-4">
                                  <span className="bg-success-light text-success px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">{b.status}</span>
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    <button className="btn btn-secondary text-2xs px-2 py-1" onClick={() => { setEditingBook(b); setBookForm({ ...b }); setShowBookModal(true); }}>Editar</button>
                                    <button className="btn btn-secondary text-2xs px-2 py-1 text-error hover:bg-error-light/10 border-none" onClick={() => handleDeleteBook(b.id)}>Eliminar</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {adminTab === 'orders' && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="font-bold text-xl text-gray-800">Pedidos y Aprobación de Comprobantes</h3>
                      <div className="glass-panel overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-primary-light border-b border-gray-200 text-sm font-semibold">
                              <th className="p-4">Código</th>
                              <th className="p-4">Cliente</th>
                              <th className="p-4">Monto</th>
                              <th className="p-4">Estado Pago</th>
                              <th className="p-4">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orders.map(o => (
                              <tr key={o.id} className="border-b border-gray-150 text-sm">
                                <td className="p-4 font-bold">{o.order_code}</td>
                                <td className="p-4">{o.user_name} ({o.user_email})</td>
                                <td className="p-4 font-bold">S/. {o.total.toFixed(2)}</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    o.payment_status === 'paid' ? 'bg-success-light text-success' : o.payment_status === 'rejected' ? 'bg-error-light text-error' : 'bg-warning-light text-warning'
                                  }`}>
                                    {o.payment_status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <div className="flex gap-2">
                                    {o.payment_status === 'validating' && (
                                      <>
                                        <button className="btn btn-primary text-xs px-3 py-1.5" onClick={() => handleApprovePayment(o.id)}>
                                          Aprobar Pago
                                        </button>
                                        <button className="btn btn-accent text-xs px-3 py-1.5" onClick={() => { setReviewOrder(o); setRejectionReason(''); }}>
                                          Rechazar / Revisar
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {adminTab === 'courses' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-xl text-gray-800">Administración de Cursos Activos</h3>
                        <button className="btn btn-primary text-xs" onClick={() => { setEditingCourse(null); setCourseForm({ title: '', description: '', price: 99, duration_hours: 120, cover_url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=300&auto=format&fit=crop', minimum_score: 14, progress_required: 100, status: 'published' }); setShowCourseModal(true); }}>+ Registrar Curso</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {courses.map(c => (
                          <div key={c.id} className="glass-panel p-6 space-y-3 cursor-pointer hover:border-primary transition-colors" onClick={async () => {
                            const detail = await request(`/courses/${c.id}`);
                            if (detail.success) setEditingCourse(detail.data);
                          }}>
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-lg text-gray-800">{c.title}</h4>
                              <span className="text-2xs bg-primary-light text-primary px-2 py-0.5 rounded-full font-bold">Ver Plan Curricular</span>
                            </div>
                            <p className="text-xs text-gray-500">{c.description}</p>
                            <div className="flex justify-between text-xs pt-3 border-t border-gray-100 font-semibold text-gray-700">
                              <span>Horas: {c.duration_hours} hrs</span>
                              <span>Precio: S/. {c.price.toFixed(2)}</span>
                              <span className="text-success uppercase">{c.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {editingCourse && (
                        <div className="glass-panel p-6 bg-blue-50/20 border border-primary/25 space-y-6 animate-fade-in">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-extrabold text-xl text-gray-800">Plan Curricular: {editingCourse.title}</h4>
                              <p className="text-xs text-gray-500 font-medium text-gray-400 mt-1">Configure los módulos y el material de estudio.</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <button className="btn btn-secondary text-xs bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800" onClick={() => { setCourseForm({ title: editingCourse.title, description: editingCourse.description || '', price: editingCourse.price, duration_hours: editingCourse.duration_hours, cover_url: editingCourse.cover_url || '', minimum_score: editingCourse.minimum_score || 14, progress_required: editingCourse.progress_required || 100, status: editingCourse.status || 'published' }); setShowCourseModal(true); }}>Editar Detalles</button>
                              <button className="btn btn-secondary text-xs bg-red-50 hover:bg-red-100 border-red-200 text-red-800" onClick={() => handleDeleteCourse(editingCourse.id)}>Eliminar Curso</button>
                              <button className="btn btn-secondary text-xs" onClick={() => { setModuleForm({ title: '', sort_order: (editingCourse.modules?.length || 0) + 1 }); setShowModuleModal(true); }}>+ Nuevo Módulo</button>
                              <button className="btn btn-secondary text-xs text-slate-700" onClick={() => setEditingCourse(null)}>Cerrar Plan</button>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {editingCourse.modules?.map((m: any) => (
                              <div key={m.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                <div className="flex justify-between items-center">
                                  <h5 className="font-bold text-gray-800">{m.title}</h5>
                                  <button className="btn btn-secondary text-3xs px-2 py-1" onClick={() => { setActiveModuleForLesson(m.id); setLessonForm({ title: '', description: '', content_type: 'video', content_url: '', content_body: '', sort_order: (m.lessons?.length || 0) + 1 }); setShowLessonModal(true); }}>+ Agregar Lección/Material</button>
                                </div>
                                <div className="pl-4 space-y-2 border-l-2 border-gray-100">
                                  {m.lessons?.map((l: any) => (
                                    <div key={l.id} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded border border-gray-150">
                                      <span>{l.title} <strong className="text-primary">({l.content_type})</strong></span>
                                      <span className="text-gray-400 font-mono">{l.content_url || 'Lectura de Texto'}</span>
                                    </div>
                                  ))}
                                  {(!m.lessons || m.lessons.length === 0) && (
                                    <p className="text-xs text-gray-400 italic">No hay lecciones creadas.</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {adminTab === 'templates' && (
                    <div className="glass-panel p-6 space-y-6 animate-fade-in max-w-2xl bg-white">
                      <div>
                        <h3 className="font-bold text-xl text-gray-800">Personalización de Plantilla de Certificados</h3>
                        <p className="text-xs text-gray-500">Ajuste los colores y textos por defecto que se integrarán en la generación del PDF.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                          <label className="form-label text-xs font-bold">Color Borde Externo</label>
                          <input type="color" className="w-full h-10 rounded border cursor-pointer" value={certTemplate.borderColor} onChange={(e) => setCertTemplate({ ...certTemplate, borderColor: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label text-xs font-bold">Color Detalle Elegante</label>
                          <input type="color" className="w-full h-10 rounded border cursor-pointer" value={certTemplate.accentColor} onChange={(e) => setCertTemplate({ ...certTemplate, accentColor: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label text-xs font-bold">Color de Títulos</label>
                          <input type="color" className="w-full h-10 rounded border cursor-pointer" value={certTemplate.primaryColor} onChange={(e) => setCertTemplate({ ...certTemplate, primaryColor: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label text-xs font-bold">Título Principal</label>
                          <input type="text" className="form-control" value={certTemplate.titleText} onChange={(e) => setCertTemplate({ ...certTemplate, titleText: e.target.value })} />
                        </div>
                        <div className="form-group md:col-span-2">
                          <label className="form-label text-xs font-bold">Pie de página informativo</label>
                          <textarea className="form-control h-20" value={certTemplate.footerText} onChange={(e) => setCertTemplate({ ...certTemplate, footerText: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'audit' && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="font-bold text-xl text-gray-800">Log de Auditoría del Sistema</h3>
                      <p className="text-xs text-gray-500">Historial en tiempo real de accesos, aprobaciones de pago y registros críticos de usuarios.</p>
                      <div className="glass-panel overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-primary-light border-b border-gray-200 text-sm font-semibold">
                              <th className="p-4">Usuario</th>
                              <th className="p-4">Acción</th>
                              <th className="p-4">Entidad Afectada</th>
                              <th className="p-4">IP Origen</th>
                              <th className="p-4">Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.map(l => (
                              <tr key={l.id} className="border-b border-gray-150 text-xs">
                                <td className="p-4 font-bold">{l.user_name || 'Anónimo'} ({l.user_email || 'n/a'})</td>
                                <td className="p-4 font-semibold text-primary">{l.action}</td>
                                <td className="p-4">{l.entity} (ID: {l.entity_id || 'n/a'})</td>
                                <td className="p-4">{l.ip_address || '127.0.0.1'}</td>
                                <td className="p-4">{new Date(l.created_at).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TEACHER VIEW */}
              {user.role === 'docente' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xl text-gray-800">Mis Aulas</h3>
                    <button className="btn btn-primary" onClick={() => setShowCreateClassroom(true)}><Plus className="w-4 h-4 mr-1.5" /> Crear Aula</button>
                  </div>

                  {showCreateClassroom && (
                    <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
                      <form className="glass-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleCreateClassroom}>
                        <div className="flex justify-between items-center pb-2 border-b border-gray-155">
                          <h3 className="font-extrabold text-xl text-gray-800 font-sans">Nueva Aula</h3>
                          <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setShowCreateClassroom(false)}>×</button>
                        </div>
                        <div className="form-group">
                          <label className="form-label text-xs font-bold">Nombre de la sección/aula</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Ej. Primaria 5A, Religión 2B" 
                            value={classroomForm.name}
                            onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label text-xs font-bold">Grado de Secundaria</label>
                          <select 
                            className="form-control" 
                            value={classroomForm.grade}
                            onChange={(e) => setClassroomForm({ ...classroomForm, grade: e.target.value })}
                          >
                            {[1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g}° de Secundaria</option>)}
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label text-xs font-bold">Banner o Imagen de Portada (URL o Subir archivo)</label>
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input type="text" className="form-control flex-1 text-xs" value={classroomForm.banner_url || ''} onChange={(e) => setClassroomForm({ ...classroomForm, banner_url: e.target.value })} placeholder="URL de la imagen..." />
                              <label className="btn btn-secondary text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1">
                                <Upload className="w-4 h-4" /> Subir
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setClassroomForm({ ...classroomForm, banner_url: url }))} />
                              </label>
                            </div>
                            {classroomForm.banner_url ? (
                              <div className="relative group border rounded-xl overflow-hidden shadow-2xs h-24 bg-gray-50 flex items-center justify-center">
                                <img src={classroomForm.banner_url} alt="Vista previa del banner" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button type="button" className="btn btn-secondary text-2xs py-1 px-2.5 bg-white text-gray-800" onClick={() => setClassroomForm({ ...classroomForm, banner_url: '' })}>Eliminar</button>
                                </div>
                              </div>
                            ) : (
                              <div className="border-2 border-dashed border-gray-250 hover:border-primary/50 transition-all rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center gap-1 group cursor-pointer relative">
                                <Upload className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                                <span className="text-2xs text-gray-500 font-medium">Subir portada desde PC</span>
                                <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, (url) => setClassroomForm({ ...classroomForm, banner_url: url }))} />
                              </div>
                            )}
                          </div>
                        </div>

                        <button className="btn btn-primary w-full py-3" type="submit">Guardar Aula</button>
                      </form>
                    </div>
                  )}

                  {/* Classrooms List */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {classrooms.map(c => (
                      <div key={c.id} className={`glass-panel p-6 cursor-pointer transform hover:-translate-y-0.5 transition-all duration-200 ${
                        currentClassroom?.id === c.id ? 'ring-2 ring-primary' : ''
                      }`} onClick={() => handleSelectClassroom(c)}>
                        <h4 className="font-bold text-lg text-gray-800">{c.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">Grado: {c.grade}° de Sec - {c.academic_year}</p>
                      </div>
                    ))}
                  </div>

                  {/* Selected Classroom Workspace */}
                  {currentClassroom && (
                    <div className="glass-panel p-6 md:p-8 space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="font-bold text-2xl text-gray-800">Workspace de Aula: {currentClassroom.name}</h3>
                        <div className="flex border-b border-gray-250 w-full md:w-auto gap-4">
                          <button className={`py-2 px-4 border-b-2 text-xs font-bold ${classroomTab === 'students' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`} onClick={() => setClassroomTab('students')}>Alumnos y Avance</button>
                          <button className={`py-2 px-4 border-b-2 text-xs font-bold ${classroomTab === 'materials' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`} onClick={() => setClassroomTab('materials')}>Material Didáctico</button>
                          <button className={`py-2 px-4 border-b-2 text-xs font-bold ${classroomTab === 'assessments' ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`} onClick={() => { setClassroomTab('assessments'); fetchClassroomAssessments(currentClassroom.id); }}>Tareas y Evaluaciones</button>
                          {classroomTab === 'grading' && (
                            <button className="py-2 px-4 border-b-2 text-xs font-bold border-accent text-accent">Calificar Entregas</button>
                          )}
                        </div>
                      </div>

                      {classroomTab === 'students' && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                            <span className="text-xs text-gray-500 font-semibold">Herramientas de Matrícula:</span>
                            <div className="flex gap-2">
                              <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setShowAddStudent(true)}><Plus className="w-4 h-4 mr-1.5" /> Agregar Estudiante</button>
                              <button className="btn btn-primary text-xs px-3 py-1.5" onClick={() => setShowImportStudents(true)}><Upload className="w-4 h-4 mr-1.5" /> Carga Masiva (Excel)</button>
                            </div>
                          </div>

                          {showAddStudent && (
                            <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
                              <form className="glass-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleAddStudent}>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-155">
                                  <h3 className="font-extrabold text-xl text-gray-800 font-sans">Agregar Estudiante</h3>
                                  <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setShowAddStudent(false)}>×</button>
                                </div>
                                <div className="form-group">
                                  <label className="form-label text-xs font-bold">Nombre Completo</label>
                                  <input type="text" className="form-control" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                  <label className="form-label text-xs font-bold">Correo Electrónico</label>
                                  <input type="email" className="form-control" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} required />
                                </div>
                                
                                <div className="form-group">
                                  <label className="form-label text-xs font-bold">Foto de Perfil (URL o Archivo)</label>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                      <input type="text" className="form-control flex-1 text-xs" value={studentForm.avatar_url || ''} onChange={(e) => setStudentForm({ ...studentForm, avatar_url: e.target.value })} placeholder="URL de la foto..." />
                                      <label className="btn btn-secondary text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1">
                                        <Upload className="w-4 h-4" /> Subir
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setStudentForm({ ...studentForm, avatar_url: url }))} />
                                      </label>
                                    </div>
                                    {studentForm.avatar_url ? (
                                      <div className="relative group border rounded-full overflow-hidden shadow-2xs w-20 h-20 mx-auto bg-gray-50 flex items-center justify-center">
                                        <img src={studentForm.avatar_url} alt="Vista previa avatar" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <button type="button" className="text-[10px] text-white hover:underline" onClick={() => setStudentForm({ ...studentForm, avatar_url: '' })}>Eliminar</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="border-2 border-dashed border-gray-250 hover:border-primary/50 transition-all rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center gap-1 group cursor-pointer relative">
                                        <Upload className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                                        <span className="text-2xs text-gray-500 font-medium">Subir foto desde PC</span>
                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, (url) => setStudentForm({ ...studentForm, avatar_url: url }))} />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button className="btn btn-primary w-full py-3" type="submit">Registrar Estudiante</button>
                              </form>
                            </div>
                          )}

                          {showImportStudents && (
                            <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
                              <form className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleImportStudents}>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-155">
                                  <h3 className="font-extrabold text-xl text-gray-800 font-sans">Importar Alumnos por Lote</h3>
                                  <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setShowImportStudents(false)}>×</button>
                                </div>
                                <pre className="bg-primary-light/50 p-3 rounded-lg text-2xs font-mono">
{`[
  {"name": "Carlos Ruiz", "email": "carlosruiz@colegio.com"},
  {"name": "Lucia Prado", "email": "luciaprado@colegio.com"}
]`}
                                </pre>
                                <textarea className="form-control h-28 font-mono text-xs" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Pegue la lista de alumnos en formato JSON..." required />
                                
                                <div className="form-group">
                                  <label className="form-label text-xs font-bold">Subir Lista (JSON o TXT)</label>
                                  <div className="border-2 border-dashed border-gray-250 hover:border-primary/50 transition-all rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center gap-1 group cursor-pointer relative">
                                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                                    <span className="text-2xs text-gray-500 font-medium">Subir archivo de texto desde PC</span>
                                    <input type="file" accept=".json,.txt,.csv" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (evt) => {
                                          if (evt.target?.result) setImportText(evt.target.result as string);
                                        };
                                        reader.readAsText(file);
                                      }
                                    }} />
                                  </div>
                                </div>

                                <button className="btn btn-primary w-full py-3" type="submit">Procesar Importación</button>

                                {importedCreds.length > 0 && (
                                  <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-2">
                                    <h5 className="font-bold text-xs">Credenciales temporales generadas:</h5>
                                    <ul className="text-xs list-disc pl-4 space-y-1">
                                      {importedCreds.map((ic, index) => (
                                        <li key={index}><strong>{ic.name}</strong> ({ic.email}) - Contraseña: <code>{ic.tempPassword}</code></li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </form>
                            </div>
                          )}

                          {studentProgress.length > 0 && (
                            <div className="glass-panel p-6 bg-white space-y-4">
                              <h4 className="font-bold text-md text-gray-800">Distribución de Promedios del Aula</h4>
                              <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={studentProgress.map(sp => ({ name: sp.name.split(' ')[0], promedio: sp.averageScore || 0 }))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="promedio" fill="#0e9f6e" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          <h4 className="font-bold text-lg text-gray-800">Lista de Alumnos y Avance</h4>
                          {studentProgress.length === 0 ? (
                            <p className="text-gray-500 text-sm">Aún no hay estudiantes matriculados en este aula.</p>
                          ) : (
                            <div className="glass-panel overflow-x-auto bg-white">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-primary-light border-b border-gray-250 text-sm font-semibold">
                                    <th className="p-4">Código Alumno</th>
                                    <th className="p-4">Nombre</th>
                                    <th className="p-4">Correo</th>
                                    <th className="p-4">Promedio Evaluaciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {studentProgress.map(sp => (
                                    <tr key={sp.id} className="border-b border-gray-150 text-sm">
                                      <td className="p-4 font-bold">{sp.student_code}</td>
                                      <td className="p-4">{sp.name}</td>
                                      <td className="p-4">{sp.email}</td>
                                      <td className="p-4 font-bold text-primary">{sp.averageScore > 0 ? `${sp.averageScore} / 20` : 'Sin notas'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                      {classroomTab === 'materials' && (
                        <div className="space-y-6 animate-fade-in">
                          <div>
                            <h4 className="font-bold text-lg text-gray-800">Material Didáctico y Asignación de Recursos</h4>
                            <p className="text-xs text-gray-500">Seleccione un curso del catálogo para asignar materiales, lecturas o videos.</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses.map(c => (
                              <div key={c.id} className="glass-panel p-6 bg-white space-y-3 hover:border-primary cursor-pointer transition-colors" onClick={async () => {
                                const detail = await request(`/courses/${c.id}`);
                                if (detail.success) setEditingCourse(detail.data);
                              }}>
                                <h5 className="font-bold text-gray-800">{c.title}</h5>
                                <p className="text-xs text-gray-500">{c.description}</p>
                                <span className="text-2xs bg-primary-light text-primary px-2.5 py-0.5 rounded-full font-bold inline-block">Ver Unidades y Asignar</span>
                              </div>
                            ))}
                          </div>

                          {editingCourse && (
                            <div className="glass-panel p-6 bg-gray-50 border border-primary/20 space-y-4 animate-fade-in">
                              <div className="flex justify-between items-center">
                                <h5 className="font-extrabold text-md text-gray-800">Planificador de Recursos: {editingCourse.title}</h5>
                                <div className="flex gap-2">
                                  <button className="btn btn-secondary text-xs px-2.5 py-1.5" onClick={() => { setModuleForm({ title: '', sort_order: (editingCourse.modules?.length || 0) + 1 }); setShowModuleModal(true); }}>+ Crear Módulo</button>
                                  <button className="btn btn-secondary text-xs px-2.5 py-1.5 text-error" onClick={() => setEditingCourse(null)}>Cerrar</button>
                                </div>
                              </div>
                              <div className="space-y-4">
                                {editingCourse.modules?.map((m: any) => (
                                  <div key={m.id} className="bg-white p-4 rounded-xl border border-gray-150 shadow-sm space-y-3">
                                    <div className="flex justify-between items-center">
                                      <h6 className="font-bold text-sm text-gray-700">{m.title}</h6>
                                      <button className="btn btn-secondary text-3xs px-2 py-1" onClick={() => { setActiveModuleForLesson(m.id); setLessonForm({ title: '', description: '', content_type: 'video', content_url: '', content_body: '', sort_order: (m.lessons?.length || 0) + 1 }); setShowLessonModal(true); }}>+ Añadir Material</button>
                                    </div>
                                    <div className="pl-4 space-y-2 border-l-2 border-gray-100 text-xs text-gray-600">
                                      {m.lessons?.map((l: any) => (
                                        <div key={l.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                                          <span>{l.title} <strong className="text-primary uppercase">[{l.content_type}]</strong></span>
                                          {l.content_url && <a href={l.content_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{l.content_url}</a>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {classroomTab === 'assessments' && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-bold text-lg text-gray-800">Evaluaciones, Cuestionarios y Tareas</h4>
                              <p className="text-xs text-gray-500">Cree evaluaciones para su aula y realice el seguimiento de entregas.</p>
                            </div>
                            <button className="btn btn-primary text-xs px-3 py-1.5" onClick={() => { setAssessmentForm({ title: '', type: 'quiz', startAt: new Date().toISOString().slice(0,16), endAt: new Date(Date.now() + 7*24*3600*1000).toISOString().slice(0,16), maxScore: 20, questions: [], image_url: '' }); setShowCreateAssessment(true); }}>+ Crear Cuestionario / Tarea</button>
                          </div>

                          {showCreateAssessment && (
                            <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
                              <form className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleCreateAssessment}>
                                <div className="flex justify-between items-center pb-2 border-b border-gray-155">
                                  <h3 className="font-extrabold text-xl text-gray-800 font-sans">Nuevo Cuestionario / Tarea</h3>
                                  <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setShowCreateAssessment(false)}>×</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="form-group">
                                    <label className="form-label text-xs font-bold">Título de la Evaluación</label>
                                    <input type="text" className="form-control" placeholder="Ej. Examen Mensual - Unidad 1" value={assessmentForm.title} onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })} required />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label text-xs font-bold">Tipo</label>
                                    <select className="form-control" value={assessmentForm.type} onChange={(e) => setAssessmentForm({ ...assessmentForm, type: e.target.value })}>
                                      <option value="quiz">Cuestionario (Quiz)</option>
                                      <option value="exam">Examen Escrito</option>
                                      <option value="task">Tarea / Trabajo Abierto</option>
                                    </select>
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label text-xs font-bold">Fecha Límite (Entrega)</label>
                                    <input type="datetime-local" className="form-control" value={assessmentForm.endAt} onChange={(e) => setAssessmentForm({ ...assessmentForm, endAt: e.target.value })} required />
                                  </div>
                                  <div className="form-group">
                                    <label className="form-label text-xs font-bold">Puntaje Máximo</label>
                                    <input type="number" className="form-control" value={assessmentForm.maxScore} onChange={(e) => setAssessmentForm({ ...assessmentForm, maxScore: parseInt(e.target.value) })} />
                                  </div>
                                </div>

                                <div className="form-group">
                                  <label className="form-label text-xs font-bold">Imagen de Referencia / Adjunto (URL o Subir archivo)</label>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex gap-2">
                                      <input type="text" className="form-control flex-1 text-xs" value={assessmentForm.image_url || ''} onChange={(e) => setAssessmentForm({ ...assessmentForm, image_url: e.target.value })} placeholder="URL de la imagen de referencia..." />
                                      <label className="btn btn-secondary text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1">
                                        <Upload className="w-4 h-4" /> Subir
                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setAssessmentForm({ ...assessmentForm, image_url: url }))} />
                                      </label>
                                    </div>
                                    {assessmentForm.image_url ? (
                                      <div className="relative group border rounded-xl overflow-hidden shadow-2xs h-28 bg-gray-50 flex items-center justify-center">
                                        <img src={assessmentForm.image_url} alt="Referencia" className="w-full h-full object-contain" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <button type="button" className="btn btn-secondary text-2xs py-1 px-2.5 bg-white text-gray-800" onClick={() => setAssessmentForm({ ...assessmentForm, image_url: '' })}>Eliminar</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="border-2 border-dashed border-gray-250 hover:border-primary/50 transition-all rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center gap-1 group cursor-pointer relative">
                                        <Upload className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                                        <span className="text-2xs text-gray-500 font-medium">Subir imagen de referencia desde PC</span>
                                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, (url) => setAssessmentForm({ ...assessmentForm, image_url: url }))} />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 space-y-4">
                                  <h5 className="font-bold text-sm text-gray-800">Preguntas del Cuestionario ({assessmentForm.questions.length})</h5>
                                  
                                  <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-155">
                                    <div className="form-group">
                                      <label className="form-label text-xs font-bold">Pregunta</label>
                                      <input type="text" className="form-control" placeholder="Ej. ¿Qué es la fe?" value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                      <label className="form-label text-xs font-bold">Tipo de Pregunta</label>
                                      <select className="form-control" value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)}>
                                        <option value="multiple_choice">Opción Múltiple (4 opciones)</option>
                                        <option value="true_false">Verdadero / Falso</option>
                                        <option value="open">Respuesta Abierta (Calificación manual)</option>
                                      </select>
                                    </div>

                                    {newQuestionType === 'multiple_choice' && (
                                      <div className="grid grid-cols-2 gap-2">
                                        {newQuestionOptions.map((opt, oIdx) => (
                                          <div key={oIdx} className="flex gap-1 items-center">
                                            <span className="text-xs font-bold">{oIdx + 1}:</span>
                                            <input type="text" className="form-control text-xs py-1" value={opt} onChange={(e) => {
                                              const updated = [...newQuestionOptions];
                                              updated[oIdx] = e.target.value;
                                              setNewQuestionOptions(updated);
                                            }} placeholder={`Opción ${oIdx + 1}`} />
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {newQuestionType !== 'open' && (
                                      <div className="form-group">
                                        <label className="form-label text-xs font-bold">Respuesta Correcta</label>
                                        <select className="form-control" value={newQuestionCorrect} onChange={(e) => setNewQuestionCorrect(e.target.value)}>
                                          {newQuestionType === 'multiple_choice' ? (
                                            newQuestionOptions.map((_, oIdx) => <option key={oIdx} value={oIdx.toString()}>Opción {oIdx + 1}</option>)
                                          ) : (
                                            <>
                                              <option value="Verdadero">Verdadero</option>
                                              <option value="Falso">Falso</option>
                                            </>
                                          )}
                                        </select>
                                      </div>
                                    )}

                                    <button type="button" className="btn btn-secondary text-xs w-full py-1.5" onClick={addQuestionToForm}>+ Añadir Pregunta a la Evaluación</button>
                                  </div>

                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {assessmentForm.questions.map((q, qIdx) => (
                                      <div key={qIdx} className="bg-white p-3 rounded-lg border text-xs flex justify-between items-center shadow-3xs">
                                        <div>
                                          <p className="font-bold">{qIdx + 1}. {q.text}</p>
                                          <p className="text-gray-400 font-semibold">{q.type === 'multiple_choice' ? `Múltiple (${q.options.join(', ')})` : q.type === 'true_false' ? 'V/F' : 'Abierta'}</p>
                                        </div>
                                        <button type="button" className="text-error font-bold" onClick={() => setAssessmentForm({ ...assessmentForm, questions: assessmentForm.questions.filter((_, idx) => idx !== qIdx) })}>Eliminar</button>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <button type="submit" className="btn btn-primary w-full py-3" disabled={assessmentForm.questions.length === 0 && assessmentForm.type === 'quiz'}>Asignar Evaluación al Aula</button>
                              </form>
                            </div>
                          )}

                          <div className="grid grid-cols-1 gap-4">
                            {classroomAssessments.map(a => (
                              <div key={a.id} className="glass-panel p-5 bg-white flex justify-between items-center">
                                <div className="space-y-1">
                                  <div className="flex gap-2 items-center">
                                    <h5 className="font-bold text-slate-800">{a.title}</h5>
                                    <span className="bg-primary-light text-primary text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full">{a.type}</span>
                                  </div>
                                  <p className="text-xs text-gray-500">Fecha límite de entrega: <strong>{new Date(a.end_at).toLocaleString()}</strong></p>
                                  <p className="text-xs text-gray-400 font-semibold">Puntaje máximo: {a.max_score} puntos | {a.questions_count} preguntas</p>
                                </div>
                                <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => handleOpenGrading(a.id)}>Ver Entregas y Calificar</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {classroomTab === 'grading' && (
                        <div className="space-y-6 animate-fade-in">
                          <div className="flex justify-between items-center bg-accent-light/20 p-4 rounded-xl border border-accent/20">
                            <div>
                              <h4 className="font-bold text-lg text-accent-dark">Revisión y Calificación: {selectedAssessmentForGrading?.title}</h4>
                              <p className="text-xs text-gray-500">Califique los cuestionarios y registre retroalimentación manual para respuestas abiertas o tareas.</p>
                            </div>
                            <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => setClassroomTab('assessments')}>Volver a Evaluaciones</button>
                          </div>

                          <div className="glass-panel overflow-x-auto bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="bg-primary-light border-b border-gray-250 text-sm font-semibold">
                                    <th className="p-4">Alumno</th>
                                    <th className="p-4">Correo</th>
                                    <th className="p-4">Puntaje</th>
                                    <th className="p-4">Retroalimentación</th>
                                    <th className="p-4">Acción</th>
                                  </tr>
                              </thead>
                              <tbody>
                                {submissionsList.map(sub => (
                                  <tr key={sub.id} className="border-b border-gray-150 text-sm">
                                    <td className="p-4 font-bold">{sub.user_name}</td>
                                    <td className="p-4">{sub.user_email}</td>
                                    <td className="p-4 font-extrabold text-primary">{sub.score} / {selectedAssessmentForGrading?.max_score}</td>
                                    <td className="p-4 text-xs italic text-gray-500">{sub.feedback || 'Sin retroalimentación'}</td>
                                    <td className="p-4">
                                      <button className="btn btn-primary text-xs px-2.5 py-1" onClick={() => { setGradingSubmission(sub); setGradingForm({ score: sub.score, feedback: sub.feedback || '' }); }}>Calificar / Retroalimentar</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STUDENT VIEW */}
              {user.role === 'estudiante' && (
                <div className="space-y-8">
                  <h3 className="font-bold text-xl text-gray-800">Mis Cursos Matriculados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {studentEnrollments.map(se => (
                      <div key={se.id} className="glass-panel p-6 flex flex-col justify-between">
                        <div className="space-y-3">
                          <h4 className="font-bold text-lg text-gray-800 leading-snug">{se.course_title}</h4>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400">Progreso:</span>
                            <span className="font-bold text-primary">{se.progress}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${se.progress}%` }} />
                          </div>
                        </div>
                        <div className="mt-6">
                          {se.progress >= 100 ? (
                            <button className="btn btn-accent w-full" onClick={async () => {
                              const certRes = await request('/certificates/generate', 'POST', { enrollmentId: se.id });
                              if (certRes.success && certRes.data) {
                                setVerificationCode(certRes.data.certificate_code);
                                handleVerifyCert(certRes.data.certificate_code);
                                setCurrentView('verify-cert');
                              }
                            }}>Generar Certificado</button>
                          ) : (
                            <button className="btn btn-primary w-full" onClick={async () => {
                              const res = await request(`/courses/${se.course_id}`);
                              if (res.success && res.data) {
                                setSelectedCourse({ ...res.data, enrollmentId: se.id });
                              }
                            }}>Continuar Lecciones</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Active Course Reader */}
                  {selectedCourse && (
                    <div className="glass-panel p-6 md:p-8 space-y-6">
                      <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                        <h3 className="font-bold text-2xl text-gray-800">Aula Virtual: {selectedCourse.title}</h3>
                        <button className="btn btn-secondary text-xs px-3 py-1.5" onClick={() => { setSelectedCourse(null); setActiveLessonToView(null); }}>Cerrar Aula</button>
                      </div>

                      {/* Active Lesson Interactive Viewer Panel */}
                      {activeLessonToView && (
                        <div className="glass-panel p-6 bg-slate-900 text-white rounded-2xl space-y-4 animate-fade-in relative">
                          <button className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-light cursor-pointer" onClick={() => setActiveLessonToView(null)}>×</button>
                          <span className="bg-yellow-400 text-slate-900 text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full inline-block">Visualizando Recurso</span>
                          <h4 className="font-extrabold text-xl text-yellow-400 leading-snug">{activeLessonToView.title}</h4>
                          <p className="text-xs text-gray-300">{activeLessonToView.description}</p>
                          
                          <div className="w-full flex justify-center bg-black/40 rounded-xl overflow-hidden p-2 min-h-[300px]">
                            {/* 1. YouTube Video Embed */}
                            {(activeLessonToView.content_url && (activeLessonToView.content_url.includes('youtube.com') || activeLessonToView.content_url.includes('youtu.be'))) ? (
                              <iframe 
                                className="w-full aspect-video max-h-[480px] rounded-lg border-none"
                                src={`https://www.youtube.com/embed/${activeLessonToView.content_url.split('v=')[1]?.split('&')[0] || activeLessonToView.content_url.split('/').pop()}`}
                                title="YouTube video player"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            ) : activeLessonToView.content_type === 'video' && activeLessonToView.content_url ? (
                              /* 2. Direct MP4 Video Player */
                              <video controls className="w-full aspect-video max-h-[480px] rounded-lg shadow-md" src={activeLessonToView.content_url}></video>
                            ) : activeLessonToView.content_type === 'pdf' && activeLessonToView.content_url ? (
                              /* 3. PDF Viewer */
                              <iframe src={activeLessonToView.content_url} className="w-full h-[600px] rounded-lg bg-white border-none" title="PDF Viewer"></iframe>
                            ) : (activeLessonToView.content_url && (activeLessonToView.content_url.endsWith('.doc') || activeLessonToView.content_url.endsWith('.docx') || activeLessonToView.content_url.endsWith('.ppt') || activeLessonToView.content_url.endsWith('.pptx') || activeLessonToView.content_url.endsWith('.xls') || activeLessonToView.content_url.endsWith('.xlsx'))) ? (
                              /* 4. PPT / Doc Document Viewer via MS Office */
                              <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeLessonToView.content_url.startsWith('http') ? activeLessonToView.content_url : window.location.origin + activeLessonToView.content_url)}`} className="w-full h-[600px] rounded-lg bg-white border-none" title="Document Viewer"></iframe>
                            ) : (activeLessonToView.content_url && (activeLessonToView.content_url.match(/\.(jpeg|jpg|gif|png|webp)/i) || activeLessonToView.content_url.startsWith('data:image/'))) ? (
                              /* 5. Images Viewer */
                              <img src={activeLessonToView.content_url} alt={activeLessonToView.title} className="max-w-full max-h-[500px] object-contain rounded-lg shadow-lg" />
                            ) : activeLessonToView.content_type === 'link' && activeLessonToView.content_url ? (
                              /* 6. General External Link */
                              <div className="p-8 text-center space-y-4 flex flex-col justify-center items-center w-full">
                                <p className="text-sm text-gray-300">Este recurso está enlazado a un sitio web externo:</p>
                                <a href={activeLessonToView.content_url} target="_blank" rel="noopener noreferrer" className="btn btn-accent inline-flex items-center gap-1.5 px-6 font-bold py-2.5">
                                  Abrir Enlace Externo ↗
                                </a>
                              </div>
                            ) : (
                              /* 7. Markdown or Rich Text Body */
                              <div className="p-6 text-gray-200 text-sm leading-relaxed max-w-none prose prose-invert bg-slate-800 rounded-lg w-full overflow-y-auto max-h-[500px]">
                                {activeLessonToView.content_body || 'No hay contenido adicional para este recurso.'}
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Formato: {activeLessonToView.content_type}</span>
                            <button className="btn btn-accent text-xs px-4 py-1.5" onClick={async () => {
                              const completeRes = await request(`/lessons/${activeLessonToView.id}/complete`, 'POST');
                              if (completeRes.success) {
                                alert('¡Lección completada con éxito!');
                                fetchStudentCourses();
                                setSelectedCourse({
                                  ...selectedCourse,
                                  progress: completeRes.data.progress
                                });
                                setActiveLessonToView(null);
                              }
                            }}>
                              ✓ Marcar como Completado
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Course Modules and Lessons list */}
                      {selectedCourse.modules?.map((m: any) => (
                        <div key={m.id} className="space-y-4">
                          <h4 className="font-bold text-lg border-b border-gray-100 pb-2 text-gray-800">{m.title}</h4>
                          <div className="flex flex-col gap-3">
                            {m.lessons?.map((l: any) => (
                              <div key={l.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors gap-3 cursor-pointer" onClick={() => setActiveLessonToView(l)}>
                                <div>
                                  <h5 className="font-bold text-sm text-gray-800 hover:text-primary transition-colors flex items-center gap-1.5">
                                    <span className="text-primary-dark">📖</span> {l.title}
                                  </h5>
                                  <span className="text-3xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase">Tipo: {l.content_type.toUpperCase()}</span>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                                  <button className="btn btn-secondary text-2xs px-3 py-1.5 flex-1 sm:flex-initial" onClick={() => setActiveLessonToView(l)}>
                                    Visualizar
                                  </button>
                                  <button className="btn btn-primary text-2xs px-3 py-1.5 flex-1 sm:flex-initial" onClick={async () => {
                                    const completeRes = await request(`/lessons/${l.id}/complete`, 'POST');
                                    if (completeRes.success) {
                                      alert('Lección completada.');
                                      fetchStudentCourses();
                                      setSelectedCourse({
                                        ...selectedCourse,
                                        progress: completeRes.data.progress
                                      });
                                    }
                                  }}>
                                    ✓ Completar
                                  </button>
                                </div>
                              </div>
                            ))}
                            {(!m.lessons || m.lessons.length === 0) && (
                              <p className="text-xs text-gray-400 italic">No hay material en esta unidad.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tareas y Evaluaciones del Alumno */}
                  <div className="space-y-4 pt-8 border-t border-gray-200">
                    <h3 className="font-bold text-xl text-gray-800">Mis Evaluaciones y Tareas Pendientes</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {studentAssessments.map(sa => (
                        <div key={sa.id} className="glass-panel p-5 bg-white flex justify-between items-center">
                          <div className="space-y-1">
                            <div className="flex gap-2 items-center">
                              <h5 className="font-bold text-slate-800">{sa.title}</h5>
                              <span className="bg-primary-light text-primary text-3xs font-extrabold uppercase px-2 py-0.5 rounded-full">{sa.type}</span>
                            </div>
                            <p className="text-xs text-gray-500">Aula: {sa.classroom_name} | Vence el: <strong>{new Date(sa.end_at).toLocaleString()}</strong></p>
                            {sa.my_grade ? (
                              <div className="text-xs text-success font-bold mt-1">
                                Calificación: {sa.my_grade.score} / {sa.max_score} puntos
                                {sa.my_grade.feedback && <p className="text-3xs italic text-gray-400 font-normal">Retroalimentación: "{sa.my_grade.feedback}"</p>}
                              </div>
                            ) : (
                              <span className="text-2xs bg-warning-light text-warning px-2.5 py-0.5 rounded-full font-bold uppercase inline-block mt-1">Pendiente</span>
                            )}
                          </div>
                          {!sa.my_grade && (
                            <button className="btn btn-primary text-xs px-4 py-2" onClick={async () => {
                              const detail = await request(`/assessments/${sa.id}`);
                              if (detail.success) {
                                setActiveAssessmentForStudent(detail.data);
                                setStudentAnswers({});
                              }
                            }}>Resolver Evaluación</button>
                          )}
                        </div>
                      ))}
                      {studentAssessments.length === 0 && (
                        <p className="text-sm text-gray-400 italic">No tiene tareas ni evaluaciones asignadas en sus aulas.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* BOOK CRUD MODAL */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <form className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleSaveBook}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-155">
              <h3 className="font-extrabold text-xl text-gray-800 font-sans">{editingBook ? 'Editar Libro' : 'Nuevo Libro'}</h3>
              <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setShowBookModal(false)}>×</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group sm:col-span-2">
                <label className="form-label text-xs font-bold">Título</label>
                <input type="text" className="form-control" value={bookForm.title} onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })} required />
              </div>
              <div className="form-group sm:col-span-2">
                <label className="form-label text-xs font-bold">Subtítulo</label>
                <input type="text" className="form-control" value={bookForm.subtitle} onChange={(e) => setBookForm({ ...bookForm, subtitle: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Grado</label>
                <select className="form-control" value={bookForm.grade} onChange={(e) => setBookForm({ ...bookForm, grade: parseInt(e.target.value) })}>
                  {[1,2,3,4,5].map(g => <option key={g} value={g}>{g}° de Secundaria</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">ISBN</label>
                <input type="text" className="form-control" value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Precio Digital</label>
                <input type="number" step="0.01" className="form-control" value={bookForm.digital_price} onChange={(e) => setBookForm({ ...bookForm, digital_price: parseFloat(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Precio Físico</label>
                <input type="number" step="0.01" className="form-control" value={bookForm.physical_price} onChange={(e) => setBookForm({ ...bookForm, physical_price: parseFloat(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Stock Físico</label>
                <input type="number" className="form-control" value={bookForm.stock} onChange={(e) => setBookForm({ ...bookForm, stock: parseInt(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Estado</label>
                <select className="form-control" value={bookForm.status} onChange={(e) => setBookForm({ ...bookForm, status: e.target.value })}>
                  <option value="published">Publicado</option>
                  <option value="draft">Borrador</option>
                </select>
              </div>
              
              <div className="form-group sm:col-span-2">
                <label className="form-label text-xs font-bold">Carátula del Libro (URL o Subir archivo)</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input type="text" className="form-control flex-1 text-xs" value={bookForm.cover_url} onChange={(e) => setBookForm({ ...bookForm, cover_url: e.target.value })} placeholder="URL de la imagen..." />
                    <label className="btn btn-secondary text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1">
                      <Upload className="w-4 h-4" /> Subir
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setBookForm({ ...bookForm, cover_url: url }))} />
                    </label>
                  </div>
                  {bookForm.cover_url ? (
                    <div className="relative group border rounded-xl overflow-hidden shadow-2xs h-32 bg-gray-50 flex items-center justify-center animate-fade-in">
                      <img src={bookForm.cover_url} alt="Previsualización" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" className="btn btn-secondary text-2xs py-1 px-2.5 bg-white text-gray-800" onClick={() => setBookForm({ ...bookForm, cover_url: '' })}>Eliminar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-250 hover:border-primary/50 transition-all rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center gap-1 group cursor-pointer relative animate-fade-in">
                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                      <span className="text-2xs text-gray-500 font-medium">Subir carátula desde PC</span>
                      <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, (url) => setBookForm({ ...bookForm, cover_url: url }))} />
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group sm:col-span-2">
                <label className="form-label text-xs font-bold">Descripción corta</label>
                <textarea className="form-control h-20" value={bookForm.description} onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary w-full py-3 mt-4" type="submit">Guardar Libro</button>
          </form>
        </div>
      )}

      {/* COURSE CRUD MODAL */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <form className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleSaveCourse}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-155">
              <h3 className="font-extrabold text-xl text-gray-800 font-sans">{editingCourse ? 'Editar Capacitación' : 'Registrar Capacitación'}</h3>
              <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setShowCourseModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label text-xs font-bold">Título del Curso</label>
              <input type="text" className="form-control" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label text-xs font-bold">Precio (S/.)</label>
                <input type="number" className="form-control" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) })} required />
              </div>
              <div className="form-group">
                <label className="form-label text-xs font-bold">Horas Lectivas</label>
                <input type="number" className="form-control" value={courseForm.duration_hours} onChange={(e) => setCourseForm({ ...courseForm, duration_hours: parseInt(e.target.value) })} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label text-xs font-bold">Portada del Curso (URL o Archivo)</label>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input type="text" className="form-control flex-1 text-xs" value={courseForm.cover_url} onChange={(e) => setCourseForm({ ...courseForm, cover_url: e.target.value })} placeholder="URL de la imagen..." />
                  <label className="btn btn-secondary text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1">
                    <Upload className="w-4 h-4" /> Subir
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setCourseForm({ ...courseForm, cover_url: url }))} />
                  </label>
                </div>
                {courseForm.cover_url ? (
                  <div className="relative group border rounded-xl overflow-hidden shadow-2xs h-32 bg-gray-50 flex items-center justify-center animate-fade-in">
                    <img src={courseForm.cover_url} alt="Portada" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" className="btn btn-secondary text-2xs py-1 px-2.5 bg-white text-gray-800" onClick={() => setCourseForm({ ...courseForm, cover_url: '' })}>Eliminar</button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-250 hover:border-primary/50 transition-all rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center gap-1 group cursor-pointer relative animate-fade-in">
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                    <span className="text-2xs text-gray-500 font-medium">Subir portada desde PC</span>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, (url) => setCourseForm({ ...courseForm, cover_url: url }))} />
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label text-xs font-bold">Descripción</label>
              <textarea className="form-control h-20" value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} />
            </div>
            <button className="btn btn-primary w-full py-3 animate-pulse-subtle" type="submit">{editingCourse ? 'Guardar Cambios' : 'Crear Curso'}</button>
          </form>
        </div>
      )}

      {/* MODULE MODAL */}
      {showModuleModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <form className="glass-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleCreateModule}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-155">
              <h3 className="font-extrabold text-xl text-gray-800 font-sans font-sans">Nuevo Módulo / Unidad</h3>
              <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setShowModuleModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label text-xs font-bold">Título del Módulo</label>
              <input type="text" className="form-control" value={moduleForm.title} onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })} required />
            </div>
            
            <div className="form-group">
              <label className="form-label text-xs font-bold">Imagen de Módulo (Opcional - URL o Archivo)</label>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input type="text" className="form-control flex-1 text-xs" value={moduleForm.image_url || ''} onChange={(e) => setModuleForm({ ...moduleForm, image_url: e.target.value })} placeholder="URL de la imagen..." />
                  <label className="btn btn-secondary text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1">
                    <Upload className="w-4 h-4" /> Subir
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setModuleForm({ ...moduleForm, image_url: url }))} />
                  </label>
                </div>
                {moduleForm.image_url ? (
                  <div className="relative group border rounded-xl overflow-hidden shadow-2xs h-24 bg-gray-50 flex items-center justify-center animate-fade-in">
                    <img src={moduleForm.image_url} alt="Imagen módulo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" className="btn btn-secondary text-2xs py-1 px-2.5 bg-white text-gray-800" onClick={() => setModuleForm({ ...moduleForm, image_url: '' })}>Eliminar</button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-250 hover:border-primary/50 transition-all rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center gap-1 group cursor-pointer relative animate-fade-in">
                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                    <span className="text-2xs text-gray-500 font-medium">Subir imagen desde PC</span>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, (url) => setModuleForm({ ...moduleForm, image_url: url }))} />
                  </div>
                )}
              </div>
            </div>

            <button className="btn btn-primary w-full py-3" type="submit">Crear Módulo</button>
          </form>
        </div>
      )}

      {/* LESSON MODAL */}
      {showLessonModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <form className="glass-panel w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleCreateLesson}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-155">
              <h3 className="font-extrabold text-xl text-gray-800 font-sans">Nuevo Material / Lección</h3>
              <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setShowLessonModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label text-xs font-bold">Título</label>
              <input type="text" className="form-control" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label text-xs font-bold">Tipo de Contenido</label>
              <select className="form-control" value={lessonForm.content_type} onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })}>
                <option value="video">Video (URL YouTube)</option>
                <option value="pdf">Lectura PDF (URL o Archivo)</option>
                <option value="text">Texto Informativo</option>
                <option value="link">Enlace Externo</option>
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label text-xs font-bold">Recurso / Archivo (URL o Subir archivo)</label>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input type="text" className="form-control flex-1 text-xs" value={lessonForm.content_url} onChange={(e) => setLessonForm({ ...lessonForm, content_url: e.target.value })} placeholder="URL, enlace o archivo..." />
                  <label className="btn btn-secondary text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1">
                    <Upload className="w-4 h-4" /> Subir
                    <input type="file" accept="image/*,application/pdf,.doc,.docx" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setLessonForm({ ...lessonForm, content_url: url }))} />
                  </label>
                </div>
                {lessonForm.content_url ? (
                  <div className="relative group border rounded-xl overflow-hidden shadow-2xs p-3 bg-gray-50 flex items-center justify-between gap-2 animate-fade-in">
                    <span className="text-[10px] text-gray-505 truncate flex-1 font-mono">{lessonForm.content_url}</span>
                    <button type="button" className="text-error font-bold text-2xs cursor-pointer shrink-0 hover:underline" onClick={() => setLessonForm({ ...lessonForm, content_url: '' })}>Eliminar</button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-250 hover:border-primary/50 transition-all rounded-xl p-4 bg-gray-50/50 flex flex-col items-center justify-center gap-1 group cursor-pointer relative animate-fade-in">
                    <Upload className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
                    <span className="text-2xs text-gray-500 font-medium">Subir archivo/imagen desde PC</span>
                    <input type="file" accept="image/*,application/pdf,.doc,.docx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, (url) => setLessonForm({ ...lessonForm, content_url: url }))} />
                  </div>
                )}
              </div>
            </div>

            <button className="btn btn-primary w-full py-3" type="submit">Agregar Material</button>
          </form>
        </div>
      )}

      {/* MANUAL PAYMENT REVIEW MODAL */}
      {reviewOrder && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <form className="glass-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleRejectPayment}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-155">
              <h3 className="font-extrabold text-xl text-gray-800 font-sans">Revisar Pago Manual</h3>
              <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setReviewOrder(null)}>×</button>
            </div>
            <p className="text-xs text-gray-500">Monto: <strong>S/. {reviewOrder.total.toFixed(2)}</strong></p>
            <div className="p-4 bg-gray-50 rounded-xl border flex justify-center max-h-56 overflow-hidden">
              <img src={reviewOrder.voucher_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=200&auto=format&fit=crop'} alt="Comprobante Yape" className="h-48 object-contain rounded border shadow-2xs" />
            </div>
            <div className="form-group">
              <label className="form-label text-xs font-bold text-error">Motivo de Rechazo (si no es válido)</label>
              <input type="text" className="form-control border-error text-xs" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Ej. El código de operación ya fue usado." />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" className="btn btn-primary text-xs" onClick={() => { handleApprovePayment(reviewOrder.id); setReviewOrder(null); }}>Aprobar Pago</button>
              <button type="submit" className="btn btn-accent bg-red-600 hover:bg-red-700 text-white border-none text-xs">Rechazar Pago</button>
            </div>
          </form>
        </div>
      )}

      {/* GRADING DIALOG */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <form className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleGradeSubmission}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-155">
              <h3 className="font-extrabold text-xl text-gray-800 font-sans">Calificar Entrega: {gradingSubmission.user_name}</h3>
              <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setGradingSubmission(null)}>×</button>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto border-y border-gray-100 py-3 text-xs text-gray-700">
              <h4 className="font-bold text-slate-800">Respuestas del estudiante:</h4>
              {gradingSubmission.answers?.map((ans: any, aIdx: number) => (
                <div key={aIdx} className="bg-gray-50 p-2.5 rounded border border-gray-150 space-y-1">
                  <p className="font-bold font-sans">P{aIdx + 1}: {ans.question_text}</p>
                  <p className="font-mono text-primary font-bold">Respuesta: {ans.answer_text}</p>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-bold">Nota Final (0 a 20)</label>
              <input type="number" min="0" max="20" className="form-control" value={gradingForm.score} onChange={(e) => setGradingForm({ ...gradingForm, score: parseInt(e.target.value) })} required />
            </div>
            <div className="form-group">
              <label className="form-label text-xs font-bold">Retroalimentación / Comentario</label>
              <textarea className="form-control h-20" value={gradingForm.feedback} onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })} placeholder="Escriba comentarios para el alumno..." />
            </div>
            <button className="btn btn-primary w-full py-3" type="submit">Registrar Calificación</button>
          </form>
        </div>
      )}

      {/* STUDENT RESOLUTION DIALOG */}
      {activeAssessmentForStudent && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <form className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-4 rounded-2xl shadow-premium relative animate-slide-up" onSubmit={handleStudentSubmitAssessment}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-155">
              <h3 className="font-extrabold text-xl text-primary font-sans">{activeAssessmentForStudent.title}</h3>
              <button type="button" className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setActiveAssessmentForStudent(null)}>×</button>
            </div>
            <p className="text-xs text-gray-500">Puntaje Máximo: {activeAssessmentForStudent.max_score} puntos | Por favor, responda cada pregunta antes de enviar.</p>
            
            {activeAssessmentForStudent.image_url && (
              <div className="border border-gray-150 rounded-xl overflow-hidden shadow-2xs max-h-48 flex justify-center bg-gray-50 p-2">
                <img src={activeAssessmentForStudent.image_url} alt="Recurso de evaluación" className="h-full object-contain" />
              </div>
            )}
            
            <div className="space-y-4 py-4 border-y border-gray-100">
              {activeAssessmentForStudent.questions?.map((q: any, qIdx: number) => (
                <div key={q.id} className="space-y-2">
                  <p className="text-sm font-bold text-gray-800 font-sans">{qIdx + 1}. {q.text}</p>
                  
                  {q.type === 'multiple_choice' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2 animate-fade-in">
                      {q.options?.map((opt: string, oIdx: number) => (
                        <label key={oIdx} className="flex gap-2 items-center text-xs font-medium cursor-pointer">
                          <input type="radio" name={`q_${q.id}`} value={oIdx.toString()} checked={studentAnswers[q.id] === oIdx.toString()} onChange={(e) => setStudentAnswers({ ...studentAnswers, [q.id]: e.target.value })} required />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'true_false' && (
                    <div className="flex gap-4 pl-2 animate-fade-in">
                      {['Verdadero', 'Falso'].map(opt => (
                        <label key={opt} className="flex gap-2 items-center text-xs font-medium cursor-pointer">
                          <input type="radio" name={`q_${q.id}`} value={opt} checked={studentAnswers[q.id] === opt} onChange={(e) => setStudentAnswers({ ...studentAnswers, [q.id]: e.target.value })} required />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === 'open' && (
                    <textarea className="form-control text-xs h-16" value={studentAnswers[q.id] || ''} onChange={(e) => setStudentAnswers({ ...studentAnswers, [q.id]: e.target.value })} placeholder="Escriba su respuesta detallada aquí..." required />
                  )}
                </div>
              ))}
            </div>

            <button className="btn btn-primary w-full py-3" type="submit">Enviar Respuestas</button>
          </form>
        </div>
      )}

      {/* AUTH MODAL */}
      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white space-y-6 rounded-2xl shadow-premium relative animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-gray-155">
              <h3 className="font-extrabold text-xl text-gray-800 font-sans">{authMode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}</h3>
              <button className="text-2xl font-light hover:text-gray-500 cursor-pointer" onClick={() => setShowAuthModal(false)}>×</button>
            </div>
            
            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="form-group">
                  <label className="form-label text-xs font-bold">Correo Electrónico</label>
                  <input type="email" className="form-control" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-bold">Contraseña</label>
                  <input type="password" className="form-control" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required />
                </div>
                <button className="btn btn-primary w-full py-3 mt-4" type="submit">Ingresar</button>
                <p className="text-center text-xs text-gray-400 mt-4">
                  ¿No tiene una cuenta? <span className="text-primary cursor-pointer font-bold" onClick={() => setAuthMode('register')}>Regístrese aquí</span>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="form-group">
                  <label className="form-label text-xs font-bold">Nombre Completo</label>
                  <input type="text" className="form-control" value={registerForm.name} onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-bold">Correo Electrónico</label>
                  <input type="email" className="form-control" value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-bold">Contraseña</label>
                  <input type="password" className="form-control" value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-bold">Tipo de Usuario</label>
                  <select className="form-control" value={registerForm.role} onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}>
                    <option value="docente">Docente / Profesor</option>
                    <option value="estudiante">Estudiante / Alumno</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label text-xs font-bold">Foto de Perfil (Opcional - URL o Archivo)</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input type="text" className="form-control flex-1 text-xs" value={registerForm.avatar_url || ''} onChange={(e) => setRegisterForm({ ...registerForm, avatar_url: e.target.value })} placeholder="URL de su foto..." />
                      <label className="btn btn-secondary text-xs shrink-0 cursor-pointer flex items-center justify-center gap-1">
                        <Upload className="w-4 h-4" /> Subir
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setRegisterForm({ ...registerForm, avatar_url: url }))} />
                      </label>
                    </div>
                    {registerForm.avatar_url ? (
                      <div className="relative group border rounded-full overflow-hidden shadow-2xs w-20 h-20 mx-auto bg-gray-50 flex items-center justify-center">
                        <img src={registerForm.avatar_url} alt="Foto de perfil" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button type="button" className="text-[10px] text-white hover:underline" onClick={() => setRegisterForm({ ...registerForm, avatar_url: '' })}>Eliminar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-250 hover:border-primary/50 transition-all rounded-xl p-3 bg-gray-50/50 flex flex-col items-center justify-center gap-1 group cursor-pointer relative">
                        <Upload className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                        <span className="text-2xs text-gray-500 font-medium">Subir foto desde PC</span>
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageUpload(e, (url) => setRegisterForm({ ...registerForm, avatar_url: url }))} />
                      </div>
                    )}
                  </div>
                </div>

                <button className="btn btn-primary w-full py-3 mt-4" type="submit">Crear Cuenta</button>
                <p className="text-center text-xs text-gray-400 mt-4">
                  ¿Ya tiene una cuenta? <span className="text-primary cursor-pointer font-bold" onClick={() => setAuthMode('login')}>Inicie sesión aquí</span>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-400 py-10 mt-auto border-t border-gray-900">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h4 className="font-extrabold text-white text-md">Colección Creciendo Juntos</h4>
            <p className="text-xs text-gray-500 mt-1">Plataforma Educativa Religiosa de Secundaria</p>
          </div>
          <p className="text-xs text-gray-500">derechos reservados por E. Alberto M.</p>
        </div>
      </footer>
    </div>
  );
}
