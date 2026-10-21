/* ★★★★★ × PARADOX — variations born in the Designer, added to the official set.
   Kept apart from logos.js so the logo-experiments file stays untouched. */
(function(){
  const L=window.LOGOS;if(!L)return;
  const base=L.find(l=>l.id==='vertical-kana');if(!base)return;
  /* DIAGONAL · パラドックス — seven vertical パラドックス marks, side by side, cut across at 33.2° */
  const [x,y,w,h]=base.vb.trim().split(/\s+/).map(Number),cx=x+w/2,cy=y+h/2,n=7,step=w*1.6,rot=33.2,a=rot*Math.PI/180;
  const W2=((n-1)/2)*step+w/2,H2=h/2,ex=W2*Math.abs(Math.cos(a))+H2*Math.abs(Math.sin(a)),ey=W2*Math.abs(Math.sin(a))+H2*Math.abs(Math.cos(a));
  let uses='';for(let i=0;i<n;i++)uses+=`<use xlink:href="#px-diag-vk" transform="translate(${((i-(n-1)/2)*step).toFixed(3)} 0)"/>`;
  const d=`<defs><g id="px-diag-vk">${base.d}</g></defs><g transform="rotate(${rot} ${cx.toFixed(3)} ${cy.toFixed(3)})">${uses}</g>`;
  const W=+(2*ex).toFixed(3),H=+(2*ey).toFixed(3);
  L.splice(L.indexOf(base)+1,0,{id:'diagonal-kana',label:'DIAGONAL · パラドックス',vb:`${(cx-ex).toFixed(3)} ${(cy-ey).toFixed(3)} ${W} ${H}`,w:W,h:H,d,
    origin:{from:'vertical-kana',copies:n,angle:rot,widthCm:93.7,centre:{x:1.45,y:25.61}}});
})();
