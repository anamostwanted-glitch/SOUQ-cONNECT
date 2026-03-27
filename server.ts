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
