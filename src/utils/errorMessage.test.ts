import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '@/utils/errorMessage';

describe('getErrorMessage', () => {
	it('returns Error.message', () => {
		expect(getErrorMessage(new Error('boom'))).toBe('boom');
	});

	it('returns string throws', () => {
		expect(getErrorMessage('plain')).toBe('plain');
	});

	it('reads axios-like response.data.message', () => {
		expect(
			getErrorMessage({
				response: { data: { message: 'Plan limit reached' } },
			}),
		).toBe('Plan limit reached');
	});

	it('falls back to generic copy when shape is unknown', () => {
		expect(getErrorMessage({ foo: 1 })).toBe('Something went wrong');
	});
});
