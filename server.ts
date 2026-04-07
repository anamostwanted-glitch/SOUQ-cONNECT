import express from "express";
import { createServer as createViteServer } from "vite";
import compression from "compression";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ApolloServer } from "@apollo/server";
// @ts-ignore
import { expressMiddleware } from "@as-integrations/express4";
import cors from "cors";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get("/", (req, res, next) => {
    if (req.url === "/") {
      console.log("Root request received");
    }
    next();
  });

  // 6. Advanced Caching & Brotli/Gzip Compression
  // app.use(compression());
  app.use(express.json());
  app.use(cors());

  // AI Product Analysis Endpoint
  app.post("/api/analyze-product", async (req, res) => {
    const { image, mimeType, apiKey: reqApiKey } = req.body;
    const apiKey = reqApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.length < 10) {
      console.error("GEMINI_API_KEY is missing or invalid in environment");
      return res.status(400).json({ error: "INVALID_API_KEY" });
    }

    if (!image || !mimeType) {
      return res.status(400).json({ error: "Image data and mimeType are required" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `
                Analyze this product image and provide a detailed JSON response with the following fields:
                - productNameEn: Product name in English
                - productNameAr: Product name in Arabic
                - descriptionEn: A compelling product description in English
                - descriptionAr: A compelling product description in Arabic
                - category: One of these categories: Electronics, Fashion, Home, Beauty, Sports, Toys, Other
                - priceEstimate: A realistic price estimate in USD (number)
                - isHighQuality: Boolean indicating if the image is high quality
                - features: Array of 3-5 key product features (strings)
                - keywordsEn: Array of 5-10 SEO keywords in English
                - keywordsAr: Array of 5-10 SEO keywords in Arabic

                Return ONLY the JSON object.
              `,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text;
      // Clean potential markdown code blocks
      const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
      const suggestion = JSON.parse(jsonStr);

      res.json(suggestion);
    } catch (error: any) {
      console.error("AI Analysis failed on server:", error);
      
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
        return res.status(429).json({ error: "QUOTA_EXHAUSTED" });
      }
      
      if (error.status === 400 || error.message?.includes('API key not valid')) {
        return res.status(400).json({ error: "INVALID_API_KEY" });
      }

      res.status(500).json({ error: "AI analysis failed" });
    }
  });

  // AI Image Generation Endpoint
  app.post("/api/generate-product-image", async (req, res) => {
    const { image, mimeType, title, category } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing from environment");
      return res.status(500).json({ error: "AI service configuration missing" });
    }

    if (!image || !mimeType) {
      return res.status(400).json({ error: "Image data and mimeType are required" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const prompt = `A professional, close-up photography of this product. Place it in the center of the picture on elegant interior design elements. Highlight its uses and applications. Product title: ${title || 'Product'}. Category: ${category || 'General'}. High quality, studio lighting, highly detailed. IMPORTANT: Do not include any text, words, labels, or watermarks in the image. The image should be clean and professional.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash", // Using 2.0 flash for image generation if supported or fallback
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            { text: prompt },
          ],
        },
        // @ts-ignore
        config: { imageConfig: { aspectRatio: "3:4" } }
      });

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        for (const part of candidates[0].content.parts || []) {
          if (part.inlineData) {
            return res.json({ image: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}` });
          }
        }
      }
      
      res.status(500).json({ error: "No image generated" });
    } catch (error) {
      console.error("AI Image Generation failed on server:", error);
      res.status(500).json({ error: "AI image generation failed" });
    }
  });

  // Generic AI Text Endpoint (for translation, etc.)
  app.post("/api/ai-text", async (req, res) => {
    const { contents, prompt, model: modelName = "gemini-1.5-flash", apiKey: reqApiKey } = req.body;
    const apiKey = reqApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.length < 10) {
      return res.status(400).json({ error: "INVALID_API_KEY" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents || prompt,
      });
      const responseText = response.text;

      res.json({ text: responseText });
    } catch (error: any) {
      console.error("AI Text request failed on server:", error);
      
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
        return res.status(429).json({ error: "QUOTA_EXHAUSTED" });
      }
      
      if (error.status === 400 || error.message?.includes('API key not valid')) {
        return res.status(400).json({ error: "INVALID_API_KEY" });
      }

      res.status(500).json({ error: "AI request failed" });
    }
  });

  // Generic AI JSON Endpoint (for structured output)
  app.post("/api/ai-json", async (req, res) => {
    const { contents, model: modelName = "gemini-1.5-flash", schema, apiKey: reqApiKey } = req.body;
    const apiKey = reqApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.length < 10) {
      console.error("GEMINI_API_KEY is missing or invalid in environment");
      return res.status(400).json({ error: "INVALID_API_KEY" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          responseMimeType: "application/json",
          // @ts-ignore
          responseSchema: schema
        },
      });

      const responseText = response.text;
      const result = JSON.parse(responseText || "{}");

      res.json(result);
    } catch (error: any) {
      console.error("AI JSON request failed on server:", error);
      
      // Handle specific Google API errors
      if (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota')) {
        return res.status(429).json({ error: "QUOTA_EXHAUSTED" });
      }
      
      if (error.status === 400 || error.message?.includes('API key not valid')) {
        return res.status(400).json({ error: "INVALID_API_KEY" });
      }

      res.status(500).json({ error: "AI request failed" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Send welcome email
  app.post("/api/send-welcome-email", async (req, res) => {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.FROM_EMAIL,
        to: email,
        subject: "Welcome to our Platform!",
        text: `Hi ${name || ""},\n\nWelcome to our platform! We're glad to have you on board.\n\nBest regards,\nThe Team`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // 1. GraphQL Protocol (Fetch only what you need)
  const typeDefs = `#graphql
    type User {
      id: ID!
      name: String!
      email: String!
      avatar: String
      bio: String
    }

    type Post {
      id: ID!
      title: String!
      content: String!
      author: User!
      createdAt: String!
    }

    type Query {
      me: User
      posts: [Post]
      post(id: ID!): Post
    }
  `;

  const resolvers = {
    Query: {
      me: () => ({
        id: "1",
        name: "Ana Most Wanted",
        email: "anamostwanted@gmail.com",
        avatar: "https://picsum.photos/seed/ana/200",
        bio: "Senior Full Stack Engineer & Product Designer",
      }),
      posts: () => [
        { id: "1", title: "GraphQL is Awesome", content: "Fetching only what you need!", createdAt: "2026-03-21" },
        { id: "2", title: "Relay vs Apollo", content: "Managing data like a pro.", createdAt: "2026-03-20" },
      ],
      post: (_: any, { id }: { id: string }) => ({
        id,
        title: `Post ${id}`,
        content: "This is a detailed post content.",
        createdAt: "2026-03-21",
      }),
    },
    Post: {
      author: () => ({
        id: "1",
        name: "Ana Most Wanted",
      }),
    },
  };

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use("/graphql", expressMiddleware(server));

  // 4. Edge Computing & CDNs (Simulated via Caching Headers)
  app.use((req, res, next) => {
    // Cache static assets for 1 year, HTML for 0 (to ensure fresh hydration)
    if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2)$/)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }
    next();
  });

  // 5. Server-Side Rendering (SSR) Foundation & Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.get("/ping", (req, res) => res.send("pong"));
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      // If it's a static asset, let it pass through to Vite or 404
      if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|webp|avif|svg|woff|woff2|tsx|ts|jsx)$/)) {
        return next();
      }
      
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
    console.log("Server is listening and ready!");
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
