export const COASTAL_NPCS = {
  arrivals: {
    'Old Bramble': {t:'Sea air, bright glass and a dark lighthouse. Let us see what needs mending.'},
    Pim: {t:'Salted fish, seaweed rolls... I shall need a bigger cooking pot!',e:'excited'},
    Lio: {t:'Three beats to every wave. Tidewhisper already knows how to waltz.'},
    Fern: {t:'The little crabs have houses on their backs! I want a shell hat~'},
  },
  locals: [{name:'Marlo',title:'Lighthouse Keeper',color:'#6fbecb',look:'keeper',portrait:'keeper',height:2.2,radius:.6,
    headR:.36,hat:true,gesture:'wave',home:4,sleepsIndoors:true,animation:'lantern',
    at:{anchor:'house',house:4,distance:2},
    places:{lighthouse:{anchor:'house',house:4,distance:2,wander:1},pier:{anchor:'pier',wander:1}},
    schedule:{morning:'lighthouse',noon:'pier',evening:'lighthouse',night:'home'},
    lines:[
      {t:'Welcome to the stilt village. Our floors stay dry even when the tide comes in.'},
      {t:'The lighthouse needs a new lens and a little fuel. Glass gathers on the beaches after high water.'},
      {t:'Mirelure wears false lights. Watch for the light that moves with the water, then wait for it to surface.',e:'thinking'},
      {t:'Low tide opens the causeway. At high tide, keep your feet on the pier and your float in the sea.'},
    ]}],
};
export const COASTAL_HOUSES = {
  0:null,2:null,3:null,5:null,
  1:{name:'The Saltwind Kitchen',layout:'cottage',owner:'Pim',resident:null,
    props:['oven','counter','bed','table','chest','shelf','lamp','window'],
    note:'Out sharing buns on the beach. Keep the seaweed out of the bread tin! -- Pim',gift:{items:[['seaSalt',2],['silverSprat',2]]},lore:null,coastal:true},
  4:{name:"Marlo's Lighthouse",layout:'cottage',owner:'Marlo',resident:null,
    props:['bed','bookshelf','telescope','table','chest','lamp','window'],
    note:'Checking the pier. The lens cracked in the squall; the keeper never gives up. -- Marlo',gift:{items:[['wood',3],['seaglass',2]]},
    lore:['Keeper\'s log: a clear lens and a steady flame guide boats home.','Mirelure imitates the lanterns. Cross the causeway at low water; beware the false lights.'],coastal:true},
};
