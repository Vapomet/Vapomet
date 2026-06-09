document.documentElement.classList.add('js');

// Sticky header shadow on scroll + back-to-top visibility
const header    = document.getElementById('header');
const backToTop = document.getElementById('backToTop');

function updateScrollState() {
  header.classList.toggle('scrolled', window.scrollY > 8);
  backToTop.classList.toggle('visible', window.scrollY > 400);
}

window.addEventListener('scroll', updateScrollState, { passive: true });
// Initialize immediately so hash-navigation page loads show the button correctly
updateScrollState();

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Mobile hamburger toggle
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  hamburger.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', String(open));
});

function closeNav() {
  navLinks.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeNav);
});

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) closeNav();
});

// Close on click outside the nav
document.addEventListener('click', e => {
  if (navLinks.classList.contains('open') &&
      !navLinks.contains(e.target) &&
      !hamburger.contains(e.target)) {
    closeNav();
  }
});

// Active nav highlight on scroll
const anchors  = document.querySelectorAll('section[id], .hero[id], .anchor-offset[id]');
const navItems = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navItems.forEach(a => {
        const active = a.getAttribute('href') === `#${id}`;
        a.classList.toggle('active', active);
        if (active) {
          a.setAttribute('aria-current', 'page');
        } else {
          a.removeAttribute('aria-current');
        }
      });
    }
  });
}, { threshold: 0.25, rootMargin: '-64px 0px 0px 0px' });

anchors.forEach(el => sectionObserver.observe(el));

// Scroll reveal
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Publication search
const publicationSearch = document.getElementById('publicationSearch');
const publicationCount  = document.getElementById('publicationCount');
const publicationEmpty  = document.getElementById('publicationEmpty');
const publicationCards  = Array.from(document.querySelectorAll('.publication-card'));

function updatePublicationFilter() {
  if (!publicationSearch || !publicationCount) return;

  const query = publicationSearch.value.trim().toLowerCase();
  let visible = 0;

  publicationCards.forEach(card => {
    const match = card.textContent.toLowerCase().includes(query);
    card.hidden = !match;
    if (match) visible += 1;
  });

  publicationCount.textContent = `${visible} publication${visible === 1 ? '' : 's'}`;
  if (publicationEmpty) publicationEmpty.hidden = visible !== 0;
}

if (publicationSearch) {
  publicationSearch.addEventListener('input', updatePublicationFilter);
  updatePublicationFilter();
}

// Copy contact email
const copyEmailButton = document.querySelector('[data-copy]');
const copyStatus = document.getElementById('copyStatus');

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.setAttribute('aria-hidden', 'true');
  field.tabIndex = -1;
  field.className = 'copy-buffer';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();

  if (!copied) throw new Error('Copy failed');
}

if (copyEmailButton && copyStatus) {
  copyEmailButton.addEventListener('click', async () => {
    const value = copyEmailButton.getAttribute('data-copy') || '';

    try {
      await copyText(value);
      copyStatus.textContent = 'Email copied.';
      copyStatus.classList.remove('error');
    } catch {
      copyStatus.textContent = 'Copy failed. Select the email address manually.';
      copyStatus.classList.add('error');
    }

    setTimeout(() => {
      copyStatus.textContent = '';
      copyStatus.classList.remove('error');
    }, 4000);
  });
}

// Contact form: validation + honeypot + rate-limit
const form       = document.getElementById('contactForm');
const successEl  = document.getElementById('formSuccess');
const honeypot   = document.getElementById('website');
let lastSubmit   = 0;
const RATE_LIMIT = 15000; // ms between allowed submissions

function validate() {
  let ok = true;

  form.querySelectorAll('[required]').forEach(field => {
    const group = field.closest('.form-group');
    if (!group) return; // skip honeypot
    const empty = !field.value.trim();
    let invalid = empty;

    if (field.type === 'email' && !empty) {
      invalid = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
    }

    group.classList.toggle('has-error', invalid);
    field.classList.toggle('error', invalid);
    field.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    if (invalid) ok = false;
  });

  return ok;
}

form.addEventListener('submit', e => {
  e.preventDefault();
  successEl.textContent = '';

  // Honeypot check - bots fill hidden fields
  if (honeypot && honeypot.value.trim() !== '') return;

  const now = Date.now();
  if (now - lastSubmit < RATE_LIMIT) return;

  if (!validate()) return;

  const btn = form.querySelector('.btn-submit');
  btn.disabled = true;
  btn.textContent = 'Opening...';

  const data = new FormData(form);
  const firstName = String(data.get('firstName') || '').trim();
  const lastName = String(data.get('lastName') || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const email = String(data.get('email') || '').trim();
  const company = String(data.get('company') || '').trim();
  const message = String(data.get('message') || '').trim();
  const subject = `Vapometallurgy inquiry from ${fullName}`;
  const body = [
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Company: ${company}`,
    '',
    message
  ].join('\n');
  const mailtoUrl = `mailto:vbarahim@uwaterloo.ca?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  if (mailtoUrl.length > 1900) {
    successEl.textContent = 'Please shorten the message before opening an email draft.';
    btn.disabled = false;
    btn.textContent = 'Open email draft';
    return;
  }

  lastSubmit = now;
  window.location.href = mailtoUrl;
  successEl.textContent = 'Your email app should open with a prepared message.';

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Open email draft';
    setTimeout(() => { successEl.textContent = ''; }, 6000);
  }, 800);
});

// Live clear error state while typing
form.querySelectorAll('input, textarea').forEach(field => {
  field.addEventListener('input', () => {
    field.classList.remove('error');
    field.setAttribute('aria-invalid', 'false');
    const group = field.closest('.form-group');
    if (group) group.classList.remove('has-error');
  });
});

// Message character counter
const messageField   = document.getElementById('message');
const messageCounter = document.getElementById('messageCounter');

if (messageField && messageCounter) {
  const MAX = parseInt(messageField.getAttribute('maxlength'), 10) || 2000;

  messageField.addEventListener('input', () => {
    const remaining = MAX - messageField.value.length;
    messageCounter.textContent = `${remaining} character${remaining === 1 ? '' : 's'} remaining`;
    messageCounter.classList.toggle('warning', remaining < 200 && remaining >= 50);
    messageCounter.classList.toggle('danger',  remaining < 50);
  });
}
