export const STARTING_CHIPS=1000
export const HUMAN=new Set([0,1,2,3,4,5,6,9,12,14,21])
const PAIRS=[[2,3],[2,4],[2,5],[3,4],[3,5],[4,5],[2,14],[3,14],[4,7],[4,8],[7,8],[4,12],[6,9],[10,21],[11,20],[12,20],[13,15],[13,16],[15,16],[17,18],[17,19],[18,19]]
export const effective=c=>({...c,reversed:c.id===12||c.id===16||c.reversed})
const upright=c=>!effective(c).reversed
// The shared board is viewed from opposite ends; 12 and 16 remain reversed for both players.
export const boardForHanna=board=>board.map(c=>effective({...c,reversed:!c.reversed}))
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
 // 6-9 pairs only with opposite orientations, including Hanna's flipped board.
 if(x===6&&y===9)return a.reversed!==b.reversed?9:null
 if(PAIRS.some(p=>p[0]===x&&p[1]===y)){
   if((x===4&&y===12)||(x===12&&y===20)||(x===13&&y===16)||(x===15&&y===16))return upright(a.id===12||a.id===16?b:a)?y:null
   return both?y:null
 }
 return null
}
const lex=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]??-1)!==(b[i]??-1))return (a[i]??-1)-(b[i]??-1)}return 0}
// Select only the strongest pair for visual highlighting, using the same
// pair-value and card-number tie-break as hand evaluation.
export function selectedPairIds(cards){
 let best=null
 for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++){
  const value=pairValue(cards[i],cards[j])
  if(value===null)continue
  const ids=[cards[i].id,cards[j].id].sort((a,b)=>b-a)
  if(!best||value>best.value||(value===best.value&&lex(ids,best.ids)>0))best={value,ids}
 }
 return new Set(best?best.ids:[])
}
export function evaluateVisible(cards){
 if(cards.length>=4)return evaluate(cards.slice(0,4))
 const all=cards.map(effective)
 const ids=all.map(c=>c.id).sort((a,b)=>b-a)
 let best={rank:0,tie:ids,label:'ハイカード'+ids[0]}
 for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
  const value=pairValue(all[i],all[j])
  if(value===null)continue
  const pairIds=[all[i].id,all[j].id].sort((a,b)=>b-a)
  const candidate={rank:1,tie:[value,...pairIds],label:'ワンペア'+value}
  if(best.rank<1||lex(candidate.tie,best.tie)>0)best=candidate
 }
 if(all.length===3){
  if(ids[0]===ids[1]+1&&ids[1]===ids[2]+1&&all.every(upright))best={rank:2,tie:[ids[0]],label:'ストレート'+ids[0]}
  if([[0,1],[0,2],[1,2]].every(([i,j])=>pairValue(all[i],all[j])!==null))best={rank:3,tie:ids,label:'スリーカード'+ids[0]}
 }
 return best
}
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
// Card IDs used by the selected hand: three for straight/three-card,
// otherwise the strongest pair. This mirrors the hand evaluator's ranking.
export function selectedHandIds(cards){
 if(cards.length<2)return new Set()
 const result=evaluateVisible(cards)
 if(result.rank<2)return result.rank===1?selectedPairIds(cards):new Set()
 const best=result.tie
 for(let i=0;i<cards.length;i++)for(let j=i+1;j<cards.length;j++)for(let k=j+1;k<cards.length;k++){
  const triple=[cards[i],cards[j],cards[k]]
  const hand=evaluateVisible(triple)
  if(hand.rank===result.rank&&lex(hand.tie,best)===0)return new Set(triple.map(c=>c.id))
 }
 return new Set()
}
// For a one-pair hand, the high card is the card whose ID equals
// the pair's comparison value (which can be lower than the other ID).
export function selectedPairHighIds(cards){
 const result=evaluateVisible(cards)
 if(result.rank!==1)return new Set()
 const chosen=selectedPairIds(cards)
 const value=result.tie[0]
 return chosen.has(value)?new Set([value]):new Set()
}
// Human attribute badges used specifically as a human-link condition
// in the selected pair or three-card hand (not just any human card).
export function selectedHumanSpecialIds(cards){
 const selected=selectedHandIds(cards)
 if(!selected.size)return new Set()
 const chosen=cards.filter(c=>selected.has(c.id))
 const marked=new Set()
 for(let i=0;i<chosen.length;i++)for(let j=i+1;j<chosen.length;j++){
  const a=effective(chosen[i]),b=effective(chosen[j])
  if(pairValue(a,b)===null)continue
  for(const [source,human] of [[a,b],[b,a]]){
   if(!HUMAN.has(human.id))continue
   const sourceUpright=upright(source),humanUpright=upright(human)
   const link=(source.id===0&&sourceUpright&&!humanUpright)
    ||(source.id===1&&sourceUpright&&humanUpright)
    ||(source.id===11&&sourceUpright&&humanUpright)
    ||([13,15].includes(source.id)&&sourceUpright&&!humanUpright)
    ||(source.id===16&&!humanUpright)
   if(link)marked.add(human.id)
  }
 }
 return marked
}
export function drawCards(){
 const deck=Array.from({length:22},(_,id)=>id)
 for(let i=21;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}
 return {player:deck.slice(0,2).map(id=>effective({id,reversed:false})),board:deck.slice(2,4).map(id=>effective({id,reversed:Math.random()<.5})),opponent:deck.slice(4,6).map(id=>effective({id,reversed:false}))}
}
export function blindFor(hand){return Math.max(1,Math.floor(32*Math.pow(1.5,Math.floor((hand-1)/10))))}
export function newHand(chips=[STARTING_CHIPS,STARTING_CHIPS],hand=1){
 const bb=blindFor(hand),sb=Math.floor(bb/2),button=(hand-1)%2
 const stacks=chips.slice(),contrib=[0,0],committed=[0,0]
 for(const [p,amount] of [[button,sb],[1-button,bb]]){const v=Math.min(stacks[p],amount);stacks[p]-=v;contrib[p]+=v;committed[p]+=v}
 return {cards:drawCards(),hand,button,bb,sb,stacks,contrib,committed,pot:0,street:0,turn:button,checks:0,raises:0,finished:false,winner:null,message:'プリフロップ',showOpponent:false,runout:false,pendingStreet:false,pendingShowdown:false,lastActions:[button===0?'SB':'BB',button===1?'SB':'BB']}
}
export function wagerAmount(s,who,multiplier='call'){
 const other=1-who,toCall=Math.max(0,s.contrib[other]-s.contrib[who])
 if(multiplier==='call')return Math.min(toCall,s.stacks[who])
 const target=multiplier==='all'?s.contrib[who]+s.stacks[who]:multiplier==='third'?s.contrib[other]+Math.floor(s.pot/3):multiplier==='half'?s.contrib[other]+Math.floor(s.pot/2):multiplier==='pot'?s.contrib[other]+s.pot:Math.max(s.contrib[other]+s.bb,s.contrib[other]*Number(multiplier))
 return Math.min(s.stacks[who],Math.max(toCall,target-s.contrib[who]))
}
// Heads-up: an uncalled all-in excess is not part of the pot.
// Return it to the larger contributor before any chips are collected.
function refundUncalled(n){
 const diff=n.committed[0]-n.committed[1]
 if(diff===0)return
 const who=diff>0?0:1,excess=Math.abs(diff)
 n.stacks[who]+=excess
 n.committed[who]-=excess
 // Contributions from completed streets have already been collected;
 // the unmatched amount belongs to the current street.
 n.contrib[who]-=excess
}
export function settleShowdown(s){
 const n={...s,stacks:s.stacks.slice(),street:2,runout:false,pendingShowdown:false,showOpponent:true,finished:true,turn:-1,lastActions:['','']}
 n.pot+=n.contrib[0]+n.contrib[1];n.contrib=[0,0]
 const a=evaluate([...n.cards.player,...n.cards.board]),b=evaluate([...n.cards.opponent,...boardForHanna(n.cards.board)])
 const cmp=a.rank-b.rank||lex(a.tie,b.tie)
 n.winner=cmp>0?0:cmp<0?1:-1
 if(n.winner===-1){n.stacks[0]+=Math.floor(n.pot/2);n.stacks[1]+=n.pot-Math.floor(n.pot/2)}
 else n.stacks[n.winner]+=n.pot
 n.message=cmp>0?'あなたの勝利！':cmp<0?'遠野ハンナの勝利':'引き分け'
 return n
}
export function advanceShowdown(s){
 if(!s.pendingShowdown||s.finished)return s
 return settleShowdown(s)
}
export function advanceStreet(s){
 if(!s.pendingStreet||s.finished)return s
 const street=s.street+1
 return {...s,street,pot:s.pot+s.contrib[0]+s.contrib[1],pendingStreet:false,contrib:[0,0],lastActions:['',''],checks:0,raises:0,turn:1-s.button,message:['プリフロップ','フロップ','リバー'][street]}
}
export function advanceRunout(s){
 if(!s.runout||s.finished)return s
 if(s.street<2)return {...s,street:s.street+1,pot:s.pot+s.contrib[0]+s.contrib[1],contrib:[0,0],lastActions:['',''],message:s.street===0?'フロップ公開':'リバー公開'}
 return {...s,runout:false,pendingShowdown:true,turn:-1,message:'ショウダウン'}
}
export function act(s,who,action,multiplier='call'){
 if(s.finished||s.pendingStreet||s.pendingShowdown||s.turn!==who)return s
 const n={...s,stacks:s.stacks.slice(),contrib:s.contrib.slice(),committed:s.committed.slice(),lastActions:[...(s.lastActions||['',''])]}
 const other=1-who,toCall=Math.max(0,n.contrib[other]-n.contrib[who])
 if(action==='fold'){n.lastActions[who]='フォールド';n.finished=true;n.winner=other;n.message=who===0?'フォールド：遠野ハンナの勝利':'遠野ハンナがフォールド';n.pot+=n.contrib[0]+n.contrib[1];n.stacks[other]+=n.pot;n.turn=-1;return n}
 let amount=0
 if(action==='raise'){
  amount=wagerAmount(n,who,multiplier)
  if(amount<=toCall&&n.stacks[who]>toCall)return s
  n.raises++
 }else amount=Math.min(toCall,n.stacks[who])
 n.lastActions[who]=action==='raise'?(multiplier==='all'||amount===s.stacks[who]?'オールイン':toCall===0?'ベット':'レイズ'):(toCall>0?'コール':'チェック')
 n.stacks[who]-=amount;n.contrib[who]+=amount;n.committed[who]+=amount
 const matched=n.contrib[0]===n.contrib[1]||n.stacks[0]===0||n.stacks[1]===0
 if(action==='raise'&&amount>toCall){n.checks=0;n.turn=other;return n}
 if(!matched){n.turn=other;return n}
 if(n.stacks.some(x=>x===0))refundUncalled(n)
 if(n.stacks.some(x=>x===0)&&!(action==='raise'&&amount>toCall)){
  // Keep wagers visible throughout the delay; collect on the first board reveal.
  n.runout=true;n.turn=-1;n.message='オールイン：場札公開中'
  return n
 }
 n.checks++
 if(n.checks<2&&n.raises===0){n.turn=other;return n}
 if(n.street===2){n.pendingShowdown=true;n.turn=-1;n.message='ショウダウン';return n}
 if(n.stacks.some(x=>x===0)){
  // Do not settle until every community card has been revealed.
  n.runout=true;n.turn=-1;n.message='オールイン：場札公開中'
  return n
 }
 n.pendingStreet=true;n.turn=-1
 n.message='次の場札を公開します'
 return n
}
