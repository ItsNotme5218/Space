# Space deployment verification — 2026-09-30

Local acceptance only. No commits, subagents, merge, push, publishing or public
deployment. Final verification results are recorded in the Task 10 report under
`.superpowers/sdd/2026-09-30-space-universal-bridge-deployment/task-10-report.md`.

## Reproduction

Working directories:

- SPACE: `/home/amplify/Projects/DDX-Rewrite-Bak/Space-v2`
- BOOT: `/home/amplify/Projects/DDX-Rewrite-Bak/shoestring-space`
- Daydream: `/home/amplify/Projects/DDX-Rewrite-Bak`
- Nebula: `/home/amplify/Projects/DDX-Rewrite-Bak/Nebula`
- DOCS: `/home/amplify/Projects/NightShade/NightDocs`

Installed dependencies, Bun, Node, Playwright Chromium and OpenSSL are required.
Do not rebuild `dist/` while browser fixtures are consuming it. The browser
certificate exception is solely for ephemeral localhost WSS certificates; it is
not a production TLS setting. Controlled Wisp permits only loopback destinations;
HTTP/WebSocket guards prevent incidental public browser traffic. The external
smoke separately permits only `gabrielecirulli.github.io` through Wisp.

From SPACE, run sequentially:

```sh
SPACE_BUILD_MODE=server bun run test
SPACE_BUILD_MODE=server bun run typecheck
bun run build:server
SPACE_E2E_JSON=/tmp/opencode/task10-gate-server-results.json bun run test:e2e --trace off --output=/tmp/opencode/task10-gate-server-browser
node tests/browser/launch-diagnostics.mjs
SPACE_BUILD_MODE=static bun run test
SPACE_BUILD_MODE=static bun run typecheck
bun run build:static
SPACE_E2E_JSON=/tmp/opencode/task10-gate-static-results.json bun run test:acceptance --trace off --output=/tmp/opencode/task10-gate-static-browser
SPACE_E2E_PREVIEW=1 SPACE_E2E_JSON=/tmp/opencode/task10-repaired-static-preview-results.json npx playwright test tests/browser/svg.spec.ts tests/browser/fonts.spec.ts --grep 'standalone|loaded non-application|real Space' --output=/tmp/opencode/task10-repaired-static-preview
node tests/browser/launch-diagnostics.mjs
node tests/browser/svg-controller.mjs
node tests/browser/external-smoke.mjs
```

From BOOT:

```sh
npm test
npm run typecheck
SPACE_SOURCE_ORIGIN=http://127.0.0.1:8091 SPACE_SOURCE_BUILD_ID=development npm run build
```

From Daydream:

```sh
npm test
npm run build
```

From Nebula:

```sh
node --test build/proxyContext.test.mjs build/svgHost.test.mjs build/marketplace-config.test.mjs build/font/lifecycle.test.mjs src/utils/wispDefault.test.mjs src/utils/marketplaceBridge.test.mjs src/utils/marketplaceWorker.test.mjs
npm run build:server
npm run build:client
npx astro check
```

From DOCS:

```sh
npm test
npm run build
```

## Acceptance scope and evidence

`navigation.spec.ts`, `shoestring.spec.ts` and `host-integration.spec.ts` define
14 cases: standalone HTML/SVG, standalone font outage, shoestring HTML/SVG after
a complete mirror with source unavailable, Space HTML/SVG under each actual
Nebula/Daydream controller, shoestring HTML/SVG under each controller, and an
exact 1000 ms dropped-readiness-reply case after real adapter initialization.

Games card → Play, URL-bar navigation, per-session Reload (actual document
navigation, not the old heading), Back and Forward use the actual React UI.
Saved-game seeding writes the real settings database and reloads the application;
it does not substitute a runtime/controller. The game and proxy have distinct
origins because the installed engine deliberately rejects its own real origin.
The game fetches a controlled asset and renders distinct first/second levels.

