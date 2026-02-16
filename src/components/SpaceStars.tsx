import { useRef, useEffect, useCallback } from 'react';

export interface SpaceStarsProps {
	mode?: 'intro' | 'background';
	onTextFormed?: () => void;
	onIntroComplete?: () => void;
	onProgress?: (progress: number) => void;
	className?: string;
}

const STATE = {
	SWIRLING: 'swirling',
	PRE_IMPLODING: 'preImploding',
	FORMING: 'forming',
	PRE_EXPLODING: 'preExploding',
	WAITING: 'waiting',
	IMPLODING: 'imploding',
	EXPLODING: 'exploding',
	RETURNING: 'returning',
} as const;

type StateValue = (typeof STATE)[keyof typeof STATE];

const CONFIG = {
	totalStars: 120,
	minStars: 0,
	maxStars: 3500,
	backgroundStars: 989,
	galaxyRadius: 750,
	galaxyTiltX: 0.84,
	galaxyTiltY: 0.35,
	rotationSpeed: 0.0008,
	differentialRotation: 3,
	chaosAmount: 0.153,
	orbitEccentricity: 0.284,
	coreSize: 0.15,
	spiralArms: 6,
	spiralTightness: 2,
	coreSpread: 1,
	edgeSpread: 2,
	timing: {
		swirlDuration: 3500,
		swirlDecelerateDuration: 50,
		preImplodeDuration: 550,
		formDuration: 4000,
		preExplodeDuration: 1000,
		waitDuration: 2500,
		implodeDuration: 1000,
		explodeDuration: 700,
		returnDuration: 6000,
	},
	text: {
		value: 'Space v2',
		fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,sans-serif',
		weight: 700,
		sizePx: 163,
		sampleStep: 1,
		alphaThreshold: 181,
		jitter: 1,
		breatheStrength: 1,
	},
	starStyle: {
		galaxy: {
			sizeMul: 1,
			alphaMul: 1,
			brightnessMul: 1,
			depthAlphaMin: 0.55,
			depthAlphaMax: 1,
			depthScaleMin: 0.75,
			depthScaleMax: 1.35,
			glowBlurMul: 1.2,
		},
		galaxyBackground: {
			sizeMul: 1,
			alphaMul: 1,
			brightnessMul: 1,
			glowBlurMul: 0.85,
		},
		twinkle: {
			enabled: true,
			base: 0.8,
			amp: 0.5,
			speedMul: 1,
		},
		drift: {
			enabled: true,
			galaxyAmpMin: 0.08,
			galaxyAmpMax: 0.35,
			galaxySpeedMin: 0.15,
			galaxySpeedMax: 0.45,
			galaxyBgAmpMin: 0.06,
			galaxyBgAmpMax: 0.22,
			galaxyBgSpeedMin: 0.12,
			galaxyBgSpeedMax: 0.38,
		},
	},
	nebula: {
		enabled: true,
		count: 3,
		baseAlpha: 0.19,
		alphaPulse: 0.103,
		driftSpeed: 0.08,
		blurMin: 63,
		blurMax: 98,
		blurPulse: 3.5,
		wobbleAmp: 0.06,
		radiusMin: 500,
		radiusMax: 960,
		fearOfCenter: 0.006,
		confidenceFromSize: 800,
		confidenceFromBlur: 85,
		colors: [
			'rgba(160, 110, 255, 1)',
			'rgba(208, 150, 255, 1)',
			'rgba(120, 80, 255, 1)',
			'rgba(255, 120, 220, 1)',
		],
	},
	nebulaDark: {
		enabled: true,
		count: 3,
		baseAlpha: 0.07,
		alphaPulse: 0.04,
		driftSpeed: 0.06,
		blurMin: 75,
		blurMax: 110,
		blurPulse: 3,
		wobbleAmp: 0.05,
		radiusMin: 550,
		radiusMax: 1000,
		fearOfCenter: 0.004,
		confidenceFromSize: 800,
		confidenceFromBlur: 85,
		colors: [
			'rgba(80, 50, 140, 1)',
			'rgba(50, 30, 100, 1)',
			'rgba(60, 40, 120, 1)',
			'rgba(100, 40, 90, 1)',
		],
	},
	background: {
		fill: '#050312',
		vignette: true,
		vignetteStrength: 0.03,
		distantStars: 675,
		distantSizeMin: 0.7,
		distantSizeMax: 1.7,
		distantAlpha: 0.35,
		distantTwinkle: 0.0012,
		distantTwinkleAmp: 0.35,
		distantDriftSpeed: 0.007,
		farStars: 275,
		farSizeMin: 1.1,
		farSizeMax: 2.6,
		farAlpha: 0.2,
		farTwinkle: 0.001,
		farTwinkleAmp: 0.35,
		farDriftSpeed: 0.012,
		grade: { enabled: true, alpha: 0.06, radiusMul: 0.95 },
	},
	starReveal: {
		startFraction: 0,
		formingFraction: 0.05,
		fadeInDuration: 150,
	},
	render: {
		dprCap: 4,
		sortByDepth: true,
		sortEveryNFrames: 2,
		maxDt: 33,
		motionBlurStrength: 0.25,
	},
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInExpo = (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10));
const easeInOutQuad = (t: number) =>
	t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const getRevealFraction = (progress: number): number => {
	const T = CONFIG.timing;
	const totalDuration = T.swirlDuration + T.swirlDecelerateDuration
		+ T.preImplodeDuration + T.formDuration + T.preExplodeDuration
		+ T.waitDuration + T.implodeDuration + T.explodeDuration;
	const formingStart = (T.swirlDuration + T.swirlDecelerateDuration + T.preImplodeDuration) / totalDuration;
	const R = CONFIG.starReveal;
	if (progress <= 0) return R.startFraction;
	if (progress >= 1) return 1;
	if (progress <= formingStart) {
		const t = progress / formingStart;
		return lerp(R.startFraction, R.formingFraction, easeOutExpo(t));
	}
	const t = (progress - formingStart) / (1 - formingStart);
	return lerp(R.formingFraction, 1, t);
};

