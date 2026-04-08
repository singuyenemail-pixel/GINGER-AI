export interface Lead {
  id: number;
  company: string;
  contact: string;
  email: string;
  phone: string;
  location: string;
  volume: string;
  status: string;
  lastContact: string;
  type: string;
  gender: 'Male' | 'Female' | 'Other';
  customWhatsappMessage?: string;
  notes?: string;
  score?: number;
  scoreReasoning?: string;
  collectionDate: string;
  verificationStatus?: 'pending' | 'valid' | 'invalid' | 'verifying';
  verificationReason?: string;
}

const firstNames = ["Sarah", "Chen", "Marco", "David", "Emma", "James", "Maria", "Ahmed", "Yuki", "Alex", "Elena", "Michael", "Sophie", "Luis", "Anna", "Wei", "John", "Linda", "Robert", "Patricia", "Hiroshi", "Fatima", "Carlos", "Isabella", "Klaus", "Svetlana"];
const lastNames = ["Jenkins", "Wei", "Rossi", "Kim", "Lind", "Smith", "Garcia", "Ali", "Sato", "Johnson", "Ivanova", "Brown", "Martin", "Silva", "Muller", "Chen", "Williams", "Jones", "Davis", "Miller", "Tanaka", "Khan", "Rodriguez", "Schmidt", "Petrov"];