Host fixtures load installed controllers, host-owned adapters and actual codecs
(Nebula Base32 from Loader; Daydream Obscura). They use a controlled native HTTP
outer transport rather than a public Wisp service. The real engine rewrites all
requests. Delegated assertions verify original game URL decoded under the owning
host frame prefix, absent local runtime, zero local worker/transport requests and
zero Space Wisp connections. A successful controlled gn-math legacy provider is
visible despite a controlled failed Truffled provider. Lost sessions reject;
there is no raw or nested-proxy fallback.

Standalone fixtures use actual localhost **WSS** and the build's actual
server/static mode with a public endpoint override. Shoestring standalone uses
the actual composed bootstrap worker. The BOOT full suite additionally runs
real CacheStorage and forced OPFS mirrors, source shutdown, worker termination,
restart, lazy UI, controlled game and deliberate ownership takeover.

Each host case attaches `controller-evidence` and a genuine browser-history
`genuine-bfcache-attempt`. Browser-controlled **DENIED** restoration is not an
acceptance pass. `svg-controller.mjs` separately records genuine admission/
denial without manufacturing `persisted`; its other persisted lifecycle checks
are explicitly synthetic. Real admitted BFCache UI restoration is not assumed.

Artifacts: `/tmp/opencode/task10-verified-{server-browser,static-browser,static-preview}/`,
`/tmp/opencode/task10-verified-*.log`, `/tmp/opencode/task10-verified-results.json`,
and `/tmp/opencode/task10-external-result.json`. Failed runs retain screenshots
and traces. Host tests submit body-only JSON attachments to the reporter, but the
selected list reporter does not persist those successful-case bodies; do not
claim they exist in the output directories. The controller/BFCache runner's JSON
is retained in its log. No retries are enabled.

## RED/GREEN and diagnosis

- Docs regression: missing Space sidebar/pages failed before implementation.
- Bootstrap routing: two failing delegation/absence/loss tests preceded the
  scoped entry handoff. Delegation now precedes storage/transport/registration;
  loss cannot take the local-install branch. Canonical protocol source is bundled
  from `../Space-v2/src/bridge` at build time, not fetched at deployment time.
- Task 6 intermittent launch: reproduced in real controllers, not attributed to
  concurrency. In one failed Daydream trace the matching check was sent at
  4239.8 ms and ready at 5381.0 ms (**1141.2 ms**, beyond the 1000 ms deadline),
  while adapter state remained ready/not disposed. CPU profiling identified the
  font scan and its pseudo-style callback. Ten font-denied comparison launches
  passed. A browser regression then failed on per-label read/write interleaving.
  Batching cascade reads before presentation writes passed all 12 font cases;
  ten subsequent built-artifact launches passed (maximum 344.4 ms in that run).
  Protocol deadlines were not increased and no retry/fake readiness was added.
- History: real Back/Forward acceptance exposed false target feedback. The
  toolbar no longer reports selected props as a new document visit. A further
  App regression reproduced an old-document observation erasing Forward during
  Back; it failed then passed with live pending-load ownership guarding history.
  Existing unit fixtures now explicitly signal document load before recording
  completed visits; their reload and forbidden-scheme assertions are retained.

RED evidence: `/tmp/opencode/task10-{docs-red,bootstrap-red,font-red,history-pending-red}.log`.
Diagnostics: `task10-launch-{diagnostics-boundaries,profile,no-fonts}.json`,
`task10-Daydream-4-cpu.json`, `task10-launch-batched.log` under `/tmp/opencode/`.

Earlier harness errors are not product RED claims: wrong fixture root, selecting
Games search instead of URL input, same-origin engine safeguard, manifest MIME
mismatch, testing an encoded native URL as plaintext, not awaiting real reload,
rewinding an installed clock, and upgraded-socket shutdown were diagnosed and
corrected in tests. BOOT's old 1000 ms status-poll default cannot encompass the
new intentional 1500 ms discovery; its bounded fixture poll is now 5000 ms.

## Known baseline failures and limits

- Daydream `npm test`: **646 PASS / 1 FAIL**; unchanged
  `srv/vite/scrub.test.ts > scrubJavaScript > preserves protected external literals
  (nightwisp.me) while still scrubbing bare wisp` produces `nightCCCC.me`.
  Daydream `npm run build`: PASS. Existing happy-dom teardown errors remain.
