(() => {
  'use strict';

  // ---- RSVP delivery. Leave both empty to let guests share or copy their reply. ----
  const RSVP_ENDPOINT = '';   // the Google Apps Script web app URL from ../rsvp-sheet (ends in /exec)
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

  let surpriseTimer = 0;
  let guestDanceAnimations = [];
  function clearCardSurprise() {
    clearTimeout(surpriseTimer);
    guestDanceAnimations.forEach(animation => animation.cancel());
    guestDanceAnimations = [];
    $('card-surprise').hidden = true;
    $('party-reaction').hidden = true;
    $('card-sparkles').replaceChildren();
  }
  function celebrateCard(message, {dance = false, persistent = false} = {}) {
    clearCardSurprise();
    const reaction = persistent ? $('party-reaction') : $('card-surprise');
    reaction.textContent = message;
    reaction.hidden = false;
    if (!reducedMotion.matches) {
      for (let i = 0; i < 14; i++) {
        const sparkle = document.createElement('span');
        sparkle.textContent = i % 3 ? '✦' : '♡';
        const angle = i * 2 * Math.PI / 14;
        sparkle.style.setProperty('--dx', `${Math.cos(angle) * stage.clientWidth * .4}px`);
        sparkle.style.setProperty('--dy', `${Math.sin(angle) * stage.clientHeight * .36}px`);
        sparkle.style.setProperty('--spin', `${i % 2 ? 90 : -90}deg`);
        sparkle.style.animationDelay = `${i % 4 * 45}ms`;
        $('card-sparkles').append(sparkle);
      }
      if (dance) {
        guestDanceAnimations = [...document.querySelectorAll('.table-person-icon')].map((person, index) => person.animate([
          {transform: 'translateY(0) rotate(-12deg)'},
          {transform: 'translateY(-7px) rotate(12deg)', offset: .5},
          {transform: 'translateY(0) rotate(-12deg)'}
        ], {duration: 420, iterations: 6, delay: index % 3 * 70, easing: 'ease-in-out'}));
      }
    }
    surpriseTimer = setTimeout(() => {
      if (persistent) {
        guestDanceAnimations.forEach(animation => animation.cancel());
        guestDanceAnimations = [];
        $('card-sparkles').replaceChildren();
      } else clearCardSurprise();
    }, 3200);
  }
  document.querySelectorAll('.card-luck').forEach(button => {
    button.addEventListener('click', () => celebrateCard('A little luck. A lot of love.'));
  });


  // ---------- guest ----------
  const cleanName = value => String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 360);
  const params = new URLSearchParams(location.search);
  const guest = cleanName(params.get('guest') || params.get('g') || params.get('to'));
  const invitees = params.getAll('guest').length > 1 ? params.getAll('guest').map(cleanName).filter(Boolean) : guest.split(/\s*(?:;|\n)\s*/).filter(Boolean);
  if (guest) {
    $('env-for').hidden = false;
    $('env-name').textContent = guest;
    $('env-name').classList.add('is-guest');
    $('env-name').classList.toggle('is-long', guest.length > 18);
    $('p-guest').replaceChildren(...invitees.map(name => { const line = document.createElement('span'); line.textContent = name; return line; }));
    $('p-guest').classList.add('is-named');
    $('p-guest').classList.toggle('is-long', guest.length > 18);
    document.title = `For ${guest} · ${document.title}`;
    envelope.setAttribute('aria-label', `Open the invitation for ${guest}`);
    $('rsvp-name').value = guest.slice(0, 100);
    if (invitees.length > 1) $('env-name').textContent = invitees.join(', ');
    const envelopeNames = $('env-name').textContent;
    $('env-name').classList.toggle('is-long', envelopeNames.length > 18);
    envelope.classList.toggle('has-many-invitees', envelopeNames.length > 80);
  }

  const family = (params.get('family') || params.get('side') || '').trim().toLowerCase();
  const host = family === 'ruzbeh' || family === 'groom' ? 'ruzbeh'
    : family === 'rukhshana' || family === 'bride' ? 'rukhshana' : null;
  // Ruzbeh's links use his family's invitation; bride and unassigned links retain the original.
  if (host === 'ruzbeh') {
    const sealedNames = document.querySelector('.sealed-names');
    const [sealedBride, sealedAnd, sealedGroom] = sealedNames.children;
    sealedNames.replaceChildren(sealedGroom, sealedAnd, sealedBride);
    sealedNames.setAttribute('aria-label', 'Ruzbeh and Rukhshana');
    if (!guest) $('env-name').textContent = 'Ruzbeh & Rukhshana';
    document.querySelector('.rs-masthead span').textContent = 'Ruzbeh & Rukhshana';
    document.querySelector('.rsvp-signoff').textContent = 'With love, Ruzbeh & Rukhshana';
    document.title = document.title.replace('Rukhshana & Ruzbeh', 'Ruzbeh & Rukhshana');
    const invitation = document.querySelector('.print-invitation');
    invitation.classList.add('print-invitation--groom');
    const intro = invitation.querySelector('.print-intro');
    intro.querySelector('.print-host-names').textContent = 'Aban and Soli Irani';
    intro.lastChild.textContent = 'of their son';
    const groomName = invitation.querySelector('.print-name--groom');
    const brideName = invitation.querySelector('.print-name--bride');
    const and = invitation.querySelector('.print-and');
    invitation.insertBefore(groomName, and);
    invitation.insertBefore(brideName, and.nextSibling);
    invitation.querySelector('.print-parent-label').textContent = 'daughter of';
    invitation.querySelector('.print-parent-names').textContent = 'Naazlina and Zarir Patwa';
    const familyPortraits = {
      'Zenia Irani': 'zenia-caricature-v2.png',
      'Hanoz and Monaz Khambatta': 'hanoz-caricature-v3.png'
    };
    const replacePeople = (selector, names) => {
      document.querySelector(selector).replaceChildren(...names.map(name => {
        const person = document.createElement('li');
        person.className = 'person';
        person.textContent = name;
        if (familyPortraits[name]) {
          const portrait = document.createElement('img');
          portrait.src = `assets/family/${familyPortraits[name]}`;
          portrait.alt = '';
          portrait.className = 'family-cameo';
          person.classList.add('person--cameo');
          person.prepend(portrait);
        }
        return person;
      }));
    };
    // Remaining blessings names will be supplied later.
    replacePeople('.print-people--blessings', [
      'Rustom and Soultoon Irani', 'Perin and Minoo Pithawala', 'Katy and Polly'
    ]);
    replacePeople('.print-people--compliments', [
      'Aban and Soli Irani', 'Zenia Irani', 'Hanoz and Monaz Khambatta',
      'Farida and Pervez', 'Pericher and Viraf', 'Mahiyar, Rohinton and Maharukh'
    ]);
    const groomFamilies = document.querySelector('.print-families');
    groomFamilies.classList.add('print-families--groom');
    groomFamilies.querySelector('.print-frame').src = 'assets/art/frame-unified-3-groom.svg?v=1';
    // The printed PDF carries the Patwa hosting wording.
    document.querySelector('.original-invitation').remove();
  }

  const parentPresentations = {
    ruzbeh: {
      name: 'Ruzbeh',
      poster: 'assets/guides/parents-approach-poster.png',
      video: 'assets/guides/parents-approach-v1.mp4',
      still: 'assets/guides/parents-presenting-v1.png',
      bounds: [.14, .449, .738, .247]
    },
    rukhshana: {
      name: 'Rukhshana',
      poster: 'assets/guides/rukhshana-parents-approach-poster.png',
      video: 'assets/guides/rukhshana-parents-approach-v1.mp4',
      still: 'assets/guides/rukhshana-parents-approach-poster.png',
      bounds: [.085, .412, .855, .31]
    }
  };
  const parentPresentation = null;
  const parentsPresenting = Boolean(parentPresentation);
  body.classList.toggle('has-presenting-parents', parentsPresenting);
  const parentsStill = $('presenting-parents');
  parentsStill.hidden = !parentsPresenting;
  if (parentPresentation) {
    parentsStill.src = parentPresentation.still;
    parentsStill.alt = `${parentPresentation.name}’s parents warmly presenting your invitation`;
    parentsStill.classList.toggle('is-portrait', host === 'rukhshana');
    const video = $('parents-delivery');
    video.poster = parentPresentation.poster;
    video.setAttribute('aria-label', `${parentPresentation.name}’s parents approach and hand you the invitation`);
    video.querySelector('source').src = parentPresentation.video;
    video.load();
  }

  const guideActor = $('guide-actor');
  const guideReach = $('guide-reach');
  guideActor.dataset.host = host || '';
  let pageGuideLearned = false;
  let guidePageIndex = null;
  let pageHint = null;
  let pageHintTimer;

  function positionGuideActor() {
    if (guideActor.hidden || guideActor.dataset.mode === 'page') return;
    const rect = $('env-seal').getBoundingClientRect();
    const size = Math.min(150, innerWidth * 0.34, innerHeight * 0.22);
    guideActor.style.width = `${size}px`;
    guideActor.style.height = `${size}px`;
    guideActor.style.left = `${rect.left + rect.width * 0.48 - size * (guideActor.dataset.host === 'ruzbeh' ? 0.94 : 0.87)}px`;
    guideActor.style.top = `${rect.top + rect.height * 0.48 - size * 0.075}px`;
  }
  window.addEventListener('resize', positionGuideActor);
  envWrap.addEventListener('transitionend', positionGuideActor);


  function cancelPageHint() {
    clearTimeout(pageHintTimer);
    if (!pageHint) return;
    const index = pageHint.index;
    cancelAnimationFrame(pageHint.raf);
    pageHint = null;
    guidePageIndex = null;
    guideActor.hidden = true;
    leaves[index].classList.remove('is-turning');
    paintCurl(index, index < currentPage - 1 ? 1 : 0, 0);
    turning = flights.size > 0 || turn.active;
  }
  function hideGuide() {
    cancelPageHint();
    guidePageIndex = null;
    guideActor.hidden = true;
    body.classList.remove('has-opening-guide');
    guideActor.getAnimations({subtree: true}).forEach(animation => animation.cancel());
  }
  function showOpeningGuide() {
    hideGuide();
    requestAnimationFrame(startBirdDelivery);
  }
  function showSealGuide() {
    if (!host) return;
    body.classList.add('has-opening-guide');
    guideActor.dataset.mode = 'open';
    guideActor.style.opacity = '';
    guideActor.hidden = false;
    requestAnimationFrame(positionGuideActor);
  }
  function startPageGuide(index) {
    if (!host || reducedMotion.matches) return;
    guidePageIndex = index;
    guideActor.dataset.mode = 'page';
    guideActor.hidden = false;
  }
  function positionPageGuide(index, progress, lift) {
    if (guidePageIndex !== index) return;
    if (progress >= 1) { guidePageIndex = null; guideActor.hidden = true; return; }
    const rect = book.getBoundingClientRect();
    const size = Math.min(185, rect.width * 0.46, innerHeight * 0.27);
    const cornerX = rect.left + rect.width * (1 - 2 * progress);
    const cornerY = rect.bottom - lift * Math.sin(Math.PI * progress) * rect.height / book.clientHeight;
    guideActor.style.width = `${size}px`;
    guideActor.style.height = `${size}px`;
    guideActor.style.left = `${cornerX - 8 - size * 0.95}px`;
    guideActor.style.top = `${cornerY - 8 - size * 0.88}px`;
    guideActor.style.opacity = String(clamp((0.42 - progress) / 0.13, 0, 1));
    guideActor.hidden = progress >= 0.42;
  }
  function schedulePageHint(delay = 1000) {
    clearTimeout(pageHintTimer);
    if (!host || pageGuideLearned || reducedMotion.matches || state !== 'deck' || currentPage === pageCount || document.hidden) return;
    pageHintTimer = setTimeout(() => {
      if (state !== 'deck' || pageGuideLearned || document.hidden || currentPage === pageCount) return;
      if (turning || turn.pointerId !== null) { schedulePageHint(3000); return; }
      const index = currentPage - 1;
      const lift = book.clientHeight * 0.34;
      const started = performance.now();
      pageHint = {index, raf: 0};
      turning = true;
      leaves[index].classList.add('is-turning');
      startPageGuide(index);
      const frame = now => {
        if (!pageHint || pageHint.index !== index) return;
        const elapsed = now - started;
        const progress = elapsed < 350 ? 0
          : elapsed < 1550 ? 0.23 * easeInOutCubic((elapsed - 350) / 1200)
          : elapsed < 2550 ? 0.23
          : 0.23 * (1 - easeInOutCubic(clamp((elapsed - 2550) / 1000, 0, 1)));
        paintCurl(index, progress, lift);
        if (elapsed < 3550) pageHint.raf = requestAnimationFrame(frame);
        else { cancelPageHint(); schedulePageHint(4200); }
      };
      pageHint.raf = requestAnimationFrame(frame);
    }, delay);
  }
  const deliveryVideo = $('parents-delivery');
  const deliveryControl = $('delivery-control');
  let deliveryRun = 0;
  let deliveryPlaying = false;

  function startParentDelivery() {
    hideGuide();
    if (reducedMotion.matches) { showSealGuide(); return; }
    const run = ++deliveryRun;
    deliveryPlaying = true;
    body.classList.remove('parents-film-landed');
    body.classList.add('parents-film-active');
    deliveryVideo.hidden = false;
    deliveryVideo.currentTime = 0;
    envelope.disabled = true;
    $('tap-hint').classList.add('is-hidden');
    deliveryControl.hidden = false;
    deliveryControl.textContent = 'Skip handover';
    // Low Power Mode and slow networks can block or stall the clip; never leave the envelope unreachable.
    const handOverWithoutClip = () => {
      if (run !== deliveryRun || !deliveryPlaying || state !== 'sealed') return;
      deliveryVideo.pause();
      deliveryPlaying = false;
      body.classList.add('parents-film-landed');
      settleParentEnvelope(run);
    };
    deliveryVideo.play().catch(handOverWithoutClip);
    setTimeout(() => { if (deliveryVideo.currentTime === 0) handOverWithoutClip(); }, 5000);
  }
  function settleParentEnvelope(run) {
    body.classList.remove('parents-film-active');
    deliveryVideo.hidden = true;
    envelope.disabled = false;
    $('tap-hint').classList.remove('is-hidden');
    deliveryControl.textContent = 'Replay handover';
    deliveryControl.hidden = false;
    live.textContent = `${parentPresentation.name}’s parents have handed you the invitation. Tap the envelope to open it.`;
    // Let the envelope settle into place before pointing at its seal.
    setTimeout(() => {
      if (run === deliveryRun && state === 'sealed') showSealGuide();
    }, 800);
  }
  async function receiveParentEnvelope() {
    if (!body.classList.contains('parents-film-active')) return;
    const run = ++deliveryRun;
    deliveryVideo.pause();
    deliveryPlaying = false;
    deliveryControl.hidden = true;
    body.classList.add('parents-film-landed');
    // The live envelope starts at the offered envelope's last-frame position.
    const width = envWrap.clientWidth;
    const height = envWrap.clientHeight;
    const envelopeTop = height - envelope.clientHeight;
    const videoWidth = deliveryVideo.videoWidth || 800;
    const videoHeight = deliveryVideo.videoHeight || 1136;
    const videoScale = Math.min(width / videoWidth, height / videoHeight);
    const frameWidth = videoWidth * videoScale;
    const frameHeight = videoHeight * videoScale;
    // Each clip's measured final-frame envelope bounds, normalized to the frame.
    const [left, top, offeredWidth, offeredHeight] = parentPresentation.bounds;
    const offeredX = (width - frameWidth) / 2 + frameWidth * left;
    const offeredY = (height - frameHeight) / 2 + frameHeight * top - envelopeTop;
    const offeredScaleX = frameWidth * offeredWidth / width;
    const offeredScaleY = frameHeight * offeredHeight / envelope.clientHeight;
    const offeredTransform = `translate(${offeredX}px, ${offeredY}px) scale(${offeredScaleX}, ${offeredScaleY})`;
    const flight = animate(envelope, [
      {transform: offeredTransform, opacity: 0},
      {transform: offeredTransform, opacity: 1, offset: .18},
      {transform: 'translate(0,0) scale(1)', opacity: 1}
    ], {duration: 1100, easing: 'cubic-bezier(.2,.65,.2,1)'});
    try { await flight.finished; } catch (_) { return; }
    if (run !== deliveryRun || state !== 'sealed') return;
    flight.cancel();
    settleParentEnvelope(run);
  }
  deliveryVideo.addEventListener('ended', receiveParentEnvelope);
  deliveryVideo.addEventListener('error', receiveParentEnvelope);
  deliveryControl.addEventListener('click', () => {
    if (state !== 'sealed') return;
    if (deliveryPlaying) receiveParentEnvelope();
    else startParentDelivery();
  });

  const dropBird = $('delivery-bird');
  const dropReplay = $('drop-replay');
  let dropRun = 0;

  async function startBirdDelivery() {
    if (state !== 'sealed') return;
    const run = ++dropRun;
    hideGuide();
    dropReplay.hidden = true;
    envelope.disabled = true;
    settleSealedDepth();
    body.classList.remove('drop-envelope-pending');
    if (reducedMotion.matches) {
      envelope.disabled = false;
      showSealGuide();
      return;
    }
    const rect = envelope.getBoundingClientRect();
    const birdWidth = Math.min(130, innerWidth * .28);
    dropBird.style.width = `${birdWidth}px`;
    // The bird's beak holds the short gold ribbon at the envelope's top centre.
    dropBird.style.left = `${rect.left + rect.width / 2 - birdWidth * .17}px`;
    dropBird.style.top = `${rect.top - birdWidth * .50 - 20}px`;
    dropBird.hidden = false;
    dropBird.querySelector('.delivery-ribbon').style.opacity = '1';
    const startX = innerWidth * .65;
    const startY = -innerHeight * .85;
    const carried = [
      {transform: `translate(${startX}px,${startY}px) rotate(8deg) scale(.5)`, opacity: 0},
      {transform: 'translate(65px,-190px) rotate(-5deg) scale(.85)', opacity: 1, offset: .62},
      {transform: 'translate(0,-110px) rotate(-2deg) scale(1)', opacity: 1}
    ];
    const flight = animate(envelope, carried, {duration: 2300, easing: 'cubic-bezier(.25,.65,.3,1)'});
    const birdFlight = animate(dropBird, carried, {duration: 2300, easing: 'cubic-bezier(.25,.65,.3,1)'});
    try {
      await flight.finished;
      await wait(350);
      if (run !== dropRun || state !== 'sealed') return;
      dropBird.querySelector('.delivery-ribbon').style.opacity = '0';
      const departure = animate(dropBird, [
        {transform: 'translate(0,-110px) rotate(-2deg) scale(1)', opacity: 1},
        {transform: `translate(${-innerWidth * .7}px,${-innerHeight * .65}px) rotate(-12deg) scale(.65)`, opacity: 0}
      ], {duration: 1300, easing: 'ease-in'});
      const landing = animate(envelope, [
        {transform: 'translate(0,-110px) rotate(-2deg)', opacity: 1},
        {transform: 'translate(0,6px) rotate(1deg)', offset: .72},
        {transform: 'translate(0,-3px) rotate(-.4deg)', offset: .88},
        {transform: 'translate(0,0) rotate(0deg)', opacity: 1}
      ], {duration: 950, easing: 'cubic-bezier(.4,0,.65,1)'});
      await landing.finished;
      if (run !== dropRun || state !== 'sealed') return;
      flight.cancel();
      landing.cancel();
      envelope.disabled = false;
      parallax.on = !reducedMotion.matches;
      dropReplay.hidden = false;
      showSealGuide();
      live.textContent = 'Your invitation has arrived. Tap the gold seal to open it.';
      await departure.finished;
      if (run === dropRun) {
        dropBird.hidden = true;
        birdFlight.cancel();
        departure.cancel();
      }
    } catch (_) {
      if (run === dropRun && state === 'sealed') {
        flight.cancel();
        birdFlight.cancel();
        dropBird.hidden = true;
        envelope.disabled = false;
        parallax.on = !reducedMotion.matches;
        dropReplay.hidden = false;
        showSealGuide();
      }
    }
  }
  dropReplay.addEventListener('click', startBirdDelivery);

  $('env-seal').classList.add('seal-invitation');
  showOpeningGuide();

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
      else stop();
    };
    const stop = () => {
      if (token !== fadeToken || score.paused) return;
      score.pause();
      try { score.volume = 1; } catch (error) { /* ignore */ }
    };
    requestAnimationFrame(step);
    setTimeout(stop, ms + 150);
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
    const wanted = portrait ? 'assets/our-story-mobile-wc7.mp4' : 'assets/our-story-wc7.mp4';
    filmScreen.dataset.layout = portrait ? 'portrait' : 'landscape';
    storyVideo.poster = portrait ? 'assets/story-mobile-poster-wc4.jpg' : 'assets/story-poster-wc4.jpg';
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

  // ---------- hummingbirds ----------
  const flock = $('flock');
  // the lead bird carries the sprig; the followers are smaller, further back, and out of step with each other
  const flockPlan = [
    {lead: true, size: 1, dy: 0, swoop: 1, delay: 0, flap: 85, duration: 3400, bob: 5, bobPeriod: 420, alpha: 1},
    {size: 0.56, dy: -0.09, swoop: 1.2, delay: 220, flap: 72, duration: 3650, bob: 4, bobPeriod: 360, alpha: 0.95},
    {size: 0.42, dy: 0.11, swoop: 0.8, delay: 480, flap: 96, duration: 3850, bob: 3, bobPeriod: 470, alpha: 0.85},
    {size: 0.33, dy: -0.17, swoop: 1.35, delay: 700, flap: 66, duration: 3750, bob: 3, bobPeriod: 330, alpha: 0.72, far: true},
    {size: 0.47, dy: 0.03, swoop: 0.9, delay: 950, flap: 80, duration: 3500, bob: 4, bobPeriod: 400, alpha: 0.9}
  ];
  const birds = flockPlan.map(plan => {
    const bird = document.createElement('div');
    bird.className = `bird${plan.lead ? ' bird--lead' : ''}${plan.far ? ' bird--far' : ''}`;
    bird.style.setProperty('--flap', `${plan.flap}ms`);
    bird.style.setProperty('--phase', `${-Math.round(Math.random() * plan.flap)}ms`);
    bird.style.setProperty('--sway', `${plan.lead ? 1.5 : 2.5}deg`);
    bird.innerHTML = `<img class="bird-body" src="assets/art/${plan.lead ? 'hb-body' : 'hb-body-plain'}.webp" alt="" draggable="false">` +
      '<img class="bird-wing" src="assets/art/hb-wing.webp" alt="" draggable="false">' +
      '<img class="bird-wing bird-wing--blur" src="assets/art/hb-wing.webp" alt="" draggable="false">';
    flock.appendChild(bird);
    return {element: bird, plan};
  });

  function flyFlock() {
    const width = sealed.clientWidth;
    const height = sealed.clientHeight;
    const baseWidth = birds[0].element.getBoundingClientRect().width || 140;
    // the birds are drawn facing left, so they enter from the right, swoop close past the envelope, climb away top-left
    birds.forEach(({element, plan}) => {
      const y = height * (0.5 + plan.dy);
      const lift = height * plan.swoop;
      const hover = (x, yy, rot, scale) => `translate(${x}px, ${yy}px) rotate(${rot}deg) scale(${scale * plan.size})`;
      animate(element, [
        {opacity: 0, transform: hover(width + 20, y + lift * 0.02, 6, 0.5)},
        {opacity: plan.alpha, transform: hover(width * 0.78, y - lift * 0.02, 10, 0.62), offset: 0.12},
        {opacity: plan.alpha, transform: hover(width * 0.6, y - lift * 0.1, 4, 0.8), offset: 0.3},
        {opacity: plan.alpha, transform: hover(width * 0.42, y - lift * 0.16, -2, 1), offset: 0.48},
        {opacity: plan.alpha, transform: hover(width * 0.24, y - lift * 0.2, 0, 1.12), offset: 0.62},
        {opacity: plan.alpha, transform: hover(width * 0.06, y - lift * 0.3, 9, 1.08), offset: 0.78},
        {opacity: plan.alpha, transform: hover(-width * 0.1, y - lift * 0.44, 16, 0.95), offset: 0.9},
        {opacity: 0, transform: hover(-baseWidth - 80, y - lift * 0.6, 22, 0.8)}
      ], {duration: plan.duration, delay: plan.delay, easing: 'cubic-bezier(.35,.05,.5,.95)'});
      // hover bob, like a real hummingbird holding position between beats; each bird on its own rhythm
      animate(element, [{marginTop: '0px'}, {marginTop: `${-plan.bob}px`}, {marginTop: '0px'}],
        {duration: plan.bobPeriod, delay: plan.delay, iterations: Math.round(plan.duration / plan.bobPeriod), easing: 'ease-in-out', composite: 'add'});
    });
  }

  // ---------- opening ----------
  async function openEnvelope() {
    if (state !== 'sealed') return;
    hideGuide();
    state = 'opening';
    deliveryControl.hidden = true;
    dropReplay.hidden = true;
    $('skip-opening').hidden = false;
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
      if (state !== 'opening') return;
      flap.style.visibility = 'hidden';

      // a faint warm light from inside, nothing more
      animate(glow, [
        {opacity: 0, transform: 'translate(-50%,-52%) scale(.6)'},
        {opacity: 0.32, transform: 'translate(-50%,-56%) scale(1)', offset: 0.4},
        {opacity: 0, transform: 'translate(-50%,-60%) scale(1.25)'}
      ], {duration: 2600, easing: 'ease-in-out'});
      flyFlock();
      await wait(400);
      if (state !== 'opening') return;

      const envRect = envelope.getBoundingClientRect();
      const rise = envRect.height * 0.62;
      await animate(letter, [{transform: 'translateY(0)'}, {transform: `translateY(${-rise}px)`}], {duration: 1500, easing: 'cubic-bezier(.25,.1,.15,1)'}).finished;

      if (state !== 'opening') return;
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
      // Hand the emerging card straight to the moving film.
      // The live invitation is revealed only after the film has finished.

    } catch (error) {
      /* an interrupted animation still ends on the opened card */
    }

    if (state !== 'opening') return;
    if (storySeen) {
      finishOpening(flyer);
      fadeOutScore(1600);
      showDeck(1);
    } else {
      playStory();
      finishOpening(flyer);
    }
    stage.querySelectorAll('.stage-veil').forEach(veil => veil.remove());
  }

  function finishOpening(flyer) {
    $('skip-opening').hidden = true;
    body.classList.remove('is-sealed');
    sealed.hidden = true;
    if (flyer) flyer.remove();
    goToPage(1);
  }

  $('skip-opening').addEventListener('click', () => {
    if (state !== 'opening') return;
    // Cancelling the current await cannot let later opening phases run.
    state = 'deck';
    sealed.getAnimations({subtree: true}).forEach(animation => animation.cancel());
    document.querySelectorAll('.flying-card').forEach(card => { card.getAnimations().forEach(animation => animation.cancel()); card.remove(); });
    stage.querySelectorAll('.stage-veil').forEach(veil => veil.remove());
    finishOpening();
    showDeck(1);
    fadeOutScore(600);
  });

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
    hideGuide();
    state = 'film';
    body.classList.add('is-playing-story');
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
    body.classList.remove('is-playing-story');
    filmWanted = false;
    storyVideo.pause();
    fadeOutScore(1600);
    filmScreen.classList.remove('is-visible');
    filmScreen.hidden = true;
    showDeck(currentPage || 1);
    $('swipe-hint').classList.add('is-visible');
    setTimeout(() => $('swipe-hint').classList.remove('is-visible'), 4200);
  }

  function skipFilm() {
    if (state !== 'film') return;
    if (releaseFilm) releaseFilm();
    state = 'deck';
    endStory();
    book.focus({preventScroll: true});
  }
  $('skip-film').addEventListener('click', skipFilm);
  $('story-button').addEventListener('click', () => { startScore(); playStory(); });
  $('rsvp-button').addEventListener('click', () => { goToPage(pageCount); $('rsvp-name').focus({preventScroll: true}); });

  // ---------- close: fold the card back into its envelope ----------
  function resetEnvelope() {
    body.classList.remove('parents-handing-over');
    const flap = $('env-flap'), letter = $('env-letter'), seal = $('env-seal');
    [sealed, envelope, envWrap, flap, letter, seal, $('env-glow'), $('sealed-head'), ...birds.map(bird => bird.element), ...sealedLayers].forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
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
    hideGuide();
    state = 'closing';
    fadeOutScore(500);
    try {
      await animate(stage, [{opacity: 1, transform: getComputedStyle(stage).transform === 'none' ? 'scale(1)' : getComputedStyle(stage).transform}, {opacity: 0, transform: 'scale(.92)'}], {duration: reducedMotion.matches ? 0 : 450, easing: 'ease-in'}).finished;
    } catch (error) { /* fine */ }
    resetEnvelope();
    body.classList.add('is-sealed');
    parallax.on = !reducedMotion.matches;
    state = 'sealed';
    showOpeningGuide();
    stage.getAnimations().forEach(animation => animation.cancel());
    stage.style.transform = '';
    stage.inert = true;
    goToPage(1);
    envelope.focus({preventScroll: true});
    live.textContent = 'The card is back in its envelope. Tap the envelope to open it again.';
  }
  $('close-card').addEventListener('click', closeCard);
  document.addEventListener('visibilitychange', () => {
    if (state === 'deck') {
      if (document.hidden) cancelPageHint();
      else schedulePageHint();
      return;
    }
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
    const changed = currentPage !== n;
    currentPage = n;
    if (changed) clearCardSurprise();
    stage.classList.toggle('is-rsvp', n === pageCount);
    if (changed && state === 'deck') {
      cancelPageHint();
    }
    [...dots.children].forEach((dot, index) => {
      dot.classList.toggle('is-active', index === n - 1);
      dot.setAttribute('aria-selected', String(index === n - 1));
    });
    $('deck-prev').disabled = false;
    $('deck-prev').setAttribute('aria-label', n === 1 ? 'Close the invitation into its envelope' : 'Previous page');
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
    positionPageGuide(index, t, lift);
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

    curl.style.display = 'block';
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
    liftShadow.style.display = 'block';
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
    if (state !== 'sealed') hideGuide();
    n = clamp(n, 1, pageCount);
    const animate = options.animate ?? (state === 'deck' && !reducedMotion.matches);
    const from = currentPage;
    if (state === 'deck' && from !== n && options.animate !== false) pageGuideLearned = true;
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

  const turn = {pointerId: null, startX: 0, startY: 0, active: false, closing: false, forward: true, index: -1, t: 0, lift: 0, lastX: 0, lastTime: 0, velocity: 0};
  book.addEventListener('pointerdown', event => {
    cancelPageHint();
    if (state !== 'deck' || event.button !== 0 || turn.pointerId !== null || flights.size > 0) return;
    if (event.target.closest('input, textarea, select, fieldset, button, a, label, .topbar, .bottombar, .p-copy')) return;
    hideGuide();
    turn.pointerId = event.pointerId;
    turn.startX = event.clientX;
    turn.startY = event.clientY;
    turn.lastX = event.clientX;
    turn.lastTime = event.timeStamp;
    turn.velocity = 0;
    turn.active = false;
    turn.closing = false;
    turn.index = -1;
  });
  book.addEventListener('pointermove', event => {
    if (event.pointerId !== turn.pointerId) return;
    const dx = event.clientX - turn.startX;
    const dy = event.clientY - turn.startY;
    if (!turn.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { turn.pointerId = null; schedulePageHint(5000); return; }
      turn.forward = dx < 0;
      turn.closing = !turn.forward && currentPage === 1;
      turn.index = turn.forward ? currentPage - 1 : currentPage - 2;
      if ((!turn.closing && turn.index < 0) || (turn.forward && currentPage === pageCount)) { turn.pointerId = null; schedulePageHint(5000); return; }
      turn.active = true;
      turning = true;
      const localY = event.clientY - book.getBoundingClientRect().top;
      turn.lift = clamp((book.clientHeight - localY) * 0.5, book.clientHeight * 0.08, book.clientHeight * 0.55);
      if (!turn.closing) leaves[turn.index].classList.add('is-turning');
      try { book.setPointerCapture(event.pointerId); } catch (error) { /* pointer already gone */ }
    }
    const elapsed = event.timeStamp - turn.lastTime;
    if (elapsed > 0) turn.velocity = (event.clientX - turn.lastX) / elapsed;
    turn.lastX = event.clientX;
    turn.lastTime = event.timeStamp;
    const travel = book.clientWidth * 0.9;
    turn.t = turn.forward ? clamp(-dx / travel, 0, 1) : 1 - clamp(dx / travel, 0, 1);
    if (!turn.closing) paintCurl(turn.index, turn.t, turn.lift);
    event.preventDefault();
  });
  const endTurn = event => {
    if (event.pointerId !== turn.pointerId) { schedulePageHint(5000); return; }
    turn.pointerId = null;
    if (!turn.active || (!turn.closing && turn.index < 0)) { schedulePageHint(5000); return; }
    turn.active = false;
    const flung = Math.abs(turn.velocity) > 0.45;
    let complete;
    if (event.type === 'pointercancel') complete = false;
    else if (turn.forward) complete = flung ? turn.velocity < 0 : turn.t > 0.3;
    else complete = flung ? turn.velocity > 0 : turn.t < 0.7;
    if (turn.closing) {
      // A deliberate backward swipe closes the cover; small drags and cancelled
      // touches leave it open, even if a short movement reports a high velocity.
      const enoughTravel = turn.lastX - turn.startX >= Math.max(36, book.clientWidth * 0.18);
      turn.closing = false;
      turning = false;
      if (complete && enoughTravel) closeCard();
      else schedulePageHint(5000);
      return;
    }
    const target = turn.forward ? (complete ? 1 : 0) : (complete ? 0 : 1);
    const distance = Math.abs(target - turn.t);
    if (complete) pageGuideLearned = true;
    flipLeaf(turn.index, turn.t, target, turn.lift, 260 + 420 * distance, easeOutCubic).then(() => {
      if (!complete) schedulePageHint(5000);
    });
    if (complete) setActivePage(currentPage + (turn.forward ? 1 : -1));
  };
  book.addEventListener('pointerup', endTurn);
  book.addEventListener('pointercancel', endTurn);
  book.addEventListener('click', event => { if (turn.active) event.preventDefault(); }, true);
  function turnFromPageControl(direction) {
    if (direction < 0 && currentPage === 1) { closeCard(); return; }
    goToPage(currentPage + direction, {animate: false});
    book.focus({preventScroll: true});
    live.textContent = `Page ${currentPage} of ${pageCount}: ${['Invitation', 'Wedding details', 'Blessings and compliments', 'RSVP'][currentPage - 1]}.`;
  }
  $('deck-prev').addEventListener('click', () => turnFromPageControl(-1));
  $('deck-next').addEventListener('click', () => turnFromPageControl(1));
  book.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea, select')) return;
    if (event.key === 'ArrowRight') { goToPage(currentPage + 1); event.preventDefault(); }
    if (event.key === 'ArrowLeft') {
      if (currentPage === 1) closeCard();
      else goToPage(currentPage - 1);
      event.preventDefault();
    }
  });

  function showDeck(page = 1) {
    state = 'deck';
    stage.inert = false;
    goToPage(page, {animate: false});
    schedulePageHint();
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

  const meals = ['Parsi non veg', 'Parsi veg', 'Jain veg', 'Veg'];
  const mealIcons = [
    '<path d="M14 5c5-3 9 2 6 6-2 3-5 4-8 2l-5 5-2-2 5-5c-1-2 1-5 4-6Z"/><path d="m5 16-2-1-1 2 2 2 2-1"/>',
    '<path d="M20 4C9 2 3 8 6 15c7 4 14-2 14-11Z"/><path d="M4 21 16 9M9 16v-5m0 5h5"/>',
    '<path d="M12 21V10M12 14C5 15 3 10 4 6c6-1 9 3 8 8ZM12 10c-1-6 3-9 8-8 1 5-2 9-8 8Z"/>',
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M2 3v5m-2-5v5m4-5v5M2 8v13M23 3v18"/>'
  ];
  const guestRows = $('rsvp-guests');
  const guestDrafts = [];
  let flowStep = 0;
  let activeGuest = 0;
  const readGuest = row => ({name: row.querySelector('input[type="text"]').value, meal: row.querySelector('input[type="radio"]:checked')?.value || ''});

  const guestSurprises = [
    'Solo entry. Main-character energy.',
    'Double trouble. We approve.',
    'Three’s a dance crew!',
    'Four seats. One very loud table.',
    'Five already? Warm up those dance moves.',
    'OH MY GOD, TOO MANY! YOU GUYS HAVE TO DANCE!',
    'Seven! Who’s starting the dance-off?',
    'Eight plates. Zero excuses to sit out.',
    'Nine guests. The dance floor is getting nervous.',
    'We’re going to need more cake!',
    'Eleven! This is officially a squad.',
    'A dozen legends. Save us some cake.',
    'Lucky thirteen. Unlucky for the dessert table.',
    'Fourteen! Turn up the music!',
    'Fifteen! Even the cake wants to dance.',
    'Sixteen! Family group chat: assembled.',
    'Seventeen. The party has backup dancers.',
    'Eighteen! Hope you’ve all rehearsed.',
    'Nineteen! Is this a wedding or a festival?',
    'Full house! Nobody escapes the dance floor.'
  ];
  function celebrateGuestCount(count) {
    if (guestSurprises[count - 1]) celebrateCard(guestSurprises[count - 1], {dance: count >= 6, persistent: true});
  }

  function syncTable(count) {
    const people = $('table-people');
    const previousCount = people.children.length;
    while (people.children.length > count) people.lastElementChild.remove();
    for (let i = 0; i < count; i++) {
      let person = people.children[i];
      if (!person) {
        person = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        person.classList.add('table-person');
        person.innerHTML = '<g class="table-person-icon"><circle class="seat-back" r="13"/><circle class="seat-head" cy="-3" r="4"/><path class="seat-body" d="M-7 7c0-9 14-9 14 0Z"/></g>';
        people.append(person);
      }
      const angle = -Math.PI / 2 + i * 2 * Math.PI / count;
      person.setAttribute('transform', `translate(${150 + 123 * Math.cos(angle)} ${95 + 70 * Math.sin(angle)})`);
    }
    [...people.children].forEach((person, index) => person.classList.toggle('is-newest', index === count - 1));
    $('seat-summary').textContent = `${count} ${count === 1 ? 'guest' : 'guests'}`;
    $('seat-remove').disabled = count <= 1;
    $('seat-add').disabled = count >= 20;
    if (flowStep === 1 && count !== previousCount) celebrateGuestCount(count);
  }

  function syncGuestRows() {
    const count = Number($('rsvp-count').value);
    if (!Number.isInteger(count) || count < 1 || count > 20) return;
    guestRows.querySelectorAll('.rsvp-person').forEach((row, i) => { guestDrafts[i] = readGuest(row); });
    guestRows.replaceChildren();
    for (let i = 0; i < count; i++) {
      const row = document.createElement('fieldset');
      row.className = 'rsvp-person';
      const legend = document.createElement('legend');
      legend.textContent = `Guest ${i + 1} of ${count}`;
      const nameLabel = document.createElement('label');
      nameLabel.textContent = 'Guest name';
      const input = document.createElement('input');
      input.type = 'text'; input.maxLength = 100; input.required = true;
      input.autocomplete = 'off'; input.name = `guestName${i + 1}`;
      input.value = guestDrafts[i]?.name || '';
      nameLabel.append(input);
      const mealGroup = document.createElement('fieldset');
      mealGroup.className = 'meal-options';
      const mealLegend = document.createElement('legend');
      mealLegend.textContent = 'Meal';
      mealGroup.append(mealLegend);
      meals.forEach((meal, mealIndex) => {
        const label = document.createElement('label');
        label.className = 'meal-choice';
        const radio = document.createElement('input');
        radio.type = 'radio'; radio.name = `guestMeal${i + 1}`; radio.value = meal; radio.required = true;
        radio.checked = guestDrafts[i]?.meal === meal;
        const visual = document.createElement('span');
        visual.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${mealIcons[mealIndex]}</svg>`;
        const text = document.createElement('span');
        text.textContent = meal;
        visual.append(text);
        label.append(radio, visual);
        mealGroup.append(label);
      });
      row.append(legend, nameLabel, mealGroup);
      guestRows.append(row);
    }
    syncTable(count);
    renderGuestPage();
  }
  $('rsvp-count').addEventListener('input', syncGuestRows);
  [['seat-remove', -1], ['seat-add', 1]].forEach(([id, step]) => {
    $(id).addEventListener('click', () => {
      const current = Number($('rsvp-count').value);
      $('rsvp-count').value = Math.max(1, Math.min(20, (Number.isInteger(current) ? current : 1) + step));
      syncGuestRows();
      $('rsvp-error').hidden = true;
    });
  });
  syncGuestRows();

  function renderGuestPage(focus = false) {
    const rows = [...guestRows.children];
    activeGuest = Math.max(0, Math.min(activeGuest, rows.length - 1));
    rows.forEach((row, index) => { row.hidden = index !== activeGuest; });
    const tabs = $('guest-tabs');
    tabs.replaceChildren();
    rows.forEach((row, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(index + 1).padStart(2, '0');
      button.setAttribute('aria-label', `Guest ${index + 1}`);
      button.setAttribute('aria-pressed', String(index === activeGuest));
      const person = readGuest(row);
      if (person.name.trim() && person.meal) button.classList.add('is-complete');
      button.addEventListener('click', () => { activeGuest = index; renderGuestPage(true); updateNextLabel(); });
      tabs.append(button);
    });
    if (focus && rows[activeGuest]) {
      const legend = rows[activeGuest].querySelector("legend");
      legend.tabIndex = -1;
      legend.focus({preventScroll: true});
    }
  }
  function updateNextLabel() {
    $('rs-next').textContent = flowStep === 2 && activeGuest < guestRows.children.length - 1 ? 'Next guest →' : flowStep === 2 ? 'Review →' : 'Next →';
  }
  function showReplyStep(step) {
    const previousStep = flowStep;
    clearCardSurprise();
    flowStep = step;
    form.querySelectorAll('.rs-step').forEach(panel => { panel.hidden = Number(panel.dataset.step) !== step; panel.scrollTop = 0; });
    const titles = ['Will you join us?', 'How many guests?', 'Name & meal', 'Your reply'];
    const subtitles = ['The best part of our day? Sharing it with you.', 'Add your favourite people to the celebration.', 'Your name. Your favourite meal.', 'One last look, then send your love our way.'];
    $('rs-heading').textContent = titles[step];
    $('rs-subtitle').textContent = subtitles[step];
    document.querySelectorAll('.rs-progress span').forEach((item, index) => { item.classList.toggle('is-current', index === Math.min(step, 2)); item.classList.toggle('is-complete', index < Math.min(step, 2)); });
    document.querySelector('.rs-progress span:last-child').textContent = step === 3 ? 'Review' : 'Meals';
    document.querySelectorAll('.rs-progress span').forEach((item, index) => {
      if (index === Math.min(step, 2)) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    $('rs-back').hidden = step === 0;
    $('rs-next').hidden = step === 3;
    $('rsvp-submit').hidden = step !== 3;
    $('rsvp-error').hidden = true;
    if (step === 2) renderGuestPage();
    if (step === 3) {
      const attending = form.attending.value === 'yes';
      const people = [...guestRows.children].map(readGuest);
      $('rs-review-summary').textContent = attending ? `${people.length} ${people.length === 1 ? 'guest attending' : 'guests attending'}` : 'Unable to attend';
      $('rs-review-meals').textContent = attending ? meals.map(meal => { const count = people.filter(person => person.meal === meal).length; return count ? `${count} × ${meal}` : ''; }).filter(Boolean).join('\n') : 'We’ll miss you.';
    }
    updateNextLabel();
    $('rs-heading').focus({preventScroll: true});
    if (step === 1 && previousStep === 0) celebrateGuestCount(Number($('rsvp-count').value));
  }
  function replyError(message, input) {
    $('rsvp-error').textContent = message;
    $('rsvp-error').hidden = false;
    input?.focus({preventScroll: true});
  }
  function advanceReply() {
    if (flowStep === 0) {
      if (!cleanName($('rsvp-name').value)) return replyError('Tell us your name or family name.', $('rsvp-name'));
      if (!form.attending.value) return replyError('Choose whether you’ll be joining us.', form.querySelector('input[name=attending]'));
      return showReplyStep(form.attending.value === 'yes' ? 1 : 3);
    }
    if (flowStep === 1) {
      const count = Number($('rsvp-count').value);
      if (!Number.isInteger(count) || count < 1 || count > 20) return replyError('Choose between 1 and 20 guests.', $('rsvp-count'));
      return showReplyStep(2);
    }
    if (flowStep === 2) {
      const row = guestRows.children[activeGuest];
      const person = readGuest(row);
      if (!person.name.trim()) return replyError(`What’s Guest ${activeGuest + 1}’s name?`, row.querySelector('input[type=text]'));
      if (!meals.includes(person.meal)) return replyError('Choose a meal for this guest.', row.querySelector('input[type=radio]'));
      if (activeGuest < guestRows.children.length - 1) { activeGuest++; renderGuestPage(true); updateNextLabel(); $('rsvp-error').hidden = true; }
      else {
        const invalid = [...guestRows.children].findIndex(item => { const draft = readGuest(item); return !draft.name.trim() || !meals.includes(draft.meal); });
        if (invalid !== -1) { activeGuest = invalid; renderGuestPage(); updateNextLabel(); return replyError('Please finish this guest’s name and meal.'); }
        showReplyStep(3);
      }
    }
  }
  $('rs-next').addEventListener('click', advanceReply);
  $('rs-back').addEventListener('click', () => {
    if (flowStep === 3) showReplyStep(form.attending.value === 'yes' ? 2 : 0);
    else if (flowStep === 2 && activeGuest > 0) { activeGuest--; renderGuestPage(true); updateNextLabel(); }
    else showReplyStep(flowStep - 1);
  });
  form.addEventListener('input', () => { $('rsvp-error').hidden = true; });
  form.addEventListener('change', () => { $('rsvp-error').hidden = true; });

  function composeReply(reply) {
    const lines = [`RSVP for ${COUPLE}`, `${reply.name}: ${reply.attending ? 'Joyfully attending' : 'Unable to attend'}`];
    if (reply.attending) lines.push(`${reply.partySize} ${reply.partySize === 1 ? 'guest' : 'guests'}`);
    reply.guests.forEach(person => lines.push(`${person.name}: ${person.meal}`));
    if (reply.message) lines.push(`Note: ${reply.message}`);
    return lines.join('\n');
  }

  const whatsappLink = text => `https://wa.me/${RSVP_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

  async function sendToEndpoint(reply) {
    // text/plain keeps this a simple CORS request; Google Apps Script cannot answer a preflight.
    const response = await fetch(RSVP_ENDPOINT, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(reply)});
    if (!response.ok) throw new Error(`RSVP endpoint responded ${response.status}`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'RSVP endpoint refused the reply');
  }

  function showDone(reply, {sent = false, whatsapp = false, text = ''} = {}) {
    form.hidden = true;
    const done = $('rsvp-done');
    done.hidden = false;
    const handedToGuest = !sent && !whatsapp;
    $('rsvp-done-title').textContent = handedToGuest ? 'Almost there' : reply.attending ? 'See you there' : 'We’ll miss you';
    $('rsvp-done-text').textContent = sent
      ? `Thank you, ${reply.name}. Your reply has reached us.`
      : whatsapp
        ? `Thank you, ${reply.name}. Tap send in WhatsApp to finish. If it didn’t open, tap the button below.`
        : 'Your reply is ready. Send it on WhatsApp to finish.';
    const actions = $('rsvp-done-actions');
    actions.replaceChildren();
    const copyBox = $('rsvp-copy');
    copyBox.hidden = sent;
    if (!sent) {
      copyBox.textContent = text;
      const sendOnWhatsApp = chip('Send on WhatsApp');
      sendOnWhatsApp.classList.add('chip--primary');
      sendOnWhatsApp.addEventListener('click', () => { location.href = whatsappLink(text); });
      actions.append(sendOnWhatsApp);
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
    edit.addEventListener('click', () => { done.hidden = true; form.hidden = false; showReplyStep(0); });
    actions.append(edit);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (flowStep !== 3) { advanceReply(); return; }
    const error = $('rsvp-error');
    error.hidden = true;
    const name = cleanName($('rsvp-name').value);
    const attending = form.attending.value;
    if (!name) { error.textContent = 'Please tell us your name or family name.'; error.hidden = false; $('rsvp-name').focus(); return; }
    if (!attending) { error.textContent = 'Please let us know whether you can attend.'; error.hidden = false; return; }
    const countValue = Number($('rsvp-count').value);
    if (attending === 'yes' && (!Number.isInteger(countValue) || countValue < 1 || countValue > 20)) { error.textContent = 'How many of you are coming? Enter 1 to 20.'; error.hidden = false; $('rsvp-count').focus(); return; }
    const partySize = attending === 'yes' ? countValue : 0;
    const guests = attending === 'yes' ? [...guestRows.querySelectorAll('.rsvp-person')].map(row => { const person = readGuest(row); return {name: cleanName(person.name).slice(0, 100), meal: person.meal}; }) : [];
    if (attending === 'yes') {
      const invalid = guests.findIndex(person => !person.name || !meals.includes(person.meal));
      if (invalid !== -1) {
        error.textContent = `Please enter a name and choose a meal for Guest ${invalid + 1}.`;
        error.hidden = false;
        activeGuest = invalid;
        showReplyStep(2);
        error.textContent = `Please finish Guest ${invalid + 1}’s name and meal.`;
        error.hidden = false;
        const row = guestRows.children[invalid];
        row.querySelector(!guests[invalid].name ? 'input[type="text"]' : 'input[type="radio"]').focus();
        return;
      }
    }
    const reply = {
      guest,
      side: host || '',
      name,
      attending: attending === 'yes',
      partySize,
      guests,
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
        window.open(whatsappLink(text), '_blank', 'noopener');
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
    hideGuide();
    state = 'opening';
    finishOpening();
    showDeck(target === 'rsvp' ? 4 : 3);
  }
})();
