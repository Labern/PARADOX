/* ★★★★★ × PARADOX Designer — the garment engine and the studio around it.
   The garment is sculpted, not drawn: a signed-distance body (torso, sleeves, rib bands,
   hood, pocket, folds) is meshed at load, shaded with baked occlusion and real shadows,
   and printed by projecting each side's artwork straight through the cloth, the way a
   screen or an embroidery hoop sees it. Every measurement is in centimetres on a size M. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const LIST=window.LOGOS||[], LOGO=Object.fromEntries(LIST.map(l=>[l.id,l]));
const PXD=window.PXLogoDesigner;
const SHARE_BASE=window.PX_SHARE_BASE||location.href.split('#')[0];
const arOf=id=>LOGO[id]?LOGO[id].w/LOGO[id].h:1;
const labelOf=id=>LOGO[id]?LOGO[id].label.replace(/\s+/g,' ').trim():id;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const sq=v=>v*v, clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const smin=(a,b,k)=>{const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25};
const smax=(a,b,k)=>-smin(-a,-b,k);

/* ── the house palette ─────────────────────────────────────────────────── */
const INK=[['#ffffff','White'],['#0a0a0a','Black'],['#c8c8c8','Silver'],['#836bb7','Lavender'],['#5a4a92','Violet'],['#462d7d','Deep violet'],['#7ed957','EVA green'],['#e3241b','Akira red']];
const FABRIC=[['#0a0a0a','Black'],['#ffffff','White'],['#2b2b2b','Charcoal'],['#462d7d','Deep violet'],['#5a4a92','Violet'],['#836bb7','Lavender'],['#7ed957','EVA green'],['#e3241b','Akira red']];
const QUICK=['vertical-kana-2','diagonal-kana','bracket-paradox','vertical-paradox-stacked','horizontal-paradox','stacked-kana-2'];
const nameOf=(list,c)=>{const i=list.find(x=>x[0]===c);return i?i[1]:c};
function lum(hex){const n=parseInt(hex.slice(1),16);return (0.299*(n>>16)+0.587*(n>>8&255)+0.114*(n&255))/255}
function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=n>>16,g=n>>8&255,b=n&255;const t=amt<0?0:255,p=Math.abs(amt);r=Math.round((t-r)*p+r);g=Math.round((t-g)*p+g);b=Math.round((t-b)*p+b);return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}
const seamOf=c=>lum(c)>.55?shade(c,-.2):shade(c,.16);

/* ── garments (size M, cm) ─────────────────────────────────────────────── */
const GARMENTS={
  tee:{name:'T-shirt',sub:'Heavyweight cotton, boxy fit.',price:55,L:72,a:25,b:13.5,sh:23,slope:5.5,
    neck:{w:8.2,d:6.6,drop:7},rib:0,sleeve:{len:23,r0:10.8,r1:8.8,ang:50,bend:0,fwd:.12,rib:0},pocket:false,hood:false},
  long:{name:'Long sleeve',sub:'Heavyweight cotton, ribbed cuffs.',price:75,L:72,a:24.5,b:13.5,sh:23,slope:5.5,
    neck:{w:8.2,d:6.6,drop:7},rib:0,sleeve:{len:63,r0:9.8,r1:4.7,ang:15,bend:8,fwd:.2,rib:6},pocket:false,hood:false},
  hoodie:{name:'Hoodie',sub:'Brushed-back fleece, lined hood.',price:95,L:70,a:27,b:15.5,sh:25,slope:6,
    neck:{w:9.6,d:8,drop:5.5},rib:7,sleeve:{len:64,r0:11.6,r1:5.3,ang:16,bend:9,fwd:.22,rib:7},pocket:true,hood:true}
};
const BOUNDS={x0:-46,x1:46,y0:-14,y1:78};            // the cm window each side's artwork covers
const AREA={front:{x0:-16,x1:16,y0:8,y1:58},back:{x0:-17,x1:17,y0:8,y1:62}};
const areaFor=(gk,side)=>{const a={...AREA[side]};if(gk==='hoodie'&&side==='back')a.y0=24;if(gk==='hoodie'&&side==='front')a.y1=42;return a};

function norm3(v){const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l]}
function sleevePath(g,s){
  const sl=g.sleeve,J=[s*(g.sh-2.2),-(sl.r0+4.4),-.5],a1=sl.ang*Math.PI/180;
  const d1=norm3([s*Math.sin(a1),-Math.cos(a1),sl.fwd*.35]);
  if(!sl.bend){const W=[J[0]+d1[0]*sl.len,J[1]+d1[1]*sl.len,J[2]+d1[2]*sl.len];return {J,E:W,W,segs:[[J,W,sl.r0,sl.r1,0,sl.len]]}}
  const h1=sl.len*.48,E=[J[0]+d1[0]*h1,J[1]+d1[1]*h1,J[2]+d1[2]*h1];
  const a2=(sl.ang-sl.bend)*Math.PI/180,d2=norm3([s*Math.sin(a2),-Math.cos(a2),sl.fwd]),h2=sl.len-h1;
  const W=[E[0]+d2[0]*h2,E[1]+d2[1]*h2,E[2]+d2[2]*h2],rm=sl.r0+(sl.r1-sl.r0)*.5;
  return {J,E,W,segs:[[J,E,sl.r0,rm,0,h1],[E,W,rm,sl.r1,h1,sl.len]]};
}

/* iq's exact round cone, plus where along it the point sits */
function roundCone(px,py,pz,A,Bp,r1,r2){
  const bax=Bp[0]-A[0],bay=Bp[1]-A[1],baz=Bp[2]-A[2],l2=bax*bax+bay*bay+baz*baz,rr=r1-r2,a2=l2-rr*rr,il2=1/l2;
  const pax=px-A[0],pay=py-A[1],paz=pz-A[2],y=pax*bax+pay*bay+paz*baz,z=y-l2;
  const xx=pax*l2-bax*y,xy=pay*l2-bay*y,xz=paz*l2-baz*y,x2=xx*xx+xy*xy+xz*xz,y2=y*y*l2,z2=z*z*l2,k=Math.sign(rr)*rr*rr*x2;
  if(Math.sign(z)*a2*z2>k)return Math.sqrt(x2+z2)*il2-r2;
  if(Math.sign(y)*a2*y2<k)return Math.sqrt(x2+y2)*il2-r1;
  return (Math.sqrt(x2*a2*il2)+y*rr)*il2-r1;
}
function segInfo(px,py,pz,A,Bp){const bx=Bp[0]-A[0],by=Bp[1]-A[1],bz=Bp[2]-A[2],l=Math.hypot(bx,by,bz);
  const t=((px-A[0])*bx+(py-A[1])*by+(pz-A[2])*bz)/(l*l);const tc=clamp(t,0,1);
  const cx=A[0]+bx*tc,cy=A[1]+by*tc,cz=A[2]+bz*tc;return {t,len:l,rad:Math.hypot(px-cx,py-cy,pz-cz)}}

