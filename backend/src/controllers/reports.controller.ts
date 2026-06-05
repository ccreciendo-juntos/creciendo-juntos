import { Response } from 'express';
import { query, getOne } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';

export const getAdminMetrics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const totalSales = await getOne(`SELECT SUM(total) as sum FROM orders WHERE payment_status = 'paid'`);
    const pendingPayments = await getOne(`SELECT COUNT(*) as count FROM payments WHERE status = 'validating'`);
    const activeUsers = await getOne(`SELECT COUNT(*) as count FROM users WHERE status = 'active'`);
    const activeCourses = await getOne(`SELECT COUNT(*) as count FROM courses WHERE status = 'published'`);

    return res.status(200).json({
      success: true,
      data: {
        totalSales: totalSales?.sum || 0,
        pendingPayments: pendingPayments?.count || 0,
        activeUsers: activeUsers?.count || 0,
        activeCourses: activeCourses?.count || 0
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener métricas del dashboard.' }
    });
  }
};

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await query(
      `SELECT al.*, u.name as user_name, u.email as user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 100`
    );

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar los logs de auditoría.' }
    });
  }
};
