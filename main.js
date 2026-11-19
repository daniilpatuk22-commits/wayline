/* Wayline — поведение сайта. Без сборки и зависимостей. */
(() => {
  'use strict';

  /* Укажите свой репозиторий «владелец/название». Тот же путь вставьте в index.html. */
  const REPO = 'your-username/wayline';
  const isConfigured = !REPO.startsWith('your-');

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Год в подвале */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* Мобильное меню */
  const toggle = $('.nav-toggle');
  const nav = $('#nav');
  if (toggle && nav) {
    const setOpen = (open) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    nav.addEventListener('click', (e) => {
      if (e.target instanceof HTMLAnchorElement) setOpen(false);
    });
  }

  /* Последний релиз: кнопки получают прямую ссылку на установщик */
  const releaseMeta = $('#release-meta');
  const downloadLinks = $$('[data-download]');
  const setMeta = (text) => {
    if (releaseMeta) releaseMeta.textContent = text;
  };
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  async function loadLatestRelease() {
    if (!isConfigured) {
      setMeta('Укажите репозиторий в main.js');
      return;
    }
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (res.status === 404) {
        setMeta('Первый релиз скоро появится');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const release = await res.json();
      const installer = (release.assets || []).find((a) => /\.(exe|msi)$/i.test(a.name));
      downloadLinks.forEach((link) => {
        link.href = installer ? installer.browser_download_url : release.html_url;
      });

      const date = release.published_at ? ` от ${formatDate(release.published_at)}` : '';
      setMeta(`Версия ${release.tag_name}${date}`);
    } catch {
      setMeta('Не удалось проверить версию. Откройте страницу релизов.');
    }
  }
  loadLatestRelease();

  /* Кнопки «Копировать» */
  $$('[data-copy]').forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Скопировано';
      } catch {
        btn.textContent = 'Не вышло';
      }
      setTimeout(() => {
        btn.textContent = label;
      }, 1600);
    });
  });

  /* Демо окна: горячая клавиша Ctrl+Alt+O и сквозной режим */
  const overlay = $('#demo-overlay');
  const hint = $('#screen-hint');
  const stage = $('#stage');
  const passBtn = $('#demo-pass');
  const demoHint = $('.demo-hint');

  const setHidden = (hidden) => {
    if (overlay) overlay.hidden = hidden;
    if (hint) hint.hidden = !hidden;
  };

  document.addEventListener('keydown', (e) => {
    if (overlay && e.ctrlKey && e.altKey && e.code === 'KeyO') {
      e.preventDefault();
      setHidden(!overlay.hidden);
    }
  });

  if (stage && passBtn) {
    passBtn.addEventListener('click', () => {
      const on = stage.classList.toggle('pass');
      passBtn.setAttribute('aria-pressed', String(on));
      passBtn.textContent = on ? 'Обычный режим' : 'Сквозной режим';
      if (demoHint) {
        demoHint.textContent = on
          ? 'Пунктир означает сквозной режим: клики проходят сквозь окно в игру.'
          : 'Демонстрация: игровой экран условный. Попробуйте Ctrl+Alt+O.';
      }
    });
  }

  /* Числа в демо считаются один раз, когда блок появляется на экране */
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const decimals = Number(el.dataset.decimals || 0);
    const duration = 900;
    const start = performance.now();
    el.textContent = (0).toFixed(decimals);

    const frame = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const counters = $$('[data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window && counters.length) {
    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 },
    );
    counters.forEach((el) => io.observe(el));
  }
})();
