/* PTech V28.3 — small progressive enhancement for LIVE page backdrops.
 * A generated displacement field bends the real content behind the header
 * and phone dock. It never copies/captures DOM or handles navigation/input.
 * Safari/iOS/Firefox use the native CSS blur material defined in the CSS.
 */
(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mobile = window.matchMedia('(max-width:1100px)');
  const reducedTransparency = window.matchMedia('(prefers-reduced-transparency:reduce)');
  let destroyCurrent = null;

  function start() {
    if (destroyCurrent || !document.body.classList.contains('ptech-live-glass-v283')) return;
    const ua = navigator.userAgent || '';
    // CSS.supports alone reports grammar support even where SVG backdrops do
    // not paint correctly. Keep the known native-blur path on WebKit and Gecko.
    const chromium = /Chrome|Chromium|Edg\//.test(ua) && !/iP(ad|hone|od)|Firefox|FxiOS|CriOS/.test(ua);
    if (!chromium || !window.CSS || !CSS.supports('backdrop-filter', 'url(#p283-live-test)')) return;
    const targets = [...document.querySelectorAll('nav.bottom-nav')];
    if (document.body.classList.contains('ptech-home-glass-v28')) {
      const header = document.querySelector('.dashboard-header');
      if (header) targets.push(header);
    }
    if (!targets.length) return;

    const make = (name, attrs = {}) => {
      const element = document.createElementNS(NS, name);
      for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
      return element;
    };
    const host = make('svg', {width:0, height:0, 'aria-hidden':'true', focusable:'false'});
    host.classList.add('p283-filter-host');
    const defs = make('defs');
    host.append(defs);
    document.body.append(host);
    let stopped = false, frame = 0;
    const records = targets.map((element, index) => {
      const filter = make('filter', {
        id:`p283-live-glass-${index}`, filterUnits:'userSpaceOnUse',
        primitiveUnits:'userSpaceOnUse', 'color-interpolation-filters':'sRGB'
      });
      const map = make('feImage', {x:0,y:0,preserveAspectRatio:'none',result:'curvePixels'});
      // PNG 128 is 128/255 rather than .5. Correct the half-code offset so
      // the flat center truly leaves all backdrop text/images in position.
      const neutral = make('feComponentTransfer', {in:'curvePixels',result:'curve'});
      neutral.append(
        make('feFuncR',{type:'linear',slope:1,intercept:-.5/255}),
        make('feFuncG',{type:'linear',slope:1,intercept:-.5/255})
      );
      const soften = make('feGaussianBlur', {in:'SourceGraphic',stdDeviation:3.5,result:'softBackdrop'});
      const bend = make('feDisplacementMap', {
        in:'softBackdrop',in2:'curve',scale:48,xChannelSelector:'R',yChannelSelector:'G'
      });
      filter.append(map, neutral, soften, bend);
      defs.append(filter);
      return {element,filter,map,index,key:'',pendingKey:'',generation:0};
    });

    function deactivate(record) {
      record.generation++;
      record.key=record.pendingKey='';
      record.element.classList.remove('p283-native-backdrop');
      record.element.style.removeProperty('--p283-live-filter');
    }

    function draw(record) {
      const {element,filter,map} = record;
      const dock = element.matches('nav.bottom-nav');
      if (reducedTransparency.matches || (dock && !mobile.matches)) {
        deactivate(record);
        return;
      }
      // offsetWidth/Height are untransformed layout dimensions: the existing
      // spring and cross-document transitions continue independently.
      const width = element.offsetWidth, height = element.offsetHeight;
      if (width < 2 || height < 2 || !element.isConnected) {deactivate(record);return;}
      const radius = Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0,width/2,height/2);
      const key = [width,height,radius].join(':');
      if (key === record.key || key === record.pendingKey) return;
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1.5,window.devicePixelRatio || 1,1600/width,300/height,Math.sqrt(300000/(width*height)));
      canvas.width = Math.max(1,Math.floor(width*ratio));
      canvas.height = Math.max(1,Math.floor(height*ratio));
      const context = canvas.getContext('2d');
      if (!context) {deactivate(record);return;}
      const pixels = context.createImageData(canvas.width,canvas.height);
      const ex = width/2-radius, ey = height/2-radius;
      const rim = dock ? 13 : 11;
      const depth = dock ? 23 : 20;
      for (let y=0; y<canvas.height; y++) for (let x=0; x<canvas.width; x++) {
        const px=(x+.5)/canvas.width*width-width/2;
        const py=(y+.5)/canvas.height*height-height/2;
        const qx=Math.abs(px)-ex, qy=Math.abs(py)-ey;
        const ax=Math.max(qx,0), ay=Math.max(qy,0);
        const sdf=Math.hypot(ax,ay)+Math.min(Math.max(qx,qy),0)-radius;
        const t=clamp(Math.max(0,-sdf)/rim,0,1);
        let dx=0,dy=0;
        if (sdf<=0 && t<1) {
          let nx,ny;
          if (ax || ay) {const len=Math.hypot(ax,ay);nx=Math.sign(px)*ax/len;ny=Math.sign(py)*ay/len;}
          else if (qx>qy) {nx=Math.sign(px);ny=0;}
          else {nx=0;ny=Math.sign(py);}
          const profile=Math.sqrt(Math.max(0,2*t-t*t));
          const slope=.9*(1-t)/Math.max(profile,.10);
          const norm=Math.sqrt(1+slope*slope),nz=1/norm;
          nx*=slope/norm;ny*=slope/norm;
          const eta=1/1.49;
          const coefficient=eta*nz-Math.sqrt(Math.max(0,1-eta*eta*(1-nz*nz)));
          const travel=depth*(.34+.66*profile)/Math.max(.15,eta-coefficient*nz);
          dx=coefficient*nx*travel;dy=coefficient*ny*travel;
        }
        const offset=(y*canvas.width+x)*4;
        pixels.data[offset]=Math.round(clamp(128+dx/48*255,0,255));
        pixels.data[offset+1]=Math.round(clamp(128+dy/48*255,0,255));
        pixels.data[offset+2]=128;pixels.data[offset+3]=255;
      }
      context.putImageData(pixels,0,0);
      const uri = canvas.toDataURL('image/png');
      const generation = ++record.generation;
      record.pendingKey=key;
      const decoded = new Image();
      decoded.onload = () => {
        if (stopped || generation !== record.generation || !element.isConnected) return;
        const currentRadius = Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0,element.offsetWidth/2,element.offsetHeight/2);
        if (reducedTransparency.matches || (dock && !mobile.matches) ||
            width !== element.offsetWidth || height !== element.offsetHeight || radius !== currentRadius) {
          deactivate(record);queue();return;
        }
        filter.setAttribute('x','-18');filter.setAttribute('y','-18');
        filter.setAttribute('width',String(width+36));filter.setAttribute('height',String(height+36));
        map.setAttribute('width',String(width));map.setAttribute('height',String(height));
        map.setAttribute('href',uri);
        element.style.setProperty('--p283-live-filter',`url("#p283-live-glass-${record.index}")`);
        element.classList.add('p283-native-backdrop');
        record.key = key;
        record.pendingKey='';
      };
      decoded.onerror = () => {
        if (generation !== record.generation) return;
        deactivate(record);
      };
      decoded.src = uri;
    }

    function queue() {
      if (stopped || frame || document.hidden) return;
      frame = requestAnimationFrame(() => {
        frame=0;
        for (const record of records) {
          try {draw(record);} catch (_) {
            deactivate(record);
          }
        }
      });
    }
    const observer = window.ResizeObserver ? new ResizeObserver(queue) : null;
    if (observer) targets.forEach(element => observer.observe(element));
    window.addEventListener('resize',queue,{passive:true});
    window.addEventListener('orientationchange',queue,{passive:true});
    document.addEventListener('visibilitychange',queue);
    const listen = (media,method) => {
      if (media[method+'EventListener']) media[method+'EventListener']('change',queue);
      else if (media[method+'Listener']) media[method+'Listener'](queue);
    };
    listen(mobile,'add');listen(reducedTransparency,'add');
    if (document.fonts) document.fonts.ready.then(queue);
    destroyCurrent = () => {
      stopped=true;
      if (frame) cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      window.removeEventListener('resize',queue);
      window.removeEventListener('orientationchange',queue);
      document.removeEventListener('visibilitychange',queue);
      listen(mobile,'remove');listen(reducedTransparency,'remove');
      records.forEach(deactivate);
      host.remove();destroyCurrent=null;
    };
    queue();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('pagehide',()=>{if(destroyCurrent)destroyCurrent();});
  window.addEventListener('pageshow',event=>{if(event.persisted)start();});
})();
