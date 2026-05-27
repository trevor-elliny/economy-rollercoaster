(function () {
  const svg       = document.getElementById("results-svg");
  const heatLayer = document.getElementById("heat-map-layer");

  // Draw zone markers on results track
  document.addEventListener("DOMContentLoaded", () => {
    if (svg) drawZoneMarkers(svg);
  });

  // Listen for Firebase votes
  window.addEventListener("votes-updated", (evt) => {
    const data = evt.detail;
    renderHeatMap(data);
    renderZoneBreakdown(data);
    updateHeroCount(Object.keys(data).length);
  });

  function updateHeroCount(n) {
    const el = document.getElementById("hero-vote-count");
    if (el) el.textContent = n.toLocaleString();
  }

  function renderHeatMap(data) {
    if (!heatLayer || !svg) return;
    heatLayer.innerHTML = "";

    const path = svg.getElementById("track-path");
    if (!path) return;

    const votes = Object.values(data);
    if (votes.length === 0) return;

    const BINS = 100;
    const bins = new Array(BINS).fill(0);
    votes.forEach(v => {
      const bin = Math.min(BINS - 1, Math.floor(v.t * BINS));
      bins[bin]++;
    });

    const maxBin = Math.max(...bins, 1);

    bins.forEach((count, i) => {
      if (count === 0) return;
      const t         = (i + 0.5) / BINS;
      const pt        = getPointAtT(path, t);
      const intensity = count / maxBin;
      const radius    = 2 + intensity * 7;
      const opacity   = 0.3 + intensity * 0.65;
      const r = Math.round(255 * Math.min(1, intensity * 2));
      const g = Math.round(255 * Math.max(0, 1 - Math.abs(intensity - 0.5) * 2));
      const b = Math.round(255 * Math.max(0, 1 - intensity * 2));

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pt.x);
      circle.setAttribute("cy", pt.y);
      circle.setAttribute("r", radius);
      circle.setAttribute("fill", `rgb(${r},${g},${b})`);
      circle.setAttribute("opacity", opacity);
      circle.setAttribute("filter", "url(#glow)");
      heatLayer.appendChild(circle);
    });
  }

  function renderZoneBreakdown(data) {
    const container = document.getElementById("zone-breakdown");
    if (!container) return;

    const zones  = window.TRACK_ZONES;
    const votes  = Object.values(data);
    const total  = votes.length || 1;

    // Count votes per zone
    const counts = new Array(zones.length).fill(0);
    votes.forEach(v => {
      const idx = typeof v.zone === "number" ? v.zone : 0;
      if (idx >= 0 && idx < counts.length) counts[idx]++;
    });

    container.innerHTML = "";
    zones.forEach((zone, i) => {
      const pct = Math.round((counts[i] / total) * 100);

      const row = document.createElement("div");
      row.className = "zone-row";

      row.innerHTML = `
        <div class="zone-num ${i === 4 ? 'peak' : ''}">${i + 1}</div>
        <div class="zone-label-text">${zone.label}</div>
        <div class="zone-bar-wrap">
          <div class="zone-bar" style="width:${pct}%"></div>
        </div>
        <div class="zone-pct">${pct}%</div>
      `;
      container.appendChild(row);
    });
  }

  // Social sharing
  const PAGE_URL   = encodeURIComponent(window.location.origin + "/results.html");
  const SHARE_TEXT = encodeURIComponent("Here's where people think we are on the economic roller coaster — cast your vote and see the live heat map!");

  window.shareTwitter = function () {
    window.open(`https://twitter.com/intent/tweet?text=${SHARE_TEXT}&url=${PAGE_URL}`, "_blank", "noopener,noreferrer,width=600,height=400");
  };
  window.shareFacebook = function () {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${PAGE_URL}`, "_blank", "noopener,noreferrer,width=600,height=400");
  };
  window.copyLink = function () {
    navigator.clipboard.writeText(window.location.origin + "/results.html").then(() => {
      const el = document.getElementById("copy-confirm");
      el.textContent = "Link copied to clipboard!";
      setTimeout(() => { el.textContent = ""; }, 3000);
    });
  };
})();