function makeSDF(g){
  const S=[sleevePath(g,1),sleevePath(g,-1)],N=g.neck,nz=1.4,sl=g.sleeve;
  const yTopAt=(x,z)=>-g.slope*sq(x/g.sh)-(z>0?9:4.2)*sq(z/g.b)+(g.hood?.4:0);
  return function(x,y,z){
    const gy=-y,th=Math.atan2(z,x);
    /* torso */
    let a=g.a,b=g.b;
    if(g.rib){const u=sstep(g.L-g.rib-1.5,g.L-g.rib+1,gy);a-=2.6*u;b-=1.8*u;
      const bl=Math.exp(-sq((gy-(g.L-g.rib-3.5))/3.2));a+=.7*bl;b+=.6*bl}
    else{const w=Math.exp(-sq((gy-46)/14));a-=.7*w;b-=.35*w;const hm=sstep(g.L-10,g.L,gy);a+=.5*hm}
    b-=2.4*sstep(16,0,gy);
    let d=(Math.hypot(x/a,z/b)-1)*Math.min(a,b);
    const yTop=yTopAt(x,z);
    d=smax(d,y-yTop,4.6);
    d=smax(d,-g.L-y,1.3);
    /* folds: drape low on the body, drag lines from the underarm, blousing over the rib */
    let disp=.36*Math.sin(th*9+.09*gy+1.2*Math.sin(x*.11+z*.07))*sstep(26,60,gy)*(g.rib?1-sstep(g.L-g.rib-1,g.L-g.rib,gy):1);
    for(const s of [1,-1])disp+=.3*Math.sin((s*x*.75-gy*.62)*.95)*Math.exp(-(sq(x-s*(g.a-5))+sq(gy-27))/110)*sstep(0,4,Math.abs(z));
    if(g.rib)disp+=.42*Math.sin(gy*1.05+.7*Math.sin(th*4))*sstep(g.L-g.rib-10,g.L-g.rib-4,gy)*(1-sstep(g.L-g.rib-1.5,g.L-g.rib,gy));
    disp+=.22*Math.sin(x*.19+1.3)*Math.sin(gy*.15+.4)*Math.sin(z*.21+2.1)+.12*Math.sin(x*.37+gy*.29+z*.11);
    /* kangaroo pocket */
    if(g.pocket&&z>0){const top=42,bot=61,hw=13+4*clamp((gy-top)/(bot-top),0,1);
      const inside=Math.min(gy-top,bot-gy,hw-Math.abs(x));const m=sstep(-.2,.7,inside)*sstep(2,7,z);
      disp-=.55*m;const edge=Math.abs(Math.abs(x)-hw);disp+=.4*Math.exp(-sq(edge/.4))*sstep(top+1,top+3,gy)*(1-sstep(bot-6,bot-4,gy))*sstep(2,7,z)}
    d+=disp;
    /* neck */
    const depth=2.6+N.drop*sstep(-.5,N.d,z-nz);
    const nr=(Math.hypot(x/N.w,(z-nz)/N.d)-1)*Math.min(N.w,N.d);
    d=smax(d,-Math.max(nr,(yTop-depth)-y),1.1);
    if(!g.hood){const R=1,ew=N.w+.95,ed=N.d+.95,e=(Math.hypot(x/ew,(z-nz)/ed)-1)*ed;
      d=smin(d,Math.hypot(e,y-(yTopAt(x,z)-.35*(z>nz?1:0)-sstep(0,ed,z-nz)*1.2))-R,.7)}
    /* sleeves */
    for(const P of S){let ds=1e9;
      for(const [A,Bp,r1,r2,s0,s1] of P.segs){let v=roundCone(x,y,z,A,Bp,r1,r2);const si=segInfo(x,y,z,A,Bp),along=s0+clamp(si.t,0,1)*(s1-s0);
        const f=along/sl.len;
        v+=.24*Math.sin(along*.85+1.2*Math.sin(x*.3+z*.25))*sstep(.45,.8,f)*(1-sstep(.86,.9,f))*(sl.len>30?1:0);
        v+=.2*Math.sin((x*.45+gy*.6)*.9)*sstep(.0,.25,f)*(1-sstep(.35,.6,f));
        if(sl.rib){const c0=sl.len-sl.rib;v+=.65*sstep(c0-.8,c0+.4,along)-.45*Math.exp(-sq((along-(c0-2.8))/2.2))}
        ds=Math.min(ds,v)}
      d=smin(d,ds,g.hood?5:4.4)}
    /* hood, folded down the back */
    if(g.hood){const ew=N.w+2.4,ed=N.d+2.4,e=(Math.hypot(x/ew,(z-nz)/ed)-1)*ed;
      const vdrop=5.5*Math.max(0,1-Math.abs(x)/7.5)*sstep(0,ed,z-nz);
      d=smin(d,Math.hypot(e,y-(yTopAt(x,z)-1.4-vdrop))-2.1,1.4);
      /* the hood lies flat down the upper back: wide, shallow, its crown at the collar */
      const hcx=x/14,hcy=(y+18)/14.5,hcz=(z+(g.b-1.2))/4.2,k0=Math.hypot(hcx,hcy,hcz),k1=Math.hypot(hcx/14,hcy/14.5,hcz/4.2);
      let dh=k0*(k0-1)/k1;dh+=.35*Math.exp(-sq(x/.9))*sstep(-(g.b-3),-(g.b+1),z)+.18*Math.sin(y*.55+x*.25)*sstep(-(g.b-1),-(g.b+3),z);
      d=smin(d,dh,2.6)}
    /* openings: hem and cuffs read as tubes, not caps */
    d=smax(d,-Math.max((Math.hypot(x/(a-1.8),z/(b-1.8))-1)*(b-1.8),y-(-g.L+1.6)),.9);
    return d;
  };
}