- Nebula relevant Node tests: PASS; `npm run build:server`: PASS.
  `npm run build:client` and `npx astro check`: FAIL on existing undefined `worker`
  references in `src/utils/marketplace.ts:208,234`. That source was not edited.
- Genuine admitted BFCache restoration, non-Chromium rendering, UV-specific
  browser acceptance, multiplayer/WebSocket games and full third-party host UIs
  are not claimed. Host acceptance uses actual controllers/adapters, not their
  complete application shells. External smoke proves 2048 heading rendering via
  real Space/Wisp, not comprehensive playability or service uptime.
- Delegated shoestring is a direct configured-source handoff, not offline
  delegated mirroring. Offline recovery requires a completed standalone mirror.
- Whole-change independent review belongs to the parent session. No reviewer
  subagent was spawned because that was explicitly prohibited.

## Initial delivery verification outcomes (historical)

**DONE_WITH_CONCERNS — the server browser acceptance gate remains open.**
The completed sequential run is recorded in
`/tmp/opencode/task10-verified-results.json`. Its matching logs have the same
`task10-verified-` prefix. No production or test implementation changed after
that run; only this report and the ledger were finalized.

| Verification | Actual result |
| --- | --- |
| SPACE server unit / typecheck / build | 198/198; exit 0; exit 0, 509 final files validated |
| SPACE server full browser suite | **26 PASS / 3 FAIL**, exit 1; zero retries, zero skips |
| SPACE server fresh-browser launch diagnostic | 10/10, exit 0; maximum 338.9 ms |
| SPACE static unit / typecheck / build | 198/198; exit 0; exit 0, 509 final files validated |
| SPACE static 14-case acceptance | 14/14, exit 0; zero retries, zero skips |
| SPACE static-preview font/SVG subset | 5/5, exit 0; intentionally selected subset, not full preview suite |
| SPACE static fresh-browser launch diagnostic | 10/10, exit 0; maximum 321.6 ms |
| Real controller / synthetic lifecycle runner | Both hosts' assertions pass, exit 0; genuine BFCache **DENIED** for both |
| Separate external 2048 smoke | PASS, exit 0; heading `2048`, no page errors |
| BOOT tests / typecheck / build | 75/75; exit 0; exit 0 |
| DOCS tests / build | 4/4; exit 0, 119 pages |

### Outstanding server failures (not baseline failures)

1. Nebula → Space SVG: `host-integration.spec.ts:12`, expected delegated,
   received unavailable before provider/UI assertions.
2. Daydream → shoestring SVG: same assertion and state before provider/UI checks.
3. Daydream dropped-readiness case: `host-integration.spec.ts:39`, already
   unavailable **before** clock installation and deliberate reply suppression;
   this run does not verify the intended exact-timeout step.

All three retained traces show a mounted application; the two matrix traces
also show the controlled Truffled failure followed by unavailable-context
provider errors. These observations localize failure to readiness/lifecycle
during startup/provider activity, not the controlled game's navigation or
intentional adapter disposal. They do **not** establish the exact failing
correlation or prove that each is the earlier measured late-reply defect.
The production font batching regression is green, but the Task 6 reliability
blocker remains open. Fresh-browser diagnostic and static passes are narrower
evidence, not proof of server repair. No additional speculative fix, retry or
deadline increase was applied. Failed traces/screenshots are in the server
output directory listed above; exact errors are at log lines 689–789.

### BFCache and artifact limits

`task10-verified-controller-bfcache.log` records `persisted: false` for both hosts,
with `masked`, `response-cache-control-no-store` and
`response-cache-control-no-store-with-js-network-request`. Its exit 0 covers
controller assertions and **synthetic** persisted lifecycle handling only.
Successful matrix BFCache attachment bodies were not persisted by the list
reporter, so no per-case reason inventory is claimed. Genuine admitted UI
restoration remains unverified. A JSON/HTML reporter is needed in a follow-up
run to retain successful matrix attachment bodies.

