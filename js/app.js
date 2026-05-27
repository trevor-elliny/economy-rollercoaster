(function () {
  const STORAGE_KEY = "rcv_voted";
  const MAX_SNAP_DIST = 80;

  let selectedT  = null;
  let hasVoted   = localStorage.getItem(STORAGE_KEY) === "1";
  let totalVotes = 0;

  const svg          = document.getElementById("coaster-svg");
  const overlay      = document.getElementById("click-overlay");
  const ring         = document.getElementById("placement-ring");
  const stageLabelEl = document.getElementById("stage-label-text");
  const submitBtn    = document.getElementById("submit-btn");
  const statusEl     = document.getElementById("submit-status");
  const heatLayer    = document.getElementById("heat-map-layer");

  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  overlay.addEventListener("mousemove", (evt) => {
    if (hasVoted) return;
    const path = svg.getElementById("track-path");
    if (!path) return;
    const p = svgPoint(evt);
    const { t, dist } = findNearestT(path, p.x, p.y);
    if (dist > MAX_SNAP_DIST) { ring.setAttribute("cx", -200); return; }
    const pt = getPointAtT(path, t);
    ring.setAttribute("cx", pt.x);
    ring.setAttribute("cy", pt.y);
    stageLabelEl.textContent = getLabelForT(t);
  });

  overlay.addEventListener("mouseleave", () => {
    ring.setAttribute("cx", -200);
    if (!selectedT) stageLabelEl.textContent = "Click anywhere on the track";
  });

  overlay.addEventListener("click", (evt) => {
    if (hasVoted) return;
    const path = svg.getElementById("track-path");
    if (!path) return;
    const p = svgPoint(evt);
    const { t, dist } = findNearestT(path, p.x, p.y);
    if (dist > MAX_SNAP_DIST) return;
    selectedT = t;
    placeCarAtT(svg, t);
    stageLabelEl.textContent = getLabelForT(t);
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit My Vote";
  });

  submitBtn.addEventListener("click", async () => {
    if (selectedT === null || hasVoted) return;
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    const db   = window.__firebaseDB;
    const ref  = window.__firebaseRef;
    const push = window.__firebasePush;
    const ts   = window.__firebaseServerTimestamp;

    if (!db) {
      statusEl.textContent = "⚠ Firebase not connected. Set up firebase-config.js to enable voting.";
      submitBtn.textContent = "Submit My Vote";
      submitBtn.disabled = false;
      return;
    }

    try {
      await push(ref(db, "votes"), { t: selectedT, zone: getZoneIndex(selectedT), ts: ts() });
      localStorage.setItem(STORAGE_KEY, "1");
      hasVoted = true;
      submitBtn.textContent = "Vote Recorded!";
      statusEl.textContent = "Thanks! Your vote has been added to the heat map below.";
      overlay.style.cursor = "default";
      ring.setAttribute("cx", -200);
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Something went wrong. Please try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit My Vote";
    }
  });

  function getZoneIndex(t) {
    const zones = window.TRACK_ZONES;
    let idx = 0;
    for (let i = zones.length - 1; i >= 0; i--) {
      if (t >= zones[i].t) { idx = i; break; }
    }
    return idx;
  }

  if (hasVoted) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Already Voted";
    statusEl.textContent = "You've already submitted your vote. Check out the heat map below!";
    overlay.style.cursor = "default";
  }

  window.addEventListener("votes-updated", (evt) => {
    renderHeatMap(evt.detail);
  });

  function renderHeatMap(data) {
    if (!heatLayer) return;
    heatLayer.innerHTML = "";
    const path = svg.getElementById("track-path");
    if (!path) return;

    const votes = Object.values(data);
    totalVotes = votes.length;
    updateVoteCount(totalVotes);
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
      const radius    = 6 + intensity * 18;
      const opacity   = 0.25 + intensity * 0.65;
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

  function updateVoteCount(n) {
    let el = document.querySelector(".vote-count");
    if (!el) {
      el = document.createElement("p");
      el.className = "vote-count";
      const subtitle = document.querySelector(".heatmap-subtitle");
      if (subtitle) subtitle.after(el);
    }
    el.innerHTML = `Total votes: <span>${n.toLocaleString()}</span>`;
  }

  const PAGE_URL   = encodeURIComponent(window.location.href);
  const SHARE_TEXT = encodeURIComponent("Where are we on the economic roller coaster? Cast your vote and see where everyone else thinks we are.");

  window.shareTwitter = function () {
    window.open(`https://twitter.com/intent/tweet?text=${SHARE_TEXT}&url=${PAGE_URL}`, "_blank", "noopener,noreferrer,width=600,height=400");
  };
  window.shareFacebook = function () {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${PAGE_URL}`, "_blank", "noopener,noreferrer,width=600,height=400");
  };
  window.copyLink = function () {
    navigator.clipboard.writeText(window.location.href).then(() => {
      const el = document.getElementById("copy-confirm");
      el.textContent = "Link copied to clipboard!";
      setTimeout(() => { el.textContent = ""; }, 3000);
    });
  };
})();
