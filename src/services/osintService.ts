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

export interface GingerLead {
  company_name: string;
  registration_status: string;
  demand_indicator: string;
  corporate_email: string;
  corporate_phone: string;
  data_source_url: string;
  government_source_type: string;
}

export interface GingerMarketResearchResult {
  report: string;
  leads: GingerLead[];
}

export async function performGingerMarketResearch(countries: string[]): Promise<GingerMarketResearchResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const countryFilter = countries.length > 0 ? `Focus research specifically on companies located in: ${countries.join(', ')}.` : 'Search globally.';
  const targetSitesList = TARGET_SITES.map(site => `- ${site}`).join('\n');

  const prompt = `You are an expert OSINT (Open Source Intelligence) Research Assistant. Your objective is to conduct comprehensive public data aggregation while strictly adhering to privacy and security boundaries.

# CONSTRAINTS
- Zero-Credential Policy: NEVER ask for, store, or attempt to use the user's passwords, session cookies, or personal login credentials.
- Anti-Hallucination: DO NOT guess or fabricate content located behind paywalls, private groups (e.g., WhatsApp, private Facebook groups), or login screens.
- Passive Analysis Only: You are strictly prohibited from attempting to post, interact, or authenticate on behalf of the user. Elegant handling of authentication roadblocks is managed via Human-in-the-Loop (HITL) alerts.

# OBJECTIVE Identify registered international corporate entities that possess an active, documented demand for importing agricultural ginger. Extract their official, public-facing contact information and verify their agricultural import/export licensing.

# TARGET RESEARCH SITES
Use the following search operators and sites as your primary intelligence sources:
${targetSitesList}

# DATA SOURCES & PERMITTED SITES
Permitted Sources: Official national government company registries, official customs and trade department databases, verified international B2B trading directories (e.g., Alibaba, TradeKey, Kompass), and official corporate domains/social media pages.

# DIRECTIVES
1. Public Aggregation: Synthesize all publicly accessible data related to the research objective.
2. Boundary Detection: Identify when relevant data is gated behind an authentication wall (e.g., private social media, forums, corporate portals).
3. Human-in-the-Loop (HITL) Alerting: When an authentication boundary is reached, immediately halt autonomous extraction for that specific vector and alert the user.

# EXECUTION STEPS
1. ${countryFilter}
2. Search global trade directories and official government import/export databases for corporate entities publishing active RFQs (Requests for Quote) or import records for "Ginger".
3. Cross-reference the identified companies against official national business registries and customs databases. Specifically, verify their registration details and search for active import/export licenses related to agricultural commodities.
4. Extract the direct link to the company's official corporate website (for verification purposes), their publicly listed corporate email, official corporate phone number, and physical headquarters location.
5. Identify the specific type of government source used for verification (e.g., 'National Registry', 'Customs Database').

# OUTPUT FORMAT Provide the findings in a strict JSON object using the exact schema below. Do not include conversational filler.

{
  "report": "[A strictly formatted Markdown report following the three sections below]",
  "leads": [
    {
      "company_name": "[Verified Corporate Entity Name]",
      "registration_status": "[Verified / Unverified / NULL]",
      "demand_indicator": "[Link to or description of ginger import demand/RFQ]",
      "corporate_email": "[Public email or NULL]",
      "corporate_phone": "[Public phone or NULL]",
      "data_source_url": "[Direct link to the official corporate website or verification source URL]",
      "government_source_type": "[Type of government source used, e.g., 'National Registry', 'Customs Database']"
    }
  ]
}

# REPORT STRUCTURE (for the 'report' field)
### 1. Public Findings
[Detail all successfully retrieved public data here using bullet points and verifiable URLs.]

### 2. ⚠️ [AUTH_REQUIRED] Bottlenecks
[List specific URLs, platforms, or groups that require human authentication to access.]
- Target: [Platform/URL]
- Reason: [e.g., Private Facebook Group, WhatsApp Invite Link]

### 3. Manual Action Plan
[Provide step-by-step instructions for the user to manually investigate the bottlenecks identified in Section 2 using their own authenticated accounts.]`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          report: { type: Type.STRING },
          leads: {
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
        required: ["report", "leads"],
      },
    },
  });

  return JSON.parse(response.text);
}
