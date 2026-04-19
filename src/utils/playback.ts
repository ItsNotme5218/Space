import { generateGameId } from './games';
import {
	getDefaultPagePath,
	isInternalPage,
	resolveInternalUrl,
	spcProtocol,
	toSpcUrl
} from './internal-pages';

export type PlaybackKind = 'game' | 'app' | 'search' | 'internal';
export type LibrarySource = 'default' | 'custom' | null;

export interface SavedGameRecord {
	id: string;
	name: string;
	image?: string;
	url: string;
	tags?: string[];
	addedAt: number;
}

export interface SavedGamesState {
	customGames: SavedGameRecord[];
	removedGameUrls: string[];
}

export interface PlaybackMediaEntry {
	id: string;
	title: string;
	url: string;
	image?: string;
	timestamp: number;
	hostLabel: string;
	tags: string[];
	librarySource: LibrarySource;
}

export interface PlaybackSearchEntry {
	id: string;
	title: string;
	query: string;
	url: string;
	timestamp: number;
	hostLabel: string;
}

export interface PlaybackState {
	games: PlaybackMediaEntry[];
	apps: PlaybackMediaEntry[];
	searches: PlaybackSearchEntry[];
}

export interface SessionHistoryEntry {
	url: string;
	normalizedUrl: string;
	title: string;
	image?: string;
	tags: string[];
	kind: PlaybackKind;
	librarySource: LibrarySource;
}

export interface SessionHistoryState {
	entries: SessionHistoryEntry[];
	index: number;
}

export interface NavigationMeta {
	title?: string;
	image?: string;
	tags?: string[];
	kind?: PlaybackKind;
	librarySource?: LibrarySource;
}

export const emptySavedGamesState: SavedGamesState = {
	customGames: [],
	removedGameUrls: []
};

export const emptyPlaybackState: PlaybackState = {
	games: [],
	apps: [],
	searches: []
};

const maxSessionHistoryEntries = 80;
const maxPlaybackEntries = 160;

export const normalizeComparableUrl = (input: string) => {
	const value = input.trim();

	switch (true) {
		case value.length === 0:
			return `${spcProtocol}newtab`;
		case value.startsWith(spcProtocol):
			return value.toLowerCase();
		default:
			break;
	}

	const internalPath = resolveInternalUrl(value);

	switch (Boolean(internalPath)) {
		case true:
			return toSpcUrl(internalPath!) ?? `${spcProtocol}newtab`;
		default:
			break;
	}

	try {
		const targetUrl = new URL(value, window.location.origin);
		const internalSpcUrl = toSpcUrl(targetUrl.pathname);

		switch (Boolean(internalSpcUrl)) {
			case true:
				return internalSpcUrl!;
			default:
				break;
		}

		targetUrl.hash = '';
		targetUrl.pathname = targetUrl.pathname.replace(/\/+$/, '') || '/';

		return targetUrl.toString();
	} catch {
		switch (isInternalPage(value)) {
			case true:
				return toSpcUrl(value) ?? `${spcProtocol}newtab`;
			default:
				return value;
		}
	}
};

export const getHostLabel = (input: string) => {
	switch (true) {
		case input.trim().length === 0:
			return 'New Tab';
		case input.startsWith(spcProtocol):
			return 'space';
		default:
			break;
	}

	const internalPath = resolveInternalUrl(input);

	switch (Boolean(internalPath)) {
		case true:
			return 'space';
		default:
			break;
	}

	try {
		const targetUrl = new URL(input, window.location.origin);
		return targetUrl.hostname.replace(/^www\./, '') || 'space';
	} catch {
		return input;
	}
};

export const getFallbackTitle = (input: string) => {
	const normalizedUrl = normalizeComparableUrl(input);

	switch (normalizedUrl) {
		case `${spcProtocol}newtab`:
			return 'New Tab';
		default:
			break;
	}

	switch (true) {
		case normalizedUrl.startsWith(spcProtocol): {
			const pageName = normalizedUrl.slice(spcProtocol.length).trim();
			switch (pageName) {
				case 'newtab':
					return 'New Tab';
				default:
					return pageName.charAt(0).toUpperCase() + pageName.slice(1);
			}
		}
		default:
			break;
	}

	return getHostLabel(input);
};

