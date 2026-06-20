// public/product.js
 // public/product.js

let products = [];
let currentCategory = 'all';
let currentSearch = '';
let carouselIndex = 0;

const productList = document.getElementById('productList');
const searchInput = document.getElementById('searchInput');
const categoryButtons = document.querySelectorAll('.category-btn');
const productCountEl = document.getElementById('productCount');
const activeCategoryEl = document.getElementById('activeCategory');
const carouselTrack = document.getElementById('carouselTrack');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');
const categoryImage = document.querySelector('.category-image');
const productGallery = document.getElementById('productGallery');
const fallbackImage = 'images/Catalogur Bosch.png';
window.mprApiBaseUrl =
  window.location.protocol === 'file:' || window.location.port !== '3001'
    ? 'http://localhost:3001'
    : '';

window.productPageHandlesProducts = true;

const imagePathMap = {
  '/images/filtre_a_huile.jpg': 'images/filtre-a-huile.jpg',
  'images/filtre_a_huile.jpg': 'images/filtre-a-huile.jpg',
  '/images/filtre_a_air.jpg': 'images/filtre-a-air.jpg',
  'images/filtre_a_air.jpg': 'images/filtre-a-air.jpg',
  '/images/batterie_bosch.jpg': 'images/batterie-bosch.jpg',
  'images/batterie_bosch.jpg': 'images/batterie-bosch.jpg'
};

function normalizeImagePath(image) {
  if (!image || typeof image !== 'string') return fallbackImage;
  const trimmedImage = image.trim();
  const mappedImage = imagePathMap[trimmedImage] || trimmedImage;

  if (
    mappedImage.startsWith('http://') ||
    mappedImage.startsWith('https://') ||
    mappedImage.startsWith('images/')
  ) {
    return mappedImage;
  }

  if (mappedImage.startsWith('/images/')) {
    return mappedImage.slice(1);
  }

  return `images/${mappedImage}`;
}

function imageMarkup(product, extraAttributes = '') {
  const src = encodeURI(normalizeImagePath(product.image));
  const alt = product.name || 'Produit MPR SERVICES';
  return `<img src="${src}" alt="${alt}" ${extraAttributes} onerror="this.onerror=null;this.src='${fallbackImage}'">`;
}

function formatPrice(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toLocaleString('fr-FR') + ' FCFA' : 'Prix indisponible';
}

function getProductById(id) {
  return products.find((product) => String(product._id) === String(id));
}

window.getProductById = getProductById;
window.normalizeProductImagePath = normalizeImagePath;

function getFilteredProducts() {
  return products.filter((product) => {
    const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
    const searchLower = currentSearch.trim().toLowerCase();
    const searchableText = [product.name, product.category, product.brand, product.compatibleCars?.join(' ')].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = searchLower === '' || searchableText.includes(searchLower);
    return matchesCategory && matchesSearch;
  });
}

function updateProductMeta(filteredProducts) {
  if (productCountEl) {
    productCountEl.textContent = `${filteredProducts.length} produit(s) trouvé(s)`;
  }
  if (activeCategoryEl) {
    activeCategoryEl.textContent = currentCategory === 'all' ? 'Tous' : currentCategory;
  }
}

function attachDetailListeners() {
  const buttons = document.querySelectorAll('.view-details-btn');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.id;
      const product = getProductById(id);
      if (product && window.openProductModal) {
        window.openProductModal(product);
      }
    });
  });
}

// �couteurs pour les boutons d'ajout rapide au panier
function attachAddToCartListeners() {
  const addBtns = document.querySelectorAll('.add-to-cart-btn');
  addBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const product = getProductById(id);
      if (!product) return;
      if (typeof window.addProductToCart === 'function') {
        window.addProductToCart(product._id, product.name, product.price, normalizeImagePath(product.image));
      } else if (window.confirm) {
        alert(`${product.name} ajouté au panier (local).`);
      }
    });
  });
}

