/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    errorCode?: string;
    statusCode?: number;
    timestamp: string;
  };
}

export class SuccessResponse<T> {
  success: boolean = true;
  data: T;
  message?: string;

  constructor(data: T, message?: string) {
    this.data = data;
    this.message = message;
  }
}

export class ErrorResponse {
  success: boolean = false;
  error: {
    message: string;
    errorCode?: string;
    statusCode?: number;
    timestamp: string;
  };

  constructor(message: string, errorCode?: string, statusCode?: number) {
    this.error = {
      message,
      errorCode,
      statusCode,
      timestamp: new Date().toISOString(),
    };
  }
}
