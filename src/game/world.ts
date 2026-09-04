export type Region = 'north' | 'south' | 'island' | 'east';
export type Point = [number, number, number];
export const regions: Record<Region, {name:string; position:Point}> = {
 north:{name:'North bank',position:[-3,0.7,-6]},south:{name:'South bank',position:[-3,0.7,6]},
 island:{name:'Kneiphof island',position:[-2,0.7,0]},east:{name:'Eastern land',position:[7,0.7,0]},
};
export const bridges: {id:number;name:string;from:Region;to:Region;a:Point;b:Point}[] = [
{id:1,name:'Merchant Bridge',from:'north',to:'island',a:[-4.5,.68,-4.3],b:[-4.5,.68,-1.7]},
{id:2,name:'Green Bridge',from:'south',to:'island',a:[-4.5,.68,4.3],b:[-4.5,.68,1.7]},
{id:3,name:'Blacksmith Bridge',from:'north',to:'island',a:[.1,.68,-4.3],b:[.1,.68,-1.7]},
{id:4,name:'Offal Bridge',from:'south',to:'island',a:[.1,.68,4.3],b:[.1,.68,1.7]},
{id:5,name:'Wooden Bridge',from:'north',to:'east',a:[6.2,.68,-4.3],b:[6.2,.68,-1.7]},
{id:6,name:'High Bridge',from:'south',to:'east',a:[6.2,.68,4.3],b:[6.2,.68,1.7]},
{id:7,name:'Honey Bridge',from:'island',to:'east',a:[1.7,.68,0],b:[4.4,.68,0]},
];
export const availableBridges=(at:Region,used:number[])=>bridges.filter(b=>(b.from===at||b.to===at)&&!used.includes(b.id));
export function cross(at:Region,used:number[],id:number){const b=availableBridges(at,used).find(b=>b.id===id);return b?{at:b.from===at?b.to:b.from,used:[...used,id]}:null;}
export const degree=(r:Region)=>bridges.filter(b=>b.from===r||b.to===r).length;
export const sceneDefinition={id:'konigsberg-1736',version:1,seed:1736,period:'18th century',location:'Königsberg',regions,bridges, historicalNote:'A stylised reconstruction preserving the historical seven-bridge connectivity; buildings and dialogue are illustrative.'};
