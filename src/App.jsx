import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './App.css'
import { STARTING_CHIPS, newHand, act, evaluate, evaluateVisible, advanceRunout, advanceStreet, advanceShowdown, wagerAmount, boardForHanna, HUMAN, pairValue, selectedHandIds, selectedHumanSpecialIds, selectedPairHighIds } from './poker'

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
function HoldToInspect({card,onInspect,children}) {
  const timer = useRef(null)
  const start = useRef(null)
  const cancel = () => { if(timer.current!==null){clearTimeout(timer.current);timer.current=null} }
  useEffect(()=>cancel,[])
  return <button type="button" className="pair-guide-trigger" aria-label={`${card.id}・${CARD_NAMES[card.id]}を長押ししてペア一覧を表示`}
    onPointerDown={e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return
      cancel()
      start.current={x:e.clientX,y:e.clientY}
      timer.current=setTimeout(()=>{timer.current=null;onInspect(card)},550)
    }}
    onPointerMove={e=>{if(start.current&&Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y)>12)cancel()}}
    onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
    onContextMenu={e=>e.preventDefault()}
    onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onInspect(card)}}}
  >{children}</button>
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
  const [pairGuideCard, setPairGuideCard] = useState(null)
  const cards = game.cards
  const pairGuideMatches = pairGuideCard ? Array.from({length:22},(_,id)=>id).filter(id=>id!==pairGuideCard.id).flatMap(id=>(id===12||id===16?[true]:[false,true]).map(reversed=>({card:{id,reversed},value:pairValue(pairGuideCard,{id,reversed})})).filter(item=>item.value!==null)) : []
  const hannaChips = game.stacks[1]
  // Show the result expression for folds as well as showdowns.
  // A final game loss takes priority over the ordinary loss expression.
  const mood = game.finished && game.winner === 0 && game.stacks[1] === 0
    ? -4
    : game.finished && game.winner !== -1
      ? (game.winner === 0 ? -2 : 2)
      : hannaMood(game.stacks[1] + game.committed[1])
  const [howToOpen, setHowToOpen] = useState(false)
  const [betMultiplier, setBetMultiplier] = useState('call')
  const callAmount = wagerAmount(game,0,'call')
  const selectedAmount = wagerAmount(game,0,betMultiplier)
  const facingBet = callAmount > 0
  const isBet = !facingBet && betMultiplier !== 'call' && betMultiplier !== 'all'
  const postflopCheck = game.street > 0 && !facingBet
  const bbFacingLimp = game.street === 0 && game.button === 1 && game.turn === 0 && !facingBet && game.raises === 0 && game.lastActions?.[1] === 'コール'
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
    },game.showOpponent?2000:1500)
    return()=>clearTimeout(timer)
  },[game.finished,game.hand,game.showOpponent])
  useEffect(()=>{
    if(game.finished||game.turn!==1)return
    const timer=setTimeout(()=>setGame(prev=>prev.finished||prev.turn!==1?prev:act(prev,1,'call')),1100)
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
    const timer=setTimeout(()=>setGame(prev=>advanceRunout(prev)),game.contrib.some(amount=>amount>0)?1100:750)
    return()=>clearTimeout(timer)
  },[game])
  const hannaRank = game.showOpponent ? evaluate([...cards.opponent,...boardForHanna(cards.board)]).label : ''
  const playerRank=rank.label
  return (
    <main className={`casino ${mobile ? "mobile-casino" : ""}`} style={mobile ? { width: viewport.width, minHeight: viewport.height, height: "auto", transform: "translateX(-50%)" } : { width: 1040, height: 760, transform: `translateX(-50%) scale(${fit})` }}>
      <header className="topbar">
        <div className="brand"><span className="brand-icon">✦</span><span>MANOSABA <strong>TAROT POKER</strong></span></div>
        <button type="button" className="mobile-header-how-to" onClick={() => setHowToOpen(true)}>How to play</button>
      </header>
      {howToOpen && createPortal(<div className="howto-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setHowToOpen(false)}}>
        <section className="howto-dialog" role="dialog" aria-modal="true" aria-labelledby="howto-title">
          <div className="howto-heading"><h2 id="howto-title">How to play</h2><button type="button" className="howto-close" onClick={()=>setHowToOpen(false)} aria-label="閉じる">×</button></div>
          <div className="howto-content">
            <h3>ゲームの目的</h3>
            <p>遠野ハンナと1対1で対戦するタロットポーカーです。役の強さで勝つか、相手をフォールドさせてPOTを獲得しましょう。相手のチップをすべて獲得すると勝利です。</p>
            <h3>ハンドの流れ</h3>
            <ol>
              <li><strong>プリフロップ：</strong>お互いに手札2枚を受け取り、ベットします。</li>
              <li><strong>フロップ：</strong>共通の場札が1枚公開され、再びベットします。</li>
              <li><strong>リバー：</strong>2枚目の場札が公開され、最後のベットを行います。</li>
              <li><strong>ショウダウン：</strong>残った双方の手札を公開し、手札2枚と場札2枚の計4枚から最も強い役を比較します。</li>
            </ol>
            <h3>役の強さ（強い順）</h3>
            <ol>
              <li><strong>スリーカード：</strong>3枚のすべての組み合わせがペアになる。</li>
              <li><strong>ストレート：</strong>正位置の連続した数字3枚（例：5・6・7）。</li>
              <li><strong>ワンペア：</strong>条件を満たす2枚の組み合わせ。ペアの数字で強さを比較します。</li>
              <li><strong>ハイカード：</strong>上記の役がない場合。</li>
            </ol>
            <h3>タロット独自のペア</h3>
            <p>数字が同じでなくても、カードの組み合わせと正位置・逆位置によってペアが成立します。例えば2・3・4・5は互いに正位置ならペア、6と9は正逆が異なるときだけペアです。</p>
            <p>黄色い人型マークは「人間」属性。0・1・11・13・15・16などには、人間属性を条件とする特殊なペアがあります。12と16は常に逆位置として扱います。</p>
            <p>共通の場札はハンナから見ると正逆が反対です（12・16を除く）。そのため、同じ場札でも成立する役が異なる場合があります。</p>
            <h3>操作方法</h3>
            <p><strong>チェック：</strong>追加チップなしで続行。<strong>コール：</strong>相手のベット額に合わせる。<strong>ベット／レイズ：</strong>チップを上乗せする。<strong>オールイン：</strong>残りのチップを賭ける。<strong>フォールド：</strong>そのハンドを降ります。</p>
            <p>ボタン上段でベット額を選び、下段のアクションボタンで確定します。相手が出せないオールインの超過分は返還されます。</p>
            <h3>ブラインドと表示</h3>
            <p>最初のBBは32、SBは16。10ハンドごとにブラインドが1.5倍になります。役に使われるカードは赤色、自分の相手であるハンナの役はショウダウン時に水色で表示されます。</p>
          </div>
          <button type="button" className="howto-done" onClick={()=>setHowToOpen(false)}>ゲームに戻る</button>
        </section>
      </div>, document.body)}
      {pairGuideCard && createPortal(<div className="pair-guide-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setPairGuideCard(null)}}>
        <section className="pair-guide-dialog" role="dialog" aria-modal="true" aria-labelledby="pair-guide-title">
          <header className="pair-guide-header">
            <div><h2 id="pair-guide-title">{pairGuideCard.id}・{CARD_NAMES[pairGuideCard.id]} のペア図鑑</h2><p>選択した手札：{pairGuideCard.reversed?'逆位置':'正位置'} ／ 成立する全組み合わせ</p></div>
            <button type="button" className="pair-guide-close" onClick={()=>setPairGuideCard(null)} aria-label="閉じる">×</button>
          </header>
          <div className="pair-guide-body">
            <p className="pair-guide-note">相手カードの正位置・逆位置ごとに表示しています。まだ場に出ていないカードも含む図鑑です。</p>
            {pairGuideMatches.length===0?<p>この向きで成立するペアはありません。</p>:<div className="pair-guide-grid">
              {pairGuideMatches.map(({card,value})=><div className="pair-guide-entry" key={`${card.id}-${card.reversed}`}>
                <div className="pair-guide-art"><img src={`/tarot/${card.id}.png`} className={card.reversed&&card.id!==12&&card.id!==16?'card-image-reversed':''} alt={CARD_NAMES[card.id]}/></div>
                <div className="pair-guide-details"><strong>{card.id}・{CARD_NAMES[card.id]}</strong><span>{card.reversed?'逆位置':'正位置'}{card.id===12||card.id===16?'（固定）':''}</span><b>ワンペア {value}</b></div>
              </div>)}
            </div>}
            <p className="pair-guide-note">※ 12・16は常に逆位置として判定します。場札はハンナ視点では正逆が反転します。</p>
          </div>
          <button type="button" className="pair-guide-done" onClick={()=>setPairGuideCard(null)}>ゲームに戻る</button>
        </section>
      </div>,document.body)}
      <div className="game-area">
        <section className="opponent-zone" aria-label="対戦相手">
          <button type="button" className="how-to-play" onClick={() => setHowToOpen(true)}>How to play</button>
          <div className="hanna-portrait">
            <img key={mood} src={`/hanna/hanna_${mood}.png`} alt="遠野ハンナ" onError={e=>{if(!e.currentTarget.src.endsWith("/hanna/hanna_1.png"))e.currentTarget.src="/hanna/hanna_1.png"}} />
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
              <div key={`wager-hanna-${game.hand}-${game.actionCounts?.[1]||0}`} className={`felt-wager felt-wager-hanna ${game.actionCounts?.[1]>0 && game.lastActions?.[1] ? 'wager-just-acted' : ''}`} style={{visibility:game.lastActions?.[1]?'visible':'hidden'}}><span className={['コール','チェック'].includes(game.lastActions?.[1]) ? 'wager-action-call' : ['レイズ','ベット'].includes(game.lastActions?.[1]) ? 'wager-action-raise' : game.lastActions?.[1]==='オールイン' ? 'wager-action-allin' : ''}>{game.lastActions?.[1]||''}</span><strong>{game.contrib[1].toLocaleString()}</strong></div>
              <div key={`wager-player-${game.hand}-${game.actionCounts?.[0]||0}`} className={`felt-wager felt-wager-player ${game.actionCounts?.[0]>0 && game.lastActions?.[0] ? 'wager-just-acted' : ''}`} style={{visibility:game.lastActions?.[0]?'visible':'hidden'}}><span className={['コール','チェック'].includes(game.lastActions?.[0]) ? 'wager-action-call' : ['レイズ','ベット'].includes(game.lastActions?.[0]) ? 'wager-action-raise' : game.lastActions?.[0]==='オールイン' ? 'wager-action-allin' : ''}>{game.lastActions?.[0]||''}</span><strong>{game.contrib[0].toLocaleString()}</strong></div>

              <div className="community-hand">
                
                <div className="card-row">{cards.board.slice(0,game.street).map((card, i) => <HoldToInspect key={i} card={card} onInspect={setPairGuideCard}><Card card={card} paired={pairedIds.has(card.id) || hannaPairedIds.has(card.id)} pairTone={game.showOpponent && pairedIds.has(card.id) && hannaPairedIds.has(card.id) ? "both" : game.showOpponent && hannaPairedIds.has(card.id) ? "hanna" : "player"} glowTone={playerTripleGlow&&pairedIds.has(card.id)&&hannaTripleGlow&&hannaPairedIds.has(card.id)?"both":hannaTripleGlow&&hannaPairedIds.has(card.id)?"hanna":playerTripleGlow&&pairedIds.has(card.id)?"player":""} highTone={highIds.has(card.id)&&hannaHighIds.has(card.id)?"both":hannaHighIds.has(card.id)?"hanna":highIds.has(card.id)?"player":""} humanSpecialTone={humanSpecialIds.has(card.id)&&hannaHumanSpecialIds.has(card.id)?"both":hannaHumanSpecialIds.has(card.id)?"hanna":humanSpecialIds.has(card.id)?"player":""} /></HoldToInspect>)}</div>
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
          <div className="player-hand-wrap"><div className="hand-rank mobile-rank">{playerRank}</div><div className="player-hand">{cards.player.map((card,i) => <HoldToInspect key={i} card={card} onInspect={setPairGuideCard}><Card card={card} paired={pairedIds.has(card.id)} glowTone={playerTripleGlow&&pairedIds.has(card.id)?"player":""} highTone={highIds.has(card.id)?"player":""} humanSpecialTone={humanSpecialIds.has(card.id)?"player":""} /></HoldToInspect>)}</div></div>
          <div className="bet-controls">
            <div className="hand-rank desktop-rank">{playerRank}</div>
            <div className="bet-multipliers">{(game.street===0?['call',2,3,'all']:facingBet?['call','half','pot','all']:['third','half','pot','all']).map(value => <button type="button" key={value} className={betMultiplier === value ? 'chosen' : ''} onClick={() => setBetMultiplier(value)}>{value === 'all' ? 'AI' : value === 'call' ? 'call' : value === 'third' ? '1/3' : value === 'half' ? '1/2' : value === 'pot' ? 'POT' : 'x' + value}</button>)}</div>
            <div className="primary-action-row">
            <button type="button" className={`call-button ${betMultiplier==='all' ? 'action-allin' : betMultiplier==='call' ? 'action-call' : 'action-raise'}`} disabled={game.finished||game.turn!==0} onClick={() => playerAction(betMultiplier==='call'?'call':'raise')}><strong>{betMultiplier==='call'?(callAmount?'コール':'チェック'):betMultiplier==='all'?'オールイン':isBet?'ベット':'レイズ'}</strong><span>{selectedAmount.toLocaleString()}</span></button>
            <button type="button" className={`game-secondary ${postflopCheck ? 'action-check' : ''}`} disabled={game.finished||game.turn!==0||bbFacingLimp} onClick={()=>playerAction(postflopCheck?'call':'fold')}>{postflopCheck?'チェック':'フォールド'}</button>
            </div>

          </div>
        </section>
      </div>
    </main>
  )
}
