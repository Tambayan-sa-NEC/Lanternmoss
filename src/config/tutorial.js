/* Tutorial copy is data: bindings and hero names are resolved when displayed. */
export const TUTORIAL_EVASION = { witch: 'blink', knight: 'dash', ranger: 'leap' };
export const TUTORIAL_STEPS = [
  { id: 'move', title: 'A few steps', text: 'Walk with {moveForward}, {moveLeft}, {moveBack}, {moveRight}. Movement follows the camera. Take a few steps around the village.' },
  { id: 'camera', title: 'Look around', text: 'Drag on the world to turn the camera. The wheel zooms. Your attacks follow the hero, not the camera.' },
  { id: 'talk', title: 'Meet a neighbour', text: 'Walk up to any villager and press {interact} when the Talk prompt appears. Press it again to finish a line; Esc closes dialogue.' },
  { id: 'bag', title: 'Your bag', text: 'Open the bag with {bag}. Move food or tools into its first nine slots to put them on the hotbar. The Craft tab makes your first tools.' },
  { id: 'hotbar', title: 'Keep it handy', text: 'Select a different hotbar slot with 1–9 or click it. Press its number again, or right click, to use the held item. Close the bag first.' },
  { id: 'trail', title: 'Beyond the lanterns', text: 'Walk out past the village lanterns. Monsters appear as red marks on the compass. Start with an ordinary monster; you can retreat to the village to recover.' },
  { id: 'dodge', title: 'Get out of danger', text: 'Use {evasionName} on {evasionKey}. Its brief invulnerability helps you dodge. Watch wind-ups and move clear of coloured attack marks.' },
  { id: 'attack', title: 'Try an ability', text: 'Cast {attackName} with {skill1} or left click. Other skills use {skill2}, {skill3}, {skill4}. They spend your resource and need time to recharge.' },
  { id: 'aim', title: 'Aim your ultimate', text: 'Press {skill5} for {ultimateName}. Move to turn the marker, wheel for distance. Click or press {skill5} again to cast; Esc or right click cancels without spending resource. Try aiming now.' },
  { id: 'fight', title: 'Your first fight', text: 'Defeat an ordinary monster outside the village. Face it, use abilities, and dodge its warning marks. Your pet can help. Low health? Retreat, or use food and potions from the hotbar.' },
  { id: 'lair', title: 'The sealed lair', text: 'Each planet’s boss sleeps until its conditions are met. Find the boss marker on the compass. The lair prompt and Journal Bestiary explain what remains.', acknowledge: true },
];

export const HELP_TOPICS = [
  { id: 'energy', title: 'Energy and recovery', text: 'Energy drains as you explore, faster while sprinting or swimming. Low energy slows healing and sprinting. Eat food from the hotbar, or sleep in a village bed. Fainting returns you home with your bag and gear.' },
  { id: 'tools', title: 'Gathering and tools', text: 'Pick fallen branches and loose stones with {interact}. Craft a Woodcutter’s Axe or Stone Pickaxe in the bag’s Craft tab. Keep tools on the hotbar; {interact} or right click works a nearby resource. Stronger ore needs a stronger pickaxe.' },
  { id: 'stations', title: 'Crafting stations', text: 'Use {interact} by the village workbench, forge, cooking pot or brewing station to open its recipes. A station recipe requires standing nearby; hand recipes work anywhere. Missing ingredients and costs appear in the Craft tab.' },
  { id: 'smelting', title: 'Ore into metal', text: 'At the forge, smelt ore into ingots before making metal tools or gear. Smelting also needs fuel from your bag: wood, charcoal or ember shards. Copper ingots make a better pickaxe and a watering can.' },
  { id: 'fishing', title: 'Fishing', text: 'Craft a fishing rod from wood and sweetleaf, then keep it on the hotbar. Stand by a pond and use {interact} or right click to cast. Wait for the bite, then press {interact} or click. Press again when the reeling needle is in the green to catch the fish.' },
  { id: 'farming', title: 'Seeds and farming', text: 'Use a hoe to till a village farm plot. Hold seeds and use them on the tilled plot, then water it with a watering can. Water again each day; ripe crops can be harvested with {interact}. Plants wait on their own planet when you travel.' },
  { id: 'pets', title: 'Your companion', text: 'Open {petMenu} to see, swap or rename pets. {petCommand} cycles follow, stay, attack and passive; {petAbility} uses the pet’s special ability. Fainted pets rest and return automatically; pet a healthy companion with {interact} to heal it a little. Pets and commands are saved with your adventure.' },
];

export const GATHERING_TIPS = {
  wood: 'Wood! Craft a Woodcutter’s Axe (bag, Craft tab) to chop trees for more, or a fishing rod for the ponds.',
  stone: 'Stone! A Stone Pickaxe (bag, Craft tab) mines rocks and ore veins.',
  seed: 'Seeds! Plant them in the farm by the village: till a plot with a hoe first, then water them.',
  copperOre: 'Copper! Smelt ore into ingots at the forge with fuel. A Copper Pickaxe breaks iron and gem veins; copper also makes a watering can.',
};
export const FAINT_TIP = 'Watch attack warnings and use your evasion skill to get clear. Food restores energy; retreat to the village to heal.';
