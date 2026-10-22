import test from 'node:test';
import assert from 'node:assert/strict';
import { contentProblems, assertReleasedContent, frameLimitMs } from '../src/config/contentGate.js';
import { PERFORMANCE_REFERENCE, referenceProfile } from '../src/config/render.js';
import { PLANET_CATALOG, PLANETS } from '../src/config/planets.js';
import { COMBAT } from '../src/config/combat.js';
import { ITEM_DEFINITIONS } from '../src/config/items.js';
import { TREE_KINDS } from '../src/config/flora.js';
import { CRITTER_DEFS } from '../src/config/critters.js';
import { WEATHER_KINDS } from '../src/config/weather.js';
import { NODE_KINDS } from '../src/config/resources.js';
import { BESTIARY_ENTRIES } from '../src/config/bestiary.js';
import { CHEST_KINDS } from '../src/config/chests.js';
import { MUSIC_THEMES } from '../src/config/music.js';
import { HOUSES } from '../src/config/houses.js';
import { expansionAchievements, ACHIEVEMENTS } from '../src/config/achievements.js';
import { campaignRows } from '../src/config/campaignPresentation.js';
import { releasedEnemyTypes } from '../src/config/releasedEnemies.js';
import { addXp, xpToNext } from '../src/progression/leveling.js';
import { sanitizeSave } from '../src/core/save.js';
import { readFileSync } from 'node:fs';

function fixture(id='newWorld') {
  const p=JSON.parse(JSON.stringify(PLANETS[1])); Object.assign(p,{id,act:2,seed:12345,expectedLevel:[7,10],lowLevel:9,
    roster:['probeA','probeB','probeC'].map(type=>({type,count:8})),boss:{type:'probeBoss',trophy:'emberCrown',summon:{level:8}},
    miniBosses:[{type:'probeMini'}],material:'probeMaterial',weather:{probeWeather:1},music:'probeScore',mechanic:'probeMode',
    wildlife:{critters:[['bunny',3],['deer',2]],rare:'probeRare'},resources:{nodes:[['branches',3]],rare:[['probeVein',1]]},
    npcs:{locals:[{name:'Probe Keeper',look:'smith',home:4,lines:[{t:'Hello'}]}],arrivals:Object.fromEntries(['Old Bramble','Pim','Lio','Fern'].map(name=>[name,{t:'Welcome'}]))},houses:{4:{owner:'Probe Keeper'}}});
  const enemies={...COMBAT.enemies};for(const type of ['probeA','probeB','probeC','probeBoss','probeMini'])enemies[type]={ai:type==='probeBoss'||type==='probeMini'?'boss':'probe',behavior:type==='probeBoss'?'probeBoss':type==='probeMini'?'probeMini':'probe',miniBoss:type==='probeMini'};
  const r={maxLevel:16,radius:72,houses:HOUSES,enemies,models:Object.fromEntries(Object.keys(enemies).map(id=>[id,()=>{}])),
    behaviors:{probe:{think(){}},probeBoss:{think(){}},probeMini:{think(){}}},trees:TREE_KINDS,
    treeModels:Object.fromEntries(Object.keys(TREE_KINDS).map(id=>[id,()=>{}])),critters:{...CRITTER_DEFS,probeRare:{rare:{gift:'goldenClover'}}},
    weather:{...WEATHER_KINDS,probeWeather:{}},nodes:{...NODE_KINDS,probeVein:{rare:true,drops:[['probeMaterial',1]]}},
    items:new Set([...ITEM_DEFINITIONS.map(d=>d.id),'probeMaterial']),quests:{probeQuest:{title:'A favour',giver:'Probe Keeper',planet:id,steps:[{kind:'collect',item:'probeMaterial',count:1}]}},
    locals:{smith(){}},music:{...MUSIC_THEMES,probeScore:{pad:[100,200],notes:[300],interval:[1000,2000]}},
    bestiary:{...BESTIARY_ENTRIES,...Object.fromEntries(['probeA','probeB','probeC','probeBoss','probeMini'].map(id=>[id,{blurb:'An original creature.',counters:['Step aside.']}]))},
    travelers:['Old Bramble','Pim','Lio','Fern'],chests:CHEST_KINDS,mechanicKnown:id=>id==='probeMode',
    ceilings:{[id]:{calls:1000,triangles:300000}},targetFrameMs:1000/60,releases:{[id]:{
      device:`${PERFORMANCE_REFERENCE.renderer} (synthetic test fixture)`,quality:'high',viewport:[1920,1080],dirty:false,gpuTiming:false,browser:{headless:false},candidateCommit:'a'.repeat(40),
      rows:PERFORMANCE_REFERENCE.heroes.flatMap(hero=>PERFORMANCE_REFERENCE.seeds.flatMap(seed=>PERFORMANCE_REFERENCE.scenes.map(scene=>
        ({hero,seed,scene,gpu:PERFORMANCE_REFERENCE.renderer,quality:'high',drawingBuffer:[1920,1080],samples:90,p95FrameMs:16,calls:900,triangles:200000}))))}}};
  return {p,r,catalog:[PLANETS[0],p],check:()=>contentProblems(p,[PLANETS[0],p],r)};
}

