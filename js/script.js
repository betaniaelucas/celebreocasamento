// script.js — parallax/fade do hero + header transparente que vira sólido

document.addEventListener('DOMContentLoaded', () => {
  const hero = document.querySelector('.hero');
  const heroImg = document.querySelector('.hero-img');
  const heroContent = document.querySelector('.hero-inner'); // (novo título/assinatura)
  const overlay = document.querySelector('.hero-gradient');

  // ===== Parallax/fade do hero (suave e robusto em mobile)
  if (hero) {
    let lastScrollY = window.scrollY;
    let ticking = false;

    function getHeroHeight() {
      return hero.getBoundingClientRect().height || window.innerHeight;
    }

    function update() {
      const scrollY = lastScrollY;
      const heroHeight = getHeroHeight();
      let progress = scrollY / heroHeight; // 0..1
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;

      const opacity = 1 - progress;

      if (heroImg) {
        heroImg.style.opacity = String(opacity);
        heroImg.style.transform = `translateY(${progress * -15}px) scale(${1 + progress * 0.02})`;
        heroImg.style.willChange = 'transform, opacity';
      }
      if (overlay) {
        overlay.style.opacity = String(Math.max(0, opacity * 1)); // mantém o gradiente
        overlay.style.willChange = 'opacity';
      }
      if (heroContent) {
        heroContent.style.opacity = String(Math.max(0.35, opacity));
        heroContent.style.transform = `translateY(${progress * -10}px)`;
        heroContent.style.willChange = 'transform, opacity';
      }

      ticking = false;
    }

    function onScroll() {
      lastScrollY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }

    const recalc = () => { lastScrollY = window.scrollY; update(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', recalc, { passive: true });
    window.addEventListener('orientationchange', recalc);
    update(); // estado inicial
  }

  // ===== Header transparente sobre o hero: fica sólido ao sair do hero
  const header = document.querySelector('.site-header');
  const heroSection = document.querySelector('.hero');
  if (header && heroSection) {
    const makeSolid = (solid) => header.classList.toggle('is-solid', solid);

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(
        ([entry]) => { makeSolid(!entry.isIntersecting); },
        { rootMargin: '-64px 0px 0px 0px', threshold: 0 }
      );
      obs.observe(heroSection);
    } else {
      // fallback simples
      const onScroll2 = () => {
        const h = heroSection.getBoundingClientRect();
        makeSolid(h.bottom <= 64);
      };
      window.addEventListener('scroll', onScroll2, { passive: true });
      window.addEventListener('resize', onScroll2, { passive: true });
      onScroll2();
    }
  }
});