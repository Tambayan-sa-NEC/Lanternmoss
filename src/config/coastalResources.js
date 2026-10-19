import { DAY } from './day.js';
// Latest high-water crest. Skips expose only the newest batch, without accumulating rewards.
export const washCycle = seconds => Math.max(0, Math.floor(seconds / DAY.length + 0.1));
export const lowTide = (seconds, lowAt = 0.4) => (1 - Math.cos((seconds / DAY.length - lowAt) * Math.PI * 2)) / 2 <= 0.25;
export const COASTAL_ITEMS = [
  ...[
    ['shell','Shell','A smooth shell left by the tide.','shard',0xffe7cc,3],
    ['pearl','Pearl','A pale pearl from a low-tide clam bed.','gemstone',0xfff5de,25],
    ['blackPearl','Black Pearl','A rare dark pearl from the far beach.','gemstone',0x5f658a,60],
    ['coral','Coral','Coral mined from an exposed reef.','shard',0xff958b,8],
    ['seaSalt','Sea Salt','Crystals from a sun-dried salt pan.','stone',0xf4f7ee,3],
    ['seaweed','Seaweed','Edible seaweed washed onto the beach.','herb',0x4a9d88,3],
    ['seaglass','Seaglass','Sea-smoothed glass for Tide gear and the lighthouse lens.','shard',0x70dfd7,10],
    ['clam','Clam','A fresh clam for coastal chowder.','mushroom',0xf5ceaf,5],
    ['silverSprat','Silver Sprat','A little sea fish, delicious salted.','fish',0x9cdde3,6],
  ].map(([id,name,description,art,color,value])=>({id,name,description,category:'material',icon:{shape:'gem',art,color},value,maxStack:20,
    rarity:id==='blackPearl'?'rare':id==='pearl'?'uncommon':'common'})),
  ...[
    ['saltedFish','Salted Fish','Sea fish preserved with salt.','fish',35,45],
    ['seaweedRoll','Seaweed Roll','Seaweed wrapped around a fresh sea fish.','skewer',40,50],
    ['coastalChowder','Coastal Chowder','A warm bowl of clams, sea fish and salt.','bowl',65,75],
  ].map(([id,name,description,art,hp,energy])=>({id,name,description,category:'consumable',tags:['food','meal'],maxStack:10,value:20,
    icon:{shape:'bun',art,color:0xb8ded0},use:[{effect:'heal',amount:hp},{effect:'energy',amount:energy}]})),
  ...[
    ['tideCirclet','Tide Circlet','head','crown',{maxMana:18,armor:0.03}],
    ['tideMantle','Tide Mantle','armor','mantle',{maxHp:30,armor:0.07}],
    ['tideBoots','Tide Boots','feet','boots',{moveSpeed:0.06,armor:0.03}],
    ['tidePendant','Tide Pendant','charm','pendant',{manaRegen:1.8,hpRegen:.8}],
  ].map(([id,name,slot,art,stats])=>({id,name,description:'Sea-smoothed glass and pearls, made into protective Tide gear.',category:'equipment',
    props:{set:'tide',craftedOnly:true},value:100,icon:{shape:'gem',art,color:0x70dfd7},equip:{slot,tier:3,stats}})),
];
export const COASTAL_RECIPES = [
  {id:'saltedFish',group:'Cooking',station:'pot',result:'saltedFish',needs:[['silverSprat',1],['seaSalt',1]]},
  {id:'seaweedRoll',group:'Cooking',station:'pot',result:'seaweedRoll',needs:[['seaweed',2],['silverSprat',1]]},
  {id:'coastalChowder',group:'Cooking',station:'pot',result:'coastalChowder',needs:[['clam',2],['silverSprat',1],['seaSalt',1]]},
  // forge fees (27h): Tidewhisper's chests and lighthouse quest reserve this one set (BALANCE.budgets, docs/wiki/game-design/balance.md)
  ...['tideCirclet','tideMantle','tideBoots'].map((id,i)=>({id,group:'Armour',station:'forge',result:id,rarity:'rare',
    needs:[['seaglass',4+i*2],['pearl',i===1?2:1],['coral',2],['shell',2]],fuel:2,coins:[70,80,70][i]})),
  {id:'tidePendant',group:'Trinkets',station:'forge',result:'tidePendant',rarity:'rare',needs:[['blackPearl',1],['seaglass',4],['shell',3]],fuel:2,coins:60},
];
