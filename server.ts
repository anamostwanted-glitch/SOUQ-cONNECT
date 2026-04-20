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

  // Dynamic Sitemap
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = process.env.APP_URL || `https://${req.get('host')}`;
      const categoriesSnap = await admin.firestore().collection('categories').get();
      const productsSnap = await admin.firestore().collection('marketplace').get();
      const suppliersSnap = await admin.firestore().collection('users_public').get();

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

      // Basic pages
      ['/chat', '/dashboard', '/profile'].forEach(path => {
        xml += `
  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
      });

      // Categories
      categoriesSnap.forEach(doc => {
        const data = doc.data();
        if (data.slug) {
          xml += `
  <url>
    <loc>${baseUrl}/marketplace/${data.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;
        }
      });

      // Products
      productsSnap.forEach(doc => {
        xml += `
  <url>
    <loc>${baseUrl}/product/${doc.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
      });

      // Suppliers (Public Hubs)
      suppliersSnap.forEach(doc => {
        const data = doc.data();
        if (data.slug) {
          xml += `
  <url>
    <loc>${baseUrl}/profile/${data.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
        }
      });

      xml += `
</urlset>`;

      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('Sitemap generation error:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Robots.txt
  app.get("/robots.txt", (req, res) => {
    const baseUrl = process.env.APP_URL || `https://${req.get('host')}`;
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml`);
  });

// Generic Email API
app.post("/api/send-email", async (req, res) => {
  const { email, name, template, data, language = 'en' } = req.body;
  const isAr = language === 'ar';
  
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(500).json({ error: "Email service not configured" });
  }

  let subject = "";
  let html = "";

  const brandColor = "#0D9488"; // Teal-600

  const getLayout = (content: string) => `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'};">
      <div style="background-color: ${brandColor}; padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Connect AI</h1>
      </div>
      <div style="padding: 32px; background-color: white;">
        ${content}
      </div>
      <div style="background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b;">
        <p>© 2026 Connect AI. ${isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
        <p>${isAr ? 'تم إرسال هذا البريد تلقائياً، يرجى عدم الرد.' : 'This is an automated email, please do not reply.'}</p>
      </div>
    </div>
  `;

  switch (template) {
    case 'welcome':
      subject = isAr ? "مرحباً بك في سوق كونكت!" : "Welcome to Souq Connect!";
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? `أهلاً ${name}!` : `Hello ${name}!`}</h2>
        <p style="color: #475569; line-height: 1.6;">
          ${isAr 
            ? 'يسعدنا جداً انضمامك إلينا. سوق كونكت هو بوابتك الذكية للتواصل مع أفضل الموردين والعملاء في المنطقة.' 
            : 'We are excited to have you on board. Souq Connect is your smart gateway to connect with the best suppliers and customers in the region.'}
        </p>
        <div style="margin-top: 32px;">
          <a href="${process.env.APP_URL}" style="background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isAr ? 'ابدأ استكشاف السوق' : 'Start Exploring Marketplace'}
          </a>
        </div>
      `);
      break;
    case 'notification':
    case 'new_request':
      subject = isAr ? "طلب جديد يطابق تخصصك" : "New Request Matching Your Specialty";
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? 'فرصة عمل جديدة!' : 'New Business Opportunity!'}</h2>
        <p style="color: #475569; line-height: 1.6;">
          ${isAr 
            ? `هناك طلب جديد لـ "${data?.productName || data?.message}" قد يهمك.` 
            : `There is a new request for "${data?.productName || data?.message}" that might interest you.`}
        </p>
        <div style="margin-top: 32px;">
          <a href="${process.env.APP_URL}/dashboard" style="background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isAr ? 'عرض الطلب وتقديم عرض' : 'View Request & Make Offer'}
          </a>
        </div>
      `);
      break;
    case 'new_offer':
      subject = isAr ? "وصلك عرض جديد على طلبك" : "New Offer Received for Your Request";
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? 'عرض جديد!' : 'New Offer!'}</h2>
        <p style="color: #475569; line-height: 1.6;">
          ${isAr 
            ? `لقد تلقيت عرضاً جديداً على طلبك "${data?.productName}".` 
            : `You have received a new offer for your request "${data?.productName}".`}
        </p>
        <div style="margin-top: 32px;">
          <a href="${process.env.APP_URL}/dashboard" style="background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isAr ? 'مراجعة العروض' : 'Review Offers'}
          </a>
        </div>
      `);
      break;
    case 'new_message':
      subject = isAr ? "رسالة جديدة في انتظارك" : "New Message Waiting for You";
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? 'رسالة جديدة!' : 'New Message!'}</h2>
        <p style="color: #475569; line-height: 1.6;">
          ${isAr 
            ? `لقد أرسل لك ${data?.senderName} رسالة جديدة.` 
            : `${data?.senderName} sent you a new message.`}
        </p>
        <div style="margin-top: 32px;">
          <a href="${process.env.APP_URL}/chat" style="background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isAr ? 'الرد على الرسالة' : 'Reply to Message'}
          </a>
        </div>
      `);
      break;
    case 'offer_accepted':
      subject = isAr ? "تم قبول عرضك!" : "Your Offer Has Been Accepted!";
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? 'مبروك! تم قبول العرض' : 'Congratulations! Offer Accepted'}</h2>
        <p style="color: #475569; line-height: 1.6;">
          ${isAr 
            ? `لقد قام العميل بقبول عرض السعر الذي قدمته لـ "${data?.productName}".` 
            : `The customer has accepted the price offer you submitted for "${data?.productName}".`}
        </p>
        <div style="margin-top: 32px;">
          <a href="${process.env.APP_URL}/vendor/offers" style="background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isAr ? 'عرض تفاصيل الاتفاق' : 'View Deal Details'}
          </a>
        </div>
      `);
      break;
    case 'new_request_match':
      subject = isAr ? "تحذير اليقظة: وجدنا طلباً يطابق تخصصك!" : "Vigilance Alert: Found a Match for Your Specialty!";
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? 'فرصة ذهبية!' : 'Golden Opportunity!'}</h2>
        <p style="color: #475569; line-height: 1.6;">
          ${isAr 
            ? `لقد وجدنا طلباً لـ "${data?.productName}" بنسبة مطابقة ${data?.score || 0}%.` 
            : `We found a request for "${data?.productName}" with a ${data?.score || 0}% match score.`}
        </p>
        <div style="margin-top: 32px;">
          <a href="${process.env.APP_URL}/marketplace" style="background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isAr ? 'اقتنص الفرصة الآن' : 'Capture Opportunity Now'}
          </a>
        </div>
      `);
      break;
    case 'supplier_approved':
      subject = isAr ? "تم توثيق حسابك بنجاح ✨" : "Account Verified Successfully ✨";
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? 'مبارك! أنت الآن مورد موثوق' : 'Congrats! You are now a Verified Supplier'}</h2>
        <p style="color: #475569; line-height: 1.6;">
          ${isAr 
            ? 'تمت مراجعة حسابك وتفعيله رسمياً. يمكنك الآن التفاعل مع كافة الطلبات في السوق.' 
            : 'Your account has been reviewed and officially activated. You can now engage with all marketplace requests.'}
        </p>
        <div style="margin-top: 32px;">
          <a href="${process.env.APP_URL}/vendor/dashboard" style="background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isAr ? 'ابدأ كسب الأرباح' : 'Start Earning Profits'}
          </a>
        </div>
      `);
      break;
    case 'supplier_rejected':
      subject = isAr ? "تحديث بخصوص طلب التوثيق" : "Update on Your Verification Request";
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? 'نعتذر، لم يتم توثيق الحساب' : 'Sorry, Verification Not Approved'}</h2>
        <p style="color: #475569; line-height: 1.6;">
          ${isAr 
            ? 'يرجى مراجعة بياناتك والتأكد من صحة المستندات المرفقة ثم المحاولة مرة أخرى.' 
            : 'Please review your data and ensure documents are correct before trying again.'}
        </p>
      `);
      break;
    case 'chat_notification':
      subject = isAr ? `رسالة جديدة من ${data?.senderName}` : `New message from ${data?.senderName}`;
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? 'لديك رسالة غير مقروءة' : 'You have an unread message'}</h2>
        <p style="color: #475569; line-height: 1.6;">
          ${isAr 
            ? `لقد أرسل لك ${data?.senderName} رسالة جديدة وأنت غير متصل.` 
            : `${data?.senderName} sent you a new message while you were offline.`}
        </p>
        <div style="margin-top: 32px;">
          <a href="${process.env.APP_URL}/chat" style="background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isAr ? 'قراءة الرسالة' : 'Read Message'}
          </a>
        </div>
      `);
      break;
    case 'weekly_report':
      subject = isAr ? "تقرير الأداء الأسبوعي - Connect AI" : "Weekly Performance Report - Connect AI";
      html = getLayout(`
        <h2 style="color: #1e293b;">${isAr ? 'ملخص أدائك الأسبوعي' : 'Your Weekly Performance Summary'}</h2>
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #64748b;">${isAr ? 'مشاهدات الملف الشخصي:' : 'Profile Views:'}</span>
            <strong style="color: ${brandColor};">${data?.stats?.views || 0}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <span style="color: #64748b;">${isAr ? 'العروض المقدمة:' : 'Offers Sent:'}</span>
            <strong style="color: ${brandColor};">${data?.stats?.offers || 0}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">${isAr ? 'الصفقات المكتملة:' : 'Completed Deals:'}</span>
            <strong style="color: ${brandColor};">${data?.stats?.deals || 0}</strong>
          </div>
        </div>
        <p style="color: #475569; font-size: 14px;">
          ${isAr 
            ? 'استمر في التفاعل مع الطلبات لزيادة فرصك في الحصول على صفقات أكثر!' 
            : 'Keep engaging with requests to increase your chances of getting more deals!'}
        </p>
        <div style="margin-top: 32px;">
          <a href="${process.env.APP_URL}/vendor/dashboard" style="background-color: ${brandColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            ${isAr ? 'انتقل إلى لوحة التحكم' : 'Go to Dashboard'}
          </a>
        </div>
      `);
      break;
    default:
      return res.status(400).json({ error: "Invalid template" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `Connect AI <${process.env.FROM_EMAIL || "noreply@souq-connect.com"}>`,
      to: email,
      subject,
      html,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Email error:", error);
    res.status(500).json({ 
      error: "Failed to send email", 
      details: error.message || String(error) 
    });
  }
});

  // Test Email Diagnostic
  app.post("/api/test-email", async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ error: "SMTP credentials missing in environment" });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `Connect AI Diagnostics <${process.env.FROM_EMAIL || "diagnostics@souq-connect.com"}>`,
        to: email,
        subject: "Connectivity Test: Success! ✅",
        text: "Your SMTP configuration is correctly set and the server was able to send this test email.",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #059669;">Connection Success!</h2>
            <p>This is a diagnostic test from your Connect AI Marketplace server.</p>
            <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
            <p><strong>Auth verified:</strong> Yes</p>
            <p style="margin-top: 20px; color: #64748b; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
          </div>
        `
      });
      res.json({ success: true, message: "Test email sent successfully" });
    } catch (error: any) {
      console.error("Diagnostic SMTP error:", error);
      res.status(500).json({ 
        error: "SMTP Error", 
        details: error.message,
        code: error.code
      });
    }
  });

  // WhatsApp API & Concierge Alert Proxy
  app.post(["/api/send-whatsapp", "/api/send-concierge-alert"], async (req, res) => {
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
      res.status(500).json({ error: "Failed to send WhatsApp message" });
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
      
      // Implement a simple retry for 503 errors
      let result;
      let lastError;
      for (let i = 0; i < 3; i++) {
        try {
          result = await genAI.models.generateContent({
            model: model || "gemini-3-flash-preview",
            contents,
            config: config
          });
          break; // Success
        } catch (err: any) {
          lastError = err;
          const isRetryable = err.message?.includes('503') || err.message?.includes('UNAVAILABLE') || err.message?.includes('high demand');
          if (!isRetryable || i === 2) throw err;
          console.warn(`Gemini Proxy: 503 detected, retrying (${i + 1}/3)...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
      
      if (!result) throw lastError;
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
  const distPath = path.join(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === "production" && fs.existsSync(distPath);

  if (!isProduction) {
    console.log("Starting in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode serving from /dist...");
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