Baseline host logs are `/tmp/opencode/task10-daydream-{tests,build}.log` and
`/tmp/opencode/task10-nebula-{tests,server,client,types}.log`; their failures
remain separate from the three owned acceptance failures above. Independent
whole-change review remains pending, without prohibited reviewer delegation.

Final local review: `git diff --check` exited 0 in SPACE, Daydream and Nebula.
A read-only Python whitespace/conflict-marker check over 23 scoped acceptance,
fixture, runtime, bootstrap and documentation files reported zero findings.
DOCS is not a Git repository in this environment, so no DOCS Git diff result is
claimed. Existing staged/unstaged work was not reset, staged or committed.

## October 1 residual diagnosis follow-up

Initial delivery counts above are historical, not the outcome of the ongoing
follow-up. Retained full-server runs: `task10-traced-server-results.json` is
27 PASS / 2 FAIL; `task10-attributed-server-results.json` is 25 PASS / 4 FAIL;
`task10-repaired-server-results.json` is 29 PASS / 1 FAIL; and
`task10-residual-profile-server-results.json` is 29 PASS / 1 FAIL. No retries or
skips. The two latter runs include the new mutation-burst regression.

Exact correlated evidence and CPU attribution are recorded in the Task 10
report's follow-up. Frame coalescing alone did not close acceptance: the last
Nebula HTML failed request `2d8f18fb-cf9f-4d00-bf76-a3868275d00b`, session
`ef470448-977b-4738-ad5e-2f6f268ea093`, sent at 4735.2 ms, answered at 5145.8 ms,
received at 5767.9 ms (**1032.7 ms**). The adapter remains ready, undisposed and
in its current document. Frame-work logs still show sweeps of 258 style reads
and 170 presentation writes from unrelated animated DIV styles.

`font-stability.spec.ts` then reproduced six presentation mutations from an
opacity-only update (expected zero). A conservative paint-only style filter
passes that regression and the full 15-case font subset. Font/layout/custom
property changes and style-attribute-dependent or opaque stylesheets retain
refresh behavior. Exact-timeout assertion after advancing to 1000 ms is now
immediate, rather than polling beyond that boundary. Production protocol
deadlines, retries, loss policy and acceptance expectations remain unchanged.

JSON reporting now retains successful `controller-evidence`,
`protocol-boundaries` and actual `genuine-bfcache-attempt` bodies. For example,
`task10-traced-server-bfcache.json` inventories six denied attempts, each with
`persisted: false`; these are limitations, never admitted-restoration passes.
The current sequential verification uses `/tmp/opencode/task10-paint-*`;
actual completed results will be appended, not inferred from subset passes.

## Historical Task 10 acceptance follow-up — October 1, 2026 (before R1/R2)

**The Task 10 P1 acceptance gate passed in both profiles.** This superseded the
earlier open-gate statuses above, not their retained failure evidence. It did not
cover R1/R2 or guarantee elapsed-time rejection of overdue replies. The then-final ordinary
suite disables snapshot/CPU/render profiling, retains protocol/controller JSON,
and uses the same production 1000 ms readiness deadline, exact 999/1000 ms
assertions, loss policy and zero retries. No additional production readiness fix
was made after the accepted P2 ownership/import fixes.

| Final verification | Actual result |
| --- | --- |
| Server units | **202/202**, 28 files, exit 0 |
| Server typecheck / build | exit 0 / exit 0 |
| Full server Chromium | **34/34**, exit 0; zero retries/skips/flaky results |
| Static units | **202/202**, 28 files, exit 0 |
| Static typecheck / build | exit 0 / exit 0 |
| Static acceptance | **14/14**, exit 0; zero retries/skips/flaky results |
| Updated NightDocs tests / build | **4/4**, exit 0 / **119 pages**, exit 0 |