const realCompanies: { name: string; location: string; type: string; volume: string; notes: string }[] = [
  // USA
  { name: "McCormick & Company", location: "Hunt Valley, US", type: "Manufacturer", volume: "1200 MT/yr", notes: "Source: Google Search. High demand for organic dried ginger. Prefers bulk shipments. Contact via Gmail/Telephone." },
  { name: "The Ginger People", location: "Marina, US", type: "Retail Chain", volume: "850 MT/yr", notes: "Source: Facebook/Instagram. Specialized in ginger-based snacks. Looking for fresh young ginger. WhatsApp active." },
  { name: "Woodland Foods", location: "Waukegan, US", type: "Wholesaler", volume: "500 MT/yr", notes: "Source: LinkedIn. Supplies specialty food stores. Interested in sliced dried ginger. Email preferred." },
  { name: "Monterey Bay Spice Company", location: "Watsonville, US", type: "Distributor", volume: "300 MT/yr", notes: "Source: Google Maps. Bulk spice supplier. Needs consistent quality for herbal tea blends." },
  { name: "Pacific Spice Company", location: "Commerce, US", type: "Importer", volume: "650 MT/yr", notes: "Source: Import Records. Large scale importer for West Coast distribution. High volume demand." },
  { name: "Spice World Inc", location: "Orlando, US", type: "Retail Chain", volume: "450 MT/yr", notes: "Source: Facebook Ads. Major retail supplier. Looking for pre-packaged ginger products." },
  { name: "Frontier Co-op", location: "Norway, US", type: "Distributor", volume: "200 MT/yr", notes: "Source: Organic Trade Association. Focus on sustainable and fair trade ginger." },
  { name: "Burlap & Barrel", location: "New York, US", type: "Specialty", volume: "150 MT/yr", notes: "Source: Instagram. High-end spice curator. Interested in single-origin heirloom ginger." },
  // NETHERLANDS
  { name: "Nedspice Group", location: "Rotterdam, NL", type: "Importer", volume: "2500 MT/yr", notes: "Source: Port of Rotterdam data. Global player. Massive demand for industrial processing." },
  { name: "Verstegen Spices & Sauces", location: "Rotterdam, NL", type: "Manufacturer", volume: "900 MT/yr", notes: "Source: Industry Docs. Premium sauce manufacturer. Requires high essential oil content." },
  { name: "DO-IT Organic", location: "Barneveld, NL", type: "Wholesaler", volume: "400 MT/yr", notes: "Source: BioFach attendee. 100% organic focus. Strict certification requirements." },
  { name: "Royal Ingredients Group", location: "Alkmaar, NL", type: "Distributor", volume: "750 MT/yr", notes: "Source: Trade Fair. Supplies food industry across Europe. Reliable volume buyer." },
  { name: "Tradin Organic", location: "Amsterdam, NL", type: "Importer", volume: "1100 MT/yr", notes: "Source: Sustainability Report. Part of SunOpta. Global organic sourcing leader." },
  // GERMANY
  { name: "Fuchs Group", location: "Dissen, DE", type: "Manufacturer", volume: "1800 MT/yr", notes: "Source: German Spice Association. Largest spice producer in Germany. Constant demand." },
  { name: "AKO GmbH", location: "Sandhausen, DE", type: "Wholesaler", volume: "350 MT/yr", notes: "Source: Google Search. Specialized in Asian ingredients. Good for regular shipments." },
  { name: "Kreyenhop & Kluge", location: "Oyten, DE", type: "Importer", volume: "600 MT/yr", notes: "Source: Import Records. Major Asian food importer in Northern Germany." },
  // UK
  { name: "TRS Foods", location: "Southall, UK", type: "Distributor", volume: "1200 MT/yr", notes: "Source: Retail Data. Leading brand in ethnic food sector. High volume for retail packs." },
  { name: "East End Foods", location: "West Bromwich, UK", type: "Wholesaler", volume: "950 MT/yr", notes: "Source: WhatsApp Business. Large distribution network. Interested in bulk and retail." },
  { name: "Bart Ingredients", location: "Bristol, UK", type: "Retail Chain", volume: "300 MT/yr", notes: "Source: Instagram/Facebook. Premium retail brand. Focus on quality and provenance." },
  // UAE
  { name: "Lulu Group International", location: "Abu Dhabi, AE", type: "Retail Chain", volume: "3500 MT/yr", notes: "Source: Hypermarket Data. Massive retail footprint. Needs fresh ginger daily." },
  { name: "Spinneys", location: "Dubai, AE", type: "Retail Chain", volume: "1200 MT/yr", notes: "Source: Customer Feedback. High-end supermarket. Prefers premium air-freighted ginger." },
  { name: "Al Adil Trading", location: "Dubai, AE", type: "Wholesaler", volume: "800 MT/yr", notes: "Source: Google Maps. Specialized in Indian spices. High demand for dried ginger." },
  // JAPAN
  { name: "Ajinomoto", location: "Tokyo, JP", type: "Manufacturer", volume: "2200 MT/yr", notes: "Source: Corporate Docs. Global food giant. Uses ginger in various processed products." },
  { name: "House Foods Group", location: "Osaka, JP", type: "Manufacturer", volume: "1500 MT/yr", notes: "Source: Industry Report. Leading curry manufacturer. High demand for ginger paste." },
  { name: "S&B Foods", location: "Tokyo, JP", type: "Manufacturer", volume: "1300 MT/yr", notes: "Source: Trade Fair. Famous for wasabi and ginger products. Strict quality control." },
  // AUSTRALIA
  { name: "Buderim Ginger", location: "Yandina, AU", type: "Manufacturer", volume: "2000 MT/yr", notes: "Source: Official Website. World-renowned ginger processor. High demand for raw material." },
  { name: "Gourmet Garden", location: "Palmwoods, AU", type: "Manufacturer", volume: "600 MT/yr", notes: "Source: Facebook. Part of McCormick. Specialized in fresh-tasting herb pastes." },
  // SINGAPORE
  { name: "Olam International", location: "Singapore, SG", type: "Importer", volume: "4500 MT/yr", notes: "Source: Financial Reports. Global commodity trader. Major player in spice markets." },
  { name: "Wilmar International", location: "Singapore, SG", type: "Importer", volume: "3000 MT/yr", notes: "Source: Industry News. Agribusiness leader. Expanding spice portfolio." },
  // SOUTH KOREA
  { name: "CJ CheilJedang", location: "Seoul, KR", type: "Manufacturer", volume: "1800 MT/yr", notes: "Source: Corporate Website. Korea's top food company. High demand for ginger in sauces." },
  { name: "Ottogi", location: "Anyang, KR", type: "Manufacturer", volume: "1200 MT/yr", notes: "Source: Market Analysis. Major food processor. Consistent buyer of ginger powder." },
  // BRAZIL
  { name: "Cargill Brazil", location: "Sao Paulo, BR", type: "Importer", volume: "2500 MT/yr", notes: "Source: Trade Data. Global agribusiness. Sourcing for regional food industry." },
  { name: "BRF S.A.", location: "Itajai, BR", type: "Manufacturer", volume: "1400 MT/yr", notes: "Source: Annual Report. Large food processor. Uses ginger in meat seasonings." },
  // CANADA
  { name: "Loblaws", location: "Brampton, CA", type: "Retail Chain", volume: "1100 MT/yr", notes: "Source: Retail Intelligence. Canada's largest retailer. High demand for fresh ginger." },
  { name: "Sobeys", location: "Stellarton, CA", type: "Retail Chain", volume: "900 MT/yr", notes: "Source: Market Scan. Major grocery chain. Looking for organic options." },
  // TURKEY
  { name: "Bağdat Baharat", location: "Ankara, TR", type: "Manufacturer", volume: "700 MT/yr", notes: "Source: Google Search. Leading spice brand in Turkey. High demand for ground ginger." },
  { name: "Arifoğlu", location: "Istanbul, TR", type: "Retail Chain", volume: "500 MT/yr", notes: "Source: Instagram. Traditional spice merchant. Focus on high-quality natural products." },
  // SOUTH AFRICA
  { name: "Tiger Brands", location: "Johannesburg, ZA", type: "Manufacturer", volume: "1300 MT/yr", notes: "Source: Corporate Docs. Major African food producer. Uses ginger in various brands." },
  { name: "Woolworths SA", location: "Cape Town, ZA", type: "Retail Chain", volume: "600 MT/yr", notes: "Source: Customer Data. Premium retailer. High standards for fresh produce." },
  // CHINA
  { name: "COFCO", location: "Beijing, CN", type: "Importer", volume: "5000 MT/yr", notes: "Source: Government Data. State-owned food giant. Massive import capacity." },
  { name: "Haitian Flavoring", location: "Foshan, CN", type: "Manufacturer", volume: "3500 MT/yr", notes: "Source: Industry Report. World's largest soy sauce producer. High ginger usage." },
  // FRANCE
  { name: "Ducros", location: "Avignon, FR", type: "Manufacturer", volume: "1100 MT/yr", notes: "Source: Trade Fair. Part of McCormick. Leading spice brand in France." },
  { name: "Carrefour France", location: "Massy, FR", type: "Retail Chain", volume: "2200 MT/yr", notes: "Source: Retail News. Global retailer. High demand for fresh and dried ginger." },
  // ITALY
  { name: "Cannamela", location: "Bologna, IT", type: "Manufacturer", volume: "800 MT/yr", notes: "Source: Google Search. Italy's leading spice brand. Part of Montenegro Group." },
  { name: "Coop Italia", location: "Casalecchio di Reno, IT", type: "Retail Chain", volume: "1400 MT/yr", notes: "Source: Market Analysis. Major retail cooperative. Interested in sustainable sourcing." },
  // SPAIN
  { name: "Carmencita", location: "Alicante, ES", type: "Manufacturer", volume: "600 MT/yr", notes: "Source: Industry Docs. Iconic Spanish spice brand. High demand for ground ginger." },
  { name: "Mercadona", location: "Valencia, ES", type: "Retail Chain", volume: "1900 MT/yr", notes: "Source: Retail Intelligence. Spain's leading supermarket chain. Massive fresh ginger buyer." },
  // SWEDEN
  { name: "Santa Maria", location: "Mölndal, SE", type: "Manufacturer", volume: "950 MT/yr", notes: "Source: Corporate Website. Part of Paulig Group. Leading spice brand in Nordics." },
  { name: "ICA Gruppen", location: "Solna, SE", type: "Retail Chain", volume: "1100 MT/yr", notes: "Source: Retail News. Major Nordic retailer. High demand for organic ginger." },
  // VIETNAM
  { name: "Masan Group", location: "Ho Chi Minh City, VN", type: "Manufacturer", volume: "2800 MT/yr", notes: "Source: Financial Report. Major food processor. High demand for ginger in sauces." },
];

