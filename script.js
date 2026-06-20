   // =============================
// DOM
// =============================
const productGrid = document.getElementById("productList");

const cartContainer =
  document.getElementById("cartContainer") ||
  document.getElementById("cartItems");

const modal =
  document.getElementById("productModal") ||
  document.getElementById("aiModal");

const closeModal = document.getElementById("closeModal");

const aiProductName =
  document.getElementById("aiProductName") ||
  document.getElementById("modalName");

const aiImage =
  document.getElementById("aiImage") ||
  document.getElementById("modalImage");

const addCartBtn =
  document.getElementById("addCartBtn") ||
  document.getElementById("addToCartBtn");

const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatContainer = document.getElementById("chatContainer");
const openChatBtn = document.getElementById("openChatBtn");
const closeChatBtn = document.getElementById("closeChatBtn");
window.mprApiBaseUrl =
  window.mprApiBaseUrl ||
  (window.location.protocol === "file:" || window.location.port !== "3001"
    ? "http://localhost:3001"
    : "");

// =============================
// STATE
// =============================
let cart = JSON.parse(localStorage.getItem("cart") || "[]");
let selectedProduct = null;
let chatHistory = JSON.parse(
  localStorage.getItem("chatHistory") || "[]"
);

// =============================
// UTILITIES
// =============================
function formatPrice(price) {
  const n = Number(price);
  return Number.isFinite(n)
    ? n.toLocaleString("fr-FR")
    : "0";
}

function getProductImagePath(image) {
  if (!image) {
    return "images/Catalogur Bosch.png";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("images/")
  ) {
    return image;
  }

  if (image.startsWith("/images/")) {
    return image.slice(1);
  }

  return `images/${image}`;
}

function saveCart() {
  localStorage.setItem(
    "cart",
    JSON.stringify(cart)
  );
}

function saveChat() {
  localStorage.setItem(
    "chatHistory",
    JSON.stringify(chatHistory)
  );
}

async function fetchJson(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Erreur ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function openChat() {
  chatContainer?.classList.add("active");
  chatContainer?.classList.remove("minimized");
  chatInput?.focus();
}

function closeChat() {
  chatContainer?.classList.remove("active");
}

openChatBtn?.addEventListener("click", openChat);
closeChatBtn?.addEventListener("click", closeChat);

if (openChatBtn && !openChatBtn.textContent.trim()) {
  openChatBtn.textContent = "IA";
}

// =============================
// PANIER
// =============================
function renderCart() {
  if (!cartContainer) return;

  cartContainer.innerHTML = "";

  if (cart.length === 0) {
    cartContainer.innerHTML =
      "<p>Panier vide</p>";
    return;
  }

  cart.forEach((item, index) => {
    const div = document.createElement("div");

    div.className = "cart-item";

    div.innerHTML = `
      <div>
        <strong>${item.name}</strong><br>
        <small>
          ${item.quantity} ×
          ${formatPrice(item.price)} FCFA
        </small>
      </div>

      <button class="remove-cart">
        ✕
      </button>
    `;

    div.querySelector("button").onclick = () => {
      cart.splice(index, 1);
      saveCart();
      renderCart();
    };

    cartContainer.appendChild(div);
  });
}

function addToCart(
  id,
  name,
  price,
  image
) {
  const existing = cart.find(
    p => p._id === id
  );

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      _id: id,
      name,
      price: Number(price || 0),
      image,
      quantity: 1
    });
  }

  saveCart();
  renderCart();
}

// =============================
// MODAL
// =============================
function openModal(product) {
  selectedProduct = product;

  if (!modal) return;

  if (aiProductName) {
    aiProductName.textContent =
      product.name || "Produit";
  }

  if (aiImage) {
    aiImage.src =
      getProductImagePath(product.image);
  }

  modal.style.display = "flex";
}

function closeProductModal() {
  if (!modal) return;

  modal.style.display = "none";
}

window.openProductModal = openModal;
window.addProductToCart = addToCart;

closeModal?.addEventListener(
  "click",
  closeProductModal
);

modal?.addEventListener(
  "click",
  e => {
    if (e.target === modal) {
      closeProductModal();
    }
  }
);

