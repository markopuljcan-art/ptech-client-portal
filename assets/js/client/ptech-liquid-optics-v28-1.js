/* PTech V28.1 — curved glass over a caller-owned decorative scene.
 * Three Snell-law rays sample that scene with different refractive indices.
 * This does not capture or refract arbitrary DOM, user text or controls.
 * One reusable WebGL context paints supplied 2D canvases; the CPU path uses
 * the same geometry, refraction, dispersion and lighting when GL is absent.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PTechLiquidOptics = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const finite = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const smoothstep = (lo, hi, v) => {
    const t = clamp((v - lo) / (hi - lo), 0, 1);
    return t * t * (3 - 2 * t);
  };

  function optionsFor(input, scene) {
    const value = input || {};
    const width = Math.max(1, finite(value.width, 1));
    const height = Math.max(1, finite(value.height, 1));
    const kind = value.kind || 'outer';
    const inner = kind === 'inner', header = kind === 'header';
    const defaultRim = inner ? clamp(height * .18, 8, 12) : header ? clamp(height * .22, 12, 18) : clamp(height * .12, 16, 22);
    const requestedRatio = clamp(finite(value.pixelRatio, 1), .2, 2);
    // Guard malformed/oversized inputs without allocating unbounded buffers.
    const ratio = Math.min(requestedRatio, 4096 / width, 4096 / height, Math.sqrt(4000000 / (width * height)));
    const pixelWidth = Math.max(1, Math.round(width * ratio));
    const pixelHeight = Math.max(1, Math.round(height * ratio));
    return {
      width, height, kind, pixelRatio: ratio, pixelWidth, pixelHeight,
      radius: clamp(finite(value.radius, inner ? 15 : 23), 0, Math.min(width, height) / 2),
      rim: clamp(finite(value.rim, defaultRim), .25, Math.max(.25, Math.min(width, height) / 2)),
      depth: clamp(finite(value.depth, inner ? 16 : header ? 28 : 34), 0, 80),
      dispersion: clamp(finite(value.dispersion, 1), 0, 3),
      originX: finite(value.originX, 0), originY: finite(value.originY, 0),
      sceneWidth: Math.max(1, finite(value.sceneWidth, scene.width)),
      sceneHeight: Math.max(1, finite(value.sceneHeight, scene.height)),
      light: value.light !== false,
      aa: .75 * Math.max(width / pixelWidth, height / pixelHeight)
    };
  }

  function checkScene(scene) {
    if (!scene || !Number.isInteger(scene.width) || !Number.isInteger(scene.height) || scene.width < 1 || scene.height < 1 || !scene.data || scene.data.length < scene.width * scene.height * 4) {
      throw new TypeError('PTechLiquidOptics requires RGBA scene pixels with positive integer dimensions.');
    }
  }

  function sample(scene, cssX, cssY, o, out) {
    const x = clamp(cssX / o.sceneWidth * scene.width - .5, 0, scene.width - 1);
    const y = clamp(cssY / o.sceneHeight * scene.height - .5, 0, scene.height - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, scene.width - 1), y1 = Math.min(y0 + 1, scene.height - 1);
    const fx = x - x0, fy = y - y0;
    const i00 = (y0 * scene.width + x0) * 4, i10 = (y0 * scene.width + x1) * 4;
    const i01 = (y1 * scene.width + x0) * 4, i11 = (y1 * scene.width + x1) * 4;
    const data = scene.data;
    for (let c = 0; c < 4; c++) {
      const upper = data[i00 + c] + (data[i10 + c] - data[i00 + c]) * fx;
      const lower = data[i01 + c] + (data[i11 + c] - data[i01 + c]) * fx;
      out[c] = (upper + (lower - upper) * fy) / 255;
    }
  }

  function rayOffset(index, nx, ny, nz, travel, out) {
    // refract(I, N, eta), with I=(0,0,-1), then intersect the rear plane.
    const eta = 1 / index;
    const coefficient = eta * nz - Math.sqrt(Math.max(0, 1 - eta * eta * (1 - nz * nz)));
    const tz = -eta + coefficient * nz;
    const distance = travel / Math.max(.15, -tz);
    out[0] = coefficient * nx * distance;
    out[1] = coefficient * ny * distance;
  }

  /** Pure CPU renderer. It has no document/canvas dependency and returns an
   * ImageData-shaped {data, width, height}; coordinates/options are CSS pixels.
   */
  function renderPixels(scene, input) {
    checkScene(scene);
    const o = optionsFor(input, scene);
    const data = new Uint8ClampedArray(o.pixelWidth * o.pixelHeight * 4);
    const ex = o.width / 2 - o.radius, ey = o.height / 2 - o.radius;
    const red = new Float64Array(4), green = new Float64Array(4), blue = new Float64Array(4);
    const offset = new Float64Array(2);
    const envLow = o.light ? [.44, .37, .24] : [.06, .09, .14];
    const envHigh = o.light ? [1, 1, .98] : [.98, .91, .71];
    const tint = o.light ? [1, .99, .96] : [.07, .10, .15];
    const shine = o.light ? [1, .99, .95] : [1, .94, .78];
    const f0 = Math.pow((1.49 - 1) / (1.49 + 1), 2);

    for (let y = 0; y < o.pixelHeight; y++) {
      const py = (y + .5) * o.height / o.pixelHeight;
      for (let x = 0; x < o.pixelWidth; x++) {
        const px = (x + .5) * o.width / o.pixelWidth;
        const dx = px - o.width / 2, dy = py - o.height / 2;
        const qx = Math.abs(dx) - ex, qy = Math.abs(dy) - ey;
        const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
        const sdf = Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - o.radius;
        const alpha = 1 - smoothstep(-o.aa, o.aa, sdf);
        if (alpha <= 0) continue;
        const output = (y * o.pixelWidth + x) * 4;
        const inset = Math.max(0, -sdf);
        const t = clamp(inset / o.rim, 0, 1);
        const worldX = o.originX + px, worldY = o.originY + py;

        // The flat center is an exact aligned view of the scene: no blur,
        // tint, reflective veil or chromatic offset is applied there.
        if (t >= 1) {
          sample(scene, worldX, worldY, o, green);
          for (let c = 0; c < 3; c++) data[output + c] = Math.round(green[c] * 255);
          data[output + 3] = Math.round(green[3] * alpha * 255);
          continue;
        }

        let normalX, normalY;
        if (ax || ay) {
          const length = Math.hypot(ax, ay);
          normalX = Math.sign(dx) * ax / length;
          normalY = Math.sign(dy) * ay / length;
        } else if (qx > qy) { normalX = Math.sign(dx); normalY = 0; }
        else { normalX = 0; normalY = Math.sign(dy); }
        const profile = Math.sqrt(Math.max(0, 2 * t - t * t));
        const slope = .9 * (1 - t) / Math.max(profile, .10);
        const norm = Math.sqrt(1 + slope * slope);
        const nx = normalX * slope / norm, ny = normalY * slope / norm, nz = 1 / norm;
        const travel = o.depth * (.34 + .66 * profile);
        const indices = [1.49 - .065 * o.dispersion, 1.49, 1.49 + .065 * o.dispersion];
        rayOffset(indices[0], nx, ny, nz, travel, offset);
        sample(scene, worldX + offset[0], worldY + offset[1], o, red);
        rayOffset(indices[1], nx, ny, nz, travel, offset);
        sample(scene, worldX + offset[0], worldY + offset[1], o, green);
        rayOffset(indices[2], nx, ny, nz, travel, offset);
        sample(scene, worldX + offset[0], worldY + offset[1], o, blue);

        const edge = 1 - t;
        const rx = 2 * nz * nx, ry = 2 * nz * ny, rz = 2 * nz * nz - 1;
        const windowLight = Math.exp(-Math.pow((rx * .65 + ry * .76 + rz * .12 + .18) / .22, 2));
        const direction = clamp(.56 - .28 * rx - .38 * ry + .08 * rz, 0, 1);
        const environment = clamp(direction * .70 + windowLight * .35, 0, 1);
        const fresnel = (f0 + (1 - f0) * Math.pow(1 - nz, 5)) * edge;
        const reflection = fresnel * (.34 + .48 * edge);
        const specular = Math.pow(Math.max(0, -.245 * nx - .302 * ny + .921 * nz), 64) * edge * .34;
        const lightFacing = Math.max(0, -.6 * normalX - .8 * normalY);
        const rimLight = Math.exp(-Math.pow((inset - .85) / (.60 + .3 * o.aa), 2)) * (.14 + .22 * lightFacing) * edge;
        const caustic = Math.exp(-Math.pow((t - .73) / .11, 2)) * lightFacing * .06 * edge;
        const highlight = specular + rimLight + caustic;
        const tintAmount = (o.light ? .035 : .055) * edge;
        const channels = [red[0], green[1], blue[2]];
        for (let c = 0; c < 3; c++) {
          const transmission = channels[c] * (1 - tintAmount) + tint[c] * tintAmount;
          const reflected = envLow[c] + (envHigh[c] - envLow[c]) * environment;
          const color = transmission * (1 - reflection) + reflected * reflection + shine[c] * highlight;
          data[output + c] = Math.round(clamp(color, 0, 1) * 255);
        }
        data[output + 3] = Math.round(clamp((red[3] + green[3] + blue[3]) / 3, 0, 1) * alpha * 255);
      }
    }
    return { data, width: o.pixelWidth, height: o.pixelHeight };
  }

  const vertexSource = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}
  `;
  const fragmentSource = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uScene;
    uniform vec2 uSize, uOrigin, uSceneSize;
    uniform float uRadius, uRim, uDepth, uDispersion, uLight, uAA;
    float square(float x){return x*x;}
    vec4 sceneAt(vec2 p){return texture2D(uScene,clamp(p/uSceneSize,0.,1.));}
    vec2 traceRay(float index,vec3 n,float travel){
      vec3 ray=refract(vec3(0.,0.,-1.),n,1./index);
      return ray.xy/max(.15,-ray.z)*travel;
    }
    void main(){
      vec2 p=vec2(vUv.x,1.-vUv.y)*uSize;
      vec2 centered=p-uSize*.5;
      vec2 q=abs(centered)-(uSize*.5-uRadius);
      vec2 outside=max(q,0.);
      float sdf=length(outside)+min(max(q.x,q.y),0.)-uRadius;
      float coverage=1.-smoothstep(-uAA,uAA,sdf);
      if(coverage<=0.){gl_FragColor=vec4(0.);return;}
      float inset=max(0.,-sdf);
      float t=clamp(inset/uRim,0.,1.);
      vec2 world=uOrigin+p;
      if(t>=1.){vec4 plain=sceneAt(world);gl_FragColor=vec4(plain.rgb,plain.a*coverage);return;}
      vec2 outward;
      if(dot(outside,outside)>0.)outward=normalize(outside*sign(centered));
      else if(q.x>q.y)outward=vec2(sign(centered.x),0.);
      else outward=vec2(0.,sign(centered.y));
      float profile=sqrt(max(0.,2.*t-t*t));
      float slope=.9*(1.-t)/max(profile,.10);
      vec3 n=normalize(vec3(outward*slope,1.));
      float travel=uDepth*(.34+.66*profile);
      vec4 red=sceneAt(world+traceRay(1.49-.065*uDispersion,n,travel));
      vec4 green=sceneAt(world+traceRay(1.49,n,travel));
      vec4 blue=sceneAt(world+traceRay(1.49+.065*uDispersion,n,travel));
      vec3 color=vec3(red.r,green.g,blue.b);
      float edge=1.-t;
      vec3 reflectionDirection=reflect(vec3(0.,0.,-1.),n);
      float windowLight=exp(-square((dot(reflectionDirection,vec3(.65,.76,.12))+.18)/.22));
      float direction=clamp(.56+dot(reflectionDirection,vec3(-.28,-.38,.08)),0.,1.);
      float environment=clamp(direction*.70+windowLight*.35,0.,1.);
      float f0=pow((1.49-1.)/(1.49+1.),2.);
      float fresnel=(f0+(1.-f0)*pow(1.-n.z,5.))*edge;
      float reflection=fresnel*(.34+.48*edge);
      float specular=pow(max(0.,dot(n,vec3(-.245,-.302,.921))),64.)*edge*.34;
      float lightFacing=max(0.,dot(outward,vec2(-.6,-.8)));
      float rimLight=exp(-square((inset-.85)/(.60+.3*uAA)))*(.14+.22*lightFacing)*edge;
      float caustic=exp(-square((t-.73)/.11))*lightFacing*.06*edge;
      vec3 tint=mix(vec3(.07,.10,.15),vec3(1.,.99,.96),uLight);
      color=mix(color,tint,mix(.055,.035,uLight)*edge);
      vec3 envLow=mix(vec3(.06,.09,.14),vec3(.44,.37,.24),uLight);
      vec3 envHigh=mix(vec3(.98,.91,.71),vec3(1.,1.,.98),uLight);
      color=mix(color,mix(envLow,envHigh,environment),reflection);
      color+=mix(vec3(1.,.94,.78),vec3(1.,.99,.95),uLight)*(specular+rimLight+caustic);
      float sourceAlpha=(red.a+green.a+blue.a)/3.;
      gl_FragColor=vec4(clamp(color,0.,1.),sourceAlpha*coverage);
    }
  `;

  /** DOM-independent coordinator interface: only an offscreen canvas is
   * created; caller-supplied target canvases stay in the caller's ownership.
   */
  function createRenderer() {
    let gl, canvas, program, texture, buffer, scenePixels, sceneCanvas;
    let mode = 'cpu', dead = false, lost = false;
    let maximumWidth = 1, maximumHeight = 1;
    const locations = {};
    const fallback = () => { if (!dead) mode = 'cpu'; };
    const onLost = event => { if (event.preventDefault) event.preventDefault(); lost = true; fallback(); };

    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        throw new Error('Liquid optics shader compilation failed.');
      }
      return shader;
    }

    try {
      if (typeof document !== 'undefined') {
        canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        gl = canvas.getContext('webgl', {
          alpha: true, antialias: false, depth: false, stencil: false,
          premultipliedAlpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power'
        });
        if (gl) {
          const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
          const source = precision && precision.precision ? fragmentSource : fragmentSource.replace('highp', 'mediump');
          const vertex = compile(gl.VERTEX_SHADER, vertexSource);
          const fragment = compile(gl.FRAGMENT_SHADER, source);
          program = gl.createProgram();
          gl.attachShader(program, vertex); gl.attachShader(program, fragment);
          gl.linkProgram(program);
          gl.deleteShader(vertex); gl.deleteShader(fragment);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Liquid optics shader linking failed.');
          buffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
          texture = gl.createTexture();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          for (const name of ['uScene','uSize','uOrigin','uSceneSize','uRadius','uRim','uDepth','uDispersion','uLight','uAA']) locations[name] = gl.getUniformLocation(program, name);
          locations.position = gl.getAttribLocation(program, 'aPosition');
          canvas.addEventListener('webglcontextlost', onLost);
          mode = 'webgl';
        }
      }
    } catch (_) { fallback(); }

    function setScene(nextScene) {
      if (dead) throw new Error('Liquid optics renderer has been destroyed.');
      if (!nextScene || !nextScene.width || !nextScene.height || typeof nextScene.getContext !== 'function') throw new TypeError('setScene requires a nonempty 2D scene canvas.');
      const context = nextScene.getContext('2d', { willReadFrequently: true });
      if (!context) throw new TypeError('The scene must be a 2D canvas.');
      scenePixels = context.getImageData(0, 0, nextScene.width, nextScene.height);
      sceneCanvas = nextScene;
      maximumWidth = maximumHeight = 1;
      if (mode === 'webgl' && !lost) {
        try {
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sceneCanvas);
          if (gl.getError() !== gl.NO_ERROR) fallback();
        } catch (_) { fallback(); }
      }
    }

    function render(target, input) {
      if (dead) throw new Error('Liquid optics renderer has been destroyed.');
      if (!scenePixels) throw new Error('Call setScene before rendering glass.');
      if (!target || typeof target.getContext !== 'function') throw new TypeError('render requires a target 2D canvas.');
      const context = target.getContext('2d');
      if (!context) throw new TypeError('The target must be a 2D canvas.');
      let o = optionsFor(input, scenePixels);
      if (mode === 'webgl' && !lost) {
        try {
          maximumWidth = Math.max(maximumWidth, o.pixelWidth);
          maximumHeight = Math.max(maximumHeight, o.pixelHeight);
          if (canvas.width !== maximumWidth) canvas.width = maximumWidth;
          if (canvas.height !== maximumHeight) canvas.height = maximumHeight;
          gl.viewport(0, 0, o.pixelWidth, o.pixelHeight);
          gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.SCISSOR_TEST);
          gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(program);
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.enableVertexAttribArray(locations.position);
          gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
          gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.uniform1i(locations.uScene, 0);
          gl.uniform2f(locations.uSize, o.width, o.height);
          gl.uniform2f(locations.uOrigin, o.originX, o.originY);
          gl.uniform2f(locations.uSceneSize, o.sceneWidth, o.sceneHeight);
          gl.uniform1f(locations.uRadius, o.radius); gl.uniform1f(locations.uRim, o.rim);
          gl.uniform1f(locations.uDepth, o.depth); gl.uniform1f(locations.uDispersion, o.dispersion);
          gl.uniform1f(locations.uLight, o.light ? 1 : 0); gl.uniform1f(locations.uAA, o.aa);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw new Error('Liquid optics GL rendering failed.');
          if (target.width !== o.pixelWidth) target.width = o.pixelWidth;
          if (target.height !== o.pixelHeight) target.height = o.pixelHeight;
          context.clearRect(0, 0, target.width, target.height);
          // The viewport occupies the bottom-left part of a reusable larger GL
          // buffer; drawImage uses top-left coordinates, hence this y offset.
          context.drawImage(canvas, 0, canvas.height - o.pixelHeight, o.pixelWidth, o.pixelHeight, 0, 0, o.pixelWidth, o.pixelHeight);
          return 'webgl';
        } catch (_) { fallback(); }
      }
      const modestRatio = Math.min(o.pixelRatio, .85, Math.sqrt(350000 / (o.width * o.height)));
      const pixels = renderPixels(scenePixels, Object.assign({}, input, { pixelRatio: modestRatio }));
      if (target.width !== pixels.width) target.width = pixels.width;
      if (target.height !== pixels.height) target.height = pixels.height;
      const image = context.createImageData(pixels.width, pixels.height);
      image.data.set(pixels.data);
      context.putImageData(image, 0, 0);
      return 'cpu';
    }

    function destroy() {
      if (dead) return;
      dead = true; mode = 'destroyed';
      if (canvas) canvas.removeEventListener('webglcontextlost', onLost);
      if (gl && !lost) {
        try { if (texture) gl.deleteTexture(texture); if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); } catch (_) {}
      }
      if (canvas) { canvas.width = canvas.height = 1; }
      scenePixels = sceneCanvas = canvas = gl = program = texture = buffer = null;
    }

    return { setScene, render, destroy, get mode() { return mode; } };
  }

  return { createRenderer, renderPixels };
});
