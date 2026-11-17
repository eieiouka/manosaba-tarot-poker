import { useEffect, useState } from 'react'
import './App.css'
import { STARTING_CHIPS, newHand, act, evaluate, evaluateVisible, advanceRunout, advanceStreet, advanceShowdown, wagerAmount, boardForHanna, HUMAN, selectedHandIds, selectedHumanSpecialIds, selectedPairHighIds } from './poker'

const CARD_NAMES = ['愚者','魔術師','女教皇','女帝','皇帝','教皇','恋人','戦車','力','隠者','運命の輪','正義','吊るされた男','死神','節制','悪魔','塔','星','月','太陽','審判','世界']
function hannaMood(chips) {
  const ratio = chips / STARTING_CHIPS
  if (ratio <= .25) return -1
  if (ratio <= .5) return 0
  if (ratio < 1) return 1
  if (ratio >= 2) return 4
  if (ratio > 1) return 3
  return 1
}
function Card({ card, hidden = false, facingOpponent = false, paired = false, pairTone = 'player', humanSpecialTone = '', highTone = '', glowTone = '' }) {
  const src = hidden ? '/tarot/back.png' : `/tarot/${card.id}.png`
  const description = hidden ? '裏向きのカード' : `${CARD_NAMES[card.id]}・${card.reversed ? '逆位置' : '正位置'}`
  return (
    <div className={`card-slot ${facingOpponent ? 'facing-opponent' : ''} ${paired ? `paired-card paired-card-${pairTone}` : ''} ${highTone ? `high-card-${highTone}` : ''} ${glowTone ? `hand-glow-${glowTone}` : ''}`} title={description}>
      <img className={!hidden && card.reversed && card.id !== 12 && card.id !== 16 ? "card-image-reversed" : ""} src={src} alt={description} draggable="false" />
      {!hidden && HUMAN.has(card.id) && <span className={`human-card-mark ${humanSpecialTone ? `human-special-${humanSpecialTone}` : ""}`} title="人間カード" aria-label="人間カード"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="7.5" r="4" fill="currentColor"/><path d="M3.5 21c.2-5.2 3.5-8 8.5-8s8.3 2.8 8.5 8H3.5Z" fill="currentColor"/></svg></span>}
      {!hidden && <span className={`card-number ${card.reversed ? "number-bottom-right" : ""} ${paired ? "paired-number" : ""} ${paired ? `paired-${pairTone}` : ""} ${highTone ? `high-number-${highTone}` : ""}`}>{card.id === 6 || card.id === 9 ? <span className="underlined-number">{card.id}</span> : card.id}</span>}
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
  // Show the result expression for folds as well as showdowns.
  // A final game loss takes priority over the ordinary loss expression.
  const mood = game.finished && game.winner === 0 && game.stacks[1] === 0
    ? -4
    : game.finished && game.winner !== -1
      ? (game.winner === 0 ? -2 : 2)
      : hannaMood(game.stacks[1] + game.committed[1])
  const [imageMissing, setImageMissing] = useState(false)
  const [betMultiplier, setBetMultiplier] = useState('call')
  const callAmount = wagerAmount(game,0,'call')
  const selectedAmount = wagerAmount(game,0,betMultiplier)
  const facingBet = callAmount > 0
  const isBet = !facingBet && betMultiplier !== 'call' && betMultiplier !== 'all'
  const postflopCheck = game.street > 0 && !facingBet
  const rank = evaluateVisible([...cards.player,...cards.board.slice(0,game.street)])
  // Highlight only the pair adopted as strongest, not every valid pair.
  const visibleCards=[...cards.player,...cards.board.slice(0,game.street)]
  const pairedIds=selectedHandIds(visibleCards)
  const hannaPairedIds=game.showOpponent
    ? selectedHandIds([...cards.opponent,...boardForHanna(cards.board)])
    : new Set()
  const highIds=selectedPairHighIds(visibleCards)
  const hannaHighIds=game.showOpponent
    ? selectedPairHighIds([...cards.opponent,...boardForHanna(cards.board)])
    : new Set()
  const playerTripleGlow=rank.rank>=2
  const hannaTripleGlow=game.showOpponent && evaluate([...cards.opponent,...boardForHanna(cards.board)]).rank>=2
  const humanSpecialIds=selectedHumanSpecialIds(visibleCards)
  const hannaHumanSpecialIds=game.showOpponent
    ? selectedHumanSpecialIds([...cards.opponent,...boardForHanna(cards.board)])
    : new Set()
  const stage=['プリフロップ','フロップ','リバー'][game.street]
  useEffect(()=>{setBetMultiplier(game.street===0||facingBet?'call':'third')},[game.street])
  useEffect(()=>{if(game.street>0&&facingBet&&betMultiplier==='third')setBetMultiplier('call')},[game.street,facingBet,betMultiplier])
  function playerAction(action){
    if(game.finished||game.turn!==0)return
    setGame(act(game,0,action,betMultiplier))
  }
  // Keep the result visible before automatically starting the next hand.
  useEffect(()=>{
    if(!game.finished||game.stacks.some(x=>x<=0))return
    const timer=setTimeout(()=>{
      setGame(prev=>prev.finished&&prev.stacks.every(x=>x>0)
        ? newHand(prev.stacks,prev.hand+1)
        : prev)
      setBetMultiplier('call')
    },3000)
    return()=>clearTimeout(timer)
  },[game.finished,game.hand])
  useEffect(()=>{
    if(game.finished||game.turn!==1)return
    const timer=setTimeout(()=>setGame(prev=>prev.finished||prev.turn!==1?prev:act(prev,1,'call')),525)
    return()=>clearTimeout(timer)
  },[game])
  useEffect(()=>{
    if(!game.pendingStreet||game.finished)return
    const timer=setTimeout(()=>setGame(prev=>advanceStreet(prev)),750)
    return()=>clearTimeout(timer)
  },[game])
  useEffect(()=>{
    if(!game.pendingShowdown||game.finished)return
    const timer=setTimeout(()=>setGame(prev=>advanceShowdown(prev)),900)
    return()=>clearTimeout(timer)
  },[game])
  useEffect(()=>{
    if(!game.runout||game.finished)return
    const timer=setTimeout(()=>setGame(prev=>advanceRunout(prev)),750)
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
          <div className="hanna-hand-side"><div className="side-caption">HANNA'S HAND</div><div className="side-cards">{cards.opponent.map((card, i) => <Card key={i} card={card} hidden={!game.showOpponent} paired={hannaPairedIds.has(card.id)} pairTone="hanna" glowTone={hannaTripleGlow&&hannaPairedIds.has(card.id)?"hanna":""} highTone={hannaHighIds.has(card.id)?"hanna":""} humanSpecialTone={hannaHumanSpecialIds.has(card.id)?"hanna":""} />)}</div><div className={`hand-rank hanna-rank-mobile ${game.showOpponent ? "revealed" : ""}`}>{hannaRank}</div></div>
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
              <div className="felt-wager felt-wager-hanna" style={{visibility:game.lastActions?.[1]?'visible':'hidden'}}><span className={['コール','チェック'].includes(game.lastActions?.[1]) ? 'wager-action-call' : ['レイズ','ベット'].includes(game.lastActions?.[1]) ? 'wager-action-raise' : game.lastActions?.[1]==='オールイン' ? 'wager-action-allin' : ''}>{game.lastActions?.[1]||''}</span><strong>{game.contrib[1].toLocaleString()}</strong></div>
              <div className="felt-wager felt-wager-player" style={{visibility:game.lastActions?.[0]?'visible':'hidden'}}><span className={['コール','チェック'].includes(game.lastActions?.[0]) ? 'wager-action-call' : ['レイズ','ベット'].includes(game.lastActions?.[0]) ? 'wager-action-raise' : game.lastActions?.[0]==='オールイン' ? 'wager-action-allin' : ''}>{game.lastActions?.[0]||''}</span><strong>{game.contrib[0].toLocaleString()}</strong></div>

              <div className="community-hand">
                
                <div className="card-row">{cards.board.slice(0,game.street).map((card, i) => <Card key={i} card={card} paired={pairedIds.has(card.id) || hannaPairedIds.has(card.id)} pairTone={game.showOpponent && pairedIds.has(card.id) && hannaPairedIds.has(card.id) ? "both" : game.showOpponent && hannaPairedIds.has(card.id) ? "hanna" : "player"} glowTone={playerTripleGlow&&pairedIds.has(card.id)&&hannaTripleGlow&&hannaPairedIds.has(card.id)?"both":hannaTripleGlow&&hannaPairedIds.has(card.id)?"hanna":playerTripleGlow&&pairedIds.has(card.id)?"player":""} highTone={highIds.has(card.id)&&hannaHighIds.has(card.id)?"both":hannaHighIds.has(card.id)?"hanna":highIds.has(card.id)?"player":""} humanSpecialTone={humanSpecialIds.has(card.id)&&hannaHumanSpecialIds.has(card.id)?"both":hannaHumanSpecialIds.has(card.id)?"hanna":humanSpecialIds.has(card.id)?"player":""} />)}</div>
              </div>
            </div>
          </div>
        <div className="game-action-strip">

            
        </div>
        </section>
        <section className="player-zone">
          <div className="player-info opponent-info">
            <div className="opponent-name"><strong>あなた</strong></div>
            <div className="chip-display"><span>CHIPS</span><strong>{game.stacks[0].toLocaleString()}</strong></div>
          </div>
          <div className="player-hand-wrap"><div className="hand-rank mobile-rank">{playerRank}</div><div className="player-hand">{cards.player.map((card,i) => <Card key={i} card={card} paired={pairedIds.has(card.id)} glowTone={playerTripleGlow&&pairedIds.has(card.id)?"player":""} highTone={highIds.has(card.id)?"player":""} humanSpecialTone={humanSpecialIds.has(card.id)?"player":""} />)}</div></div>
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