test('a complete expansion fixture passes; published drafts remain blocked by generation/content checks',()=>{
  const f=fixture();assert.deepEqual(f.check(),[]);
  assert.throws(()=>assertReleasedContent([...PLANETS,{...PLANET_CATALOG.find(p=>p.id==='lanternMoon'),released:true}],f.r),/generation data/);
  // Duskhollow has its generation data now (30e gave it a roster); the content gate is what still blocks it.
  assert.throws(()=>assertReleasedContent([...PLANETS,{...PLANET_CATALOG.find(p=>p.id==='duskhollow'),released:true}],f.r),/duskhollow/);
  assert.doesNotThrow(()=>assertReleasedContent([f.p],f.r));
  assert.throws(()=>assertReleasedContent([{...f.p,released:false}],f.r),/starting world/);
});
test('content references and real registration contracts reject incomplete modules',()=>{
  const cases=[f=>delete f.r.models.probeA,f=>delete f.r.behaviors.probeBoss,f=>f.p.roster.push({type:'missing',count:1}),
    f=>delete f.r.bestiary.probeA,f=>f.p.flora.trees.missing=1,f=>f.p.material='missing',f=>f.p.weather={missing:1},
    f=>f.p.resources.nodes=[['missing',1]],f=>f.p.npcs.locals[0].look='missing',f=>f.p.boss.summon.quest='missing',
    f=>f.p.boss.trophy='missing',f=>f.p.music='missing',f=>f.p.mechanic='missing',f=>f.p.expectedLevel=[7,17],
    f=>f.r.quests.probeQuest.steps[0].item='missing',f=>f.p.houses[4].gift={items:[['missing',1]]},
    f=>f.p.physics={seaLevel:73,seaMaxLevel:72},f=>f.p.physics={gravity:NaN}];
  for(const mutate of cases){const f=fixture();mutate(f);assert.ok(f.check().length>0,mutate.toString());}
});
test('new worlds cannot waive distinct content or performance readiness',()=>{
  const cases=[f=>f.p.roster=[{type:'goblin',count:24}],f=>f.r.models.probeA=f.r.models.goblin,
    f=>f.p.boss.type='gloomcap',f=>f.r.behaviors[f.r.enemies.gloomcap.behavior]=f.r.behaviors.probeBoss,
    f=>f.p.miniBosses=[],f=>f.p.flora.trees={pine:1},f=>f.p.wildlife.critters=[['bunny',3]],
    f=>f.p.wildlife.rare='goldBunny',f=>f.p.weather={clear:1},f=>f.p.material='glowcap',f=>f.p.resources.rare=[],
    f=>f.p.npcs.locals=[],f=>f.p.npcs.arrivals={},f=>f.p.music='cozy',f=>delete f.p.forage,f=>delete f.r.releases.newWorld,
    f=>f.r.releases.newWorld.rows[1].p95FrameMs=30,f=>f.r.releases.newWorld.rows.pop(),
    f=>f.r.releases.newWorld.device='Software renderer',f=>f.r.releases.newWorld.rows[0].calls=2000];
  for(const mutate of cases){const f=fixture();mutate(f);assert.ok(f.check().length>0,mutate.toString());}
});
test('frame budget allows the measured 60 Hz frame clock, never a slow or missing one',()=>{
  const target=1000/60,clock={samples:240,medianMs:16.7,p95Ms:16.8};
  assert.equal(frameLimitMs(target,undefined),target);assert.equal(frameLimitMs(target,clock),16.8);
  assert.equal(frameLimitMs(target,{...clock,p95Ms:16}),target,'a tight clock never lowers below the target');
  assert.equal(frameLimitMs(target,{samples:240,medianMs:33.3,p95Ms:33.5}),target,'a 30 Hz clock cannot loosen the budget');
  assert.equal(frameLimitMs(target,{samples:240,medianMs:8.3,p95Ms:33.5}),target,'a jittery 120 Hz clock is outside the approved 60 Hz calibration band');
  assert.equal(frameLimitMs(target,{...clock,samples:60}),target,'a short calibration is ignored');
  const f=fixture(),report=f.r.releases.newWorld;for(const row of report.rows)row.p95FrameMs=16.8;
  assert.ok(f.check().length>0,'16.8 ms fails without a recorded clock');
  report.frameClock=clock;assert.deepEqual(f.check(),[]);
  report.rows[2].p95FrameMs=16.9;assert.ok(f.check().length>0,'slower than the empty-page clock fails');
});

