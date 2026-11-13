import { useEffect, useState } from 'react'
import './App.css'

const CARD_NAMES = ['愚者','魔術師','女教皇','女帝','皇帝','教皇','恋人','戦車','力','隠者','運命の輪','正義','吊るされた男','死神','節制','悪魔','塔','星','月','太陽','審判','世界']
const STARTING_CHIPS = 1000
function deal() {
  const deck = Array.from({ length: 22 }, (_, id) => id)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return {
    player: deck.slice(0, 2).map(id => ({ id, reversed: false })),
    board: deck.slice(2, 4).map(id => ({ id, reversed: Math.random() < .5 })),
    opponent: deck.slice(4, 6).map(id => ({ id, reversed: false })),
  }
}
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
  const [cards, setCards] = useState(deal)
  const hannaChips = STARTING_CHIPS
  const mood = hannaMood(hannaChips)
  const [imageMissing, setImageMissing] = useState(false)
  const [betMultiplier, setBetMultiplier] = useState('call')
  const [callNotice, setCallNotice] = useState(false)
  const callAmount = 1260
  function handleCall() { setCallNotice(true) }
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
          <div className="hanna-hand-side"><div className="side-caption">HANNA'S HAND</div><div className="side-cards">{cards.opponent.map((card, i) => <Card key={i} card={card} hidden />)}</div></div>
          <div className="opponent-info">
            <div className="opponent-name">対戦相手 <strong>遠野ハンナ</strong></div>
            <div className="chip-display"><span>CHIPS</span><strong>{hannaChips.toLocaleString()}</strong></div>
          </div>
        </section>
        <section className="table-area" aria-label="カジノテーブル">
          <div className="table-outer">
            <div className="table-felt">
              <div className="table-pattern">✦ <span>TAROT POKER</span> ✦</div>

              <div className="community-hand">
                <div className="felt-caption">TABLE / 場札</div>
                <div className="card-row">{cards.board.map((card, i) => <Card key={i} card={card} />)}</div>
              </div>
            </div>
          </div>
        </section>
        <section className="player-zone">
          <div className="player-info opponent-info">
            <div className="opponent-name">プレイヤー <strong>あなた</strong></div>
            <div className="chip-display"><span>CHIPS</span><strong>1,000</strong></div>
          </div>
          <div className="player-hand-wrap"><div className="hand-rank mobile-rank">ワンペア16</div><div className="player-hand">{cards.player.map((card,i) => <Card key={i} card={card} />)}</div></div>
          <div className="bet-controls">
            <div className="hand-rank desktop-rank">ワンペア16</div>
            <div className="bet-multipliers">{['call', 2, 3, 'all'].map(value => <button type="button" key={value} className={betMultiplier === value ? 'chosen' : ''} onClick={() => { setBetMultiplier(value); setCallNotice(false) }}>{value === 'all' ? 'AI' : value === 'call' ? 'call' : 'x' + value}</button>)}</div>
            <button type="button" className="call-button" onClick={handleCall}><strong>コール</strong><span>{callAmount.toLocaleString()}</span></button>
            {callNotice && <span className="bet-notice">ベット処理は今後実装します</span>}
          </div>
        </section>
      </div>
    </main>
  )
}
