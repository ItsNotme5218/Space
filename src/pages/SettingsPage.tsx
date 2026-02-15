import { useState, type ReactNode } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { EyeOff, Gauge, Globe, ChevronDown, Palette, Info } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const spring = { type: 'spring' as const, stiffness: 300, damping: 28 };
const soft   = { type: 'spring' as const, stiffness: 200, damping: 22 };

const tabs = [
	{ id: 'cloak',  label: 'Cloaking',   icon: EyeOff  },
	{ id: 'appear', label: 'Appearance',  icon: Palette },
	{ id: 'perf',   label: 'Performance', icon: Gauge   },
	{ id: 'proxy',  label: 'Proxy',       icon: Globe   },
	{ id: 'about',  label: 'About',       icon: Info    },
];


const Toggle = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => (
	<motion.button
		whileTap={{ scale: 0.9 }}
		onClick={() => set(!on)}
		className="relative w-12 h-7 rounded-full cursor-pointer shrink-0"
		animate={{
			backgroundColor: on ? 'rgba(139,92,246,0.55)' : 'rgba(255,255,255,0.06)',
			boxShadow: on
				? '0 0 14px rgba(139,92,246,0.35), inset 0 0 6px rgba(139,92,246,0.2)'
				: 'inset 0 1px 3px rgba(0,0,0,0.3)',
		}}
		transition={spring}
	>
		<motion.div
			className="absolute top-0.75 left-0.75 w-5 h-5 rounded-full bg-white/90"
			style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }}
			animate={{ x: on ? 20 : 0 }}
			transition={spring}
		/>
	</motion.button>
);

