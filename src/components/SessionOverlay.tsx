import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, Flag, Home, Loader2, TriangleAlert } from 'lucide-react';

export type SessionLoadStatus = 'loading' | 'ready' | 'error';

interface SessionOverlayProps {
	status: SessionLoadStatus;
	slow: boolean;
	label: string;
	onRetry: () => void;
	onReport: () => void;
	onHome: () => void;
}

const glass = {
	background: 'var(--color-surface)',
	border: '1px solid var(--color-border)'
};

const buttonStyle = {
	background: 'var(--color-surface)',
	border: '1px solid var(--color-border)',
	color: 'rgba(255,255,255,0.85)'
};

const primaryButtonStyle = {
	background: 'var(--color-primary)',
	border: '1px solid var(--color-primary)',
	color: '#ffffff'
};

export const SessionOverlay = ({
	status,
	slow,
	label,
	onRetry,
	onReport,
	onHome
}: SessionOverlayProps) => {
	if (status !== 'loading' && status !== 'error') return null;

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.25 }}
			className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 px-6 text-center"
			style={{
				borderRadius: 12,
				background: 'rgba(0,0,0,0.9)'
			}}
		>
			<AnimatePresence mode="wait">
				{status === 'loading' ? (
					<motion.div
						key="loading"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2 }}
						className="flex flex-col items-center gap-4"
					>
						<motion.div
							animate={{ rotate: 360 }}
							transition={{
								repeat: Infinity,
								duration: 1.1,
								ease: 'linear'
							}}
							className="flex h-12 w-12 items-center justify-center rounded-full"
							style={{
								border: '2px solid var(--color-border)'
							}}
						>
							<Loader2 className="h-6 w-6 text-violet-300/90" />
						</motion.div>

						<div className="space-y-1">
							<p className="text-sm font-medium text-white/80">
								Loading{label ? ` ${label}` : '…'}
							</p>
							<AnimatePresence>
								{slow && (
									<motion.p
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										exit={{ opacity: 0, height: 0 }}
										className="text-xs text-white/40"
									>
										Taking longer than usual, the site may
										be slow or blocking the proxy.
									</motion.p>
								)}
							</AnimatePresence>
						</div>

						<AnimatePresence>
							{slow && (
								<motion.div
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									className="flex items-center gap-2"
								>
									<motion.button
										whileHover={{ scale: 1.03 }}
										whileTap={{ scale: 0.97 }}
										onClick={onRetry}
										className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium"
										style={{ ...glass, ...buttonStyle }}
									>
										<RotateCw className="h-3.5 w-3.5" />
										Reload
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.03 }}
										whileTap={{ scale: 0.97 }}
										onClick={onHome}
										className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium"
										style={{ ...glass, ...buttonStyle }}
									>
										<Home className="h-3.5 w-3.5" />
										Home
									</motion.button>
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				) : (
					<motion.div
						key="error"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -8 }}
						transition={{ duration: 0.2 }}
						className="flex flex-col items-center gap-4"
					>
						<div
							className="flex h-12 w-12 items-center justify-center rounded-full"
							style={{
								background: 'rgba(248,113,113,0.08)',
								border: '1px solid rgba(248,113,113,0.2)'
							}}
						>
							<TriangleAlert className="h-6 w-6 text-red-400/80" />
						</div>

						<div className="space-y-1">
							<p className="text-sm font-semibold text-white/85">
								This page didn't load
							</p>
							<p className="max-w-xs text-xs text-white/40">
								{label ? `${label} ` : 'The site '}
								took too long or refused the connection. Try
								reloading, or switch proxy backends in Settings.
							</p>
						</div>

						<div className="flex items-center gap-2">
							<motion.button
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.97 }}
								onClick={onRetry}
								className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
								style={{ ...glass, ...primaryButtonStyle }}
							>
								<RotateCw className="h-3.5 w-3.5" />
								Reload
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.97 }}
								onClick={onHome}
								className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium"
								style={{ ...glass, ...buttonStyle }}
							>
								<Home className="h-3.5 w-3.5" />
								Home
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.03 }}
								whileTap={{ scale: 0.97 }}
								onClick={onReport}
								className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium"
								style={{ ...glass, ...buttonStyle }}
							>
								<Flag className="h-3.5 w-3.5" />
								Report
							</motion.button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
};