/* ── surface nets: a smooth, watertight mesh from the distance field ───── */
function buildGeometry(gk){
  const g=GARMENTS[gk],sdf=makeSDF(g),R=.62;
  const xs=Math.max(...[1,-1].map(s=>{const p=sleevePath(g,s);return Math.abs(p.W[0])+g.sleeve.r1+2}),g.a+3);
  const x0=-xs,y0=-(g.L+3),z0=-(g.b+(g.hood?9:4)),y1=g.hood?5:3,z1=g.b+4;
  const nx=Math.ceil((2*xs)/R)+1,ny=Math.ceil((y1-y0)/R)+1,nz=Math.ceil((z1-z0)/R)+1;
  const F=new Float32Array(nx*ny*nz);
  for(let k=0,o=0;k<nz;k++){const z=z0+k*R;for(let j=0;j<ny;j++){const y=y0+j*R;for(let i=0;i<nx;i++,o++)F[o]=sdf(x0+i*R,y,z)}}
  const idx=(i,j,k)=>(k*ny+j)*nx+i;
  const cnx=nx-1,cny=ny-1,cnz=nz-1,cell=new Int32Array(cnx*cny*cnz).fill(-1),V=[];
  const CO=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],ED=[[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];
  const v8=new Float32Array(8);
  for(let k=0;k<cnz;k++)for(let j=0;j<cny;j++)for(let i=0;i<cnx;i++){
    let m=0;for(let c=0;c<8;c++){const q=CO[c];const v=F[idx(i+q[0],j+q[1],k+q[2])];v8[c]=v;if(v<0)m|=1<<c}
    if(m===0||m===255)continue;
    let sx=0,sy=0,sz=0,n=0;
    for(const [p,q] of ED){const a=v8[p],b=v8[q];if((a<0)===(b<0))continue;const t=a/(a-b),A=CO[p],Bq=CO[q];
      sx+=A[0]+(Bq[0]-A[0])*t;sy+=A[1]+(Bq[1]-A[1])*t;sz+=A[2]+(Bq[2]-A[2])*t;n++}
    cell[(k*cny+j)*cnx+i]=V.length/3;V.push(x0+(i+sx/n)*R,y0+(j+sy/n)*R,z0+(k+sz/n)*R);
  }
  const cid=(i,j,k)=>(i<0||j<0||k<0||i>=cnx||j>=cny||k>=cnz)?-1:cell[(k*cny+j)*cnx+i];
  const Q=[];
  for(let k=0;k<nz;k++)for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
    const v0=F[idx(i,j,k)];
    if(i<nx-1){const v1=F[idx(i+1,j,k)];if((v0<0)!==(v1<0))Q.push(cid(i,j-1,k-1),cid(i,j,k-1),cid(i,j,k),cid(i,j-1,k))}
    if(j<ny-1){const v1=F[idx(i,j+1,k)];if((v0<0)!==(v1<0))Q.push(cid(i-1,j,k-1),cid(i,j,k-1),cid(i,j,k),cid(i-1,j,k))}
    if(k<nz-1){const v1=F[idx(i,j,k+1)];if((v0<0)!==(v1<0))Q.push(cid(i-1,j-1,k),cid(i,j-1,k),cid(i,j,k),cid(i-1,j,k))}
  }
  /* settle each vertex onto the surface, take its normal, and bake occlusion */
  const nv=V.length/3,NRM=new Float32Array(nv*3),AO=new Float32Array(nv),e=.12;
  const grad=(x,y,z)=>{const gx=sdf(x+e,y,z)-sdf(x-e,y,z),gy=sdf(x,y+e,z)-sdf(x,y-e,z),gz=sdf(x,y,z+e)-sdf(x,y,z-e),l=Math.hypot(gx,gy,gz)||1;return [gx/l,gy/l,gz/l]};
  for(let v=0;v<nv;v++){let x=V[v*3],y=V[v*3+1],z=V[v*3+2];
    let n=grad(x,y,z),dd=sdf(x,y,z);x-=n[0]*dd;y-=n[1]*dd;z-=n[2]*dd;
    n=grad(x,y,z);V[v*3]=x;V[v*3+1]=y;V[v*3+2]=z;NRM[v*3]=n[0];NRM[v*3+1]=n[1];NRM[v*3+2]=n[2];
    let occ=0;for(let s=1;s<=5;s++){const h=s*1.5;occ+=Math.max(0,h-sdf(x+n[0]*h,y+n[1]*h,z+n[2]*h))/h/(1<<(s-1))}
    AO[v]=1-clamp(occ*.62,0,.78)}
  /* split by side: front faces carry the front artwork, back faces the back */
  const outF=[],outB=[];
  for(let q=0;q<Q.length;q+=4){const a=Q[q],b=Q[q+1],c=Q[q+2],d=Q[q+3];if(a<0||b<0||c<0||d<0)continue;
    for(const t of [[a,b,c],[a,c,d]]){
      const [p,r,s]=t;const ux=V[r*3]-V[p*3],uy=V[r*3+1]-V[p*3+1],uz=V[r*3+2]-V[p*3+2],wx=V[s*3]-V[p*3],wy=V[s*3+1]-V[p*3+1],wz=V[s*3+2]-V[p*3+2];
      const cx=uy*wz-uz*wy,cy=uz*wx-ux*wz,cz=ux*wy-uy*wx;
      const nx2=NRM[p*3]+NRM[r*3]+NRM[s*3],ny2=NRM[p*3+1]+NRM[r*3+1]+NRM[s*3+1],nz2=NRM[p*3+2]+NRM[r*3+2]+NRM[s*3+2];
      const tri=(cx*nx2+cy*ny2+cz*nz2)<0?[p,s,r]:t;
      const zc=(V[p*3+2]+V[r*3+2]+V[s*3+2])/3;(zc>=0?outF:outB).push(tri)}}
  const total=(outF.length+outB.length)*3,pos=new Float32Array(total*3),nrm=new Float32Array(total*3),uv=new Float32Array(total*2),col=new Float32Array(total*3);
  let o=0;
  const put=(list,front)=>{for(const t of list)for(const v of t){const x=V[v*3],y=V[v*3+1],z=V[v*3+2];
    pos[o*3]=x*.1;pos[o*3+1]=y*.1;pos[o*3+2]=z*.1;nrm[o*3]=NRM[v*3];nrm[o*3+1]=NRM[v*3+1];nrm[o*3+2]=NRM[v*3+2];
    uv[o*2]=front?(x-BOUNDS.x0)/(BOUNDS.x1-BOUNDS.x0):(BOUNDS.x1-x)/(BOUNDS.x1-BOUNDS.x0);uv[o*2+1]=1-((-y)-BOUNDS.y0)/(BOUNDS.y1-BOUNDS.y0);
    const ao=Math.pow(AO[v],1.15);col[o*3]=col[o*3+1]=col[o*3+2]=ao;o++}};
  put(outF,true);put(outB,false);
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('normal',new THREE.BufferAttribute(nrm,3));
  geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  geo.addGroup(0,outF.length*3,0);geo.addGroup(outF.length*3,outB.length*3,1);
  geo.userData.frontTris=outF.length;geo.computeBoundingSphere();
  /* drawstrings follow the real surface of the hood's collar and chest */
  let strings=null;
  if(g.hood){strings=[];for(const s of [1,-1]){const pts=[];
    for(let i=0;i<=22;i++){const gy=g.neck.drop+1.5+i*1.25,y=-gy,x=s*(4.3+.35*Math.sin(i*.45))+(i>14?s*.15*(i-14):0);
      let zz=g.b+6;for(let it=0;it<60;it++){const dd=sdf(x,y,zz);if(dd<.05)break;zz-=Math.max(dd*.8,.05)}
      pts.push(new THREE.Vector3(x*.1,y*.1,(zz+.75+Math.max(0,i-16)*.05)*.1))}
    strings.push(pts)}}
  return {geo,strings,g};
}

