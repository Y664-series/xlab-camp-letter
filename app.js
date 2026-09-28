const screens = ['envelope-screen', 'letter-screen', 'timeline-screen', 'ending-screen'];
const envelope = document.getElementById('open-letter');
let opening = false;
const timelineItems = [...document.querySelectorAll('.timeline li')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let timelineObserver;
let timelineScrollStart;
const photoDeck = document.getElementById('photo-deck');
let photoObserver;
let photoRun = 0;
function preparePhotoDrop() {
  photoDeck.classList.remove('landed');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    photoDeck.classList.add('landed');
    return;
  }
  const run = photoRun;
  photoObserver = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    photoObserver.disconnect();
    Promise.all([...photoDeck.querySelectorAll('img')].map(img => img.decode().catch(() => {}))).then(() => {
      if (run === photoRun) photoDeck.classList.add('landed');
    });
  }, { threshold: 0.25 });
  photoObserver.observe(photoDeck);
}
function stopTimelineReveal() {
  photoObserver?.disconnect();
  photoRun++;
  timelineObserver?.disconnect();
  if (timelineScrollStart) window.removeEventListener('scroll', timelineScrollStart);
  timelineScrollStart = null;
}
function revealTimeline() {
  stopTimelineReveal();
  preparePhotoDrop();
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    timelineItems.forEach(item => item.classList.remove('awaiting-reveal'));
    return;
  }
  timelineItems.forEach((item, index) => item.classList.toggle('awaiting-reveal', index >= 3));
  timelineObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('awaiting-reveal');
      timelineObserver.unobserve(entry.target);
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
  const entryScrollY = window.scrollY;
  timelineScrollStart = () => {
    if (window.scrollY <= entryScrollY + 8) return;
    window.removeEventListener('scroll', timelineScrollStart);
    timelineScrollStart = null;
    timelineItems.slice(3).forEach(item => timelineObserver.observe(item));
  };
  window.addEventListener('scroll', timelineScrollStart, { passive: true });
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    stopTimelineReveal();
    photoDeck.classList.add('landed');
    timelineItems.forEach(item => item.classList.remove('awaiting-reveal'));
  }
});
function showScreen(id) {
  const endingTitle = document.getElementById('ending-title');
  endingTitle.classList.remove('typing');
  if (id === 'ending-screen') {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!document.getElementById('ending-screen').hidden) endingTitle.classList.add('typing');
    }));
  }
  for (const screenId of screens) {
    const el = document.getElementById(screenId);
    el.hidden = screenId !== id;
    el.classList.toggle('enter', screenId === id);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (id === 'timeline-screen') revealTimeline();
  else stopTimelineReveal();
  const heading = document.querySelector('#' + id + ' h2');
  if (heading) heading.focus({ preventScroll: true });
}
envelope.addEventListener('click', () => {
  if (opening) return;
  opening = true;
  envelope.disabled = true;
  envelope.classList.add('opening');
  const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1150;
  setTimeout(() => { showScreen('letter-screen'); opening = false; }, delay);
});
document.getElementById('back-envelope').addEventListener('click', () => {
  envelope.classList.remove('opening');
  envelope.disabled = false;
  showScreen('envelope-screen');
  envelope.focus({ preventScroll: true });
});
document.getElementById('to-timeline').addEventListener('click', () => showScreen('timeline-screen'));
document.getElementById('back-letter').addEventListener('click', () => showScreen('letter-screen'));
document.getElementById('to-ending').addEventListener('click', () => showScreen('ending-screen'));
document.getElementById('read-again').addEventListener('click', () => showScreen('letter-screen'));
const background = new Image();
background.onload = () => document.querySelector('.space').classList.add('has-image');
background.src = './assets/camp-background.png';
async function loadLetter() {
  const token = location.hash.slice(1);
  if (!token) return;
  envelope.disabled = true;
  const hint = document.querySelector('.open-hint');
  hint.textContent = '正在接收你的来信…';
  try {
    if (!/^[a-f0-9]{32}$/.test(token)) throw new Error('Invalid link');
    const response = await fetch('./letters/' + token + '.json');
    if (!response.ok) throw new Error('Letter unavailable');
    const letter = await response.json();
    if (typeof letter.name !== 'string' || typeof letter.text !== 'string' || !letter.text.trim()) throw new Error('Invalid letter');
    document.getElementById('opening-title').textContent = letter.name + '，来信了。';
    document.querySelector('.address').replaceChildren();
    const to = document.createElement('span');
    to.textContent = 'To';
    document.querySelector('.address').append(to, document.createTextNode(letter.name));
    const content = document.querySelector('.demo-card');
    content.replaceChildren();
    content.className = 'letter-body';
    content.textContent = letter.text;
    document.querySelector('.paper-top span:last-child').textContent = '致 ' + letter.name;
    hint.textContent = '轻点信封';
    envelope.disabled = false;
  } catch {
    hint.textContent = '这封信暂时无法打开，请联系运营团队核对链接。';
    document.getElementById('opening-title').textContent = '来信还在路上';
    document.querySelector('.subtitle').textContent = '请使用运营团队发给你的完整链接。';
  }
}
loadLetter();
