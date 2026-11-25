import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, getOne, run } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const listSchools = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const schools = await query(`SELECT * FROM schools ORDER BY name ASC`);
    return res.status(200).json({ success: true, data: schools || [] });
  } catch (err) {
    console.error('listSchools error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar instituciones educativas.' }
    });
  }
};

export const createSchool = async (req: AuthenticatedRequest, res: Response) => {
  const { name, ruc, address, contact_email } = req.body;
  if (!name) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El nombre de la institución es obligatorio.' }
    });
  }

  try {
    const id = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    await run(
      `INSERT INTO schools (id, name, ruc, address, contact_email, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [id, name, ruc || null, address || null, contact_email || null, now, now]
    );
    if (req.user) {
      await logAudit(req.user.id, 'CREATE_SCHOOL', 'schools', id, req.ip || null);
    }
    return res.status(201).json({
      success: true,
      data: { id, name, ruc: ruc || null, address: address || null, contact_email: contact_email || null, status: 'active' }
    });
  } catch (err) {
    console.error('createSchool error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al crear la institución educativa.' }
    });
  }
};

export const listAdminUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schoolId = req.query?.schoolId as string | undefined;
    let sql = `
      SELECT u.id, u.name, u.email, u.phone, u.document_number as dni, u.status, u.created_at,
             ur.role_id as role,
             tp.school_id, tp.specialty,
             s.name as school_name
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN teacher_profiles tp ON u.id = tp.user_id
      LEFT JOIN schools s ON tp.school_id = s.id
      WHERE ur.role_id IN ('docente', 'admin_institucional', 'auxiliar', 'subdirector')
    `;
    const params: any[] = [];
    if (schoolId && schoolId !== 'all') {
      sql += ` AND tp.school_id = ?`;
      params.push(schoolId);
    }
    sql += ` ORDER BY u.created_at DESC`;

    const rows = await query(sql, params);
    return res.status(200).json({ success: true, data: rows || [] });
  } catch (err) {
    console.error('listAdminUsers error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar usuarios docentes.' }
    });
  }
};

export const createAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, dni, phone, role, school_id, specialty } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Nombre, correo y contraseña son obligatorios.' }
    });
  }

  try {
    const existing = await getOne(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'Ya existe un usuario con ese correo electrónico.' }
      });
    }

    const userRole = ['docente', 'admin_institucional', 'auxiliar', 'subdirector'].includes(role) ? role : 'docente';
    // Ensure role exists in roles table
    const roleExists = await getOne(`SELECT id FROM roles WHERE id = ?`, [userRole]);
    if (!roleExists) {
      await run(`INSERT INTO roles (id, name, description) VALUES (?, ?, ?)`, [userRole, userRole, 'Rol institucional']);
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hashed = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    await run(
      `INSERT INTO users (id, name, email, password, phone, document_type, document_number, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'DNI', ?, 'active', ?, ?)`,
      [userId, name, email, hashed, phone || null, dni || null, now, now]
    );

    await run(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, userRole]);

    const profileId = `tprof_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await run(
      `INSERT INTO teacher_profiles (id, user_id, school_id, specialty, phone, document_number, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [profileId, userId, school_id || null, specialty || null, phone || null, dni || null, now, now]
    );

    if (req.user) {
      await logAudit(req.user.id, 'CREATE_TEACHER_USER', 'users', userId, req.ip || null);
    }

    return res.status(201).json({
      success: true,
      data: {
        id: userId,
        name,
        email,
        dni: dni || null,
        role: userRole,
        school_id: school_id || null,
        specialty: specialty || null,
        status: 'active'
      }
    });
  } catch (err) {
    console.error('createAdminUser error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al crear el usuario docente.' }
    });
  }
};

export const updateAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, password, dni, phone, role, school_id, specialty } = req.body;

  try {
    const now = new Date().toISOString();
    await run(
      `UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), document_number = COALESCE(?, document_number), phone = COALESCE(?, phone), updated_at = ? WHERE id = ?`,
      [name || null, email || null, dni || null, phone || null, now, id]
    );

    if (password && password.trim().length > 0) {
      const hashed = bcrypt.hashSync(password, 10);
      await run(`UPDATE users SET password = ?, updated_at = ? WHERE id = ?`, [hashed, now, id]);
    }

    if (role) {
      const roleExists = await getOne(`SELECT id FROM roles WHERE id = ?`, [role]);
      if (!roleExists) {
        await run(`INSERT INTO roles (id, name, description) VALUES (?, ?, ?)`, [role, role, 'Rol institucional']);
      }
      await run(`DELETE FROM user_roles WHERE user_id = ?`, [id]);
      await run(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [id, role]);
    }

    const existingProf = await getOne(`SELECT id FROM teacher_profiles WHERE user_id = ?`, [id]);
    if (existingProf) {
      await run(
        `UPDATE teacher_profiles SET school_id = ?, specialty = ?, document_number = COALESCE(?, document_number), updated_at = ? WHERE user_id = ?`,
        [school_id || null, specialty || null, dni || null, now, id]
      );
    } else {
      const profileId = `tprof_${Date.now()}`;
      await run(
        `INSERT INTO teacher_profiles (id, user_id, school_id, specialty, document_number, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [profileId, id, school_id || null, specialty || null, dni || null, now, now]
      );
    }

    return res.status(200).json({ success: true, message: 'Usuario actualizado correctamente.' });
  } catch (err) {
    console.error('updateAdminUser error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al actualizar el usuario.' }
    });
  }
};

export const deleteAdminUser = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await run(`DELETE FROM users WHERE id = ?`, [id]);
    return res.status(200).json({ success: true, message: 'Usuario eliminado.' });
  } catch (err) {
    console.error('deleteAdminUser error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al eliminar usuario.' }
    });
  }
};
