import { test, expect } from '@playwright/test';
import { acceptanceFixture } from '../fixtures/serve.mjs';
import { mountedApp, uiGame } from './acceptance-utils';
test.beforeEach(async({page})=>{await page.routeWebSocket(/wss?:\/\/(?!127\.0\.0\.1)/,socket=>socket.close());});
for(const entry of ['html','svg']) test(`shoestring ${entry}: complete mirror, source offline, one worker, UI game`,async({page})=>{
  test.setTimeout(180000);const fixture=await acceptanceFixture({shoestring:true,entry});
  await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
  try{await page.goto(fixture.url);let app=await mountedApp(page);fixture.setSourceOffline();await page.goto(new URL(`/index.${entry}?view=games`,page.url()).href);app=await mountedApp(page);const game=await uiGame(page,app,fixture.gameUrl);expect(game.url()).toMatch(/\/s\/res\//);expect(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).map(r=>new URL(r.active!.scriptURL).pathname))).toEqual(['/bootstrap-sw.js']);}finally{await fixture.close();}
});
