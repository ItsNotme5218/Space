import { useState, useEffect, useCallback, useRef } from 'react';
import localforage from 'localforage';

export const store = localforage.createInstance({
	name: 'space-settings',
	storeName: 'kv'
});

export const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

const channel =
	typeof BroadcastChannel !== 'undefined'
		? new BroadcastChannel('space-settings-sync')
		: null;

if (channel) {
	channel.onmessage = (e: MessageEvent<{ key: string; value: unknown }>) => {
		const { key, value } = e.data;
		cache.set(key, value);
		listeners.get(key)?.forEach(cb => cb());
	};
}

export const subscribe = (key: string, cb: () => void) => {
	if (!listeners.has(key)) listeners.set(key, new Set());
	listeners.get(key)!.add(cb);
	return () => {
		listeners.get(key)!.delete(cb);
	};
};

export const notify = (key: string) => {
	listeners.get(key)?.forEach(cb => cb());
};

const broadcast = (key: string, value: unknown) => {
	channel?.postMessage({ key, value });
};

const migrated = new Set<string>();
const migrateKey = async <T>(key: string, initialValue: T): Promise<T> => {
	if (migrated.has(key)) {
		return cache.has(key) ? (cache.get(key) as T) : initialValue;
	}
	migrated.add(key);

	const existing = await store.getItem<T>(key);
	if (existing !== null && existing !== undefined) {
		cache.set(key, existing);
		return existing;
	}

	try {
		const raw = window.localStorage.getItem(key);
		if (raw !== null) {
			const parsed = JSON.parse(raw) as T;
			cache.set(key, parsed);
			await store.setItem(key, parsed);
			window.localStorage.removeItem(key);
			return parsed;
		}
	} catch {}

	return initialValue;
};

export const initSettings = async (): Promise<void> => {
	for (let i = 0; i < window.localStorage.length; i++) {
		const key = window.localStorage.key(i);
		if (!key) continue;
		try {
			const val = JSON.parse(window.localStorage.getItem(key)!);
			const existing = await store.getItem(key);
			if (existing === null || existing === undefined) {
				await store.setItem(key, val);
			}
			window.localStorage.removeItem(key);
			i--;
		} catch {}
	}

	await store.iterate((value, key) => {
		cache.set(key, value);
		migrated.add(key);
	});
};

export const readSetting = async <T>(key: string, fallback: T): Promise<T> =>
	migrateKey(key, fallback);

export const writeSetting = async <T>(key: string, value: T): Promise<void> => {
	cache.set(key, value);
	notify(key);
	broadcast(key, value);
	await store.setItem(key, value);
};

export const useLocalStorage = <T>(
	key: string,
	initialValue: T
): [T, (value: T | ((val: T) => T)) => void] => {
	const [storedValue, setStoredValue] = useState<T>(() =>
		cache.has(key) ? (cache.get(key) as T) : initialValue
	);
	const valueRef = useRef(storedValue);
	valueRef.current = storedValue;

	useEffect(() => {
		let cancelled = false;
		migrateKey(key, initialValue).then(val => {
			if (!cancelled) setStoredValue(val);
		});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	useEffect(() => {
		return subscribe(key, () => {
			const v = cache.get(key) as T | undefined;
			if (v !== undefined) setStoredValue(v);
		});
	}, [key]);

	const setValue = useCallback(
		(value: T | ((val: T) => T)) => {
			const valueToStore =
				value instanceof Function ? value(valueRef.current) : value;
			setStoredValue(valueToStore);
			cache.set(key, valueToStore);
			notify(key);
			broadcast(key, valueToStore);
			store.setItem(key, valueToStore).catch(err => {
				console.warn(`Error writing localForage key "${key}":`, err);
			});
		},
		[key]
	);

	return [storedValue, setValue];
};
