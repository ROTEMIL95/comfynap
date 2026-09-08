/* =====================================================================
   ComfyNap — script.js
   Vanilla JS, no dependencies. Every module is self-contained and keyed
   off data-* attributes so the markup can move into Shopify Liquid
   sections without touching this file.

   Modules
     Analytics      event bus → console + dataLayer + gtag/fbq if present
     Header         scrolled state, mobile menu
     Gallery        hero thumbnails, swipe, keyboard
     Carousels      arrow buttons for scroll-snap tracks
     Faq            accessible accordion
     VideoModal     shared <video> dialog for every data-video-trigger
     StickyCta      mobile bottom bar visibility
     Reveal         reveal-on-scroll for [data-reveal]
     ScrollDepth    scroll_25 / scroll_50 / scroll_75
     Ctas           CTA click events + prototype add-to-cart
     Hotspots       how-it-works diagram ↔ cards
   ===================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Product data — read from the DOM so Liquid renders the source of truth
     ------------------------------------------------------------------ */
  const productEl = $('[data-product]');
  const PRODUCT = {
    id: (productEl && productEl.dataset.productId) || 'comfynap-360',
    variantId: (productEl && productEl.dataset.variantId) || '',
    name: (productEl && productEl.dataset.productName) || 'ComfyNap 360 Travel Pillow',
    price: parseFloat((productEl && productEl.dataset.price) || '0'),
    currency: (productEl && productEl.dataset.currency) || 'USD',
  };

  /* ------------------------------------------------------------------
     Analytics
     Event names follow GA4. Meta Pixel standard events are mapped below;
     anything unmapped is sent as a custom event.

     Wiring later:
       GA4 / GTM   → already pushes to window.dataLayer; add gtag.js and
                     events fire through gtag('event', …) automatically.
       Meta Pixel  → include the pixel base code; fbq('track'|'trackCustom')
                     fires automatically.
       Shopify     → listen for document 'comfynap:analytics' in a custom
                     pixel, or map to Shopify's analytics.publish().
       Purchase    → call window.ComfyNapAnalytics.track('purchase', {...})
                     from the order-status page with transaction_id/value.
     ------------------------------------------------------------------ */
  const Analytics = (function () {
    const META_STANDARD = {
      view_item: 'ViewContent',
      add_to_cart: 'AddToCart',
      begin_checkout: 'InitiateCheckout',
      purchase: 'Purchase',
    };

    function track(event, data) {
      const payload = Object.assign({ event: event, page: 'comfynap-landing' }, data || {});

      // 1) Prototype: console
      console.log('[analytics]', event, payload);

      // 2) GTM / GA4 dataLayer
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);

      // 3) gtag.js, if present
      if (typeof window.gtag === 'function') window.gtag('event', event, data || {});

      // 4) Meta Pixel, if present
      if (typeof window.fbq === 'function') {
        const std = META_STANDARD[event];
        if (std) window.fbq('track', std, data || {});
        else window.fbq('trackCustom', event, data || {});
      }

      // 5) DOM event for Shopify custom pixels / other listeners
      document.dispatchEvent(new CustomEvent('comfynap:analytics', { detail: payload }));
    }

    function itemPayload(extra) {
      return Object.assign({
        currency: PRODUCT.currency,
        value: PRODUCT.price,
        items: [{ item_id: PRODUCT.id, item_name: PRODUCT.name, price: PRODUCT.price, quantity: 1 }],
      }, extra || {});
    }

    return { track: track, itemPayload: itemPayload, product: PRODUCT };
  })();

  window.ComfyNapAnalytics = Analytics;

  /* ------------------------------------------------------------------
     Header
     ------------------------------------------------------------------ */
  function initHeader() {
    const header = $('.header');
    if (!header) return;

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ------------------------------------------------------------------
     Gallery (hero)
     ------------------------------------------------------------------ */
  function initGallery() {
    const gallery = $('[data-gallery]');
    if (!gallery) return;

    const slides = $$('[data-gallery-slide]', gallery);
    const thumbs = $$('[data-gallery-thumb]', gallery);
    const stage = $('[data-gallery-stage]', gallery);
    const thumbStrip = $('.gallery__thumbs', gallery);
    if (!slides.length || !thumbs.length) return;

    // Horizontal-only scroll of just the thumbnail strip. thumb.scrollIntoView()
    // looks like the obvious choice here, but with block:'nearest' it also lets
    // the browser treat the whole PAGE as a candidate scroll container: on a
    // hero tall enough that the thumbnail row sits below the fold, selecting a
    // thumbnail was jumping the entire page down by several hundred px — once
    // even to the point of scrolling the CTA button in slide 1 out of view.
    // Scrolling thumbStrip.scrollLeft directly can never touch page scroll.
    function scrollThumbIntoView(thumb) {
      if (!thumbStrip) return;
      const stripRect = thumbStrip.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();
      const overflowLeft = thumbRect.left - stripRect.left;
      const overflowRight = thumbRect.right - stripRect.right;
      let delta = 0;
      if (overflowLeft < 0) delta = overflowLeft;
      else if (overflowRight > 0) delta = overflowRight;
      if (!delta) return;
      thumbStrip.scrollBy({ left: delta, behavior: reducedMotion ? 'auto' : 'smooth' });
    }

    let current = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));

    // Every slide shares the same stage box (opacity toggle, not display:none), so
    // native loading="lazy" can't tell slides 2-6 are off-screen and would fetch all
    // of them immediately. Real src/srcset are swapped in only once, on first visit.
    function hydrate(slide) {
      if (!slide || slide.dataset.hydrated) return;
      slide.dataset.hydrated = 'true';
      $$('source[data-srcset], img[data-src], img[data-srcset]', slide).forEach((el) => {
        if (el.dataset.srcset) { el.srcset = el.dataset.srcset; delete el.dataset.srcset; }
        if (el.dataset.src) { el.src = el.dataset.src; delete el.dataset.src; }
      });
    }

    function show(index) {
      current = (index + slides.length) % slides.length;
      hydrate(slides[current]);
      slides.forEach((s, i) => {
        const on = i === current;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', String(!on));
      });
      thumbs.forEach((t, i) => {
        const on = i === current;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on) scrollThumbIntoView(t);
      });
      // Lets any autoplaying media on a slide (see initAmbientVideo) pause
      // itself while scrolled out of view and resume when shown again.
      document.dispatchEvent(new CustomEvent('comfynap:slidechange', { detail: { activeSlide: slides[current] } }));
    }

    thumbs.forEach((thumb, i) => {
      // Hydrate on hover/focus too: the image is ready by the time the click lands.
      thumb.addEventListener('mouseenter', () => hydrate(slides[i]));
      thumb.addEventListener('focus', () => hydrate(slides[i]));
      thumb.addEventListener('click', () => show(i));
      thumb.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault();
        let next = current;
        if (e.key === 'ArrowRight') next = current + 1;
        if (e.key === 'ArrowLeft') next = current - 1;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = thumbs.length - 1;
        show(next);
        thumbs[current].focus();
      });
    });

    // Horizontal swipe on the stage
    if (stage) {
      let startX = null;
      stage.addEventListener('pointerdown', (e) => { startX = e.clientX; });
      stage.addEventListener('pointerup', (e) => {
        if (startX === null) return;
        const dx = e.clientX - startX;
        startX = null;
        if (Math.abs(dx) < 40) return;
        show(dx < 0 ? current + 1 : current - 1);
      });
      stage.addEventListener('pointercancel', () => { startX = null; });
    }
  }

  /* ------------------------------------------------------------------
     Carousels — CSS scroll-snap does the work; JS drives the arrows
     ------------------------------------------------------------------ */
  function initCarousels() {
    $$('[data-carousel]').forEach((root) => {
      const track = $('[data-carousel-track]', root);
      const prev = $('[data-carousel-prev]', root);
      const next = $('[data-carousel-next]', root);
      if (!track) return;

      const step = () => {
        const card = track.firstElementChild;
        const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
        return card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
      };
      const update = () => {
        const max = track.scrollWidth - track.clientWidth - 1;
        if (prev) prev.disabled = track.scrollLeft <= 0;
        if (next) next.disabled = track.scrollLeft >= max;
      };
      const scroll = (dir) => track.scrollBy({ left: dir * step(), behavior: reducedMotion ? 'auto' : 'smooth' });

      if (prev) prev.addEventListener('click', () => scroll(-1));
      if (next) next.addEventListener('click', () => scroll(1));
      track.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
      update();
    });
  }

  /* ------------------------------------------------------------------
     FAQ accordion
     data-accordion="single" closes siblings; any other value allows many
     ------------------------------------------------------------------ */
  function initFaq() {
    $$('[data-accordion]').forEach((acc) => {
      const single = acc.dataset.accordion === 'single';
      const items = $$('[data-accordion-item]', acc);

      const setOpen = (item, open) => {
        const btn = $('button[aria-controls]', item);
        if (!btn) return;
        btn.setAttribute('aria-expanded', String(open));
        item.classList.toggle('is-open', open);
      };

      items.forEach((item) => {
        const btn = $('button[aria-controls]', item);
        if (!btn) return;
        btn.addEventListener('click', () => {
          const willOpen = btn.getAttribute('aria-expanded') !== 'true';
          if (single && willOpen) items.forEach((other) => { if (other !== item) setOpen(other, false); });
          setOpen(item, willOpen);
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     Video modal
     Trigger attributes:
       data-video-id        analytics identifier
       data-video-src       mp4/webm URL, or an HLS .m3u8 URL (empty → labelled placeholder)
       data-video-poster    poster image URL
       data-video-captions  WebVTT URL (optional)
       data-video-duration  display label, e.g. "1:49" (optional)
       data-video-title     accessible title

     HLS: Safari plays .m3u8 natively. Other browsers get hls.js, loaded
     from cdnjs only the first time an HLS source is played. Swap the
     .m3u8 URLs for MP4 files when the client supplies them and hls.js is
     never requested.
     ------------------------------------------------------------------ */
  const HLS_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.20/hls.min.js';
  let hlsLibPromise = null;

  const isHlsSource = (src) => /\.m3u8(\?|$)/i.test(src);
  const playsHlsNatively = (videoEl) => videoEl.canPlayType('application/vnd.apple.mpegurl') !== '';

  function loadHlsLib() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLibPromise) return hlsLibPromise;
    hlsLibPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = HLS_LIB_URL;
      script.async = true;
      script.onload = () => resolve(window.Hls);
      script.onerror = () => { hlsLibPromise = null; reject(new Error('hls.js failed to load')); };
      document.head.appendChild(script);
    });
    return hlsLibPromise;
  }

  // Shared by the video modal and the hero autoplay loop: attaches `src` to
  // `videoEl` (native HLS in Safari, hls.js everywhere else, loaded from
  // cdnjs the first time any video on the page needs it), then calls
  // `onReady` once playback can start. Returns a handle whose `destroy()`
  // tears down the hls.js instance, if one was created.
  function attachVideoSource(videoEl, src, onReady) {
    if (isHlsSource(src) && !playsHlsNatively(videoEl)) {
      let hls = null;
      loadHlsLib()
        .then((Hls) => {
          if (!Hls || !Hls.isSupported()) throw new Error('MediaSource unsupported');
          hls = new Hls({ enableWorker: true });
          hls.loadSource(src);
          hls.attachMedia(videoEl);
          hls.on(Hls.Events.MANIFEST_PARSED, () => { if (onReady) onReady(); });
        })
        .catch((err) => {
          console.warn('[video]', err.message, '— falling back to native src');
          videoEl.src = src;
          videoEl.load();
          if (onReady) onReady();
        });
      return { destroy() { if (hls) hls.destroy(); } };
    }
    videoEl.src = src;
    videoEl.load();
    if (onReady) onReady();
    return { destroy() {} };
  }

  function initVideoModal() {
    const modal = $('#video-modal');
    if (!modal) return;

    const video = $('.modal__video', modal);
    const placeholder = $('.modal__placeholder', modal);
    const placeholderTitle = $('.modal__placeholder-title', modal);
    const title = $('#video-modal-title', modal);
    const closeBtn = $('.modal__close', modal);

    let lastTrigger = null;
    let currentId = 'video';
    let playFired = false;
    let hlsHandle = null;

    function detachHls() {
      if (hlsHandle) { hlsHandle.destroy(); hlsHandle = null; }
    }

    function attachSource(src) {
      detachHls();
      // User-initiated, so sound is allowed; still never autoplays on page load.
      hlsHandle = attachVideoSource(video, src, () => video.play().catch(() => {}));
    }

    function open(trigger) {
      lastTrigger = trigger;
      currentId = trigger.dataset.videoId || 'video';
      playFired = false;

      const src = trigger.dataset.videoSrc || '';
      const poster = trigger.dataset.videoPoster || '';
      const captions = trigger.dataset.videoCaptions || '';
      const label = trigger.dataset.videoTitle || 'Video';

      title.textContent = label;
      modal.hidden = false;
      // overflow:hidden alone lets iOS Safari still rubber-band-scroll the
      // page behind a fixed modal; pinning body to the current scroll offset
      // is what actually stops it (restored in close()).
      document.body.dataset.scrollLockY = String(window.scrollY);
      document.body.style.top = `-${window.scrollY}px`;
      document.body.classList.add('is-locked');
      // The hero's ambient loop may be the same clip, mid-playback — pause it
      // so its audio can't overlap the modal's.
      document.dispatchEvent(new CustomEvent('comfynap:modalopen'));

      if (src) {
        placeholder.hidden = true;
        video.hidden = false;
        video.replaceChildren();
        if (captions) {
          const track = document.createElement('track');
          track.kind = 'captions';
          track.src = captions;
          track.srclang = 'en';
          track.label = 'English';
          track.default = true;
          video.appendChild(track);
        }
        if (poster) video.poster = poster; else video.removeAttribute('poster');
        attachSource(src);
      } else {
        video.hidden = true;
        placeholder.hidden = false;
        placeholderTitle.textContent = label;
        Analytics.track('video_play', { video_id: currentId, placeholder: true });
      }

      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      if (modal.hidden) return;
      modal.hidden = true;
      document.body.classList.remove('is-locked');
      document.body.style.top = '';
      // instant, not the page's default smooth scroll-behavior — restoring
      // position should be invisible, not an animated jump
      window.scrollTo({ top: parseInt(document.body.dataset.scrollLockY || '0', 10), behavior: 'instant' });
      delete document.body.dataset.scrollLockY;
      if (!video.hidden) {
        video.pause();
        detachHls();
        video.removeAttribute('src');
        video.replaceChildren();
        video.load();
      }
      // preventScroll: focusing the trigger must not itself re-trigger a
      // (smooth, animated) scroll-into-view that fights the restore above.
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
      document.dispatchEvent(new CustomEvent('comfynap:modalclose'));
    }

    video.addEventListener('play', () => {
      if (playFired) return;
      playFired = true;
      Analytics.track('video_play', { video_id: currentId });
    });
    video.addEventListener('ended', () => Analytics.track('video_complete', { video_id: currentId }));

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-video-trigger]');
      if (trigger) { e.preventDefault(); open(trigger); return; }
      if (e.target.closest('[data-modal-close]')) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    // Keep focus inside the dialog
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = $$('button, [href], video, [tabindex]:not([tabindex="-1"])', modal)
        .filter((el) => !el.hidden && el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ------------------------------------------------------------------
     Hero autoplay
     The lead gallery slide loops silently in place of its static poster —
     motion reads as more attention-grabbing than a photo for cold ad
     traffic. Kept deliberately safe for performance and access:
       - muted + loop + playsinline, so it satisfies every browser's
         autoplay-without-a-gesture policy on its own (no sound ever
         starts without a click, matching the "no autoplay sound" rule).
       - the network fetch is deferred until just after window 'load', so
         it never competes with the LCP poster image, fonts or CSS.
       - skipped entirely for prefers-reduced-motion: the static poster
         and the existing click-to-play-with-sound button still work.
       - paused whenever its slide isn't the active one (see the
         'comfynap:slidechange' event dispatched by initGallery), so it
         isn't decoding frames no one can see.
       - does not fire the video_play analytics event — that's reserved
         for someone actually choosing to watch (the modal, with sound).
     ------------------------------------------------------------------ */
  // Shared by every ambient video on the page (hero + "How ComfyNap Works" +
  // any future one): no browser allows audible autoplay on page load, so the
  // closest real equivalent to "sound as soon as it starts" is unmuting on
  // the very first click/tap/keypress anywhere on the page — the same
  // pattern X/Twitter and Instagram use for feed video. One shared listener
  // (not one per video) means a video that starts *after* the visitor has
  // already interacted begins unmuted immediately, and one that's already
  // playing gets unmuted the moment that first interaction happens.
  let pageHasBeenInteractedWith = false;
  const ambientVideosAwaitingInteraction = [];
  function markPageInteracted() {
    pageHasBeenInteractedWith = true;
    ambientVideosAwaitingInteraction.splice(0).forEach((v) => { v.muted = false; });
  }
  ['click', 'keydown', 'touchend'].forEach((type) =>
    document.addEventListener(type, markPageInteracted, { once: true, passive: true }));

  // toggleHidden uses setAttribute/removeAttribute rather than el.hidden=… —
  // `hidden` is a reflected IDL property on HTMLElement but NOT reliably on
  // SVGElement; setting .hidden on an <svg> silently does nothing in this
  // browser (no attribute change, no re-render), which is why a pair of
  // <svg> status icons wouldn't swap when driven that way.
  function toggleHidden(node, isHidden) {
    if (!node) return;
    if (isHidden) node.setAttribute('hidden', '');
    else node.removeAttribute('hidden');
  }

  // One ambient (silent-until-interacted, pauses off-screen) looping video.
  // `el` is the figure carrying [data-ambient-video]; if it sits inside a
  // gallery slide, playback also gates on that slide being the active one.
  function initAmbientVideo(el) {
    const video = $('video', el);
    const src = video && video.dataset.src;
    if (!video || !src) return;

    let started = false;
    let hlsHandle = null;
    const slide = el.closest('[data-gallery-slide]');
    const muteBtn = $('[data-mute-toggle]', el);
    const iconMuted = muteBtn && $('[data-mute-icon-muted]', muteBtn);
    const iconSound = muteBtn && $('[data-mute-icon-sound]', muteBtn);

    // Single source of truth: the video's own `muted` property. Listening
    // for its native volumechange event (rather than updating the icon
    // inside every place that touches .muted) keeps it right regardless of
    // what changed it — the toggle button or the first-interaction unmute.
    function syncMuteIcon() {
      if (!muteBtn) return;
      const isMuted = video.muted;
      muteBtn.setAttribute('aria-pressed', String(isMuted));
      muteBtn.setAttribute('aria-label', isMuted ? 'Unmute video' : 'Mute video');
      toggleHidden(iconMuted, !isMuted);
      toggleHidden(iconSound, isMuted);
    }
    if (muteBtn) {
      video.addEventListener('volumechange', syncMuteIcon);
      muteBtn.addEventListener('click', () => { video.muted = !video.muted; });
    }

    // Three independent reasons the loop should be playing right now.
    // Scrolling the whole page away is exactly as valid a reason to stop as
    // switching gallery slides or opening the modal — sync() re-evaluates
    // all three together instead of each event handler guessing the others.
    const gate = { isActiveSlide: true, modalOpen: false, inView: false };

    function sync() {
      if (!started) return;
      const shouldPlay = gate.isActiveSlide && !gate.modalOpen && gate.inView;
      if (shouldPlay && video.paused) video.play().catch(() => {});
      else if (!shouldPlay && !video.paused) video.pause();
    }

    function start() {
      if (started) return;
      started = true;
      video.loop = true;
      video.playsInline = true;
      if (pageHasBeenInteractedWith) video.muted = false;
      else { video.muted = true; ambientVideosAwaitingInteraction.push(video); }
      hlsHandle = attachVideoSource(video, src, () => sync());
    }

    video.addEventListener('playing', () => {
      el.classList.add('is-playing');
      if (muteBtn) muteBtn.hidden = false;
    }, { once: true });

    if (slide) {
      document.addEventListener('comfynap:slidechange', (e) => {
        gate.isActiveSlide = !!(e.detail && e.detail.activeSlide === slide);
        sync();
      });
    }

    // Any video opened in the shared modal could otherwise play at the same
    // time as this ambient loop (including the same clip) — always pause the
    // loop first, resume (if every other gate still allows it) on close.
    document.addEventListener('comfynap:modalopen', () => { gate.modalOpen = true; sync(); });
    document.addEventListener('comfynap:modalclose', () => { gate.modalOpen = false; sync(); });

    // Drives both when playback starts at all (the first time this video is
    // actually scrolled into view — for anything below the fold, that's also
    // exactly when it's correct to begin the network fetch, not sooner) and
    // when it pauses/resumes on every visit after that.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        gate.inView = entries[0].isIntersecting;
        if (gate.inView && !started) {
          const kickoff = () => (window.requestIdleCallback ? window.requestIdleCallback(start, { timeout: 2000 }) : setTimeout(start, 300));
          if (document.readyState === 'complete') kickoff();
          else window.addEventListener('load', kickoff, { once: true });
        }
        sync();
      }, { threshold: 0.15 }).observe(el);
    }

    window.addEventListener('pagehide', () => { if (hlsHandle) hlsHandle.destroy(); }, { once: true });
  }

  function initAmbientVideos() {
    if (reducedMotion) return;
    $$('[data-ambient-video]').forEach(initAmbientVideo);
  }

  /* ------------------------------------------------------------------
     Sticky Add to Cart bar (mobile + desktop) — shows whenever the buy
     box's own button isn't on screen, hides when the final CTA is visible
     ------------------------------------------------------------------ */
  function initStickyCta() {
    const bar = $('#sticky-cta');
    const heroBtn = $('[data-cta-location="hero"][data-add-to-cart]');
    const finalCta = $('#final-cta');
    if (!bar || !heroBtn || !('IntersectionObserver' in window)) return;

    // Shows whenever the buy box's own Add to Cart button isn't on screen —
    // including on first load, when a tall gallery pushes it below the fold —
    // not just after scrolling past it. Otherwise mobile has no visible CTA
    // at all until the whole buy box has scrolled by.
    let btnHidden = false;
    let finalVisible = false;
    const apply = () => bar.classList.toggle('is-visible', btnHidden && !finalVisible);

    new IntersectionObserver((entries) => {
      btnHidden = !entries[0].isIntersecting;
      apply();
    }, { threshold: 0 }).observe(heroBtn);

    if (finalCta) {
      new IntersectionObserver((entries) => {
        finalVisible = entries[0].isIntersecting;
        apply();
      }, { threshold: 0.15 }).observe(finalCta);
    }
  }

  /* ------------------------------------------------------------------
     Color swatches — the buy box and the sticky bar each carry a set, and
     picking in either keeps the other in step. Records the preferred
     colorway only; there's no full photo set per color yet, so nothing
     else on the page changes.
     ------------------------------------------------------------------ */
  function initColorSwatches() {
    const groups = $$('[data-color-swatches]');
    if (!groups.length) return;
    const nameLabels = $$('[data-color-name]');

    function select(color) {
      groups.forEach((group) => {
        $$('.swatch-dot', group).forEach((d) => {
          const on = d.dataset.color === color;
          d.classList.toggle('is-selected', on);
          d.setAttribute('aria-pressed', String(on));
        });
      });
      nameLabels.forEach((el) => { el.textContent = color; });
    }

    groups.forEach((group) => {
      $$('.swatch-dot', group).forEach((dot) => {
        dot.addEventListener('click', () => {
          select(dot.dataset.color);
          Analytics.track('color_select', { color: dot.dataset.color });
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */
  function initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     Scroll depth
     ------------------------------------------------------------------ */
  function initScrollDepth() {
    const marks = [25, 50, 75];
    const fired = new Set();
    let scheduled = false;

    const check = () => {
      scheduled = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = (window.scrollY / max) * 100;
      marks.forEach((m) => {
        if (pct >= m && !fired.has(m)) {
          fired.add(m);
          Analytics.track('scroll_' + m, { percent: m });
        }
      });
    };
    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(check);
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     CTAs and prototype cart
     Every [data-cta-location] click fires "<location>_cta_click".
     [data-add-to-cart] also fires add_to_cart and shows the toast.
     Shopify: replace the toast with fetch('/cart/add.js', …) using
     PRODUCT.variantId, then open the theme's cart drawer.
     ------------------------------------------------------------------ */
  function initCtas() {
    const toast = $('#cart-toast');
    const countEl = toast ? $('[data-cart-count]', toast) : null;
    let cartQty = 0;
    let toastTimer = null;

    const showToast = () => {
      if (!toast) return;
      if (countEl) countEl.textContent = String(cartQty);
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
    };

    document.addEventListener('click', (e) => {
      const cta = e.target.closest('[data-cta-location]');
      if (!cta) return;
      const location = cta.dataset.ctaLocation;
      Analytics.track(location + '_cta_click', { cta_location: location, cta_text: cta.textContent.trim() });

      if (cta.hasAttribute('data-add-to-cart')) {
        e.preventDefault();
        cartQty += 1;
        Analytics.track('add_to_cart', Analytics.itemPayload({ cta_location: location }));
        showToast();
      }
    });

    const checkout = $('[data-checkout]');
    if (checkout) {
      checkout.addEventListener('click', (e) => {
        e.preventDefault(); // prototype only: remove when /checkout exists
        Analytics.track('begin_checkout', Analytics.itemPayload());
        if (toast) toast.hidden = true;
      });
    }
  }

  /* ------------------------------------------------------------------
     Misc
     ------------------------------------------------------------------ */
  function initMisc() {
    $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

    // Duration chip on every video trigger that declares data-video-duration
    $$('[data-video-trigger][data-video-duration]').forEach((trigger) => {
      const media = trigger.closest('.media');
      if (!media || $('.media__duration', media)) return;
      const chip = document.createElement('span');
      chip.className = 'media__duration';
      chip.textContent = trigger.dataset.videoDuration;
      chip.setAttribute('aria-hidden', 'true');
      media.appendChild(chip);
    });
  }

  /* ------------------------------------------------------------------
     Buy box: bundle tiers. Recomputes PRODUCT.price so every price
     display (buy box, button, sticky bar) and the analytics payload stay
     in sync with the selected tier. The eye mask ships free with every
     order, so there is no paid add-on to add into the total.
     ------------------------------------------------------------------ */
  function initBuyBox() {
    const buy = $('.buy[data-product]');
    if (!buy) return;

    const priceDisplays = $$('[data-price-display]');
    const tiers = $$('[data-tier]', buy);

    function selectedTier() {
      return tiers.find((t) => $('input', t).checked) || tiers[0];
    }

    function recalc() {
      const tier = selectedTier();
      if (!tier) return;
      const total = parseFloat(tier.dataset.tierPrice || '0');

      PRODUCT.price = total;
      buy.dataset.price = total.toFixed(2);
      priceDisplays.forEach((el) => { el.textContent = '$' + total.toFixed(2); });
    }

    tiers.forEach((tier) => {
      const input = $('input', tier);
      if (!input) return;
      input.addEventListener('change', () => {
        tiers.forEach((t) => t.classList.toggle('is-selected', t === tier));
        recalc();
        Analytics.track('bundle_select', { qty: tier.dataset.qty, tier_price: tier.dataset.tierPrice });
      });
    });

    recalc();
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  initHeader();
  initGallery();
  initCarousels();
  initFaq();
  initVideoModal();
  initAmbientVideos();
  initStickyCta();
  initColorSwatches();
  initReveal();
  initScrollDepth();
  initCtas();
  initBuyBox();
  initMisc();

  Analytics.track('view_item', Analytics.itemPayload());
})();