document.addEventListener(
  "keydown",
  e => {
    if (e.key === "Escape") {
      closeProductModal();
    }
  }
);

// =============================
// CLICK PRODUIT
// =============================
productGrid?.addEventListener(
  "click",
  e => {
    const btn =
      e.target.closest(
        "button[data-product]"
      );

    if (!btn) return;

    try {
      const product = JSON.parse(
        btn.dataset.product
      );

      openModal(product);
    } catch (err) {
      console.error(
        "Erreur lecture produit",
        err
      );
    }
  }
);

// =============================
// AJOUT PANIER
// =============================
addCartBtn?.addEventListener(
  "click",
  () => {
    if (!selectedProduct) return;

    addToCart(
      selectedProduct._id,
      selectedProduct.name,
      selectedProduct.price,
      selectedProduct.image
    );

    closeProductModal();
  }
);

// =============================
// CHAT
// =============================
function appendChat(type, text) {
  if (!chatBox) return null;

  const div =
    document.createElement("div");

  div.className = `chat ${type}`;
  div.textContent = text;

  chatBox.appendChild(div);

  chatBox.scrollTop =
    chatBox.scrollHeight;

  return div;
}

async function sendMessage() {
  const message =
    chatInput?.value.trim();

  if (!message) return;

  appendChat("user", message);

  chatHistory.push({
    type: "user",
    text: message
  });

  saveChat();

  chatInput.value = "";

  const loading =
    appendChat("ia", "⏳ ...");

  try {
    const res = await fetch(
      `${window.mprApiBaseUrl}/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json"
        },
        body: JSON.stringify({
          message
        })
      }
    );

    if (!res.ok) {
      throw new Error(
        `Erreur ${res.status}`
      );
    }

    const data =
      await res.json();

    loading?.remove();

    const reply =
      data.reply ||
      "Aucune réponse";

    appendChat("ia", reply);

    chatHistory.push({
      type: "ia",
      text: reply
    });

    saveChat();
  } catch (err) {
    console.error(err);

    loading?.remove();

    appendChat(
      "error",
      "Erreur connexion serveur"
    );
  }
}

sendChatBtn?.addEventListener(
  "click",
  sendMessage
);

chatInput?.addEventListener(
  "keypress",
  e => {
    if (e.key === "Enter") {
      sendMessage();
    }
  }
);

// =============================
// CHARGEMENT PRODUITS
// =============================
async function loadProducts() {
  if (!productGrid) return;
  if (window.productPageHandlesProducts) return;

  try {
    productGrid.innerHTML =
      "<p>Chargement des produits...</p>";

    const res = await fetch(
      `${window.mprApiBaseUrl}/products`
    );

    if (!res.ok) {
      throw new Error(
        "Erreur serveur"
      );
    }

    const products =
      await res.json();

    productGrid.innerHTML = "";

    products.forEach(product => {
      const card =
        document.createElement(
          "div"
        );

      card.className =
        "product-card";

      card.innerHTML = `
        <img
          src="${getProductImagePath(product.image)}"
          alt="${product.name}"
          loading="lazy"
        >

        <h3>${product.name}</h3>

        <p>
          ${formatPrice(
            product.price || 0
          )} FCFA
        </p>

        <button
          data-product='${JSON.stringify(
            product
          )}'
        >
          Voir détails
        </button>
      `;

      productGrid.appendChild(card);
    });
  } catch (err) {
    console.error(err);

    productGrid.innerHTML = `
      <p style="color:red;text-align:center">
        Impossible de charger les produits.
      </p>
    `;
  }
}

// =============================
// INIT
// =============================
document.addEventListener(
  "DOMContentLoaded",
  async () => {
    try {
      renderCart();

      await loadProducts();

      chatHistory.forEach(msg => {
        appendChat(
          msg.type,
          msg.text
        );
      });

      if (
        chatHistory.length === 0
      ) {
        appendChat(
          "ia",
          "Bienvenue chez MPR SERVICES 👋"
        );
      }
    } catch (err) {
      console.error(
        "Erreur init :",
        err
      );
    }
  }
);
