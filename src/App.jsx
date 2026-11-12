import { useState } from 'react'
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
      <img src={src} alt={description} draggable="false" />
      {!hidden && <span className="card-orientation">{card.reversed ? '逆位置' : '正位置'}</span>}
    </div>
  )
}
export default function App() {
  const [cards, setCards] = useState(deal)
  const [hannaChips, setHannaChips] = useState(STARTING_CHIPS)
  const mood = hannaMood(hannaChips)
  const [imageMissing, setImageMissing] = useState(false)
  function newDeal() { setCards(deal()) }
  return (
    <main className="casino">
      <header className="topbar">
        <div className="brand"><span className="brand-icon">✦</span><span>MANOSABA <strong>TAROT POKER</strong></span></div>
        <span className="prototype-label">UI PROTOTYPE</span>
      </header>
      <div className="game-area">
        <section className="opponent-zone" aria-label="対戦相手">
          <div className="hanna-portrait">
            {!imageMissing ? <img src={`/hanna/hanna_${mood}.png`} alt="遠野ハンナ" onError={() => setImageMissing(true)} onLoad={() => setImageMissing(false)} /> : <div className="image-placeholder">遠野ハンナ<br /><small>public/hanna/ に画像を配置</small></div>}
          </div>
          <div className="opponent-info">
            <div className="opponent-name">対戦相手 <strong>遠野ハンナ</strong></div>
            <div className="chip-display"><span>CHIPS</span><strong>{hannaChips.toLocaleString()}</strong></div>
            <div className="speech">「さあ、勝負しましょう。」</div>
            <div className="chip-test"><span>表情テスト</span><button onClick={() => {setHannaChips(v => Math.max(0,v-250));setImageMissing(false)}}>−250</button><button onClick={() => {setHannaChips(v => v+250);setImageMissing(false}}>＋250</button><button onClick={() => {setHannaChips(STARTING_CHIPS);setImageMissing(false)}}>戻す</button></div>
          </div>
        </section>
        <section className="table-area" aria-label="カジノテーブル">
          <div className="table-outer">
            <div className="table-felt">
              <div className="table-pattern">✦ <span>TAROT POKER</span> ✦</div>
              <div className="opponent-hand">
                <div className="felt-caption">HANNA'S HAND</div>
                <div className="card-row">{cards.opponent.map((card, i) => <Card key={i} card={card} hidden facingOpponent />)}</div>
              </div>
              <div className="table-rule" />
              <div className="community-hand">
                <div className="felt-caption">TABLE / 場札</div>
                <div className="card-row">{cards.board.map((card, i) => <Card key={i} card={card} />)}</div>
              </div>
            </div>
          </div>
        </section>
        <section className="player-zone">
          <div className="player-header"><span>YOUR HAND <small>あなたの手札</small></span><span className="always-upright">正位置固定</span></div>
          <div className="player-hand">{cards.player.map((card,i) => <Card key={i} card={card} />)}</div>
          <div className="player-footer"><div className="player-chips">YOUR CHIPS <strong>1,000</strong></div><button className="deal-button" onClick={newDeal}>配り直す <span>↻</span></button></div>
          <p className="demo-note">画面確認用：ベット・役判定・対戦AIは未実装です。</p>
        </section>
      </div>
    </main>
  )
}
