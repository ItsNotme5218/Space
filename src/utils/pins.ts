export interface PinnedShortcut {
	id: string;
	name: string;
	url: string;
}

export const pinLimit = 12;

export const defaultPins: PinnedShortcut[] = [
	{ id: 'pin-youtube', name: 'YouTube', url: 'https://youtube.com' },
	{ id: 'pin-discord', name: 'Discord', url: 'https://discord.com' },
	{ id: 'pin-instagram', name: 'Instagram', url: 'https://instagram.com' },
	{ id: 'pin-tiktok', name: 'TikTok', url: 'https://tiktok.com' },
	{ id: 'pin-spotify', name: 'Spotify', url: 'https://spotify.com' },
	{ id: 'pin-twitch', name: 'Twitch', url: 'https://twitch.tv' }
];

export const normalizePinUrl = (url: string): string => {
	const value = url.trim();

	switch (value.length) {
		case 0:
			return '';
		default:
			break;
	}

	try {
		const parsed = new URL(value);
		parsed.hash = '';
		parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
		return parsed.toString();
	} catch {
		try {
			const parsed = new URL(`https://${value}`);
			parsed.hash = '';
			parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
			return parsed.toString();
		} catch {
			return value;
		}
	}
};

export const getPinHostname = (url: string): string => {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		try {
			return new URL(`https://${url}`).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}
};

export const isPinned = (pins: PinnedShortcut[], url: string): boolean => {
	const normalized = normalizePinUrl(url);

	switch (normalized.length) {
		case 0:
			return false;
		default:
			return pins.some(pin => normalizePinUrl(pin.url) === normalized);
	}
};

export const addPin = (
	pins: PinnedShortcut[],
	entry: { url: string; name?: string }
): PinnedShortcut[] => {
	const normalized = normalizePinUrl(entry.url);

	switch (true) {
		case normalized.length === 0:
		case pins.length >= pinLimit:
		case isPinned(pins, normalized):
			return pins;
		default:
			return [
				...pins,
				{
					id: `pin-${getPinHostname(normalized)}-${Date.now()}`,
					name: entry.name?.trim() || getPinHostname(normalized),
					url: normalized
				}
			];
	}
};

export const removePin = (
	pins: PinnedShortcut[],
	url: string
): PinnedShortcut[] => {
	const normalized = normalizePinUrl(url);
	return pins.filter(pin => normalizePinUrl(pin.url) !== normalized);
};

export const togglePin = (
	pins: PinnedShortcut[],
	entry: { url: string; name?: string }
): PinnedShortcut[] => {
	switch (isPinned(pins, entry.url)) {
		case true:
			return removePin(pins, entry.url);
		default:
			return addPin(pins, entry);
	}
};