/* ── the studio ───────────────────────────────────────────────────────── */
function presetFor(place,logo,gk){
  const g=GARMENTS[gk],ar=arOf(logo),tall=ar<.6,wide=ar>2.4;
  const fit=(mw,mh)=>{let w=mw,h=w/ar;if(h>mh){h=mh;w=h*ar}return +w.toFixed(2)};
  let side='front',x=0,y,w,rot=0;
  const o=LOGO[logo]&&LOGO[logo].origin;
  if(o&&(place==='chest'||place==='back')){return {logo,side:place==='back'?'back':'front',x:place==='back'?-o.centre.x:o.centre.x,y:o.centre.y+(place==='back'&&g.hood?8:0),w:o.widthCm,rot:0,n:1}}
  if(place==='chest'){if(tall){y=g.hood?25:35;w=fit(12,g.hood?31:44)}else if(wide){y=20;w=fit(28,13)}else{y=23;w=fit(21,g.hood?20:22)}}
  else if(place==='left'){x=10;if(tall){y=24;w=fit(4,17)}else{y=17;w=fit(9.5,10)}}
  else if(place==='back'){side='back';if(tall){y=g.hood?45:37;w=fit(14,g.hood?38:48)}else if(wide){y=g.hood?28:16;w=fit(32,14)}else{y=g.hood?36:24;w=fit(28,30)}}
  else if(place==='sleeve'){const p=sleevePath(g,1),t=g.sleeve.bend?.5:.62,A=p.J,Wp=p.W;
    const mx=A[0]+(Wp[0]-A[0])*t,my=A[1]+(Wp[1]-A[1])*t,phi=Math.atan2(Wp[0]-A[0],-(Wp[1]-A[1]))*180/Math.PI;
    x=+mx.toFixed(2);y=+(-my).toFixed(2);const along=g.sleeve.len*(g.sleeve.bend?.62:.55);
    if(tall||ar<1.2){rot=-phi;w=fit(tall?4.4:6,along)}else{rot=90-phi;w=fit(along,4.6)}rot=+rot.toFixed(1)}
  return {logo,side,x,y,w,rot,n:1};
}
function newLayer(place,logo,ink,gk){return {...presetFor(place,logo,gk),ink,place}}
const DEFAULT=()=>({garment:'hoodie',fabric:'#0a0a0a',method:'print',edition:'',name:'',id:null,sel:0,layers:[newLayer('chest','vertical-kana-2','#ffffff','hoodie')]});
function load(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function store(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
const OLD={vkata:'vertical-kana-2',vlatin:'vertical-paradox-stacked',katakana:'horizontal-kana',latin:'horizontal-paradox',stacked:'stacked-kana-2'};
function normalise(d){
  d={...d};if(!GARMENTS[d.garment])d.garment='hoodie';
  if(!Array.isArray(d.layers)){d.layers=d.logo&&OLD[d.logo]?[newLayer(d.place==='left'?'left':d.place==='back'?'back':'chest',OLD[d.logo],d.ink||'#ffffff',d.garment)]:[]}
  d.layers=d.layers.filter(l=>LOGO[l.logo]).map(l=>({logo:l.logo,ink:l.ink||'#ffffff',side:l.side==='back'?'back':'front',x:+l.x||0,y:+l.y||20,w:clamp(+l.w||10,1,90),rot:+l.rot||0,n:clamp(l.n|0||1,1,12),place:l.place||'custom'}));
  return d;
}
let S=normalise({...DEFAULT(),...(load('paradox.designer.v2')||{})});
if(S.sel==null||S.sel>=S.layers.length)S.sel=S.layers.length?0:-1;
let db=null,me=null,isEditor=false,saved=[],three=false,hover=-1,dragging=false,printsOff=false;
const cur=()=>S.layers[S.sel];

/* ── painting each side's artwork ─────────────────────────────────────── */
const TEX=2048,KPX=TEX/(BOUNDS.x1-BOUNDS.x0);
const canv={front:document.createElement('canvas'),back:document.createElement('canvas')},tmp=document.createElement('canvas');
Object.values(canv).forEach(c=>{c.width=c.height=TEX});tmp.width=tmp.height=TEX;
const vxOf=l=>l.side==='back'?-l.x:l.x;
function paint(side){
  const c=canv[side],x=c.getContext('2d'),g=GARMENTS[S.garment],F=S.fabric,sm=seamOf(F);
  x.setTransform(1,0,0,1,0,0);x.globalAlpha=1;x.globalCompositeOperation='source-over';x.fillStyle=F;x.fillRect(0,0,TEX,TEX);
  x.setTransform(KPX,0,0,KPX,-BOUNDS.x0*KPX,-BOUNDS.y0*KPX);x.lineCap='round';
  const stitch=(pts,w=.11,dash=[.32,.22],col=sm,alpha=.85)=>{x.save();x.globalAlpha=alpha;x.strokeStyle=col;x.lineWidth=w;x.setLineDash(dash);x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();x.restore()};
  const ribs=(x0,x1,y0,y1,step=.42,col=shade(F,lum(F)>.55?-.1:.1),alpha=.55)=>{x.save();x.globalAlpha=alpha;x.strokeStyle=col;x.lineWidth=.12;for(let xx=x0;xx<=x1;xx+=step){x.beginPath();x.moveTo(xx,y0);x.lineTo(xx,y1);x.stroke()}x.restore()};
  if(g.rib){ribs(-g.a-2,g.a+2,g.L-g.rib,g.L);stitch([[-g.a-2,g.L-g.rib-.2],[g.a+2,g.L-g.rib-.2]],.1,[.3,.2],sm,.6)}
  else{stitch([[-g.a-2,g.L-1.9],[g.a+2,g.L-1.9]]);stitch([[-g.a-2,g.L-2.5],[g.a+2,g.L-2.5]])}
  for(const s of [1,-1]){const p=sleevePath(g,s),A=p.segs[p.segs.length-1][0],Wp=p.W,ux=Wp[0]-A[0],uy=-(Wp[1]-A[1]),l=Math.hypot(ux,uy),dx=ux/l,dy=uy/l,r=g.sleeve.r1,vx=side==='back'?-1:1;
    const wx=Wp[0]*vx,wy=-Wp[1],ddx=dx*vx;
    if(g.sleeve.rib){x.save();x.translate(wx,wy);x.rotate(Math.atan2(dy,ddx)-Math.PI/2);x.globalAlpha=.5;x.strokeStyle=shade(F,lum(F)>.55?-.1:.1);x.lineWidth=.12;
      for(let q=-r;q<=r;q+=.42){x.beginPath();x.moveTo(q,-g.sleeve.rib);x.lineTo(q,0);x.stroke()}x.restore()}
    else{for(const off of [1.9,2.5]){const cx=wx-ddx*off,cy=wy-dy*off;stitch([[cx-dy*r,cy+ddx*r],[cx+dy*r,cy-ddx*r]])}}}
  if(g.pocket&&side==='front'){const top=42,bot=61;stitch([[-13,top],[13,top],[17,bot],[-17,bot],[-13,top]],.1,[.3,.2],sm,.7);
    stitch([[-13.5,top+1.6],[-16.4,bot-5]],.12,[.3,.2],sm,.8);stitch([[13.5,top+1.6],[16.4,bot-5]],.12,[.3,.2],sm,.8)}
  if(printsOff)return;
  /* the artwork: drawn on its own sheet so the finish touches only the ink */
  const t=tmp.getContext('2d');t.setTransform(1,0,0,1,0,0);t.clearRect(0,0,TEX,TEX);t.setTransform(KPX,0,0,KPX,-BOUNDS.x0*KPX,-BOUNDS.y0*KPX);
  S.layers.forEach(l=>{if(l.side===side)PXD.drawLayer(t,l,LOGO,vxOf(l),{onload:()=>{paint(side);if(three)texs[side].needsUpdate=true}})});
  t.setTransform(1,0,0,1,0,0);
  if(S.method==='embroidery'){t.globalCompositeOperation='source-atop';t.globalAlpha=.22;for(let yy=0;yy<TEX;yy+=6){t.fillStyle=(yy/6)%2?'#000':'#fff';t.fillRect(0,yy,TEX,2.4)}t.globalAlpha=1;t.globalCompositeOperation='source-over';
    x.save();x.setTransform(1,0,0,1,0,0);x.shadowColor='rgba(0,0,0,.55)';x.shadowBlur=5;x.shadowOffsetY=2;x.drawImage(tmp,0,0);x.restore()}
  else{t.globalCompositeOperation='destination-out';t.globalAlpha=.08;t.fillStyle=t.createPattern(grain,'repeat');t.fillRect(0,0,TEX,TEX);t.globalAlpha=1;t.globalCompositeOperation='source-over';
    x.save();x.setTransform(1,0,0,1,0,0);x.drawImage(tmp,0,0);x.restore()}
  const hl=dragging?S.sel:hover;const L2=S.layers[hl];
  if(L2&&L2.side===side){const b=PXD.layerBox(L2,LOGO);x.save();x.translate(vxOf(L2),L2.y);x.rotate((L2.rot||0)*Math.PI/180);
    x.setLineDash([.9,.6]);x.lineWidth=.16;x.strokeStyle=lum(F)>.5?'#5a4a92':'#a08ce0';x.strokeRect(-b.w/2-1,-b.h/2-1,b.w+2,b.h+2);x.restore()}
}
const grain=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),d=x.createImageData(128,128);
  for(let i=0;i<d.data.length;i+=4){d.data[i]=d.data[i+1]=d.data[i+2]=0;d.data[i+3]=Math.random()<.35?255:0}x.putImageData(d,0,0);return c})();

