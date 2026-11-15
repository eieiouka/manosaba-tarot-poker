export const STARTING_CHIPS=1280
export const HUMAN=new Set([0,1,2,3,4,5,6,9,12,14,21])
const PAIRS=[[2,3],[2,4],[2,5],[3,4],[3,5],[4,5],[2,14],[3,14],[4,7],[4,8],[7,8],[4,12],[6,9],[10,21],[11,20],[12,20],[13,15],[13,16],[15,16],[17,18],[17,19],[18,19]]
export const effective=c=>({...c,reversed:c.id===12||c.id===16||c.reversed})
const upright=c=>!effective(c).reversed
export function pairValue(a,b){
 a=effective(a);b=effective(b)
 const x=Math.min(a.id,b.id),y=Math.max(a.id,b.id)
 const both=upright(a)&&upright(b)
 const human=(c)=>HUMAN.has(c.id)
 const special=(c,h)=>[13,15,16].includes(c.id)&&upright(c.id===16?{...c,reversed:false}:c)&&!upright(h)&&human(h)
 // 16 is permanently reversed but its human-link ability is always active.
 if((a.id===16&&human(b)&&b.reversed)||(b.id===16&&human(a)&&a.reversed))return 16
 if(special(a,b)||special(b,a))return y
 if(x===0&&((a.id===0&&upright(a)&&human(b)&&b.reversed)||(b.id===0&&upright(b)&&human(a)&&a.reversed)))return y
 if(both&&((a.id===1&&human(b))||(b.id===1&&human(a))))return 1
 if(both&&((a.id===11&&human(b))||(b.id===11&&human(a))))return a.id===11?b.id:a.id
 if(x===6&&y===9&&a.reversed!==b.reversed)return 9
 if(PAIRS.some(p=>p[0]===x&&p[1]===y)){
   if((x===4&&y===12)||(x===12&&y===20)||(x===13&&y===16)||(x===15&&y===16))return upright(a.id===12||a.id===16?b:a)?y:null
   return both?y:null
 }
 return null
}
const lex=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]??-1)!==(b[i]??-1))return (a[i]??-1)-(b[i]??-1)}return 0}
export function evaluate(cards){
 const all=cards.map(effective);let best={rank:0,tie:[],label:'ハイカード'}
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)for(let k=j+1;k<4;k++){
  const c=[all[i],all[j],all[k]],ids=c.map(x=>x.id).sort((a,b)=>b-a)
  const pairs=[[0,1],[0,2],[1,2]].map(([x,y])=>({value:pairValue(c[x],c[y]),other:[c[x].id,c[y].id].sort((a,b)=>b-a)})).filter(x=>x.value!==null)
  let rank=0,tie=ids,label='ハイカード '+ids[0]
  if(pairs.length){const p=pairs.sort((a,b)=>b.value-a.value||lex(b.other,a.other))[0];rank=1;tie=[p.value,...p.other];label='ワンペア'+p.value}
  if(ids[0]===ids[1]+1&&ids[1]===ids[2]+1&&c.every(upright)){rank=2;tie=[ids[0]];label='ストレート'+ids[0]}
  if(pairs.length===3){rank=3;tie=ids;label='スリーカード'+ids[0]}
  if(rank>best.rank||(rank===best.rank&&lex(tie,best.tie)>0))best={rank,tie,label}
 }
 return best
}
export function drawCards(){
 const deck=Array.from({length:22},(_,id)=>id)
 for(let i=21;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
 return {player:deck.slice(0,2).map(id=>effective({id,reversed:false})),board:deck.slice(2,4).map(id=>effective({id,reversed:Math.random()<.5})),opponent:deck.slice(4,6).map(id=>effective({id,reversed:false}))}
}
export function blindFor(hand){return Math.max(1,Math.round(32*Math.pow(1.5,Math.floor((hand-1)/10))))}
export function newHand(chips=[STARTING_CHIPS,STARTING_CHIPS],hand=1){
 const bb=blindFor(hand),sb=Math.round(bb/2),button=(hand-1)%2
 const stacks=chips.slice(),contrib=[0,0],committed=[0,0]
 for(const [p,amount] of [[button,sb],[1-button,bb]]){const v=Math.min(stacks[p],amount);stacks[p]-=v;contrib[p]+=v;committed[p]+=v}
 return {cards:drawCards(),hand,button,bb,sb,stacks,contrib,committed,pot:contrib[0]+contrib[1],street:0,turn:button,checks:0,raises:0,finished:false,winner:null,message:'プリフロップ',showOpponent:false}
}
export function wagerAmount(s,who,multiplier='call'){
 const other=1-who,toCall=Math.max(0,s.contrib[other]-s.contrib[who])
 if(multiplier==='call')return Math.min(toCall,s.stacks[who])
 const target=multiplier==='all'?s.contrib[who]+s.stacks[who]:Math.max(s.contrib[other]+s.bb,s.contrib[other]*Number(multiplier))
 return Math.min(s.stacks[who],Math.max(toCall,target-s.contrib[who]))
}
export function act(s,who,action,multiplier='call'){
 if(s.finished||s.turn!==who)return s
 const n={...s,stacks:s.stacks.slice(),contrib:s.contrib.slice(),committed:s.committed.slice()}
 const other=1-who,toCall=Math.max(0,n.contrib[other]-n.contrib[who])
 if(action==='fold'){n.finished=true;n.winner=other;n.message=who===0?'フォールド：遠野ハンナの勝利':'遠野ハンナがフォールド';n.stacks[other]+=n.pot;n.turn=-1;return n}
 let amount=0
 if(action==='raise'){
  amount=wagerAmount(n,who,multiplier)
  if(amount<=toCall&&n.stacks[who]>toCall)return s
  n.raises++
 }else amount=Math.min(toCall,n.stacks[who])
 n.stacks[who]-=amount;n.contrib[who]+=amount;n.committed[who]+=amount;n.pot+=amount
 const matched=n.contrib[0]===n.contrib[1]||n.stacks[0]===0||n.stacks[1]===0
 if(action==='raise'&&amount>toCall){n.checks=0;n.turn=other;return n}
 if(!matched){n.turn=other;return n}
 n.checks++
 if(n.checks<2&&n.raises===0){n.turn=other;return n}
 if(n.street===2||n.stacks.some(x=>x===0)){
  const a=evaluate([...n.cards.player,...n.cards.board]),b=evaluate([...n.cards.opponent,...n.cards.board])
  const cmp=a.rank-b.rank||lex(a.tie,b.tie)
  n.finished=true;n.showOpponent=true;n.winner=cmp>0?0:cmp<0?1:-1
  if(n.winner===-1){n.stacks[0]+=Math.floor(n.pot/2);n.stacks[1]+=n.pot-Math.floor(n.pot/2)}
  else n.stacks[n.winner]+=n.pot
  n.message=cmp>0?'あなたの勝利！':cmp<0?'遠野ハンナの勝利':'引き分け'
  n.turn=-1;return n
 }
 n.street++;n.contrib=[0,0];n.checks=0;n.raises=0;n.turn=1-n.button
 n.message=['プリフロップ','フロップ','リバー'][n.street]
 return n
}