Exact sequential commands/exits: `/tmp/opencode/task10-gate-commands.json`.
Matching logs: `task10-gate-{server,static}-{units,types,build,browser}.log`.
Browser JSON: `task10-gate-{server,static}-results.json`. Each JSON contains 25
successful body-only attachments: eight controller bodies, nine protocol bodies,
eight genuine BFCache bodies. Extracted inventories are
`task10-gate-{server,static}-evidence.json`. All 16 actual BFCache attempts are
**DENIED**, `persisted: false`; admitted UI restoration is not claimed.
The final protocol bodies retain 247 matching ready replies per profile:
maximum **506.9 ms server / 659.7 ms static**, zero matching replies over 1000 ms.

### Historical paired tracing evidence and its causal limit (before R2)

`task10-pair-commands.json` records one server build followed by complete
`--trace off` and `--trace on` suites. Both use CPU/render attribution identically,
the same source/assertions, one worker and zero retries; every `dist/` file hash
is unchanged before/after both runs and the aggregate build fingerprint matches.
Off: **29 PASS / 5 FAIL**; on: **33 PASS / 1 FAIL**. Neither fails the initial
delegated-mode assertion. This pair does not prove snapshots are the exclusive
cause of prior readiness loss, nor does the trace-off run itself close acceptance.

CPU samples show `captureSnapshot → visitNode → visitChild` traversing the DOM
through Scramjet's intercepted getters. Summing sample time deltas attributed to
that stack gives **0 ms off / 6375.1 ms on** across available attached profiles;
missing teardown profiles are not counted. This is sampled attribution, not a
precise reconstruction of each historical failed check window. The paired
overhead inventory is `task10-pair-overhead.json`; CPU profile paths are in each
report's attachments. Final ordinary acceptance avoids this extra snapshot work,
without deleting the diagnostic run or weakening readiness expectations.
Passing trace-on cases also contain provider replies delivered after 1000 ms
(maximum 1396.7 ms, observed mode still delegated): delayed browser timer/port
task ordering means a UI pass alone is not proof every reply met a wall-clock
deadline. These late deliveries are retained; that historical implementation had
no strict absolute-expiry check. Its all-pass UI results must not be read as a
strict elapsed-time guarantee. The historical ordinary run's measured matching
replies were all below 1000 ms. The R2 receipt-deadline correction below supersedes
the old behavior, not the historical evidence.

### Acceptance-helper RED/GREEN (not a production readiness fix)

The paired suites exposed UI/teardown failures unrelated to the initial mode
assertion. The real `uiGame` helper returned from `location.reload()` without
awaiting navigation, permitting old-document operations; its regression failed
then passed after awaiting real `domcontentloaded` navigation. It now also waits
for the reloaded library and the rendered deferred-search result before opening
a card. RED/GREEN logs: `task10-reload-helper-{red,green}.log`.

First ordinary run: **33/34 server, 14/14 static**. The remaining server failure
is a forced card click on an invisible animated element (not unavailable mode).
Removing `force:true` restores normal visibility/stability actionability checks
for card and Play clicks; no assertion was removed, no failed test was retried,
and no deadline was enlarged. The next complete sequential verification is the
final all-pass gate recorded above. Earlier profiler teardown timeouts and
UI failures remain in their JSON/logs; they are not reclassified as passes.

P2 review fixes separately retain App **7/7** and fonts **17/17** GREEN evidence,
including deferred settings, supersession/failed cleanup and readable/opaque
CSS imports. Whole-change review remains a parent gate; no subagent or publishing
was used. Known Daydream/Nebula baseline failures and other scope limits above
remain unchanged. No commits, staging, reset, merge, push or deployment occurred.
Fresh docs commands/exits: `task10-gate-docs-commands.json`; matching tests/build
logs use `task10-gate-docs-`. Fresh `git diff --check` exits 0 in Space, Daydream
and Nebula; NightDocs is not a Git repository here.

## Whole-review R1/R2 correction (2026-10-01)

This wave addresses only the two P2 blockers in the independent whole review.
Standalone facade generation ownership now reaches the actual SJ/UV local
navigation method and is checked immediately before `frame.go` / `iframe.src`,
after the existing bootstrap ownership validation. Controlled regressions use
the actual local method with delayed attachment/transport setup, not a navigation
spy, superseded by Home, a newer external navigation or disposal in both branches.
Separate regressions retain bootstrap-control-loss rejection without a predicate.