function renderProducts() {
  if (!productList) return;
  const filteredProducts = getFilteredProducts();
  updateProductMeta(filteredProducts);

  if (filteredProducts.length === 0) {
    productList.innerHTML = `
      <div class="no-products">
        <p>Aucun produit ne correspond à votre recherche. Essayez un autre mot-clé ou une autre catégorie.</p>
      </div>
    `;
    return;
  }

  productList.innerHTML = filteredProducts
    .map((product) => `
      <div class="product-card">
        <div class="product-image-container">
          ${imageMarkup(product, 'loading="lazy"')}
          <div class="product-actions">
            <button class="btn btn-secondary view-details-btn" data-id="${product._id}">Détails</button>
            <button class="btn btn-primary add-to-cart-btn" data-id="${product._id}">Ajouter</button>
          </div>
        </div>
        <div class="product-card-content">
          <h3>${product.name}</h3>
          <p class="product-price">${formatPrice(product.price)}</p>
          <p class="product-compatibility">Compatibilité : ${product.compatibleCars?.join(', ') || 'tous véhicules'}</p>
        </div>
      </div>
    `)
    .join('');

  attachDetailListeners();
  attachAddToCartListeners();
}

function updateCategoryImage() {
  if (!categoryImage) return;
  const images = {
    all: 'images/Catalogur Bosch.png',
    courroie: 'images/courroie-dis.jpg',
    huile: 'images/huile_total.jpg',
    filtre: 'images/filtre-a-huile.jpg',
    frein: 'images/plaquette.jpg',
    bougie: 'images/bougie.jpg',
    batterie: 'images/batterie-bosch.jpg',
    essuieglace: 'images/essuie.jpg',
    'essuie-glace': 'images/essuie.jpg',
  };
  categoryImage.src = encodeURI(images[currentCategory] || 'images/gamme-boch.jpg');
}

function setupCategoryButtons() {
  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      categoryButtons.forEach((button) => button.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category || 'all';
      updateCategoryImage();
      renderProducts();
    });
  });
}

function setupSearchInput() {
  if (!searchInput) return;
  searchInput.addEventListener('input', (event) => {
    currentSearch = event.target.value || '';
    renderProducts();
  });
}

function renderFeaturedCarousel() {
  if (!carouselTrack) return;
  const featured = products.slice(0, 6);
  carouselTrack.innerHTML = featured
    .map((product) => `
      <div class="carousel-card">
        ${imageMarkup(product, 'loading="lazy"')}
        <div class="carousel-card-body">
          <h4>${product.name}</h4>
          <p>${formatPrice(product.price)}</p>
        </div>
      </div>
    `)
    .join('');
  carouselIndex = 0;
  updateCarouselPosition();
}

function renderProductGallery() {
  if (!productGallery) return;
  productGallery.innerHTML = products
    .map((product) => `
      <div class="gallery-card">
        ${imageMarkup(product, 'loading="lazy"')}
        <p>${product.name}</p>
      </div>
    `)
    .join('');
}

function updateCarouselPosition() {
  if (!carouselTrack) return;
  const cardWidth = 320;
  const visibleCount = Math.max(1, Math.floor((carouselTrack.parentElement?.offsetWidth || 960) / (cardWidth + 20)));
  const maxIndex = Math.max(0, carouselTrack.children.length - visibleCount);
  if (carouselPrev) carouselPrev.disabled = carouselIndex === 0;
  if (carouselNext) carouselNext.disabled = carouselIndex >= maxIndex;
  const offset = Math.min(carouselIndex, maxIndex) * (cardWidth + 20);
  carouselTrack.style.transform = `translateX(-${offset}px)`;
}

function setupCarouselNavigation() {
  carouselPrev?.addEventListener('click', () => {
    carouselIndex = Math.max(carouselIndex - 1, 0);
    updateCarouselPosition();
  });
  carouselNext?.addEventListener('click', () => {
    carouselIndex += 1;
    updateCarouselPosition();
  });
}

async function fetchProducts() {
  try {
    const response = await fetch(`${window.mprApiBaseUrl}/products`);
    if (!response.ok) {
      throw new Error(`Erreur HTTP ${response.status}`);
    }

    const data = await response.json();
    products = Array.isArray(data)
      ? data.map((product) => ({
          ...product,
          image: normalizeImagePath(product.image)
        }))
      : [];

    renderProducts();
    renderFeaturedCarousel();
    renderProductGallery();
  } catch (error) {
    console.error('Erreur chargement produits:', error);
    if (productList) {
      productList.innerHTML = `
        <div class="no-products">
          <p>Impossible de charger les produits pour le moment.</p>
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', fetchProducts);
