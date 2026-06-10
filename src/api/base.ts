import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { config } from '@/config/config';

export function createHttpClient(): AxiosInstance {
	return axios.create({
		baseURL: config.api.baseUrl,
		timeout: 600000,
		headers: {
			'Content-Type': 'application/json',
		},
	});
}
