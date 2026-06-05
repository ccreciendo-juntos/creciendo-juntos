import { Response } from 'express';
import { run, query, getOne } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const createOrder = async (req: AuthenticatedRequest, res: Response) => {
  const { items, notes } = req.body; // items: Array<{ id: string, type: 'book_digital' | 'book_physical' | 'course', quantity: number }>

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'El carrito de compras está vacío.' }
    });
  }

  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Debe iniciar sesión para realizar un pedido.' }
    });
  }

  const orderId = `ord_${Date.now()}`;
  const orderCode = `CJ-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString();

  let subtotal = 0;

  try {
    const itemsToInsert: any[] = [];

    for (const item of items) {
      if (item.type === 'book_digital' || item.type === 'book_physical') {
        const book = await getOne(`SELECT * FROM books WHERE id = ?`, [item.id]);
        if (!book) {
          return res.status(404).json({
            success: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: `El libro con ID ${item.id} no existe.` }
          });
        }
        const price = item.type === 'book_digital' ? book.digital_price : book.physical_price;
        const qty = item.type === 'book_digital' ? 1 : parseInt(item.quantity || 1); // Digital quantity is always 1

        subtotal += price * qty;
        itemsToInsert.push({
          id: `oi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          book_id: book.id,
          course_id: null,
          quantity: qty,
          price: price,
          type: item.type === 'book_digital' ? 'digital_book' : 'physical_book'
        });
      } else if (item.type === 'course') {
        const course = await getOne(`SELECT * FROM courses WHERE id = ?`, [item.id]);
        if (!course) {
          return res.status(404).json({
            success: false,
            error: { code: 'PRODUCT_NOT_FOUND', message: `El curso con ID ${item.id} no existe.` }
          });
        }
        subtotal += course.price;
        itemsToInsert.push({
          id: `oi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          book_id: null,
          course_id: course.id,
          quantity: 1,
          price: course.price,
          type: 'course'
        });
      }
    }

    const total = subtotal; // Optional discount logic can be added here

    // Insert Order
    await run(
      `INSERT INTO orders (id, order_code, user_id, subtotal, discount, total, payment_status, delivery_status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, 'pending', ?, ?, ?, ?)`,
      [
        orderId,
        orderCode,
        userId,
        subtotal,
        total,
        // Delivery status 'pending' if it contains a physical book, else 'not_apply'
        itemsToInsert.some(i => i.type === 'physical_book') ? 'pending' : 'not_apply',
        notes || null,
        now,
        now
      ]
    );

    // Insert Items
    for (const oi of itemsToInsert) {
      await run(
        `INSERT INTO order_items (id, order_id, book_id, course_id, quantity, price, type, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [oi.id, orderId, oi.book_id, oi.course_id, oi.quantity, oi.price, oi.type, now, now]
      );
    }

    await logAudit(userId, 'CREATE_ORDER', 'orders', orderId, req.ip || null);

    return res.status(201).json({
      success: true,
      message: 'Pedido creado con éxito.',
      data: {
        orderId,
        orderCode,
        total,
        payment_status: 'pending'
      }
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error interno al registrar el pedido.' }
    });
  }
};

export const registerManualPayment = async (req: AuthenticatedRequest, res: Response) => {
  const { orderId, method, voucherUrl } = req.body;

  if (!orderId || !method || !voucherUrl) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Pedido, método de pago y comprobante son requeridos.' }
    });
  }

  try {
    const order = await getOne(`SELECT total, payment_status FROM orders WHERE id = ?`, [orderId]);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'El pedido especificado no existe.' }
      });
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({
        success: false,
        error: { code: 'ORDER_ALREADY_PAID', message: 'Este pedido ya se encuentra pagado.' }
      });
    }

    const paymentId = `pay_${Date.now()}`;
    const now = new Date().toISOString();

    // Register Payment in 'validating' state
    await run(
      `INSERT INTO payments (id, order_id, method, amount, status, voucher_url, transaction_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'validating', ?, null, ?, ?)`,
      [paymentId, orderId, method, order.total, voucherUrl, now, now]
    );

    // Update Order payment status to 'validating'
    await run(`UPDATE orders SET payment_status = 'validating', updated_at = ? WHERE id = ?`, [now, orderId]);

    await logAudit(req.user?.id || null, 'REGISTER_PAYMENT_MANUAL', 'payments', paymentId, req.ip || null);

    return res.status(200).json({
      success: true,
      message: 'Comprobante registrado con éxito. Su pago está en proceso de validación.',
      data: { paymentId, status: 'validating' }
    });
  } catch (err) {
    console.error('Payment registration error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al registrar el pago.' }
    });
  }
};