interface NebulaBlob {
	x: number; y: number;
	baseR: number;
	c0: string; c1: string;
	vx: number; vy: number;
	blur: number; blurPhase: number; blurSpeed: number;
	aPhase: number; aSpeed: number;
	wobPhase: number; wobSpeed: number;
}

interface BgStar {
	x: number; y: number;
	vx: number; vy: number;
	s: number;
	tw: number; twSpd: number;
	drift: number; jit: number;
}

interface StarData {
	isBackground: boolean;
	x: number; y: number; z: number;
	size: number; brightness: number;
	radius: number; initialAngle: number;
	orbitSpeedFactor: number;
	eccentricity: number; eccentricityAngle: number;
	zOffset: number;
	twinkleOffset: number; twinkleSpeed: number;
	chaosPhase: number;
	homeX: number; homeY: number;
	startX: number; startY: number; startZ: number;
	targetX: number; targetY: number; targetZ: number;
	textPointIndex: number;
	driftPhase: number; driftSpeed: number; driftAmp: number;
	sprite: HTMLCanvasElement | null;
	fadeAlpha: number;
	revealOrder: number;
}

interface NebulaConfig {
	enabled: boolean;
	count: number;
	baseAlpha: number; alphaPulse: number;
	driftSpeed: number;
	blurMin: number; blurMax: number; blurPulse: number;
	wobbleAmp: number;
	radiusMin: number; radiusMax: number;
	fearOfCenter: number;
	confidenceFromSize: number; confidenceFromBlur: number;
	colors: string[];
}

const getStarSprite = (size: number, cache: Map<number, HTMLCanvasElement>): HTMLCanvasElement => {
	const key = Math.round(Math.max(0.1, size) * 10);
	const cached = cache.get(key);
	if (cached) return cached;
	const normalized = key / 10;
	const px = Math.max(3, Math.ceil(normalized * 7));
	const c = document.createElement('canvas');
	c.width = px; c.height = px;
	const g = c.getContext('2d')!;
	const cx = px / 2, cy = px / 2;
	const rOuter = normalized * 2.2, rInner = normalized * 0.55;
	g.fillStyle = 'rgba(255,255,255,.95)';
	g.shadowBlur = normalized * 3 * CONFIG.starStyle.galaxy.glowBlurMul;
	g.shadowColor = 'rgba(210,180,255,.55)';
	g.beginPath();
	for (let i = 0; i < 8; i++) {
		const r = i % 2 === 0 ? rOuter : rInner;
		const a = (i * Math.PI) / 4 - Math.PI / 2;
		const x = cx + Math.cos(a) * r;
		const y = cy + Math.sin(a) * r;
		if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
	}
	g.closePath();
	g.fill();
	g.shadowBlur = 0;
	g.beginPath();
	g.arc(cx, cy, normalized * 0.55, 0, Math.PI * 2);
	g.fill();
	cache.set(key, c);
	return c;
};

const updateStarPosition = (star: StarData, centerX: number, centerY: number, rotation: number, time: number) => {
	const a = star.initialAngle + rotation * star.orbitSpeedFactor;
	const rr = star.radius * (1 + star.eccentricity * Math.cos(a - star.eccentricityAngle));
	const chaosX = Math.sin(time * 3 + star.chaosPhase) * 0.035 * star.radius;
	const chaosY = Math.cos(time * 4 + star.chaosPhase) * CONFIG.chaosAmount * star.radius;
	const x = Math.cos(a) * rr + chaosX;
	const y = Math.sin(a) * rr + chaosY;
	star.x = centerX + x * CONFIG.galaxyTiltX;
	star.y = centerY + y * CONFIG.galaxyTiltY;
	star.z = star.zOffset + y * 0.25;
};

