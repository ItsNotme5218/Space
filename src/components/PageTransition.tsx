import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';


const ROUTE_ORDER: Record<string, number> = {
	games: 0,
	apps: 1,
	movies: 2,
	history: 3,
	settings: 4
};

const resolveDirection = (from: string, to: string): 1 | -1 => {
	const a = ROUTE_ORDER[from] ?? -1;
	const b = ROUTE_ORDER[to] ?? -1;
	return b >= a ? 1 : -1;
};


const SPRING_ENTER = {
	type: 'spring' as const,
	stiffness: 380,
	damping: 32,
	mass: 0.85
};
const SPRING_EXIT = {
	type: 'spring' as const,
	stiffness: 420,
	damping: 34,
	mass: 0.8
};


const wrapperStyle: React.CSSProperties = {
	width: '100%',
	height: '100%',
	willChange: 'transform, opacity, filter',
	transformStyle: 'preserve-3d'
};

export const PageTransition = ({ children }: { children: React.ReactNode }) => {
	const location = useLocation();
	const prefersReduced = useReducedMotion();
	const prevPath = useRef(location.pathname);

	const fromKey = prevPath.current.replace('/', '') || 'home';
	const toKey = location.pathname.replace('/', '') || 'home';
	const dir = resolveDirection(fromKey, toKey);

	prevPath.current = location.pathname;

	if (prefersReduced) {
		return <div style={wrapperStyle}>{children}</div>;
	}

	const slideX = 60 * dir; // px offset
	const rotateY = 4 * dir; // subtle perspective tilt

	return (
		<motion.div
			key={location.pathname}
			initial={{
				opacity: 0,
				x: slideX,
				scale: 0.97,
				rotateY,
				filter: 'blur(6px) brightness(0.7)'
			}}
			animate={{
				opacity: 1,
				x: 0,
				scale: 1,
				rotateY: 0,
				filter: 'blur(0px) brightness(1)'
			}}
			exit={{
				opacity: 0,
				x: -slideX,
				scale: 0.97,
				rotateY: -rotateY,
				filter: 'blur(4px) brightness(0.8)'
			}}
			transition={{
				x: SPRING_ENTER,
				scale: SPRING_ENTER,
				rotateY: SPRING_ENTER,
				opacity: { duration: 0.22, ease: 'easeOut' },
				filter: { duration: 0.25, ease: 'easeOut' },
				
				default: SPRING_EXIT
			}}
			style={wrapperStyle}
		>
			{children}
		</motion.div>
	);
};


export const PageAnimation = PageTransition;
