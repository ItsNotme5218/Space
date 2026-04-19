import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sessions } from './Sessions';
import { Gamepad2, LayoutGrid, History, Settings } from 'lucide-react';
import { SiDiscord } from '@icons-pack/react-simple-icons';
import logoImg from '@assets/logo.webp';

const navItems = [
	{ id: 'games', icon: Gamepad2 },
	{ id: 'apps', icon: LayoutGrid },
	{ id: 'discord', icon: SiDiscord },
	{ id: 'playback', icon: History },
	{ id: 'settings', icon: Settings }
];

import type { Session } from '../App';

interface SidebarProps {
	activeItem: string;
	onItemClick: (id: string) => void;
	onHoverChange?: (hovered: boolean) => void;
	sessions: Session[];
	activeSession: number;
	maxSessions: number;
	onSessionChange: (id: number) => void;
	onAddSession: () => void;
	onCloseSession: (id: number) => void;
	alwaysVisible?: boolean;
}

const VDivider = ({
	blur = 0,
	transform
}: {
	blur?: number;
	transform?: string;
}) => {
	return (
		<div
			className="w-full flex justify-center"
			style={{
				filter: blur > 0 ? `blur(${blur}px)` : undefined,
				transform,
				pointerEvents: 'none',
				margin: '-2px 0 0 0'
			}}
		>
			<svg width="32" height="8" viewBox="0 0 32 8" fill="none">
				<path
					d="M0 1C8 1 12 7 16 7C20 7 24 1 32 1"
					stroke="rgba(255,255,255,0.2)"
					strokeWidth="2"
					strokeLinecap="round"
				/>
			</svg>
		</div>
	);
};

const NightPlusIcon = () => {
	return (
		<svg width="29" height="29" viewBox="0 0 29 29" fill="none">
			<defs>
				<filter
					id="filter0_ii"
					x="0"
					y="-2"
					width="29"
					height="31"
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="BackgroundImageFix"
						result="shape"
					/>
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset />
					<feGaussianBlur stdDeviation="2" />
					<feComposite
						in2="hardAlpha"
						operator="arithmetic"
						k2="-1"
						k3="1"
					/>
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0.796078 0 0 0 0 0.65098 0 0 0 0 0.968627 0 0 0 1 0"
					/>
					<feBlend mode="normal" in2="shape" result="effect1" />
					<feColorMatrix
						in="SourceAlpha"
						type="matrix"
						values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
						result="hardAlpha"
					/>
					<feOffset dy="-2" />
					<feGaussianBlur stdDeviation="4" />
					<feComposite
						in2="hardAlpha"
						operator="arithmetic"
						k2="-1"
						k3="1"
					/>
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0.796078 0 0 0 0 0.65098 0 0 0 0 0.968627 0 0 0 0.5 0"
					/>
					<feBlend mode="normal" in2="effect1" result="effect2" />
				</filter>
				<filter
					id="filter1_f"
					x="2.19"
					y="2.45"
					width="24.36"
					height="24.36"
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="BackgroundImageFix"
						result="shape"
					/>
					<feGaussianBlur stdDeviation="2" result="blur" />
				</filter>
				<filter
					id="filter2_f"
					x="10.5"
					y="5.83"
					width="12.67"
					height="12.67"
					filterUnits="userSpaceOnUse"
					colorInterpolationFilters="sRGB"
				>
					<feFlood floodOpacity="0" result="BackgroundImageFix" />
					<feBlend
						mode="normal"
						in="SourceGraphic"
						in2="BackgroundImageFix"
						result="shape"
					/>
					<feGaussianBlur stdDeviation="2" result="blur" />
				</filter>
			</defs>
			<g filter="url(#filter0_ii)">
				<rect
					x="1"
					y="1"
					width="27"
					height="27"
					rx="13.5"
					fill="#11111B"
				/>
			</g>
			<rect
				x="0.5"
				y="0.5"
				width="28"
				height="28"
				rx="14"
				stroke="#CBA6F7"
			/>
			<g filter="url(#filter1_f)">
				<path
					d="M12.4326 6.45193C10.5446 7.76485 9.30769 9.94877 9.30762 12.4226C9.30762 16.4373 12.5625 19.6922 16.5771 19.6922C19.0514 19.6921 21.235 18.4546 22.5479 16.5662C21.6292 20.1546 18.3748 22.8074 14.5 22.8074C9.91184 22.8073 6.19238 19.088 6.19238 14.4998C6.19238 10.6254 8.84474 7.37094 12.4326 6.45193Z"
					fill="#CBA6F7"
				/>
			</g>
			<g filter="url(#filter2_f)">
				<path
					d="M16.8369 9.82693C17.1594 9.82714 17.4209 10.0884 17.4209 10.4109V11.5789H18.5889C18.9114 11.5789 19.1726 11.8404 19.1729 12.1629C19.1729 12.4855 18.9115 12.7478 18.5889 12.7478H17.4209V13.9158C17.4208 14.2382 17.1593 14.4996 16.8369 14.4998C16.5144 14.4998 16.252 14.2383 16.252 13.9158V12.7478H15.084C14.7614 12.7478 14.5 12.4854 14.5 12.1629C14.5002 11.8405 14.7616 11.579 15.084 11.5789H16.252V10.4109C16.252 10.0883 16.5143 9.82693 16.8369 9.82693Z"
					fill="#CBA6F7"
				/>
			</g>
			<path
				d="M12.4326 6.45193C10.5446 7.76485 9.30769 9.94877 9.30762 12.4226C9.30762 16.4373 12.5625 19.6922 16.5771 19.6922C19.0514 19.6921 21.235 18.4546 22.5479 16.5662C21.6292 20.1546 18.3748 22.8074 14.5 22.8074C9.91184 22.8073 6.19238 19.088 6.19238 14.4998C6.19238 10.6254 8.84474 7.37094 12.4326 6.45193Z"
				fill="#CBA6F7"
			/>
			<path
				d="M16.8369 9.82693C17.1594 9.82714 17.4209 10.0884 17.4209 10.4109V11.5789H18.5889C18.9114 11.5789 19.1726 11.8404 19.1729 12.1629C19.1729 12.4855 18.9115 12.7478 18.5889 12.7478H17.4209V13.9158C17.4208 14.2382 17.1593 14.4996 16.8369 14.4998C16.5144 14.4998 16.252 14.2383 16.252 13.9158V12.7478H15.084C14.7614 12.7478 14.5 12.4854 14.5 12.1629C14.5002 11.8405 14.7616 11.579 15.084 11.5789H16.252V10.4109C16.252 10.0883 16.5143 9.82693 16.8369 9.82693Z"
				fill="#CBA6F7"
			/>
		</svg>
	);
};