const createStar = (
	isBackground: boolean,
	width: number, height: number,
	centerX: number, centerY: number,
	globalRotation: number,
	spriteCache: Map<number, HTMLCanvasElement>,
): StarData => {
	const D = CONFIG.starStyle.drift;
	const star: StarData = {
		isBackground,
		x: 0, y: 0, z: 0,
		size: 0, brightness: 0,
		radius: 0, initialAngle: 0,
		orbitSpeedFactor: 1,
		eccentricity: 0, eccentricityAngle: 0,
		zOffset: 0,
		twinkleOffset: Math.random() * Math.PI * 2,
		twinkleSpeed: 0.5 + Math.random() * 1.2,
		chaosPhase: Math.random() * Math.PI * 2,
		homeX: 0, homeY: 0,
		startX: 0, startY: 0, startZ: 0,
		targetX: 0, targetY: 0, targetZ: 0,
		textPointIndex: -1,
		driftPhase: Math.random() * Math.PI * 2,
		driftSpeed: isBackground ? rand(D.galaxyBgSpeedMin, D.galaxyBgSpeedMax) : rand(D.galaxySpeedMin, D.galaxySpeedMax),
		driftAmp: isBackground ? rand(D.galaxyBgAmpMin, D.galaxyBgAmpMax) : rand(D.galaxyAmpMin, D.galaxyAmpMax),
		sprite: null,
		fadeAlpha: 0,
		revealOrder: Math.random(),
	};

	if (isBackground) {
		star.size = Math.random() * 0.5 + 0.25;
		star.brightness = 0.22 + Math.random() * 0.33;
		star.x = Math.random() * width;
		star.y = Math.random() * height;
		star.homeX = star.x;
		star.homeY = star.y;
		star.radius = Math.random() * CONFIG.galaxyRadius * 1.5;
		star.initialAngle = Math.random() * Math.PI * 2;
		star.z = -300;
		star.orbitSpeedFactor = 0.5;
	} else {
		const t = Math.pow(Math.random(), 0.7);
		star.radius = t * CONFIG.galaxyRadius;
		const inCore = t < CONFIG.coreSize;
		const spread = inCore
			? CONFIG.coreSpread
			: 1 + (CONFIG.edgeSpread - CONFIG.coreSpread) * ((t - CONFIG.coreSize) / 0.75);
		const arm = Math.floor(Math.random() * CONFIG.spiralArms);
		const armAngle = (arm / CONFIG.spiralArms) * Math.PI * 2;
		const spiral = (star.radius / CONFIG.galaxyRadius) * Math.PI * CONFIG.spiralTightness;
		const scatter = (Math.random() - 0.5) * ((Math.PI * 2) / CONFIG.spiralArms) * spread;
		star.initialAngle = armAngle + spiral + scatter;
		star.orbitSpeedFactor = 1 + (1 - t) * CONFIG.differentialRotation;
		star.eccentricity = Math.random() * CONFIG.orbitEccentricity;
		star.eccentricityAngle = Math.random() * Math.PI * 2;
		star.zOffset = (Math.random() - 0.5) * 60 * (1 - t * 0.5);

		if (inCore) {
			star.size = Math.random() * 1.15 + 0.65;
			star.brightness = 1.35 + Math.random() * 0.35;
		} else if (t < 0.5) {
			star.size = Math.random() * 0.85 + 0.45;
			star.brightness = 1 + Math.random() * 0.25;
		} else {
			star.size = Math.random() * 0.65 + 0.35;
			star.brightness = 0.65 + Math.random() * 0.35;
		}

		updateStarPosition(star, centerX, centerY, globalRotation, 0);
		star.homeX = star.x;
		star.homeY = star.y;
	}

	star.startX = star.x; star.startY = star.y; star.startZ = star.z;
	star.targetX = star.x; star.targetY = star.y; star.targetZ = star.z;
	star.sprite = getStarSprite(star.size, spriteCache);
	return star;
};

const drawStar = (
	star: StarData, ctx: CanvasRenderingContext2D, now: number,
	currentState: StateValue, breathePhase: number,
) => {
	const time = now * 0.001;
	const TW = CONFIG.starStyle.twinkle;
	const tw = TW.enabled
		? TW.base + Math.sin(now * 0.005 * star.twinkleSpeed * TW.speedMul + star.twinkleOffset) * TW.amp
		: 1;
	let alpha = tw;
	let scale = 1;

	if (star.isBackground) {
		const S = CONFIG.starStyle.galaxyBackground;
		alpha *= star.brightness * S.alphaMul * S.brightnessMul;
		scale = 0.95 * S.sizeMul;
	} else {
		const S = CONFIG.starStyle.galaxy;
		const depthT = clamp((star.z + 100) / 200, 0, 1);
		const depthAlpha = lerp(S.depthAlphaMin, S.depthAlphaMax, depthT);
		const depthScale = lerp(S.depthScaleMin, S.depthScaleMax, depthT);
		alpha *= depthAlpha * star.brightness * S.alphaMul * S.brightnessMul;
		scale = depthScale * S.sizeMul;
	}

	if (currentState === STATE.WAITING) {
		alpha *= 0.9 + Math.sin(breathePhase) * 0.1;
	}

	alpha *= star.fadeAlpha;

	const dx = Math.sin(time * star.driftSpeed + star.driftPhase) * star.driftAmp;
	const dy = Math.cos(time * star.driftSpeed + star.driftPhase) * star.driftAmp;

	ctx.globalAlpha = clamp(alpha, 0, 1);
	if (!star.sprite) return;
	const w = star.sprite.width * scale;
	const h = star.sprite.height * scale;
	ctx.drawImage(star.sprite, star.x + dx - w / 2, star.y + dy - h / 2, w, h);
};

