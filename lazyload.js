// Lazy Loading Images - Performance Optimization
(function() {
  'use strict';

  // Vérifier le support natif du lazy loading
  if ('loading' in HTMLImageElement.prototype) {
    // Les images avec loading="lazy" sont gérées nativement
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
    return;
  }

  // Fallback pour les navigateurs sans support natif
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        
        // Charger l'image
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          img.removeAttribute('data-srcset');
        }
        
        // Arrêter l'observation
        observer.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px'
  });

  // Observer toutes les images avec data-src
  document.querySelectorAll('img[data-src]').forEach(img => {
    img.classList.add('lazy-image');
    imageObserver.observe(img);
  });

  // Charger les images de fond en lazy
  const bgObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        if (el.dataset.bg) {
          el.style.backgroundImage = `url('${el.dataset.bg}')`;
          el.removeAttribute('data-bg');
        }
        observer.unobserve(el);
      }
    });
  }, {
    rootMargin: '50px'
  });

  document.querySelectorAll('[data-bg]').forEach(el => {
    bgObserver.observe(el);
  });
})();
