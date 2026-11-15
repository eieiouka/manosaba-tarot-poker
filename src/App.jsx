import { useEffect, useState } from 'react'
import './App.css'
import { STARTING_CHIPS, newHand, act, evaluate, evaluateVisible, advanceRunout, wagerAmount, boardForHanna } from './poker'

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
function Card({ card, hidden = false, facingOpponent = false }) {
  const src = hidden ? '/tarot/back.png' : `/tarot/${card.id}.png`
  const description = hidden ? '裏向きのカード' : `${CARD_NAMES[card.id]}・${card.reversed ? '逆位置' : '正位置'}`
  return (
    <div className={`card-slot ${facingOpponent ? 'facing-opponent' : ''}`} title={description}>
      <img className={!hidden && card.reversed ? "card-image-reversed" : ""} src={src} alt={description} draggable="false" />
      {!hidden && <span className={`card-number ${card.reversed ? "number-bottom-right" : ""}`}>{card.id === 6 || card.id === 9 ? <span className="underlined-number">{card.id}</span> : card.id}</span>}
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
  const rank = evaluateVisible([...cards.player,...cards.board.slice(0,game.street)])
  const stage=['プリフロップ','フロップ','リバー'][game.street]
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
          <div className="hanna-hand-side"><div className="side-caption">HANNA'S HAND</div><div className="side-cards">{cards.opponent.map((card, i) => <Card key={i} card={card} hidden={!game.showOpponent} />)}</div><div className={`hand-rank hanna-rank-mobile ${game.showOpponent ? "revealed" : ""}`}>{hannaRank}</div></div>
          <div className="opponent-info">
            <div className="opponent-name">対戦相手 <strong>遠野ハンナ</strong></div>
            <div className="chip-display"><span>CHIPS</span><strong>{hannaChips.toLocaleString()}</strong></div>
            <div className={`hand-rank hanna-rank ${game.showOpponent ? "revealed" : ""}`}>{hannaRank}</div>
          </div>
        </section>
        <section className="table-area" aria-label="カジノテーブル">
          <div className="table-outer">
            <div className="table-felt">
              <div className="table-pattern">✦ <span>TAROT POKER</span> ✦</div>

              <div className="community-hand">
                <div className="felt-caption">TABLE / 場札</div>
                <div className="card-row">{cards.board.slice(0,game.street).map((card, i) => <Card key={i} card={card} />)}</div>
              </div>
            </div>
          </div>
        <div className="game-action-strip">
            <div className="game-status" aria-label="対局情報">
              <div className="game-metrics">
                <span className="game-metric"><small>HAND</small><strong>{game.hand}</strong></span>
                <span className="game-metric game-stage"><small>ROUND</small><strong>{stage}</strong></span>
                <span className="game-metric game-pot"><small>POT</small><strong>{game.pot.toLocaleString()}</strong></span>
                <span className="game-metric"><small>BB</small><strong>{game.bb.toLocaleString()}</strong></span>
              </div>
              <div className="game-turn-message">{game.finished?game.message:game.runout?'場札公開中':game.turn===0?'あなたの番':'ハンナの番'}</div>
            </div>
            {game.finished && <button type="button" className="game-secondary next-hand-action" onClick={nextHand}>{game.stacks.some(x=>x<=0)?'最初から':'次のハンド'}</button>}
            
        </div>
        </section>
        <section className="player-zone">
          <div className="player-info opponent-info">
            <div className="opponent-name">プレイヤー <strong>あなた</strong></div>
            <div className="chip-display"><span>CHIPS</span><strong>{game.stacks[0].toLocaleString()}</strong></div>
          </div>
          <div className="player-hand-wrap"><div className="hand-rank mobile-rank">{playerRank}</div><div className="player-hand">{cards.player.map((card,i) => <Card key={i} card={card} />)}</div></div>
          <div className="bet-controls">
            <div className="hand-rank desktop-rank">{playerRank}</div>
            <div className="bet-multipliers">{['call', 2, 3, 'all'].map(value => <button type="button" key={value} className={betMultiplier === value ? 'chosen' : ''} onClick={() => setBetMultiplier(value)}>{value === 'all' ? 'AI' : value === 'call' ? 'call' : 'x' + value}</button>)}</div>
            <div className="primary-action-row">
            <button type="button" className={`call-button ${betMultiplier==='all' ? 'action-allin' : betMultiplier==='call' ? 'action-call' : 'action-raise'}`} disabled={game.finished||game.turn!==0} onClick={() => playerAction(betMultiplier==='call'?'call':'raise')}><strong>{betMultiplier==='call'?(callAmount?'コール':'チェック'):betMultiplier==='all'?'オールイン':'レイズ'}</strong><span>{selectedAmount.toLocaleString()}</span></button>
            <button type="button" className="game-secondary" disabled={game.finished||game.turn!==0} onClick={()=>playerAction('fold')}>フォールド</button>
            </div>

          </div>
        </section>
      </div>
    </main>
  )
}