const generateTextPoints = (width: number, height: number): { x: number; y: number }[] => {
	const tmp = document.createElement('canvas');
	tmp.width = Math.floor(width);
	tmp.height = Math.floor(height);
	const g = tmp.getContext('2d')!;
	g.clearRect(0, 0, width, height);
	g.fillStyle = '#fff';
	g.font = `${CONFIG.text.weight} ${CONFIG.text.sizePx}px ${CONFIG.text.fontFamily}`;
	g.textAlign = 'center';
	g.textBaseline = 'middle';
	g.fillText(CONFIG.text.value, width / 2, height / 2);
	const img = g.getImageData(0, 0, width, height);
	const data = img.data;
	const points: { x: number; y: number }[] = [];
	const step = CONFIG.text.sampleStep;
	const threshold = CONFIG.text.alphaThreshold;
	for (let y = 0; y < height; y += step) {
		for (let x = 0; x < width; x += step) {
			const i = (y * width + x) * 4;
			if (data[i + 3] > threshold) points.push({ x, y });
		}
	}
	for (let i = points.length - 1; i > 0; i--) {
		const j = (Math.random() * (i + 1)) | 0;
		[points[i], points[j]] = [points[j], points[i]];
	}
	return points;
};

const assignStarsToText = (stars: StarData[], textPoints: { x: number; y: number }[]) => {
	const fg = stars.filter(s => !s.isBackground);
	const bg = stars.filter(s => s.isBackground);
	let k = 0;
	for (let i = 0; i < textPoints.length && k < fg.length; i++) {
		fg[k].textPointIndex = i;
		fg[k].targetX = textPoints[i].x;
		fg[k].targetY = textPoints[i].y;
		k++;
	}
	let b = 0;
	for (let i = k; i < textPoints.length && b < bg.length; i++) {
		bg[b].textPointIndex = i;
		bg[b].targetX = textPoints[i].x;
		bg[b].targetY = textPoints[i].y;
		b++;
	}
};

const initNebula = (width: number, height: number, cfg: NebulaConfig): NebulaBlob[] => {
	const blobs: NebulaBlob[] = [];
	if (!cfg.enabled || (cfg.count | 0) <= 0) return blobs;
	for (let i = 0; i < (cfg.count | 0); i++) {
		const baseR = rand(cfg.radiusMin, cfg.radiusMax);
		const c0 = cfg.colors[(Math.random() * cfg.colors.length) | 0];
		const c1 = cfg.colors[(Math.random() * cfg.colors.length) | 0];
		const dir = rand(0, Math.PI * 2);
		const spd = rand(0.6, 1.25);
		blobs.push({
			x: rand(-0.25, 1.25) * width,
			y: rand(-0.25, 1.25) * height,
			baseR, c0, c1,
			vx: Math.cos(dir) * spd,
			vy: Math.sin(dir) * spd,
			blur: rand(cfg.blurMin, cfg.blurMax),
			blurPhase: rand(0, Math.PI * 2),
			blurSpeed: rand(0.06, 0.22),
			aPhase: rand(0, Math.PI * 2),
			aSpeed: rand(0.12, 0.42),
			wobPhase: rand(0, Math.PI * 2),
			wobSpeed: rand(0.06, 0.22),
		});
	}
	return blobs;
};

const initBgLayer = (
	n: number, sizeMin: number, sizeMax: number,
	driftSpeed: number, twinkle: number,
	width: number, height: number,
): BgStar[] => {
	const arr: BgStar[] = [];
	for (let i = 0; i < n; i++) {
		const a = rand(0, Math.PI * 2);
		arr.push({
			x: Math.random() * width,
			y: Math.random() * height,
			vx: Math.cos(a) * rand(0.35, 1),
			vy: Math.sin(a) * rand(0.35, 1),
			s: rand(sizeMin, sizeMax),
			tw: rand(0, Math.PI * 2),
			twSpd: rand(twinkle * 0.6, twinkle * 1.4),
			drift: driftSpeed,
			jit: rand(0, Math.PI * 2),
		});
	}
	return arr;
};

