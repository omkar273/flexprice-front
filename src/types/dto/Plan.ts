import { CreditGrant, Pagination, Plan, Metadata, Entitlement, Price, Meter } from '@/models';
import { CreateCreditGrantRequest } from './CreditGrant';
import { CreatePriceRequest } from './Price';

// ============================================
// Plan Request Types
// ============================================

export interface CreatePlanEntitlementRequest {
	feature_id: string;
	feature_type: string;
	static_value?: string;
	usage_reset_period?: string;
	has_unlimited_usage?: boolean;
	over_usage_strategy?: string;
}

export type CreatePlanPriceRequest = CreatePriceRequest;

export interface CreatePlanRequest {
	name: string;
	lookup_key?: string;
	description?: string;
	display_order?: number;
	prices?: CreatePlanPriceRequest[];
	entitlements?: CreatePlanEntitlementRequest[];
	credit_grants?: CreateCreditGrantRequest[];
	metadata?: Metadata;
}

export interface UpdatePlanPriceRequest {
	id?: string;
	price?: CreatePriceRequest;
}

export interface UpdatePlanEntitlementRequest {
	id?: string;
	entitlement?: CreatePlanEntitlementRequest;
}

export interface UpdatePlanCreditGrantRequest {
	id?: string;
	credit_grant?: CreateCreditGrantRequest;
}

export interface UpdatePlanRequest {
	name?: string;
	lookup_key?: string;
	description?: string;
	display_order?: number;
	prices?: UpdatePlanPriceRequest[];
	entitlements?: UpdatePlanEntitlementRequest[];
	credit_grants?: UpdatePlanCreditGrantRequest[];
	metadata?: Metadata;
}

export interface ClonePlanRequest {
	name: string;
	lookup_key: string;
	description?: string;
	display_order?: number;
	metadata?: Metadata;
}

// ============================================
// Plan Response Types
// ============================================

export interface PlanResponse extends Omit<Plan, 'prices' | 'entitlements' | 'credit_grants'> {
	prices?: Price[];
	entitlements?: Entitlement[];
	credit_grants?: CreditGrant[];
	meters?: Meter[];
}

export type CreatePlanResponse = Plan;

export interface ListPlansResponse {
	items: PlanResponse[];
	pagination: Pagination;
}

export interface SynchronizationSummary {
	subscriptions_processed: number;
	prices_processed: number;
	line_items_created: number;
	line_items_terminated: number;
	line_items_skipped: number;
	line_items_failed: number;
	skipped_already_terminated: number;
	skipped_overridden: number;
	skipped_incompatible: number;
	total_prices: number;
	active_prices: number;
	expired_prices: number;
}

export interface SynchronizePlanPricesWithSubscriptionResponse {
	message: string;
	plan_id: string;
	plan_name: string;
	synchronization_summary: SynchronizationSummary;
}

export interface GetPlanCreditGrantsResponse extends Pagination {
	items: CreditGrant[];
}
