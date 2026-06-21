import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import compression from "compression";



dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ====================
// MIDDLEWARE
// ====================
app.use(compression());
app.use(cors());
app.use(express.json());

app.use("/images", express.static("public/images"));
app.use(express.static("public"));

// ====================
// OPENAI SAFE
// ====================
const openai =
  process.env.OPENAI_API_KEY &&
  process.env.OPENAI_API_KEY.trim() !== ""
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// ====================
// MONGO
// ====================
let mongoConnected = false;
// ====================
// DEFAULT PRODUCTS SAFE (FIX COMPLET)
// ====================
const defaultProducts = [
  { _id: "0", name: "Courroie distribution", price: 12000, category: "courroie", image: "courroie-dis.jpg" },
  { _id: "1", name: "Huile moteur 5W-30", price: 5000, category: "huile", image: "huile_total.jpg" },
  { _id: "2", name: "Huile moteur 10W-40", price: 6000, category: "huile", image: "huile_total2.jpg" },
  { _id: "3", name: "Filtre à huile", price: 3000, image: "filtre-a-huile.jpg" },
  { _id: "4", name: "Filtre à air", price: 2500, image: "filtre-a-air.jpg" },
  { _id: "5", name: "Plaquettes frein", price: 15000, category: "frein", image: "plaquette-2.jpg" },
  { _id: "6", name: "Liquide frein", price: 4000, category: "frein", image: "stop.jpg" },
  { _id: "7", name: "Bougies", price: 2000, category: "bougie", image: "bougie.jpg" },
  { _id: "8", name: "Batterie 12V 60Ah", price: 45000, category: "batterie", image: "batterie-bosch.jpg" },
  { _id: "9", name: "Essuie-glaces", price: 5000, category: "essuie-glace", image: "essuie.jpg" }
];

const productImageByKeyword = [
  { keywords: ["courroie", "distribution"], image: "courroie-dis.jpg" },
  { keywords: ["courroie", "alternateur"], image: "courroie-alter.jpg" },
  { keywords: ["filtre", "huile"], image: "filtre-a-huile.jpg" },
  { keywords: ["filtre", "air"], image: "filtre-a-air.jpg" },
  { keywords: ["filtre"], image: "filtre-a-huile.jpg" },
  { keywords: ["huile", "10w"], image: "huile_total2.jpg" },
  { keywords: ["huile"], image: "huile_total.jpg" },
  { keywords: ["plaquette"], image: "plaquette.jpg" },
  { keywords: ["frein"], image: "stop.jpg" },
  { keywords: ["bougie"], image: "bougie.jpg" },
  { keywords: ["batterie"], image: "batterie-bosch.jpg" },
  { keywords: ["essuie"], image: "essuie.jpg" }
];

const productCategoryByKeyword = [
  { keyword: "courroie", category: "courroie" },
  { keyword: "filtre", category: "filtre" },
  { keyword: "huile", category: "huile" },
  { keyword: "frein", category: "frein" },
  { keyword: "plaquette", category: "frein" },
  { keyword: "bougie", category: "bougie" },
  { keyword: "batterie", category: "batterie" },
  { keyword: "essuie", category: "essuie-glace" }
];

function getImageFromProductName(name = "") {
  const normalizedName = name.toLowerCase();
  const match = productImageByKeyword.find(({ keywords }) =>
    keywords.every(keyword => normalizedName.includes(keyword))
  );

  return match?.image;
}

function getCategoryFromProductName(name = "") {
  const normalizedName = name.toLowerCase();
  const match = productCategoryByKeyword.find(({ keyword }) =>
    normalizedName.includes(keyword)
  );

  return match?.category || "";
}

function isGenericImage(image = "") {
  const normalizedImage = image.toLowerCase();

  return (
    !normalizedImage ||
    normalizedImage.includes("catalogur bosch") ||
    normalizedImage.includes("default")
  );
}

function buildLocalChatReply(matches) {
  return matches.length > 0
    ? `Produits trouvÃ©s : ${matches.map(p => `${p.name} (${p.price} FCFA)`).join(", ")}`
    : "Bonjour. Dites-moi quelle piÃ¨ce vous cherchez : huile, filtre, batterie, frein, bougie, courroie...";
}

function withTimeout(promise, timeoutMs = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DÃ©lai IA dÃ©passÃ©")), timeoutMs)
    )
  ]);
}

// ====================
// NORMALISATION SAFE (IMPORTANT)
// ====================
function normalizeProduct(p) {
  const name = p.name || "Produit";
  const currentImage = p.image || "";
  const inferredImage = getImageFromProductName(name);

  return {
    _id: p._id,
    name,
    price: Number(p.price || 0),
    category: p.category || getCategoryFromProductName(name),
    compatibleCars: p.compatibleCars || [],
    image: inferredImage || (isGenericImage(currentImage)
      ? "Catalogur Bosch.png"
      : currentImage)
  };
}

// ====================
// PRODUCTS
// ====================
app.get("/products", async (req, res) => {
  try {
    let products = defaultProducts;
    products = products.map(normalizeProduct);

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Erreur produits" });
  }
});

// ====================
// SINGLE PRODUCT
// ====================
app.get("/products/:id", async (req, res) => {
  try {
     let product = defaultProducts.find(
  p => p._id === req.params.id
);

    if (!product) {
      return res.status(404).json({ error: "Produit introuvable" });
    }

    res.json(normalizeProduct(product));
  } catch {
    res.status(500).json({ error: "Erreur produit" });
  }
});

// ====================
// CHAT IA (FINAL STABLE)
// ====================
app.post("/chat", async (req, res) => {
  try {
    const message = (req.body.message || "").toLowerCase();

    if (!message) {
      return res.status(400).json({ error: "Message vide" });
    }

     let products = defaultProducts;

    products = products.map(normalizeProduct);

    const matches = products.filter(p =>
      p.name.toLowerCase().includes(message)
    ).slice(0, 3);

    let reply = buildLocalChatReply(matches);

    // ====================
    // OPENAI SAFE MODE
    // ====================
    if (openai) {
      const prompt = `
Tu es un assistant MPR SERVICES (automobile).
Réponds court et professionnel.

Produits disponibles:
${matches.map(p => `- ${p.name} ${p.price} FCFA`).join("\n")}

Client:
${message}
      `;

      try {
        const response = await withTimeout(
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 200
          })
        );

        reply = response.choices[0].message.content || reply;
      } catch (err) {
        console.error("IA indisponible, réponse locale utilisée :", err.message);
      }
    } else {
      reply =
        matches.length > 0
          ? `Produits trouvés : ${matches.map(p => p.name).join(", ")}`
          : "Bonjour 👋 Dites-moi quelle pièce vous cherchez (huile, filtre, batterie...).";
    }

    res.json({ reply, products: matches });

  } catch (err) {
    res.status(500).json({
      error: "Erreur serveur chat",
      reply: "Service temporairement indisponible"
    });
  }
});

// ====================
// SERVER START
// ====================
app.listen(PORT, () => {
  console.log(`🚀 Serveur OK http://localhost:${PORT}`);
});
