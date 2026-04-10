import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import twilio from "twilio";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Messaging API route
  app.post("/api/send-concierge-alert", async (req, res) => {
    const { phoneNumber, message } = req.body;
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return res.status(500).json({ error: "Messaging service not configured" });
    }

    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${phoneNumber}`
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Twilio error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Meta Ads Proxy
  app.all("/api/meta/*", async (req, res) => {
    const url = req.url.replace("/api/meta", "https://graph.facebook.com/v22.0");
    try {
      const response = await axios({
        method: req.method,
        url,
        data: req.body,
        headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}` }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Meta API error" });
    }
  });

  // Google Ads Proxy
  app.all("/api/google/*", async (req, res) => {
    const url = req.url.replace("/api/google", "https://googleads.googleapis.com/v19");
    try {
      const response = await axios({
        method: req.method,
        url,
        data: req.body,
        headers: { 
          "Authorization": `Bearer ${process.env.GOOGLE_ADS_API_KEY}`,
          "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
          "login-customer-id": process.env.GOOGLE_ADS_CUSTOMER_ID
        }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Google Ads API error" });
    }
  });

  // Gemini Proxy
  app.post("/api/gemini/generate", async (req, res) => {
    const { contents, model, config } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    console.log("DEBUG: Gemini Proxy Request received. API Key present:", !!apiKey);
    if (apiKey) {
      console.log("DEBUG: API Key length:", apiKey.length);
      console.log("DEBUG: API Key prefix:", apiKey.substring(0, 4) + "...");
    }

    if (!apiKey) {
      return res.status(500).json({ error: "MISSING_API_KEY", details: "GEMINI_API_KEY not found in server environment" });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({ apiKey });
      
      const result = await genAI.models.generateContent({
        model: model || "gemini-3-flash-preview",
        contents,
        config: config
      });
      
      res.json({ text: result.text });
    } catch (error: any) {
      const isInvalidKey = 
        error.message?.includes('API key not valid') || 
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('INVALID_ARGUMENT') ||
        error.message?.includes('403') ||
        error.status === 'INVALID_ARGUMENT';
      
      if (isInvalidKey) {
        console.warn("Gemini Proxy: Invalid API Key detected.");
      } else {
        console.error("Gemini Server Error:", error);
      }
      
      // Try to extract a cleaner error message if it's a JSON string from the API
      let errorMessage = error.message || "Gemini API error";
      try {
        if (errorMessage.includes('{')) {
          const jsonStart = errorMessage.indexOf('{');
          const jsonStr = errorMessage.substring(jsonStart);
          const parsed = JSON.parse(jsonStr);
          if (parsed.error && parsed.error.message) {
            errorMessage = parsed.error.message;
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }

      const finalIsInvalidKey = isInvalidKey || 
        errorMessage.includes('API key not valid') || 
        errorMessage.includes('API_KEY_INVALID') || 
        errorMessage.includes('INVALID_ARGUMENT') ||
        errorMessage.includes('403');

      res.status(500).json({ 
        error: errorMessage,
        rawError: error.message,
        isInvalidKey: finalIsInvalidKey
      });
    }
  });

  // Image Proxy
  app.get("/api/proxy-image", async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    try {
      console.log("Proxying image request to:", imageUrl);
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      console.log("Proxy image fetch successful:", response.status);
      res.set('Content-Type', response.headers['content-type']);
      res.send(Buffer.from(response.data, 'binary'));
    } catch (error) {
      console.error("Proxy image error:", error);
      res.status(500).json({ error: "Failed to fetch image" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'build');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
