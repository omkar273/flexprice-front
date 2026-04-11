/**
 * Normalize API/network rejections into a string for toasts.
 * Axios and some clients reject with non-Error shapes; `instanceof Error` alone loses the real message.
 */
export function getErrorMessage(err: unknown): string {
	if (err instanceof Error && err.message.trim()) {
		return err.message;
	}
	if (typeof err === 'string' && err.trim()) {
		return err;
	}
	if (err && typeof err === 'object') {
		const o = err as Record<string, unknown>;
		if (typeof o.message === 'string' && o.message.trim()) {
			return o.message;
		}
		const response = o.response;
		if (response && typeof response === 'object') {
			const data = (response as { data?: unknown }).data;
			if (typeof data === 'string' && data.trim()) {
				return data;
			}
			if (data && typeof data === 'object') {
				const d = data as Record<string, unknown>;
				if (typeof d.message === 'string' && d.message.trim()) {
					return d.message;
				}
				if (typeof d.error === 'string' && d.error.trim()) {
					return d.error;
				}
			}
		}
	}
	return 'Something went wrong';
}
