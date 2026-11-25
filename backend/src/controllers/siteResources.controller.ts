import { Response } from 'express';
import { query, getOne, run } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

let tablesReady = false;

async function ensureCmsAndResourceTables() {
  if (tablesReady) return;
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS site_config (
        id TEXT PRIMARY KEY,
        config_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await run(`
      CREATE TABLE IF NOT EXISTS pedagogical_resources (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_name TEXT,
        grade INTEGER DEFAULT 0,
        area TEXT DEFAULT 'Educación Religiosa',
        share_mode TEXT DEFAULT 'all_with_load',
        shared_user_ids TEXT DEFAULT '[]',
        is_active INTEGER DEFAULT 1,
        created_by TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    tablesReady = true;
  } catch (err) {
    console.error('ensureCmsAndResourceTables error:', err);
  }
}

export const getSiteConfig = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureCmsAndResourceTables();
    const row = await getOne(`SELECT config_json, updated_at FROM site_config WHERE id = 'landing_main'`);
    if (!row) {
      return res.status(200).json({ success: true, data: null });
    }
    return res.status(200).json({
      success: true,
      data: JSON.parse(row.config_json),
      updated_at: row.updated_at,
    });
  } catch (err) {
    console.error('getSiteConfig error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener la configuración del sitio.' },
    });
  }
};

export const updateSiteConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureCmsAndResourceTables();
    const config = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Configuración inválida.' },
      });
    }
    const now = new Date().toISOString();
    const jsonStr = JSON.stringify(config);

    const existing = await getOne(`SELECT id FROM site_config WHERE id = 'landing_main'`);
    if (existing) {
      await run(`UPDATE site_config SET config_json = ?, updated_at = ? WHERE id = 'landing_main'`, [jsonStr, now]);
    } else {
      await run(`INSERT INTO site_config (id, config_json, updated_at) VALUES ('landing_main', ?, ?)`, [jsonStr, now]);
    }

    if (req.user) {
      await logAudit(req.user.id, 'UPDATE_LANDING_CONFIG', 'site_config', 'landing_main', req.ip || null);
    }

    return res.status(200).json({ success: true, data: config, message: 'Página de inicio actualizada correctamente.' });
  } catch (err) {
    console.error('updateSiteConfig error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al guardar la configuración del sitio.' },
    });
  }
};

export const listAdminResources = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureCmsAndResourceTables();
    const rows = await query(`SELECT * FROM pedagogical_resources ORDER BY created_at DESC`);
    const parsed = (rows || []).map((r: any) => ({
      ...r,
      shared_user_ids: (() => {
        try {
          return JSON.parse(r.shared_user_ids || '[]');
        } catch {
          return [];
        }
      })(),
      is_active: Boolean(r.is_active),
    }));
    return res.status(200).json({ success: true, data: parsed });
  } catch (err) {
    console.error('listAdminResources error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar recursos pedagógicos.' },
    });
  }
};

export const createAdminResource = async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, category, file_type, file_url, file_name, grade, area, share_mode, shared_user_ids, is_active } = req.body;
  if (!title || !file_url || !file_type || !category) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Título, categoría, tipo y archivo/enlace son obligatorios.' },
    });
  }

  try {
    await ensureCmsAndResourceTables();
    const id = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const sharedJson = JSON.stringify(Array.isArray(shared_user_ids) ? shared_user_ids : []);
    const activeInt = is_active === false ? 0 : 1;

    await run(
      `INSERT INTO pedagogical_resources (id, title, description, category, file_type, file_url, file_name, grade, area, share_mode, shared_user_ids, is_active, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        description || '',
        category,
        file_type,
        file_url,
        file_name || null,
        Number(grade) || 0,
        area || 'Educación Religiosa',
        share_mode || 'all_with_load',
        sharedJson,
        activeInt,
        req.user?.id || null,
        now,
        now,
      ]
    );

    if (req.user) {
      await logAudit(req.user.id, 'CREATE_RESOURCE', 'pedagogical_resources', id, req.ip || null);
    }

    return res.status(201).json({
      success: true,
      data: {
        id,
        title,
        description: description || '',
        category,
        file_type,
        file_url,
        file_name: file_name || null,
        grade: Number(grade) || 0,
        area: area || 'Educación Religiosa',
        share_mode: share_mode || 'all_with_load',
        shared_user_ids: Array.isArray(shared_user_ids) ? shared_user_ids : [],
        is_active: Boolean(activeInt),
        created_at: now,
      },
    });
  } catch (err) {
    console.error('createAdminResource error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al crear recurso pedagógico.' },
    });
  }
};

