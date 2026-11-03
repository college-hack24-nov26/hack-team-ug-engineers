(() => {
  const LIMIT = 4;
  const BASE_SHELF_LIFE = 31.8;
  const BASELINE = [3.4, 3.5, 3.3, 3.6, 3.7, 3.4, 3.5, 3.6, 3.8, 3.5, 3.4, 3.7, 3.6, 3.5, 3.8, 3.6, 3.4, 3.7, 3.8, 3.6];
  let readings = [...BASELINE];
  let currentTemp = 3.6;
  let previousTemp = 3.8;
  let spikeActive = false;
  let streamRunning = true;
  let zoom = 1;
  let toastTimer;

  const $ = (id) => document.getElementById(id);
  const temperatureChart = $('temperature-chart');

  function formatClock(date = new Date()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  function showToast(message) {
    $('toast-message').textContent = message;
    $('toast').classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => $('toast').classList.remove('show'), 2600);
  }

  function setTemperature(next, isSpike = false) {
    previousTemp = currentTemp;
    currentTemp = Number(next.toFixed(1));
    spikeActive = isSpike;
    readings.push(currentTemp);
    if (readings.length > 20) readings.shift();
    updateDashboard();
  }

  function temperatureY(value) {
    const top = 29;
    const bottom = 209;
    return bottom - (Math.max(0, Math.min(8, value)) / 8) * (bottom - top);
  }

  function drawChart() {
    const left = 42;
    const right = 506;
    const top = 29;
    const bottom = 209;
    const points = readings.map((value, index) => ({
      x: left + (index / (readings.length - 1)) * (right - left),
      y: temperatureY(value),
      value
    }));
    const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ');
    const area = `${path} L ${right} ${bottom} L ${left} ${bottom} Z`;
    const line = $('chart-line');
    const fill = $('chart-area');
    const marker = $('chart-point');
    line.setAttribute('d', path);
    fill.setAttribute('d', area);
    const last = points[points.length - 1];
    marker.setAttribute('cx', last.x.toFixed(1));
    marker.setAttribute('cy', last.y.toFixed(1));

    const excursion = currentTemp > LIMIT;
    line.classList.toggle('chart-warning', excursion && currentTemp < 6);
    line.classList.toggle('chart-critical', currentTemp >= 6);
    fill.classList.toggle('chart-critical-area', currentTemp >= 6);
    marker.classList.toggle('chart-point-warning', excursion && currentTemp < 6);
    marker.classList.toggle('chart-point-critical', currentTemp >= 6);
    $('threshold-line').setAttribute('y1', temperatureY(LIMIT));
    $('threshold-line').setAttribute('y2', temperatureY(LIMIT));
    temperatureChart.setAttribute('aria-label', `Simulated cargo temperature is ${currentTemp.toFixed(1)} degrees Celsius. The monitoring threshold is 4 degrees Celsius.`);
  }

  function setRiskStatus(isHigh) {
    const status = $('shipment-status');
    status.className = `status-pill ${isHigh ? (currentTemp >= 6 ? 'status-critical' : 'status-watch') : 'status-safe'}`;
    status.innerHTML = isHigh
      ? `<span></span> ${currentTemp >= 6 ? 'EXCURSION' : 'ON WATCH'}`
      : '<span></span> ON ROUTE';
  }

  function updateDashboard() {
    const excursion = currentTemp > LIMIT;
    const tempElement = $('current-temp');
    tempElement.innerHTML = `${currentTemp.toFixed(1)}<span>°C</span>`;
    tempElement.classList.toggle('temp-warning', excursion && currentTemp < 6);
    tempElement.classList.toggle('temp-critical', currentTemp >= 6);

    const delta = Number((currentTemp - previousTemp).toFixed(1));
    const deltaText = `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta).toFixed(1)}°`;
    $('temp-change').textContent = deltaText;
    $('temp-change').classList.toggle('positive', delta > 0.05);
    $('last-updated').textContent = `Updated ${formatClock()}`;

    const alertPanel = $('chart-alert');
    alertPanel.hidden = !excursion;
    $('chart-alert-copy').textContent = `${(currentTemp - LIMIT).toFixed(1)}°C above the 4°C monitoring threshold · Demo event`;

    const shelfLife = excursion
      ? Math.max(4, BASE_SHELF_LIFE - ((currentTemp - LIMIT) * (spikeActive ? 2.25 : 1.35))).toFixed(1)
      : BASE_SHELF_LIFE.toFixed(1);
    $('shelf-life').textContent = shelfLife;
    const shelfPercent = Math.max(10, Math.min(90, (Number(shelfLife) / 39) * 100));
    $('shelf-meter-fill').style.width = `${shelfPercent}%`;
    $('meter-marker').style.left = `${shelfPercent}%`;
    $('shelf-meter-fill').style.background = excursion ? '#bd7653' : '#77906a';
    $('shelf-life').style.color = excursion ? '#a8583e' : '#31533a';
    $('shelf-note').textContent = excursion
      ? 'Illustrative model adjusted for this simulated excursion'
      : 'Based on current simulated temperature profile';

    const actionCard = document.querySelector('.action-panel');
    actionCard.classList.toggle('action-attention', excursion);
    $('action-title').textContent = excursion ? 'Check refrigeration now' : 'Conditions look steady';
    $('action-copy').textContent = excursion
      ? 'Contact the driver to verify the cooling unit and prioritize this delivery for a quality check on arrival.'
      : 'Keep the shipment on its planned route. Continue monitoring the cargo sensor.';
    $('action-icon').textContent = excursion ? '!' : '✓';
    $('action-icon').classList.toggle('action-icon-alert', excursion);
    $('action-priority').innerHTML = excursion
      ? '<i></i> ATTENTION REQUIRED'
      : '<i></i> ROUTINE';
    $('action-priority').classList.toggle('priority-alert', excursion);
    $('action-button').innerHTML = excursion ? 'Flag for quality check <span>→</span>' : 'Acknowledge <span>→</span>';

    $('within-range-count').innerHTML = excursion ? '02 <span class="metric-denom">/ 04</span>' : '03 <span class="metric-denom">/ 04</span>';
    $('range-progress').style.width = excursion ? '50%' : '75%';
    $('attention-count').textContent = excursion ? '02' : '01';
    $('attention-caption').textContent = excursion ? '1 excursion · 1 on watch' : '1 shipment on watch';
    $('attention-state-text').textContent = excursion ? 'Active temperature excursion' : 'Monitoring excursion';
    $('average-temp').innerHTML = `${excursion ? '4.2' : '3.4'}<span class="unit-small">°C</span>`;
    $('location-copy').textContent = excursion ? 'Stop 2 · simulated' : 'En route · simulated';
    setRiskStatus(excursion);
    drawChart();

    $('spike-event').hidden = !excursion;
    if (excursion) $('spike-time').textContent = formatClock();
    $('spike-button').innerHTML = excursion
      ? '<span class="button-spark">↺</span> Reset to normal'
      : '<span class="button-spark">✳</span> Trigger temperature spike';
    $('feed-status').textContent = streamRunning ? 'LIVE SIMULATION' : 'STREAM PAUSED';
  }

  $('spike-button').addEventListener('click', () => {
    if (spikeActive) {
      readings = [...BASELINE];
      previousTemp = currentTemp;
      currentTemp = 3.6;
      spikeActive = false;
      updateDashboard();
      showToast('Simulation reset · shipment back in range');
    } else {
      setTemperature(6.8, true);
      showToast('Demo excursion triggered · alert threshold crossed');
    }
  });

  $('stream-toggle').addEventListener('click', (event) => {
    streamRunning = !streamRunning;
    event.currentTarget.textContent = streamRunning ? 'Pause stream' : 'Resume stream';
    $('feed-status').textContent = streamRunning ? 'LIVE SIMULATION' : 'STREAM PAUSED';
    showToast(streamRunning ? 'Simulated telemetry resumed' : 'Simulated telemetry paused');
  });

  const routeSvg = $('route-map');
  $('zoom-in').addEventListener('click', () => {
    zoom = Math.min(1.55, zoom + 0.12);
    routeSvg.style.transform = `scale(${zoom})`;
  });
  $('zoom-out').addEventListener('click', () => {
    zoom = Math.max(.84, zoom - .12);
    routeSvg.style.transform = `scale(${zoom})`;
  });
  $('recenter').addEventListener('click', () => {
    zoom = 1;
    routeSvg.style.transform = 'scale(1)';
    $('map-canvas').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    showToast('Map recentered on simulated truck');
  });

  const truckMarker = $('truck-marker');
  const mapPopover = $('map-popover');
  const togglePopover = () => {
    mapPopover.setAttribute('opacity', mapPopover.getAttribute('opacity') === '1' ? '0' : '1');
  };
  truckMarker.addEventListener('click', togglePopover);
  truckMarker.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      togglePopover();
    }
  });

  $('route-details').addEventListener('click', () => {
    document.querySelector('.map-panel').classList.toggle('route-highlight');
    showToast('Route: Govind Milk Plant → Regional Distributor');
    window.setTimeout(() => document.querySelector('.map-panel').classList.remove('route-highlight'), 1800);
  });
  $('action-button').addEventListener('click', () => showToast(spikeActive ? 'Quality check flagged for this simulated shipment' : 'Shipment monitoring acknowledged'));
  $('view-events').addEventListener('click', () => showToast('Showing the latest simulated route events'));

  $('today-date').textContent = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }).format(new Date()).toUpperCase();
  drawChart();
  updateDashboard();

  window.setInterval(() => {
    if (!streamRunning) return;
    if (spikeActive) {
      setTemperature(6.6 + Math.random() * .4, true);
    } else {
      const next = 3.3 + Math.random() * .6;
      setTemperature(next, false);
    }
  }, 15000);
})();
