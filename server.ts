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
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.json({ valid: false, reason: "Invalid format" });
    }

    const domain = email.split("@")[1];
    
    try {
      // Check if domain has any DNS records (DNS exists)
      try {
        await resolveAny(domain);
      } catch (dnsError) {
        return res.json({ valid: false, reason: "Domain has no DNS records" });
      }

      // Check if domain has MX records
      try {
        const mxRecords = await resolveMx(domain);
        if (mxRecords && mxRecords.length > 0) {
          return res.json({ valid: true });
        } else {
          return res.json({ valid: false, reason: "Domain has no MX records" });
        }
      } catch (mxError) {
        return res.json({ valid: false, reason: "Domain has no MX records" });
      }
    } catch (error) {
      return res.json({ valid: false, reason: "Verification failed" });
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
