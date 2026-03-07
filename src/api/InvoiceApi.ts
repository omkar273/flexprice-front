import { AxiosClient } from '@/core/axios/verbs';
import { Invoice } from '@/models';
import { generateQueryParams } from '@/utils/common/api_helper';
import AuthService from '@/core/auth/AuthService';
import EnvironmentApi from '@/api/EnvironmentApi';
import {
	GetInvoicesResponse,
	GetAllInvoicesPayload,
	UpdateInvoiceStatusPayload,
	GetInvoicePreviewPayload,
	CreateInvoicePayload,
	GetInvoicesByFiltersPayload,
	VoidInvoicePayload,
	RecalculateInvoiceResponse,
} from '@/types/dto';

class InvoiceApi {
	private static baseurl = '/invoices';

	public static async getCustomerInvoices(customerId: string): Promise<GetInvoicesResponse> {
		const url = generateQueryParams(this.baseurl, { customer_id: customerId });
		return await AxiosClient.get<GetInvoicesResponse>(url);
	}

	public static async getInvoiceById(invoiceId: string): Promise<Invoice> {
		return await AxiosClient.get<Invoice>(`${this.baseurl}/${invoiceId}`);
	}

	public static async updateInvoicePaymentStatus(invoiceId: string, status: string): Promise<Invoice> {
		return await AxiosClient.put<Invoice>(`${this.baseurl}/${invoiceId}/payment`, {
			payment_status: status,
		});
	}

	public static async getAllInvoices(query: GetAllInvoicesPayload = {}): Promise<GetInvoicesResponse> {
		const url = generateQueryParams(this.baseurl, query);
		return await AxiosClient.get<GetInvoicesResponse>(url);
	}

	public static async getInvoicesByFilters(payload: GetInvoicesByFiltersPayload): Promise<GetInvoicesResponse> {
		return await AxiosClient.post<GetInvoicesResponse>(`${this.baseurl}/search`, payload);
	}

	public static async updateInvoiceStatus(payload: UpdateInvoiceStatusPayload): Promise<Invoice> {
		return await AxiosClient.put<Invoice>(`${this.baseurl}/${payload.invoiceId}/status`, payload);
	}

	public static async voidInvoice(invoiceId: string, payload?: VoidInvoicePayload) {
		return await AxiosClient.post(`${this.baseurl}/${invoiceId}/void`, payload);
	}

	public static async finalizeInvoice(invoiceId: string) {
		return await AxiosClient.post(`${this.baseurl}/${invoiceId}/finalize`);
	}

	public static async attemptPayment(invoiceId: string) {
		return await AxiosClient.post(`${this.baseurl}/${invoiceId}/payment/attempt`);
	}

	public static async getInvoicePreview(payload: GetInvoicePreviewPayload) {
		const url = generateQueryParams(`${this.baseurl}/preview`, payload);
		return await AxiosClient.get(url);
	}

	public static async createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
		return await AxiosClient.post<Invoice>(`${this.baseurl}`, payload);
	}

	public static async updateInvoice(invoiceId: string, payload: Partial<Invoice>): Promise<Invoice> {
		return await AxiosClient.put<Invoice>(`${this.baseurl}/${invoiceId}`, payload);
	}

	public static async recalculateInvoice(invoiceId: string): Promise<RecalculateInvoiceResponse> {
		return await AxiosClient.post<RecalculateInvoiceResponse>(`${this.baseurl}/${invoiceId}/recalculate`);
	}

	public static async getInvoicePdf(invoiceId: string, invoiceNo?: string) {
		const downloadFileName = invoiceNo ? `invoice-${invoiceNo}.pdf` : `invoice-${invoiceId}.pdf`;

		const response = await fetch(`${import.meta.env.VITE_API_URL}${this.baseurl}/${invoiceId}/pdf`, {
			headers: {
				Authorization: `Bearer ${await AuthService.getAcessToken()}`,
				'X-Environment-ID': EnvironmentApi.getActiveEnvironmentId() || '',
				Accept: 'application/pdf',
			},
		});

		if (!response.ok) {
			throw new Error('Failed to fetch PDF');
		}

		const arrayBuffer = await response.arrayBuffer();
		const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
		const url = window.URL.createObjectURL(blob);

		// Create a temporary link element
		const link = document.createElement('a');
		link.href = url;
		link.download = downloadFileName;

		// Append to body, click and remove
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		// Clean up the URL object
		window.URL.revokeObjectURL(url);
	}

	public static async downloadInvoicePdf(invoiceId: string) {
		const params = { url: true };
		const url = generateQueryParams(`${this.baseurl}/${invoiceId}/pdf`, params);
		const response = await AxiosClient.get<{ presigned_url: string }>(url);
		const presignedUrl = response.presigned_url;

		window.open(presignedUrl, '_blank');
	}

	public static async triggerCommunication(invoiceId: string) {
		return await AxiosClient.post(`${this.baseurl}/${invoiceId}/comms/trigger`);
	}
}

export default InvoiceApi;
