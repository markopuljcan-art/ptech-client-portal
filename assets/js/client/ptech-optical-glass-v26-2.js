/* PTech Client Portal V26.2 - optical dock enhancement.
 * The browser's real backdrop displacement is enabled ONLY on Chromium.
 * Safari/iOS keeps an enhanced glossy material without risky DOM cloning.
 * This file NEVER intercepts navigation, changes auth, or moves the bubble;
 * mobile.js remains the sole owner of spring physics and active tabs.
 */
(() => {
  'use strict';
  const mobile = window.matchMedia('(max-width: 1100px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const mk = name => document.createElementNS(ns, name);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function init() {
    const nav = document.querySelector('nav.bottom-nav');
    if (!nav || nav.dataset.p262Glass === 'true') return;
    const bubble = nav.querySelector('.v131-dock-bubble');
    if (!bubble) return;
    nav.dataset.p262Glass = 'true';
    nav.classList.add('ptech-optical-dock');

    // The three non-interactive glass layers move with the EXISTING spring.
    const lens = document.createElement('span');
    lens.className = 'p262-refractive-lens';
    lens.setAttribute('aria-hidden', 'true');
    const rim = document.createElement('span');
    rim.className = 'p262-caustic-rim';
    rim.setAttribute('aria-hidden', 'true');
    const shine = document.createElement('span');
    shine.className = 'p262-specular-shine';
    shine.setAttribute('aria-hidden', 'true');
    bubble.append(lens, rim, shine);

    // Native backdrop SVG displacement works in Chromium but not in WebKit.
    // Do not attempt to clone the private document, inputs or DOM for Safari.
    const ua = navigator.userAgent || '';
    const chrome = /Chrome|Chromium|Edg\//.test(ua) && !/iP(ad|hone|od)|Firefox|FxiOS|CriOS/.test(ua);
    const refraction = chrome && CSS.supports('backdrop-filter', 'url(#p262-optical-filter)');
    const supportsCanvas = typeof document.createElement('canvas').getContext === 'function';
    if (refraction && supportsCanvas) {
      const svg = mk('svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.classList.add('p262-filter-host');
      svg.setAttribute('width', '0');
      svg.setAttribute('height', '0');
      const defs = mk('defs');
      const filter = mk('filter');
      filter.setAttribute('id', 'p262-optical-filter');
      filter.setAttribute('filterUnits', 'objectBoundingBox');
      filter.setAttribute('primitiveUnits', 'objectBoundingBox');
      filter.setAttribute('x', '-.12');
      filter.setAttribute('y', '-.16');
      filter.setAttribute('width', '1.24');
      filter.setAttribute('height', '1.32');
      const map = mk('feImage');
      map.setAttribute('x','0');
      map.setAttribute('y','0');
      map.setAttribute('width','1');
      map.setAttribute('height','1');
      map.setAttribute('preserveAspectRatio','none');
      map.setAttribute('result','refractMap');
      const displacement = mk('feDisplacementMap');
      displacement.setAttribute('in','SourceGraphic');
      displacement.setAttribute('in2','refractMap');
      // A small fraction of lens width, never a huge ripple.
      displacement.setAttribute('scale','.13');
      displacement.setAttribute('xChannelSelector','R');
      displacement.setAttribute('yChannelSelector','G');
      filter.append(map,displacement);
      defs.append(filter); svg.append(defs);document.body.append(svg);

      const drawMap = () => {
        if (!mobile.matches) return;
        const w = Math.max(48,Math.round(bubble.offsetWidth));
        const h = Math.max(40,Math.round(bubble.offsetHeight));
        const canvas = document.createElement('canvas');
        canvas.width=w*2;canvas.height=h*2;
        const ctx = canvas.getContext('2d',{willReadFrequently:false});
        if (!ctx) return;
        const {width:W,height:H}=canvas;
        const image=ctx.createImageData(W,H);
        const radius=21*2;
        const ex=W/2-radius, ey=H/2-radius;
        for(let y=0;y<H;y++)for(let x=0;x<W;x++){
          // Rounded rectangle signed distance for the edge-normal field.
          const xx=x-W/2,yy=y-H/2;
          const qx=Math.abs(xx)-ex,qy=Math.abs(yy)-ey;
          const ax=Math.max(qx,0),ay=Math.max(qy,0);
          const sdf=Math.hypot(ax,ay)+Math.min(Math.max(qx,qy),0)-radius;
          const inset=Math.max(0,-sdf);
          const edge=clamp(1-inset/(14*2),0,1);
          let nx=xx,ny=yy;
          if(ax>0||ay>0){nx=Math.sign(xx)*ax;ny=Math.sign(yy)*ay;}
          else if(qx>qy){nx=Math.sign(xx);ny=0;}
          else{nx=0;ny=Math.sign(yy);}
          const mag=Math.hypot(nx,ny)||1;
          // Neutral 128 in the middle; outward curvature in the 14px rim.
          const pow=edge*edge*(1-smoothstep(0,.8,Math.max(0,sdf)/8));
          const offset=(y*W+x)*4;
          image.data[offset]=clamp(Math.round(128-65*pow*nx/mag),0,255);
          image.data[offset+1]=clamp(Math.round(128-65*pow*ny/mag),0,255);
          image.data[offset+2]=128;
          image.data[offset+3]=255;
        }
        ctx.putImageData(image,0,0);
        map.setAttribute('href',canvas.toDataURL('image/png'));
      };
      function smoothstep(a,b,v){const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);}
      drawMap();
      if('ResizeObserver' in window)new ResizeObserver(drawMap).observe(bubble);
      window.addEventListener('orientationchange',drawMap,{passive:true});
      nav.classList.add('p262-native-refraction');
    } else {
      nav.classList.add('p262-refraction-fallback');
    }

    // Velocity-dependent edge light follows the spring center without a second
    // animation loop. Touch moves are throttled to requestAnimationFrame.
    let pointerFrame=0, lastX=0,lastY=0;
    function updatePointer(x,y){
      lastX=x;lastY=y;
      if(pointerFrame)return;
      pointerFrame=requestAnimationFrame(()=>{
        pointerFrame=0;
        const rect=bubble.getBoundingClientRect();
        const u=rect.width?clamp((lastX-rect.left)/rect.width,0,1):.5;
        const v=rect.height?clamp((lastY-rect.top)/rect.height,0,1):.5;
        bubble.style.setProperty('--p262-light-x',`${(u*100).toFixed(1)}%`);
        bubble.style.setProperty('--p262-light-y',`${(v*100).toFixed(1)}%`);
      });
    }
    const onPointer=e=>{if(mobile.matches&&!reduced.matches)updatePointer(e.clientX,e.clientY);};
    nav.addEventListener('pointermove',onPointer,{passive:true});
    nav.addEventListener('touchmove',e=>{
      if(!mobile.matches||reduced.matches||!e.touches.length)return;
      updatePointer(e.touches[0].clientX,e.touches[0].clientY);
    },{passive:true});
    nav.addEventListener('pointerleave',()=>{
      bubble.style.setProperty('--p262-light-x','48%');
      bubble.style.setProperty('--p262-light-y','0%');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
