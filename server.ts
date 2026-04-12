import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import twilio from "twilio";
import dotenv from "dotenv";
import axios from "axios";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

// Initialize Firebase Admin
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Generic Email API
app.post("/api/send-email", async (req, res) => {
  const { email, name, template, data } = req.body;
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ error: "Email service not configured" });
  }

  let subject = "";
  let text = "";
  let html = "";

  switch (template) {
    case 'welcome':
      subject = "Welcome to Souq Connect!";
      text = `Hello ${name}, welcome to Souq Connect! We are excited to have you on board.`;
      html = `<h1>Welcome to Souq Connect!</h1><p>Hello ${name}, welcome to Souq Connect! We are excited to have you on board.</p>`;
      break;
    case 'notification':
      subject = "New Notification from Souq Connect";
      text = `Hello ${name}, you have a new notification: ${data?.message}`;
      html = `<h1>New Notification</h1><p>Hello ${name},</p><p>${data?.message}</p>`;
      break;
    case 'order_notification':
      subject = "New Order Notification";
      text = `Hello ${name}, you have a new order: ${data?.orderId}. Status: ${data?.status}`;
      html = `<h1>New Order</h1><p>Hello ${name},</p><p>Order ID: ${data?.orderId}</p><p>Status: ${data?.status}</p>`;
      break;
    default:
      return res.status(400).json({ error: "Invalid template" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.FROM_EMAIL || "noreply@souq-connect.com",
      to: email,
      subject,
      text,
      html,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

  // WhatsApp API
  app.post("/api/send-whatsapp", async (req, res) => {
    const { phoneNumber, message } = req.body;
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return res.status(500).json({ error: "WhatsApp service not configured" });
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
      console.error("WhatsApp error:", error);
      res.status(500).json({ error: "Failed to send WhatsApp" });
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
      console.error("Gemini Proxy: GEMINI_API_KEY is missing in server environment.");
      return res.status(500).json({ 
        error: "MISSING_API_KEY", 
        details: "The server is not configured with a Gemini API key. Please add GEMINI_API_KEY to your environment variables.",
        isInvalidKey: true 
      });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({ apiKey });
      
      console.log(`Gemini Proxy: Calling model ${model || "gemini-3-flash-preview"}...`);
      const result = await genAI.models.generateContent({
        model: model || "gemini-3-flash-preview",
        contents,
        config: config
      });
      
      res.json({ text: result.text });
    } catch (error: any) {
      const errorString = error.message || "";
      const isQuotaError = errorString.includes('429') || errorString.includes('quota') || errorString.includes('RESOURCE_EXHAUSTED');
      const isInvalidKey = 
        errorString.includes('API key not valid') || 
        errorString.includes('API_KEY_INVALID') ||
        errorString.includes('INVALID_ARGUMENT') ||
        errorString.includes('403') ||
        error.status === 'INVALID_ARGUMENT';
      
      if (isQuotaError) {
        console.warn("Gemini Proxy: Quota exceeded (429).");
      } else if (isInvalidKey) {
        console.warn("Gemini Proxy: Invalid API Key detected.");
      } else {
        console.error("Gemini Server Error:", error);
      }
      
      let errorMessage = errorString || "Gemini API error";
      try {
        if (errorMessage.includes('{')) {
          const jsonStart = errorMessage.indexOf('{');
          const jsonStr = errorMessage.substring(jsonStart);
          const parsed = JSON.parse(jsonStr);
          if (parsed.error && parsed.error.message) {
            errorMessage = parsed.error.message;
          }
        }
      } catch (e) { /* ignore */ }

      res.status(isQuotaError ? 429 : 500).json({ 
        error: errorMessage,
        isInvalidKey: isInvalidKey || errorMessage.includes('API key not valid'),
        isQuota: isQuotaError
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

  // Sync Role to Custom Claims
  app.post("/api/sync-role", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Set custom user claims
      try {
        await admin.auth().setCustomUserClaims(uid, { role });
        console.log(`Custom claims set for user ${uid}: { role: ${role} }`);
        res.json({ success: true, role });
      } catch (claimError: any) {
        if (claimError.code === 'auth/internal-error' && claimError.message.includes('identitytoolkit')) {
          console.warn(`Identity Toolkit API disabled. Skipping custom claims for user ${uid}. System will fallback to Firestore rules.`);
          return res.json({ 
            success: true, 
            role, 
            warning: "Identity Toolkit API disabled",
            fallback: true
          });
        }
        throw claimError;
      }
    } catch (error: any) {
      console.error("Error in sync-role:", error);
      res.status(500).json({ error: "Failed to sync role", details: error.message });
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
    const distPath = path.join(process.cwd(), 'dist');
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
