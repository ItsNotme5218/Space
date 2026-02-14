import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { EyeOff, Gauge, Globe, ChevronDown } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const spring = { type: 'spring' as const, stiffness: 260, damping: 26 };
const softSpring = { type: 'spring' as const, stiffness: 380, damping: 32 };

const tabs = [
	{ id: 'cloak', label: 'Cloaking', icon: EyeOff },
	{ id: 'perf', label: 'Performance', icon: Gauge },
	{ id: 'proxy', label: 'Proxy', icon: Globe }
];

const glass = {
	background: 'rgba(14, 14, 16, 0.55)',
	boxShadow: '0 2px 24px -4px rgba(0,0,0,0.5), 0 0 1px 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.03)',
	backdropFilter: 'blur(12px)'
};

const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => (
	<motion.button
		whileTap={{ scale: 0.85 }}
		whileHover={{ scale: 1.08 }}
		onClick={() => set(!on)}
		className="relative w-14 h-8 rounded-full cursor-pointer shrink-0"
		animate={{
			backgroundColor: on ? 'rgba(139,92,246,0.55)' : 'rgba(50,50,58,0.5)',
			boxShadow: on
				? '0 0 20px 4px rgba(139,92,246,0.3), inset 0 0 8px rgba(139,92,246,0.25)'
				: '0 0 0px 0px transparent, inset 0 1px 4px rgba(0,0,0,0.4)'
		}}
		transition={softSpring}
	>
		<motion.div
			className="absolute top-1 left-1 w-6 h-6 rounded-full"
			style={{ background: 'rgba(255,255,255,0.93)', boxShadow: '0 2px 6px rgba(0,0,0,0.35)' }}
			animate={{ x: on ? 24 : 0 }}
			transition={spring}
		/>
	</motion.button>
);

