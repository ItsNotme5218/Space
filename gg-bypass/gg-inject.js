(() => {
	'use strict';
	const e = e => ({
			sendToContentScript: t => {
				window.dispatchEvent(
					new CustomEvent(e, {
						detail: {
							payload: t
						}
					})
				);
			},
			sendToInjectionScript: t => {
				window.dispatchEvent(
					new CustomEvent(e, {
						detail: {
							payload: t
						}
					})
				);
			},
			addListener: t => {
				const n = e => {
					const n = e.detail;
					t(n?.payload);
				};
				return (
					window.addEventListener(e, n),
					() => {
						window.removeEventListener(e, n);
					}
				);
			},
			sendToInjectionScriptWithResponse: (t, n = 3e3) => {
				const o = `${e}-response`;
				return new Promise((i, s) => {
					const d = setTimeout(() => {
							(window.removeEventListener(o, a),
								s(
									new Error(
										`Timeout waiting for response of type ${o}`
									)
								));
						}, n),
						a = e => {
							const t = e;
							(t?.type === o && i(t?.detail.payload),
								window.removeEventListener(o, a),
								clearTimeout(d));
						};
					(window.addEventListener(o, a),
						window.dispatchEvent(
							new CustomEvent(e, {
								detail: {
									payload: t
								}
							})
						));
				});
			},
			addInjectionScriptListenerWithResponse: t => {
				const n = `${e}-response`,
					o = async e => {
						const o = e.detail,
							i = t(o?.payload);
						if (
							(s = i) &&
							'object' == typeof s &&
							'function' == typeof s.then
						) {
							const e = await i;
							window.dispatchEvent(
								new CustomEvent(n, {
									detail: {
										payload: e
									}
								})
							);
						} else {
							var s;
							window.dispatchEvent(
								new CustomEvent(n, {
									detail: {
										payload: i
									}
								})
							);
						}
					};
				return (
					window.addEventListener(e, o),
					() => {
						window.removeEventListener(e, o);
					}
				);
			},
			postMessageToContentScript: t => {
				window.postMessage(
					{
						type: e,
						detail: {
							payload: t
						}
					},
					'*'
				);
			},
			postMessageToTopFrameContentScript: t => {
				window.top?.postMessage(
					{
						type: e,
						detail: {
							payload: t
						}
					},
					'*'
				);
			},
			addPostMessageListener: t => {
				const n = n => {
					const o = n.data;
					o &&
						o.type === e &&
						o.detail &&
						o.detail.payload &&
						t(o.detail.payload);
				};
				return (
					window.addEventListener('message', n),
					() => window.removeEventListener('message', n)
				);
			}
		}),
		t = e('before-unload/override'),
		n = e('explicit-image-filter/openBlockReasonModal'),
		o = e('health/checkHealth'),
		i = e('youtube/settingsRequest'),
		s = e('youtube/settingsResponse'),
		d = e('youtube/checkVideo'),
		a = e('youtube/checkVideoResult'),
		r = e('youtube/videoPlayed'),
		p = e('youtube/injectionHealthy'),
		c = e('youtube/destroy'),
		l =
			(t.sendToInjectionScript,
			s.sendToInjectionScript,
			c.sendToInjectionScript,
			i.addListener,
			r.addListener,
			d.addListener,
			a.sendToInjectionScript,
			p.addListener,
			o.sendToInjectionScriptWithResponse,
			{
				beforeUnload: {
					onOverrideBeforeUnload: t.addListener
				},
				youtube: {
					injectionHealthy: p.sendToContentScript,
					settingsRequest: i.sendToContentScript,
					videoPlayed: r.sendToContentScript,
					onSettingsResponse: s.addListener,
					checkVideo: d.sendToContentScript,
					onCheckVideoResult: a.addListener,
					onDestroy: c.addListener
				},
				health: {
					onCheckHealth: o.addInjectionScriptListenerWithResponse
				}
			});
	(n.postMessageToTopFrameContentScript,
		n.addPostMessageListener,
		(() => {
			let e = !1;
			(l.beforeUnload.onOverrideBeforeUnload(() => {
				((window.onbeforeunload = null), (e = !0));
			}),
				window.addEventListener('beforeunload', t => {
					e && t.stopImmediatePropagation();
				}));
		})());
})();
