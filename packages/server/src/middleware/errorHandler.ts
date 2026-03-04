import { Request, Response, NextFunction } from 'express'
import type { ApiResponse } from '../types.js'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('Server Error:', err)

  const response: ApiResponse = {
    success: false,
    data: null,
    error: err.message || 'Internal Server Error',
  }

  res.status(500).json(response)
}
