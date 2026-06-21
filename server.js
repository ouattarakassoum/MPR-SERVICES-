 import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

console.log("SERVER STARTING...");

const app = express();

// ====================
// PORT (UNE SEULE FOIS)
// ====================
const PORT = process.env.PORT || 3001;

// ====================
// PATH FIX (ESM)
// ====================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  process.env.OPENAI_API_KEY?.trim()
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// ====================
// PRODUITS
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

// ====================
// HOME
// ====================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ====================
// PRODUCTS
// ====================
app.get("/products", (req, res) => {
  res.json(defaultProducts);
});

app.get("/products/:id", (req, res) => {
  const product = defaultProducts.find(p => p._id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: "Produit introuvable" });
  }

  res.json(product);
});

// ====================
// CHAT IA
// ====================
app.post("/chat", async (req, res) => {
  try {
    const message = (req.body.message || "").toLowerCase();

    if (!message) {
      return res.status(400).json({ error: "Message vide" });
    }

    const matches = defaultProducts
      .filter(p => p.name.toLowerCase().includes(message))
      .slice(0, 3);

    let reply =
      matches.length > 0
        ? `Produits trouvés : ${matches.map(p => p.name).join(", ")}`
        : "Bonjour 👋 Dites-moi quelle pièce vous cherchez.";

    // OPENAI (OPTIONNEL)
    if (openai) {
      const prompt = `
Tu es assistant MPR SERVICES.
Réponds court.

Produits:
${matches.map(p => `- ${p.name} ${p.price} FCFA`).join("\n")}

Client: ${message}
      `;

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 200
        });

        reply = response.choices[0].message.content;
      } catch (e) {
        console.log("OpenAI fallback");
      }
    }

    res.json({ reply, products: matches });

  } catch (err) {
    res.status(500).json({
      error: "Erreur serveur chat"
    });
  }
});

// ====================
// 404
// ====================
app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

// ====================
// SERVER START (LOCAL ONLY)
// ====================
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Serveur OK http://localhost:${PORT}`);
  });
}

// ====================
// VERCEL EXPORT
// ====================
export default app;