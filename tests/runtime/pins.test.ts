import { expect, it } from 'vitest';
import { defaultPins } from '../../src/utils/pins';

it('seeds the requested Space shortcut list', () => {
	expect(
		defaultPins.map(({ name, url }) => [name, new URL(url).hostname])
	).toEqual([
		['YouTube', 'youtube.com'],
		['Discord', 'discord.com'],
		['Instagram', 'instagram.com'],
		['TikTok', 'tiktok.com'],
		['Spotify', 'spotify.com'],
		['Twitch', 'twitch.tv']
	]);
});