Discovery and each readiness request now have an absolute `performance.now()`
deadline. Receipt at or after 1500/1000 ms rejects even if the overdue timer has
not run. Concurrent checks keep independent deadlines; per-check rejection and
the runtime's fail-closed loss latch are unchanged. No deadline extension, retries
or raw fallback was added. Timer callbacks / UI still depend on event-loop
scheduling: this guarantees rejection of expired replies, not exact-time UI work.
The older paired tracing and ordinary matrix sections above are historical;
their UI successes never established strict elapsed-time receipt enforcement.

RED: `/tmp/opencode/final-fix-red.log` records all ten new defect regressions
failing (25 existing tests pass). Covering GREEN: `final-fix-green.log` records
175/175 runtime/bridge tests; the fresh full gate also includes two subsequently
added bootstrap-control-loss tests. A covering attempt first exposed a mock
Window missing `performance`; only that fixture was corrected before rerunning.

Fresh initial full gate: BOOT **75/75**, types/build exit 0; Space server and static
**214/214** each (29 files), both types/builds exit 0; server Chromium **34/34**,
exit 0; initial static acceptance **13/14**, exit 1, not an acceptance pass.
The failed Nebula/Space SVG case timed out awaiting its game after reload. Nine
correlated readiness deliveries took **1234.9–1444 ms**, with observed mode
**unavailable**, retaining the stricter fail-closed behavior. Their exact causes
are not attributed exclusively to snapshot/render work. Failure bodies and
correlations are retained as `final-fix-failed-{protocol-boundaries,controller-evidence}.json`
and `final-fix-failure-correlations.json`. The unchanged full static confirmation
passed **14/14**, exit 0, in a separate report (zero Playwright retries); no source,
timeout or assertion changed between runs. This is finite controlled acceptance,
not a universal scheduling guarantee; the initial failure remains legitimate.

Server JSON retains 25 body-only attachments, 247 correlated ready deliveries
(maximum **532 ms**, none >=1000 ms), and eight genuine BFCache attempts, all
**DENIED**, not admitted restoration passes. Initial static retains 24 attachments
and seven denied attempts. Inventories: `final-fix-{server,static}-evidence.json`.
Bundled receipt-deadline branches in canonical static Space and BOOT JS are
recorded in `final-fix-bundled-deadlines.json`.

Successful static confirmation JSON: `final-fix-static-confirmation-results.json`,
start `2026-10-01T15:04:17.522Z`, 14 expected / zero unexpected, skipped or flaky.
It retains 25 body-only JSON attachments, 246 correlated readiness deliveries
(maximum **546.5 ms**, none >=1000 ms), and eight genuine BFCache attempts, all
**DENIED**, `persisted:false`. Inventory:
`final-fix-static-confirmation-evidence.json`. Failed full-run JSON is not
overwritten. Additional `bun scripts/verify-build.mjs dist` exits 0: final static
artifacts and full final-byte manifest verified (`final-fix-artifacts.log`).
Follow-up commands/exits: `final-fix-followup-commands.json`.

Exact serialized
commands/exits: `/tmp/opencode/final-fix-gate-commands.json`; logs:
`final-fix-{boot,server,static}-{units,types,build,browser}.log` as applicable.
BOOT's first unconfigured build failed as required (`final-fix-boot-build-missing-env.log`);
the configured build preserves the existing localhost 8091 / development identity.
The initial stopped gate is retained in `final-fix-initial-gate-commands.json`.

No DDX/Nebula edits, host copies or rebuilds; no 8080/6060 process changes, commits,
subagents or deployment. Canonical Space bundles and BOOT's bundled discovery
client are rebuilt locally. Historical limits (including denied, not admitted,
BFCache attempts and controlled rather than complete host-shell coverage) remain.

## User follow-up: YouTube URL display, gg-bypass removal, closed shadow root (2026-10-01)