const LogoImage = () => {
	return (
		<div className="relative w-8 h-8">
			<img
				src={logoImg}
				alt=""
				className="absolute inset-0 w-full h-full object-cover rounded-xl"
				style={{ opacity: 0.85 }}
			/>
			<img
				src={logoImg}
				alt=""
				className="absolute inset-0 h-full w-full object-cover rounded-xl"
				style={{ opacity: 0.65, filter: 'blur(1px)' }}
			/>
			<img
				src={logoImg}
				alt=""
				className="absolute inset-0 w-full h-full object-cover rounded-xl"
				style={{ opacity: 1, filter: 'blur(5px)' }}
			/>
		</div>
	);
};

export const Sidebar = ({
	activeItem,
	onItemClick,
	onHoverChange,
	sessions,
	activeSession,
	maxSessions,
	onSessionChange,
	onAddSession,
	onCloseSession,
	alwaysVisible = false
}: SidebarProps) => {
	const [hovered, setHovered] = useState(false);
	const navContainerRef = useRef<HTMLDivElement>(null);
	const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
	const [indicatorY, setIndicatorY] = useState<number>(0);
	const isHome = !navItems.some(item => item.id === activeItem);

	const measurePosition = useCallback(() => {
		requestAnimationFrame(() => {
			const container = navContainerRef.current;
			const btn =
				buttonRefs.current[activeItem] ||
				buttonRefs.current[navItems[0].id];
			if (!container || !btn) return;
			const containerRect = container.getBoundingClientRect();
			const btnRect = btn.getBoundingClientRect();
			setIndicatorY(
				btnRect.top - containerRect.top + btnRect.height / 2 - 20
			);
		});
	}, [activeItem]);

	useEffect(() => {
		measurePosition();
	}, [measurePosition]);

	const handleHover = (isHovered: boolean) => {
		setHovered(isHovered);
		onHoverChange?.(isHovered);
	};

	const isVisible = alwaysVisible || hovered;

	return (
		<div
			className="fixed left-0 bottom-0 h-[calc(100vh-3.5rem)] w-4 z-50 flex flex-col items-center"
			onMouseEnter={() => handleHover(true)}
			onMouseLeave={() => handleHover(false)}
		>
			<motion.div
				className="fixed -left-12 top-1/2 w-13 h-80 rounded-full border border-violet-400/20"
				style={{
					background: 'rgba(14, 14, 16, 0.5)',
					boxShadow:
						'0 0 8px 4px rgba(203, 166, 247, 0.5), 0 0 20px 8px rgba(139, 92, 246, 0.3), 0 0 2px 1px rgba(139, 92, 246, 0.5) inset'
				}}
				animate={{
					opacity: isVisible ? 0 : 1,
					x: isVisible ? -20 : 0,
					y: '-50%'
				}}
				transition={{ duration: 0.2 }}
			/>

			<motion.nav
				initial={{ x: -80, opacity: 0 }}
				animate={{
					x: isVisible ? 8 : -80,
					opacity: isVisible ? 1 : 0
				}}
				transition={{ type: 'spring', stiffness: 300, damping: 30 }}
				className="fixed left-0 bottom-0 w-14 flex flex-col items-center justify-center-safe h-[calc(100vh-4rem+8px)]"
			>
				<div
					ref={navContainerRef}
					className="relative rounded-full border w-14 border-[#1B1B1B] flex flex-col items-center"
					style={{
						background: 'rgba(14, 14, 16, 0.65)',
						boxShadow:
							'0 0 4px 1px rgba(255, 255, 255, 0.05), 0 0 10px 1px #1B1B1B inset',
						backdropFilter: 'blur(4px)',
						WebkitBackdropFilter: 'blur(4px)',
						padding: '0.875rem 0.5rem'
					}}
				>
					<motion.div
						className="absolute top-0 left-1/2 w-10 h-10 rounded-full pointer-events-none z-20"
						style={{
							background: 'rgba(139, 92, 246, 0.2)',
							boxShadow:
								'0px 0px 15px 2px rgba(139,92,246,0.4), inset 0px 0px 8px 2px rgba(203,166,247,0.3)',
							x: '-50%'
						}}
						initial={false}
						animate={{
							y: isHome ? 10 : indicatorY,
							scaleX: isHome ? 0.8 : [1, 1.05, 1],
							scaleY: isHome ? 0.8 : [1, 1.05, 1],
							opacity: isHome ? 0 : 1
						}}
						transition={{
							y: {
								type: isHome ? 'tween' : 'spring',
								stiffness: 400,
								damping: 22,
								mass: 0.8
							},
							scaleX: {
								repeat: Infinity,
								duration: 2.5,
								ease: 'easeInOut'
							},
							scaleY: {
								repeat: Infinity,
								duration: 2.5,
								ease: 'easeInOut'
							},
							opacity: { duration: 0.15 }
						}}
					/>

					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.95 }}
						onClick={() => onItemClick('')}
						className="flex items-center justify-center mb-1"
					>
						<LogoImage />
					</motion.button>

					<VDivider
						blur={2}
						transform="translateY(12px) scaleY(1.2)"
					/>
					<VDivider
						blur={3}
						transform="translateY(6px) scaleY(0.8)"
					/>
					<VDivider
						blur={2}
						transform="translateY(-2px) scaleY(0.5)"
					/>
					<VDivider blur={1.5} transform="translateY(-8px)" />
					<VDivider
						blur={1}
						transform="translateY(-15px) scaleY(0.6)"
					/>

					{navItems.slice(0, 2).map(item => {
						const Icon = item.icon;
						const isActive = activeItem === item.id;
						return (
							<motion.button
								key={item.id}
								ref={el => {
									buttonRefs.current[item.id] = el;
								}}
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => onItemClick(item.id)}
								className="relative w-10 h-10 rounded-full flex items-center justify-center"
							>
								<Icon
									className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-white' : 'text-zinc-500'}`}
								/>
							</motion.button>
						);
					})}

					<VDivider
						blur={2}
						transform="translateY(12px) scaleY(1.2)"
					/>
					<VDivider
						blur={3}
						transform="translateY(6px) scaleY(0.8)"
					/>
					<VDivider
						blur={2}
						transform="translateY(-2px) scaleY(0.5)"
					/>
					<VDivider blur={1.5} transform="translateY(-8px)" />
					<VDivider
						blur={1}
						transform="translateY(-15px) scaleY(0.6)"
					/>

					{navItems.slice(2, 5).map(item => {
						const Icon = item.icon;
						const isActive = activeItem === item.id;
						return (
							<motion.button
								key={item.id}
								ref={el => {
									buttonRefs.current[item.id] = el;
								}}
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => {
									if (item.id === 'discord') {
										window.location.href =
											'https://discord.night-x.com';
									} else {
										onItemClick(item.id);
									}
								}}
								className="relative w-10 h-10 rounded-full flex items-center justify-center"
							>
								<Icon
									className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-white' : 'text-zinc-500'}`}
								/>
							</motion.button>
						);
					})}

					<VDivider
						blur={2}
						transform="translateY(12px) scaleY(1.2)"
					/>
					<VDivider
						blur={3}
						transform="translateY(6px) scaleY(0.8)"
					/>
					<VDivider
						blur={2}
						transform="translateY(-2px) scaleY(0.5)"
					/>
					<VDivider blur={1.5} transform="translateY(-8px)" />
					<VDivider
						blur={1}
						transform="translateY(-15px) scaleY(0.6)"
					/>

					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.95 }}
						className="flex items-center justify-center mt-2"
					>
						<NightPlusIcon />
					</motion.button>
				</div>

				<Sessions
					sessions={sessions}
					activeSession={activeSession}
					maxSessions={maxSessions}
					highlightActive={isHome}
					onSessionChange={onSessionChange}
					onAddSession={onAddSession}
					onCloseSession={onCloseSession}
				/>
			</motion.nav>
		</div>
	);
};