/* ── three.js scene ───────────────────────────────────────────────────── */
let renderer,scene,camera,controls,ortho,body,strings=[],floor,mats,texs,key;
const spin={speed:.42,hover:false,stopped:false,reduce:matchMedia('(prefers-reduced-motion: reduce)').matches};
const built={};
function initThree(){
  if(!window.THREE||!THREE.OrbitControls){$('stage').innerHTML='<p class="note" style="padding:24px">The 3D view could not load. Check your connection and reload.</p>';return}
  three=true;const host=$('stage');
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label','3D garment. Drag to turn it, drag a logo to move it.');
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(28,1,.1,200);camera.position.set(0,-1.2,19.5);
  ortho=new THREE.OrthographicCamera(-4.6,4.6,4.6,-4.6,.1,100);
  controls=new THREE.OrbitControls(camera,renderer.domElement);controls.target.set(0,-3.2,0);
  controls.enableDamping=true;controls.enablePan=false;controls.autoRotateSpeed=0;controls.minDistance=7;controls.maxDistance=30;controls.minPolarAngle=.55;controls.maxPolarAngle=2.3;
  /* the slow turntable: on by default, it eases to a stop while the pointer rests on the
     garment, glides back when it leaves, and stays still once someone takes hold of it */
  const el0=renderer.domElement;
  el0.addEventListener('pointerenter',()=>{spin.hover=true});
  el0.addEventListener('pointerleave',()=>{spin.hover=false});
  controls.addEventListener('start',()=>{spin.stopped=true});
  /* a soft studio: two softboxes and a dim room, for the cloth to pick up */
  const pm=new THREE.PMREMGenerator(renderer),env=new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(40,40,40),new THREE.MeshBasicMaterial({color:0x1a1a1c,side:THREE.BackSide})));
  const box=(w,h,c,p,l)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(l),side:THREE.DoubleSide}));m.position.set(...p);m.lookAt(0,0,0);env.add(m)};
  box(14,10,0xffffff,[10,8,14],3.2);box(10,16,0xd8ceff,[-16,4,-6],1.8);box(30,6,0xffffff,[0,18,0],1.2);
  scene.environment=pm.fromScene(env,.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff,0x202024,.35));
  key=new THREE.DirectionalLight(0xffffff,2.1);key.position.set(6,9,12);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:40});key.shadow.bias=-.0004;key.shadow.normalBias=.035;key.shadow.radius=4;
  key.target.position.set(0,-3.2,0);scene.add(key,key.target);
  const rimL=new THREE.DirectionalLight(0xb7a6f2,1.25);rimL.position.set(-10,4,-8);scene.add(rimL);
  const rimR=new THREE.DirectionalLight(0xffffff,.8);rimR.position.set(10,2,-9);scene.add(rimR);
  const fill=new THREE.DirectionalLight(0xffffff,.35);fill.position.set(-9,-3,9);scene.add(fill);
  floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.32}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  texs={front:new THREE.CanvasTexture(canv.front),back:new THREE.CanvasTexture(canv.back)};
  Object.values(texs).forEach(t=>{t.encoding=THREE.sRGBEncoding;t.anisotropy=renderer.capabilities.getMaxAnisotropy()});
  mats=[fabricMat(texs.front),fabricMat(texs.back)];
  new ResizeObserver(size).observe(host);size();bindPointer();
  (function loop(){requestAnimationFrame(loop);
    const want=(spin.stopped||spin.hover||dragging||spin.reduce)?0:spin.speed;
    controls.autoRotateSpeed+=(want-controls.autoRotateSpeed)*.04;controls.autoRotate=controls.autoRotateSpeed>.002;
    controls.update();renderer.render(scene,camera)})();
}
function fabricMat(map){
  const m=new THREE.MeshPhysicalMaterial({map,vertexColors:true,roughness:.95,metalness:0,envMapIntensity:.32,sheen:new THREE.Color(0x111111)});
  m.onBeforeCompile=sh=>{
    sh.uniforms.uKnit={value:.16};
    sh.vertexShader='varying vec3 vObjPos;\n'+sh.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvObjPos=transformed;');
    sh.fragmentShader='varying vec3 vObjPos;\nuniform float uKnit;\nfloat pxH(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}\n'+
      'float pxN(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(pxH(i),pxH(i+vec3(1,0,0)),f.x),mix(pxH(i+vec3(0,1,0)),pxH(i+vec3(1,1,0)),f.x),f.y),mix(mix(pxH(i+vec3(0,0,1)),pxH(i+vec3(1,0,1)),f.x),mix(pxH(i+vec3(0,1,1)),pxH(i+vec3(1,1,1)),f.x),f.y),f.z);}\n'+
      sh.fragmentShader
      .replace('#include <map_fragment>','#include <map_fragment>\n{vec3 P=vObjPos*10.;float h=pxN(P*1.6)*.6+pxN(P*5.5)*.4;diffuseColor.rgb*=.93+.13*h;}')
      .replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n{vec3 P=vObjPos*10.;float fw=length(fwidth(P));float k=(1.-smoothstep(.018,.06,fw))*uKnit;'+
        'if(k>0.){float cx=P.x*19.6,cz=P.z*19.6,cy=P.y*24.;vec3 gg=vec3(cos(cx)*abs(sin(cy*.5+sin(cx)*.8)),sin(cy)*.6,cos(cz)*abs(sin(cy*.5+sin(cz)*.8)));'+
        'vec3 gv=(viewMatrix*vec4(gg,0.)).xyz;normal=normalize(normal-k*(gv-dot(gv,normal)*normal));}'+
        'float lf=pxN(P*.9);normal=normalize(normal+.04*(lf-.5)*vec3(1.,1.,0.));}');
  };
  return m;
}
function size(){const w=$('stage').clientWidth,h=Math.min(720,Math.max(400,w*1.08));renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix()}
function buildMesh(){
  if(!three)return;const gk=S.garment;
  if(body&&body.userData.gk===gk)return;
  const go=()=>{
    if(!built[gk])built[gk]=buildGeometry(gk);
    const B=built[gk];
    if(body){scene.remove(body)}strings.forEach(m=>{scene.remove(m);m.geometry.dispose()});strings=[];
    body=new THREE.Mesh(B.geo,mats);body.castShadow=body.receiveShadow=true;body.userData.gk=gk;scene.add(body);
    if(B.strings){const sm=new THREE.MeshStandardMaterial({color:new THREE.Color(seamOf(S.fabric)).convertSRGBToLinear(),roughness:.8});
      const metal=new THREE.MeshStandardMaterial({color:0xb8b8bc,roughness:.28,metalness:1,envMapIntensity:1.2});
      for(const pts of B.strings){const curve=new THREE.CatmullRomCurve3(pts);
        const m=new THREE.Mesh(new THREE.TubeGeometry(curve,60,.045,10,false),sm);m.castShadow=true;m.userData.cord=true;scene.add(m);strings.push(m);
        const end=pts[pts.length-1],prev=pts[pts.length-3],dir=end.clone().sub(prev).normalize();
        const ag=new THREE.Mesh(new THREE.CylinderGeometry(.055,.05,.3,14),metal);ag.position.copy(end.clone().add(dir.clone().multiplyScalar(.12)));
        ag.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().negate());ag.castShadow=true;scene.add(ag);strings.push(ag)}}
    floor.position.y=-(B.g.L+5)*.1;
    $('loading').hidden=true;tintCords();
  };
  if(built[gk])go();else{$('loading').hidden=false;requestAnimationFrame(()=>setTimeout(go,30))}
}
function tintCords(){strings.forEach(m=>{if(m.userData.cord)m.material.color=new THREE.Color(seamOf(S.fabric)).convertSRGBToLinear()});
  if(mats){const s=lum(S.fabric);mats.forEach(m=>{m.sheen=new THREE.Color().setScalar(s>.5?.1:s<.1?.035:.08);m.envMapIntensity=s<.1?.22:.34})}}
function paintAll(){paint('front');paint('back');if(three){texs.front.needsUpdate=true;texs.back.needsUpdate=true}}
function faceView(side){if(!three)return;spin.stopped=true;
  const tgt=controls.target,off=camera.position.clone().sub(tgt),r=off.length();
  const from=Math.atan2(off.x,off.z),to=side==='front'?0:side==='back'?Math.PI:Math.PI/2;
  let d=to-from;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;
  const y0=off.y,y1=2;let t=0;
  const place=k=>{const a=from+d*k,y=y0+(y1-y0)*k,h=Math.sqrt(Math.max(r*r-y*y,.01));camera.position.set(tgt.x+h*Math.sin(a),tgt.y+y,tgt.z+h*Math.cos(a));camera.lookAt(tgt)};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){place(1);return}
  const step=()=>{t=Math.min(1,t+.045);place(1-Math.pow(1-t,3));if(t<1)requestAnimationFrame(step)};step()}
