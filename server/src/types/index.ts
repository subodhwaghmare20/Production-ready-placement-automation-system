export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

export interface HealthCheckData {
  status: string;
  uptime: number;
  database: string;
  timestamp: string;
}

