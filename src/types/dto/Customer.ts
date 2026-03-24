import { Customer, CustomerEntitlement, CustomerUsage, Pagination, Metadata } from '@/models';
import { TypedBackendFilter, TypedBackendSort } from '../formatters/QueryBuilder';
import { SubscriptionResponse } from './Subscription';

/** Integration entity mapping for external provider systems (e.g. stripe, razorpay) */
export interface IntegrationEntityMapping {
	/** Integration provider name (e.g. "stripe", "razorpay", "paypal") */
	provider: string;
	/** External entity ID from the provider */
	id: string;
}

export interface GetCustomerSubscriptionsResponse {
	items: SubscriptionResponse[];
	pagination: Pagination;
}

export interface GetCustomerEntitlementsResponse {
	customer_id: string;
	features: CustomerEntitlement[];
}

export interface GetCustomerEntitlementPayload {
	customer_id: string;
	feature_id?: string;
}

export interface BillingPeriodInfo {
	start_time: string;
	end_time: string;
	period: string;
}

export interface GetUsageSummaryResponse {
	customer_id: string;
	features: CustomerUsage[];
	pagination?: Pagination;
	period?: BillingPeriodInfo;
}

/**
 * Customer filter for list/search queries (matches backend CustomerFilter).
 * Supports filters, sort, pagination, and direct ID/email filters.
 */
export interface CustomerFilter extends Pagination {
	filters?: TypedBackendFilter[];
	sort?: TypedBackendSort[];
	expand?: string;
	/** Filter by customer IDs */
	customer_ids?: string[];
	/** Filter by external IDs */
	external_ids?: string[];
	/** Filter by single external ID */
	external_id?: string;
	/** Filter by email */
	email?: string;
	/** @deprecated Parent customer hierarchy is being removed. Do not use. */
	parent_customer_ids?: string[];
	/** Time range (if supported by backend) */
	start_time?: string;
	end_time?: string;
}

/** Payload for POST /customers/search (extends CustomerFilter with required filters/sort for backward compatibility) */
export interface GetCustomerByFiltersPayload extends CustomerFilter {
	filters?: TypedBackendFilter[];
	sort?: TypedBackendSort[];
}

export interface TaxRateOverride {
	id?: string;
	tax_rate_id: string;
	description?: string;
}

export interface CreateCustomerRequest {
	external_id: string;
	name?: string;
	email?: string;
	address_line1?: string;
	address_line2?: string;
	address_city?: string;
	address_state?: string;
	address_postal_code?: string;
	address_country?: string;
	metadata?: Metadata;
	tax_rate_overrides?: TaxRateOverride[];
	/** When true, prevents the customer onboarding workflow from being triggered (internal use) */
	skip_onboarding_workflow?: boolean;
	/** Provider integration mappings for this customer */
	integration_entity_mapping?: IntegrationEntityMapping[];
	/** @deprecated Parent customer hierarchy is replaced by invoicing_customer_id on subscriptions. Do not use. */
	parent_customer_id?: string;
	/** @deprecated Parent customer hierarchy is replaced by invoicing_customer_id on subscriptions. Do not use. */
	parent_customer_external_id?: string;
}

export interface UpdateCustomerRequest {
	external_id?: string;
	name?: string;
	email?: string;
	address_line1?: string;
	address_line2?: string;
	address_city?: string;
	address_state?: string;
	address_postal_code?: string;
	address_country?: string;
	metadata?: Metadata;
	/** Provider integration mappings for this customer */
	integration_entity_mapping?: IntegrationEntityMapping[];
	/** @deprecated Parent customer hierarchy is replaced by invoicing_customer_id on subscriptions. Do not use. */
	parent_customer_id?: string;
	/** @deprecated Parent customer hierarchy is replaced by invoicing_customer_id on subscriptions. Do not use. */
	parent_customer_external_id?: string;
}

/** Customer response with optional nested parent (matches backend CustomerResponse) */
export interface CustomerResponse extends Customer {
	parent_customer?: CustomerResponse;
}

/** List response for customers (matches backend ListCustomersResponse) */
export interface ListCustomersResponse {
	items: CustomerResponse[];
	pagination: Pagination;
}

/** Portal session response containing URL, token, and expiration */
export interface PortalSessionResponse {
	url: string;
	token: string;
	expires_at: string;
}
