import { AxiosClient } from '@/core/axios/verbs';
import { Pagination } from '@/models';
import {
	CreatePlanRequest,
	ClonePlanRequest,
	UpdatePlanRequest,
	PlanResponse,
	CreatePlanResponse,
	SynchronizePlanPricesWithSubscriptionResponse,
} from '@/types/dto';
import { TypedBackendFilter, TypedBackendSort } from '@/types/formatters/QueryBuilder';
import { QueryFilter, TimeRangeFilter } from '@/types/dto/base';

export interface GetAllPlansResponse {
	items: PlanResponse[];
	pagination: Pagination;
}

export interface GetPlansByFilterPayload extends Omit<QueryFilter, 'sort'>, TimeRangeFilter, Pagination {
	filters?: TypedBackendFilter[];
	sort?: TypedBackendSort[];
	lookup_key?: string;
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
		const { limit = 10, offset = 0, filters = [], sort = [] } = payload;

		const requestPayload = {
			...payload,
			limit,
			offset,
			filters,
			sort,
		};

		return await AxiosClient.post<GetAllPlansResponse>(`${this.baseUrl}/search`, requestPayload);
	}

	public static async getPlanById(id: string) {
		return await AxiosClient.get<PlanResponse>(`${this.baseUrl}/${id}`);
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
}