/* a flat, straight-on picture of the bare garment: the designer's work surface */
function backdrop(side){
  const c=document.createElement('canvas');c.width=c.height=1024;
  if(!three||!body)return c;
  printsOff=true;paintAll();const keep=renderer.getSize(new THREE.Vector2()),pr=renderer.getPixelRatio();
  renderer.setPixelRatio(1);renderer.setSize(1024,1024,false);floor.visible=false;
  const cy=-((BOUNDS.y0+BOUNDS.y1)/2)*.1;ortho.position.set(0,cy,side==='front'?40:-40);ortho.up.set(0,1,0);ortho.lookAt(0,cy,0);ortho.updateProjectionMatrix();
  renderer.render(scene,ortho);c.getContext('2d').drawImage(renderer.domElement,0,0,1024,1024);
  floor.visible=true;renderer.setPixelRatio(pr);renderer.setSize(keep.x,keep.y,false);printsOff=false;paintAll();return c;
}

/* ── pointer on the garment: pick a logo, move it anywhere, round to the back ─ */
function bindPointer(){
  const el=renderer.domElement,ray=new THREE.Raycaster(),ndc=new THREE.Vector2();let grab=null,down=null,pend=null;
  const hit=e=>{if(!body)return null;const r=el.getBoundingClientRect();ndc.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);
    const h=ray.intersectObject(body)[0];if(!h)return null;return {side:h.faceIndex<body.geometry.userData.frontTris?'front':'back',x:h.point.x*10,y:-h.point.y*10}};
  const pick=h=>{if(!h)return -1;for(let i=S.layers.length-1;i>=0;i--){const l=S.layers[i];if(l.side!==h.side)continue;const b=PXD.layerBox(l,LOGO),a=-(l.rot||0)*Math.PI/180,vx=h.side==='back'?-h.x:h.x;
    const dx=vx-vxOf(l),dy=h.y-l.y,lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);if(Math.abs(lx)<=b.w/2+1.2&&Math.abs(ly)<=b.h/2+1.2)return i}return -1};
  const setHover=i=>{if(i!==hover){hover=i;paintAll()}};
  el.addEventListener('pointerdown',e=>{const h=hit(e),i=pick(h);down={x:e.clientX,y:e.clientY};
    if(i>=0){dragging=true;spin.stopped=true;S.sel=i;const l=S.layers[i];grab={dx:l.x-h.x,dy:l.y-h.y,i};controls.enabled=false;el.setPointerCapture(e.pointerId);el.style.cursor='grabbing';e.preventDefault();e.stopImmediatePropagation();renderRail()}},true);
  el.addEventListener('pointermove',e=>{
    if(!dragging){const i=pick(hit(e));el.style.cursor=i>=0?'grab':'';setHover(i);return}
    const h=hit(e);if(!h)return;const l=S.layers[grab.i];
    l.side=h.side;l.x=+(h.x+grab.dx).toFixed(2);l.y=+(h.y+grab.dy).toFixed(2);l.place='custom';
    if(!pend)pend=requestAnimationFrame(()=>{pend=null;paintAll();renderSpec()})});
  const end=e=>{if(!dragging)return;dragging=false;controls.enabled=true;el.style.cursor='';try{el.releasePointerCapture(e.pointerId)}catch(_){}render()};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  el.addEventListener('pointerleave',()=>{if(!dragging)setHover(-1)});
}

/* ── the rail and the panels ──────────────────────────────────────────── */
const logoURI=(id,ink)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(PXD.svgText(LOGO[id],ink));
function position(l){const g=GARMENTS[S.garment],b=PXD.layerBox(l,LOGO),off=vxOf(l),top=l.y-b.h/2;
  const p=l.place&&l.place!=='custom'?{chest:'Down the chest',left:'Left chest',back:'Full back',sleeve:'Sleeve'}[l.place]:'Custom';
  return {label:p,text:`${Math.abs(off)<.05?'Centred':Math.abs(off).toFixed(1)+' cm '+(off<0?'left':'right')+' of centre'}, top edge ${top.toFixed(1)} cm below the collar${l.rot?', turned '+Math.round(l.rot)+'°':''}`,off:+off.toFixed(1),top:+top.toFixed(1),b}}
function renderSpec(){
  const G=GARMENTS[S.garment];
  let rows=[['Garment',G.name],['Fabric',nameOf(FABRIC,S.fabric)],['Method',S.method==='print'?'Screen print':'Embroidery'],['Price','£'+G.price]];
  let html=rows.map(([a,b])=>`<dt>${a}</dt><dd>${esc(b)}</dd>`).join('');
  let small=false;
  S.layers.forEach((l,i)=>{const p=position(l);
    html+=`<dt class="lh">Logo ${i+1} · ${l.side==='front'?'Front':'Back'}</dt><dd class="lh">${esc(p.label)}</dd>`+
      `<dt>Logo style</dt><dd>${esc(labelOf(l.logo))}</dd><dt>Ink</dt><dd>${esc(nameOf(INK,l.ink))}</dd>`+
      `<dt>Size</dt><dd>${p.b.w.toFixed(1)} × ${p.b.h.toFixed(1)} cm${l.n>1?' · ×'+l.n:''}</dd><dt>Position</dt><dd>${esc(p.text)}</dd>`;
    if(S.method==='embroidery'&&Math.min(p.b.w/(l.n||1),p.b.h)*10*.5<5)small=true});
  if(!S.layers.length)html+=`<dt class="lh">Logos</dt><dd class="lh">None yet</dd>`;
  $('spec').innerHTML=html;$('embWarn').hidden=!small;
}
function renderRail(){
  const pressed=(sel,v)=>document.querySelectorAll(sel).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===v)));
  pressed('#garmentSeg button',S.garment);pressed('#methodSeg button',S.method);
  document.querySelectorAll('#fabricSw button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.c===S.fabric)));$('fabricPick').value=S.fabric;
  const l=cur(),has=!!l;
  $('logoGrid').innerHTML=QUICK.filter(id=>LOGO[id]).map(id=>`<button type="button" data-v="${id}" aria-pressed="${String(has&&l.logo===id)}" title="${esc(labelOf(id))}"><span class="thumb" style="background:${S.fabric}"><img src="${logoURI(id,has?l.ink:'#ffffff')}" alt=""></span><span>${esc(labelOf(id))}</span></button>`).join('');
  $('logoGrid').querySelectorAll('button').forEach(b=>b.onclick=()=>setLogo(b.dataset.v));
  $('layers').innerHTML=S.layers.map((x,i)=>`<div class="layer${i===S.sel?' on':''}"><button type="button" class="pick" data-i="${i}" aria-pressed="${String(i===S.sel)}"><span class="thumb" style="background:${S.fabric}"><img src="${logoURI(x.logo,x.ink)}" alt=""></span><span><b>${esc(labelOf(x.logo))}</b><small>${x.side==='front'?'Front':'Back'} · ${esc(nameOf(INK,x.ink))}</small></span></button><button type="button" class="x" data-i="${i}" aria-label="Remove logo ${i+1}">×</button></div>`).join('')||'<p class="note">No logos yet. Add one, or open the designer.</p>';
  $('layers').querySelectorAll('.pick').forEach(b=>b.onclick=()=>{S.sel=+b.dataset.i;faceView(cur().side);render()});
  $('layers').querySelectorAll('.x').forEach(b=>b.onclick=()=>{S.layers.splice(+b.dataset.i,1);S.sel=S.layers.length?Math.min(S.sel,S.layers.length-1):-1;render()});
  document.querySelectorAll('#inkSw button').forEach(b=>{b.setAttribute('aria-pressed',String(has&&b.dataset.c===l.ink));b.disabled=!has});
  pressed('#placeSeg button',has?(l.place||'custom'):'');document.querySelectorAll('#placeSeg button').forEach(b=>b.disabled=!has&&b.dataset.v!=='custom');
  $('wid').disabled=!has;$('rot').disabled=!has;
  if(has){$('wid').value=l.w;$('widOut').textContent=l.w.toFixed(1)+' cm';$('rot').value=Math.round(l.rot||0);$('rotOut').textContent=Math.round(l.rot||0)+'°'}
  else{$('widOut').textContent='–';$('rotOut').textContent='–'}
  if(document.activeElement!==$('edition'))$('edition').value=S.edition||'';
  $('designName').textContent=S.name?'Design: '+S.name:'';
}
function render(){
  const G=GARMENTS[S.garment];$('gName').textContent=G.name;$('gSub').textContent=G.sub;$('edTitle').textContent=S.edition||'';
  buildMesh();tintCords&&three&&tintCords();paintAll();renderSpec();renderRail();
  store('paradox.designer.v2',S);
}
function setLogo(id){
  let l=cur();
  if(!l){S.layers.push(newLayer('chest',id,'#ffffff',S.garment));S.sel=S.layers.length-1;render();return}
  if(l.place&&l.place!=='custom'){const p=presetFor(l.place,id,S.garment);Object.assign(l,{logo:id,x:p.x,y:p.y,w:p.w,rot:p.rot,side:p.side})}
  else{const old=PXD.layerBox(l,LOGO),mx=Math.max(old.w/(l.n||1),old.h),ar=arOf(id);l.logo=id;l.w=+(ar>=1?mx:mx*ar).toFixed(2)}
  render();
}
function swatches(el,list,onPick,pickId,label){
  el.innerHTML=list.map(([c,n])=>`<button type="button" data-c="${c}" style="background:${c}" aria-label="${label}: ${n}" title="${n}"></button>`).join('')+(pickId?`<input type="color" id="${pickId}" aria-label="${label}: any colour">`:'');
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>onPick(b.dataset.c));if(pickId)$(pickId).oninput=e=>onPick(e.target.value);
}
function toast(m,el){const t=el||$('toast');t.textContent=m;clearTimeout(t._t);t._t=setTimeout(()=>t.textContent='',3600)}

