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
  // MODULE 1: Remote Sensing Workflow
  // ============================================================
  function initWorkflow() {
    var wrap = qs('#workflowModule');
    if (!wrap) return;

    var nodes = qsa('.workflow-node', wrap);
    var infoTitle = qs('.workflow-info .info-title', wrap);
    var infoText = qs('.workflow-info .info-text', wrap);
    var svgEl = qs('.workflow-svg', wrap);
    var activeNode = null;

    // Node data
    var nodeInfo = {
      'multispectral': {
        title: 'Multi-Spectral Imagery (Landsat-8 / Sentinel-2)',
        text: 'Multi-spectral satellites capture reflected light across visible and infrared bands. Band ratios (e.g., SWIR/NIR) highlight iron oxide and hydroxyl alteration zones — key indicators of hydrothermal mineralisation systems.'
      },
      'hyperspectral': {
        title: 'Hyperspectral Sensors (ASTER / WorldView-2)',
        text: 'Hyperspectral imaging provides dozens of narrow spectral bands enabling precise mineral identification. SWIR and TIR data can distinguish between kaolinite, illite, alunite, and chlorite — critical for mapping alteration assemblages.'
      },
      'sar': {
        title: 'Synthetic Aperture Radar (Sentinel-1)',
        text: 'SAR penetrates cloud cover and vegetation, revealing surface roughness and structural lineaments. InSAR time-series detect subtle ground deformation patterns associated with deep-seated geological structures.'
      },
      'dem': {
        title: 'Digital Elevation Models (SRTM / LiDAR)',
        text: 'High-resolution DEM data enables terrain analysis, drainage pattern extraction, and identification of structural controls on mineralisation — ridgelines, fault scarps, and basin morphology.'
      },
      'pca': {
        title: 'Principal Component Analysis (PCA)',
        text: 'PCA reduces dimensionality of multi-band datasets to extract the most statistically significant spectral features. Directed PCA (Crosta technique) isolates specific alteration signatures from background noise.'
      },
      'bandratio': {
        title: 'Band Ratio & Index Mapping',
        text: 'Ratios like (Band 6/Band 7) for iron oxide and (Band 5/Band 6) for clay minerals normalise illumination effects and enhance subtle alteration signatures across large tenements.'
      },
      'ml': {
        title: 'Machine Learning Classification',
        text: 'Random Forest and gradient-boosted models trained on known deposit signatures classify prospectivity across unmapped terrain. Ensemble methods integrate geological, geochemical, and remote sensing layers.'
      },
      'structural': {
        title: 'Structural Lineament Extraction',
        text: 'Automated edge-detection and directional filtering applied to hillshaded DEM and SAR data extract fault traces, shear zone boundaries, and fold axes controlling fluid flow and ore deposition.'
      },
      'alteration': {
        title: 'Alteration Zone Mapping',
        text: 'Multi-source spectral data reveals zones of iron oxide (gossan), argillic, phyllic, and propylitic alteration — each diagnostic of different parts of a hydrothermal mineralisation system.'
      },
      'anomaly': {
        title: 'Geochemical Anomaly Correlation',
        text: 'Remote sensing outputs are validated against stream-sediment and soil-sample geochemistry. Spatial coincidence of spectral anomalies with elevated Au, Cu, As, or Sb confirms prospective target zones.'
      },
      'prospectivity': {
        title: 'Prospectivity Model Integration',
        text: 'All layers — spectral, structural, geochemical, geological — are combined into a weighted spatial model that ranks exploration targets by probability of hosting economic mineralisation.'
      },
      'drillready': {
        title: 'Drill-Ready Target Delineation',
        text: 'The highest-ranked targets undergo field validation (mapping, channel sampling, trenching) before drill-pad siting. This systematic funnel reduces exploration risk and accelerates discovery timelines.'
      }
    };

    // Column assignments for connections
    var connections = [
      ['multispectral', 'pca'], ['multispectral', 'bandratio'],
      ['hyperspectral', 'pca'], ['hyperspectral', 'bandratio'],
      ['sar', 'structural'], ['sar', 'ml'],
      ['dem', 'structural'], ['dem', 'ml'],
      ['pca', 'alteration'], ['bandratio', 'alteration'],
      ['ml', 'prospectivity'], ['ml', 'anomaly'],
      ['structural', 'prospectivity'], ['structural', 'anomaly'],
      ['alteration', 'anomaly'], ['alteration', 'prospectivity'],
      ['anomaly', 'drillready'], ['prospectivity', 'drillready']
    ];

    function getNodeCenter(el) {
      var r = el.getBoundingClientRect();
      var wr = wrap.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - wr.left,
        y: r.top + r.height / 2 - wr.top
      };
    }

    function drawConnections(activeId) {
      if (!svgEl) return;
      var wr = wrap.getBoundingClientRect();
      svgEl.setAttribute('viewBox', '0 0 ' + wr.width + ' ' + wr.height);
      svgEl.style.width = wr.width + 'px';
      svgEl.style.height = wr.height + 'px';

      var html = '';
      connections.forEach(function (c) {
        var fromEl = qs('[data-node="' + c[0] + '"]', wrap);
        var toEl = qs('[data-node="' + c[1] + '"]', wrap);
        if (!fromEl || !toEl) return;
        var from = getNodeCenter(fromEl);
        var to = getNodeCenter(toEl);
        var isActive = activeId && (c[0] === activeId || c[1] === activeId);
        var mx = (from.x + to.x) / 2;
        var d = 'M' + from.x + ',' + from.y + ' C' + mx + ',' + from.y + ' ' + mx + ',' + to.y + ' ' + to.x + ',' + to.y;
        html += '<path d="' + d + '" class="' + (isActive ? 'active' : '') + '"/>';
      });
      svgEl.innerHTML = html;
    }

    function activateNode(id) {
      nodes.forEach(function (n) {
        n.classList.toggle('active', n.getAttribute('data-node') === id);
      });
      if (nodeInfo[id]) {
        infoTitle.textContent = nodeInfo[id].title;
        infoText.textContent = nodeInfo[id].text;
      }
      drawConnections(id);
      activeNode = id;
    }

    nodes.forEach(function (n) {
      n.addEventListener('click', function () {
        var id = n.getAttribute('data-node');
        activateNode(id === activeNode ? null : id);
        if (id === activeNode) {
          // deactivate
          nodes.forEach(function (nd) { nd.classList.remove('active'); });
          infoTitle.textContent = '';
          infoText.innerHTML = '<span class="info-hint">Click any node to explore the workflow</span>';
          drawConnections(null);
          activeNode = null;
        }
      });
    });

    // Initial
    drawConnections(null);
    infoText.innerHTML = '<span class="info-hint">Click any node to explore the workflow</span>';

    window.addEventListener('resize', function () { drawConnections(activeNode); });
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
      satellite: { on: true, label: 'Satellite Base', color: '#2a3a2a' },
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
            var v = noiseSat(nx * 2, ny * 2) * 0.5 + noiseSat(nx * 4, ny * 4) * 0.3 + noiseSat(nx * 8, ny * 8) * 0.2;
            r = Math.floor(25 + v * 50);
            g = Math.floor(40 + v * 55);
            b = Math.floor(20 + v * 40);
            a = 255;
          } else if (name === 'hostrock') {
            var v1 = noiseRock(nx * 1.5, ny * 1.5);
            var v2 = noiseRock(nx * 3, ny * 3);
            var v = v1 * 0.7 + v2 * 0.3;
            // Three rock types
            if (v < 0.35) { r = 70; g = 90; b = 60; }       // greenstone
            else if (v < 0.65) { r = 110; g = 95; b = 70; }  // granite
            else { r = 80; g = 75; b = 90; }                  // metasediment
            a = 180;
          } else if (name === 'ironoxide') {
            var v = noiseIron(nx * 3, ny * 3) * 0.6 + noiseIron(nx * 6, ny * 6) * 0.4;
            if (v > 0.48) {
              var intensity = (v - 0.48) / 0.52;
              r = 200; g = 50; b = 30;
              a = Math.floor(intensity * 200);
            }
          } else if (name === 'carbonate') {
            var v = noiseCarb(nx * 3.5, ny * 3.5) * 0.6 + noiseCarb(nx * 7, ny * 7) * 0.4;
            if (v > 0.5) {
              var intensity = (v - 0.5) / 0.5;
              r = 50; g = 180; b = 140;
              a = Math.floor(intensity * 180);
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

    // Structural lines — pre-generate line segments
    var structLines = [];
    (function () {
      var rng = mulberry32(777);
      // Major faults (NE-SW and NW-SE trending)
      for (var i = 0; i < 8; i++) {
        var angle = (rng() * 0.8 + 0.3) * (rng() > 0.5 ? 1 : -1); // ~20-60 deg
        var cx = rng();
        var cy = rng();
        var len = 0.2 + rng() * 0.4;
        structLines.push({
          x1: cx - Math.cos(angle) * len / 2,
          y1: cy - Math.sin(angle) * len / 2,
          x2: cx + Math.cos(angle) * len / 2,
          y2: cy + Math.sin(angle) * len / 2,
          type: 'fault'
        });
      }
      // Shear zones (shorter, denser)
      for (var j = 0; j < 15; j++) {
        var angle2 = rng() * Math.PI;
        var cx2 = rng();
        var cy2 = rng();
        var len2 = 0.05 + rng() * 0.15;
        structLines.push({
          x1: cx2 - Math.cos(angle2) * len2 / 2,
          y1: cy2 - Math.sin(angle2) * len2 / 2,
          x2: cx2 + Math.cos(angle2) * len2 / 2,
          y2: cy2 + Math.sin(angle2) * len2 / 2,
          type: 'shear'
        });
      }
    })();

    // Target locations — intersections of structural + anomaly
    var targetPoints = [];
    (function () {
      var rng = mulberry32(999);
      // Generate at structural-anomaly coincidences
      for (var i = 0; i < 5; i++) {
        targetPoints.push({
          x: 0.15 + rng() * 0.7,
          y: 0.15 + rng() * 0.7,
          priority: i < 2 ? 'high' : 'medium',
          label: 'T-' + (i + 1)
        });
      }
    })();

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
          // Draw structural lines
          structLines.forEach(function (line) {
            ctx.beginPath();
            ctx.moveTo(line.x1 * W, line.y1 * H);
            ctx.lineTo(line.x2 * W, line.y2 * H);
            ctx.strokeStyle = line.type === 'fault' ? 'rgba(224, 192, 96, 0.7)' : 'rgba(224, 192, 96, 0.35)';
            ctx.lineWidth = line.type === 'fault' ? 2 : 1;
            if (line.type === 'shear') ctx.setLineDash([4, 4]);
            else ctx.setLineDash([]);
            ctx.stroke();
            ctx.setLineDash([]);
          });
          return;
        }

        if (name === 'targets') {
          targetPoints.forEach(function (t) {
            var x = t.x * W, y = t.y * H;
            var isHigh = t.priority === 'high';
            // Pulse ring
            ctx.beginPath();
            ctx.arc(x, y, isHigh ? 18 : 14, 0, Math.PI * 2);
            ctx.strokeStyle = isHigh ? 'rgba(255, 200, 50, 0.5)' : 'rgba(255, 200, 50, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Center dot
            ctx.beginPath();
            ctx.arc(x, y, isHigh ? 6 : 4, 0, Math.PI * 2);
            ctx.fillStyle = isHigh ? '#ffc832' : '#c8a050';
            ctx.fill();
            // Label
            ctx.font = '600 11px "DM Sans", sans-serif';
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText(t.label, x, y - (isHigh ? 24 : 20));
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

    // Toggle layers
    layerEls.forEach(function (el) {
      el.addEventListener('click', function () {
        var name = el.getAttribute('data-layer');
        layers[name].on = !layers[name].on;
        el.classList.toggle('on', layers[name].on);
        if (needsRebuild) buildAllLayers();
        render();
        updateLegend();
      });
    });

    function updateLegend() {
      if (!legendEl) return;
      var html = '';
      if (layers.ironoxide.on) {
        html += '<div class="gis-legend-title">Iron Oxide Intensity</div>';
        html += '<div class="gis-legend-bar" style="background:linear-gradient(90deg, transparent, #c44)"></div>';
        html += '<div class="gis-legend-labels"><span>Low</span><span>High</span></div>';
      }
      if (layers.carbonate.on) {
        html += '<div class="gis-legend-title" style="margin-top:10px">Carbonate Anomaly</div>';
        html += '<div class="gis-legend-bar" style="background:linear-gradient(90deg, transparent, #4a9)"></div>';
        html += '<div class="gis-legend-labels"><span>Low</span><span>High</span></div>';
      }
      if (layers.targets.on) {
        html += '<div class="gis-legend-title" style="margin-top:10px">Target Priority</div>';
        html += '<div style="display:flex;gap:12px;margin-top:4px">';
        html += '<div style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#ffc832;display:inline-block"></span><span style="font-family:DM Sans,sans-serif;font-size:10px;color:#7a8fa0">High</span></div>';
        html += '<div style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#c8a050;display:inline-block"></span><span style="font-family:DM Sans,sans-serif;font-size:10px;color:#7a8fa0">Medium</span></div>';
        html += '</div>';
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
      cursorInfo.textContent = lat + '\u00b0N, ' + lng + '\u00b0W';
    });

    canvas.addEventListener('mouseleave', function () {
      cursorInfo.textContent = 'Hover to see coordinates';
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
      layerOrder.forEach(function (name) { layers[name].on = false; });
      layerEls.forEach(function (el) { el.classList.remove('on'); });
      render();

      var idx = 0;
      function step() {
        if (idx >= layerOrder.length) {
          autoTimer = setTimeout(function () {
            // Reset and stop
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
        render();
        updateLegend();
        idx++;
        autoTimer = setTimeout(step, 1500);
      }
      step();
    });

    // Init
    resize();
    buildAllLayers();
    // Turn on satellite by default
    layers.satellite.on = true;
    var satEl = qs('[data-layer="satellite"]', wrap);
    if (satEl) satEl.classList.add('on');
    render();
    updateLegend();

    window.addEventListener('resize', function () {
      resize();
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
