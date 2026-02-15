import { useState, useEffect, useCallback } from 'react';

export const useLocalStorage = <T>(
	key: string,
	initialValue: T
): [T, (value: T | ((val: T) => T)) => void] => {
	const readValue = useCallback((): T => {
		if (typeof window === 'undefined') {
			return initialValue;
		}

		try {
			const item = window.localStorage.getItem(key);
			return item ? (JSON.parse(item) as T) : initialValue;
		} catch (error) {
			console.warn(`Error reading localStorage key "${key}":`, error);
			return initialValue;
		}
	}, [key, initialValue]);

	const [storedValue, setStoredValue] = useState<T>(readValue);

	const setValue = (value: T | ((val: T) => T)) => {
		try {
			const valueToStore =
				value instanceof Function ? value(storedValue) : value;
			setStoredValue(valueToStore);
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(key, JSON.stringify(valueToStore));
				window.dispatchEvent(new CustomEvent('local-storage', { detail: { key } }));
			}
		} catch (error) {
			console.warn(`Error setting localStorage key "${key}":`, error);
		}
	};

	useEffect(() => {
		setStoredValue(readValue());
	}, [readValue]);

	useEffect(() => {
		const onStorage = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail?.key === key) {
				setStoredValue(readValue());
			}
		};
		window.addEventListener('local-storage', onStorage);
		return () => window.removeEventListener('local-storage', onStorage);
	}, [key, readValue]);

	return [storedValue, setValue];
};