const Select = ({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) => {
	const [open, setOpen] = useState(false);
	return (
		<div className="relative shrink-0">
			<motion.button
				whileTap={{ scale: 0.96 }}
				whileHover={{ scale: 1.03 }}
				onClick={() => setOpen(o => !o)}
				className="flex items-center gap-3 px-6 py-3 rounded-2xl text-[15px] text-white/60 cursor-pointer border border-white/[0.05]"
				style={glass}
			>
				{value}
				<motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
					<ChevronDown className="w-4 h-4 text-zinc-500" />
				</motion.span>
			</motion.button>
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, scale: 0.92, y: -8 }}
						animate={{ opacity: 1, scale: 1, y: 8 }}
						exit={{ opacity: 0, scale: 0.92, y: -8 }}
						transition={spring}
						className="absolute z-50 right-0 min-w-[200px] rounded-2xl border border-white/[0.05] overflow-hidden py-1.5"
						style={{
							background: 'rgba(10,10,14,0.94)',
							boxShadow: '0 16px 50px -10px rgba(0,0,0,0.8), 0 0 1px rgba(139,92,246,0.2)',
							backdropFilter: 'blur(24px)'
						}}
					>
						{options.map(o => (
							<motion.button
								key={o}
								whileTap={{ scale: 0.97 }}
								onClick={() => { onChange(o); setOpen(false); }}
								className="block w-full text-left px-6 py-3 text-[15px] cursor-pointer"
								animate={{
									color: o === value ? 'rgba(167,139,250,1)' : 'rgba(255,255,255,0.4)',
									backgroundColor: o === value ? 'rgba(139,92,246,0.1)' : 'transparent'
								}}
								whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
							>
								{o}
							</motion.button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

const Row = ({ label, desc, children, i = 0 }: { label: string; desc?: string; children: ReactNode; i?: number }) => (
	<motion.div
		initial={{ opacity: 0, y: 28, scale: 0.97 }}
		animate={{ opacity: 1, y: 0, scale: 1 }}
		transition={{ ...spring, delay: 0.06 + i * 0.07 }}
		whileHover={{
			scale: 1.015,
			boxShadow: '0 6px 36px -6px rgba(139,92,246,0.14), 0 0 1px 0 rgba(139,92,246,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
		}}
		className="flex items-center justify-between px-8 py-6 rounded-3xl border border-white/[0.05]"
		style={glass}
	>
		<div className="flex flex-col gap-1 mr-6">
			<span className="text-base text-white/85 font-medium">{label}</span>
			{desc && <span className="text-[13px] text-white/25 leading-relaxed">{desc}</span>}
		</div>
		{children}
	</motion.div>
);

const Btn = ({ children, onClick, ghost }: { children: ReactNode; onClick?: () => void; ghost?: boolean }) => (
	<motion.button
		whileHover={{
			scale: 1.06,
			boxShadow: ghost
				? '0 0 16px 3px rgba(255,255,255,0.05), inset 0 0 6px rgba(255,255,255,0.03)'
				: '0 0 30px 6px rgba(139,92,246,0.25), 0 0 60px 10px rgba(139,92,246,0.08), inset 0 0 12px rgba(139,92,246,0.2)'
		}}
		whileTap={{ scale: 0.92 }}
		onClick={onClick}
		className="px-7 py-3 rounded-2xl text-[15px] font-semibold cursor-pointer border shrink-0"
		style={ghost ? {
			...glass,
			color: 'rgba(255,255,255,0.45)',
			borderColor: 'rgba(255,255,255,0.05)'
		} : {
			background: 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(168,85,247,0.12) 100%)',
			boxShadow: '0 0 20px 3px rgba(139,92,246,0.15), 0 0 40px 6px rgba(139,92,246,0.06), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 10px rgba(139,92,246,0.1)',
			backdropFilter: 'blur(12px)',
			color: 'rgba(192,168,255,1)',
			borderColor: 'rgba(139,92,246,0.2)'
		}}
	>
		{children}
	</motion.button>
);

const CloakPanel = () => {
	const [autoBlank, setAutoBlank] = useLocalStorage('autoAboutBlank', false);
	const [autoBlob, setAutoBlob] = useLocalStorage('autoBlob', false);
	const [tabCloak, setTabCloak] = useLocalStorage('tabCloak', 'None');
	return (
		<div className="flex flex-col gap-5">
			<Row label="About:Blank" desc="Open site in a hidden blank tab" i={0}>
				<Btn>Launch</Btn>
			</Row>
			<Row label="Blob Cloak" desc="Use temporary blob data to hide" i={1}>
				<Btn ghost>Launch</Btn>
			</Row>
			<Row label="Auto About:Blank" desc="Cloak automatically on load" i={2}>
				<Toggle on={autoBlank} set={v => { setAutoBlank(v); if (v) setAutoBlob(false); }} />
			</Row>
			<Row label="Auto Blob" i={3}>
				<Toggle on={autoBlob} set={v => { setAutoBlob(v); if (v) setAutoBlank(false); }} />
			</Row>
			<Row label="Tab Disguise" desc="Mask tab name and favicon" i={4}>
				<Select
					value={tabCloak}
					options={['None', 'Desmos', 'Google Classroom', 'Google Drive', 'Khan Academy']}
					onChange={setTabCloak}
				/>
			</Row>
		</div>
	);
};

const PerfPanel = () => {
	const [particles, setParticles] = useLocalStorage('particles', true);
	return (
		<div className="flex flex-col gap-5">
			<Row label="Starfield Particles" desc="High impact on low-end devices" i={0}>
				<Toggle on={particles} set={setParticles} />
			</Row>
		</div>
	);
};

const ProxyPanel = () => {
	const [proxy, setProxy] = useLocalStorage('proxy', 'Scramjet');
	const [transport, setTransport] = useLocalStorage('transport', 'Libcurl');
	const [engine, setEngine] = useLocalStorage('searchEngine', 'DuckDuckGo');
	return (
		<div className="flex flex-col gap-5">
			<Row label="Proxy Backend" i={0}>
				<Select value={proxy} options={['Scramjet', 'Ultraviolet']} onChange={setProxy} />
			</Row>
			<Row label="Transport" desc="Advanced — data transfer method" i={1}>
				<Select value={transport} options={['Libcurl', 'Epoxy']} onChange={setTransport} />
			</Row>
			<Row label="Search Engine" i={2}>
				<Select value={engine} options={['DuckDuckGo', 'Google', 'Bing', 'Yahoo!']} onChange={setEngine} />
			</Row>
		</div>
	);
};

const panels: Record<string, () => ReactNode> = {
	cloak: CloakPanel,
	perf: PerfPanel,
	proxy: ProxyPanel
};

export const SettingsPage = () => {
	const [active, setActive] = useState('cloak');
	const Panel = panels[active] ?? CloakPanel;

	return (
		<div className="h-full w-full flex flex-col items-center justify-start pt-16 overflow-y-auto pb-16">
			<LayoutGroup>
				<motion.div
					initial={{ opacity: 0, y: -30, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					transition={spring}
					className="flex gap-2 p-2.5 rounded-full border border-white/[0.05] mb-12"
					style={{
						background: 'rgba(14, 14, 16, 0.5)',
						boxShadow: '0 4px 40px -8px rgba(0,0,0,0.7), 0 0 1px 0 rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
						backdropFilter: 'blur(20px)'
					}}
				>
					{tabs.map(t => {
						const Icon = t.icon;
						const isActive = t.id === active;
						return (
							<motion.button
								key={t.id}
								onClick={() => setActive(t.id)}
								whileTap={{ scale: 0.93 }}
								whileHover={{ scale: isActive ? 1 : 1.05 }}
								className="relative flex items-center gap-3 px-7 py-3 rounded-full text-[15px] cursor-pointer z-10"
								animate={{ color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)' }}
								transition={{ duration: 0.2 }}
							>
								{isActive && (
									<motion.div
										layoutId="tab-pill"
										className="absolute inset-0 rounded-full"
										style={{
											background: 'rgba(255,255,255,0.05)',
											boxShadow: '0 0 24px 5px rgba(139,92,246,0.1), 0px 2px 10px 0px rgba(140,140,160,0.12), inset 0px 1px 2px -1px rgba(255,255,255,0.2)'
										}}
										transition={spring}
									/>
								)}
								<Icon className="w-[18px] h-[18px] relative z-10" />
								<span className="relative z-10 font-medium tracking-wide">{t.label}</span>
							</motion.button>
						);
					})}
				</motion.div>
			</LayoutGroup>

			<div className="w-full max-w-2xl px-8">
				<AnimatePresence mode="wait">
					<motion.div
						key={active}
						initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
						animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
						exit={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
						transition={spring}
					>
						<Panel />
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
};