/* ── saving, sharing, ordering ────────────────────────────────────────── */
function designDoc(extra){return {name:S.name||'',garment:S.garment,fabric:S.fabric,method:S.method,edition:S.edition||'',layers:clone(S.layers),updatedAt:new Date().toISOString(),by:me||null,...(extra||{})}}
const STORE={
  async list(){if(db&&me){const q=await db.collection('designs').where('by','==',me).get();return q.docs.map(x=>normalise({...x.data(),id:x.id})).sort((a,b)=>String(b.updatedAt||b.savedAt).localeCompare(String(a.updatedAt||a.savedAt)))}
    return (load('paradox.designer.saved')||[]).map(normalise)},
  async save(d){const doc=designDoc({name:d.name||'',layers:clone(d.layers)});
    if(db&&me){if(d.id&&!String(d.id).startsWith('local-')){try{const c=await db.doc('designs/'+d.id).get();if(c.exists&&(c.data()||{}).by===me){await db.doc('designs/'+d.id).set(doc);return {...doc,id:d.id}}}catch(e){}}
      const ref=await db.collection('designs').add(doc);return {...doc,id:ref.id}}
    const loc=load('paradox.designer.saved')||[];const id=d.id&&String(d.id).startsWith('local-')?d.id:'local-'+Date.now();
    const i=loc.findIndex(x=>x.id===id);const row={...doc,id};if(i>=0)loc[i]=row;else loc.unshift(row);
    if(!store('paradox.designer.saved',loc.slice(0,40)))throw {code:'storage_blocked'};renderSaved(loc.map(normalise));return row},
  async remove(id){if(db&&me&&!String(id).startsWith('local-')){await db.doc('designs/'+id).delete();return}
    const loc=(load('paradox.designer.saved')||[]).filter(x=>x.id!==id);store('paradox.designer.saved',loc);renderSaved(loc.map(normalise))}
};
async function save(){try{const r=await STORE.save({id:S.id,name:S.name||autoName(),layers:S.layers});S.id=r.id;S.name=r.name;render();toast('Saved '+(S.name||'design'));return r.id}
  catch(e){toast('Saving failed ('+((e&&e.code)||'error')+'). Try again.');return null}}
function autoName(){const l=S.layers[0];return (l?labelOf(l.logo):'Design')+' · '+GARMENTS[S.garment].name}
async function share(){
  if(!db){toast('Sharing needs you signed in to Claude. Saving works in this browser.');return}
  const id=await save();if(!id)return;const link=SHARE_BASE+'#'+id;
  $('linkBox').hidden=false;$('shareLink').value=link;
  try{await navigator.clipboard.writeText(link);toast('Link copied. Anyone you share the Designer with can open this design.')}catch(e){$('shareLink').select();toast('Copy the link below to share this design.')}
}
async function order(){
  if(!db||!me){toast('Ordering needs you signed in to Claude.',$('orderToast'));return}
  if(!S.layers.length){toast('Add a logo first.',$('orderToast'));return}
  const qty=clamp(parseInt($('oqty').value)||1,1,50),name=$('oname').value.trim();
  if(!name){toast('Add who gets the gear.',$('orderToast'));$('oname').focus();return}
  const G=GARMENTS[S.garment];
  const o={design:designDoc(),size:$('osize').value,quantity:qty,name,note:$('onote').value.trim(),
    printSpec:{garment:G.name,fabric:S.fabric,fabricName:nameOf(FABRIC,S.fabric),method:S.method,
      logos:S.layers.map(l=>{const p=position(l);return {style:labelOf(l.logo),logoId:l.logo,ink:l.ink,inkName:nameOf(INK,l.ink),side:l.side,placement:p.label,
        widthCm:+p.b.w.toFixed(1),heightCm:+p.b.h.toFixed(1),offsetFromCentreCm:p.off,topBelowCollarCm:p.top,rotationDeg:Math.round(l.rot||0),copies:l.n||1}})},
    unitPrice:G.price,total:G.price*qty,status:'received',createdAt:new Date().toISOString(),by:me};
  $('orderBtn').disabled=true;
  try{await db.doc('orders/'+me).set({lastOrderAt:o.createdAt});await db.collection('orders/'+me+'/items').add(o);toast(`Order received: ${qty} × ${G.name}, size ${o.size}, £${o.total}. We'll keep you updated every step of the way.`,$('orderToast'))}
  catch(e){toast('The order did not go through ('+((e&&e.code)||'error')+'). Try again in a moment.',$('orderToast'))}
  finally{$('orderBtn').disabled=false}
}
function renderSaved(list){
  saved=list||[];
  if(!saved.length){$('saved').innerHTML='<p class="note">Designs you save, here or in the designer, appear here.</p>';return}
  $('saved').innerHTML=saved.map((d,i)=>`<div class="list-row"><button class="btn" type="button" data-i="${i}">${esc(d.name||'Untitled')} · ${esc((GARMENTS[d.garment]||{}).name||'')} · ${esc(nameOf(FABRIC,d.fabric))}</button></div>`).join('');
  $('saved').querySelectorAll('button').forEach(b=>b.onclick=()=>{applyDesign(saved[+b.dataset.i]);toast('Loaded '+(S.name||'design'))});
}
function applyDesign(d){d=normalise(d);S={...S,garment:d.garment,fabric:d.fabric||S.fabric,method:d.method||'print',edition:d.edition||'',name:d.name||'',id:d.id||null,layers:d.layers,sel:d.layers.length?0:-1};
  render();if(S.layers[0])faceView(S.layers[0].side)}
