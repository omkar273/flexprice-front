import { AxiosClient } from '@/core/axios/verbs';
import { EXPAND, Pagination } from '@/models';
import { generateExpandQueryParams, generateQueryParams } from '@/utils/common/api_helper';
import {
	CreatePlanRequest,
	ClonePlanRequest,
	UpdatePlanRequest,
	PlanResponse,
	CreatePlanResponse,
	GetPlanCreditGrantsResponse,
	SynchronizePlanPricesWithSubscriptionResponse,
} from '@/types/dto';
import { TypedBackendFilter, TypedBackendSort } from '@/types/formatters/QueryBuilder';
import { QueryFilter, TimeRangeFilter } from '@/types/dto/base';

export interface GetAllPlansResponse {
	items: PlanResponse[];
	pagination: Pagination;
}

export interface GetPlansByFilterPayload extends QueryFilter, TimeRangeFilter, Pagination {
	filters?: TypedBackendFilter[];
	sort?: TypedBackendSort[];
}

export class PlanApi {
	private static baseUrl = '/plans';

	public static async createPlan(data: CreatePlanRequest) {
		return await AxiosClient.post<CreatePlanResponse, CreatePlanRequest>(this.baseUrl, data);
	}

	/**
	 * Get plans using typed filters - this is the consolidated method for all plan queries
	 * Replaces: getAllPlans, getAllActivePlans, listPlans, searchPlans, getExpandedPlan, getActiveExpandedPlan
	 */
	public static async getPlansByFilter(payload: GetPlansByFilterPayload = {}) {
		const { limit = 10, offset = 0, filters = [], sort = [], expand = 'entitlements,prices,meters,features,credit_grants' } = payload;

		const requestPayload = {
			limit,
			offset,
			filters,
			sort,
			expand,
		};

		return await AxiosClient.post<GetAllPlansResponse>(`${this.baseUrl}/search`, requestPayload);
	}

	public static async getPlanById(id: string) {
		const payload = {
			expand: generateExpandQueryParams([EXPAND.METERS, EXPAND.ENTITLEMENTS, EXPAND.PRICES, EXPAND.FEATURES, EXPAND.CREDIT_GRANT]),
		};
		const url = generateQueryParams(`${this.baseUrl}/${id}`, payload);
		return await AxiosClient.get<PlanResponse>(url);
	}

	public static async updatePlan(id: string, data: UpdatePlanRequest) {
		return await AxiosClient.put<PlanResponse, UpdatePlanRequest>(`${this.baseUrl}/${id}`, data);
	}

	public static async deletePlan(id: string) {
		return await AxiosClient.delete<void>(`${this.baseUrl}/${id}`);
	}

	public static async clonePlan(id: string, data: ClonePlanRequest) {
		return await AxiosClient.post<PlanResponse, ClonePlanRequest>(`${this.baseUrl}/${id}/clone`, data);
	}

	public static async synchronizePlanPricesWithSubscription(id: string) {
		return await AxiosClient.post<SynchronizePlanPricesWithSubscriptionResponse>(`${this.baseUrl}/${id}/sync/subscriptions`);
	}

	public static async getPlanCreditGrants(id: string) {
		return await AxiosClient.get<GetPlanCreditGrantsResponse>(`${this.baseUrl}/${id}/creditgrants`);
	}

	/**
	 * @deprecated Use getPlansByFilter instead
	 * Kept for backward compatibility - will be removed in future
	 */
	public static async listPlans({ limit, offset }: Pagination) {
		return this.getPlansByFilter({
			limit,
			offset,
			filters: [],
			sort: [],
			expand: 'prices,entitlements,credit_grants',
		});
	}

	public static async getPlanEntitlements(planId: string) {
		return await AxiosClient.get<{ items: any[]; total: number; page: number; limit: number }>(`${this.baseUrl}/${planId}/entitlements`);
	}
}
