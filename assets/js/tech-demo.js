/* ============================================================
   Tech Demo Modules — approach.html
   Module 1: Remote Sensing Workflow
   Module 2: Interactive GIS Layer Demo
   Module 3: Satellite Data Sources
   ============================================================ */

(function () {
  'use strict';

  // ---- Utility ----
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  // ============================================================
  // MODULE 1: Data Fusion Funnel
  // ============================================================
  function initWorkflow() {
    var wrap = qs('#workflowModule');
    if (!wrap) return;

    var sources = qsa('.funnel-source', wrap);
    var tooltip = qs('#funnelTooltip', wrap);
    var targetEl = qs('#funnelTarget', wrap);
    var detailPanel = qs('#funnelDetailPanel', wrap);

    // Hover descriptions for data sources
    var srcInfo = {
      'satellite': 'Multi-spectral and high-resolution optical imagery for alteration mapping and lithological discrimination',
      'radar': 'Synthetic aperture radar for all-weather structural analysis and surface deformation monitoring',
      'geophysical': 'Magnetics, gravity, and radiometrics for subsurface structural and compositional interpretation',
      'geochemical': 'Soil and stream sediment analysis for pathfinder element anomalies',
      'fieldgeo': 'Systematic geological mapping, structural measurement, and outcrop characterisation'
    };

    // Source hover
    sources.forEach(function (s) {
      s.addEventListener('mouseenter', function () {
        var id = s.getAttribute('data-src');
        if (srcInfo[id] && tooltip) {
          tooltip.textContent = srcInfo[id];
          tooltip.classList.add('visible');
          // Position below the source
          var sr = s.getBoundingClientRect();
          var wr = wrap.getBoundingClientRect();
          tooltip.style.left = (sr.left + sr.width / 2 - wr.left) + 'px';
          tooltip.style.top = (sr.bottom - wr.top + 8) + 'px';
        }
        s.classList.add('active');
      });
      s.addEventListener('mouseleave', function () {
        if (tooltip) tooltip.classList.remove('visible');
        s.classList.remove('active');
      });
    });

    // Target click
    if (targetEl && detailPanel) {
      targetEl.addEventListener('click', function () {
        detailPanel.classList.toggle('open');
      });
    }
  }

  // ============================================================
  // MODULE 2: Interactive GIS Layer Demo
  // ============================================================
  function initGIS() {
    var wrap = qs('#gisModule');
    if (!wrap) return;

    var canvas = qs('canvas', wrap);
    var ctx = canvas.getContext('2d');
    var cursorInfo = qs('.gis-cursor-info', wrap);
    var autoBtn = qs('.gis-auto-btn', wrap);
    var layerEls = qsa('.gis-layer', wrap);
    var legendEl = qs('.gis-legend', wrap);

    var W = 800, H = 600;
    var dpr = window.devicePixelRatio || 1;

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = Math.round(rect.width);
      H = Math.round(rect.height);
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Perlin-like noise (simple value noise with cubic interpolation)
    var noiseCache = {};
    function makeNoise(seed) {
      if (noiseCache[seed]) return noiseCache[seed];
      var size = 64;
      var grid = [];
      var rng = mulberry32(seed);
      for (var i = 0; i < size * size; i++) grid.push(rng());
      function sample(x, y) {
        var ix = ((x % size) + size) % size;
        var iy = ((y % size) + size) % size;
        return grid[iy * size + ix];
      }
      function lerp(a, b, t) { t = t * t * (3 - 2 * t); return a + (b - a) * t; }
      function noise(x, y) {
        var xi = Math.floor(x), yi = Math.floor(y);
        var fx = x - xi, fy = y - yi;
        var a = lerp(sample(xi, yi), sample(xi + 1, yi), fx);
        var b = lerp(sample(xi, yi + 1), sample(xi + 1, yi + 1), fx);
        return lerp(a, b, fy);
      }
      noiseCache[seed] = noise;
      return noise;
    }

    function mulberry32(a) {
      return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    // Layer definitions
    var layers = {
      satellite: { on: true, label: 'Satellite Base', color: '#8a7a5a' },
      hostrock: { on: false, label: 'Host Rock Geology', color: '#5a6e8a' },
      ironoxide: { on: false, label: 'Iron Oxide Alteration', color: '#c44' },
      carbonate: { on: false, label: 'Carbonate Anomaly', color: '#4a9' },
      structural: { on: false, label: 'Structural Lines', color: '#e0c060' },
      targets: { on: false, label: 'Exploration Targets', color: '#ff6' }
    };
    var layerOrder = ['satellite', 'hostrock', 'ironoxide', 'carbonate', 'structural', 'targets'];

    // Pre-generate noise data per layer
    var noiseSat = makeNoise(42);
    var noiseRock = makeNoise(137);
    var noiseIron = makeNoise(271);
    var noiseCarb = makeNoise(389);
    var noiseStruct = makeNoise(503);

    // Pre-render layer images for performance
    var layerImages = {};
    var needsRebuild = true;

    function buildLayerImage(name, w, h) {
      var offCanvas = document.createElement('canvas');
      offCanvas.width = w;
      offCanvas.height = h;
      var oc = offCanvas.getContext('2d');
      var step = 4; // render at lower res for speed
      var imgData = oc.createImageData(w, h);
      var d = imgData.data;

      for (var y = 0; y < h; y += step) {
        for (var x = 0; x < w; x += step) {
          var nx = x / w * 8;
          var ny = y / h * 8;
          var r = 0, g = 0, b = 0, a = 0;

          if (name === 'satellite') {
            // Arid terrain — Namibia-style brown/tan/grey Landsat natural color
            var v = noiseSat(nx * 2, ny * 2) * 0.5 + noiseSat(nx * 4, ny * 4) * 0.3 + noiseSat(nx * 8, ny * 8) * 0.2;
            var v2 = noiseSat(nx * 1.2 + 3, ny * 1.2 + 7) * 0.6 + noiseSat(nx * 3 + 5, ny * 3 + 2) * 0.4;
            // Mix between sandy tan, rocky grey, and reddish-brown
            if (v2 < 0.38) {
              // Rocky grey areas (exposed bedrock)
              r = Math.floor(95 + v * 40); g = Math.floor(88 + v * 35); b = Math.floor(78 + v * 30);
            } else if (v2 < 0.65) {
              // Sandy tan (alluvium / sand cover)
              r = Math.floor(140 + v * 50); g = Math.floor(118 + v * 40); b = Math.floor(75 + v * 30);
            } else {
              // Reddish-brown (laterite / iron-rich soil)
              r = Math.floor(120 + v * 45); g = Math.floor(85 + v * 30); b = Math.floor(55 + v * 25);
            }
            a = 255;
          } else if (name === 'hostrock') {
            var v1 = noiseRock(nx * 1.5, ny * 1.5);
            var v2 = noiseRock(nx * 3, ny * 3);
            var v = v1 * 0.7 + v2 * 0.3;
            // Three rock types — arid-appropriate
            if (v < 0.35) { r = 105; g = 95; b = 75; }       // schist / metasediment
            else if (v < 0.65) { r = 135; g = 110; b = 85; }  // granite / gneiss
            else { r = 90; g = 82; b = 95; }                   // mafic intrusive
            a = 180;
          } else if (name === 'ironoxide') {
            // Discrete 3-level classification
            var v = noiseIron(nx * 3, ny * 3) * 0.6 + noiseIron(nx * 6, ny * 6) * 0.4;
            if (v > 0.72) {
              // Level 1 — High intensity (deep red)
              r = 180; g = 30; b = 25; a = 200;
            } else if (v > 0.58) {
              // Level 2 — Medium intensity (medium red)
              r = 200; g = 80; b = 55; a = 170;
            } else if (v > 0.46) {
              // Level 3 — Low intensity (light pink)
              r = 210; g = 140; b = 120; a = 130;
            }
          } else if (name === 'carbonate') {
            // Discrete 3-level classification
            var v = noiseCarb(nx * 3.5, ny * 3.5) * 0.6 + noiseCarb(nx * 7, ny * 7) * 0.4;
            if (v > 0.74) {
              // Level 1 — Strong anomaly (deep teal)
              r = 20; g = 140; b = 115; a = 200;
            } else if (v > 0.60) {
              // Level 2 — Moderate (medium teal)
              r = 70; g = 170; b = 145; a = 160;
            } else if (v > 0.48) {
              // Level 3 — Weak (light cyan)
              r = 140; g = 200; b = 185; a = 120;
            }
          }

          // Fill step x step block
          for (var dy = 0; dy < step && y + dy < h; dy++) {
            for (var dx = 0; dx < step && x + dx < w; dx++) {
              var idx = ((y + dy) * w + (x + dx)) * 4;
              d[idx] = r; d[idx + 1] = g; d[idx + 2] = b; d[idx + 3] = a;
            }
          }
        }
      }
      oc.putImageData(imgData, 0, 0);
      return offCanvas;
    }

    // Structural lines — geologically realistic
    // polyline = array of {x,y} points; type = fault|shear|fold
    var structFeatures = [];
    (function () {
      var rng = mulberry32(777);

      // Helper: generate a polyline with slight irregularity along a bearing
      function makeFaultLine(startX, startY, bearing, length, segments, jitter) {
        var pts = [];
        var dx = Math.cos(bearing);
        var dy = Math.sin(bearing);
        var segLen = length / segments;
        var px = startX, py = startY;
        pts.push({ x: px, y: py });
        for (var i = 0; i < segments; i++) {
          px += dx * segLen + (rng() - 0.5) * jitter;
          py += dy * segLen + (rng() - 0.5) * jitter;
          pts.push({ x: px, y: py });
        }
        return pts;
      }

      // Helper: generate a curved fold arc
      function makeFoldArc(cx, cy, radius, startAngle, sweep, segments) {
        var pts = [];
        for (var i = 0; i <= segments; i++) {
          var t = i / segments;
          var angle = startAngle + sweep * t;
          pts.push({
            x: cx + Math.cos(angle) * radius * (1 + (rng() - 0.5) * 0.08),
            y: cy + Math.sin(angle) * radius * (1 + (rng() - 0.5) * 0.08)
          });
        }
        return pts;
      }

      // === MAJOR FAULTS — dominant NE-SW trend (~40-55 deg from horizontal) ===
      var neSw = Math.PI * 0.25; // ~45 deg base
      // 4 major NE-SW faults spanning much of the map
      var majorParams = [
        { sx: 0.05, sy: 0.85, bear: neSw - 0.08, len: 0.85, seg: 12 },
        { sx: 0.10, sy: 0.70, bear: neSw + 0.05, len: 0.75, seg: 10 },
        { sx: 0.20, sy: 0.95, bear: neSw - 0.12, len: 0.70, seg: 10 },
        { sx: 0.35, sy: 0.90, bear: neSw + 0.10, len: 0.60, seg: 9 }
      ];
      majorParams.forEach(function (p) {
        var pts = makeFaultLine(p.sx, p.sy, -p.bear, p.len, p.seg, 0.018);
        structFeatures.push({ pts: pts, type: 'fault', weight: 'major' });

        // Splay / branch off major fault (1-2 per fault)
        if (rng() > 0.3) {
          var branchIdx = Math.floor(pts.length * (0.3 + rng() * 0.4));
          var bp = pts[branchIdx];
          var branchBear = -p.bear + (rng() > 0.5 ? 0.3 : -0.3) + (rng() - 0.5) * 0.15;
          var branchPts = makeFaultLine(bp.x, bp.y, branchBear, 0.12 + rng() * 0.18, 5, 0.012);
          structFeatures.push({ pts: branchPts, type: 'fault', weight: 'minor' });
        }
      });

      // 2 cross-cutting NW-SE faults (conjugate set)
      var nwSe = -Math.PI * 0.25;
      structFeatures.push({
        pts: makeFaultLine(0.15, 0.10, -nwSe, 0.55, 8, 0.015),
        type: 'fault', weight: 'secondary'
      });
      structFeatures.push({
        pts: makeFaultLine(0.50, 0.05, -(nwSe + 0.1), 0.50, 7, 0.015),
        type: 'fault', weight: 'secondary'
      });

      // === SHEAR ZONES — short segments paralleling major faults ===
      for (var s = 0; s < 10; s++) {
        var shearBear = -(neSw + (rng() - 0.5) * 0.2);
        var sx = 0.1 + rng() * 0.7;
        var sy = 0.1 + rng() * 0.7;
        var shearPts = makeFaultLine(sx, sy, shearBear, 0.08 + rng() * 0.12, 4, 0.008);
        structFeatures.push({ pts: shearPts, type: 'shear', weight: 'minor' });
      }

      // === FOLD AXES — curved arcs ===
      structFeatures.push({
        pts: makeFoldArc(0.45, 0.55, 0.18, Math.PI * 0.6, Math.PI * 0.5, 16),
        type: 'fold', weight: 'major'
      });
      structFeatures.push({
        pts: makeFoldArc(0.70, 0.35, 0.14, Math.PI * 0.8, Math.PI * 0.4, 12),
        type: 'fold', weight: 'minor'
      });
      structFeatures.push({
        pts: makeFoldArc(0.25, 0.30, 0.10, Math.PI * 0.3, Math.PI * 0.55, 12),
        type: 'fold', weight: 'minor'
      });
    })();

    // Target locations — positioned at iron oxide + carbonate + structural intersections
    var targetPoints = [
      // Near major NE-SW fault / iron oxide / carbonate overlap zones
      { x: 0.38, y: 0.42, priority: 'high', label: 'T-1', size: 0.065 },
      { x: 0.55, y: 0.30, priority: 'high', label: 'T-2', size: 0.055 },
      { x: 0.28, y: 0.58, priority: 'medium', label: 'T-3', size: 0.048 },
      { x: 0.65, y: 0.48, priority: 'medium', label: 'T-4', size: 0.045 },
      { x: 0.48, y: 0.65, priority: 'medium', label: 'T-5', size: 0.042 }
    ];
    var targetAnimTime = 0;
    var targetAnimFrame = null;

    function buildAllLayers() {
      var w = W;
      var h = H;
      layerImages.satellite = buildLayerImage('satellite', w, h);
      layerImages.hostrock = buildLayerImage('hostrock', w, h);
      layerImages.ironoxide = buildLayerImage('ironoxide', w, h);
      layerImages.carbonate = buildLayerImage('carbonate', w, h);
      needsRebuild = false;
    }

    function render() {
      ctx.clearRect(0, 0, W, H);

      // Background
      ctx.fillStyle = '#060a10';
      ctx.fillRect(0, 0, W, H);

      // Draw toggled layers in order
      layerOrder.forEach(function (name) {
        if (!layers[name].on) return;

        if (name === 'structural') {
          // Draw polyline structural features
          structFeatures.forEach(function (feat) {
            var pts = feat.pts;
            if (pts.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(pts[0].x * W, pts[0].y * H);
            for (var pi = 1; pi < pts.length; pi++) {
              ctx.lineTo(pts[pi].x * W, pts[pi].y * H);
            }
            if (feat.type === 'fault') {
              ctx.strokeStyle = feat.weight === 'major' ? 'rgba(224, 192, 96, 0.8)' :
                feat.weight === 'secondary' ? 'rgba(200, 170, 90, 0.55)' : 'rgba(224, 192, 96, 0.45)';
              ctx.lineWidth = feat.weight === 'major' ? 2.5 : feat.weight === 'secondary' ? 1.8 : 1.2;
              ctx.setLineDash([]);
            } else if (feat.type === 'shear') {
              ctx.strokeStyle = 'rgba(224, 192, 96, 0.3)';
              ctx.lineWidth = 1;
              ctx.setLineDash([4, 4]);
            } else if (feat.type === 'fold') {
              ctx.strokeStyle = feat.weight === 'major' ? 'rgba(220, 180, 100, 0.6)' : 'rgba(220, 180, 100, 0.4)';
              ctx.lineWidth = feat.weight === 'major' ? 2 : 1.4;
              ctx.setLineDash([8, 4, 2, 4]); // dash-dot for fold axes
            }
            ctx.stroke();
            ctx.setLineDash([]);
          });
          return;
        }

        if (name === 'targets') {
          var pulse = Math.sin(targetAnimTime * 0.04) * 0.5 + 0.5; // 0-1 pulse
          targetPoints.forEach(function (t) {
            var cx = t.x * W, cy = t.y * H;
            var halfW = t.size * W / 2;
            var halfH = t.size * H / 2;
            var isHigh = t.priority === 'high';

            // Outer pulsing glow box
            var glowExpand = pulse * 6;
            ctx.strokeStyle = isHigh
              ? 'rgba(200, 160, 50, ' + (0.15 + pulse * 0.2) + ')'
              : 'rgba(200, 160, 50, ' + (0.1 + pulse * 0.12) + ')';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx - halfW - glowExpand, cy - halfH - glowExpand,
              halfW * 2 + glowExpand * 2, halfH * 2 + glowExpand * 2);

            // Main target frame — gold rectangle
            ctx.strokeStyle = isHigh ? 'rgba(255, 200, 50, 0.9)' : 'rgba(200, 160, 80, 0.7)';
            ctx.lineWidth = isHigh ? 2 : 1.5;
            ctx.strokeRect(cx - halfW, cy - halfH, halfW * 2, halfH * 2);

            // Corner brackets (draw L-shapes at corners)
            var bLen = 8;
            ctx.strokeStyle = isHigh ? '#ffc832' : '#c8a050';
            ctx.lineWidth = isHigh ? 2.5 : 2;
            // top-left
            ctx.beginPath(); ctx.moveTo(cx - halfW, cy - halfH + bLen); ctx.lineTo(cx - halfW, cy - halfH); ctx.lineTo(cx - halfW + bLen, cy - halfH); ctx.stroke();
            // top-right
            ctx.beginPath(); ctx.moveTo(cx + halfW - bLen, cy - halfH); ctx.lineTo(cx + halfW, cy - halfH); ctx.lineTo(cx + halfW, cy - halfH + bLen); ctx.stroke();
            // bottom-left
            ctx.beginPath(); ctx.moveTo(cx - halfW, cy + halfH - bLen); ctx.lineTo(cx - halfW, cy + halfH); ctx.lineTo(cx - halfW + bLen, cy + halfH); ctx.stroke();
            // bottom-right
            ctx.beginPath(); ctx.moveTo(cx + halfW - bLen, cy + halfH); ctx.lineTo(cx + halfW, cy + halfH); ctx.lineTo(cx + halfW, cy + halfH - bLen); ctx.stroke();

            // Center crosshair
            ctx.strokeStyle = isHigh ? 'rgba(255, 200, 50, 0.5)' : 'rgba(200, 160, 80, 0.35)';
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(cx - 5, cy); ctx.lineTo(cx + 5, cy); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, cy - 5); ctx.lineTo(cx, cy + 5); ctx.stroke();

            // Label
            ctx.font = '600 10px "DM Sans", sans-serif';
            ctx.fillStyle = isHigh ? '#ffc832' : '#c8a050';
            ctx.textAlign = 'center';
            ctx.fillText(t.label, cx, cy - halfH - 8);

            // Priority badge
            ctx.font = '600 8px "DM Sans", sans-serif';
            ctx.fillStyle = isHigh ? 'rgba(255, 200, 50, 0.6)' : 'rgba(200, 160, 80, 0.5)';
            ctx.fillText(isHigh ? 'HIGH' : 'MED', cx, cy + halfH + 14);
          });
          return;
        }

        // Raster layers
        if (layerImages[name]) {
          ctx.drawImage(layerImages[name], 0, 0, W, H);
        }
      });

      // Grid overlay
      ctx.strokeStyle = 'rgba(200, 160, 80, 0.04)';
      ctx.lineWidth = 0.5;
      var step = 40;
      for (var x = 0; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (var y = 0; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    // Target pulse animation loop
    function startTargetAnim() {
      if (targetAnimFrame) return;
      function tick() {
        targetAnimTime++;
        render();
        targetAnimFrame = requestAnimationFrame(tick);
      }
      tick();
    }
    function stopTargetAnim() {
      if (targetAnimFrame) {
        cancelAnimationFrame(targetAnimFrame);
        targetAnimFrame = null;
      }
    }

    // Toggle layers
    layerEls.forEach(function (el) {
      el.addEventListener('click', function () {
        var name = el.getAttribute('data-layer');
        layers[name].on = !layers[name].on;
        el.classList.toggle('on', layers[name].on);
        if (needsRebuild) buildAllLayers();
        render();
        updateLegend();
        // Start/stop target animation
        if (name === 'targets') {
          if (layers.targets.on) startTargetAnim();
          else stopTargetAnim();
        }
      });
    });

    function updateLegend() {
      if (!legendEl) return;
      var html = '';
      var swatch = 'display:inline-block;width:14px;height:10px;border-radius:2px;';
      var lbl = 'font-family:DM Sans,sans-serif;font-size:10px;color:#7a8fa0;';
      var row = 'display:flex;align-items:center;gap:6px;margin-bottom:3px;';

      if (layers.ironoxide.on) {
        html += '<div class="gis-legend-title">Iron Oxide Alteration</div>';
        html += '<div style="' + row + '"><span style="' + swatch + 'background:rgb(180,30,25)"></span><span style="' + lbl + '">High</span></div>';
        html += '<div style="' + row + '"><span style="' + swatch + 'background:rgb(200,80,55)"></span><span style="' + lbl + '">Medium</span></div>';
        html += '<div style="' + row + '"><span style="' + swatch + 'background:rgb(210,140,120)"></span><span style="' + lbl + '">Low</span></div>';
      }
      if (layers.carbonate.on) {
        html += '<div class="gis-legend-title" style="margin-top:10px">Carbonate Anomaly</div>';
        html += '<div style="' + row + '"><span style="' + swatch + 'background:rgb(20,140,115)"></span><span style="' + lbl + '">Strong</span></div>';
        html += '<div style="' + row + '"><span style="' + swatch + 'background:rgb(70,170,145)"></span><span style="' + lbl + '">Moderate</span></div>';
        html += '<div style="' + row + '"><span style="' + swatch + 'background:rgb(140,200,185)"></span><span style="' + lbl + '">Weak</span></div>';
      }
      if (layers.structural.on) {
        html += '<div class="gis-legend-title" style="margin-top:10px">Structural Features</div>';
        html += '<div style="' + row + '"><span style="display:inline-block;width:16px;height:2px;background:#e0c060"></span><span style="' + lbl + '">Fault</span></div>';
        html += '<div style="' + row + '"><span style="display:inline-block;width:16px;height:1px;border-top:1px dashed #e0c060"></span><span style="' + lbl + '">Shear zone</span></div>';
        html += '<div style="' + row + '"><span style="display:inline-block;width:16px;height:1.5px;border-top:2px dotted #dab464"></span><span style="' + lbl + '">Fold axis</span></div>';
      }
      if (layers.targets.on) {
        html += '<div class="gis-legend-title" style="margin-top:10px">Exploration Targets</div>';
        html += '<div style="' + row + '"><span style="display:inline-block;width:12px;height:12px;border:2px solid #ffc832"></span><span style="' + lbl + '">High priority</span></div>';
        html += '<div style="' + row + '"><span style="display:inline-block;width:12px;height:12px;border:1.5px solid #c8a050"></span><span style="' + lbl + '">Medium priority</span></div>';
      }
      legendEl.innerHTML = html;
    }

    // Cursor tracking
    canvas.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      var mx = e.clientX - rect.left;
      var my = e.clientY - rect.top;
      // Simulated coordinates (West Africa region)
      var lng = (-8.5 + (mx / W) * 6).toFixed(3);
      var lat = (12.5 - (my / H) * 5).toFixed(3);
      cursorInfo.textContent = lat + '\u00b0N, ' + lng + '\u00b0W  (simulated)';
    });

    canvas.addEventListener('mouseleave', function () {
      cursorInfo.textContent = 'Coordinates are simulated for demonstration';
    });

    // Auto-demo
    var autoTimer = null;
    autoBtn.addEventListener('click', function () {
      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
        autoBtn.classList.remove('running');
        autoBtn.textContent = '\u25B6  Auto Demo';
        return;
      }
      autoBtn.classList.add('running');
      autoBtn.textContent = '\u25A0  Stop Demo';

      // Reset all
      stopTargetAnim();
      layerOrder.forEach(function (name) { layers[name].on = false; });
      layerEls.forEach(function (el) { el.classList.remove('on'); });
      render();

      var idx = 0;
      function step() {
        if (idx >= layerOrder.length) {
          autoTimer = setTimeout(function () {
            // Reset and stop
            stopTargetAnim();
            autoBtn.classList.remove('running');
            autoBtn.textContent = '\u25B6  Auto Demo';
            autoTimer = null;
          }, 3000);
          return;
        }
        var name = layerOrder[idx];
        layers[name].on = true;
        var el = qs('[data-layer="' + name + '"]', wrap);
        if (el) el.classList.add('on');
        if (needsRebuild) buildAllLayers();
        if (name === 'targets') startTargetAnim();
        else render();
        updateLegend();
        idx++;
        autoTimer = setTimeout(step, 1500);
      }
      step();
    });

    // Init — delay to ensure layout is complete
    function doInit() {
      resize();
      if (W < 10 || H < 10) {
        // Layout not ready, retry
        requestAnimationFrame(doInit);
        return;
      }
      buildAllLayers();
      // Turn on satellite by default
      layers.satellite.on = true;
      var satEl = qs('[data-layer="satellite"]', wrap);
      if (satEl) satEl.classList.add('on');
      render();
      updateLegend();
    }
    requestAnimationFrame(doInit);

    window.addEventListener('resize', function () {
      resize();
      if (W < 10 || H < 10) return;
      needsRebuild = true;
      buildAllLayers();
      render();
    });
  }

  // ============================================================
  // MODULE 3: Satellite Data Sources
  // ============================================================
  function initSatellites() {
    var wrap = qs('#satModule');
    if (!wrap) return;

    var cards = qsa('.sat-card', wrap);
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var wasExpanded = card.classList.contains('expanded');
        // Close all others
        cards.forEach(function (c) { c.classList.remove('expanded'); });
        if (!wasExpanded) card.classList.add('expanded');
      });
    });
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    initWorkflow();
    initGIS();
    initSatellites();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