function renderQueue(docs){
  if(!docs.length){$('queue').innerHTML='<p class="note">No orders yet. New orders appear here as they come in.</p>';return}
  $('queue').innerHTML=docs.map(d=>{const o=d.data()||{},p=o.printSpec||{},ls=p.logos||[];return `<div class="order"><div class="top"><strong>${esc(o.quantity||1)} × ${esc(p.garment||'')} · ${esc(o.size||'')}</strong><span class="pill">${esc(o.status||'received')}</span></div><div>${esc(o.name||'')}${o.note?' · '+esc(o.note):''}</div><div class="note">${esc(p.fabricName||p.fabric||'')} · ${p.method==='embroidery'?'Embroidery':'Screen print'} · ${ls.length||1} logo${ls.length===1?'':'s'}${o.total?' · £'+esc(o.total):''}</div>${ls.map(l=>`<div class="note">${esc(l.side)} · ${esc(l.style)} · ${esc(l.inkName||l.ink)} · ${esc(l.widthCm)} × ${esc(l.heightCm)} cm · ${esc(l.placement)}</div>`).join('')}</div>`}).join('');
}
async function connect(){
  if(!window.claude||!window.claude.use){renderSaved((load('paradox.designer.saved')||[]).map(normalise));return}
  const [d,u]=await Promise.all([claude.use('db'),claude.use('user')]);db=d;
  if(u){try{me=await u.id()}catch(e){}try{isEditor=await u.canEdit()}catch(e){}}
  if(!db){renderSaved((load('paradox.designer.saved')||[]).map(normalise));$('orderNote').insertAdjacentHTML('beforeend',' Sign in to Claude to send orders.');return}
  const hash=location.hash.replace('#','');
  if(hash){try{const s=await db.doc('designs/'+hash).get();if(s.exists){applyDesign({...s.data(),id:hash});if((s.data()||{}).by!==me){S.id=null}$('sharedBanner').hidden=false;$('sharedText').textContent=`You opened a shared design${S.name?': '+S.name:''}. Change anything and save it as your own.`}}catch(e){}}
  if(me)db.collection('designs').where('by','==',me).onSnapshot(q=>renderSaved(q.docs.map(x=>normalise({...x.data(),id:x.id})).sort((a,b)=>String(b.updatedAt||b.savedAt).localeCompare(String(a.updatedAt||a.savedAt)))),()=>renderSaved([]));
  if(isEditor){$('queueGroup').hidden=false;db.collection('orders').onSnapshot(async q=>{const all=[];for(const x of q.docs){try{const it=await db.collection('orders/'+x.id+'/items').get();all.push(...it.docs)}catch(e){}}
    all.sort((a,b)=>String((b.data()||{}).createdAt).localeCompare(String((a.data()||{}).createdAt)));renderQueue(all.slice(0,50))},()=>{$('queueGroup').hidden=true})}
}

/* ── the designer, opened from here ───────────────────────────────────── */
function openDesigner(select){
  if(!PXD){toast('The designer could not load. Reload the page.');return}
  spin.stopped=true;
  const sides=[{id:'front',label:'Front',mirror:false,backdrop:backdrop('front'),area:areaFor(S.garment,'front')},{id:'back',label:'Back',mirror:true,backdrop:backdrop('back'),area:areaFor(S.garment,'back')}];
  PXD.open({logos:LIST,inks:INK,sides,bounds:BOUNDS,ground:S.fabric,store:STORE,
    design:{id:S.id,name:S.name,layers:S.layers},select:typeof select==='number'?select:undefined,side:(cur()||{}).side,
    onApply:d=>{S.layers=normalise({layers:d.layers}).layers.map(l=>{let place=l.place||'custom';
        if(place!=='custom'){const p=presetFor(place,l.logo,S.garment);if(Math.abs(p.x-l.x)>.05||Math.abs(p.y-l.y)>.05||Math.abs(p.w-l.w)>.05||Math.abs((p.rot||0)-(l.rot||0))>.5||p.side!==l.side)place='custom'}
        return {...l,place}});S.id=d.id||S.id;S.name=d.name||S.name;S.sel=S.layers.length?0:-1;render();
      const s=S.layers[0]?S.layers[0].side:'front';faceView(s);toast(S.layers.length?'Your design is on the garment.':'Design cleared.')}});
}

/* ── wiring ───────────────────────────────────────────────────────────── */
document.querySelectorAll('#garmentSeg button').forEach(b=>b.onclick=()=>{const gk=b.dataset.v;
  S.layers.forEach(l=>{if(l.place&&l.place!=='custom'){const p=presetFor(l.place,l.logo,gk);Object.assign(l,{x:p.x,y:p.y,w:p.w,rot:p.rot,side:p.side})}});S.garment=gk;render()});
document.querySelectorAll('#methodSeg button').forEach(b=>b.onclick=()=>{S.method=b.dataset.v;render()});
document.querySelectorAll('#viewSeg button').forEach(b=>b.onclick=()=>faceView(b.dataset.v));
document.querySelectorAll('#placeSeg button').forEach(b=>b.onclick=()=>{const v=b.dataset.v;
  if(v==='custom'){openDesigner(S.sel>=0?S.sel:undefined);return}
  const l=cur();if(!l)return;const p=presetFor(v,l.logo,S.garment);Object.assign(l,{x:p.x,y:p.y,w:p.w,rot:p.rot,side:p.side,place:v});render();faceView(p.side)});
$('wid').oninput=e=>{const l=cur();if(!l)return;l.w=+e.target.value;render()};
$('rot').oninput=e=>{const l=cur();if(!l)return;l.rot=+e.target.value;l.place='custom';render()};
$('edition').oninput=e=>{S.edition=e.target.value.toUpperCase();render()};
$('addLogo').onclick=()=>{const used=S.layers.map(l=>l.place);const place=!used.includes('back')?'back':!used.includes('left')?'left':'chest';
  S.layers.push(newLayer(place,(cur()||{}).logo||'bracket-paradox',(cur()||{}).ink||'#ffffff',S.garment));S.sel=S.layers.length-1;render();faceView(cur().side)};
$('allStyles').onclick=()=>openDesigner(S.sel>=0?S.sel:undefined);
$('designBtn').onclick=()=>openDesigner(S.sel>=0?S.sel:undefined);
$('saveBtn').onclick=save;$('shareBtn').onclick=share;$('orderBtn').onclick=order;
$('copyLink').onclick=()=>{navigator.clipboard.writeText($('shareLink').value).then(()=>toast('Link copied')).catch(()=>{$('shareLink').select();toast('Select the link and copy it.')})};
$('resetBtn').onclick=()=>{S=DEFAULT();render();faceView('front');toast('Back to the black hoodie with vertical パラドックス')};
$('sharedDismiss').onclick=()=>{$('sharedBanner').hidden=true;S.id=null;toast('It is yours now. Save it to keep it.')};
const lockDrop=e=>{e.preventDefault()};['dragenter','dragover','drop'].forEach(ev=>$('drop').addEventListener(ev,lockDrop));
swatches($('fabricSw'),FABRIC,c=>{S.fabric=c;render()},'fabricPick','Fabric');
swatches($('inkSw'),INK,c=>{const l=cur();if(l){l.ink=c;render()}},null,'Ink');
if(LOGO['horizontal-paradox']){$('hdrMark').src=logoURI('horizontal-paradox','#ffffff')}
$('allStyles').textContent=`All ${LIST.length} styles, in the designer →`;
initThree();render();connect();
window.PXStudio={get state(){return S},render,faceView,openDesigner,backdrop,setLogo,get camera(){return camera},get controls(){return controls}};
})();
