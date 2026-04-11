import { PricingSchema } from './types';

// ============================================
// Template definition interface
// ============================================

export interface TemplateDefinition {
	label: string;
	subtitle: string;
	/** Fallback text icon (used if iconSrc not provided). */
	icon: string;
	/** Optional logo to render inside template picker. */
	iconSrc?: string;
	/** Simple natural-language text shown (read-only) in the textarea when selected. */
	displayPrompt: string;
	/** Exact schema — skips the LLM entirely. */
	schema: PricingSchema;
}

// ============================================
// Railway — Infra / credit-pool (1 credit = $0.01)
// ============================================
const railwaySchema: PricingSchema = {
	features: [
		{
			name: 'Memory',
			key: 'memory_gb_hours',
			type: 'metered',
			unit_singular: 'GB-hour',
			unit_plural: 'GB-hours',
			meter_event_name: 'railway.memory.usage',
			aggregation: 'sum',
			aggregation_field: 'gb_hours',
		},
		{
			name: 'CPU',
			key: 'cpu_vcpu_hours',
			type: 'metered',
			unit_singular: 'vCPU-hour',
			unit_plural: 'vCPU-hours',
			meter_event_name: 'railway.cpu.usage',
			aggregation: 'sum',
			aggregation_field: 'vcpu_hours',
		},
		{
			name: 'Egress',
			key: 'egress_gb',
			type: 'metered',
			unit_singular: 'GB',
			unit_plural: 'GB',
			meter_event_name: 'railway.egress.usage',
			aggregation: 'sum',
			aggregation_field: 'gb',
		},
		{
			name: 'Storage',
			key: 'storage_gb_months',
			type: 'metered',
			unit_singular: 'GB-month',
			unit_plural: 'GB-months',
			meter_event_name: 'railway.storage.usage',
			aggregation: 'sum',
			aggregation_field: 'gb_months',
		},
	],
	plans: [
		{
			name: 'Free',
			description: 'Free plan with one-time 500 credits ($5 equivalent).',
			prices: [{ amount: 0, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [],
			usage_charges: [
				{
					feature_key: 'memory_gb_hours',
					amount_per_unit: 0.04,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Memory (credits per GB-hour)',
				},
				{
					feature_key: 'cpu_vcpu_hours',
					amount_per_unit: 0.078,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'CPU (credits per vCPU-hour)',
				},
				{
					feature_key: 'egress_gb',
					amount_per_unit: 5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Egress (credits per GB)',
				},
				{
					feature_key: 'storage_gb_months',
					amount_per_unit: 1.5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Storage (credits per GB-month)',
				},
			],
		},
		{
			name: 'Hobby',
			description: 'Hobby plan at $5/month with 500 monthly credits and pay-per-use overage.',
			prices: [{ amount: 5, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [],
			usage_charges: [
				{
					feature_key: 'memory_gb_hours',
					amount_per_unit: 0.04,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Memory (credits per GB-hour)',
				},
				{
					feature_key: 'cpu_vcpu_hours',
					amount_per_unit: 0.078,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'CPU (credits per vCPU-hour)',
				},
				{
					feature_key: 'egress_gb',
					amount_per_unit: 5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Egress (credits per GB)',
				},
				{
					feature_key: 'storage_gb_months',
					amount_per_unit: 1.5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Storage (credits per GB-month)',
				},
			],
		},
		{
			name: 'Pro',
			description: 'Pro plan at $20/month with 2,000 monthly credits and pay-per-use overage.',
			prices: [{ amount: 20, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [],
			usage_charges: [
				{
					feature_key: 'memory_gb_hours',
					amount_per_unit: 0.04,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Memory (credits per GB-hour)',
				},
				{
					feature_key: 'cpu_vcpu_hours',
					amount_per_unit: 0.078,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'CPU (credits per vCPU-hour)',
				},
				{
					feature_key: 'egress_gb',
					amount_per_unit: 5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Egress (credits per GB)',
				},
				{
					feature_key: 'storage_gb_months',
					amount_per_unit: 1.5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Storage (credits per GB-month)',
				},
			],
		},
	],
	credit_grants: [
		{ plan_name: 'Free', name: 'Free Trial Credits', credits: 500, cadence: 'onetime', period: null, conversion_rate: 0.01 },
		{ plan_name: 'Hobby', name: 'Monthly Included Credits', credits: 500, cadence: 'recurring', period: 'monthly', conversion_rate: 0.01 },
		{ plan_name: 'Pro', name: 'Monthly Included Credits', credits: 2000, cadence: 'recurring', period: 'monthly', conversion_rate: 0.01 },
	],
};

// ============================================
// Cursor — Agentic AI / hybrid (flat fee + usage overages)
// ============================================
const cursorSchema: PricingSchema = {
	features: [
		{
			name: 'Agent Requests',
			key: 'agent_requests',
			type: 'metered',
			unit_singular: 'request',
			unit_plural: 'requests',
			meter_event_name: 'cursor.agent.request',
			aggregation: 'count',
			aggregation_field: null,
		},
		{
			name: 'Tab Completions',
			key: 'tab_completions',
			type: 'metered',
			unit_singular: 'completion',
			unit_plural: 'completions',
			meter_event_name: 'cursor.tab.completion',
			aggregation: 'count',
			aggregation_field: null,
		},
	],
	plans: [
		{
			name: 'Free',
			description: 'For hobby usage with limited monthly requests and tab completions.',
			prices: [{ amount: 0, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [
				{ feature_key: 'agent_requests', is_unlimited: false, value: 50 },
				{ feature_key: 'tab_completions', is_unlimited: false, value: 200 },
			],
			usage_charges: [
				{
					feature_key: 'agent_requests',
					amount_per_unit: 0.08,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Agent request overage (Free)',
				},
				{
					feature_key: 'tab_completions',
					amount_per_unit: 0.01,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Tab completion overage (Free)',
				},
			],
		},
		{
			name: 'Pro',
			description: 'Extended usage with frontier model access.',
			prices: [{ amount: 20, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [{ feature_key: 'agent_requests', is_unlimited: false, value: 500 }],
			usage_charges: [
				{
					feature_key: 'agent_requests',
					amount_per_unit: 0.04,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Agent request overage (Pro)',
				},
			],
		},
		{
			name: 'Pro+',
			description: 'High-volume plan with 3x included agent requests.',
			prices: [{ amount: 60, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [{ feature_key: 'agent_requests', is_unlimited: false, value: 1500 }],
			usage_charges: [
				{
					feature_key: 'agent_requests',
					amount_per_unit: 0.03,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Agent request overage (Pro+)',
				},
			],
		},
		{
			name: 'Ultra',
			description: 'Top tier with 20x included usage and best experience.',
			prices: [{ amount: 200, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [{ feature_key: 'agent_requests', is_unlimited: false, value: 10000 }],
			usage_charges: [
				{
					feature_key: 'agent_requests',
					amount_per_unit: 0.02,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Agent request overage (Ultra)',
				},
			],
		},
	],
	credit_grants: [],
};

// ============================================
// Gemini — Model Provider / per-model package token billing
// One feature per model × direction — no filter_values needed.
// ============================================
const geminiSchema: PricingSchema = {
	features: [
		{
			name: 'Gemini 3.1 Pro Input Tokens',
			key: 'gemini_3_1_pro_input_tokens',
			type: 'metered',
			unit_singular: 'token',
			unit_plural: 'tokens',
			meter_event_name: 'gemini.3_1_pro.input_tokens',
			aggregation: 'sum',
			aggregation_field: 'tokens',
		},
		{
			name: 'Gemini 3.1 Pro Output Tokens',
			key: 'gemini_3_1_pro_output_tokens',
			type: 'metered',
			unit_singular: 'token',
			unit_plural: 'tokens',
			meter_event_name: 'gemini.3_1_pro.output_tokens',
			aggregation: 'sum',
			aggregation_field: 'tokens',
		},
		{
			name: 'Gemini 2.5 Pro Input Tokens',
			key: 'gemini_2_5_pro_input_tokens',
			type: 'metered',
			unit_singular: 'token',
			unit_plural: 'tokens',
			meter_event_name: 'gemini.2_5_pro.input_tokens',
			aggregation: 'sum',
			aggregation_field: 'tokens',
		},
		{
			name: 'Gemini 2.5 Pro Output Tokens',
			key: 'gemini_2_5_pro_output_tokens',
			type: 'metered',
			unit_singular: 'token',
			unit_plural: 'tokens',
			meter_event_name: 'gemini.2_5_pro.output_tokens',
			aggregation: 'sum',
			aggregation_field: 'tokens',
		},
		{
			name: 'Gemini 2.5 Flash Input Tokens',
			key: 'gemini_2_5_flash_input_tokens',
			type: 'metered',
			unit_singular: 'token',
			unit_plural: 'tokens',
			meter_event_name: 'gemini.2_5_flash.input_tokens',
			aggregation: 'sum',
			aggregation_field: 'tokens',
		},
		{
			name: 'Gemini 2.5 Flash Output Tokens',
			key: 'gemini_2_5_flash_output_tokens',
			type: 'metered',
			unit_singular: 'token',
			unit_plural: 'tokens',
			meter_event_name: 'gemini.2_5_flash.output_tokens',
			aggregation: 'sum',
			aggregation_field: 'tokens',
		},
		{
			name: 'Gemini 2.5 Flash-Lite Input Tokens',
			key: 'gemini_2_5_flash_lite_input_tokens',
			type: 'metered',
			unit_singular: 'token',
			unit_plural: 'tokens',
			meter_event_name: 'gemini.2_5_flash_lite.input_tokens',
			aggregation: 'sum',
			aggregation_field: 'tokens',
		},
		{
			name: 'Gemini 2.5 Flash-Lite Output Tokens',
			key: 'gemini_2_5_flash_lite_output_tokens',
			type: 'metered',
			unit_singular: 'token',
			unit_plural: 'tokens',
			meter_event_name: 'gemini.2_5_flash_lite.output_tokens',
			aggregation: 'sum',
			aggregation_field: 'tokens',
		},
	],
	plans: [
		{
			name: 'Gemini Free',
			description: 'Free access limited to Gemini 2.5 Flash and Gemini 2.5 Flash-Lite.',
			prices: [{ amount: 0, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [],
			usage_charges: [
				{
					feature_key: 'gemini_2_5_flash_input_tokens',
					amount_per_unit: 0,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Flash Input (Free)',
				},
				{
					feature_key: 'gemini_2_5_flash_output_tokens',
					amount_per_unit: 0,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Flash Output (Free)',
				},
				{
					feature_key: 'gemini_2_5_flash_lite_input_tokens',
					amount_per_unit: 0,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Flash-Lite Input (Free)',
				},
				{
					feature_key: 'gemini_2_5_flash_lite_output_tokens',
					amount_per_unit: 0,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Flash-Lite Output (Free)',
				},
			],
		},
		{
			name: 'Gemini PAYG',
			description: 'Pay-as-you-go access to all Gemini models. Billed per 1M tokens.',
			prices: [{ amount: 0, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [],
			usage_charges: [
				{
					feature_key: 'gemini_3_1_pro_input_tokens',
					amount_per_unit: 2.0,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 3.1 Pro Input',
				},
				{
					feature_key: 'gemini_3_1_pro_output_tokens',
					amount_per_unit: 12.0,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 3.1 Pro Output',
				},
				{
					feature_key: 'gemini_2_5_pro_input_tokens',
					amount_per_unit: 1.25,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Pro Input',
				},
				{
					feature_key: 'gemini_2_5_pro_output_tokens',
					amount_per_unit: 10.0,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Pro Output',
				},
				{
					feature_key: 'gemini_2_5_flash_input_tokens',
					amount_per_unit: 0.3,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Flash Input',
				},
				{
					feature_key: 'gemini_2_5_flash_output_tokens',
					amount_per_unit: 2.5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Flash Output',
				},
				{
					feature_key: 'gemini_2_5_flash_lite_input_tokens',
					amount_per_unit: 0.1,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Flash-Lite Input',
				},
				{
					feature_key: 'gemini_2_5_flash_lite_output_tokens',
					amount_per_unit: 0.4,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'package',
					package_size: 1000000,
					filter_values: null,
					display_name: 'Gemini 2.5 Flash-Lite Output',
				},
			],
		},
	],
	credit_grants: [],
};

// ============================================
// Apollo — Credits + Sales / credit-pool model
// ============================================
const apolloSchema: PricingSchema = {
	features: [
		{
			name: 'Contact search',
			key: 'contact_search',
			type: 'metered',
			unit_singular: 'search',
			unit_plural: 'searches',
			meter_event_name: 'apollo.contact_search',
			aggregation: 'count',
			aggregation_field: null,
		},
		{
			name: 'Email unlock',
			key: 'email_unlock',
			type: 'metered',
			unit_singular: 'unlock',
			unit_plural: 'unlocks',
			meter_event_name: 'apollo.email_unlock',
			aggregation: 'count',
			aggregation_field: null,
		},
		{
			name: 'Phone reveal',
			key: 'phone_reveal',
			type: 'metered',
			unit_singular: 'reveal',
			unit_plural: 'reveals',
			meter_event_name: 'apollo.phone_reveal',
			aggregation: 'count',
			aggregation_field: null,
		},
		{
			name: 'Contact export',
			key: 'contact_export',
			type: 'metered',
			unit_singular: 'export',
			unit_plural: 'exports',
			meter_event_name: 'apollo.contact_export',
			aggregation: 'count',
			aggregation_field: null,
		},
	],
	plans: [
		{
			name: 'Starter',
			description: 'Starter — $49/month with 1,200 monthly credits; actions debit credits per usage.',
			prices: [{ amount: 49, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [],
			usage_charges: [
				{
					feature_key: 'contact_search',
					amount_per_unit: 1,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Contact search (credits)',
				},
				{
					feature_key: 'email_unlock',
					amount_per_unit: 1,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Email unlock (credits)',
				},
				{
					feature_key: 'phone_reveal',
					amount_per_unit: 10,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Phone reveal (credits)',
				},
				{
					feature_key: 'contact_export',
					amount_per_unit: 5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Contact export (credits)',
				},
			],
		},
		{
			name: 'Professional',
			description: 'Professional — $99/month with 3,000 monthly credits.',
			prices: [{ amount: 99, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [],
			usage_charges: [
				{
					feature_key: 'contact_search',
					amount_per_unit: 1,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Contact search (credits)',
				},
				{
					feature_key: 'email_unlock',
					amount_per_unit: 1,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Email unlock (credits)',
				},
				{
					feature_key: 'phone_reveal',
					amount_per_unit: 10,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Phone reveal (credits)',
				},
				{
					feature_key: 'contact_export',
					amount_per_unit: 5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Contact export (credits)',
				},
			],
		},
		{
			name: 'Organization',
			description: 'Organization — $149/month with 6,000 monthly credits.',
			prices: [{ amount: 149, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [],
			usage_charges: [
				{
					feature_key: 'contact_search',
					amount_per_unit: 1,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Contact search (credits)',
				},
				{
					feature_key: 'email_unlock',
					amount_per_unit: 1,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Email unlock (credits)',
				},
				{
					feature_key: 'phone_reveal',
					amount_per_unit: 10,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Phone reveal (credits)',
				},
				{
					feature_key: 'contact_export',
					amount_per_unit: 5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Contact export (credits)',
				},
			],
		},
	],
	credit_grants: [
		{
			plan_name: 'Starter',
			name: 'Monthly included credits',
			credits: 1200,
			cadence: 'recurring',
			period: 'monthly',
			conversion_rate: 0.04083333333333333,
		},
		{
			plan_name: 'Professional',
			name: 'Monthly included credits',
			credits: 3000,
			cadence: 'recurring',
			period: 'monthly',
			conversion_rate: 0.033,
		},
		{
			plan_name: 'Organization',
			name: 'Monthly included credits',
			credits: 6000,
			cadence: 'recurring',
			period: 'monthly',
			conversion_rate: 0.024833333333333332,
		},
	],
};

// ============================================
// Vapi — Voice AI / credit-pool PAYG
// 1 credit = $0.01 | hosting: 5 credits/min, 0.5 credits/msg
// ============================================
const vapiSchema: PricingSchema = {
	features: [
		{
			name: 'Vapi Hosting — Call Minutes',
			key: 'vapi_hosting_call_minutes',
			type: 'metered',
			unit_singular: 'minute',
			unit_plural: 'minutes',
			meter_event_name: 'vapi.hosting.calls',
			aggregation: 'sum',
			aggregation_field: 'minutes',
		},
		{
			name: 'Vapi Hosting — SMS / Chat',
			key: 'vapi_hosting_sms_messages',
			type: 'metered',
			unit_singular: 'message',
			unit_plural: 'messages',
			meter_event_name: 'vapi.hosting.sms',
			aggregation: 'count',
			aggregation_field: null,
		},
		{
			name: 'Model — STT',
			key: 'vapi_stt',
			type: 'metered',
			unit_singular: 'unit',
			unit_plural: 'units',
			meter_event_name: 'vapi.model.stt',
			aggregation: 'sum',
			aggregation_field: 'units',
		},
		{
			name: 'Model — LLM',
			key: 'vapi_llm',
			type: 'metered',
			unit_singular: 'unit',
			unit_plural: 'units',
			meter_event_name: 'vapi.model.llm',
			aggregation: 'sum',
			aggregation_field: 'tokens',
		},
		{
			name: 'Model — TTS',
			key: 'vapi_tts',
			type: 'metered',
			unit_singular: 'unit',
			unit_plural: 'units',
			meter_event_name: 'vapi.model.tts',
			aggregation: 'sum',
			aggregation_field: 'units',
		},
		{
			name: 'Call Minutes (platform / custom)',
			key: 'vapi_call_minutes',
			type: 'metered',
			unit_singular: 'minute',
			unit_plural: 'minutes',
			meter_event_name: 'vapi.call.minutes',
			aggregation: 'sum',
			aggregation_field: 'minutes',
		},
		{
			name: 'Call Concurrency Lines',
			key: 'call_concurrency_lines',
			type: 'static',
			unit_singular: 'line',
			unit_plural: 'lines',
			meter_event_name: null,
			aggregation: null,
			aggregation_field: null,
		},
		{
			name: 'Custom SIP',
			key: 'custom_sip_enabled',
			type: 'static',
			unit_singular: 'flag',
			unit_plural: 'flags',
			meter_event_name: null,
			aggregation: null,
			aggregation_field: null,
		},
		{
			name: 'Custom Channels',
			key: 'custom_channels_enabled',
			type: 'static',
			unit_singular: 'flag',
			unit_plural: 'flags',
			meter_event_name: null,
			aggregation: null,
			aggregation_field: null,
		},
	],
	plans: [
		{
			name: 'Vapi Pay As You Go',
			description:
				'Usage-based: $10 starter credits; hosting per minute/message; provider STT/LLM/TTS at cost in credits; 10 concurrency lines included.',
			prices: [{ amount: 0, currency: 'USD', billing_period: 'monthly' }],
			entitlements: [
				{ feature_key: 'call_concurrency_lines', is_unlimited: false, value: 10 },
				{ feature_key: 'custom_sip_enabled', is_unlimited: false, value: 0 },
				{ feature_key: 'custom_channels_enabled', is_unlimited: false, value: 0 },
			],
			usage_charges: [
				{
					feature_key: 'vapi_hosting_call_minutes',
					amount_per_unit: 5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Hosting calls (credits per minute)',
				},
				{
					feature_key: 'vapi_hosting_sms_messages',
					amount_per_unit: 0.5,
					currency: 'USD',
					billing_period: 'monthly',
					billing_model: 'flat_fee',
					package_size: null,
					filter_values: null,
					display_name: 'Hosting SMS/chat (credits per message)',
				},
			],
		},
	],
	credit_grants: [
		{ plan_name: 'Vapi Pay As You Go', name: 'Starter credits', credits: 1000, cadence: 'onetime', period: null, conversion_rate: 0.01 },
	],
};

// ============================================
// Exported template list
// ============================================

export const PRICING_TEMPLATES: TemplateDefinition[] = [
	{
		label: 'Railway',
		subtitle: 'Infra',
		icon: '◉',
		iconSrc: '/assets/railwaylogo.png',
		displayPrompt: `Please build me Railway's pricing. This is a credit-based system where 1 credit = $0.01.

Resource costs (in credits):
- Memory: 0.040 credits per GB-hour
- CPU: 0.078 credits per vCPU-hour
- Egress: 5 credits per GB
- Storage: 1.5 credits per GB-month

Plans:
- Free: $0/month, 500 credits one-time grant ($5 equivalent)
- Hobby: $5/month, includes 500 credits per month
- Pro: $20/month, includes 2,000 credits per month`,
		schema: railwaySchema,
	},
	{
		label: 'Cursor',
		subtitle: 'Agentic AI',
		icon: '⌘',
		iconSrc: '/assets/cursor-logo.png',
		displayPrompt: `Please build me Cursor's pricing.

- Free plan: 50 agent requests/month, 200 tab completions/month. Overage at $0.08/request and $0.01/completion.
- Pro at $20/month: 500 agent requests/month, unlimited tab completions. Overage at $0.04/request.
- Pro+ at $60/month: 1,500 agent requests/month (3x Pro), unlimited tab completions. Overage at $0.03/request.
- Ultra at $200/month: 10,000 agent requests/month (20x Pro), unlimited tab completions. Overage at $0.02/request.`,
		schema: cursorSchema,
	},
	{
		label: 'Gemini',
		subtitle: 'Model Provider',
		icon: '✦',
		iconSrc: '/assets/gemini-logo.png',
		displayPrompt: `Please build me Google Gemini's API pricing.

There is a free tier with free input and output tokens on Gemini 2.5 Flash-Lite and Gemini 2.5 Flash.

- Gemini 3.1 Pro at $2.00 per 1M input tokens and $12.00 per 1M output tokens.
- Gemini 2.5 Pro at $1.25 per 1M input tokens and $10.00 per 1M output tokens.
- Gemini 2.5 Flash at $0.30 per 1M input tokens and $2.50 per 1M output tokens.
- Gemini 2.5 Flash-Lite at $0.10 per 1M input tokens and $0.40 per 1M output tokens.`,
		schema: geminiSchema,
	},
	{
		label: 'Apollo',
		subtitle: 'Credits + Sales',
		icon: '◎',
		iconSrc: '/assets/apollo-logo.png',
		displayPrompt: `Please build me Apollo.io-style credit-based pricing.

- Starter at $49/month with 1,200 credits per month.
- Professional at $99/month with 3,000 credits per month.
- Organization at $149/month with 6,000 credits per month.

Credits are consumed per action:
- Contact search: 1 credit
- Email unlock: 1 credit
- Phone reveal: 10 credits
- Contact export: 5 credits`,
		schema: apolloSchema,
	},
	{
		label: 'Vapi',
		subtitle: 'Voice AI',
		icon: '◈',
		iconSrc: '/assets/vapilogo.png',
		displayPrompt: `Please build me Vapi's pricing.

Single plan: Vapi Pay As You Go ($0/month platform fee).

- $10 in starter credits (one-time) — 1 credit = $0.01
- Hosting: 5 credits per call minute ($0.05), 0.5 credits per SMS/chat message ($0.005)
- Provider STT, LLM, TTS metered at cost in credits
- 10 concurrency lines included; Custom SIP and Custom Channels off by default`,
		schema: vapiSchema,
	},
];