The reported proxy URL reproduced in the production snapshot on port 6060. The
iframe location included a Scramjet routing `$io` query; the old display decoder
treated the query as part of the final Base32 token, failed decoding, and fell
back to displaying the proxy URL. A RED unit regression using the supplied URL
failed before the fix; GREEN verifies it displays `https://www.youtube.com/`.
The URL constructor now isolates the path token from query/hash data before
decoding. This is a presentation-only correction; proxy routing is unchanged.

`gg-bypass` had a single HTML include and its public payload/source/manifest;
all were removed, with a regression ensuring no script reference or published
asset remains. Space already had its own shadow-root-aware font obfuscation and
final artifact scrubbing; these remain wired and are exercised by the full unit
suite and both production builds. Shadow-root mode is now `open` in development
and `closed` in production; the `window.doc` global handle is removed.

Post-change verification: focused regressions **21/21**, complete Space unit suite
**217/217**, typecheck pass, server build pass, static build pass. A fresh isolated
server-profile snapshot serves `127.0.0.1:6060`; HTTP checks returned `/` **200**,
`/space-config.json` **200**, `/gg-bypass.js` **404**. Chromium evaluation confirms
standalone runtime, no `window.doc`, closed production root (`app-host.shadowRoot`
is null), and no bypass script element. The production closed root intentionally
prevents the accessibility snapshot from inspecting inner UI; the YouTube decode
regression is unit-level after the production build, not a claimed post-change
full UI/browser YouTube run. Port 8080/Daydream was not touched. This local test
server refresh is not a public deployment.

## Task 5 UV/Bare-Mux artifact scrub verification — 2026-10-02

Fresh local commands from `/home/amplify/Projects/DDX-Rewrite-Bak/Space-v2`:

| Command | Actual result |
| --- | --- |
| `npm test -- --run tests/build/artifacts.test.ts` | RED as expected before validator update: 1 failed / 13 passed; `u/config.js` resolved instead of rejecting. |
| `npm test -- --run tests/build/artifacts.test.ts tests/build/scrub.test.ts tests/build/transport-scrub.test.ts` | PASS after validator update: 3 files, 19/19. |
| `npm test` | PASS before false-positive narrowing: 37 files, 245/245. |
| `npm run typecheck` | PASS before build phase. |
| `npm run build:static` | First attempt failed during `assertArtifacts`: false positive `/u/` inside preserved Libcurl opaque payload in `dist/l/index.js`. |
| `npm test -- --run tests/build/artifacts.test.ts` | RED for opaque-payload regression before narrowing: 1 failed / 14 passed. |
| `npm test -- --run tests/build/artifacts.test.ts tests/build/scrub.test.ts tests/build/transport-scrub.test.ts` | PASS after narrowing to explicit routes/packages/runtime IDs: 3 files, 20/20. |
| `npm test` | PASS after narrowing: 37 files, 246/246. |
| `npm run typecheck` | PASS after narrowing. |
| `npm run build:static` | PASS; `[space:finalize] validated 479 files; final-byte manifest emitted`. |
| `bun scripts/verify-build.mjs dist` | PASS after static build; `[space:verify] artifacts and full final-byte manifest verified`. |
| `npm run build:server` | PASS; `[space:finalize] validated 479 files; final-byte manifest emitted`. |
| `bun scripts/verify-build.mjs dist` | PASS after server build; `[space:verify] artifacts and full final-byte manifest verified`. |
| `npm test -- --run tests/build/artifacts.test.ts tests/build/scrub.test.ts tests/build/transport-scrub.test.ts` | Final pre-report PASS: 3 files, 20/20. |
| `python3` restore-check script comparing `dist` to the backup manifest | PASS: `dist_restored=True`, 540 manifest entries, same manifest SHA-256. |

Existing ignored `dist/` was backed up before either successful build to
`/tmp/opencode/space-task5-dist-backup-y36qne2z`. The backup manifest had 540
entries and SHA-256 `6b8084aede566ecd3a8215ce1d464001adcf7f3fb7504573b1f4271fd3e4b0b3`.
After verification, the original `dist/` was restored from that backup and the
restored manifest/hash matched the backup. No generated build output was left in
the user-owned `dist/`. No Space 6060 or Daydream 8080 process was started,
stopped, or restarted.