const statuses = ["Active", "Negotiating", "New Lead", "Qualified", "Inactive"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePhone(isWhatsApp = false): string {
  const countryCode = Math.floor(Math.random() * 90) + 10;
  const part1 = Math.floor(Math.random() * 900) + 100;
  const part2 = Math.floor(Math.random() * 9000) + 1000;
  const phone = `+${countryCode} ${part1} ${part2}`;
  return isWhatsApp ? `${phone} (WhatsApp)` : phone;
}

export function generateMockLeads(count: number): Lead[] {
  const leads: Lead[] = [];
  
  // Use the high-quality realCompanies list
  for (let i = 0; i < realCompanies.length && i < count; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const gender = ["Sarah", "Emma", "Maria", "Yuki", "Elena", "Sophie", "Anna", "Linda", "Patricia", "Fatima", "Isabella", "Svetlana"].includes(firstName) ? 'Female' : 'Male';
    const company = realCompanies[i];
    const emailDomain = company.name.toLowerCase().replace(/[^a-z]/g, '') + ".com";
    
    // Generate a random date within the last 120 days
    const daysAgo = Math.floor(Math.random() * 120);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const collectionDate = date.toISOString();

    leads.push({
      id: i + 1,
      company: company.name,
      contact: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`,
      phone: generatePhone(Math.random() > 0.4), // 60% chance of WhatsApp for these high-quality leads
      location: company.location,
      volume: company.volume,
      status: randomItem(statuses),
      lastContact: `${daysAgo} days ago`,
      type: company.type,
      gender: gender as 'Male' | 'Female' | 'Other',
      notes: company.notes,
      score: Math.floor(Math.random() * 40) + 40, // Baseline score between 40-80
      scoreReasoning: "Initial heuristic based on volume and location.",
      collectionDate: collectionDate
    });
  }
  
  return leads;
}
