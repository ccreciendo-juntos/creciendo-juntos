import { Response } from 'express';
import { run, query, getOne } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../utils/audit';

export const listBooks = async (req: AuthenticatedRequest, res: Response) => {
  const { grade, search, status } = req.query;

  let sql = `SELECT * FROM books WHERE 1=1`;
  const params: any[] = [];

  if (grade) {
    sql += ` AND grade = ?`;
    params.push(parseInt(grade as string));
  }

  if (search) {
    sql += ` AND (title LIKE ? OR subtitle LIKE ? OR author LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // Admins can filter by status, public/default sees only 'published'
  if (req.user && ['admin', 'super_admin'].includes(req.user.role)) {
    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }
  } else {
    sql += ` AND status = 'published'`;
  }

  try {
    const books = await query(sql, params);
    return res.status(200).json({
      success: true,
      data: books
    });
  } catch (err) {
    console.error('List books error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al listar los libros.' }
    });
  }
};

export const getBookDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const book = await getOne(`SELECT * FROM books WHERE id = ?`, [id]);
    if (!book) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOK_NOT_FOUND', message: 'El libro solicitado no existe.' }
      });
    }

    return res.status(200).json({
      success: true,
      data: book
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al obtener detalles del libro.' }
    });
  }
};

export const createBook = async (req: AuthenticatedRequest, res: Response) => {
  const { title, subtitle, grade, description, author, isbn, digital_price, physical_price, stock, cover_url, status } = req.body;

  if (!title || !grade || digital_price === undefined || physical_price === undefined) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Título, grado, precio digital y físico son obligatorios.' }
    });
  }

  const bookId = `book_${Date.now()}`;
  const now = new Date().toISOString();

  try {
    await run(
      `INSERT INTO books (id, title, subtitle, grade, description, author, isbn, digital_price, physical_price, stock, cover_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        bookId,
        title,
        subtitle || null,
        parseInt(grade),
        description || null,
        author || 'Equipo Editorial Creciendo Juntos',
        isbn || null,
        parseFloat(digital_price),
        parseFloat(physical_price),
        stock ? parseInt(stock) : 0,
        cover_url || null,
        status || 'published',
        now,
        now
      ]
    );

    await logAudit(req.user?.id || null, 'CREATE_BOOK', 'books', bookId, req.ip || null);

    const newBook = await getOne(`SELECT * FROM books WHERE id = ?`, [bookId]);
    return res.status(201).json({
      success: true,
      message: 'Libro creado con éxito.',
      data: newBook
    });
  } catch (err) {
    console.error('Create book error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al registrar el libro.' }
    });
  }
};

export const updateBook = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, subtitle, grade, description, author, isbn, digital_price, physical_price, stock, cover_url, status } = req.body;

  try {
    const book = await getOne(`SELECT id FROM books WHERE id = ?`, [id]);
    if (!book) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOK_NOT_FOUND', message: 'El libro a actualizar no existe.' }
      });
    }

    const now = new Date().toISOString();
    await run(
      `UPDATE books
       SET title = COALESCE(?, title),
           subtitle = COALESCE(?, subtitle),
           grade = COALESCE(?, grade),
           description = COALESCE(?, description),
           author = COALESCE(?, author),
           isbn = COALESCE(?, isbn),
           digital_price = COALESCE(?, digital_price),
           physical_price = COALESCE(?, physical_price),
           stock = COALESCE(?, stock),
           cover_url = COALESCE(?, cover_url),
           status = COALESCE(?, status),
           updated_at = ?
       WHERE id = ?`,
      [
        title || null,
        subtitle || null,
        grade ? parseInt(grade) : null,
        description || null,
        author || null,
        isbn || null,
        digital_price !== undefined ? parseFloat(digital_price) : null,
        physical_price !== undefined ? parseFloat(physical_price) : null,
        stock !== undefined ? parseInt(stock) : null,
        cover_url || null,
        status || null,
        now,
        id
      ]
    );

    await logAudit(req.user?.id || null, 'UPDATE_BOOK', 'books', id, req.ip || null);

    const updatedBook = await getOne(`SELECT * FROM books WHERE id = ?`, [id]);
    return res.status(200).json({
      success: true,
      message: 'Libro actualizado con éxito.',
      data: updatedBook
    });
  } catch (err) {
    console.error('Update book error:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al actualizar el libro.' }
    });
  }
};

export const deleteBook = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const book = await getOne(`SELECT id FROM books WHERE id = ?`, [id]);
    if (!book) {
      return res.status(404).json({
        success: false,
        error: { code: 'BOOK_NOT_FOUND', message: 'El libro solicitado no existe.' }
      });
    }

    // Logical delete: set status to 'hidden' to preserve history/sales integrity
    await run(`UPDATE books SET status = 'hidden', updated_at = ? WHERE id = ?`, [new Date().toISOString(), id]);
    await logAudit(req.user?.id || null, 'DELETE_BOOK', 'books', id, req.ip || null);

    return res.status(200).json({
      success: true,
      message: 'Libro ocultado del catálogo con éxito.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Error al eliminar el libro.' }
    });
  }
};
