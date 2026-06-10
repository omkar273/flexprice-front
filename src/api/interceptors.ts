import type { AxiosInstance } from 'axios';
import AuthService from '@/core/auth/AuthService';
import EnvironmentApi from '@/api/EnvironmentApi';

export function attachAuthInterceptor(instance: AxiosInstance): void {
	instance.interceptors.request.use(
		async (reqConfig) => {
			const token = await AuthService.getAcessToken();
			const activeEnvId = EnvironmentApi.getActiveEnvironmentId();
			if (activeEnvId) {
				reqConfig.headers['X-Environment-ID'] = activeEnvId;
			}
			if (token) {
				reqConfig.headers.Authorization = `Bearer ${token}`;
			}
			return reqConfig;
		},
		(error) => Promise.reject(error),
	);
}

export function attachUnauthorizedHandler(instance: AxiosInstance): void {
	instance.interceptors.response.use(
		(response) => response,
		async (error) => {
			if (error.response?.status === 401) {
				await AuthService.logout();
			}
			return Promise.reject(error);
		},
	);
}
