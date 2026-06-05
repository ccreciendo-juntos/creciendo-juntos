import { run } from '../database/db';

export const logAudit = async (
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null = null,
  ipAddress: string | null = null
) => {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  try {
    await run(
      `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, action, entity, entityId, ipAddress, now]
    );
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
};
