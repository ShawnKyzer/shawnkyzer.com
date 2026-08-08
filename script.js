document.documentElement.classList.add('js');

const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('#nav-links');
const year = document.querySelector('#year');
const revealItems = document.querySelectorAll('[data-reveal]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mainEl = document.querySelector('#main');
const siteFooter = document.querySelector('.site-footer');

if (year) {
  year.textContent = new Date().getFullYear();
}

// ---------------------------------------------------------------------------
// Mobile navigation
// ---------------------------------------------------------------------------
function closeNav() {
  if (!navLinks || !navToggle) return;
  navLinks.classList.remove('is-open');
  document.body.classList.remove('nav-open');
  navToggle.setAttribute('aria-expanded', 'false');
  if (mainEl) mainEl.removeAttribute('inert');
  if (siteFooter) siteFooter.removeAttribute('inert');
}

function openNav() {
  if (!navLinks || !navToggle) return;
  navLinks.classList.add('is-open');
  document.body.classList.add('nav-open');
  navToggle.setAttribute('aria-expanded', 'true');
  if (mainEl) mainEl.setAttribute('inert', '');
  if (siteFooter) siteFooter.setAttribute('inert', '');
  const firstLink = navLinks.querySelector('a');
  if (firstLink) firstLink.focus();
}

function toggleNav() {
  if (!navLinks || !navToggle) return;
  const isOpen = navLinks.classList.contains('is-open');
  isOpen ? closeNav() : openNav();
}

if (navToggle && navLinks) {
  navToggle.addEventListener('click', toggleNav);

  navLinks.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      closeNav();
    }
  });

  // Close on backdrop/outside click
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (
      navLinks.classList.contains('is-open') &&
      !navLinks.contains(target) &&
      !navToggle.contains(target)
    ) {
      closeNav();
    }
  });

  // Never leave the menu (and its overflow lock) stuck past the breakpoint
  window.matchMedia('(min-width: 761px)').addEventListener('change', (event) => {
    if (event.matches) closeNav();
  });

  // Close on Escape + focus trap
  document.addEventListener('keydown', (event) => {
    if (!navLinks.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeNav();
      navToggle.focus();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = [navToggle, ...navLinks.querySelectorAll('a')].filter(Boolean);
      if (focusable.length < 2) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Scrollspy: highlight active nav link (IntersectionObserver)
// ---------------------------------------------------------------------------
const navAnchors = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
const sections = Array.from(document.querySelectorAll('main section[id]'));

if (sections.length && navAnchors.length) {
  const intersecting = new Set();

  const setActiveNav = (activeId) => {
    navAnchors.forEach((anchor) => {
      const href = anchor.getAttribute('href').slice(1);
      if (href === activeId) {
        anchor.setAttribute('aria-current', 'true');
      } else {
        anchor.removeAttribute('aria-current');
      }
    });
  };

  const spyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          intersecting.add(entry.target);
        } else {
          intersecting.delete(entry.target);
        }
      });

      let active = null;
      intersecting.forEach((section) => {
        if (!active || section.getBoundingClientRect().top < active.getBoundingClientRect().top) {
          active = section;
        }
      });

      if (active) {
        setActiveNav(active.id);
      }
    },
    { rootMargin: '-33% 0px -66% 0px', threshold: 0 }
  );

  sections.forEach((section) => spyObserver.observe(section));
}

// ---------------------------------------------------------------------------
// Reveal on scroll
// ---------------------------------------------------------------------------
if (prefersReducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach((item) => item.classList.add('is-visible'));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

// ---------------------------------------------------------------------------
// Terminal typing animation
// Commands type character by character; output lines print instantly.
// Ends on a live prompt with a blinking caret. No-JS / reduced-motion:
// everything renders statically (JS adds .typing only when animating).
// ---------------------------------------------------------------------------
const typer = document.querySelector('[data-typer]');

if (typer && !prefersReducedMotion) {
  const lines = Array.from(typer.querySelectorAll('.tl'));
  const body = typer.querySelector('.term-body');
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');

  typer.classList.add('typing');

  const TYPE_MS = 26;
  const TYPE_JITTER = 34;
  const AFTER_CMD_MS = 320;
  const AFTER_OUT_MS = 90;

  let lineIndex = 0;

  function finishLine(delay) {
    lineIndex += 1;
    setTimeout(runLine, delay);
  }

  function runLine() {
    if (lineIndex >= lines.length) {
      // settle on a fresh prompt with a blinking caret
      const idle = document.createElement('span');
      idle.className = 'tl printed';
      const prompt = typer.querySelector('[data-cmd]');
      if (prompt) {
        const clone = prompt.cloneNode(true);
        const cmdText = clone.querySelector('.cmd-text');
        if (cmdText) cmdText.remove();
        idle.innerHTML = clone.innerHTML;
      }
      idle.appendChild(caret);
      caret.classList.add('blink');
      if (body) body.appendChild(idle);
      return;
    }

    const line = lines[lineIndex];
    line.classList.add('printed');

    const cmd = line.querySelector('.cmd-text');
    if (!cmd) {
      finishLine(AFTER_OUT_MS);
      return;
    }

    const text = cmd.textContent;
    cmd.textContent = '';
    line.appendChild(caret);

    let charIndex = 0;
    (function tick() {
      charIndex += 1;
      cmd.textContent = text.slice(0, charIndex);
      if (charIndex < text.length) {
        setTimeout(tick, TYPE_MS + Math.random() * TYPE_JITTER);
      } else {
        finishLine(AFTER_CMD_MS);
      }
    })();
  }

  setTimeout(runLine, 600);
}
