/* ★★★★★ × PARADOX — Logo Designer
   A standalone composer for the official PARADOX marks, built on the logo-experiments
   way of working: drag a mark to move it, hold the circle to spin and size it, step
   through every variation, set copies, pick an ink. It knows nothing about clothing:
   the host hands it a flat surface (one picture per side, in centimetres) and gets a
   design back. Use it for garments here; posters, packaging or a pen barrel elsewhere.

   PXLogoDesigner.open({
     logos,                      // window.LOGOS — [{id,label,vb,w,h,d}]
     inks,                       // [[hex,name], …]
     sides,                      // [{id,label,mirror,backdrop:canvas,area:{x0,x1,y0,y1}}]
     bounds,                     // {x0,x1,y0,y1} cm the backdrops cover (visual space)
     design,                     // {id?,name?,layers:[{logo,ink,side,x,y,w,rot,n}]}
     side, select,               // optional: side to open on, layer index to select
     ground,                     // fabric hex, for thumbnails and the variation sheet
     store,                      // {list():Promise<design[]>, save(d):Promise<d>, remove(id):Promise}
     onApply(design), onClose()
   })
   Coordinates: x is centimetres from the centre line, as the host stores it; a side
   marked `mirror` is seen from behind, so it is drawn with x flipped. y is centimetres
   down from the top reference (the collar point on a garment). w is the mark's width. */
