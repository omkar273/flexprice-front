import { useEffect } from 'react';
import toast from 'react-hot-toast';

interface ErrorStateProps {
	error: any;
	onError?: (error: any) => void;
}

const ErrorState = ({ error, onError }: ErrorStateProps) => {
	useEffect(() => {
		const err = error as { error?: { message?: string }; message?: string } | undefined;
		const message = err?.error?.message ?? err?.message ?? 'Error fetching data';
		toast.error(message);

		if (onError) {
			onError(error);
		}
	}, [error, onError]);

	return (
		<div className='flex justify-center items-center min-h-[200px]'>
			<div>Error fetching data</div>
		</div>
	);
};

export default ErrorState;
