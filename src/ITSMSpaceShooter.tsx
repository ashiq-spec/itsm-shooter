import React, { useRef, useEffect, useState } from "react";

// ITSM Space Shooter — v1.6 (aggressive AI + nicer CTA)
// Single level • One life • 30s timer • Retry only
export default function ITSMSpaceShooter() {
  const VIEW_W = 1024, VIEW_H = 640;
  const PLAYER_SPEED = 4, BULLET_SPEED = 11, FIRE_MS = 150;
  const ENEMY_BASE_SPD = 1.8, ENEMY_BASE_HP = 2, PAD = 60;
  const TIMER_MS = 30_000;

  // Inline CTA styles (since Tailwind isn't installed in this repo)
  const ctaStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'linear-gradient(135deg,#06b6d4 0%,#22d3ee 100%)',
    color: '#04111f', textDecoration: 'none', fontWeight: 700,
    padding: '12px 18px', borderRadius: 12,
    boxShadow: '0 10px 24px rgba(6,182,212,.35)',
    border: '1px solid rgba(255,255,255,.25)'
  };

  const ITSM_PROBLEMS = [
    "P1 Outage", "SLA Breach", "VIP Escalation", "CMDB Drift", "Change Failure",
    "Patch Backlog", "Shadow IT", "Printer Chaos", "Password Flood", "Email Storm",
    "License Expiry", "Asset Mismatch", "Barcode Scan Fail", "Siloed Teams", "Ticket Spam",
  ];

  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D|null>(null);
  const lastRef = useRef(0), rafRef = useRef(0), fireRef = useRef(0);
  const keys = useRef<Record<string, boolean>>({});
  const [uiState, setUiState] = useState<'menu'|'playing'|'win'|'lose'>('menu');
  const [timeLeft, setTimeLeft] = useState(TIMER_MS);
  const timeLeftRef = useRef(TIMER_MS);

  const game = useRef({
    score: 0,
    player: { x: VIEW_W/2, y: VIEW_H-100, r: 16, hp: 1 },
    bullets: [] as {x:number;y:number;dx:number;dy:number;r:number;}[],
    enemies: [] as {x:number;y:number;dx:number;dy:number;r:number;hp:number;label:string;dashC:number;}[],
  });

  const R = (a:number,b:number)=>Math.random()*(b-a)+a;
  const clamp = (v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
  const d2 = (ax:number,ay:number,bx:number,by:number)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy};

  // Hi‑DPI setup
  useEffect(()=>{
    const c = canvasRef.current!;
    const ctx = c.getContext('2d', { alpha: false })!;
    ctxRef.current = ctx;
    const setSize = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.floor(VIEW_W * dpr); c.height = Math.floor(VIEW_H * dpr);
      c.style.width = VIEW_W+"px"; c.style.height = VIEW_H+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    setSize();
    window.addEventListener('resize', setSize);
    return()=>window.removeEventListener('resize', setSize);
  },[]);

  function spawnLevel(){
    const es: typeof game.current.enemies = [];
    const n = 28;
    for(let i=0;i<n;i++){
      const r = 18 + (i%3)*3;
      const x = R(PAD, VIEW_W-PAD), y = R(PAD, VIEW_H*0.35); // spawn higher on the screen
      const sp = ENEMY_BASE_SPD + Math.random()*1.0;
      const a = R(0, Math.PI*2);
      const hp = Math.round(ENEMY_BASE_HP + Math.random()*1.4);
      es.push({x,y,dx:Math.cos(a)*sp,dy:Math.sin(a)*sp,r,hp,label: ITSM_PROBLEMS[i % ITSM_PROBLEMS.length], dashC: Math.random()*800});
    }
    game.current = { ...game.current, enemies: es, bullets: [], player: { x: VIEW_W/2, y: VIEW_H-100, r: 18, hp: 1 } };
    timeLeftRef.current = TIMER_MS; setTimeLeft(TIMER_MS); setUiState('playing');
  }
    game.current = { ...game.current, enemies: es, bullets: [], player: { x: VIEW_W/2, y: VIEW_H-100, r: 18, hp: 1 } };
    timeLeftRef.current = TIMER_MS; setTimeLeft(TIMER_MS); setUiState('playing');
  }

  // Input
  useEffect(()=>{
    const d=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();keys.current[k]=true; if(e.key===" ") e.preventDefault();};
    const u=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false};
    window.addEventListener('keydown',d); window.addEventListener('keyup',u);
    return()=>{ window.removeEventListener('keydown',d); window.removeEventListener('keyup',u); };
  },[]);

  // Loop
  useEffect(()=>{
    const step=(t:number)=>{
      const last=lastRef.current||t; const dt=Math.min(33,t-last); lastRef.current=t;
      if(uiState==='playing'){ update(dt); draw(); } else { draw(); }
      rafRef.current=requestAnimationFrame(step);
    };
    rafRef.current=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(rafRef.current);
  },[uiState]);

  function update(dt:number){
    const g=game.current; const p=g.player; const k=keys.current;

    // timer
    const prev=timeLeftRef.current; const next=Math.max(0, prev-dt);
    if(Math.floor(prev/100)!==Math.floor(next/100)) setTimeLeft(next);
    timeLeftRef.current=next; if(next===0){ setUiState('lose'); return; }

    // movement
    if(k['a']||k['arrowleft']) p.x-=PLAYER_SPEED; if(k['d']||k['arrowright']) p.x+=PLAYER_SPEED;
    if(k['w']||k['arrowup']) p.y-=PLAYER_SPEED; if(k['s']||k['arrowdown']) p.y+=PLAYER_SPEED;
    p.x=clamp(p.x,p.r,VIEW_W-p.r); p.y=clamp(p.y,p.r,VIEW_H-p.r);

    // fire
    fireRef.current-=dt;
    if((k[' ']||k['enter']) && fireRef.current<=0){
      g.bullets.push({x:p.x,y:p.y-p.r-4,dx:0,dy:-BULLET_SPEED,r:4});
      fireRef.current=FIRE_MS;
    }

    // bullets
    for(const b of g.bullets){ b.x+=b.dx; b.y+=b.dy; }
    g.bullets=g.bullets.filter(b=>b.y>-12 && b.x>-12 && b.x<VIEW_W+12);

    // enemies — aggressive homing + dash + separation, full-screen pursuit
    const panic = timeLeftRef.current < 10_000; // last 10s harder
    for(const e of g.enemies){
      // homing
      const toX=p.x-e.x, toY=p.y-e.y; const L=Math.max(1,Math.hypot(toX,toY));
      const steer = panic ? 0.12 : 0.09; // stronger steering
      e.dx += (toX/L)*steer; e.dy += (toY/L)*steer;

      // occasional dash toward player
      e.dashC += dt; if(e.dashC>1100){
        const ux=toX/L, uy=toY/L; const boost = panic ? 5.2 : 4.3;
        e.dx = ux*boost; e.dy = uy*boost; // burst speed
        e.dashC = -280 + Math.random()*120; // short cooldown window (negative = active)
      }

      // cap speed + move
      const cap = panic ? 5.0 : 4.0; const spd=Math.max(ENEMY_BASE_SPD, Math.hypot(e.dx,e.dy)); const s=Math.min(1, cap/spd); e.dx*=s; e.dy*=s;
      e.x+=e.dx; e.y+=e.dy;

      // keep on screen (bounce off real edges only)
      if(e.x<e.r||e.x>VIEW_W-e.r) e.dx*=-1; if(e.y<e.r||e.y>VIEW_H-e.r) e.dy*=-1;
    }

    // simple separation to avoid clumping
    for(let i=0;i<g.enemies.length;i++){
      for(let j=i+1;j<g.enemies.length;j++){
        const a=g.enemies[i], b=g.enemies[j];
        const dx=a.x-b.x, dy=a.y-b.y; const min=a.r+b.r+6; const d2v=dx*dx+dy*dy;
        if(d2v < min*min){ const d=Math.max(1,Math.sqrt(d2v)); const push=0.06; const ux=dx/d, uy=dy/d; a.dx+=ux*push; a.dy+=uy*push; b.dx-=ux*push; b.dy-=uy*push; }
      }
    }

    // bullet hits
    for(let i=g.enemies.length-1;i>=0;i--){
      const e=g.enemies[i];
      for(let j=g.bullets.length-1;j>=0;j--){ const b=g.bullets[j]; const rad=e.r+b.r; if(d2(e.x,e.y,b.x,b.y)<=rad*rad){ e.hp--; g.bullets.splice(j,1); if(e.hp<=0){ g.enemies.splice(i,1); g.score+=10; } break; } }
    }

    // player hit => lose (one life)
    for(const e of g.enemies){ const rad=e.r+p.r; if(d2(e.x,e.y,p.x,p.y)<=rad*rad){ setUiState('lose'); return; }}

    if(g.enemies.length===0) setUiState('win');
  }

  function draw(){
    const ctx=ctxRef.current!; const g=game.current;

    // bg
    const grd=ctx.createLinearGradient(0,0,0,VIEW_H); grd.addColorStop(0,'#0a0f1d'); grd.addColorStop(1,'#0f1f49'); ctx.fillStyle=grd; ctx.fillRect(0,0,VIEW_W,VIEW_H);
    ctx.save(); ctx.globalAlpha=0.5; for(let i=0;i<70;i++){ const x=(i*79)%VIEW_W, y=(i*137)%VIEW_H; ctx.fillStyle=i%7?'#a3b8ff':'#dbe0ff'; ctx.fillRect((x+performance.now()/60+i*9)%VIEW_W,y,2,2);} ctx.restore();

    hud(ctx);
    if(uiState==='menu'){ title(ctx); return; }

    ship(ctx,g.player.x,g.player.y,g.player.r,'#34d399');

    ctx.fillStyle='#fbbf24'; for(const b of g.bullets){ ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); }
    for(const e of g.enemies) enemy(ctx,e);

    if(uiState==='win') win(ctx);
    if(uiState==='lose') lose(ctx);
  }

  // draw helpers
  function hud(ctx:CanvasRenderingContext2D){
    const {score}=game.current; ctx.save();
    ctx.fillStyle='rgba(10,15,29,0.7)'; ctx.fillRect(0,0,VIEW_W,56);
    ctx.shadowColor='black'; ctx.shadowBlur=6; ctx.fillStyle='#e6edf7'; ctx.font='700 20px system-ui,Segoe UI,ui-sans-serif';
    ctx.fillText(`Score: ${score}`,14,34);
    const secs=Math.ceil(timeLeft/1000); ctx.fillText(`⏱ ${String(secs).padStart(2,'0')}s`, VIEW_W/2-18, 34);
    heart(ctx, VIEW_W-26, 28, 9);
    ctx.restore();
  }
  function title(ctx:CanvasRenderingContext2D){
    center(ctx,'ITSM Space Shooter',VIEW_W/2,VIEW_H/2-70,44,'#ffffff');
    center(ctx,'Single Level · One Life · 30s',VIEW_W/2,VIEW_H/2-36,18,'#cbd5e1');
    button(ctx,VIEW_W/2-90,VIEW_H/2+6,180,46,'Start');
  }
  function heart(ctx:CanvasRenderingContext2D,x:number,y:number,s:number){ ctx.save(); ctx.translate(x,y); ctx.fillStyle='#ef4444'; ctx.beginPath(); ctx.moveTo(0,s); ctx.bezierCurveTo(0,s-6,-s,s-8,-s,s/2); ctx.bezierCurveTo(-s,0,0,-s/3,0,-s/6); ctx.bezierCurveTo(0,-s/3,s,0,s,s/2); ctx.bezierCurveTo(s,s-8,0,s-6,0,s); ctx.fill(); ctx.restore(); }
  function ship(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,c:string){ ctx.save(); ctx.translate(x,y); ctx.shadowColor=c; ctx.shadowBlur=12; ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(0,-r); ctx.lineTo(r*0.7,r); ctx.lineTo(-r*0.7,r); ctx.closePath(); ctx.fill(); ctx.fillStyle='#a7f3d0'; ctx.beginPath(); ctx.arc(0,-r*0.45,r*0.38,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  function enemy(ctx:CanvasRenderingContext2D,e:{x:number;y:number;r:number;hp:number;label:string}){ ctx.save(); ctx.translate(e.x,e.y); const hue=(e.label.length*41)%360; const base=`hsl(${hue} 80% 60%)`; ctx.shadowColor=`hsl(${hue} 80% 60% / 0.8)`; ctx.shadowBlur=14; ctx.fillStyle=base; ctx.beginPath(); ctx.arc(0,0,e.r,0,Math.PI*2); ctx.fill(); ctx.lineWidth=3; ctx.strokeStyle=`hsl(${hue} 80% 40%)`; ctx.beginPath(); ctx.arc(0,0,e.r+3,0,Math.PI*2); ctx.stroke(); ctx.fillStyle='#e5e7eb'; ctx.font='600 12px system-ui,ui-sans-serif'; ctx.textAlign='center'; ctx.fillText(e.label,0,4); ctx.restore(); }
  function center(ctx:CanvasRenderingContext2D,t:string,x:number,y:number,s:number,col:string){ ctx.save(); ctx.shadowColor='black'; ctx.shadowBlur=6; ctx.fillStyle=col; ctx.font=`700 ${s}px system-ui,ui-sans-serif`; ctx.textAlign='center'; ctx.fillText(t,x,y); ctx.restore(); }
  function button(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,label:string){ ctx.save(); ctx.fillStyle='#22d3ee'; ctx.globalAlpha=0.2; ctx.fillRect(x-2,y-2,w+4,h+4); ctx.globalAlpha=1; ctx.fillStyle='#06b6d4'; ctx.fillRect(x,y,w,h); ctx.fillStyle='#0b1220'; ctx.font='bold 18px system-ui,ui-sans-serif'; ctx.textAlign='center'; ctx.fillText(label,x+w/2,y+h/2+6); ctx.restore(); }
  function overlay(ctx:CanvasRenderingContext2D,paint:()=>void){ ctx.save(); ctx.fillStyle='#020617'; ctx.globalAlpha=0.78; ctx.fillRect(0,0,VIEW_W,VIEW_H); ctx.globalAlpha=1; ctx.restore(); paint(); }
  function win(ctx:CanvasRenderingContext2D){ overlay(ctx,()=>{ center(ctx,"That's great — you won!",VIEW_W/2,VIEW_H/2-52,34,'#bbf7d0'); center(ctx,'It wasn\'t easy either. Make it easier — sign up for a trial below.',VIEW_W/2,VIEW_H/2-12,18,'#e2e8f0'); button(ctx,VIEW_W/2-70,VIEW_H/2+22,140,44,'Retry'); }); }
  function lose(ctx:CanvasRenderingContext2D){ overlay(ctx,()=>{ center(ctx,'We know it\'s tough to fight IT problems.',VIEW_W/2,VIEW_H/2-52,28,'#fecaca'); center(ctx,'Please sign up for our ServiceDesk Plus trial below.',VIEW_W/2,VIEW_H/2-12,18,'#e2e8f0'); button(ctx,VIEW_W/2-70,VIEW_H/2+22,140,44,'Retry'); }); }

  // Mouse/keys for Start/Retry
  useEffect(()=>{
    const click=(ev:MouseEvent)=>{
      const r=canvasRef.current!.getBoundingClientRect();
      const x=(ev.clientX-r.left)*(VIEW_W/r.width), y=(ev.clientY-r.top)*(VIEW_H/r.height);
      if(uiState==='menu'){ if(x>=VIEW_W/2-90 && x<=VIEW_W/2+90 && y>=VIEW_H/2+6 && y<=VIEW_H/2+52) spawnLevel(); }
      else if(uiState==='win'||uiState==='lose'){ if(x>=VIEW_W/2-70 && x<=VIEW_W/2+70 && y>=VIEW_H/2+22 && y<=VIEW_H/2+66) spawnLevel(); }
    };
    const key=(e:KeyboardEvent)=>{ if(e.key.toLowerCase()==='enter'){ if(uiState==='menu'||uiState==='win'||uiState==='lose') spawnLevel(); } };
    window.addEventListener('click',click); window.addEventListener('keydown',key);
    return()=>{ window.removeEventListener('click',click); window.removeEventListener('keydown',key); };
  },[uiState]);

  return (
    <div className="w-full flex flex-col items-center gap-3 p-4 text-slate-100">
      <h1 className="text-xl font-semibold">ITSM Space Shooter</h1>
      <div className="text-sm text-slate-300 -mt-1">Clear ITSM problems before the timer runs out to earn <span className="text-cyan-300 font-semibold">ServiceDesk Plus Licence Shards</span>.</div>
      <div className="relative rounded-xl overflow-hidden ring-1 ring-slate-700 shadow-2xl" style={{width: VIEW_W, height: VIEW_H}}>
        <canvas ref={canvasRef} className="block w-full h-full"/>
      </div>

      {(uiState==='win' || uiState==='lose') && (
        <a
          href="https://www.manageengine.com/products/service-desk/download.html"
          target="_blank" rel="noreferrer"
          style={ctaStyle}
          aria-label="Try ServiceDesk Plus — Free Trial"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:6}}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" fill="#083344"/>
          </svg>
          Try ServiceDesk Plus — Free Trial
        </a>
      )}
    </div>
  );
}
