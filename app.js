(() => {
  'use strict';

  // ---- RSVP delivery. Leave both empty to let guests share or copy their reply. ----
  const RSVP_ENDPOINT = '';   // e.g. an Apps Script / webhook URL that accepts a JSON POST
  const RSVP_WHATSAPP = '';   // e.g. '919876543210' (country code, digits only)
  const COUPLE = 'Rukhshana & Ruzbeh';

  const $ = id => document.getElementById(id);
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const animate = (element, keyframes, options) => element.animate(keyframes, {fill: 'forwards', ...options});
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const body = document.body;
  const sealed = $('sealed');
  const envelope = $('envelope');
  const envWrap = $('env-wrap');
  const stage = $('stage');
  stage.inert = true;
  const filmScreen = $('film-screen');
  const storyVideo = $('story-video');
  const storySource = $('story-source');
  const score = $('score');
  const live = $('live');

  let state = 'sealed';

  // ---------- guest ----------
  const cleanName = value => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100);
  const params = new URLSearchParams(location.search);
  const guest = cleanName(params.get('guest') || params.get('g') || params.get('to'));
  if (guest) {
    $('env-for').hidden = false;
    $('env-name').textContent = guest;
    $('env-name').classList.add('is-guest');
    $('env-name').classList.toggle('is-long', guest.length > 18);
    $('p-guest').textContent = guest;
    $('p-guest').classList.add('is-named');
    $('p-guest').classList.toggle('is-long', guest.length > 18);
    document.title = `For ${guest} · ${document.title}`;
    envelope.setAttribute('aria-label', `Open the invitation for ${guest}`);
    $('rsvp-name').value = guest;
  }

  // ---------- petals ----------
  function sprinklePetals(holder, count, sizeBase, seed) {
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('i');
      const k = i + seed;
      petal.className = 'petal';
      petal.style.setProperty('--x', `${(k * 73) % 100}%`);
      petal.style.setProperty('--size', `${sizeBase + (k * 37) % 9}px`);
      petal.style.setProperty('--dur', `${20 + (k * 53) % 10}s`);
      petal.style.setProperty('--delay', `${-((k * 29) % 14)}s`);
      petal.style.setProperty('--sway', `${(k % 2 ? 1 : -1) * (24 + (k * 17) % 40)}px`);
      holder.append(petal);
    }
  }
  sprinklePetals($('petals-far'), 6, 9, 0);
  sprinklePetals($('petals-near'), 3, 14, 7);

  function buildSparkles() {
    const holder = $('env-sparkles');
    if (holder.childElementCount) return;
    const reach = envelope.clientWidth * 0.55;
    for (let i = 0; i < 24; i++) {
      const spark = document.createElement('i');
      const angle = -Math.PI / 2 + ((i / 24) - 0.5) * Math.PI * 1.4 + (((i * 7) % 5) - 2) * 0.06;
      const distance = reach * (0.35 + ((i * 41) % 65) / 100);
      spark.style.setProperty('--tx', `${(Math.cos(angle) * distance).toFixed(1)}px`);
      spark.style.setProperty('--ty', `${(Math.sin(angle) * distance).toFixed(1)}px`);
      spark.style.setProperty('--delay', `${((i * 13) % 45) / 100}s`);
      spark.style.setProperty('--dur', `${0.9 + ((i * 7) % 6) / 10}s`);
      if (i % 4 === 0) { spark.className = 'star'; spark.style.setProperty('--s', '14px'); }
      holder.append(spark);
    }
  }

  // ---------- depth: parallax from pointer, tilt, or a slow idle drift ----------
  const sealedLayers = [...sealed.querySelectorAll('[data-depth]')];
  const pageLayers = [...stage.querySelectorAll('[data-depth]')];
  const parallax = {targetX: 0, targetY: 0, x: 0, y: 0, lastInput: 0, on: !reducedMotion.matches};
  window.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    parallax.targetX = (event.clientX / window.innerWidth - 0.5) * 2;
    parallax.targetY = (event.clientY / window.innerHeight - 0.5) * 2;
    parallax.lastInput = performance.now();
  });
  window.addEventListener('deviceorientation', event => {
    if (event.gamma == null || event.beta == null) return;
    parallax.targetX = clamp(event.gamma / 28, -1, 1);
    parallax.targetY = clamp((event.beta - 50) / 28, -1, 1);
    parallax.lastInput = performance.now();
  });
  let turning = false;
  function parallaxFrame(now) {
    if (parallax.on && (state === 'sealed' || state === 'deck')) {
      const idle = now - parallax.lastInput > 2600;
      const aimX = idle ? Math.sin(now / 2900) * 0.4 : parallax.targetX;
      const aimY = idle ? Math.cos(now / 3700) * 0.3 : parallax.targetY;
      parallax.x += (aimX - parallax.x) * 0.045;
      parallax.y += (aimY - parallax.y) * 0.045;
      if (state === 'sealed') {
        sealedLayers.forEach(layer => {
          const depth = parseFloat(layer.dataset.depth);
          layer.style.transform = `translate3d(${(parallax.x * depth * 24).toFixed(1)}px, ${(parallax.y * depth * 18).toFixed(1)}px, 0)`;
        });
        envWrap.style.transform = `rotateX(${(-parallax.y * 6).toFixed(2)}deg) rotateY(${(parallax.x * 7).toFixed(2)}deg)`;
      } else {
        pageLayers.forEach(layer => {
          const depth = parseFloat(layer.dataset.depth);
          layer.style.transform = `translate3d(${(parallax.x * depth * 14).toFixed(1)}px, ${(parallax.y * depth * 10).toFixed(1)}px, 0)`;
        });
        if (!turning) stage.style.transform = `translate(-50%,-50%) rotateX(${(-parallax.y * 3.5).toFixed(2)}deg) rotateY(${(parallax.x * 4.5).toFixed(2)}deg)`;
      }
    }
    requestAnimationFrame(parallaxFrame);
  }
  requestAnimationFrame(parallaxFrame);

  function settleSealedDepth() {
    const easing = {duration: 650, easing: 'ease-out'};
    animate(envWrap, [{transform: envWrap.style.transform || 'rotateX(0) rotateY(0)'}, {transform: 'rotateX(0deg) rotateY(0deg)'}], easing);
    sealedLayers.forEach(layer => animate(layer, [{transform: layer.style.transform || 'translate3d(0,0,0)'}, {transform: 'translate3d(0,0,0)'}], easing));
  }

  // ---------- sound ----------
  let soundOn = true;
  let scoreBlocked = false;
  let filmWanted = false;

  let fadeToken = 0;
  function startScore() {
    fadeToken += 1;
    try { score.currentTime = 0; } catch (error) { /* not seekable yet */ }
    score.volume = 1;
    score.muted = !soundOn;
    const attempt = score.play();
    if (attempt && attempt.catch) attempt.catch(() => { scoreBlocked = true; applySound(); });
  }

  let scoreStopping = false;
  score.addEventListener('play', () => { scoreStopping = false; });
  score.addEventListener('playing', () => { if (scoreBlocked) { scoreBlocked = false; applySound(); } });
  score.addEventListener('pause', () => {
    if (!scoreStopping && !score.ended && state === 'film') scoreBlocked = true;
  });

  function fadeOutScore(ms = 1600) {
    if (score.paused) return;
    scoreStopping = true;
    const token = fadeToken;
    const startVolume = score.volume;
    const startedAt = performance.now();
    const step = now => {
      if (token !== fadeToken) return;
      const k = Math.min(1, (now - startedAt) / ms);
      try { score.volume = startVolume * (1 - k); } catch (error) { /* iOS keeps volume read-only */ }
      if (k < 1) requestAnimationFrame(step);
      else { score.pause(); try { score.volume = 1; } catch (error) { /* ignore */ } }
    };
    requestAnimationFrame(step);
  }

  function applySound() {
    score.muted = !soundOn;
    storyVideo.muted = !(soundOn && scoreBlocked);
    const button = $('sound-toggle');
    button.textContent = soundOn ? '♪ Sound on' : '♪ Sound off';
    button.setAttribute('aria-pressed', String(soundOn));
  }
  $('sound-toggle').addEventListener('click', () => { soundOn = !soundOn; applySound(); });

  function chooseStoryLayout() {
    const portrait = window.innerHeight >= window.innerWidth;
    const wanted = portrait ? 'assets/our-story-mobile-wc3.mp4' : 'assets/our-story-wc3.mp4';
    filmScreen.dataset.layout = portrait ? 'portrait' : 'landscape';
    storyVideo.poster = portrait ? 'assets/story-mobile-poster-wc2.webp' : 'assets/story-poster-wc2.webp';
    if (storySource.getAttribute('src') !== wanted && storyVideo.paused) {
      storySource.setAttribute('src', wanted);
      storyVideo.load();
    }
  }
  chooseStoryLayout();
  window.addEventListener('resize', () => { if (state !== 'film') chooseStoryLayout(); });

  window.addEventListener('load', () => { storyVideo.preload = 'auto'; }, {once: true});
  function warmUpVideo() {
    storyVideo.muted = true;
    const attempt = storyVideo.play();
    if (attempt && attempt.then) {
      attempt.then(() => {
        if (!filmWanted) { storyVideo.pause(); storyVideo.currentTime = 0; }
      }).catch(() => {});
    }
  }

  // ---------- hummingbird ----------
  function flyBird() {
    const bird = $('bird');
    const width = sealed.clientWidth;
    const height = sealed.clientHeight;
    const birdWidth = bird.getBoundingClientRect().width || 140;
    const y = height * 0.5;
    // the bird is drawn facing left, so it enters from the right, swoops close past the envelope, climbs away top-left
    const hover = (x, yy, rot, scale) => `translate(${x}px, ${yy}px) rotate(${rot}deg) scale(${scale})`;
    animate(bird, [
      {opacity: 0, transform: hover(width + 20, y + height * 0.02, 6, 0.5)},
      {opacity: 1, transform: hover(width * 0.78, y - height * 0.02, 10, 0.62), offset: 0.12},
      {opacity: 1, transform: hover(width * 0.6, y - height * 0.1, 4, 0.8), offset: 0.3},
      {opacity: 1, transform: hover(width * 0.42, y - height * 0.16, -2, 1), offset: 0.48},
      {opacity: 1, transform: hover(width * 0.24, y - height * 0.2, 0, 1.12), offset: 0.62},
      {opacity: 1, transform: hover(width * 0.06, y - height * 0.3, 9, 1.08), offset: 0.78},
      {opacity: 1, transform: hover(-width * 0.1, y - height * 0.44, 16, 0.95), offset: 0.9},
      {opacity: 0, transform: hover(-birdWidth - 80, y - height * 0.6, 22, 0.8)}
    ], {duration: 3400, easing: 'cubic-bezier(.35,.05,.5,.95)'});
    // hover bob, like a real hummingbird holding position between beats
    animate(bird, [{marginTop: '0px'}, {marginTop: '-5px'}, {marginTop: '0px'}], {duration: 420, iterations: 8, easing: 'ease-in-out', composite: 'add'});
  }

  // ---------- opening ----------
  async function openEnvelope() {
    if (state !== 'sealed') return;
    state = 'opening';
    envelope.disabled = true;
    startScore();
    warmUpVideo();
    settleSealedDepth();

    if (reducedMotion.matches) {
      finishOpening();
      showDeck(1);
      fadeOutScore(600);
      return;
    }

    const seal = $('env-seal');
    const flap = $('env-flap');
    const glow = $('env-glow');
    const letter = $('env-letter');
    let flyer = null;
    $('tap-hint').classList.add('is-hidden');

    try {
      // the seal gives way quietly
      animate(seal, [
        {transform: 'translate(-50%,-50%) scale(1)', opacity: 1},
        {transform: 'translate(-50%,-50%) scale(.94)', opacity: 0}
      ], {duration: 700, easing: 'ease-in-out'});
      animate($('sealed-head'), [{opacity: 1}, {opacity: 0}], {duration: 900, delay: 600, easing: 'ease'});

      // the flap turns over slowly, with the weight of real paper
      await animate(flap, [
        {transform: 'rotateX(0deg)', opacity: 1},
        {transform: 'rotateX(-95deg)', opacity: 1, offset: 0.55},
        {transform: 'rotateX(-172deg)', opacity: 1, offset: 0.9},
        {transform: 'rotateX(-180deg)', opacity: 0}
      ], {duration: 1900, delay: 350, easing: 'cubic-bezier(.3,.3,.15,1)'}).finished;
      flap.style.visibility = 'hidden';

      // a faint warm light from inside, nothing more
      animate(glow, [
        {opacity: 0, transform: 'translate(-50%,-52%) scale(.6)'},
        {opacity: 0.32, transform: 'translate(-50%,-56%) scale(1)', offset: 0.4},
        {opacity: 0, transform: 'translate(-50%,-60%) scale(1.25)'}
      ], {duration: 2600, easing: 'ease-in-out'});
      flyBird();
      await wait(400);

      const envRect = envelope.getBoundingClientRect();
      const rise = envRect.height * 0.62;
      await animate(letter, [{transform: 'translateY(0)'}, {transform: `translateY(${-rise}px)`}], {duration: 1500, easing: 'cubic-bezier(.25,.1,.15,1)'}).finished;

      const from = letter.getBoundingClientRect();
      stage.style.transform = 'translate(-50%,-50%)';
      const to = stage.getBoundingClientRect();
      flyer = document.createElement('img');
      flyer.src = letter.currentSrc || letter.src;
      flyer.alt = '';
      flyer.className = 'flying-card';
      Object.assign(flyer.style, {left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`});

      const cardWidth = from.width, cardHeight = from.height;
      const xLeft = envRect.left - from.left, xRight = envRect.right - from.left, xCentre = xLeft + envRect.width / 2;
      const yTop = envRect.top - from.top, yApex = yTop + envRect.height * 0.48;
      const pocketEdgeAt = x => {
        const t = (x - xCentre) / ((x > xCentre ? xRight : xLeft) - xCentre);
        return yApex + t * (yTop - yApex);
      };
      const point = (x, y) => `${(x / cardWidth * 100).toFixed(2)}% ${(y / cardHeight * 100).toFixed(2)}%`;
      const clipStart = `polygon(${point(0, 0)}, ${point(cardWidth, 0)}, ${point(cardWidth, pocketEdgeAt(cardWidth))}, ${point(xCentre, yApex)}, ${point(0, pocketEdgeAt(0))})`;
      const clipEnd = 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 100%, 0% 100%)';

      body.append(flyer);
      letter.style.visibility = 'hidden';
      animate(envelope, [{transform: 'translateY(0)', opacity: 1}, {transform: 'translateY(60px)', opacity: 0}], {duration: 1000, easing: 'ease-in'});
      animate(sealed, [{opacity: 1}, {opacity: 1, offset: 0.5}, {opacity: 0}], {duration: 1400, delay: 100, easing: 'ease'});
      // blank paper waits under the flight, so nothing of the live page shows behind the printed card
      const veil = document.createElement('div');
      veil.className = 'stage-veil';
      stage.append(veil);
      // uniform scale only: the printed card keeps its proportions and settles centred on the screen
      const fit = Math.min(to.width / from.width, to.height / from.height);
      const landX = to.left + (to.width - from.width * fit) / 2 - from.left;
      const landY = to.top + (to.height - from.height * fit) / 2 - from.top;
      await animate(flyer, [
        {transform: 'translate(0,0) scale(1)', clipPath: clipStart},
        {transform: `translate(${landX.toFixed(1)}px, ${landY.toFixed(1)}px) scale(${fit.toFixed(4)})`, clipPath: clipEnd}
      ], {duration: 1600, easing: 'cubic-bezier(.25,.1,.15,1)'}).finished;
      sealed.hidden = true;
      goToPage(1);
      // the printed card fades onto the blank paper, then the paper lifts to show the live page:
      // never two layouts of her name crossfading over each other
      await animate(flyer, [{opacity: 1}, {opacity: 0}], {duration: 650, easing: 'ease-in-out'}).finished;
      flyer.remove();
      const lift = animate(veil, [{opacity: 1}, {opacity: 0}], {duration: 900, easing: 'ease-in-out'});
      await lift.finished;
      lift.cancel();
      veil.remove();
    } catch (error) {
      /* an interrupted animation still ends on the opened card */
    }

    finishOpening(flyer);
    stage.querySelectorAll('.stage-veil').forEach(veil => veil.remove());
    await wait(3000);
    if (state !== 'opening') return;
    if (storySeen) showDeck(1);
    else playStory();
  }

  function finishOpening(flyer) {
    body.classList.remove('is-sealed');
    sealed.hidden = true;
    if (flyer) flyer.remove();
    goToPage(1);
  }

  // ---------- our story, full screen ----------
  let releaseFilm = null;
  let storySeen = false;
  let filmSession = 0;

  const filmFinished = () => new Promise(resolve => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      storyVideo.removeEventListener('ended', done);
      storyVideo.removeEventListener('error', done);
      storyVideo.removeEventListener('pause', resumeOrRelease);
      releaseFilm = null;
      resolve();
    };
    const resumeOrRelease = () => {
      if (!filmWanted || storyVideo.ended || document.hidden) return;
      storyVideo.play().catch(done);
    };
    const guard = setTimeout(done, ((storyVideo.duration || 28) + 5) * 1000);
    releaseFilm = done;
    storyVideo.addEventListener('ended', done);
    storyVideo.addEventListener('error', done);
    storyVideo.addEventListener('pause', resumeOrRelease);
  });

  async function playStory() {
    if (state === 'film') return;
    state = 'film';
    storySeen = true;
    stage.inert = true;
    const session = ++filmSession;
    filmWanted = true;
    chooseStoryLayout();
    applySound();
    filmScreen.hidden = false;
    requestAnimationFrame(() => filmScreen.classList.add('is-visible'));
    try { storyVideo.currentTime = 0; } catch (error) { /* metadata pending */ }
    let played = false;
    try { await Promise.race([storyVideo.play().then(() => { played = true; }), wait(7000)]); } catch (error) { /* retry muted */ }
    if (state !== 'film' || session !== filmSession) return;
    if (!played) {
      try { storyVideo.muted = true; await Promise.race([storyVideo.play(), wait(7000).then(() => { throw new Error('stalled'); })]); played = true; } catch (error) { played = false; }
    }
    if (state !== 'film' || session !== filmSession) return;
    if (played) await filmFinished();
    if (state !== 'film' || session !== filmSession) return;
    endStory();
  }

  function endStory() {
    filmWanted = false;
    storyVideo.pause();
    fadeOutScore(1600);
    filmScreen.classList.remove('is-visible');
    setTimeout(() => { if (state !== 'film') filmScreen.hidden = true; }, 850);
    showDeck(currentPage || 1);
    $('swipe-hint').classList.add('is-visible');
    setTimeout(() => $('swipe-hint').classList.remove('is-visible'), 4200);
  }

  function skipFilm() {
    if (state !== 'film') return;
    if (releaseFilm) releaseFilm();
    state = 'deck';
    endStory();
  }
  $('skip-film').addEventListener('click', skipFilm);
  $('story-button').addEventListener('click', () => { startScore(); playStory(); });
  $('rsvp-button').addEventListener('click', () => { goToPage(pageCount); $('rsvp-name').focus({preventScroll: true}); });

  // ---------- close: fold the card back into its envelope ----------
  function resetEnvelope() {
    const flap = $('env-flap'), letter = $('env-letter'), seal = $('env-seal');
    [sealed, envelope, envWrap, flap, letter, seal, $('env-glow'), $('sealed-head'), $('bird'), ...sealedLayers].forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
    envWrap.style.transform = '';
    sealedLayers.forEach(layer => { layer.style.transform = ''; });
    flap.style.visibility = '';
    letter.style.visibility = '';
    $('env-sparkles').classList.remove('is-burst');
    $('tap-hint').classList.remove('is-hidden');
    envelope.disabled = false;
    sealed.style.opacity = '';
    sealed.hidden = false;
  }
  async function closeCard() {
    if (state !== 'deck') return;
    state = 'closing';
    fadeOutScore(500);
    try {
      await animate(stage, [{opacity: 1, transform: getComputedStyle(stage).transform === 'none' ? 'scale(1)' : getComputedStyle(stage).transform}, {opacity: 0, transform: 'scale(.92)'}], {duration: 450, easing: 'ease-in'}).finished;
    } catch (error) { /* fine */ }
    resetEnvelope();
    body.classList.add('is-sealed');
    parallax.on = !reducedMotion.matches;
    state = 'sealed';
    stage.getAnimations().forEach(animation => animation.cancel());
    stage.style.transform = '';
    stage.inert = true;
    goToPage(1);
    live.textContent = 'The card is back in its envelope. Tap the envelope to open it again.';
  }
  $('close-card').addEventListener('click', closeCard);
  document.addEventListener('visibilitychange', () => {
    if (state !== 'film') return;
    if (document.hidden) storyVideo.pause();
    else if (filmWanted && !storyVideo.ended) storyVideo.play().catch(() => {});
  });

  // ---------- the booklet: pages peel over like paper ----------
  const book = $('book');
  const leaves = [...book.querySelectorAll('.leaf')];
  const pageCount = leaves.length;
  const dots = $('deck-dots');
  let currentPage = 1;
  const bookShade = document.createElement('div');
  bookShade.className = 'book-shade';
  book.append(bookShade);
  const curls = leaves.map(leaf => {
    const curl = document.createElement('div');
    curl.className = 'curl';
    leaf.append(curl);
    return curl;
  });
  const liftShadows = leaves.map(leaf => {
    const shadow = document.createElement('div');
    shadow.className = 'curl-shadow';
    leaf.append(shadow);
    return shadow;
  });

  leaves.forEach((leaf, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Page ${index + 1} of ${pageCount}`);
    dot.addEventListener('click', () => goToPage(index + 1));
    dots.append(dot);
  });

  function setActivePage(n) {
    currentPage = n;
    [...dots.children].forEach((dot, index) => {
      dot.classList.toggle('is-active', index === n - 1);
      dot.setAttribute('aria-selected', String(index === n - 1));
    });
    $('deck-prev').disabled = n === 1;
    $('deck-next').disabled = n === pageCount;
    leaves.forEach((leaf, index) => { leaf.setAttribute('aria-hidden', String(index !== n - 1)); leaf.inert = index !== n - 1; });
    $('rsvp-button').classList.toggle('is-hidden', n === pageCount);
  }

  // The bottom-right corner C of a page travels to a point P. The fold is the perpendicular
  // bisector of CP: the part of the page on C's side folds over and lands, mirrored, on P's side.
  function clipRectByLine(W, H, mx, my, nx, ny, keepPositiveSide) {
    const corners = [[0, 0], [W, 0], [W, H], [0, H]];
    const side = ([x, y]) => ((x - mx) * nx + (y - my) * ny) * (keepPositiveSide ? 1 : -1);
    const out = [];
    for (let i = 0; i < 4; i += 1) {
      const a = corners[i], b = corners[(i + 1) % 4];
      const sa = side(a), sb = side(b);
      if (sa >= 0) out.push(a);
      if ((sa >= 0) !== (sb >= 0)) {
        const k = sa / (sa - sb);
        out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
      }
    }
    return out;
  }
  const polygonCss = points => points.length < 3
    ? 'polygon(0 0, 0 0, 0 0)'
    : `polygon(${points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;
  function gradientAlong(W, H, vx, vy, mx, my, stops) {
    const angle = Math.atan2(vx, -vy) * 180 / Math.PI;
    const rad = angle * Math.PI / 180;
    const length = Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad));
    const foldAt = length / 2 + (mx - W / 2) * vx + (my - H / 2) * vy;
    return `linear-gradient(${angle.toFixed(2)}deg, ${stops(foldAt)})`;
  }

  function paintCurl(index, t, lift) {
    const leaf = leaves[index], curl = curls[index], liftShadow = liftShadows[index];
    if (t <= 0 || t >= 1) {
      leaf.style.clipPath = t >= 1 ? 'polygon(0 0, 0 0, 0 0)' : '';
      curl.style.display = 'none';
      liftShadow.style.display = 'none';
      if (flights.size <= 1) bookShade.style.opacity = '0';
      return;
    }
    const W = book.clientWidth, H = book.clientHeight;
    const cx = W, cy = H;
    const px = W - 2 * W * t, py = H - lift * Math.sin(Math.PI * t);
    let nx = px - cx, ny = py - cy;
    const span = Math.hypot(nx, ny) || 1;
    nx /= span; ny /= span;
    const mx = (cx + px) / 2, my = (cy + py) / 2;

    leaf.style.clipPath = polygonCss(clipRectByLine(W, H, mx, my, nx, ny, true));

    curl.style.display = '';
    curl.style.clipPath = polygonCss(clipRectByLine(W, H, mx, my, nx, ny, false));
    const dx = -ny, dy = nx;
    const a = 2 * dx * dx - 1, b = 2 * dx * dy, d = 2 * dy * dy - 1;
    const e = mx - (a * mx + b * my), f = my - (b * mx + d * my);
    curl.style.transform = `matrix(${a.toFixed(5)},${b.toFixed(5)},${b.toFixed(5)},${d.toFixed(5)},${e.toFixed(2)},${f.toFixed(2)})`;
    const reach = Math.min(W * 0.34, span / 2);
    curl.style.setProperty('--curl-light', gradientAlong(W, H, -nx, -ny, mx, my, s =>
      `rgba(70,35,40,0) ${(s - 2).toFixed(1)}px, rgba(70,35,40,.42) ${s.toFixed(1)}px, rgba(70,35,40,.14) ${(s + reach * 0.16).toFixed(1)}px, rgba(255,255,255,.34) ${(s + reach * 0.40).toFixed(1)}px, rgba(255,255,255,.08) ${(s + reach * 0.75).toFixed(1)}px, rgba(90,50,55,.16) ${(s + reach).toFixed(1)}px`));

    const openness = Math.sin(Math.PI * t);
    const width = W * (0.06 + 0.26 * openness);
    // the lifted edge of the folded part throws a soft shadow onto the flat page in front of it
    const edge = span / 2;
    liftShadow.style.display = '';
    liftShadow.style.backgroundImage = gradientAlong(W, H, nx, ny, mx, my, s =>
      `rgba(60,30,35,0) ${(s + edge - 1).toFixed(1)}px, rgba(60,30,35,${(0.16 + 0.12 * openness).toFixed(3)}) ${(s + edge).toFixed(1)}px, rgba(60,30,35,0) ${(s + edge + width * 0.7).toFixed(1)}px`);
    bookShade.style.zIndex = String(19 - 2 * index);
    bookShade.style.opacity = '1';
    bookShade.style.backgroundImage = gradientAlong(W, H, -nx, -ny, mx, my, s =>
      `rgba(60,30,35,0) ${(s - 1).toFixed(1)}px, rgba(60,30,35,${(0.22 + 0.14 * openness).toFixed(3)}) ${s.toFixed(1)}px, rgba(60,30,35,.08) ${(s + width * 0.45).toFixed(1)}px, rgba(60,30,35,0) ${(s + width).toFixed(1)}px`);
  }

  const flights = new Map();
  const easeOutCubic = k => 1 - Math.pow(1 - k, 3);
  const easeInOutCubic = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  function flipLeaf(index, from, to, lift, duration, easing = easeInOutCubic, delay = 0) {
    const leaf = leaves[index];
    const previous = flights.get(index);
    if (previous) cancelAnimationFrame(previous.raf);
    leaf.classList.add('is-turning');
    return new Promise(resolve => {
      const start = performance.now() + delay;
      const finish = () => {
        flights.delete(index);
        leaf.classList.toggle('is-turned', to >= 1);
        leaf.classList.remove('is-turning');
        paintCurl(index, to, lift);
        turning = flights.size > 0;
        resolve();
      };
      if (duration <= 0) { finish(); return; }
      const frame = now => {
        const k = clamp((now - start) / duration, 0, 1);
        if (k > 0) paintCurl(index, from + (to - from) * easing(k), lift);
        if (k < 1) flights.set(index, {raf: requestAnimationFrame(frame)});
        else finish();
      };
      flights.set(index, {raf: requestAnimationFrame(frame)});
      turning = true;
    });
  }

  function goToPage(n, options = {}) {
    n = clamp(n, 1, pageCount);
    const animate = options.animate ?? (state === 'deck' && !reducedMotion.matches);
    const from = currentPage;
    setActivePage(n);
    if (!animate || from === n) {
      flights.forEach(flight => cancelAnimationFrame(flight.raf));
      flights.clear();
      turning = false;
      leaves.forEach((leaf, index) => {
        leaf.classList.remove('is-turning');
        leaf.classList.toggle('is-turned', index < n - 1);
        paintCurl(index, index < n - 1 ? 1 : 0, 0);
      });
      return;
    }
    const lift = book.clientHeight * 0.3;
    if (n > from) {
      for (let index = from - 1; index <= n - 2; index += 1) flipLeaf(index, 0, 1, lift, 760, easeInOutCubic, (index - (from - 1)) * 130);
    } else {
      for (let index = from - 2; index >= n - 1; index -= 1) flipLeaf(index, 1, 0, lift, 760, easeInOutCubic, ((from - 2) - index) * 130);
    }
  }

  const turn = {pointerId: null, startX: 0, startY: 0, active: false, forward: true, index: -1, t: 0, lift: 0, lastX: 0, lastTime: 0, velocity: 0};
  book.addEventListener('pointerdown', event => {
    if (state !== 'deck' || event.button !== 0 || turn.pointerId !== null || flights.size > 0) return;
    if (event.target.closest('input, textarea, button, a, label, .topbar, .bottombar, .p-copy')) return;
    turn.pointerId = event.pointerId;
    turn.startX = event.clientX;
    turn.startY = event.clientY;
    turn.lastX = event.clientX;
    turn.lastTime = event.timeStamp;
    turn.velocity = 0;
    turn.active = false;
    turn.index = -1;
  });
  book.addEventListener('pointermove', event => {
    if (event.pointerId !== turn.pointerId) return;
    const dx = event.clientX - turn.startX;
    const dy = event.clientY - turn.startY;
    if (!turn.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { turn.pointerId = null; return; }
      turn.forward = dx < 0;
      turn.index = turn.forward ? currentPage - 1 : currentPage - 2;
      if (turn.index < 0 || (turn.forward && currentPage === pageCount)) { turn.pointerId = null; return; }
      turn.active = true;
      turning = true;
      const localY = event.clientY - book.getBoundingClientRect().top;
      turn.lift = clamp((book.clientHeight - localY) * 0.5, book.clientHeight * 0.08, book.clientHeight * 0.55);
      leaves[turn.index].classList.add('is-turning');
      try { book.setPointerCapture(event.pointerId); } catch (error) { /* pointer already gone */ }
    }
    const elapsed = event.timeStamp - turn.lastTime;
    if (elapsed > 0) turn.velocity = (event.clientX - turn.lastX) / elapsed;
    turn.lastX = event.clientX;
    turn.lastTime = event.timeStamp;
    const travel = book.clientWidth * 0.9;
    turn.t = turn.forward ? clamp(-dx / travel, 0, 1) : 1 - clamp(dx / travel, 0, 1);
    paintCurl(turn.index, turn.t, turn.lift);
    event.preventDefault();
  });
  const endTurn = event => {
    if (event.pointerId !== turn.pointerId) return;
    turn.pointerId = null;
    if (!turn.active || turn.index < 0) return;
    turn.active = false;
    const flung = Math.abs(turn.velocity) > 0.45;
    let complete;
    if (turn.forward) complete = flung ? turn.velocity < 0 : turn.t > 0.3;
    else complete = flung ? turn.velocity > 0 : turn.t < 0.7;
    const target = turn.forward ? (complete ? 1 : 0) : (complete ? 0 : 1);
    const distance = Math.abs(target - turn.t);
    flipLeaf(turn.index, turn.t, target, turn.lift, 260 + 420 * distance, easeOutCubic);
    if (complete) setActivePage(currentPage + (turn.forward ? 1 : -1));
  };
  book.addEventListener('pointerup', endTurn);
  book.addEventListener('pointercancel', endTurn);
  book.addEventListener('click', event => { if (turn.active) event.preventDefault(); }, true);
  $('deck-prev').addEventListener('click', () => goToPage(currentPage - 1));
  $('deck-next').addEventListener('click', () => goToPage(currentPage + 1));
  book.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea')) return;
    if (event.key === 'ArrowRight') { goToPage(currentPage + 1); event.preventDefault(); }
    if (event.key === 'ArrowLeft') { goToPage(currentPage - 1); event.preventDefault(); }
  });

  function showDeck(page = 1) {
    state = 'deck';
    stage.inert = false;
    goToPage(page, {animate: false});
    live.textContent = 'The invitation is open. Swipe to turn the pages of the card. The RSVP is on the last page.';
  }

  // ---------- family photos reveal themselves when the files exist ----------
  document.querySelectorAll('.person[data-photo]').forEach(person => {
    const probe = new Image();
    probe.onload = () => {
      const slot = person.querySelector('.portrait');
      const picture = document.createElement('img');
      picture.src = person.dataset.photo;
      picture.alt = '';
      slot.append(picture);
      slot.hidden = false;
    };
    probe.src = person.dataset.photo;
  });

  // ---------- RSVP ----------
  const form = $('rsvp-form');
  const chip = label => { const button = document.createElement('button'); button.type = 'button'; button.className = 'chip'; button.textContent = label; return button; };

  form.addEventListener('change', event => {
    if (event.target.name === 'attending') $('attending-fields').hidden = event.target.value !== 'yes';
  });

  function composeReply(reply) {
    const lines = [`RSVP for ${COUPLE}`, `${reply.name}: ${reply.attending ? 'Joyfully attending' : 'Unable to attend'}`];
    if (reply.attending) lines.push(`${reply.partySize} ${reply.partySize === 1 ? 'guest' : 'guests'}`);
    if (reply.foodNotes) lines.push(`Food: ${reply.foodNotes}`);
    if (reply.message) lines.push(`Note: ${reply.message}`);
    return lines.join('\n');
  }

  async function sendToEndpoint(reply) {
    const response = await fetch(RSVP_ENDPOINT, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(reply)});
    if (!response.ok) throw new Error(`RSVP endpoint responded ${response.status}`);
  }

  function showDone(reply, {sent = false, whatsapp = false, text = ''} = {}) {
    form.hidden = true;
    const done = $('rsvp-done');
    done.hidden = false;
    $('rsvp-done-title').textContent = reply.attending ? 'See you there' : 'We’ll miss you';
    $('rsvp-done-text').textContent = sent
      ? `Thank you, ${reply.name}. Your reply has reached us.`
      : whatsapp
        ? `Thank you, ${reply.name}. Your reply opened in WhatsApp; tap send there to finish.`
        : `Thank you, ${reply.name}. Please share this reply with us on WhatsApp or by message.`;
    const actions = $('rsvp-done-actions');
    actions.replaceChildren();
    const copyBox = $('rsvp-copy');
    copyBox.hidden = sent;
    if (!sent) {
      copyBox.textContent = text;
      if (navigator.share) {
        const share = chip('Share reply');
        share.addEventListener('click', () => navigator.share({text}).catch(() => {}));
        actions.append(share);
      }
      if (navigator.clipboard) {
        const copy = chip('Copy');
        copy.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(text); copy.textContent = 'Copied'; } catch (error) { copy.textContent = 'Select the text above'; }
        });
        actions.append(copy);
      }
    }
    const edit = chip('Change my reply');
    edit.addEventListener('click', () => { done.hidden = true; form.hidden = false; $('rsvp-name').focus(); });
    actions.append(edit);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const error = $('rsvp-error');
    error.hidden = true;
    const name = cleanName($('rsvp-name').value);
    const attending = form.attending.value;
    if (!name) { error.textContent = 'Please tell us your name or family name.'; error.hidden = false; $('rsvp-name').focus(); return; }
    if (!attending) { error.textContent = 'Please let us know whether you can attend.'; error.hidden = false; return; }
    const countValue = Number($('rsvp-count').value);
    if (attending === 'yes' && (!Number.isInteger(countValue) || countValue < 1 || countValue > 20)) { error.textContent = 'How many of you are coming? Enter 1 to 20.'; error.hidden = false; $('rsvp-count').focus(); return; }
    const partySize = attending === 'yes' ? countValue : 0;
    const reply = {
      guest,
      name,
      attending: attending === 'yes',
      partySize,
      foodNotes: attending === 'yes' ? $('rsvp-food').value.trim().slice(0, 200) : '',
      message: $('rsvp-message').value.trim().slice(0, 300),
      submittedAt: new Date().toISOString()
    };
    const text = composeReply(reply);
    const submit = $('rsvp-submit');
    submit.disabled = true;
    submit.textContent = 'Sending…';
    try {
      if (RSVP_ENDPOINT) {
        await sendToEndpoint(reply);
        showDone(reply, {sent: true});
      } else if (RSVP_WHATSAPP) {
        window.open(`https://wa.me/${RSVP_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        showDone(reply, {whatsapp: true, text});
      } else {
        showDone(reply, {text});
      }
    } catch (failure) {
      error.textContent = 'We couldn’t send your reply just now. Please try again in a moment.';
      error.hidden = false;
    }
    submit.disabled = false;
    submit.textContent = 'Send our reply';
  });

  // ---------- start ----------
  envelope.addEventListener('click', openEnvelope);
  goToPage(1);
  const target = location.hash.slice(1);
  if (target === 'rsvp' || target === 'families') {
    state = 'opening';
    finishOpening();
    showDeck(target === 'rsvp' ? 4 : 3);
  }
})();