const Select = ({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) => {
	const [open, setOpen] = useState(false);
	return (
		<div className="relative shrink-0 exception">
			<motion.button
				whileTap={{ scale: 0.97 }}
				onClick={() => setOpen(o => !o)}
				className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm text-white/50 cursor-pointer"
				style={{
					background: 'rgba(255,255,255,0.04)',
					border: '1px solid rgba(255,255,255,0.07)',
				}}
			>
				{value}
				<motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
					<ChevronDown className="w-4 h-4 text-white/25" />
				</motion.span>
			</motion.button>
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, scale: 0.95, y: -4 }}
						animate={{ opacity: 1, scale: 1, y: 6 }}
						exit={{ opacity: 0, scale: 0.95, y: -4 }}
						transition={{ duration: 0.15 }}
						className="absolute z-50 right-0 min-w-50 rounded-2xl overflow-hidden py-2"
						style={{
							background: 'rgba(14,14,18,0.96)',
							border: '1px solid rgba(255,255,255,0.06)',
							boxShadow: '0 20px 60px -12px rgba(0,0,0,0.8)',
							backdropFilter: 'blur(24px)',
						}}
					>
						{options.map(o => (
							<button
								key={o}
								onClick={() => { onChange(o); setOpen(false); }}
								className="block w-full text-left px-5 py-3 text-sm cursor-pointer transition-colors"
								style={{
									color: o === value ? '#a78bfa' : 'rgba(255,255,255,0.4)',
									backgroundColor: o === value ? 'rgba(139,92,246,0.08)' : 'transparent',
								}}
								onMouseEnter={e => { if (o !== value) (e.target as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
								onMouseLeave={e => { if (o !== value) (e.target as HTMLElement).style.backgroundColor = 'transparent'; }}
							>
								{o}
							</button>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

const Btn = ({ children, onClick, variant = 'primary' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' }) => (
	<motion.button
		whileHover={{ scale: 1.04 }}
		whileTap={{ scale: 0.96 }}
		onClick={onClick}
		className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer shrink-0"
		style={variant === 'ghost' ? {
			background: 'rgba(255,255,255,0.04)',
			border: '1px solid rgba(255,255,255,0.07)',
			color: 'rgba(255,255,255,0.45)',
		} : {
			background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(139,92,246,0.12))',
			border: '1px solid rgba(139,92,246,0.22)',
			color: '#c4b5fd',
			boxShadow: '0 0 16px rgba(139,92,246,0.15)',
		}}
	>
		{children}
	</motion.button>
);


const Section = ({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) => (
	<motion.section
		initial={{ opacity: 0, y: 20 }}
		animate={{ opacity: 1, y: 0 }}
		transition={{ ...soft, delay }}
	>
		<h3 className="text-xs font-semibold uppercase tracking-widest text-white/20 mb-4 pl-1">{title}</h3>
		<div
			className="rounded-2xl overflow-hidden divide-y divide-white/[0.04]"
			style={{
				background: 'rgba(255,255,255,0.08)',
				border: '1px solid rgba(255,255,255,0.08)',
				backdropFilter: 'blur(48px)',
				WebkitBackdropFilter: 'blur(48px)',
				boxShadow: '0 4px 32px -6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
			}}
		>
			{children}
		</div>
	</motion.section>
);

const Row = ({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) => (
	<div className="flex items-center justify-between px-7 py-5 group transition-colors duration-150 hover:bg-white/[0.02]">
		<div className="flex flex-col gap-1 mr-8 min-w-0">
			<span className="text-[15px] text-white/75 font-medium group-hover:text-white/90 transition-colors duration-150">{label}</span>
			{desc && <span className="text-sm text-white/25 leading-relaxed">{desc}</span>}
		</div>
		{children}
	</div>
);


const CloakPanel = () => {
	const [autoBlank, setAutoBlank] = useLocalStorage('autoAboutBlank', false);
	const [autoBlob, setAutoBlob]   = useLocalStorage('autoBlob', false);
	const [tabCloak, setTabCloak]   = useLocalStorage('tabCloak', 'None');
	return (
		<div className="flex flex-col gap-10">
			<Section title="Quick Actions" delay={0.0}>
				<Row label="About:Blank" desc="Open site inside a hidden blank tab">
					<Btn>Launch</Btn>
				</Row>
				<Row label="Blob Cloak" desc="Use a temporary blob URL to hide">
					<Btn variant="ghost">Launch</Btn>
				</Row>
			</Section>

			<Section title="Automatic Cloaking" delay={0.06}>
				<Row label="Auto About:Blank" desc="Cloak automatically when the page loads">
					<Toggle on={autoBlank} set={v => { setAutoBlank(v); if (v) setAutoBlob(false); }} />
				</Row>
				<Row label="Auto Blob" desc="Use blob cloaking automatically on load">
					<Toggle on={autoBlob} set={v => { setAutoBlob(v); if (v) setAutoBlank(false); }} />
				</Row>
			</Section>

			<Section title="Tab Disguise" delay={0.12}>
				<Row label="Disguise Preset" desc="Change tab title and favicon to look like another site">
					<Select
						value={tabCloak}
						options={['None', 'Desmos', 'Google Classroom', 'Google Drive', 'Khan Academy']}
						onChange={setTabCloak}
					/>
				</Row>
			</Section>
		</div>
	);
};

const AppearPanel = () => {
	const [particles, setParticles] = useLocalStorage('particles', true);
	return (
		<div className="flex flex-col gap-10">
			<Section title="Visual Effects" delay={0.0}>
				<Row label="Starfield Particles" desc="Animated star background on the home page">
					<Toggle on={particles} set={setParticles} />
				</Row>
			</Section>

			<Section title="Theme" delay={0.06}>
				<Row label="Accent Color" desc="Primary color used across the UI">
					<div className="flex gap-2.5">
						{['#8b5cf6', '#ec4899', '#06b6d4', '#22c55e', '#f59e0b'].map(c => (
							<button
								key={c}
								className="w-7 h-7 rounded-full cursor-pointer ring-2 ring-transparent hover:ring-white/20 transition-all duration-150"
								style={{
									background: c,
									boxShadow: c === '#8b5cf6' ? `0 0 10px ${c}50` : 'none',
								}}
							/>
						))}
					</div>
				</Row>
			</Section>
		</div>
	);
};

const PerfPanel = () => {
	const [particles, setParticles] = useLocalStorage('particles', true);
	return (
		<div className="flex flex-col gap-10">
			<Section title="Rendering" delay={0.0}>
				<Row label="Starfield Particles" desc="Disable on low-end devices for better performance">
					<Toggle on={particles} set={setParticles} />
				</Row>
			</Section>
		</div>
	);
};

const ProxyPanel = () => {
	const [proxy, setProxy]         = useLocalStorage('proxy', 'Scramjet');
	const [transport, setTransport] = useLocalStorage('transport', 'Libcurl');
	const [engine, setEngine]       = useLocalStorage('searchEngine', 'DuckDuckGo');
	return (
		<div className="flex flex-col gap-10">
			<Section title="Backend" delay={0.0}>
				<Row label="Proxy Backend" desc="The core proxy engine powering your sessions">
					<Select value={proxy} options={['Scramjet', 'Ultraviolet']} onChange={setProxy} />
				</Row>
				<Row label="Transport" desc="Network transport layer for data transfer">
					<Select value={transport} options={['Libcurl', 'Epoxy']} onChange={setTransport} />
				</Row>
			</Section>

			<Section title="Search" delay={0.06}>
				<Row label="Search Engine" desc="Default search provider for the address bar">
					<Select value={engine} options={['DuckDuckGo', 'Google', 'Bing', 'Yahoo!']} onChange={setEngine} />
				</Row>
			</Section>
		</div>
	);
};

const AboutPanel = () => (
	<div className="flex flex-col gap-10">
		<Section title="Application" delay={0.0}>
			<Row label="Version" desc="Current build version">
				<span className="text-sm text-white/30 font-mono">1.0.0</span>
			</Row>
			<Row label="Framework" desc="Technologies used">
				<span className="text-sm text-white/30">React + Vite</span>
			</Row>
		</Section>

		<Section title="Links" delay={0.06}>
			<Row label="Source Code" desc="View the project on GitHub">
				<Btn variant="ghost">Open</Btn>
			</Row>
			<Row label="Report a Bug" desc="Submit an issue or suggestion">
				<Btn variant="ghost">Open</Btn>
			</Row>
		</Section>
	</div>
);

const panels: Record<string, () => ReactNode> = {
	cloak:  CloakPanel,
	appear: AppearPanel,
	perf:   PerfPanel,
	proxy:  ProxyPanel,
	about:  AboutPanel,
};


export const SettingsPage = () => {
	const [active, setActive] = useState('cloak');
	const Panel = panels[active] ?? CloakPanel;

	return (
		<div className="h-full w-full overflow-y-auto">
			<div className="min-h-full flex flex-col items-center px-10 pt-20 pb-24">

				<motion.h1
					initial={{ opacity: 0, y: -16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={soft}
					className="text-4xl font-bold text-white/90 tracking-tight mb-3"
				>
					Settings
				</motion.h1>

				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ ...soft, delay: 0.04 }}
					className="text-base text-white/25 mb-12"
				>
					Manage cloaking, proxy, and display preferences
				</motion.p>

				<LayoutGroup>
					<motion.nav
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ ...soft, delay: 0.06 }}
						className="flex gap-1.5 p-2 rounded-2xl"
						style={{
							background: 'rgba(255,255,255,0.06)',
							border: '1px solid rgba(255,255,255,0.07)',
							backdropFilter: 'blur(40px)',
							WebkitBackdropFilter: 'blur(40px)',
							boxShadow: '0 4px 32px -8px rgba(0,0,0,0.5)',
						}}
					>
						{tabs.map(t => {
							const Icon = t.icon;
							const isActive = t.id === active;
							return (
								<motion.button
									key={t.id}
									onClick={() => setActive(t.id)}
									whileTap={{ scale: 0.96 }}
									className="relative flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm cursor-pointer z-10"
									animate={{ color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)' }}
									transition={{ duration: 0.15 }}
								>
									{isActive && (
										<motion.div
											layoutId="settings-tab"
											className="absolute inset-0 rounded-xl"
											style={{
												background: 'rgba(139,92,246,0.1)',
												border: '1px solid rgba(139,92,246,0.16)',
												boxShadow: '0 0 20px rgba(139,92,246,0.1)',
											}}
											transition={spring}
										/>
									)}
									<Icon className="w-4 h-4 relative z-10" />
									<span className="relative z-10 font-medium">{t.label}</span>
								</motion.button>
							);
						})}
					</motion.nav>
				</LayoutGroup>

				<motion.div
					initial={{ opacity: 0, scaleX: 0 }}
					animate={{ opacity: 1, scaleX: 1 }}
					transition={{ ...soft, delay: 0.1 }}
					className="w-full max-w-2xl h-px mt-12 mb-14"
					style={{
						background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.2) 25%, rgba(139,92,246,0.3) 50%, rgba(139,92,246,0.2) 75%, transparent 100%)',
					}}
				/>

				<div className="w-full max-w-2xl">
					<AnimatePresence mode="wait">
						<motion.div
							key={active}
							initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
							animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
							exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
							transition={soft}
						>
							<Panel />
						</motion.div>
					</AnimatePresence>
				</div>
			</div>
		</div>
	);
};
