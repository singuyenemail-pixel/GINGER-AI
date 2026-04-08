import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

export const TARGET_SITES = [
  "site:linkedin.com company",
  "site:yellowpages.com",
  "site:alibaba.com",
  "site:made-in-china.com",
  "site:globalsources.com",
  "site:kompass.com",
  "site:tradeindia.com",
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
];

export const HEADERS = {
  "User-Agent": USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
};

export interface GingerMarketResearchResult {
  company_name: string;
  registration_status: string;
  demand_indicator: string;
  corporate_email: string;
  corporate_phone: string;
  data_source_url: string;
  government_source_type: string;
}

export async function performGingerMarketResearch(countries: string[]): Promise<GingerMarketResearchResult[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const countryFilter = countries.length > 0 ? `Focus research specifically on companies located in: ${countries.join(', ')}.` : 'Search globally.';
  const targetSitesList = TARGET_SITES.map(site => `- ${site}`).join('\n');

  const prompt = `You are a Senior OSINT (Open Source Intelligence) Analyst and Global B2B Lead Generation Specialist. Your function is to execute highly accurate, deterministic market research strictly using publicly available, verified corporate data.

# OBJECTIVE Identify registered international corporate entities that possess an active, documented demand for importing agricultural ginger. Extract their official, public-facing contact information and verify their agricultural import/export licensing.

# TARGET RESEARCH SITES
Use the following search operators and sites as your primary intelligence sources:
${targetSitesList}

# DATA SOURCES & CONSTRAINTS

Permitted Sources: Official national government company registries, official customs and trade department databases, verified international B2B trading directories (e.g., Alibaba, TradeKey, Kompass), and official corporate domains/social media pages.
Prohibited Sources: Private communication platforms (WhatsApp, Skype, Zalo, Messenger) and personal user profiles.
Strict Adherence 1 (Anti-Hallucination): NEVER generate or guess contact information. If an official email or phone number is not publicly documented, output "NULL".
Strict Adherence 2 (Privacy Compliance): Only extract data belonging to registered businesses. Do not extract private individual PII.

# EXECUTION STEPS

1. ${countryFilter}
2. Search global trade directories and official government import/export databases for corporate entities publishing active RFQs (Requests for Quote) or import records for "Ginger".
3. Cross-reference the identified companies against official national business registries and customs databases. Specifically, verify their registration details and search for active import/export licenses related to agricultural commodities.
4. Extract the publicly listed corporate email, official corporate phone number, and physical headquarters location from their official website or verified B2B profile.
5. Identify the specific type of government source used for verification (e.g., 'National Registry', 'Customs Database').

# OUTPUT FORMAT Provide the findings in a strict JSON array using the exact schema below. Do not include conversational filler.

[
  {
    "company_name": "[Verified Corporate Entity Name]",
    "registration_status": "[Verified / Unverified / NULL]",
    "demand_indicator": "[Link to or description of ginger import demand/RFQ]",
    "corporate_email": "[Public email or NULL]",
    "corporate_phone": "[Public phone or NULL]",
    "data_source_url": "[URL where data was verified]",
    "government_source_type": "[Type of government source used, e.g., 'National Registry', 'Customs Database']"
  }
]`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            company_name: { type: Type.STRING },
            registration_status: { type: Type.STRING },
            demand_indicator: { type: Type.STRING },
            corporate_email: { type: Type.STRING },
            corporate_phone: { type: Type.STRING },
            data_source_url: { type: Type.STRING },
            government_source_type: { type: Type.STRING },
          },
          required: ["company_name", "registration_status", "demand_indicator", "corporate_email", "corporate_phone", "data_source_url", "government_source_type"],
        },
      },
    },
  });

  return JSON.parse(response.text);
}
