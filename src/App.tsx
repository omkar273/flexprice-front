import { RouterProvider } from 'react-router';
import { MainRouter } from '@/core/routes/Routes';
import { UserProvider } from '@/hooks/UserContext';
import { Toaster } from 'react-hot-toast';
import { DocsProvider } from './context/DocsContext';
import ReactQueryProvider from './core/services/tanstack/ReactQueryProvider';
import useVersionCheck from '@/hooks/useVersionCheck';
import { PaddleProvider } from '@/core/paddle';

const App = () => {
	useVersionCheck();

	return (
		<ReactQueryProvider>
			<UserProvider>
				<PaddleProvider>
					<DocsProvider>
						<RouterProvider router={MainRouter} />
					</DocsProvider>

					{/* Toast Notifications */}
					<Toaster
						toastOptions={{
							success: {
								iconTheme: {
									primary: '#5CA7A0',
									secondary: '#fff',
								},
								style: {
									whiteSpace: 'nowrap',
									minWidth: 'fit-content',
									width: 'auto',
									maxWidth: 'none',
								},
								className: 'whitespace-nowrap',
							},
							error: {
								iconTheme: {
									primary: '#E76E50',
									secondary: '#fff',
								},
								style: {
									whiteSpace: 'nowrap',
									minWidth: 'fit-content',
									width: 'auto',
									maxWidth: 'none',
								},
								className: 'whitespace-nowrap',
							},
						}}
						position='bottom-center'
						containerStyle={{
							bottom: '80px',
						}}
					/>
					<div id='modal-root'></div>
				</PaddleProvider>
			</UserProvider>
		</ReactQueryProvider>
	);
};

export default App;
