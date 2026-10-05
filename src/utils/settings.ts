import { store as sharedStore } from '../hooks/useLocalStorage';

class SettingsAPI {
	store: any;

	constructor() {
		this.store = sharedStore;
	}

	async getItem(key: string) {
		return await this.store.getItem(key);
	}

	async setItem(key: string, value: string) {
		return await this.store.setItem(key, value);
	}

	async removeItem(key: string) {
		return await this.store.removeItem(key);
	}

	async clearAllSettings() {
		return await this.store.clear();
	}
}

export { SettingsAPI };
