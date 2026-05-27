(function () {
  const TRACK_ID = "track-path";
  const ZONES = [
    { t: 0.00, label: "There's no problem here" },
    { t: 0.11, label: "There's a few bumps, but we're good" },
    { t: 0.22, label: "We are heading for hard times but there's still time to get back on track" },
    { t: 0.33, label: "A couple more \"once in a lifetime events\" and we're screwed" },
    { t: 0.44, label: "There's nowhere to go but down, we're not prepared for the fallout" },
    { t: 0.55, label: "Hold on for your life! Time to make a plan" },
    { t: 0.66, label: "It's too late for plans, we're in for a world of hurt" },
    { t: 0.77, label: "My life has already been turned upside down" },
    { t: 0.88, label: "End times feels near" },
    { t: 1.00, label: "Nowhere to go but up" },
  ];

  window.TRACK_ZONES = ZONES;

  function getPointAtT(path, t) {
    const len = path.getTotalLength();
    const pos = t * len;
    const pt  = path.getPointAtLength(pos);
    const delta = 2;
    const p1 = path.getPointAtLength(Math.max(0, pos - delta));
    const p2 = path.getPointAtLength(Math.min(len, pos + delta));
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
    return { x: pt.x, y: pt.y, angle };
  }
  window.getPointAtT = getPointAtT;

  function findNearestT(path, clickX, clickY) {
    const len = path.getTotalLength();
    const STEPS = 400;
    let bestT = 0, bestDist = Infinity;
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const pt = path.getPointAtLength(t * len);
      const dx = pt.x - clickX;
      const dy = pt.y - clickY;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) { bestDist = dist; bestT = t; }
    }
    return { t: bestT, dist: Math.sqrt(bestDist) };
  }
  window.findNearestT = findNearestT;

  function getLabelForT(t) {
    let best = ZONES[0];
    for (let i = ZONES.length - 1; i >= 0; i--) {
      if (t >= ZONES[i].t) { best = ZONES[i]; break; }
    }
    return best.label;
  }
  window.getLabelForT = getLabelForT;

  function drawZoneMarkers(svgEl) {
    const path  = svgEl.getElementById(TRACK_ID);
    const layer = svgEl.getElementById("zone-labels");
    if (!path || !layer) return;

    ZONES.forEach((zone, i) => {
      const pt = getPointAtT(path, zone.t);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", pt.x);
      line.setAttribute("y1", pt.y - 14);
      line.setAttribute("x2", pt.x);
      line.setAttribute("y2", pt.y - 4);
      line.setAttribute("stroke", "rgba(201,164,86,0.5)");
      line.setAttribute("stroke-width", "1.5");
      layer.appendChild(line);

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y - 20);
      circle.setAttribute("r", "7");
      circle.setAttribute("fill", i === 4 ? "#CC0000" : "rgba(0,0,0,0.7)");
      circle.setAttribute("stroke", "rgba(201,164,86,0.6)");
      circle.setAttribute("stroke-width", "1");
      layer.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", pt.x);
      text.setAttribute("y", pt.y - 16);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("font-size", "8");
      text.setAttribute("fill", "#FFD700");
      text.setAttribute("font-weight", "bold");
      text.textContent = i + 1;
      layer.appendChild(text);
    });
  }
  window.drawZoneMarkers = drawZoneMarkers;

  function placeCarAtT(svgEl, t) {
    const path = svgEl.getElementById(TRACK_ID);
    const car  = svgEl.getElementById("coaster-car");
    if (!path || !car) return;
    const pt = getPointAtT(path, t);
    car.setAttribute("transform",
      `translate(${pt.x}, ${pt.y - 16}) rotate(${pt.angle}, 0, 16)`
    );
    car.style.display = "block";
  }
  window.placeCarAtT = placeCarAtT;

  document.addEventListener("DOMContentLoaded", () => {
    const svg = document.getElementById("coaster-svg");
    if (svg) drawZoneMarkers(svg);
  });
})();
