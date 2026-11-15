import { useEffect, useState } from 'react'
import './App.css'
import { STARTING_CHIPS, newHand, act, evaluate, evaluateVisible, advanceRunout, wagerAmount, boardForHanna, HUMAN, pairValue } from './poker'

const CARD_NAMES = ['愚者','魔術師','女教皇','女帝','皇帝','教皇','恋人','戦車','力','隠者','運命の輪','正義','吊るされた男','死神','節制','悪魔','塔','星','月','太陽','審判','世界']
function hannaMood(chips) {
  const ratio = chips / STARTING_CHIPS
  if (ratio <= 0) return -4
  if (ratio <= .25) return -3
  if (ratio <= .5) return -2
  if (ratio < 1) return -1
  if (ratio >= 2) return 2
  if (ratio > 1) return 1
  return 0
}
function Card({ card, hidden = false, facingOpponent = false, paired = false }) {
  const src = hidden ? '/tarot/back.png' : `/tarot/${card.id}.png`
  const description = hidden ? '裏向きのカード' : `${CARD_NAMES[card.id]}・${card.reversed ? '逆位置' : '正位置'}`
  return (
    <div className={`card-slot ${facingOpponent ? 'facing-opponent' : ''}`} title={description}>
      <img className={!hidden && card.reversed && card.id !== 12 && card.id !== 16 ? "card-image-reversed" : ""} src={src} alt={description} draggable="false" />
      {!hidden && HUMAN.has(card.id) && <span className="human-card-mark" title="人間カード" aria-label="人間カード"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="7.5" r="4" fill="currentColor"/><path d="M3.5 21c.2-5.2 3.5-8 8.5-8s8.3 2.8 8.5 8H3.5Z" fill="currentColor"/></svg></span>}
      {!hidden && <span className={`card-number ${card.reversed ? "number-bottom-right" : ""} ${paired ? "paired-number" : ""}`}>{card.id === 6 || card.id === 9 ? <span className="underlined-number">{card.id}</span> : card.id}</span>}
    </div>
  )
}
export default function App() {
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const mobile = viewport.width <= 650
  const fit = mobile ? 1 : Math.min(viewport.width / 1040, viewport.height / 760, 1.35)
  const [game, setGame] = useState(() => newHand())
  const cards = game.cards
  const hannaChips = game.stacks[1]
  const mood = hannaMood(hannaChips)
  const [imageMissing, setImageMissing] = useState(false)
  const [betMultiplier, setBetMultiplier] = useState('call')
  const callAmount = wagerAmount(game,0,'call')
  const selectedAmount = wagerAmount(game,0,betMultiplier)
  const facingBet = callAmount > 0
  const isBet = !facingBet && betMultiplier !== 'call' && betMultiplier !== 'all'
  const postflopCheck = game.street > 0 && !facingBet
  const rank = evaluateVisible([...cards.player,...cards.board.slice(0,game.street)])
  // Highlight every visible pair for the player, including pocket pairs.
  const visibleCards=[...cards.player,...cards.board.slice(0,game.street)]
  const pairedIds=new Set()
  for(let i=0;i<visibleCards.length;i++)for(let j=i+1;j<visibleCards.length;j++){
    if(pairValue(visibleCards[i],visibleCards[j])!==null){
      pairedIds.add(visibleCards[i].id)
      pairedIds.add(visibleCards[j].id)
    }
  }
  const hannaPairedIds=new Set()
  if(game.showOpponent){
    const hannaVisible=[...cards.opponent,...boardForHanna(cards.board)]
    for(let i=0;i<hannaVisible.length;i++)for(let j=i+1;j<hannaVisible.length;j++){
      if(pairValue(hannaVisible[i],hannaVisible[j])!==null){
        hannaPairedIds.add(hannaVisible[i].id)
        hannaPairedIds.add(hannaVisible[j].id)
      }
    }
  }
  const stage=['プリフロップ','フロップ','リバー'][game.street]
  useEffect(()=>{setBetMultiplier(game.street===0||facingBet?'call':'third')},[game.street])
  useEffect(()=>{if(game.street>0&&facingBet&&betMultiplier==='third')setBetMultiplier('call')},[game.street,facingBet,betMultiplier])
  function playerAction(action){
    if(game.finished||game.turn!==0)return
    setGame(act(game,0,action,betMultiplier))
  }
  function nextHand(){
    if(!game.finished)return
    setGame(game.stacks.some(x=>x<=0)?newHand():newHand(game.stacks,game.hand+1))
    setBetMultiplier('call')
  }
  useEffect(()=>{
    if(game.finished||game.turn!==1)return
    const timer=setTimeout(()=>setGame(prev=>prev.finished||prev.turn!==1?prev:act(prev,1,'call')),650)
    return()=>clearTimeout(timer)
  },[game])
  useEffect(()=>{
    if(!game.runout||game.finished)return
    const timer=setTimeout(()=>setGame(prev=>advanceRunout(prev)),850)
    return()=>clearTimeout(timer)
  },[game])
  const hannaRank = game.showOpponent ? evaluate([...cards.opponent,...boardForHanna(cards.board)]).label : ''
  const playerRank=rank.label
  return (
    <main className={`casino ${mobile ? "mobile-casino" : ""}`} style={mobile ? { width: viewport.width, minHeight: viewport.height, height: "auto", transform: "translateX(-50%)" } : { width: 1040, height: 760, transform: `translateX(-50%) scale(${fit})` }}>
      <header className="topbar">
        <div className="brand"><span className="brand-icon">✦</span><span>MANOSABA <strong>TAROT POKER</strong></span></div>
        <button type="button" className="mobile-header-how-to" onClick={() => {}}>How to play</button>
      </header>
      <div className="game-area">
        <section className="opponent-zone" aria-label="対戦相手">
          <button type="button" className="how-to-play" onClick={() => {}}>How to play</button>
          <div className="hanna-portrait">
            {!imageMissing ? <img src={`/hanna/hanna_${mood}.png`} alt="遠野ハンナ" onError={() => setImageMissing(true)} onLoad={() => setImageMissing(false)} /> : <div className="image-placeholder">遠野ハンナ<br /><small>public/hanna/ に画像を配置</small></div>}
          </div>
          <div className="hanna-hand-side"><div className="side-caption">HANNA'S HAND</div><div className="side-cards">{cards.opponent.map((card, i) => <Card key={i} card={card} hidden={!game.showOpponent} paired={hannaPairedIds.has(card.id)} />)}</div><div className={`hand-rank hanna-rank-mobile ${game.showOpponent ? "revealed" : ""}`}>{hannaRank}</div></div>
          <div className="opponent-info">
            <div className="opponent-name"><strong>遠野ハンナ</strong></div>
            <div className="chip-display"><span>CHIPS</span><strong>{hannaChips.toLocaleString()}</strong></div>
            <div className={`hand-rank hanna-rank ${game.showOpponent ? "revealed" : ""}`}>{hannaRank}</div>
          </div>
        </section>
        <section className="table-area" aria-label="カジノテーブル">
          <div className="table-outer">
            <div className="table-felt">
              <div className="table-pattern">✦ <span>TAROT POKER</span> ✦</div>
              <div className="felt-pot"><small>POT</small><strong>{game.pot.toLocaleString()}</strong></div>
              <div className="felt-wager felt-wager-hanna"><span>{game.lastActions?.[1]||'待機'}</span><strong>{game.contrib[1].toLocaleString()}</strong></div>
              <div className="felt-wager felt-wager-player"><span>{game.lastActions?.[0]||'待機'}</span><strong>{game.contrib[0].toLocaleString()}</strong></div>

              <div className="community-hand">
                
                <div className="card-row">{cards.board.slice(0,game.street).map((card, i) => <Card key={i} card={card} paired={pairedIds.has(card.id)} />)}</div>
              </div>
            </div>
          </div>
        <div className="game-action-strip">
            {game.finished && <button type="button" className="game-secondary next-hand-action" onClick={nextHand}>{game.stacks.some(x=>x<=0)?'最初から':'次のハンド'}</button>}
            
        </div>
        </section>
        <section className="player-zone">
          <div className="player-info opponent-info">
            <div className="opponent-name"><strong>あなた</strong></div>
            <div className="chip-display"><span>CHIPS</span><strong>{game.stacks[0].toLocaleString()}</strong></div>
          </div>
          <div className="player-hand-wrap"><div className="hand-rank mobile-rank">{playerRank}</div><div className="player-hand">{cards.player.map((card,i) => <Card key={i} card={card} paired={pairedIds.has(card.id)} />)}</div></div>
          <div className="bet-controls">
            <div className="hand-rank desktop-rank">{playerRank}</div>
            <div className="bet-multipliers">{(game.street===0?['call',2,3,'all']:facingBet?['call','half','pot','all']:['third','half','pot','all']).map(value => <button type="button" key={value} className={betMultiplier === value ? 'chosen' : ''} onClick={() => setBetMultiplier(value)}>{value === 'all' ? 'AI' : value === 'call' ? 'call' : value === 'third' ? '1/3' : value === 'half' ? '1/2' : value === 'pot' ? 'POT' : 'x' + value}</button>)}</div>
            <div className="primary-action-row">
            <button type="button" className={`call-button ${betMultiplier==='all' ? 'action-allin' : betMultiplier==='call' ? 'action-call' : 'action-raise'}`} disabled={game.finished||game.turn!==0} onClick={() => playerAction(betMultiplier==='call'?'call':'raise')}><strong>{betMultiplier==='call'?(callAmount?'コール':'チェック'):betMultiplier==='all'?'オールイン':isBet?'ベット':'レイズ'}</strong><span>{selectedAmount.toLocaleString()}</span></button>
            <button type="button" className={`game-secondary ${postflopCheck ? 'action-check' : ''}`} disabled={game.finished||game.turn!==0} onClick={()=>playerAction(postflopCheck?'call':'fold')}>{postflopCheck?'チェック':'フォールド'}</button>
            </div>

          </div>
        </section>
      </div>
    </main>
  )
}
