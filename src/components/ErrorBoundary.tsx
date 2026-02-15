import React, { type ReactNode } from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';

interface ErrorBoundaryProps {
	children?: ReactNode;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error) {
		console.error('Error caught:', error);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div
					className="flex items-center justify-center min-h-screen"
					style={{ background: 'var(--color-background)' }}
				>
					<div className="text-center">
						<h1 className="text-4xl font-bold text-white/90 mb-4">Something went wrong</h1>
						<p className="text-white/40 mb-6">{this.state.error?.message}</p>
						<button
							onClick={() => window.location.reload()}
							className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
							style={{
								background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.12))',
								border: '1px solid rgba(139,92,246,0.22)',
								color: '#c4b5fd',
								boxShadow: '0 0 16px rgba(139,92,246,0.15)',
							}}
						>
							Reload Page
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export function ErrorBoundaryRoute() {
	const error = useRouteError();

	return (
		<div
			className="flex items-center justify-center min-h-screen"
			style={{ background: 'var(--color-background)' }}
		>
			<div className="text-center">
				<h1 className="text-4xl font-bold text-white/90 mb-4">Page not found</h1>
				{isRouteErrorResponse(error) && (
					<p className="text-white/40 mb-6">{error.statusText || error.status}</p>
				)}
				<a
					href="/"
					className="px-5 py-2.5 rounded-xl text-sm font-semibold inline-block"
					style={{
						background: 'rgba(255,255,255,0.04)',
						border: '1px solid rgba(255,255,255,0.07)',
						color: 'rgba(255,255,255,0.45)',
						textDecoration: 'none',
					}}
				>
					Go Home
				</a>
			</div>
		</div>
	);
}

export default ErrorBoundary;