test('desktop reference requires the measured RTX 4050, full matrix and clean 1080p High candidate',()=>{
  const cases=[f=>f.r.releases.newWorld.device='Intel Iris Xe',f=>f.r.releases.newWorld.quality='low',
    f=>f.r.releases.newWorld.viewport=[1280,720],f=>f.r.releases.newWorld.dirty=true,
    f=>delete f.r.releases.newWorld.candidateCommit,f=>f.r.releases.newWorld.gpuTiming=true,
    f=>f.r.releases.newWorld.browser.headless=true,f=>f.r.releases.newWorld.rows[17].gpu='Intel UHD',
    f=>f.r.releases.newWorld.rows[17].quality='low',f=>f.r.releases.newWorld.rows[17].drawingBuffer=[1280,720],
    f=>f.r.releases.newWorld.rows[17].p95FrameMs=30,f=>f.r.releases.newWorld.rows[17].calls=2000,
    f=>f.r.releases.newWorld.rows[17]=f.r.releases.newWorld.rows[0]];
  assert.equal(referenceProfile(undefined),false);
  for(const mutate of cases){const f=fixture();mutate(f);assert.ok(f.check().length>0,mutate.toString());}
});
test('only the secret Moon waives its mini boss and requires no farm/cave plus a small population floor',()=>{
  const f=fixture('lanternMoon');Object.assign(f.p,{secret:true,miniBosses:[],farm:false,caves:false,population:{min:3},unlock:{bosses:['lanternmoss'],night:true,rareGifts:['goldenClover']}});
  assert.deepEqual(f.check(),[]); f.p.secret=false; assert.ok(f.check().length);f.p.secret=true;f.p.farm=true;assert.ok(f.check().length);
  f.p.farm=false;f.p.caves=true;assert.ok(f.check().length);f.p.caves=false;f.p.unlock.bosses=['missing'];assert.ok(f.check().length);
});
test('title previews mask the secret and distinguish planned worlds from released destinations',()=>{
  const rows=campaignRows(PLANET_CATALOG,COMBAT.enemies);assert.deepEqual(rows.map(r=>r.act),[1,2]);
  assert.deepEqual(rows[1].planets.map(p=>p.name),['Tidewhisper','Duskhollow','?']);assert.ok(rows[1].planets.every(p=>!p.released));
});
test('expansion awards activate incrementally without changing the Act I achievement or including secrets in five-world completion',()=>{
  assert.deepEqual(expansionAchievements(PLANET_CATALOG),[]);assert.ok(!ACHIEVEMENTS.some(a=>a.id==='fiveWorlds'));
  const catalog=PLANET_CATALOG.map(p=>({...p}));catalog[3].released=true;assert.deepEqual(expansionAchievements(catalog).map(a=>a.id),['tideBoss']);
  catalog[4].released=true;const five=expansionAchievements(catalog).find(a=>a.id==='fiveWorlds');assert.equal(five.goal.bosses.length,5);assert.ok(!five.goal.bosses.includes('nyxra'));
  catalog[5].released=true;assert.ok(expansionAchievements(catalog).find(a=>a.id==='moonBoss').secret);
  assert.deepEqual(ACHIEVEMENTS.find(a=>a.id==='allBosses').goal.bosses,['gloomcap','pyrrhax','malgrath']);
});
test('staged enemies do not increase bestiary goals until release, including summons',()=>{
  const f=fixture();assert.ok(!releasedEnemyTypes([{...f.p,released:false}],f.r.enemies).has('probeA'));
  f.r.enemies.probeBoss.attacks={summon:{types:['probeChild']}};const types=releasedEnemyTypes([f.p],f.r.enemies);
  assert.ok(types.has('probeA')&&types.has('probeChild')&&types.has('slimeling'));
});
test('level 10 continues along the unchanged XP formula to cap 16 and new levels survive v1 cleaning',()=>{
  assert.equal(xpToNext(10),599);assert.equal(addXp(10,0,599).level,11);assert.equal(addXp(1,0,1e9).level,16);
  for(const level of [10,11,16]){const old=JSON.parse(readFileSync(new URL('fixtures/save-v1.json',import.meta.url),'utf8'));old.systems.player.level=level;old.systems.player.xp=0;assert.equal(sanitizeSave(old).systems.player.level,level);}
});