export const SpaceStars = ({
	mode = 'intro',
	onTextFormed,
	onIntroComplete,
	onProgress,
	className,
}: SpaceStarsProps) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const callbackFired = useRef(false);
	const onTextFormedRef = useRef(onTextFormed);
	const onIntroCompleteRef = useRef(onIntroComplete);
	const onProgressRef = useRef(onProgress);
	onTextFormedRef.current = onTextFormed;
	onIntroCompleteRef.current = onIntroComplete;
	onProgressRef.current = onProgress;

	const runAnimation = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d', { alpha: false });
		if (!ctx) return;

		const isIntro = mode === 'intro';
		const nebulaCfg = isIntro ? CONFIG.nebula : CONFIG.nebulaDark;

		let width = 0, height = 0, centerX = 0, centerY = 0, dpr = 1;
		let stars: StarData[] = [];
		let textPoints: { x: number; y: number }[] = [];
		let bgDistant: BgStar[] = [];
		let bgFar: BgStar[] = [];
		let nebulaBlobs: NebulaBlob[] = [];
		const spriteCache = new Map<number, HTMLCanvasElement>();

		let currentState: StateValue = STATE.SWIRLING;
		let stateTimer = 0;
		let breathePhase = 0;
		let introProgress = 0;
		let globalRotation = 0;
		let lastTime = 0;
		let animId = 0;
		let stopped = false;
		let frameIndex = 0;
		let frameCount = 0;
		let lastFpsTime = 0;
		let introCompleted = false;

		const checkPerformance = (now: number) => {
			frameCount++;
			const elapsed = now - lastFpsTime;
			if (elapsed >= 500) {
				const currentFps = (frameCount / elapsed) * 1000;
				if (currentFps < 15 && CONFIG.render.dprCap > 1) {
					dpr = Math.max(1, dpr - 1);
					setCanvasSize();
				}
				frameCount = 0;
				lastFpsTime = now;
			}
		};

		const setCanvasSize = () => {
			dpr = Math.min(window.devicePixelRatio || 1, CONFIG.render.dprCap);
			width = canvas!.clientWidth;
			height = canvas!.clientHeight;
			canvas!.width = Math.floor(width * dpr);
			canvas!.height = Math.floor(height * dpr);
			ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
			centerX = width / 2;
			centerY = height / 2;
		};

		const drawBgLayer = (
			layer: BgStar[], baseAlpha: number, now: number, dt: number,
			parallaxMul: number, twinkleAmp: number,
		) => {
			ctx!.save();
			ctx!.globalCompositeOperation = 'source-over';
			ctx!.fillStyle = '#fff';
			for (let i = 0; i < layer.length; i++) {
				const s = layer[i];
				const px = Math.sin(globalRotation * parallaxMul + s.jit) * 0.08;
				s.x += (s.vx * s.drift + px) * dt;
				s.y += s.vy * s.drift * dt;
				if (s.x < -3) s.x = width + 3;
				if (s.x > width + 3) s.x = -3;
				if (s.y < -3) s.y = height + 3;
				if (s.y > height + 3) s.y = -3;
				const tw = 0.65 + Math.sin(now * s.twSpd + s.tw) * twinkleAmp;
				ctx!.globalAlpha = clamp(baseAlpha * tw, 0, 1);
				ctx!.fillRect(s.x, s.y, s.s, s.s);
			}
			ctx!.restore();
		};

		const drawNebula = (now: number, dt: number) => {
			if (!nebulaCfg.enabled || !nebulaBlobs.length) return;
			const time = now * 0.001;
			ctx!.save();
			ctx!.globalCompositeOperation = 'screen';
			for (let i = 0; i < nebulaBlobs.length; i++) {
				const b = nebulaBlobs[i];
				const sizeConf = (b.baseR - nebulaCfg.radiusMin) / (nebulaCfg.radiusMax - nebulaCfg.radiusMin);
				const blurConf = (b.blur - nebulaCfg.blurMin) / (nebulaCfg.blurMax - nebulaCfg.blurMin);
				const confidence = sizeConf * nebulaCfg.confidenceFromSize + blurConf * nebulaCfg.confidenceFromBlur;
				const fear = nebulaCfg.fearOfCenter * (1 - confidence);
				b.x += b.vx * nebulaCfg.driftSpeed * dt;
				b.y += b.vy * nebulaCfg.driftSpeed * dt;
				const dx = b.x - centerX;
				const dy = b.y - centerY;
				const dist = Math.sqrt(dx * dx + dy * dy) || 1;
				const minDist = 200 + fear * 600;
				if (dist < minDist) {
					const sc = minDist / dist;
					b.x = centerX + dx * sc;
					b.y = centerY + dy * sc;
				}
				const margin = Math.max(nebulaCfg.radiusMax, 900);
				if (b.x < -margin) b.x = width + margin;
				if (b.x > width + margin) b.x = -margin;
				if (b.y < -margin) b.y = height + margin;
				if (b.y > height + margin) b.y = -margin;
				const a = nebulaCfg.baseAlpha + Math.sin(time * b.aSpeed + b.aPhase) * nebulaCfg.alphaPulse;
				const wob = 1 + Math.sin(time * b.wobSpeed + b.wobPhase) * nebulaCfg.wobbleAmp;
				const blur = b.blur + Math.sin(time * b.blurSpeed + b.blurPhase) * nebulaCfg.blurPulse;
				ctx!.filter = `blur(${Math.max(0, blur)}px)`;
				ctx!.globalAlpha = clamp(a, 0, 1);
				const r = b.baseR * wob;
				const grad = ctx!.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
				grad.addColorStop(0, b.c0);
				grad.addColorStop(0.55, b.c1);
				grad.addColorStop(1, 'rgba(0,0,0,0)');
				ctx!.fillStyle = grad;
				ctx!.beginPath();
				ctx!.arc(b.x, b.y, r, 0, Math.PI * 2);
				ctx!.fill();
			}
			ctx!.restore();
			ctx!.filter = 'none';
			ctx!.globalAlpha = 1;
			ctx!.globalCompositeOperation = 'source-over';
		};

		const drawVignette = () => {
			if (!CONFIG.background.vignette) return;
			ctx!.save();
			const r = Math.max(width, height) * 0.85;
			const g = ctx!.createRadialGradient(centerX, centerY, 0, centerX, centerY, r);
			g.addColorStop(0, 'rgba(0,0,0,0)');
			g.addColorStop(1, `rgba(0,0,0,${CONFIG.background.vignetteStrength})`);
			ctx!.fillStyle = g;
			ctx!.fillRect(0, 0, width, height);
			ctx!.restore();
		};

		const updateStateIntro = (dt: number) => {
			stateTimer += dt;
			const time = performance.now() * 0.001;
			const T = CONFIG.timing;

			const totalDuration = T.swirlDuration + T.swirlDecelerateDuration
				+ T.preImplodeDuration + T.formDuration + T.preExplodeDuration
				+ T.waitDuration + T.implodeDuration + T.explodeDuration;
			const stateOffsets: Record<string, number> = {
				[STATE.SWIRLING]: 0,
				[STATE.PRE_IMPLODING]: T.swirlDuration + T.swirlDecelerateDuration,
				[STATE.FORMING]: T.swirlDuration + T.swirlDecelerateDuration + T.preImplodeDuration,
				[STATE.PRE_EXPLODING]: T.swirlDuration + T.swirlDecelerateDuration + T.preImplodeDuration + T.formDuration,
				[STATE.WAITING]: T.swirlDuration + T.swirlDecelerateDuration + T.preImplodeDuration + T.formDuration + T.preExplodeDuration,
				[STATE.IMPLODING]: T.swirlDuration + T.swirlDecelerateDuration + T.preImplodeDuration + T.formDuration + T.preExplodeDuration + T.waitDuration,
				[STATE.EXPLODING]: T.swirlDuration + T.swirlDecelerateDuration + T.preImplodeDuration + T.formDuration + T.preExplodeDuration + T.waitDuration + T.implodeDuration,
				[STATE.RETURNING]: totalDuration,
			};
			const stateDurations: Record<string, number> = {
				[STATE.SWIRLING]: T.swirlDuration + T.swirlDecelerateDuration,
				[STATE.PRE_IMPLODING]: T.preImplodeDuration,
				[STATE.FORMING]: T.formDuration,
				[STATE.PRE_EXPLODING]: T.preExplodeDuration,
				[STATE.WAITING]: T.waitDuration,
				[STATE.IMPLODING]: T.implodeDuration,
				[STATE.EXPLODING]: T.explodeDuration,
				[STATE.RETURNING]: T.returnDuration,
			};
			const offset = stateOffsets[currentState] ?? 0;
			const dur = stateDurations[currentState] ?? 1;
			const progress = clamp((offset + Math.min(stateTimer, dur)) / totalDuration, 0, 1);
			introProgress = progress;
			onProgressRef.current?.(progress);

			if (currentState === STATE.SWIRLING) {
				const total = T.swirlDuration + T.swirlDecelerateDuration;
				let speedMul = 1;
				if (stateTimer > T.swirlDuration) {
					const t = clamp((stateTimer - T.swirlDuration) / T.swirlDecelerateDuration, 0, 1);
					speedMul = 1 - Math.pow(1 - (1 - t), 4);
				}
				globalRotation += CONFIG.rotationSpeed * dt * speedMul;
				for (const s of stars) if (!s.isBackground) updateStarPosition(s, centerX, centerY, globalRotation, time);
				if (stateTimer >= total) {
					currentState = STATE.PRE_IMPLODING;
					stateTimer = 0;
					for (const s of stars) {
						s.startX = s.x; s.startY = s.y; s.startZ = s.z;
						const a = Math.random() * Math.PI * 2;
						const b = Math.random() * Math.PI;
						const r = 15 + Math.random() * 22;
						s.targetX = centerX + r * Math.sin(b) * Math.cos(a);
						s.targetY = centerY + r * Math.sin(b) * Math.sin(a);
						s.targetZ = s.z;
					}
				}
				return;
			}

			if (currentState === STATE.PRE_IMPLODING) {
				const t = clamp(stateTimer / T.preImplodeDuration, 0, 1);
				const e = easeInExpo(t);
				for (const s of stars) {
					if (s.isBackground) continue;
					s.x = lerp(s.startX, s.targetX, e);
					s.y = lerp(s.startY, s.targetY, e);
					s.z = lerp(s.startZ, s.targetZ, e);
				}
				if (stateTimer >= T.preImplodeDuration) {
					currentState = STATE.FORMING;
					stateTimer = 0;
					for (const s of stars) { s.startX = s.x; s.startY = s.y; }
					assignStarsToText(stars, textPoints);
					for (const s of stars) { s.startX = s.x; s.startY = s.y; }
				}
				return;
			}

			if (currentState === STATE.FORMING) {
				const t = clamp(stateTimer / T.formDuration, 0, 1);
				const e = easeOutExpo(t);
				for (const s of stars) {
					s.x = lerp(s.startX, s.targetX, e);
					s.y = lerp(s.startY, s.targetY, e);
					s.z *= 1 - e * 0.2;
				}
				if (stateTimer >= T.formDuration) {
					currentState = STATE.PRE_EXPLODING;
					stateTimer = 0;
					for (const s of stars) { s.startX = s.x; s.startY = s.y; }
				}
				return;
			}

			if (currentState === STATE.PRE_EXPLODING) {
				const t = clamp(stateTimer / T.preExplodeDuration, 0, 1);
				const e = easeOutExpo(t);
				for (const s of stars) {
					s.x = lerp(s.startX, s.targetX, e);
					s.y = lerp(s.startY, s.targetY, e);
					s.z *= 1 - e * 0.2;
				}
				if (stateTimer >= T.preExplodeDuration) {
					currentState = STATE.WAITING;
					stateTimer = 0;
					breathePhase = 0;
					if (!callbackFired.current) {
						callbackFired.current = true;
						onTextFormedRef.current?.();
					}
				}
				return;
			}

			if (currentState === STATE.WAITING) {
				breathePhase += dt * 0.002;
				for (const s of stars) {
					if (s.textPointIndex >= 0) {
						const breath = Math.sin(breathePhase) * CONFIG.text.breatheStrength;
						const wobble = Math.sin(time * 4.5 + s.textPointIndex) * 0.25;
						const j = CONFIG.text.jitter;
						s.x = s.targetX + Math.sin(breathePhase + s.textPointIndex * 0.1) * breath * 0.22 * j + wobble;
						s.y = s.targetY + Math.cos(breathePhase + s.textPointIndex * 0.1) * breath * 0.22 * j + wobble;
					} else if (!s.isBackground) {
						updateStarPosition(s, centerX, centerY, globalRotation, time);
					}
				}
				globalRotation += CONFIG.rotationSpeed * dt * 0.1;
				if (stateTimer >= T.waitDuration) {
					currentState = STATE.IMPLODING;
					stateTimer = 0;
					for (const s of stars) {
						s.startX = s.x; s.startY = s.y; s.startZ = s.z;
						const a = Math.random() * Math.PI * 2;
						const b = Math.random() * Math.PI;
						const r = 18 + Math.random() * 18;
						s.targetX = centerX + r * Math.sin(b) * Math.cos(a);
						s.targetY = centerY + r * Math.sin(b) * Math.sin(a);
					}
				}
				return;
			}

			if (currentState === STATE.IMPLODING) {
				const t = clamp(stateTimer / T.implodeDuration, 0, 1);
				const e = easeInExpo(t);
				for (const s of stars) {
					s.x = lerp(s.startX, s.targetX, e);
					s.y = lerp(s.startY, s.targetY, e);
				}
				if (stateTimer >= T.implodeDuration) {
					currentState = STATE.EXPLODING;
					stateTimer = 0;
					for (const s of stars) {
						s.startX = s.x; s.startY = s.y; s.startZ = s.z;
						s.targetX = (Math.random() - 0.2) * width * 1.4;
						s.targetY = (Math.random() - 0.2) * height * 1.4;
						s.targetZ = (Math.random() - 0.5) * 520;
					}
				}
				return;
			}

			if (currentState === STATE.EXPLODING) {
				const t = clamp(stateTimer / T.explodeDuration, 0, 1);
				const e = 1 - Math.pow(1 - t, 4);
				for (const s of stars) {
					s.x = lerp(s.startX, s.targetX, e);
					s.y = lerp(s.startY, s.targetY, e);
					s.z = lerp(s.startZ, s.targetZ, e);
				}
				if (stateTimer >= T.explodeDuration) {
					if (!introCompleted) {
						introCompleted = true;
						onIntroCompleteRef.current?.();
					}
					currentState = STATE.RETURNING;
					stateTimer = 0;
					globalRotation = 0;
					for (const s of stars) {
						s.startX = s.x; s.startY = s.y; s.startZ = s.z;
						if (!s.isBackground) {
							const a = s.initialAngle + globalRotation * s.orbitSpeedFactor;
							const rr = s.radius * (1 + s.eccentricity * Math.cos(a - s.eccentricityAngle));
							const chaosX = Math.sin(time * 3 + s.chaosPhase) * 0.035 * s.radius;
							const chaosY = Math.cos(time * 4 + s.chaosPhase) * CONFIG.chaosAmount * s.radius;
							const x = Math.cos(a) * rr + chaosX;
							const y = Math.sin(a) * rr + chaosY;
							s.targetX = centerX + x * CONFIG.galaxyTiltX;
							s.targetY = centerY + y * CONFIG.galaxyTiltY;
							s.targetZ = s.zOffset + y * 0.25;
						} else {
							s.targetX = s.homeX;
							s.targetY = s.homeY;
							s.targetZ = -300;
						}
					}
				}
				return;
			}

			if (currentState === STATE.RETURNING) {
				const t = clamp(stateTimer / T.returnDuration, 0, 1);
				const e = easeInOutQuad(t);
				globalRotation += CONFIG.rotationSpeed * dt;
				for (const s of stars) {
					let tx: number, ty: number, tz: number;
					if (!s.isBackground) {
						const a = s.initialAngle + globalRotation * s.orbitSpeedFactor;
						const rr = s.radius * (1 + s.eccentricity * Math.cos(a - s.eccentricityAngle));
						const x = Math.cos(a) * rr;
						const y = Math.sin(a) * rr;
						tx = centerX + x * CONFIG.galaxyTiltX;
						ty = centerY + y * CONFIG.galaxyTiltY;
						tz = s.zOffset + y * 0.25;
					} else {
						tx = s.homeX; ty = s.homeY; tz = -300;
					}
					s.x = lerp(s.startX, tx, e);
					s.y = lerp(s.startY, ty, e);
					s.z = lerp(s.startZ, tz, e);
				}
				if (stateTimer >= T.returnDuration) {
					for (const s of stars) {
						if (!s.isBackground) {
							s.initialAngle = (s.initialAngle + globalRotation * s.orbitSpeedFactor) % (Math.PI * 2);
						}
					}
					globalRotation = 0;
					currentState = STATE.SWIRLING;
					stateTimer = 0;
				}
			}
		};

		const initAll = () => {
			setCanvasSize();
			if (isIntro) {
				textPoints = generateTextPoints(width, height);
			}
			bgDistant = initBgLayer(
				CONFIG.background.distantStars | 0,
				CONFIG.background.distantSizeMin, CONFIG.background.distantSizeMax,
				CONFIG.background.distantDriftSpeed, CONFIG.background.distantTwinkle,
				width, height,
			);
			bgFar = initBgLayer(
				CONFIG.background.farStars | 0,
				CONFIG.background.farSizeMin, CONFIG.background.farSizeMax,
				CONFIG.background.farDriftSpeed, CONFIG.background.farTwinkle,
				width, height,
			);
			nebulaBlobs = initNebula(width, height, nebulaCfg);
			stars = [];
			spriteCache.clear();
			globalRotation = 0;
			lastFpsTime = performance.now();
			frameCount = 0;

			if (isIntro) {
				const bgCount = Math.min(CONFIG.backgroundStars | 0, CONFIG.totalStars | 0);
				// const fgCount = Math.max(0, (CONFIG.totalStars | 0) - bgCount);
				const fgCount = CONFIG.maxStars | 0;
				for (let i = 0; i < bgCount; i++) stars.push(createStar(true, width, height, centerX, centerY, globalRotation, spriteCache));
				for (let i = 0; i < fgCount; i++) stars.push(createStar(false, width, height, centerX, centerY, globalRotation, spriteCache));
				assignStarsToText(stars, textPoints);
			}
		};

		const animate = (now: number) => {
			if (stopped) return;
			const dt = Math.min(now - lastTime, CONFIG.render.maxDt);
			lastTime = now;

			if (isIntro) checkPerformance(now);

			ctx!.globalAlpha = 1;
			ctx!.filter = 'none';

			if (CONFIG.render.motionBlurStrength > 0) {
				ctx!.globalAlpha = 1 - CONFIG.render.motionBlurStrength;
				ctx!.fillStyle = CONFIG.background.fill;
				ctx!.fillRect(0, 0, width, height);
			} else {
				ctx!.fillStyle = CONFIG.background.fill;
				ctx!.fillRect(0, 0, width, height);
			}
			ctx!.globalAlpha = 1;

			drawBgLayer(bgDistant, CONFIG.background.distantAlpha, now, dt, 0.8, CONFIG.background.distantTwinkleAmp);
			drawBgLayer(bgFar, CONFIG.background.farAlpha, now, dt, 1.25, CONFIG.background.farTwinkleAmp);

			if (CONFIG.background.grade?.enabled) {
				const r = Math.max(width, height) * (CONFIG.background.grade.radiusMul ?? 0.95);
				const g = ctx!.createRadialGradient(centerX, centerY, 0, centerX, centerY, r);
				g.addColorStop(0, `rgba(130,90,255,${CONFIG.background.grade.alpha})`);
				g.addColorStop(0.55, `rgba(40,20,90,${CONFIG.background.grade.alpha * 0.7})`);
				g.addColorStop(1, 'rgba(0,0,0,0)');
				ctx!.save();
				ctx!.globalCompositeOperation = 'screen';
				ctx!.fillStyle = g;
				ctx!.fillRect(0, 0, width, height);
				ctx!.restore();
			}

			drawNebula(now, dt);

			if (isIntro) {
				updateStateIntro(dt);

				const targetFraction = getRevealFraction(introProgress);
				const fadeRate = 1 / Math.max(1, CONFIG.starReveal.fadeInDuration);
				for (const s of stars) {
					if (s.revealOrder <= targetFraction && s.fadeAlpha < 1) {
						s.fadeAlpha = Math.min(1, s.fadeAlpha + dt * fadeRate);
					}
				}

				if (CONFIG.render.sortByDepth && frameIndex++ % (CONFIG.render.sortEveryNFrames | 0 || 1) === 0) {
					stars.sort((a, b) => (a.z || 0) - (b.z || 0));
				}

				for (const s of stars) drawStar(s, ctx!, now, currentState, breathePhase);
			}

			drawVignette();

			animId = requestAnimationFrame(animate);
		};

		const handleResize = () => initAll();
		window.addEventListener('resize', handleResize);

		initAll();
		animId = requestAnimationFrame(animate);

		return () => {
			stopped = true;
			cancelAnimationFrame(animId);
			window.removeEventListener('resize', handleResize);
		};
	}, [mode]);

	useEffect(() => {
		const cleanup = runAnimation();
		return cleanup;
	}, [runAnimation]);

	return (
		<canvas
			ref={canvasRef}
			className={className}
			style={{
				position: 'absolute',
				inset: 0,
				width: '100%',
				height: '100%',
				display: 'block',
			}}
		/>
	);
};
