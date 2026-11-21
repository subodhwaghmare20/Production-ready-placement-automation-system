import { apiClient } from './api';
import { HealthStatus } from '../types';

export const checkApiHealth = async (): Promise<HealthStatus> => {
  const response = await apiClient.get<HealthStatus>('/health');
  return response.data;
};