(function(){
'use strict';
const MONO='"Menlo","SF Mono",ui-monospace,monospace';
const CSS=`
.pxd{position:fixed;inset:0;z-index:2147483000;background:#000;color:#f2f2f7;display:flex;flex-direction:column;
  font:400 12px/1 ${MONO};letter-spacing:.14em;-webkit-font-smoothing:antialiased;user-select:none;-webkit-user-select:none;
  padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
.pxd *{box-sizing:border-box}
.pxd [hidden]{display:none!important}
.pxd button{appearance:none;background:none;border:0;color:#9a9aa6;font:inherit;letter-spacing:inherit;cursor:pointer;
  padding:14px 6px;white-space:nowrap;transition:color .2s}
.pxd button:hover,.pxd button:focus-visible{color:#fff;outline:0}
.pxd button:focus-visible{text-decoration:underline;text-underline-offset:5px}
.pxd button:disabled{opacity:.3;cursor:not-allowed}
.pxd-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
  padding:0 max(18px,env(safe-area-inset-right,0px)) 0 max(18px,env(safe-area-inset-left,0px));border-bottom:1px solid rgba(255,255,255,.16)}
.pxd-brand{display:flex;align-items:center;gap:14px;color:#fff;padding:12px 0}
.pxd-brand img{height:15px;width:auto;display:block}
.pxd-brand span{color:#9a9aa6}
.pxd-sides{display:flex;gap:4px}
.pxd-sides button[aria-pressed="true"]{color:#fff;box-shadow:inset 0 -2px 0 #836bb7}
.pxd-sides i{font-style:normal;color:#836bb7;margin-left:6px}
.pxd-acts{display:flex;align-items:center;gap:6px}
.pxd-ok{background:linear-gradient(135deg,#7a64c4 0%,#5a4a92 45%,#3a2470 100%)!important;color:#fff!important;
  border-radius:999px;padding:12px 26px!important;font-weight:700!important;letter-spacing:.2em!important;margin-left:8px;
  box-shadow:0 6px 24px rgba(90,74,146,.45)}
.pxd-ok:hover{filter:brightness(1.12)}
.pxd-dirty{color:#7ed957;margin-left:4px}
.pxd-main{flex:1;position:relative;min-height:0;display:flex}
.pxd-stage{flex:1;position:relative;min-width:0}
.pxd-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:default}
.pxd-hint{position:absolute;left:0;right:0;bottom:10px;text-align:center;color:#6e6e79;font-size:11px;pointer-events:none;padding:0 12px;line-height:1.5}
.pxd-panel{width:300px;max-width:85vw;border-left:1px solid rgba(255,255,255,.16);background:#050505;display:flex;flex-direction:column;min-height:0}
.pxd-panel h3{margin:0;font:inherit;color:#9a9aa6;padding:16px 16px 10px}
.pxd-name{display:flex;flex-direction:column;gap:8px;padding:0 16px 14px;border-bottom:1px solid rgba(255,255,255,.12)}
.pxd-name label{color:#9a9aa6;font-size:11px}
.pxd-name input{background:#111;border:1px solid rgba(255,255,255,.18);color:#fff;font:13px ${MONO};letter-spacing:.06em;padding:10px;width:100%;border-radius:2px}
.pxd-name input:focus{outline:2px solid #836bb7;outline-offset:1px}
.pxd-list{flex:1;overflow:auto;padding:8px 10px 16px;display:flex;flex-direction:column;gap:8px}
.pxd-item{display:grid;grid-template-columns:72px minmax(0,1fr);gap:10px;align-items:center;border:1px solid rgba(255,255,255,.1);padding:8px;border-radius:2px}
.pxd-item[aria-current="true"]{border-color:#836bb7}
.pxd-item canvas{width:72px;height:72px;display:block;background:#111}
.pxd-item b{display:block;color:#fff;font-weight:400;letter-spacing:.08em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:6px}
.pxd-item small{color:#6e6e79;font-size:10px;letter-spacing:.08em}
.pxd-item .row{display:flex;gap:2px;margin-top:4px}
.pxd-item .row button{padding:6px 4px;font-size:11px}
.pxd-empty{color:#6e6e79;padding:8px 6px;line-height:1.6;letter-spacing:.06em}
.pxd-dock{border-top:1px solid rgba(255,255,255,.16);display:flex;align-items:stretch;justify-content:space-between;gap:6px 14px;flex-wrap:wrap;
  padding:0 max(18px,env(safe-area-inset-right,0px)) 0 max(18px,env(safe-area-inset-left,0px))}
.pxd-grp{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.pxd-sep{width:1px;height:20px;background:rgba(255,255,255,.16);margin:0 6px}
.pxd-arrow{font-size:18px!important;letter-spacing:0!important;padding:12px 8px!important;line-height:1}
.pxd-val{color:#fff!important;text-align:center}
.pxd-varname{width:31ch;overflow:hidden;text-overflow:ellipsis}
.pxd-dots{display:flex;gap:10px;align-items:center;padding:10px 4px}
.pxd-dot{width:20px;height:20px;border-radius:50%;padding:0!important;border:1.5px solid rgba(255,255,255,.25)!important;position:relative}
.pxd-dot[aria-pressed="true"]{border-color:#fff!important}
.pxd-dot[aria-pressed="true"]::after{content:"";position:absolute;inset:-6px;border:1px solid rgba(255,255,255,.35);border-radius:50%}
.pxd-sheet{position:absolute;inset:0;z-index:5;background:#000;display:flex;flex-direction:column}
.pxd-sheet header{display:flex;justify-content:space-between;align-items:center;padding:6px 18px;color:#9a9aa6}
.pxd-grid{flex:1;overflow:auto;display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));padding:0 18px 18px;align-content:start}
.pxd-grid button{display:grid!important;grid-template-rows:minmax(0,1fr) auto;justify-items:center;gap:14px;height:250px;padding:18px 12px!important;
  border:1px solid transparent!important;border-radius:2px;white-space:normal}
.pxd-grid button:hover,.pxd-grid button[aria-current="true"]{border-color:rgba(255,255,255,.3)!important}
.pxd-grid img{max-width:100%;max-height:100%;min-height:0;height:100%;object-fit:contain}
.pxd-grid span{font-size:10px;line-height:1.6;color:#9a9aa6}
.pxd-modal{position:absolute;inset:0;z-index:6;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:18px}
.pxd-box{background:#0b0b0d;border:1px solid rgba(255,255,255,.2);max-width:440px;width:100%;padding:26px 24px 18px;letter-spacing:.06em}
.pxd-box h2{margin:0 0 10px;font:700 15px ${MONO};letter-spacing:.14em;color:#fff}
.pxd-box p{margin:0 0 20px;color:#a6a6b0;line-height:1.6;font-size:12px}
.pxd-box .acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
.pxd-box .acts button{border:1px solid rgba(255,255,255,.22);border-radius:2px;padding:11px 14px;color:#fff}
.pxd-box .acts .go{background:linear-gradient(135deg,#7a64c4,#3a2470);border-color:transparent;border-radius:999px}
.pxd-toast{position:absolute;left:50%;top:70px;transform:translateX(-50%);background:#111;border:1px solid rgba(255,255,255,.2);color:#fff;
  padding:10px 16px;font-size:11px;letter-spacing:.1em;opacity:0;transition:opacity .25s;pointer-events:none;z-index:7;max-width:90vw;text-align:center}
.pxd-toast.on{opacity:1}
@media (max-width:760px){
  .pxd-top{justify-content:center}
  .pxd-brand{width:100%;justify-content:center;padding-bottom:0}
  .pxd-dock{justify-content:center}
  .pxd-varname{width:auto;max-width:60vw}
  .pxd-panel{position:absolute;right:0;top:0;bottom:0;z-index:4}
  .pxd button{padding:12px 4px}
}
@media (prefers-reduced-motion:reduce){.pxd *{transition:none!important}}
`;

const uri=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
const svgCache=new Map(), imgCache=new Map();
function svgText(l,ink){
  const k=l.id+'|'+ink;
  if(!svgCache.has(k)) svgCache.set(k,`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${l.vb}" width="${l.w}" height="${l.h}"><title>${l.label}</title><g fill="${ink}">${l.d}</g></svg>`);
  return svgCache.get(k);
}
function inkImage(l,ink,onload){
  const k=l.id+'|'+ink;let im=imgCache.get(k);
  if(!im){im=new Image();im.decoding='async';im.src=uri(svgText(l,ink));imgCache.set(k,im)}
  if(!(im.complete&&im.naturalWidth)&&onload)im.addEventListener('load',onload,{once:true});
  return im;
}
const spreadFor=ar=>ar<.3?1.6:1.25;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* Draw one layer onto a 2D context already mapped so that 1 unit = 1 cm, origin at
   the surface's visual (0,0). Exposed so the host paints garments with the very same
   geometry the designer shows. */
function drawLayer(ctx,layer,L,vx,opts){
  const l=L[layer.logo];if(!l)return false;
  const im=inkImage(l,layer.ink,opts&&opts.onload);
  if(!(im.complete&&im.naturalWidth))return false;
  const ar=l.w/l.h,w=layer.w,h=w/ar,n=Math.max(1,layer.n|0),step=w*spreadFor(ar);
  ctx.save();ctx.translate(vx,layer.y);ctx.rotate((layer.rot||0)*Math.PI/180);
  for(let c=0;c<n;c++){const off=(c-(n-1)/2)*step;ctx.drawImage(im,off-w/2,-h/2,w,h)}
  ctx.restore();return true;
}
function layerBox(layer,L){const l=L[layer.logo];const ar=l?l.w/l.h:1,w=layer.w,h=w/ar,n=Math.max(1,layer.n|0);
  return {w:w+(n-1)*w*spreadFor(ar),h,ar}}

function open(opt){
  if(!document.getElementById('pxd-css')){const s=document.createElement('style');s.id='pxd-css';s.textContent=CSS;document.head.appendChild(s)}
  const L=Object.fromEntries((opt.logos||[]).map(l=>[l.id,l])), LIST=opt.logos||[];
  const INKS=opt.inks||[['#ffffff','White']], B=opt.bounds, SIDES=opt.sides;
  const sideOf=id=>SIDES.find(s=>s.id===id)||SIDES[0];
  const st={design:clone(opt.design||{layers:[]}),side:opt.side||(SIDES[0]&&SIDES[0].id),sel:-1,dirty:false,hist:[],fut:[],saved:null};
  if(!st.design.layers)st.design.layers=[];
  if(!st.design.name)st.design.name='';
  if(typeof opt.select==='number'&&st.design.layers[opt.select]){st.sel=opt.select;st.side=st.design.layers[opt.select].side}
  else{const f=st.design.layers.findIndex(x=>x.side===st.side);if(f<0&&st.design.layers[0]){st.side=st.design.layers[0].side}}
  st.saved=JSON.stringify(st.design.layers)+'|'+st.design.name;
  const lastFocus=document.activeElement;

  const root=document.createElement('div');root.className='pxd';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Logo designer');
  const markSrc=L['horizontal-paradox']?uri(svgText(L['horizontal-paradox'],'#ffffff')):'';
  root.innerHTML=`
  <div class="pxd-top">
    <div class="pxd-brand">${markSrc?`<img src="${markSrc}" alt="★★★★★ × PARADOX">`:''}<span>LOGO DESIGNER</span></div>
    <div class="pxd-sides" role="group" aria-label="Side">${SIDES.map(s=>`<button type="button" data-side="${s.id}">${esc(s.label.toUpperCase())}<i></i></button>`).join('')}</div>
    <div class="pxd-acts">
      <button type="button" data-a="designs" aria-expanded="false">MY DESIGNS</button>
      <button type="button" data-a="save">SAVE<span class="pxd-dirty" hidden>•</span></button>
      <button type="button" data-a="close">CLOSE</button>
      <button type="button" class="pxd-ok" data-a="ok">OK!</button>
    </div>
  </div>
  <div class="pxd-main">
    <div class="pxd-stage"><canvas class="pxd-canvas" tabindex="0" aria-label="Design surface. Drag a logo to move it, hold the circle to spin and size it, arrow keys nudge the selected logo."></canvas>
      <div class="pxd-hint">DRAG A LOGO TO MOVE IT · HOLD THE CIRCLE TO SPIN AND SIZE · WHEEL OR PINCH TO SIZE · ARROWS NUDGE</div></div>
    <aside class="pxd-panel" hidden aria-label="My designs">
      <h3>MY DESIGNS</h3>
      <div class="pxd-name"><label for="pxd-name">NAME THIS DESIGN</label><input id="pxd-name" type="text" maxlength="40" placeholder="Untitled design"><button type="button" data-a="new" style="align-self:flex-start;padding:6px 0">+ NEW DESIGN</button></div>
      <div class="pxd-list"></div>
    </aside>
  </div>
  <div class="pxd-dock">
    <div class="pxd-grp pxd-dots" role="group" aria-label="Ink colour">${INKS.map(([c,n])=>`<button type="button" class="pxd-dot" data-ink="${c}" style="background:${c}" aria-label="Ink: ${esc(n)}" title="${esc(n)}"></button>`).join('')}</div>
    <div class="pxd-grp">
      <button type="button" class="pxd-arrow" data-a="prev" aria-label="Previous variation">‹</button>
      <button type="button" class="pxd-val pxd-varname" data-a="all" title="Every variation"></button>
      <button type="button" class="pxd-arrow" data-a="next" aria-label="Next variation">›</button>
      <button type="button" data-a="all">ALL ${LIST.length}</button>
      <span class="pxd-sep"></span>
      <button type="button" class="pxd-arrow" data-a="less" aria-label="Fewer copies">−</button>
      <span class="pxd-val" data-v="n" style="min-width:4ch"></span>
      <button type="button" class="pxd-arrow" data-a="more" aria-label="More copies">+</button>
      <span class="pxd-sep"></span>
      <button type="button" class="pxd-arrow" data-a="smaller" aria-label="Smaller">−</button>
      <span class="pxd-val" data-v="w" style="min-width:8ch"></span>
      <button type="button" class="pxd-arrow" data-a="bigger" aria-label="Bigger">+</button>
      <span class="pxd-sep"></span>
      <button type="button" class="pxd-arrow" data-a="ccw" aria-label="Turn left">↺</button>
      <button type="button" class="pxd-val" data-a="straight" data-v="rot" title="Straighten" style="min-width:5ch"></button>
      <button type="button" class="pxd-arrow" data-a="cw" aria-label="Turn right">↻</button>
    </div>
    <div class="pxd-grp">
      <button type="button" data-a="add">+ ADD LOGO</button>
      <button type="button" data-a="dup">DUPLICATE</button>
      <button type="button" data-a="centre">CENTRE</button>
      <button type="button" data-a="flip"></button>
      <button type="button" data-a="del">DELETE</button>
      <span class="pxd-sep"></span>
      <button type="button" data-a="undo">UNDO</button>
      <button type="button" data-a="redo">REDO</button>
    </div>
  </div>
  <div class="pxd-sheet" hidden role="dialog" aria-label="Every variation"><header><span>ALL ${LIST.length} VARIATIONS</span><button type="button" data-a="sheetclose">CLOSE</button></header><div class="pxd-grid"></div></div>
  <div class="pxd-modal" hidden><div class="pxd-box" role="alertdialog" aria-modal="true" aria-labelledby="pxd-mt"><h2 id="pxd-mt"></h2><p></p><div class="acts"></div></div></div>
  <div class="pxd-toast" role="status" aria-live="polite"></div>`;
  document.body.appendChild(root);
  const prevOverflow=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
  const q=s=>root.querySelector(s), qa=s=>[...root.querySelectorAll(s)];
  const cv=q('.pxd-canvas'), ctx=cv.getContext('2d'), stage=q('.pxd-stage');
  let view={k:1,ox:0,oy:0}, dpr=1, snapX=false, sheetMode='swap';

  /* ── history ─────────────────────────────────────────────────────────── */
  const snap=()=>JSON.stringify(st.design.layers);
  function remember(){st.hist.push(snap());if(st.hist.length>80)st.hist.shift();st.fut=[]}
  function changed(){st.dirty=(JSON.stringify(st.design.layers)+'|'+st.design.name)!==st.saved;sync();draw()}
  function undo(){if(!st.hist.length)return;st.fut.push(snap());st.design.layers=JSON.parse(st.hist.pop());if(st.sel>=st.design.layers.length)st.sel=-1;changed()}
  function redo(){if(!st.fut.length)return;st.hist.push(snap());st.design.layers=JSON.parse(st.fut.pop());if(st.sel>=st.design.layers.length)st.sel=-1;changed()}

  /* ── geometry ────────────────────────────────────────────────────────── */
  const S=()=>sideOf(st.side);
  const vxOf=(layer)=>sideOf(layer.side).mirror?-layer.x:layer.x;
  const xFromV=(vx,side)=>sideOf(side).mirror?-vx:vx;
  function fit(){
    const r=stage.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=Math.max(1,Math.round(r.width*dpr));cv.height=Math.max(1,Math.round(r.height*dpr));
    const pad=28,bw=B.x1-B.x0,bh=B.y1-B.y0;
    const k=Math.min((r.width-pad*2)/bw,(r.height-pad*2-26)/bh);
    view={k,ox:(r.width-bw*k)/2,oy:(r.height-26-bh*k)/2};
    draw();
  }
  const toScr=(vx,vy)=>[view.ox+(vx-B.x0)*view.k,view.oy+(vy-B.y0)*view.k];
  const toCm=(sx,sy)=>[(sx-view.ox)/view.k+B.x0,(sy-view.oy)/view.k+B.y0];
  function local(layer,vx,vy){const a=-(layer.rot||0)*Math.PI/180,dx=vx-vxOf(layer),dy=vy-layer.y;return [dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a)]}
  function gripPos(layer){const b=layerBox(layer,L),pad=14/view.k,a=(layer.rot||0)*Math.PI/180;
    const lx=b.w/2+pad,ly=b.h/2+pad;return [vxOf(layer)+lx*Math.cos(a)-ly*Math.sin(a),layer.y+lx*Math.sin(a)+ly*Math.cos(a)]}
  function hitLayer(vx,vy){const ls=st.design.layers;for(let i=ls.length-1;i>=0;i--){const ly=ls[i];if(ly.side!==st.side)continue;
    const b=layerBox(ly,L),[lx,lyy]=local(ly,vx,vy),pad=6/view.k;if(Math.abs(lx)<=b.w/2+pad&&Math.abs(lyy)<=b.h/2+pad)return i}return -1}

  /* ── drawing ─────────────────────────────────────────────────────────── */
  const redraw=()=>draw();
  function draw(){
    const W=cv.width/dpr,H=cv.height/dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
    const g=ctx.createRadialGradient(W/2,H*.42,0,W/2,H*.42,Math.max(W,H)*.7);g.addColorStop(0,'#2a2a2e');g.addColorStop(1,'#050505');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    const s=S(),[x0,y0]=toScr(B.x0,B.y0),bw=(B.x1-B.x0)*view.k,bh=(B.y1-B.y0)*view.k;
    if(s.backdrop)ctx.drawImage(s.backdrop,x0,y0,bw,bh);
    if(s.area){const [ax,ay]=toScr(s.area.x0,s.area.y0),aw=(s.area.x1-s.area.x0)*view.k,ah=(s.area.y1-s.area.y0)*view.k;
      ctx.save();ctx.setLineDash([5,6]);ctx.strokeStyle='rgba(131,107,183,.55)';ctx.lineWidth=1;ctx.strokeRect(ax+.5,ay+.5,aw,ah);
      ctx.setLineDash([]);ctx.fillStyle='rgba(166,166,176,.75)';ctx.font=`10px ${MONO}`;ctx.textBaseline='bottom';
      ctx.fillText(`PRINT AREA ${Math.round(s.area.x1-s.area.x0)} × ${Math.round(s.area.y1-s.area.y0)} CM`,ax,ay-5);ctx.restore()}
    if(snapX){const [cx]=toScr(0,0);ctx.save();ctx.strokeStyle='rgba(126,217,87,.8)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx+.5,y0);ctx.lineTo(cx+.5,y0+bh);ctx.stroke();ctx.restore()}
    ctx.save();ctx.translate(view.ox-B.x0*view.k,view.oy-B.y0*view.k);ctx.scale(view.k,view.k);
    st.design.layers.forEach(ly=>{if(ly.side===st.side)drawLayer(ctx,ly,L,vxOf(ly),{onload:redraw})});
    ctx.restore();
    const ly=st.design.layers[st.sel];
    if(ly&&ly.side===st.side){
      const b=layerBox(ly,L),[cx,cy]=toScr(vxOf(ly),ly.y),pad=14;
      ctx.save();ctx.translate(cx,cy);ctx.rotate((ly.rot||0)*Math.PI/180);
      ctx.strokeStyle='rgba(255,255,255,.55)';ctx.setLineDash([6,5]);ctx.lineWidth=1;
      ctx.strokeRect(-b.w*view.k/2-pad,-b.h*view.k/2-pad,b.w*view.k+pad*2,b.h*view.k+pad*2);ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(b.w*view.k/2+pad,b.h*view.k/2+pad,11,0,Math.PI*2);ctx.fillStyle=gripHot?'#fff':'#000';ctx.fill();
      ctx.lineWidth=1.5;ctx.strokeStyle='#fff';ctx.stroke();ctx.restore();
    }
  }
  let gripHot=false;

  /* ── controls state ──────────────────────────────────────────────────── */
  function sync(){
    const ly=st.design.layers[st.sel], has=!!ly;
    qa('.pxd-sides button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.side===st.side));
      const c=st.design.layers.filter(x=>x.side===b.dataset.side).length;b.querySelector('i').textContent=c?String(c):''});
    q('.pxd-varname').textContent=has?(L[ly.logo]?L[ly.logo].label:ly.logo):'SELECT OR ADD A LOGO';
    q('[data-v="n"]').textContent=has?'×'+(ly.n||1):'×–';
    q('[data-v="w"]').textContent=has?ly.w.toFixed(1)+' CM':'– CM';
    q('[data-v="rot"]').textContent=has?Math.round(ly.rot||0)+'°':'–°';
    qa('.pxd-dot').forEach(d=>d.setAttribute('aria-pressed',String(has&&d.dataset.ink===ly.ink)));
    ['prev','next','less','more','smaller','bigger','ccw','cw','straight','dup','centre','flip','del'].forEach(a=>qa(`[data-a="${a}"]`).forEach(b=>b.disabled=!has));
    qa('.pxd-dot').forEach(b=>b.disabled=!has);
    q('[data-a="undo"]').disabled=!st.hist.length;q('[data-a="redo"]').disabled=!st.fut.length;
    const other=SIDES.find(s=>s.id!==st.side);q('[data-a="flip"]').textContent=other?'→ '+other.label.toUpperCase():'';q('[data-a="flip"]').hidden=!other;
    q('.pxd-dirty').hidden=!st.dirty;
    const nm=q('#pxd-name');if(document.activeElement!==nm)nm.value=st.design.name||'';
  }

  /* ── edits ───────────────────────────────────────────────────────────── */
  const sel=()=>st.design.layers[st.sel];
  function edit(fn){const ly=sel();if(!ly)return;remember();fn(ly);changed()}
  function setVariation(id){
    const l=L[id];if(!l)return;
    const ly=sel();
    if(!ly||sheetMode==='add'){addLayer(id);return}
    edit(ly=>{const old=layerBox(ly,L),mx=Math.max(old.w/(ly.n||1),old.h),ar=l.w/l.h;ly.logo=id;ly.w=+(ar>=1?mx:mx*ar).toFixed(2)});
  }
  function addLayer(id){
    const l=L[id]||LIST[0];const s=S(),a=s.area||{x0:-15,x1:15,y0:10,y1:50},ar=l.w/l.h;
    let w=Math.min((a.x1-a.x0)*.8,24),h=w/ar;if(h>(a.y1-a.y0)*.8){h=(a.y1-a.y0)*.8;w=h*ar}
    remember();st.design.layers.push({logo:l.id,ink:(sel()&&sel().ink)||INKS[0][0],side:st.side,x:xFromV((a.x0+a.x1)/2,st.side),y:+((a.y0+a.y1)/2).toFixed(1),w:+w.toFixed(2),rot:0,n:1});
    st.sel=st.design.layers.length-1;changed();
  }
  function cycle(d){const ly=sel();if(!ly)return;const i=LIST.findIndex(l=>l.id===ly.logo);setVariation(LIST[(i+d+LIST.length)%LIST.length].id)}

  /* ── sheet of every variation ────────────────────────────────────────── */
  function openSheet(mode){
    sheetMode=mode||'swap';const ly=sel(),ink=(ly&&ly.ink)||INKS[0][0];
    const bg=opt.ground||'#000',grid=q('.pxd-grid');
    grid.innerHTML=LIST.map(l=>`<button type="button" data-id="${l.id}" aria-current="${String(!!ly&&ly.logo===l.id&&sheetMode==='swap')}" style="background:${bg}"><img src="${uri(svgText(l,ink))}" alt=""><span>${esc(l.label)}</span></button>`).join('');
    grid.querySelectorAll('button').forEach(b=>b.onclick=()=>{q('.pxd-sheet').hidden=true;setVariation(b.dataset.id);cv.focus()});
    q('.pxd-sheet').hidden=false;const cur=grid.querySelector('[aria-current="true"]')||grid.querySelector('button');cur&&cur.focus();
  }

  /* ── my designs ──────────────────────────────────────────────────────── */
  async function listDesigns(){
    const box=q('.pxd-list');box.innerHTML='<p class="pxd-empty">LOADING…</p>';
    let ds=[];try{ds=await opt.store.list()}catch(e){}
    if(!ds.length){box.innerHTML='<p class="pxd-empty">Designs you save appear here. Save as many as you like.</p>';return}
    box.innerHTML=ds.map((d,i)=>`<div class="pxd-item" aria-current="${String(!!st.design.id&&d.id===st.design.id)}"><canvas width="144" height="144"></canvas><div style="min-width:0"><b>${esc(d.name||'Untitled design')}</b><small>${(d.layers||[]).length} LOGO${(d.layers||[]).length===1?'':'S'}${d.updatedAt?' · '+new Date(d.updatedAt).toLocaleDateString():''}</small><div class="row"><button type="button" data-i="${i}" data-x="load">OPEN</button><button type="button" data-i="${i}" data-x="rm">DELETE</button></div></div></div>`).join('');
    box.querySelectorAll('canvas').forEach((c,i)=>thumb(c,ds[i]));
    box.querySelectorAll('button').forEach(b=>b.onclick=async()=>{const d=ds[+b.dataset.i];
      if(b.dataset.x==='load'){guard(()=>{st.design={id:d.id,name:d.name||'',layers:clone(d.layers||[])};st.hist=[];st.fut=[];st.sel=-1;
        st.saved=JSON.stringify(st.design.layers)+'|'+st.design.name;const f=st.design.layers[0];if(f)st.side=f.side;changed();listDesigns();toast('OPENED '+(d.name||'DESIGN').toUpperCase())})}
      else{askModal('Delete this design?',`"${d.name||'Untitled design'}" will be removed from your designs.`,[['DELETE','go',async()=>{try{await opt.store.remove(d.id)}catch(e){}if(st.design.id===d.id){delete st.design.id;changed()}listDesigns();toast('DELETED')}],['KEEP IT','',null]])}});
  }
  function thumb(c,d){
    const x=c.getContext('2d'),sideId=((d.layers||[]).find(l=>l.side===SIDES[0].id)?SIDES[0].id:((d.layers||[])[0]||{}).side)||SIDES[0].id,s=sideOf(sideId);
    const k=Math.min(c.width/(B.x1-B.x0),c.height/(B.y1-B.y0));x.fillStyle='#111';x.fillRect(0,0,c.width,c.height);
    if(s.backdrop)x.drawImage(s.backdrop,0,0,(B.x1-B.x0)*k,(B.y1-B.y0)*k);
    x.save();x.scale(k,k);x.translate(-B.x0,-B.y0);(d.layers||[]).forEach(ly=>{if(ly.side===sideId)drawLayer(x,ly,L,sideOf(ly.side).mirror?-ly.x:ly.x,{onload:()=>thumb(c,d)})});x.restore();
  }
  async function save(){
    const d={...st.design,layers:clone(st.design.layers),name:(st.design.name||'').trim()||autoName()};
    try{const r=await opt.store.save(d);if(r&&r.id)st.design.id=r.id;st.design.name=d.name;st.saved=JSON.stringify(st.design.layers)+'|'+st.design.name;st.dirty=false;sync();toast('SAVED · '+d.name.toUpperCase());if(!q('.pxd-panel').hidden)listDesigns();return true}
    catch(e){toast('COULD NOT SAVE ('+((e&&e.code)||'error')+'). TRY AGAIN.');return false}
  }
  function autoName(){const ly=st.design.layers[0];return ly&&L[ly.logo]?L[ly.logo].label.replace(/\s+/g,' ').trim():'Untitled design'}

  /* ── modal and leaving ───────────────────────────────────────────────── */
  function askModal(title,text,buttons){
    const m=q('.pxd-modal');m.querySelector('h2').textContent=title;m.querySelector('p').textContent=text;
    const acts=m.querySelector('.acts');acts.innerHTML='';
    buttons.forEach(([label,cls,fn])=>{const b=document.createElement('button');b.type='button';b.textContent=label;if(cls)b.className=cls;
      b.onclick=async()=>{m.hidden=true;if(fn)await fn();else cv.focus()};acts.appendChild(b)});
    m.hidden=false;acts.querySelector('button').focus();
  }
  function guard(next){
    if(!st.dirty){next();return}
    askModal('Keep this design?','You have changes that are not saved. Save them first, or they will be lost.',
      [['SAVE','go',async()=>{if(await save())next()}],['DISCARD','',()=>{st.dirty=false;next()}],['KEEP DESIGNING','',null]]);
  }
  function close(){
    window.removeEventListener('resize',fit);document.removeEventListener('keydown',onKey,true);
    document.documentElement.style.overflow=prevOverflow;root.remove();if(lastFocus&&lastFocus.focus)lastFocus.focus();opt.onClose&&opt.onClose();
  }
  const tryClose=()=>guard(close);
  async function ok(){
    if(!st.design.layers.length){toast('ADD A LOGO FIRST');return}
    if(st.dirty||!st.design.id)await save();
    const d={...st.design,layers:clone(st.design.layers)};close();opt.onApply&&opt.onApply(d);
  }
  let tt;function toast(m){const t=q('.pxd-toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),2200)}

  /* ── pointer: move, spin and size ────────────────────────────────────── */
  const touches=new Map();let drag=null,pinch=null;
  cv.addEventListener('pointerdown',e=>{
    cv.focus({preventScroll:true});
    const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,[vx,vy]=toCm(sx,sy);
    touches.set(e.pointerId,{x:sx,y:sy});
    if(touches.size===2&&sel()){const [a,b]=[...touches.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,w:sel().w};drag=null;remember();return}
    const ly=sel();
    if(ly&&ly.side===st.side){const [gx,gy]=gripPos(ly),[gsx,gsy]=toScr(gx,gy);
      if(Math.hypot(sx-gsx,sy-gsy)<20){remember();const [cx,cy]=toScr(vxOf(ly),ly.y);
        drag={grip:true,a0:Math.atan2(sy-cy,sx-cx),d0:Math.hypot(sy-cy,sx-cx)||1,r0:ly.rot||0,w0:ly.w};gripHot=true;cv.setPointerCapture(e.pointerId);draw();return}}
    const i=hitLayer(vx,vy);
    if(i>=0){st.sel=i;const l2=sel();remember();drag={dx:vxOf(l2)-vx,dy:l2.y-vy,moved:false};cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing';sync();draw()}
    else{st.sel=-1;sync();draw()}
  });
  cv.addEventListener('pointermove',e=>{
    const r=cv.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,[vx,vy]=toCm(sx,sy);
    if(touches.has(e.pointerId))touches.set(e.pointerId,{x:sx,y:sy});
    if(pinch&&touches.size===2&&sel()){const [a,b]=[...touches.values()],d=Math.hypot(a.x-b.x,a.y-b.y)||1;sel().w=+clamp(pinch.w*d/pinch.d,2,80).toFixed(2);changed();return}
    const ly=sel();
    if(!drag){
      let cur='';if(ly&&ly.side===st.side){const [gx,gy]=gripPos(ly),[gsx,gsy]=toScr(gx,gy);if(Math.hypot(sx-gsx,sy-gsy)<20)cur='nwse-resize'}
      if(!cur&&hitLayer(vx,vy)>=0)cur='grab';cv.style.cursor=cur;return}
    if(drag.grip){const [cx,cy]=toScr(vxOf(ly),ly.y),a=Math.atan2(sy-cy,sx-cx),d=Math.hypot(sy-cy,sx-cx);
      let rot=drag.r0+(a-drag.a0)*180/Math.PI;rot=((rot+540)%360)-180;if(Math.abs(rot)<2.5)rot=0;if(Math.abs(Math.abs(rot)-90)<2.5)rot=Math.sign(rot)*90;
      ly.rot=+rot.toFixed(1);ly.w=+clamp(drag.w0*(d/drag.d0),2,80).toFixed(2);changed();return}
    let nx=vx+drag.dx,ny=vy+drag.dy;snapX=Math.abs(nx)<.9;if(snapX)nx=0;
    nx=clamp(nx,B.x0,B.x1);ny=clamp(ny,B.y0,B.y1);ly.x=+xFromV(nx,ly.side).toFixed(2);ly.y=+ny.toFixed(2);drag.moved=true;changed();
  });
  const end=e=>{touches.delete(e.pointerId);if(touches.size<2)pinch=null;
    if(drag){if(!drag.grip&&!drag.moved)st.hist.pop();drag=null;gripHot=false;snapX=false;cv.style.cursor='';try{cv.releasePointerCapture(e.pointerId)}catch(_){}sync();draw()}};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
  cv.addEventListener('wheel',e=>{const ly=sel();if(!ly)return;e.preventDefault();if(!wheelT){remember()}clearTimeout(wheelT);wheelT=setTimeout(()=>wheelT=null,400);
    ly.w=+clamp(ly.w*Math.exp(-e.deltaY*.0015),2,80).toFixed(2);changed()},{passive:false});
  let wheelT=null;
  cv.addEventListener('dblclick',e=>{const r=cv.getBoundingClientRect(),[vx,vy]=toCm(e.clientX-r.left,e.clientY-r.top);if(hitLayer(vx,vy)>=0)openSheet('swap')});

  /* ── buttons and keys ────────────────────────────────────────────────── */
  root.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||!root.contains(b))return;
    if(b.dataset.side){st.side=b.dataset.side;if(sel()&&sel().side!==st.side)st.sel=-1;sync();draw();return}
    if(b.dataset.ink){edit(ly=>ly.ink=b.dataset.ink);return}
    const a=b.dataset.a;
    switch(a){
      case 'designs':{const p=q('.pxd-panel'),on=p.hidden;p.hidden=!on;b.setAttribute('aria-expanded',String(on));if(on)listDesigns();requestAnimationFrame(fit);break}
      case 'save':save();break;
      case 'close':tryClose();break;
      case 'ok':ok();break;
      case 'new':guard(()=>{st.design={name:'',layers:[]};st.hist=[];st.fut=[];st.sel=-1;st.saved=JSON.stringify([])+'|';changed();listDesigns()});break;
      case 'prev':cycle(-1);break;case 'next':cycle(1);break;
      case 'all':openSheet('swap');break;
      case 'add':openSheet('add');break;
      case 'sheetclose':q('.pxd-sheet').hidden=true;cv.focus();break;
      case 'less':edit(ly=>ly.n=Math.max(1,(ly.n||1)-1));break;
      case 'more':edit(ly=>ly.n=Math.min(12,(ly.n||1)+1));break;
      case 'smaller':edit(ly=>ly.w=+clamp(ly.w/1.1,2,80).toFixed(2));break;
      case 'bigger':edit(ly=>ly.w=+clamp(ly.w*1.1,2,80).toFixed(2));break;
      case 'ccw':edit(ly=>ly.rot=Math.round(((ly.rot||0)-15)/15)*15);break;
      case 'cw':edit(ly=>ly.rot=Math.round(((ly.rot||0)+15)/15)*15);break;
      case 'straight':edit(ly=>ly.rot=0);break;
      case 'centre':edit(ly=>ly.x=0);break;
      case 'flip':{const o=SIDES.find(s=>s.id!==st.side);if(o)edit(ly=>{ly.side=o.id});if(o){st.side=o.id;sync();draw();toast('MOVED TO '+o.label.toUpperCase())}break}
      case 'dup':{const ly=sel();if(!ly)break;remember();const c=clone(ly);c.x+=sideOf(c.side).mirror?-3:3;c.y+=3;st.design.layers.push(c);st.sel=st.design.layers.length-1;changed();break}
      case 'del':{if(!sel())break;remember();st.design.layers.splice(st.sel,1);st.sel=-1;changed();break}
      case 'undo':undo();break;case 'redo':redo();break;
    }
  });
  q('#pxd-name').addEventListener('input',e=>{st.design.name=e.target.value;changed()});
  function onKey(e){
    if(!root.isConnected)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();
      if(!q('.pxd-modal').hidden){q('.pxd-modal').hidden=true;cv.focus();return}
      if(!q('.pxd-sheet').hidden){q('.pxd-sheet').hidden=true;cv.focus();return}
      tryClose();return}
    if(e.target&&e.target.tagName==='INPUT')return;
    if(!q('.pxd-modal').hidden||!q('.pxd-sheet').hidden)return;
    const mod=e.metaKey||e.ctrlKey;
    if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return}
    if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();save();return}
    const ly=sel();if(!ly)return;
    const step=e.shiftKey?2:.5,m={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
    if(m){e.preventDefault();edit(l=>{const vx=vxOf(l)+m[0];l.x=+xFromV(vx,l.side).toFixed(2);l.y=+(l.y+m[1]).toFixed(2)});return}
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remember();st.design.layers.splice(st.sel,1);st.sel=-1;changed()}
  }
  document.addEventListener('keydown',onKey,true);
  window.addEventListener('resize',fit);
  sync();requestAnimationFrame(fit);cv.focus({preventScroll:true});
  return {close:tryClose};
}

window.PXLogoDesigner={open,drawLayer,layerBox,svgText,inkImage};
})();
