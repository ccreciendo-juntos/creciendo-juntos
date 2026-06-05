import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { run, getOne } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

const JWT_SECRET = process.env.JWT_SECRET || 'creciendo_juntos_super_secret_key_2026';

export const register = async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, phone, document_type, document_number, role } = req.body;

  if (!name || !email || !password) {
    return res.status(420).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Nombre, correo y contraseña son campos obligatorios.' }
    });
  }

  try {
    // Check if user already exists
    const existingUser = await getOne(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'El correo electrónico ya está registrado.' }
      });
    }

    // Determine target role (default to 'docente' if not specified or invalid)
    const targetRole = ['docente', 'estudiante'].includes(role) ? role : 'docente';
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const hashedPassword = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    // Create User
    await run(
      `INSERT INTO users (id, name, email, password, phone, document_type, document_number, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [userId, name, email, hashedPassword, phone || null, document_type || null, document_number || null, now, now]
    );

    // Assign Role
    await run(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, targetRole]);

    // If role is docente, create an empty teacher profile
    if (targetRole === 'docente') {
      const profileId = `tprof_${Date.now()}`;
      await run(
        `INSERT INTO teacher_profiles (id, user_id, specialty, phone, document_number, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [profileId, userId, null, phone || null, document_number || null, now, now]
      );
    }

    await logAudit(userId, 'REGISTER', 'users', userId, req.ip || null);

    return res.status(201).json({
      success: true,
      message: 'Usuario registrado con éxito.',
      data: {
        id: userId,
        name,
        email,
        role: targetRole
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }
    });
  }
};

export const login = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Correo y contraseña son requeridos.' }
    });
  }

  try {
    const user = await getOne(
      `SELECT u.*, ur.role_id as role FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.email = ?`,
      [email]
    );

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas o cuenta inactiva.' }
      });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Credenciales inválidas.' }
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logAudit(user.id, 'LOGIN', 'users', user.id, req.ip || null);

    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          document_type: user.document_type,
          document_number: user.document_number
        }
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }
    });
  }
};

export const me = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No autenticado.' }
    });
  }

  try {
    const user = await getOne(
      `SELECT u.id, u.name, u.email, u.phone, u.document_type, u.document_number, u.status, ur.role_id as role
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }
    });
  }
};

export const forgotPassword = async (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Debe ingresar su correo electrónico.' }
    });
  }

  try {
    const user = await getOne(`SELECT id FROM users WHERE email = ?`, [email]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Correo no registrado.' }
      });
    }

    // Mock sending recovery email
    return res.status(200).json({
      success: true,
      message: 'Se ha enviado un enlace de recuperación a su correo electrónico.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' }
    });
  }
};
