import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dns from "dns";
import { promisify } from "util";

const resolveMx = promisify(dns.resolveMx);
const resolveAny = promisify(dns.resolveAny);

const SENDER_CONTACT_FILE = path.join(process.cwd(), "sender_contact.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/sender-contact", (req, res) => {
    if (fs.existsSync(SENDER_CONTACT_FILE)) {
      const data = fs.readFileSync(SENDER_CONTACT_FILE, "utf-8");
      res.json(JSON.parse(data));
    } else {
      res.json({ name: "GINGER AI Team" });
    }
  });

  app.post("/api/sender-contact", (req, res) => {
    const { name } = req.body;
    fs.writeFileSync(SENDER_CONTACT_FILE, JSON.stringify({ name }), "utf-8");
    res.json({ status: "ok" });
  });

  app.post("/api/verify-email", async (req, res) => {
    const { email } = req.body;
    console.log(`[API] Verifying email: ${email}`);

    if (!email || typeof email !== "string" || !email.includes("@")) {
      console.log(`[API] Invalid email format: ${email}`);
      return res.json({ valid: false, reason: "Invalid format" });
    }

    const domain = email.split("@")[1];
    
    try {
      // Check if domain has MX records - using dns.promises for better reliability
      console.log(`[API] Resolving MX for domain: ${domain}`);
      try {
        const mxRecords = await dns.promises.resolveMx(domain);
        if (mxRecords && mxRecords.length > 0) {
          console.log(`[API] Valid MX records found for ${domain}`);
          return res.json({ valid: true });
        } else {
          console.log(`[API] No MX records for ${domain}`);
          return res.json({ valid: false, reason: "Domain has no MX records" });
        }
      } catch (dnsError: any) {
        console.log(`[API] DNS Error for ${domain}: ${dnsError.message}`);
        // If domain doesn't exist or no MX records
        return res.json({ valid: false, reason: `DNS Error: ${dnsError.code || 'Failed'}` });
      }
    } catch (error: any) {
      console.error(`[API] Unexpected error during verification for ${email}:`, error);
      return res.status(500).json({ valid: false, reason: "Internal server error during verification" });
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
