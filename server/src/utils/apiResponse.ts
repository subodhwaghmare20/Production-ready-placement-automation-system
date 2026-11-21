import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T
): Response => {
  const payload: ApiResponse<T> = {
    success,
    message,
    ...(data !== undefined && { data }),
  };
  return res.status(statusCode).json(payload);
};

