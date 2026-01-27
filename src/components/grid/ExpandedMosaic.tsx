import { motion } from 'framer-motion';

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
						border: '1px solid rgba(139, 92, 246, 0.3)'
					}}
				>
					{[0, 1, 2, 3].map(i => ( // array should be changed to a stat json later
						<div key={i} className="flex items-center gap-2">
							<span className="text-white/60 text-sm">stat</span>
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
						border: '1px solid rgba(139, 92, 246, 0.3)'
					}}
				>
					<div
						className="h-5 w-3/4 rounded-md"
						style={{ background: 'rgba(255, 255, 255, 0.2)' }}
					/>
				</motion.div>
				{/* desc */}
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.5 }}
					className="flex-1 rounded-2xl flex items-center justify-center p-4"
					style={{
						background: 'rgba(20, 10, 30, 0.8)',
						border: '1px solid rgba(139, 92, 246, 0.3)'
					}}
				>
					<div
						className="h-3 w-full rounded-md"
						style={{ background: 'rgba(255, 255, 255, 0.1)' }}
					/>
				</motion.div>
				{/* play */}
				<motion.div
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.55 }}
					className="h-14 rounded-2xl flex items-center justify-center"
					style={{
						background: 'rgba(139, 92, 246, 0.3)',
						border: '1px solid rgba(139, 92, 246, 0.5)'
					}}
				>
					<div
						className="h-4 w-24 rounded-md"
						style={{ background: 'rgba(255, 255, 255, 0.3)' }}
					/>
				</motion.div>
			</div>
		</motion.div>
	);
};
