import { useState } from 'react'
import './App.css'

const faces = ['通常','笑顔','ウインク','涙','微笑み','喜び','不満']
const names = ['愚者','魔術師','女教皇','女帝','皇帝','教皇','恋人','戦車','力','隠者','運命の輪','正義','吊るされた男','死神','節制','悪魔','塔','星','月','太陽','審判','世界']
const glyphs = ['☼','✧','☾','♛','♜','✟','♡','♞','♌','✺','☸','⚖','⌛','✠','⚗','♆','⚡','✶','☽','☀','♢','✺']
const initialHand = [{ n:17, rev:false },{ n:3, rev:true },{ n:6, rev:false }]
const tableCards = [{ n:0, rev:false },{ n:10, rev:true },{ n:19, rev:false }]
function Tarot({n=0,rev=false,back=false,small=false,selected=false,onClick}) {
  return <button type="button" onClick={onClick} className={['tarot',small?'small':'',rev?'reverse':'',back?'back':'',selected?'selected':''].filter(Boolean).join(' ')} aria-label={back?'裏向きのカード':names[n]+(rev?' 逆位置':' 正位置')} aria-pressed={selected}>
    <span className="card-face">{back?<span className="sigil">✦<br/>☽<br/>✦</span>:<><span className="roman">{String(n).padStart(2,'0')}</span><span className="glyph">{glyphs[n]}</span><span className="card-name">{names[n]}</span></>}</span>
  </button>
}
function Hanna({face}) {
  const [missing,setMissing] = useState(false)
  return <div className="portrait">
    {!missing?<img key={face} src={'/hanna/'+face+'.png'} alt="遠野ハンナ" onError={()=>setMissing(true)}/>:<div className="portrait-fallback"><span>✦</span><strong>遠野ハンナ</strong><small>立ち絵画像を準備中</small></div>}
  </div>
}
export default function App() {
  const [face,setFace] = useState(0)
  const [hand,setHand] = useState(initialHand)
  const [selected,setSelected] = useState(-1)
  const [message,setMessage] = useState('さあ、あなたの運命を占ってあげる。')
  const [showHelp,setShowHelp] = useState(false)
  function draw(){
    if(hand.length>=5){setMessage('手札は5枚までよ。');return}
    const n=Math.floor(Math.random()*22)
    setHand(prev=>[...prev,{n,rev:Math.random()<.5}])
    setMessage('カードを引いたわ。')
  }
  function reset(){setHand(initialHand);setSelected(-1);setMessage('もう一度、始めましょう。')}
  function flip(){
    if(selected<0){setMessage('先にカードを選びなさい。');return}
    setHand(prev=>prev.map((card,i)=>i===selected?{...card,rev:!card.rev}:card))
  }
  return <main className="game">
    <header><div className="brand">MANOSABA <b>TAROT POKER</b></div><button type="button" className="help" onClick={()=>setShowHelp(v=>!v)}>{showHelp?'閉じる':'遊び方'}</button></header>
    {showHelp&&<aside className="help-panel"><b>UI試作版</b><p>上側が遠野ハンナ、下側があなたの席。カードの上下で正位置・逆位置を見分けます。手札のカードを選んで向きを確認できます。</p><p>現在はデザイン確認用です。役判定や対戦AIは未実装です。</p></aside>}
    <section className="arena">
      <div className="opponent"><Hanna face={face}/><div className="dialogue"><div className="speaker">遠野ハンナ <span>対戦相手</span></div><p>{message}</p><div className="expressions">{faces.map((label,i)=><button key={label} type="button" className={face===i?'active':''} onClick={()=>setFace(i)}>{label}</button>)}</div></div></div>
      <div className="table-scene"><div className="table-rim"><div className="felt"><div className="table-mark">✦ TAROT POKER ✦</div><div className="opponent-cards"><Tarot back small/><Tarot back small/><Tarot back small/></div><div className="center-line"/><div className="community">{tableCards.map((c,i)=><Tarot key={i} {...c} small/>)}</div><div className="table-caption">TABLE CARDS</div></div></div></div>
    </section>
    <section className="player"><div className="hand-heading"><span>YOUR HAND <small>手札</small></span><span>{hand.length} / 5</span></div><div className="hand">{hand.map((card,i)=><Tarot key={i} {...card} selected={selected===i} onClick={()=>setSelected(selected===i?-1:i)}/>)}</div><div className="orientation">{selected>=0&&hand[selected]?names[hand[selected].n]+'：'+(hand[selected].rev?'逆位置':'正位置'):'カードを選択すると向きを確認できます'}</div><div className="actions"><button type="button" onClick={draw}>カードを引く</button><button type="button" onClick={flip}>正位置 / 逆位置</button><button type="button" onClick={reset}>リセット</button></div></section>
  </main>
}
