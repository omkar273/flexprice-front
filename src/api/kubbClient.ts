import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

import { createHttpClient } from './base';
import { attachAuthInterceptor, attachUnauthorizedHandler } from './interceptors';

// Types must match @kubb/plugin-client/clients/axios exactly so that
// generated client files and generated hook files are structurally compatible.
type HeaderValue = string | number | boolean | null | undefined | object;
type HeadersInit = Array<[string, HeaderValue]> | Record<string, HeaderValue>;

export type RequestConfig<TData = unknown> = {
	baseURL?: string;
	url?: string;
	method?: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE' | 'OPTIONS' | 'HEAD';
	params?: unknown;
	data?: TData | FormData;
	responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
	signal?: AbortSignal;
	validateStatus?: (status: number) => boolean;
	headers?: HeadersInit;
	paramsSerializer?: AxiosRequestConfig['paramsSerializer'];
	contentType?: string;
};

export type ResponseConfig<TData = unknown> = {
	data: TData;
	status: number;
	statusText: string;
	headers: AxiosResponse['headers'];
};

export type ResponseErrorConfig<TError = unknown> = AxiosError<TError>;

export type Client = <TResponseData, _TError = unknown, TRequestData = unknown>(
	config: RequestConfig<TRequestData>,
	request?: unknown,
) => Promise<ResponseConfig<TResponseData>>;

export const kubbAxios = createHttpClient();
attachAuthInterceptor(kubbAxios);
attachUnauthorizedHandler(kubbAxios);

const kubbClient: Client = async (config) => {
	const response = await kubbAxios.request({
		baseURL: config.baseURL,
		url: config.url,
		method: config.method,
		params: config.params,
		data: config.data as unknown,
		responseType: config.responseType,
		signal: config.signal,
		validateStatus: config.validateStatus,
		headers: {
			...(config.contentType ? { 'Content-Type': config.contentType } : {}),
			...(config.headers as Record<string, string>),
		},
		paramsSerializer: config.paramsSerializer,
	});
	return response;
};

export default kubbClient;
export { kubbClient as client };