export const checkoutCard = async (req: AuthenticatedRequest, res: Response) => {
  const { orderId, cardNumber, cardExpiry, cardCvc } = req.body;

  if (!orderId || !cardNumber) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Pedido y datos de tarjeta obligatorios.' }
    });
  }

  try {
    const order = await getOne(`SELECT total, payment_status, user_id FROM orders WHERE id = ?`, [orderId]);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'El pedido no existe.' }
      });
    }

    const paymentId = `pay_${Date.now()}`;
    const transactionId = `tx_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const now = new Date().toISOString();

    // In a sandbox environment, card payments are automatically approved
    await run(
      `INSERT INTO payments (id, order_id, method, amount, status, voucher_url, transaction_id, created_at, updated_at)
       VALUES (?, ?, 'card', ?, 'approved', null, ?, ?, ?)`,
      [paymentId, orderId, order.total, transactionId, now, now]
    );

    // Update Order to paid
    await run(`UPDATE orders SET payment_status = 'paid', updated_at = ? WHERE id = ?`, [now, orderId]);

    // Unlock digital courses if applicable
    const items = await query(`SELECT * FROM order_items WHERE order_id = ?`, [orderId]);
    for (const item of items) {
      if (item.type === 'course') {
        const enrollId = `enr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        await run(
          `INSERT OR IGNORE INTO enrollments (id, user_id, course_id, status, progress, score, created_at, updated_at)
           VALUES (?, ?, ?, 'active', 0, 0, ?, ?)`,
          [enrollId, order.user_id, item.course_id, now, now]
        );
      }
    }

    await logAudit(order.user_id, 'CHECKOUT_CARD_SUCCESS', 'payments', paymentId, req.ip || null);

    return res.status(200).json({
      success: true,
      message: 'Pago con tarjeta procesado y aprobado con éxito.',
      data: { paymentId, transactionId, status: 'approved' }
    });
  } catch (err) {
    console.error('Card checkout error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error procesando el pago con tarjeta.' }
    });
  }
};

export const approvePayment = async (req: AuthenticatedRequest, res: Response) => {
  const { paymentId } = req.body;

  try {
    const payment = await getOne(`SELECT * FROM payments WHERE id = ?`, [paymentId]);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Pago no encontrado.' }
      });
    }

    const now = new Date().toISOString();
    const adminId = req.user?.id;

    // Approve Payment
    await run(
      `UPDATE payments
       SET status = 'approved', reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`,
      [adminId, now, now, paymentId]
    );

    // Approve Order
    await run(`UPDATE orders SET payment_status = 'paid', updated_at = ? WHERE id = ?`, [now, payment.order_id]);

    // Unlock digital courses if any
    const order = await getOne(`SELECT user_id FROM orders WHERE id = ?`, [payment.order_id]);
    const items = await query(`SELECT * FROM order_items WHERE order_id = ?`, [payment.order_id]);

    for (const item of items) {
      if (item.type === 'course') {
        const enrollId = `enr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
        await run(
          `INSERT OR IGNORE INTO enrollments (id, user_id, course_id, status, progress, score, created_at, updated_at)
           VALUES (?, ?, ?, 'active', 0, 0, ?, ?)`,
          [enrollId, order.user_id, item.course_id, now, now]
        );
      }
    }

    await logAudit(adminId || null, 'APPROVE_PAYMENT', 'payments', paymentId, req.ip || null);

    return res.status(200).json({
      success: true,
      message: 'Pago aprobado con éxito. Recursos habilitados.'
    });
  } catch (err) {
    console.error('Approve payment error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error aprobando el pago.' }
    });
  }
};

export const rejectPayment = async (req: AuthenticatedRequest, res: Response) => {
  const { paymentId, reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Debe especificar el motivo del rechazo.' }
    });
  }

  try {
    const payment = await getOne(`SELECT * FROM payments WHERE id = ?`, [paymentId]);
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Pago no encontrado.' }
      });
    }

    const now = new Date().toISOString();
    const adminId = req.user?.id;

    // Reject Payment
    await run(
      `UPDATE payments
       SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, rejection_reason = ?, updated_at = ?
       WHERE id = ?`,
      [adminId, now, reason, now, paymentId]
    );

    // Update Order back to rejected
    await run(`UPDATE orders SET payment_status = 'rejected', updated_at = ? WHERE id = ?`, [now, payment.order_id]);

    await logAudit(adminId || null, 'REJECT_PAYMENT', 'payments', paymentId, req.ip || null);

    return res.status(200).json({
      success: true,
      message: 'Pago rechazado con éxito.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al rechazar el pago.' }
    });
  }
};

export const myOrders = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  try {
    const orders = await query(
      `SELECT o.*, (SELECT count(*) FROM order_items WHERE order_id = o.id) as item_count
       FROM orders o
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: orders
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar sus pedidos.' }
    });
  }
};

export const listAllOrders = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );

    return res.status(200).json({
      success: true,
      data: orders
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar los pedidos globales.' }
    });
  }
};

export const getOrderDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const order = await getOne(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Pedido no encontrado.' }
      });
    }

    const items = await query(
      `SELECT oi.*, b.title as book_title, c.title as course_title
       FROM order_items oi
       LEFT JOIN books b ON oi.book_id = b.id
       LEFT JOIN courses c ON oi.course_id = c.id
       WHERE oi.order_id = ?`,
      [id]
    );

    const payments = await query(
      `SELECT p.*, u.name as reviewer_name
       FROM payments p
       LEFT JOIN users u ON p.reviewed_by = u.id
       WHERE p.order_id = ?`,
      [id]
    );

    return res.status(200).json({
      success: true,
      data: {
        ...order,
        items,
        payments
      }
    });
  } catch (err) {
    console.error('Get order details error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener detalles del pedido.' }
    });
  }
};