export const isLikelyUrlInput = (input: string) => {
	const value = input.trim();

	switch (true) {
		case value.length === 0:
			return false;
		case value.startsWith(spcProtocol):
			return true;
		case isInternalPage(value):
			return true;
		case Boolean(resolveInternalUrl(value)):
			return true;
		case /^[a-z][a-z0-9+.-]*:\/\//i.test(value):
			return true;
		case /\s/.test(value):
			return false;
		case /^localhost(:\d+)?(\/|$)/i.test(value):
			return true;
		case /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/|$)/.test(value):
			return true;
		default:
			return /^[^\s]+\.[a-z]{2,}([/?#:].*)?$/i.test(value);
	}
};

export const createSessionHistoryEntry = (
	input: string,
	meta: NavigationMeta = {}
): SessionHistoryEntry => {
	const normalizedUrl = normalizeComparableUrl(input);
	const title = meta.title?.trim() || getFallbackTitle(input);
	const tags = meta.tags?.filter(Boolean) ?? [];

	let kind = meta.kind ?? 'app';

	switch (normalizedUrl) {
		case `${spcProtocol}newtab`:
			kind = 'internal';
			break;
		default:
			switch (normalizedUrl.startsWith(spcProtocol)) {
				case true:
					kind = 'internal';
					break;
				default:
					break;
			}
	}

	return {
		url: normalizedUrl === `${spcProtocol}newtab` ? '' : input,
		normalizedUrl,
		title,
		image: meta.image,
		tags,
		kind,
		librarySource: meta.librarySource ?? null
	};
};

export const createInitialSessionHistory = (): SessionHistoryState => ({
	entries: [
		createSessionHistoryEntry(getDefaultPagePath(), { kind: 'internal' })
	],
	index: 0
});

export const mergeSessionHistoryEntry = (
	currentEntry: SessionHistoryEntry,
	nextEntry: SessionHistoryEntry
) => ({
	...currentEntry,
	...nextEntry,
	url: nextEntry.url || currentEntry.url,
	title: nextEntry.title || currentEntry.title,
	image: nextEntry.image || currentEntry.image,
	tags: nextEntry.tags.length > 0 ? nextEntry.tags : currentEntry.tags,
	librarySource: nextEntry.librarySource ?? currentEntry.librarySource,
	kind:
		nextEntry.kind === 'app' && currentEntry.kind !== 'app'
			? currentEntry.kind
			: nextEntry.kind
});

export const pushSessionHistoryEntry = (
	sessionHistory: SessionHistoryState,
	nextEntry: SessionHistoryEntry
) => {
	const currentEntry = sessionHistory.entries[sessionHistory.index];

	switch (currentEntry?.normalizedUrl === nextEntry.normalizedUrl) {
		case true: {
			const nextEntries = [...sessionHistory.entries];
			nextEntries[sessionHistory.index] = mergeSessionHistoryEntry(
				currentEntry,
				nextEntry
			);

			return {
				entries: nextEntries,
				index: sessionHistory.index
			};
		}
		default: {
			const nextEntries = [
				...sessionHistory.entries.slice(0, sessionHistory.index + 1),
				nextEntry
			].slice(-maxSessionHistoryEntries);

			return {
				entries: nextEntries,
				index: nextEntries.length - 1
			};
		}
	}
};

export const syncSessionHistoryEntry = (
	sessionHistory: SessionHistoryState,
	nextEntry: SessionHistoryEntry
) => {
	const nextEntries = [...sessionHistory.entries];
	const currentEntry = nextEntries[sessionHistory.index];

	switch (Boolean(currentEntry)) {
		case false:
			return sessionHistory;
		default:
			nextEntries[sessionHistory.index] = mergeSessionHistoryEntry(
				currentEntry!,
				nextEntry
			);

			return {
				entries: nextEntries,
				index: sessionHistory.index
			};
	}
};

export const moveSessionHistoryIndex = (
	sessionHistory: SessionHistoryState,
	nextIndex: number
) => ({
	entries: sessionHistory.entries,
	index: Math.max(0, Math.min(nextIndex, sessionHistory.entries.length - 1))
});

export const findSavedGameByUrl = (
	savedGamesState: SavedGamesState,
	input: string
) => {
	const normalizedUrl = normalizeComparableUrl(input);

	return (
		savedGamesState.customGames.find(
			game => normalizeComparableUrl(game.url) === normalizedUrl
		) ?? null
	);
};

export const isRemovedGameUrl = (
	savedGamesState: SavedGamesState,
	input: string
) => {
	const normalizedUrl = normalizeComparableUrl(input);

	return savedGamesState.removedGameUrls.some(
		url => normalizeComparableUrl(url) === normalizedUrl
	);
};

export const buildSavedGameRecord = (
	entry: SessionHistoryEntry
): SavedGameRecord => ({
	id: generateGameId(entry.title || getHostLabel(entry.url)),
	name: entry.title || getHostLabel(entry.url),
	image: entry.image,
	url: entry.url,
	tags: entry.tags,
	addedAt: Date.now()
});

export const getGameLibraryStatus = (
	entry: SessionHistoryEntry | null | undefined,
	savedGamesState: SavedGamesState
) => {
	switch (Boolean(entry && entry.normalizedUrl !== `${spcProtocol}newtab`)) {
		case false:
			return {
				canToggle: false,
				isSaved: false,
				librarySource: null as LibrarySource
			};
		default:
			break;
	}

	switch (isRemovedGameUrl(savedGamesState, entry!.url)) {
		case true:
			return {
				canToggle: true,
				isSaved: false,
				librarySource: null as LibrarySource
			};
		default:
			break;
	}

	const customGame = findSavedGameByUrl(savedGamesState, entry!.url);

	switch (Boolean(customGame)) {
		case true:
			return {
				canToggle: true,
				isSaved: true,
				librarySource: 'custom' as LibrarySource
			};
		default:
			break;
	}

	switch (entry!.librarySource === 'default') {
		case true:
			return {
				canToggle: true,
				isSaved: true,
				librarySource: 'default' as LibrarySource
			};
		default:
			return {
				canToggle: true,
				isSaved: false,
				librarySource: null as LibrarySource
			};
	}
};

const createPlaybackMediaEntry = (
	entry: SessionHistoryEntry
): PlaybackMediaEntry => ({
	id: `${entry.normalizedUrl}-${Date.now()}`,
	title: entry.title || getFallbackTitle(entry.url),
	url: entry.url,
	image: entry.image,
	timestamp: Date.now(),
	hostLabel: getHostLabel(entry.url),
	tags: entry.tags,
	librarySource: entry.librarySource
});

export const pushPlaybackMediaEntry = (
	items: PlaybackMediaEntry[],
	entry: SessionHistoryEntry
) => {
	const normalizedUrl = entry.normalizedUrl;
	const nextEntry = createPlaybackMediaEntry(entry);
	const filteredItems = items.filter(
		item => normalizeComparableUrl(item.url) !== normalizedUrl
	);

	return [nextEntry, ...filteredItems].slice(0, maxPlaybackEntries);
};

export const syncPlaybackMediaEntry = (
	items: PlaybackMediaEntry[],
	entry: SessionHistoryEntry
) => {
	const normalizedUrl = entry.normalizedUrl;
	let hasMatched = false;
	const nextItems = items.map(item => {
		switch (normalizeComparableUrl(item.url) === normalizedUrl) {
			case true:
				hasMatched = true;
				return {
					...item,
					title: entry.title || item.title,
					image: entry.image || item.image,
					hostLabel: getHostLabel(entry.url),
					tags: entry.tags.length > 0 ? entry.tags : item.tags,
					librarySource: entry.librarySource ?? item.librarySource
				};
			default:
				return item;
		}
	});

	return hasMatched ? nextItems : items;
};

export const pushPlaybackSearchEntry = (
	items: PlaybackSearchEntry[],
	query: string,
	url: string
) => {
	const normalizedUrl = normalizeComparableUrl(url);
	const nextEntry: PlaybackSearchEntry = {
		id: `${query.toLowerCase()}-${Date.now()}`,
		title: query,
		query,
		url,
		timestamp: Date.now(),
		hostLabel: getHostLabel(url)
	};
	const filteredItems = items.filter(
		item =>
			item.query.toLowerCase() !== query.toLowerCase() &&
			normalizeComparableUrl(item.url) !== normalizedUrl
	);

	return [nextEntry, ...filteredItems].slice(0, maxPlaybackEntries);
};
