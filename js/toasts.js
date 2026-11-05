/**
 * One Desk - app-style notifications.
 *
 * Stacked notification cards: top-right on desktop, a top banner on mobile.
 * Each card has an icon, a short title, a readable message, a close button and a
 * thin countdown bar. Hovering (or touching) pauses the countdown; swiping
 * sideways or up dismisses it. Repeats of the same message bump a "×2" counter
 * instead of stacking copies.
 *
 * The app's existing `toast(msg, type, onClickOrDuration, duration)` and
 * `dismissToast()` functions forward here, so every caller gets this look.
 *
 * Public API: window.OneDeskToast.show(msg, type, { onClick, duration })
 *             window.OneDeskToast.dismissAll()
 */
(function () {
  'use strict';

  const MAX_VISIBLE = 4;
  const DEFAULT_DURATION = 3500;
  const EXIT_MS = 220;

  const TYPES = {
    success: { title: 'Done', icon: 'solar:check-circle-bold' },
    error: { title: "Something's not right", icon: 'solar:danger-circle-bold' },
    warning: { title: 'Heads up', icon: 'solar:danger-triangle-bold' },
    info: { title: 'Notification', icon: 'solar:bell-bing-bold' },
  };

  let stack = null;
  const live = new Map(); // key -> toast record

  function getStack() {
    if (stack && document.body.contains(stack)) return stack;
    stack = document.createElement('div');
    stack.id = 'od-toast-stack';
    stack.className = 'od-toast-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-label', 'Notifications');
    // A popover sits in the browser's top layer, so notifications stay visible
    // above open modal dialogs.
    if (typeof stack.showPopover === 'function') stack.setAttribute('popover', 'manual');
    document.body.appendChild(stack);
    return stack;
  }

  function isOpenPopover(el) {
    try { return el.matches(':popover-open'); } catch (e) { return false; }
  }

  // Show the stack, and move it above any modal dialog that opened after it.
  function raiseStack() {
    const s = getStack();
    if (!s.hasAttribute('popover')) return;
    try {
      const modalOpen = !!document.querySelector('dialog[open]:modal');
      if (isOpenPopover(s) && modalOpen) s.hidePopover();
      if (!isOpenPopover(s)) s.showPopover();
    } catch (e) { /* not supported - falls back to z-index */ }
  }

  function hideStackIfEmpty() {
    if (!stack || live.size > 0) return;
    try { if (isOpenPopover(stack)) stack.hidePopover(); } catch (e) { }
  }

  // "Failed to save lead: network error" -> title "Failed to save lead", body "network error"
  function splitTitle(msg, type) {
    const text = String(msg == null ? '' : msg).trim();
    const idx = text.indexOf(': ');
    if (idx > 0 && idx <= 48) {
      const head = text.slice(0, idx).trim();
      const body = text.slice(idx + 2).trim();
      if (body && !/[.!?]$/.test(head)) return { title: head, body };
    }
    return { title: (TYPES[type] || TYPES.info).title, body: text };
  }

  // Longer messages and errors stay up a little longer so they can be read.
  function readingTime(text, type, base) {
    const words = text.split(/\s+/).filter(Boolean).length;
    let ms = Math.max(base, 2500 + words * 220);
    if (type === 'error') ms = Math.max(ms, 5000);
    return Math.min(ms, Math.max(10000, base));
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function build(rec) {
    const { type, title, body, onClick } = rec;
    const card = el('div', `od-toast od-toast--${type} is-entering`);
    card.setAttribute('role', type === 'error' ? 'alert' : 'status');
    if (onClick) card.classList.add('is-clickable');

    const iconWrap = el('div', 'od-toast__icon');
    const icon = document.createElement('iconify-icon');
    icon.setAttribute('icon', (TYPES[type] || TYPES.info).icon);
    icon.setAttribute('width', '20');
    iconWrap.appendChild(icon);

    const content = el('div', 'od-toast__content');
    const head = el('div', 'od-toast__head');
    head.appendChild(el('p', 'od-toast__title', title));
    const count = el('span', 'od-toast__count');
    head.appendChild(count);
    head.appendChild(el('span', 'od-toast__time', 'now'));
    content.appendChild(head);
    if (body) content.appendChild(el('p', 'od-toast__msg', body));

    const close = el('button', 'od-toast__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.innerHTML = '<iconify-icon icon="solar:close-circle-linear" width="18"></iconify-icon>';
    close.addEventListener('click', (e) => { e.stopPropagation(); dismiss(rec); });

    const bar = el('div', 'od-toast__bar');
    const fill = el('div', 'od-toast__bar-fill');
    bar.appendChild(fill);

    card.append(iconWrap, content, close, bar);
    card.addEventListener('animationend', () => card.classList.remove('is-entering'), { once: true });

    if (onClick) {
      card.addEventListener('click', (e) => {
        if (rec.swiped) return;
        try { onClick(e); } finally { dismiss(rec); }
      });
    }

    // Pause the countdown while the pointer is over the card.
    card.addEventListener('mouseenter', () => pause(rec));
    card.addEventListener('mouseleave', () => resume(rec));
    attachSwipe(card, rec);

    rec.card = card;
    rec.fill = fill;
    rec.countEl = count;
    return card;
  }

  function attachSwipe(card, rec) {
    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.od-toast__close')) return;
      dragging = true; dx = dy = 0; startX = e.clientX; startY = e.clientY;
      rec.swiped = false;
      pause(rec);
    });
    card.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dx = e.clientX - startX; dy = Math.min(0, e.clientY - startY);
      if (Math.abs(dx) > 6 || dy < -6) {
        rec.swiped = true;
        try { card.setPointerCapture(e.pointerId); } catch (err) { }
        card.style.transition = 'none';
        card.style.transform = `translate(${dx}px, ${dy}px)`;
        card.style.opacity = String(Math.max(0.2, 1 - (Math.abs(dx) + Math.abs(dy)) / 260));
      }
    });
    const end = () => {
      if (!dragging) return;
      dragging = false;
      card.style.transition = '';
      if (Math.abs(dx) > 90 || dy < -50) {
        card.style.transform = dy < -50
          ? 'translateY(-120%)'
          : `translateX(${dx > 0 ? 120 : -120}%)`;
        card.style.opacity = '0';
        dismiss(rec, true);
      } else {
        card.style.transform = '';
        card.style.opacity = '';
        resume(rec);
      }
      // Let the click handler see `swiped` before clearing it.
      setTimeout(() => { rec.swiped = false; }, 0);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }

  function startTimer(rec) {
    clearTimeout(rec.timer);
    rec.startedAt = Date.now();
    rec.fill.style.transition = 'none';
    rec.fill.style.transform = `scaleX(${rec.remaining / rec.duration})`;
    // Force a reflow so the bar animates from its current width.
    void rec.fill.offsetWidth;
    rec.fill.style.transition = `transform ${rec.remaining}ms linear`;
    rec.fill.style.transform = 'scaleX(0)';
    rec.timer = setTimeout(() => dismiss(rec), rec.remaining);
  }

  function pause(rec) {
    if (rec.paused || rec.closing) return;
    rec.paused = true;
    clearTimeout(rec.timer);
    rec.remaining = Math.max(0, rec.remaining - (Date.now() - rec.startedAt));
    const scale = rec.remaining / rec.duration;
    rec.fill.style.transition = 'none';
    rec.fill.style.transform = `scaleX(${scale})`;
  }

  function resume(rec) {
    if (!rec.paused || rec.closing) return;
    rec.paused = false;
    rec.remaining = Math.max(rec.remaining, 1200);
    startTimer(rec);
  }

  function dismiss(rec, alreadyAnimating) {
    if (!rec || rec.closing) return;
    rec.closing = true;
    clearTimeout(rec.timer);
    live.delete(rec.key);
    const card = rec.card;
    if (!alreadyAnimating) card.classList.add('is-leaving');
    // Collapse the card's height so the ones below slide up smoothly.
    card.style.maxHeight = card.offsetHeight + 'px';
    requestAnimationFrame(() => {
      card.classList.add('is-collapsing');
    });
    setTimeout(() => {
      card.remove();
      hideStackIfEmpty();
    }, EXIT_MS + 160);
  }

  function show(msg, type, opts) {
    type = TYPES[type] ? type : 'info';
    opts = opts || {};
    const { title, body } = splitTitle(msg, type);
    const key = `${type}|${title}|${body}`;

    // Same message already on screen: bump its counter and restart its timer.
    const existing = live.get(key);
    if (existing && !existing.closing) {
      existing.repeats += 1;
      existing.countEl.textContent = `×${existing.repeats}`;
      existing.card.classList.remove('is-bumped');
      void existing.card.offsetWidth;
      existing.card.classList.add('is-bumped');
      existing.remaining = existing.duration;
      existing.paused = false;
      startTimer(existing);
      raiseStack();
      return existing;
    }

    const duration = opts.explicitDuration
      ? opts.duration
      : readingTime(body, type, opts.duration || DEFAULT_DURATION);

    const rec = {
      key, type, title, body,
      onClick: typeof opts.onClick === 'function' ? opts.onClick : null,
      duration, remaining: duration, repeats: 1,
      timer: null, paused: false, closing: false, swiped: false,
    };

    const s = getStack();
    s.prepend(build(rec));
    live.set(key, rec);

    // Keep the stack short: drop the oldest beyond the limit.
    const recs = Array.from(live.values()).filter((r) => !r.closing);
    if (recs.length > MAX_VISIBLE) {
      recs.slice(0, recs.length - MAX_VISIBLE).forEach((r) => dismiss(r));
    }

    raiseStack();
    startTimer(rec);
    return rec;
  }

  function dismissAll() {
    Array.from(live.values()).forEach((r) => dismiss(r));
  }

  window.OneDeskToast = { show, dismissAll };
})();
