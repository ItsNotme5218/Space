import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

export const ExpandedMosaic = () => {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 0.3 }}
			className="absolute inset-0 flex gap-3"
		>
			<div className="flex flex-col gap-3 w-1/2">
				{/* image */}
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.35 }}
					className="flex-[1.2] rounded-2xl"
					style={{
						background: 'rgba(20, 10, 30, 0.8)',
						border: '1px solid rgba(139, 92, 246, 0.3)'
					}}
				/>
				{/* stats */}
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.45 }}
					className="flex-1 rounded-2xl p-3 grid grid-cols-2 grid-rows-2 gap-2"
					style={{
						background: 'rgba(20, 10, 30, 0.8)',
						boxShadow:
							'0px 0px 8px rgba(139, 92, 246, 0.3), 0px 0px 8px 2px rgba(139, 92, 246, 0.3) inset',
						border: '1px solid rgba(139, 92, 246, 0.3)',
						backdropFilter: 'blur(2px)'
					}}
				>
					{[0, 1, 2, 3] // array should be changed to a stat json later
						.map(i => (
							<div key={i} className="flex items-center gap-2">
								<span className="text-white/60 text-sm">
									stat
								</span>
							</div>
						))}
				</motion.div>
			</div>

			<div className="flex flex-col gap-3 w-1/2">
				{/* title */}
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.4 }}
					className="h-16 rounded-2xl flex items-center justify-center px-4"
					style={{
						background: 'rgba(20, 10, 30, 0.8)',
						boxShadow:
							'0px 0px 8px rgba(139, 92, 246, 0.3), 0px 0px 8px 2px rgba(139, 92, 246, 0.3) inset',
						border: '1px solid rgba(139, 92, 246, 0.3)',
						backdropFilter: 'blur(2px)'
					}}
				>
					<div
						className="h-5 w-3/4 rounded-md"
						style={{ background: 'rgba(255, 255, 255, 0.2)' }}
					/>
				</motion.div>
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.5 }}
					className="flex-1 rounded-2xl flex items-start justify-start p-4"
					style={{
						background: 'rgba(20, 10, 30, 0.8)',
						boxShadow:
							'0px 0px 8px rgba(139, 92, 246, 0.3), 0px 0px 8px 2px rgba(139, 92, 246, 0.3) inset',
						border: '1px solid rgba(139, 92, 246, 0.3)',
						backdropFilter: 'blur(2px)'
					}}
				>
					<p className="text-white/40 text-sm leading-relaxed">
						No description available.
					</p>
				</motion.div>
				<div className="flex gap-2">
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.55 }}
						className="h-14 rounded-2xl flex items-center justify-center grow"
						style={{
							background: 'rgba(0, 0, 0, 0.10)',
							boxShadow:
								'0px 0px 8px rgba(203, 166, 247, 0.50), 0px 0px 8px 2px #CBA6F7 inset',
							border: '1px #CBA6F7 solid',
							backdropFilter: 'blur(2px)'
						}}
					>
						Launch Game
					</motion.div>
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.6 }}
						className="h-14 w-14 rounded-2xl flex items-center justify-center"
						style={{
							background: 'rgba(20, 10, 30, 0.8)',
							boxShadow:
								'0px 0px 8px rgba(139, 92, 246, 0.3), 0px 0px 8px 2px rgba(139, 92, 246, 0.3) inset',
							border: '1px solid rgba(139, 92, 246, 0.3)',
							backdropFilter: 'blur(2px)'
						}}
					>
						<Star className="h-6 w-6" />
					</motion.div>
				</div>
			</div>
		</motion.div>
	);
};