export const updateAdminResource = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, category, file_type, file_url, file_name, grade, share_mode, shared_user_ids, is_active } = req.body;

  try {
    await ensureCmsAndResourceTables();
    const now = new Date().toISOString();
    const existing = await getOne(`SELECT * FROM pedagogical_resources WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recurso no encontrado.' },
      });
    }

    const nextShared = shared_user_ids !== undefined ? JSON.stringify(shared_user_ids) : existing.shared_user_ids;
    const nextActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    await run(
      `UPDATE pedagogical_resources
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           file_type = COALESCE(?, file_type),
           file_url = COALESCE(?, file_url),
           file_name = COALESCE(?, file_name),
           grade = COALESCE(?, grade),
           share_mode = COALESCE(?, share_mode),
           shared_user_ids = ?,
           is_active = ?,
           updated_at = ?
       WHERE id = ?`,
      [
        title ?? null,
        description ?? null,
        category ?? null,
        file_type ?? null,
        file_url ?? null,
        file_name ?? null,
        grade !== undefined ? Number(grade) : null,
        share_mode ?? null,
        nextShared,
        nextActive,
        now,
        id,
      ]
    );

    return res.status(200).json({ success: true, message: 'Recurso actualizado correctamente.' });
  } catch (err) {
    console.error('updateAdminResource error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al actualizar recurso.' },
    });
  }
};

export const deleteAdminResource = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await ensureCmsAndResourceTables();
    await run(`DELETE FROM pedagogical_resources WHERE id = ?`, [id]);
    return res.status(200).json({ success: true, message: 'Recurso eliminado.' });
  } catch (err) {
    console.error('deleteAdminResource error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al eliminar recurso.' },
    });
  }
};

export const listTeacherResources = async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureCmsAndResourceTables();
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // Determine if teacher has academic load in Educación Religiosa
    let hasAcademicLoad = ['admin', 'super_admin'].includes(userRole || '');
    let assignedSections: string[] = [];

    if (userId && !hasAcademicLoad) {
      const prof = await getOne(`SELECT specialty FROM teacher_profiles WHERE user_id = ?`, [userId]);
      if (prof?.specialty) {
        try {
          const parsed = JSON.parse(prof.specialty);
          if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
            assignedSections = parsed.sections;
            hasAcademicLoad = true;
          } else if (parsed.area) {
            hasAcademicLoad = true;
          }
        } catch {
          if (String(prof.specialty).trim().length > 0) hasAcademicLoad = true;
        }
      }
      // Also check if teacher has active classrooms
      if (!hasAcademicLoad) {
        const cls = await getOne(`SELECT id FROM classrooms WHERE teacher_id = ? AND status = 'active' LIMIT 1`, [userId]);
        if (cls) hasAcademicLoad = true;
      }
      // Demo seeded teacher fallback
      if (!hasAcademicLoad && req.user?.email === 'docente@creciendojuntos.com') {
        hasAcademicLoad = true;
      }
    }

    const rows = await query(`SELECT * FROM pedagogical_resources WHERE is_active = 1 ORDER BY created_at DESC`);
    const visible = (rows || [])
      .map((r: any) => {
        let sharedIds: string[] = [];
        try {
          sharedIds = JSON.parse(r.shared_user_ids || '[]');
        } catch {
          sharedIds = [];
        }
        return { ...r, shared_user_ids: sharedIds, is_active: Boolean(r.is_active) };
      })
      .filter((r: any) => {
        if (['admin', 'super_admin'].includes(userRole || '')) return true;
        if (r.share_mode === 'private') return false;
        if (r.share_mode === 'specific') {
          return userId ? r.shared_user_ids.includes(userId) : false;
        }
        // 'all_with_load': visible to teachers with academic load OR specifically shared
        return hasAcademicLoad || (userId ? r.shared_user_ids.includes(userId) : false);
      });

    return res.status(200).json({
      success: true,
      data: {
        hasAcademicLoad,
        assignedSections,
        resources: visible,
      },
    });
  } catch (err) {
    console.error('listTeacherResources error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener los recursos pedagógicos.' },
    });
  }
};
