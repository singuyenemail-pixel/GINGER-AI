import React, { useState, useEffect, useRef, ChangeEvent } from "react"
import { Search, Filter, Download, Plus, MapPin, Building2, Phone, Mail, Globe, TrendingUp, Users, Activity, DollarSign, MessageCircle, ExternalLink, Linkedin, SearchCode, Sparkles, Wand2, CheckCircle2, AlertCircle, Bold, Italic, Underline, Type as TypeIcon, UserPlus, ShieldCheck, UserCircle, RefreshCw, X, LayoutDashboard, Contact as ContactIcon, Trash2, Edit2, Tag, Copy, Loader2, Code2, ShoppingBag, Truck, Handshake, Clock, Upload } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { GoogleGenAI, Type } from "@google/genai"
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import validator from 'validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"
import { Badge } from "./components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Tooltip } from "./components/ui/tooltip"
import { Select } from "./components/ui/select"
import { generateMockLeads, type Lead } from "./lib/mockData"
import { performGingerMarketResearch, type GingerMarketResearchResult } from "./services/osintService"

const volumeData = [
  { month: 'Jan', volume: 4000 },
  { month: 'Feb', volume: 3000 },
  { month: 'Mar', volume: 5000 },
  { month: 'Apr', volume: 4500 },
  { month: 'May', volume: 6000 },
  { month: 'Jun', volume: 5500 },
]

const priceData = [
  { month: 'Jan', price: 1.20 },
  { month: 'Feb', price: 1.25 },
  { month: 'Mar', price: 1.35 },
  { month: 'Apr', price: 1.30 },
  { month: 'May', price: 1.45 },
  { month: 'Jun', price: 1.50 },
]

const ROLES = {
  ADMIN: 'ADMIN',
  SALES_REP: 'SALES_REP'
} as const;

type Role = keyof typeof ROLES;

const PERMISSIONS = {
  [ROLES.ADMIN]: ['CAN_ADD_LEAD', 'CAN_BATCH_EMAIL', 'CAN_EXPORT_CSV', 'CAN_ENRICH', 'CAN_VIEW_DASHBOARD', 'CAN_CONTACT_WHATSAPP'],
  [ROLES.SALES_REP]: ['CAN_VIEW_DASHBOARD', 'CAN_CONTACT_WHATSAPP']
} as const;

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  category: string;
  location: string;
  notes?: string;
  lastInteraction: string;
  verificationStatus?: 'pending' | 'valid' | 'invalid' | 'verifying';
  verificationReason?: string;
  isAnonymized?: boolean;
}

interface DSAR {
  id: string;
  email: string;
  type: 'Access' | 'Erasure' | 'Rectification';
  status: 'Pending' | 'Completed' | 'Rejected';
  requestDate: string;
  details?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'contacts' | 'extractor' | 'osint' | 'privacy'>('dashboard')
  const [dsars, setDsars] = useState<DSAR[]>([
    { id: 'dsar-1', email: 'sarah.jenkins@mccormick.com', type: 'Erasure', status: 'Pending', requestDate: new Date().toISOString() },
    { id: 'dsar-2', email: 'chen.wei@nedspice.com', type: 'Access', status: 'Completed', requestDate: new Date(Date.now() - 86400000 * 2).toISOString() }
  ])
  const [unstructuredText, setUnstructuredText] = useState("")
  const [osintResults, setOsintResults] = useState<GingerMarketResearchResult[]>([])
  const [selectedCountries, setSelectedCountries] = useState<string[]>([])
  const [isPerformingOsint, setIsPerformingOsint] = useState(false)
  const [extractionError, setExtractionError] = useState("")
  const [userRole, setUserRole] = useState<Role>(ROLES.ADMIN)
  const [searchTerm, setSearchTerm] = useState("")
  const [locationFilter, setLocationFilter] = useState("All")
  const [typeFilter, setTypeFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")
  const [whatsappTemplate, setWhatsappTemplate] = useState("Hello {contact} from {company}, I'm contacting you from GINGER AI regarding ginger commodities.")
  const [emailTemplate, setEmailTemplate] = useState("<p>Dear {salutation} {contact},</p><p>We are contacting you from GINGER AI regarding your interest in ginger commodities for {company} in {location}.</p><p>We have noticed your significant volume of {volume} and would like to discuss how our premium ginger can support your operations.</p><p>Best regards,<br>{sender_name}</p>")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBatchEmailModalOpen, setIsBatchEmailModalOpen] = useState(false)
  const [isEnriching, setIsEnriching] = useState(false)
  const [isScoring, setIsScoring] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const [isGeneratingFollowUp, setIsGeneratingFollowUp] = useState(false)
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false)
  const [selectedLeadForFollowUp, setSelectedLeadForFollowUp] = useState<Lead | null>(null)
  const [generatedFollowUp, setGeneratedFollowUp] = useState("")
  const [enrichmentStatus, setEnrichmentStatus] = useState("")
  const [senderName, setSenderName] = useState("GINGER AI Team")
  const [testEmail, setTestEmail] = useState("")
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false)
  const quillRef = useRef<any>(null)
  const Quill = ReactQuill as any;
  const [newLead, setNewLead] = useState({
    company: "",
    contact: "",
    email: "",
    phone: "",
    location: "",
    type: "Importer",
    volume: "500 MT",
    status: "New Lead",
    gender: "Male" as 'Male' | 'Female' | 'Other',
    customWhatsappMessage: "",
    notes: ""
  })
  const [emailError, setEmailError] = useState("")
  const [phoneError, setPhoneError] = useState("")
  const [leads, setLeads] = useState<Lead[]>(() => generateMockLeads(50))
  const [selectedLeads, setSelectedLeads] = useState<number[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(today.getDate() - 5);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const thirtyFiveDaysAgo = new Date(today);
    thirtyFiveDaysAgo.setDate(today.getDate() - 35);

    return [
      { id: '1', name: 'John Smith', email: 'john@gingerworld.com', phone: '+1 234 567 890', company: 'Ginger World', category: 'Buyer', location: 'New York, US', lastInteraction: twoDaysAgo.toISOString() },
      { id: '2', name: 'Alice Wong', email: 'alice@spicetrade.sg', phone: '+65 9123 4567', company: 'Spice Trade SG', category: 'Partner', location: 'Singapore, SG', lastInteraction: fiveDaysAgo.toISOString() },
      { id: '3', name: 'Hans Muller', email: 'hans@euroginger.de', phone: '+49 123 456789', company: 'Euro Ginger', category: 'Supplier', location: 'Hamburg, DE', lastInteraction: sevenDaysAgo.toISOString() },
      { id: '4', name: 'Sarah Connor', email: 'sarah@skynet.com', phone: '+1 555 0199', company: 'Cyberdyne Systems', category: 'Buyer', location: 'Los Angeles, US', lastInteraction: thirtyFiveDaysAgo.toISOString() },
    ];
  })
  const contactsRef = useRef(contacts);
  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);
  const [contactSearchTerm, setContactSearchTerm] = useState("")
  const [contactCategoryFilter, setContactCategoryFilter] = useState("All")
  const [contactDateFilter, setContactDateFilter] = useState("All")
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false)
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false)
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false)
  const [currentContact, setCurrentContact] = useState<Contact | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractedJson, setExtractedJson] = useState<any>(null)
  const [newContact, setNewContact] = useState<Omit<Contact, 'id' | 'lastInteraction'>>({
    name: "",
    email: "",
    phone: "",
    company: "",
    category: "Buyer",
    location: "",
    notes: ""
  })
  const [quickContact, setQuickContact] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  })

  useEffect(() => {
    fetch("/api/sender-contact")
      .then(res => res.json())
      .then(data => {
        if (data.name) setSenderName(data.name);
      })
      .catch(err => console.error("Failed to fetch sender contact:", err));
  }, []);

  const saveSenderContact = (name: string) => {
    fetch("/api/sender-contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    }).catch(err => console.error("Failed to save sender contact:", err));
  };

  const hasPermission = (permission: string) => {
    return (PERMISSIONS[userRole] as readonly string[]).includes(permission);
  }

  const getSalutation = (lead: Lead) => {
    if (lead.gender === 'Male') return 'Mr.';
    if (lead.gender === 'Female') return 'Ms.';
    return '';
  }

  const handleBatchEmail = () => {
    setIsBatchEmailModalOpen(true);
  }

  const insertPlaceholder = (placeholder: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      quill.insertText(range.index, `{${placeholder}}`);
      quill.setSelection(range.index + placeholder.length + 2);
    }
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const generateBatchEmails = () => {
    if (selectedLeads.length === 0) return;
    
    const selectedData = leads.filter(l => selectedLeads.includes(l.id));
    const emailBody = selectedData.map(l => {
      const salutation = getSalutation(l);
      let body = emailTemplate
        .replace(/{salutation}/g, salutation)
        .replace(/{contact}/g, l.contact)
        .replace(/{company}/g, l.company)
        .replace(/{location}/g, l.location)
        .replace(/{volume}/g, l.volume)
        .replace(/{type}/g, l.type)
        .replace(/{sender_name}/g, senderName);
        
      // Strip HTML for the .txt download
      const plainTextBody = stripHtml(body);
        
      return `To: ${l.email}\nSubject: Inquiry from GINGER AI - ${l.company}\n\n${plainTextBody}`;
    }).join('\n\n' + '='.repeat(30) + '\n\n');

    const blob = new Blob([emailBody], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch_emails_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsBatchEmailModalOpen(false);
  }

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  }

  const toggleSelectLead = (id: number) => {
    if (selectedLeads.includes(id)) {
      setSelectedLeads(selectedLeads.filter(sid => sid !== id));
    } else {
      setSelectedLeads([...selectedLeads, id]);
    }
  }

  const enrichBatchLeads = async () => {
    if (selectedLeads.length === 0) return;
    setIsEnriching(true);
    setEnrichmentStatus("Analyzing leads...");
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const selectedData = leads.filter(l => selectedLeads.includes(l.id));
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Enrich these ginger buyer leads with professional contact details (emails, phones) and gender if missing. 
        Return ONLY a JSON array of updated lead objects. 
        Leads: ${JSON.stringify(selectedData.map(l => ({ id: l.id, company: l.company, contact: l.contact, location: l.location, email: l.email, phone: l.phone, gender: l.gender })))}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const enrichedData = JSON.parse(response.text);
      
      setLeads(prevLeads => prevLeads.map(l => {
        const enriched = enrichedData.find((e: any) => e.id === l.id);
        return enriched ? { ...l, ...enriched } : l;
      }));
      
      setEnrichmentStatus("Enrichment complete!");
      setTimeout(() => setEnrichmentStatus(""), 3000);
    } catch (error) {
      console.error("Enrichment error:", error);
      setEnrichmentStatus("Enrichment failed. Please try again.");
    } finally {
      setIsEnriching(false);
    }
  }

  const scoreBatchLeads = async () => {
    if (selectedLeads.length === 0) return;
    setIsScoring(true);
    setEnrichmentStatus("Analyzing lead conversion potential...");
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const selectedData = leads.filter(l => selectedLeads.includes(l.id));
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze these ginger buyer leads and assign a conversion score (0-100) and a brief reasoning (max 15 words). 
        Consider volume (higher is better), location (proximity to major ports/markets), and type (manufacturers/importers usually higher).
        Return ONLY a JSON array of objects with { id, score, scoreReasoning }. 
        Leads: ${JSON.stringify(selectedData.map(l => ({ id: l.id, company: l.company, location: l.location, volume: l.volume, type: l.type, notes: l.notes })))}`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const scoredData = JSON.parse(response.text);
      
      setLeads(prevLeads => prevLeads.map(l => {
        const scored = scoredData.find((s: any) => s.id === l.id);
        return scored ? { ...l, score: scored.score, scoreReasoning: scored.scoreReasoning } : l;
      }));
      
      setEnrichmentStatus("Scoring complete!");
      setTimeout(() => setEnrichmentStatus(""), 3000);
    } catch (error) {
      console.error("Scoring error:", error);
      setEnrichmentStatus("Scoring failed. Please try again.");
    } finally {
      setIsScoring(false);
    }
  }

  const generateFollowUp = async (lead: Lead) => {
    setSelectedLeadForFollowUp(lead);
    setIsFollowUpModalOpen(true);
    setIsGeneratingFollowUp(true);
    setGeneratedFollowUp("");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const salutation = getSalutation(lead);
      const prompt = `Generate a personalized, persuasive follow-up email for a ginger buyer lead.
      Lead Details:
      - Name: ${lead.contact} (${salutation})
      - Company: ${lead.company}
      - Location: ${lead.location}
      - Volume: ${lead.volume}
      - Lead Type: ${lead.type}
      - Score: ${lead.score || "N/A"}
      - Scoring Reasoning: ${lead.scoreReasoning || "N/A"}
      - Interaction History/Notes: ${lead.notes || "No previous notes"}
      - Last Contact: ${lead.lastContact}

      Context: We are GINGER AI, a premium ginger supplier.
      The email should be professional, reference their specific needs/volume, and suggest a clear next step (e.g., a call or sample shipment).
      Use a tone that matches their score (more urgent/direct for high scores, more educational for lower scores).
      Return ONLY the email body in HTML format (using <p>, <br>, <strong>). Do not include subject line.
      End with "Best regards, [Your Name]".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setGeneratedFollowUp(response.text.replace(/\[Your Name\]/g, senderName));
    } catch (error) {
      console.error("Follow-up generation error:", error);
      setGeneratedFollowUp("<p>Failed to generate follow-up. Please try again.</p>");
    } finally {
      setIsGeneratingFollowUp(false);
    }
  }

  const [isVerifyingAll, setIsVerifyingAll] = useState(false)
  const [isVerifyingAllLeads, setIsVerifyingAllLeads] = useState(false)
  const [isVerifyingAllContacts, setIsVerifyingAllContacts] = useState(false)

  // Background verification job
  useEffect(() => {
    const interval = setInterval(async () => {
      const currentContacts = contactsRef.current;
      if (currentContacts.length === 0) return;

      for (const contact of currentContacts) {
        // Skip already verifying or pending to avoid race conditions
        if (contact.verificationStatus === 'verifying' || contact.verificationStatus === 'pending') continue;

        try {
          const response = await fetch("/api/verify-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: contact.email })
          });
          const data = await response.json();

          if (!data.valid) {
            // Auto-delete invalid contact
            setContacts(prev => prev.filter(c => c.id !== contact.id));
          } else if (contact.verificationStatus !== 'valid') {
            // Update status if it became valid
            setContacts(prev => prev.map(c => c.id === contact.id ? { 
              ...c, 
              verificationStatus: 'valid'
            } : c));
          }
        } catch (error) {
          console.error("Background verification error for", contact.email, ":", error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const verifyEmail = async (contactId: string, email: string) => {
    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, verificationStatus: 'verifying' } : c));
    
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      
      setContacts(prev => prev.map(c => c.id === contactId ? { 
        ...c, 
        verificationStatus: data.valid ? 'valid' : 'invalid',
        verificationReason: data.reason
      } : c));
      
      return data.valid;
    } catch (error) {
      console.error("Email verification error:", error);
      setContacts(prev => prev.map(c => c.id === contactId ? { 
        ...c, 
        verificationStatus: 'invalid',
        verificationReason: "Verification failed"
      } : c));
      return false;
    }
  }

  const verifyAllContacts = async () => {
    setIsVerifyingAllContacts(true);
    for (const contact of filteredContacts) {
      if (contact.verificationStatus === 'valid') continue;
      await verifyEmail(contact.id, contact.email);
    }
    setIsVerifyingAllContacts(false);
  }

  const [isCollecting, setIsCollecting] = useState(false);

  const collectGingerBuyers = async () => {
    setIsCollecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Find recent ginger buyer announcements, ginger import demand, or ginger buyer directories from the last 12 months. Extract company name, contact person, email, phone, and location.",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                company: { type: Type.STRING },
                contact: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                location: { type: Type.STRING },
              },
              required: ["company", "contact", "email"],
            },
          },
        },
      });

      const buyers = JSON.parse(response.text);
      
      // Add to leads
      for (const buyer of buyers) {
        const leadId = Date.now() + Math.random();
        const newLead: Lead = {
          id: leadId,
          company: buyer.company,
          contact: buyer.contact,
          email: buyer.email,
          phone: buyer.phone || "",
          location: buyer.location || "",
          type: "Importer",
          volume: "Unknown",
          status: "New Lead",
          lastContact: new Date().toISOString().split('T')[0],
          collectionDate: new Date().toISOString(),
          gender: "Other",
          verificationStatus: 'verifying'
        };
        setLeads(prev => [newLead, ...prev]);
        verifyLeadEmail(leadId, newLead.email);
      }
    } catch (error) {
      console.error("Collection error:", error);
    } finally {
      setIsCollecting(false);
    }
  }

  const verifyLeadEmail = async (leadId: number, email: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, verificationStatus: 'verifying' } : l));
    
    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      
      setLeads(prev => prev.map(l => l.id === leadId ? { 
        ...l, 
        verificationStatus: data.valid ? 'valid' : 'invalid',
        verificationReason: data.reason
      } : l));
      
      return data.valid;
    } catch (error) {
      console.error("Lead email verification error:", error);
      setLeads(prev => prev.map(l => l.id === leadId ? { 
        ...l, 
        verificationStatus: 'invalid',
        verificationReason: "Verification failed"
      } : l));
      return false;
    }
  }

  const verifyAllLeads = async () => {
    setIsVerifyingAllLeads(true);
    for (const lead of filteredLeads) {
      if (lead.verificationStatus === 'valid') continue;
      await verifyLeadEmail(lead.id, lead.email);
    }
    setIsVerifyingAllLeads(false);
  }

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.email || !newContact.phone) return;
    
    const contactId = Math.random().toString(36).substr(2, 9);
    const contactToAdd: Contact = {
      ...newContact,
      id: contactId,
      lastInteraction: 'Just now',
      verificationStatus: 'pending'
    };
    
    setContacts([contactToAdd, ...contacts]);
    setIsAddContactModalOpen(false);
    verifyEmail(contactId, contactToAdd.email);
    setNewContact({
      name: "",
      email: "",
      phone: "",
      company: "",
      category: "Buyer",
      location: "",
      notes: ""
    });

    // Verify in background
    if (contactToAdd.email) {
      verifyEmail(contactId, contactToAdd.email);
    }
  }

  const handleQuickAddContact = async () => {
    if (!quickContact.name || !quickContact.email) return;
    
    const contactId = Math.random().toString(36).substr(2, 9);
    const contactToAdd: Contact = {
      ...quickContact,
      id: contactId,
      category: 'Lead', // Default category
      location: 'Unknown', // Default location
      lastInteraction: 'Just now',
      verificationStatus: 'pending'
    };
    
    setContacts([contactToAdd, ...contacts]);
    setIsQuickAddModalOpen(false);
    verifyEmail(contactId, contactToAdd.email);
    setQuickContact({
      name: "",
      company: "",
      email: "",
      phone: "",
    });
  }

  const handleUpdateContact = () => {
    if (!currentContact) return;
    
    // Check if email changed
    const oldContact = contacts.find(c => c.id === currentContact.id);
    const emailChanged = oldContact?.email !== currentContact.email;
    
    const updatedContact = {
      ...currentContact,
      verificationStatus: emailChanged ? 'pending' : (currentContact.verificationStatus || 'pending')
    };
    
    setContacts(contacts.map(c => c.id === updatedContact.id ? updatedContact : c));
    setIsEditContactModalOpen(false);
    setCurrentContact(null);

    // Trigger verification if email changed or was pending
    if ((emailChanged || updatedContact.verificationStatus === 'pending') && updatedContact.email) {
      verifyEmail(updatedContact.id, updatedContact.email);
    }
  }

  const anonymizeContact = (id: string) => {
    setContacts(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          name: "ANONYMIZED USER",
          email: "anonymized@example.com",
          phone: "000-000-0000",
          isAnonymized: true,
          notes: "Data anonymized per GDPR request."
        };
      }
      return c;
    }));
  };

  const anonymizeLead = (id: number) => {
    setLeads(prev => prev.map(l => {
      if (l.id === id) {
        return {
          ...l,
          contact: "ANONYMIZED CONTACT",
          email: "anonymized@example.com",
          phone: "000-000-0000",
          notes: "Lead data anonymized per GDPR request."
        };
      }
      return l;
    }));
  };

  const handleDSARAction = (dsarId: string, newStatus: 'Completed' | 'Rejected') => {
    const dsar = dsars.find(d => d.id === dsarId);
    if (dsar && dsar.type === 'Erasure' && newStatus === 'Completed') {
      // Find and anonymize matching contact/lead
      const contact = contacts.find(c => c.email === dsar.email);
      if (contact) anonymizeContact(contact.id);
      
      const lead = leads.find(l => l.email === dsar.email);
      if (lead) anonymizeLead(lead.id);
    }
    
    setDsars(prev => prev.map(d => d.id === dsarId ? { ...d, status: newStatus } : d));
  };

  const handleDeleteContact = (id: string) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      setContacts(contacts.filter(c => c.id !== id));
    }
  }

  const deleteInvalidContacts = () => {
    const invalidContacts = contacts.filter(c => c.verificationStatus === 'invalid');
    if (invalidContacts.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete all ${invalidContacts.length} invalid contacts?`)) {
      setContacts(contacts.filter(c => c.verificationStatus !== 'invalid'));
    }
  }

  const bulkDeleteContacts = () => {
    if (selectedContactIds.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedContactIds.length} contacts?`)) {
      setContacts(contacts.filter(c => !selectedContactIds.includes(c.id)));
      setSelectedContactIds([]);
    }
  }

  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) || 
                          c.company.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                          c.email.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                          c.phone.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
                          c.location.toLowerCase().includes(contactSearchTerm.toLowerCase());
    const matchesCategory = contactCategoryFilter === "All" || c.category === contactCategoryFilter;
    
    let matchesDate = true;
    if (contactDateFilter !== "All") {
      const interactionDate = new Date(c.lastInteraction);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - interactionDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (contactDateFilter === "Last 7 Days") {
        matchesDate = diffDays <= 7;
      } else if (contactDateFilter === "Last 30 Days") {
        matchesDate = diffDays <= 30;
      } else if (contactDateFilter === "More than 30 Days") {
        matchesDate = diffDays > 30;
      }
    }
    
    return matchesSearch && matchesCategory && matchesDate;
  });

  const uniqueContactCategories = ["All", ...Array.from(new Set(contacts.map(c => c.category))).sort()]

  const validateEmail = (email: string) => {
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!validator.isEmail(email)) {
      setEmailError("Please enter a valid email address (e.g., user@domain.com)");
      return false;
    }
    setEmailError("");
    return true;
  }

  const validatePhone = (phone: string) => {
    if (!phone) {
      setPhoneError("");
      return true;
    }
    const phoneNumber = parsePhoneNumberFromString(phone);
    if (!phoneNumber || !phoneNumber.isValid()) {
      setPhoneError("Please enter a valid international phone number (e.g., +1 234 567 890)");
      return false;
    }
    setPhoneError("");
    return true;
  }

  const handleAddLead = () => {
    const isEmailValid = validateEmail(newLead.email);
    const isPhoneValid = validatePhone(newLead.phone);
    
    if (!isEmailValid || !isPhoneValid) return;
    
    const leadId = Date.now();
    const leadToAdd: Lead = {
      ...newLead,
      id: leadId,
      lastContact: new Date().toISOString().split('T')[0],
      collectionDate: new Date().toISOString(),
      verificationStatus: 'verifying'
    };
    
    setLeads([leadToAdd, ...leads]);
    setIsAddModalOpen(false);
    setNewLead({
      company: "",
      contact: "",
      email: "",
      phone: "",
      location: "",
      type: "Importer",
      volume: "500 MT",
      status: "New Lead",
      gender: "Male",
      customWhatsappMessage: "",
      notes: ""
    });

    // Verify in background
    verifyLeadEmail(leadId, leadToAdd.email);
  }

  const uniqueLocations = ["All", ...Array.from(new Set(leads.map(l => l.location))).sort()]
  const uniqueTypes = ["All", ...Array.from(new Set(leads.map(l => l.type))).sort()]
  const uniqueStatuses = ["All", ...Array.from(new Set(leads.map(l => l.status))).sort()]

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         l.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         l.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === "All" || l.location === locationFilter;
    const matchesType = typeFilter === "All" || l.type === typeFilter;
    const matchesStatus = statusFilter === "All" || l.status === statusFilter;
    
    return matchesSearch && matchesLocation && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge variant="success">{status}</Badge>
      case 'Negotiating': return <Badge variant="warning">{status}</Badge>
      case 'New Lead': return <Badge variant="default">{status}</Badge>
      case 'Qualified': return <Badge variant="secondary">{status}</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  const exportToCSV = () => {
    if (filteredLeads.length === 0) return;

    const headers = ["ID", "Company", "Contact", "Gender", "Email", "Phone", "Location", "Volume", "Status", "Type", "Last Contact", "Score", "Collection Date", "Notes"];
    const csvRows = [
      headers.join(","),
      ...filteredLeads.map(lead => [
        lead.id,
        `"${lead.company}"`,
        `"${lead.contact}"`,
        `"${lead.gender}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.location}"`,
        `"${lead.volume}"`,
        `"${lead.status}"`,
        `"${lead.type}"`,
        `"${lead.lastContact}"`,
        `"${lead.score || ''}"`,
        `"${lead.collectionDate || ''}"`,
        `"${(lead.notes || '').replace(/"/g, '""')}"`
      ].join(","))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "ginger_buyers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportContactsToCSV = () => {
    const contactsToExport = selectedContactIds.length > 0
      ? contacts.filter(c => selectedContactIds.includes(c.id))
      : filteredContacts;

    if (contactsToExport.length === 0) return;

    const headers = ["ID", "Name", "Email", "Phone", "Company", "Category", "Location", "Last Interaction"];
    const csvRows = [
      headers.join(","),
      ...contactsToExport.map(contact => [
        contact.id,
        `"${contact.name.replace(/"/g, '""')}"`,
        `"${contact.email.replace(/"/g, '""')}"`,
        `"${contact.phone.replace(/"/g, '""')}"`,
        `"${contact.company.replace(/"/g, '""')}"`,
        `"${contact.category.replace(/"/g, '""')}"`,
        `"${contact.location.replace(/"/g, '""')}"`,
        `"${contact.lastInteraction.replace(/"/g, '""')}"`
      ].join(","))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `contacts_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n');
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const newContacts: Contact[] = lines.slice(1).filter(line => line.trim()).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const contact: any = {
          id: `imported-${Date.now()}-${index}`,
          lastInteraction: new Date().toISOString(),
          verificationStatus: 'pending'
        };
        
        headers.forEach((header, i) => {
          const key = header.toLowerCase().replace(/ /g, '');
          if (['name', 'email', 'phone', 'company', 'category', 'location'].includes(key)) {
            contact[key] = values[i] || "";
          }
        });
        
        return contact as Contact;
      });

      setContacts(prev => [...prev, ...newContacts]);
    };
    reader.readAsText(file);
  };

  const asianLocations = ["Singapore, SG", "Mumbai, IN", "Tokyo, JP", "Shanghai, CN", "Dubai, AE", "Seoul, KR"];

  const exportAsiaToCSV = () => {
    const asianLeads = leads.filter(l => asianLocations.includes(l.location));
    
    if (asianLeads.length === 0) return;

    const headers = ["ID", "Company", "Contact", "Gender", "Email", "Phone", "Location", "Volume", "Status", "Type", "Last Contact"];
    const csvRows = [
      headers.join(","),
      ...asianLeads.map(lead => [
        lead.id,
        `"${lead.company}"`,
        `"${lead.contact}"`,
        `"${lead.gender}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.location}"`,
        `"${lead.volume}"`,
        `"${lead.status}"`,
        `"${lead.type}"`,
        `"${lead.lastContact}"`
      ].join(","))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "ginger_buyers_asia.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const jpSgKrLocations = ["Tokyo, JP", "Singapore, SG", "Seoul, KR"];

  const exportJpSgKrToCSV = () => {
    const targetLeads = leads.filter(l => jpSgKrLocations.includes(l.location));
    
    if (targetLeads.length === 0) return;

    const headers = ["ID", "Company", "Contact", "Gender", "Email", "Phone", "Location", "Volume", "Status", "Type", "Last Contact"];
    const csvRows = [
      headers.join(","),
      ...targetLeads.map(lead => [
        lead.id,
        `"${lead.company}"`,
        `"${lead.contact}"`,
        `"${lead.gender}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.location}"`,
        `"${lead.volume}"`,
        `"${lead.status}"`,
        `"${lead.type}"`,
        `"${lead.lastContact}"`
      ].join(","))
    ];

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "ginger_buyers_jp_sg_kr.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const exportSingleLeadToCSV = (lead: Lead) => {
    const headers = ["ID", "Company", "Contact", "Gender", "Email", "Phone", "Location", "Volume", "Status", "Type", "Last Contact"];
    const csvRows = [
      headers.join(","),
      [
        lead.id,
        `"${lead.company}"`,
        `"${lead.contact}"`,
        `"${lead.gender}"`,
        `"${lead.email}"`,
        `"${lead.phone}"`,
        `"${lead.location}"`,
        `"${lead.volume}"`,
        `"${lead.status}"`,
        `"${lead.type}"`,
        `"${lead.lastContact}"`
      ].join(",")
    ];

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `buyer_${lead.company.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const openWhatsApp = (lead: Lead) => {
    const numericPart = lead.phone.split('(')[0].trim();
    const cleanPhone = numericPart.replace(/[^\d+]/g, '');
    
    // Use custom message if available, otherwise use template
    let message = lead.customWhatsappMessage || whatsappTemplate;
    
    // Replace placeholders
    message = message
      .replace(/{contact}/g, lead.contact)
      .replace(/{company}/g, lead.company);
      
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  }

  const openHunter = (lead: Lead) => {
    const domain = lead.email.split('@')[1];
    window.open(`https://hunter.io/search/${domain}`, '_blank');
  }

  const openApollo = (lead: Lead) => {
    const query = encodeURIComponent(lead.company);
    window.open(`https://www.apollo.io/search?q=${query}`, '_blank');
  }

  const openLinkedIn = (lead: Lead) => {
    const query = encodeURIComponent(`${lead.company} Procurement Manager`);
    window.open(`https://www.linkedin.com/search/results/people/?keywords=${query}`, '_blank');
  }

  const handleExtract = async () => {
    if (!unstructuredText.trim()) return;
    setIsExtracting(true);
    setExtractionError("");
    setExtractedJson(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const systemInstruction = `You are a highly precise Data Extraction and Normalization Engine. Your purpose is to parse unstructured text, identify customer contact information, map it to standardized global platforms, and format the output for a downstream database.

# TASK
Extract customer contact data from the user's input and structure it into a strict JSON payload.

# CONSTRAINTS & RULES
1. **Platform Standardization**: Map extracted handles strictly to the following approved keys: 
   'notebook', 'facebook', 'instagram', 'whatsapp', 'wechat', 'telegram', 'amazon', 'tiktok', 'messenger'.
2. **Strict Extraction**: NEVER invent or hallucinate data. If a platform is not present in the input, omit it from the output.
3. **Email Handling & MX Prep**: You cannot verify MX records natively. For every email extracted, you must append "mx_verified": false and "domain_ready_for_check": true so the backend system knows to execute the DNS lookup before saving.
4. **PII Safety**: Ignore and discard any sensitive data (e.g., passwords, credit cards, SSNs) found in the text. 
5. **No Conversational Output**: Return ONLY valid JSON. Do not include markdown blocks, greetings, or explanations.

# OUTPUT FORMAT (JSON SCHEMA)
{
  "customer_contacts": [
    {
      "platform": "<standardized_platform_name>",
      "handle": "<extracted_username_or_number>"
    }
  ],
  "emails": [
    {
      "address": "<extracted_email>",
      "domain": "<extracted_domain_only>",
      "mx_verified": false,
      "domain_ready_for_check": true
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: unstructuredText,
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text);
      setExtractedJson(result);
    } catch (error) {
      console.error("Extraction error:", error);
      setExtractionError("Failed to extract data. Ensure the input contains valid contact information.");
    } finally {
      setIsExtracting(false);
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUnstructuredText(content);
    };
    reader.readAsText(file);
  };

  const getCollectionBatches = () => {
    if (leads.length === 0) return [];
    
    const sortedLeads = [...leads].sort((a, b) => new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime());
    const earliestDate = new Date(sortedLeads[0].collectionDate);
    
    const batches: { start: Date; end: Date; leads: Lead[] }[] = [];
    let currentStart = new Date(earliestDate);
    
    while (currentStart <= new Date()) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 30);
      
      const batchLeads = leads.filter(lead => {
        const d = new Date(lead.collectionDate);
        return d >= currentStart && d < currentEnd;
      });
      
      if (batchLeads.length > 0) {
        batches.push({ start: new Date(currentStart), end: new Date(currentEnd), leads: batchLeads });
      }
      
      currentStart = new Date(currentEnd);
    }
    
    return batches.reverse(); // Show newest batches first
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;
    setIsSendingTestEmail(true);
    
    // Mock sending email
    const firstLead = leads[0];
    const salutation = getSalutation(firstLead);
    const body = emailTemplate
      .replace(/{salutation}/g, salutation)
      .replace(/{contact}/g, firstLead.contact)
      .replace(/{company}/g, firstLead.company)
      .replace(/{location}/g, firstLead.location)
      .replace(/{volume}/g, firstLead.volume)
      .replace(/{type}/g, firstLead.type)
      .replace(/{sender_name}/g, senderName);

    console.log(`Sending test email to ${testEmail}:`, body);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSendingTestEmail(false);
    alert(`Test email sent to ${testEmail}`);
  }

  const refreshResearch = () => {
    setIsEnriching(true);
    setEnrichmentStatus("Initializing global market search...");
    
    const steps = [
      "Searching global import/export records...",
      "Extracting buyer contact details from trade directories...",
      "Validating email MX records and phone numbers...",
      "Analyzing buyer volume and market relevance...",
      "Grouping contacts into 30-day collection batches...",
      "Finalizing market research update..."
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setEnrichmentStatus(steps[currentStep]);
        currentStep++;
      } else {
        clearInterval(interval);
        setLeads(generateMockLeads(50));
        setEnrichmentStatus("Market research updated. Contacts grouped by 30-day collection periods.");
        setIsEnriching(false);
        setTimeout(() => setEnrichmentStatus(""), 5000);
      }
    }, 1500);
  }

  const clearExtractor = () => {
    setUnstructuredText("");
    setExtractedJson(null);
    setExtractionError("");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-8 border-b bg-white px-6 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter text-emerald-700">
          <div className="bg-emerald-600 p-1.5 rounded-lg">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <span>GINGER AI</span>
        </div>

        <nav className="flex items-center gap-1">
          <Button 
            variant={activeTab === 'dashboard' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('dashboard')}
            className={activeTab === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : ''}
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Market Overview
          </Button>
          <Button 
            variant={activeTab === 'contacts' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('contacts')}
            className={activeTab === 'contacts' ? 'bg-emerald-50 text-emerald-700' : ''}
          >
            <ContactIcon className="h-4 w-4 mr-2" />
            Contacts
          </Button>
          <Button 
            variant={activeTab === 'extractor' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('extractor')}
            className={activeTab === 'extractor' ? 'bg-emerald-50 text-emerald-700' : ''}
          >
            <SearchCode className="h-4 w-4 mr-2" />
            Data Extractor
          </Button>
          <Button 
            variant={activeTab === 'osint' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('osint')}
            className={activeTab === 'osint' ? 'bg-emerald-50 text-emerald-700' : ''}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            OSINT Research
          </Button>
          <Button 
            variant={activeTab === 'privacy' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setActiveTab('privacy')}
            className={activeTab === 'privacy' ? 'bg-emerald-50 text-emerald-700' : ''}
          >
            <ShieldCheck className="h-4 w-4 mr-2" />
            Privacy & GDPR
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
            <UserCircle className="h-4 w-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">Role:</span>
            <Select 
              value={userRole} 
              onChange={(e) => setUserRole(e.target.value as Role)}
              className="h-6 text-[10px] border-none bg-transparent focus:ring-0 p-0 w-24"
            >
              <option value={ROLES.ADMIN}>Administrator</option>
              <option value={ROLES.SALES_REP}>Sales Rep</option>
            </Select>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="search"
              placeholder="Search by name, company, email, or location..."
              className="w-full bg-slate-100 pl-9 border-none focus-visible:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {hasPermission('CAN_ADD_LEAD') && (
            <Button 
              size="sm" 
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Lead
            </Button>
          )}
        </div>
      </header>

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader className="relative">
              <CardTitle>Add New Global Lead</CardTitle>
              <CardDescription>Enter the details of the new ginger buyer.</CardDescription>
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 rounded-full"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input 
                  placeholder="e.g. Spice World Ltd" 
                  value={newLead.company}
                  onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Contact</label>
                <Input 
                  placeholder="e.g. John Doe" 
                  value={newLead.contact}
                  onChange={(e) => setNewLead({...newLead, contact: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input 
                  type="email"
                  placeholder="e.g. john@spiceworld.com" 
                  value={newLead.email}
                  onChange={(e) => {
                    setNewLead({...newLead, email: e.target.value});
                    validateEmail(e.target.value);
                  }}
                  className={emailError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <Input 
                  placeholder="e.g. +1 234 567 890" 
                  value={newLead.phone}
                  onChange={(e) => {
                    setNewLead({...newLead, phone: e.target.value});
                    validatePhone(e.target.value);
                  }}
                  className={phoneError ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> Custom WhatsApp Message (Optional)
                </label>
                <Input 
                  placeholder="e.g. Hi {contact}, checking in from GINGER AI..." 
                  value={newLead.customWhatsappMessage}
                  onChange={(e) => setNewLead({...newLead, customWhatsappMessage: e.target.value})}
                  className="text-xs"
                />
                <p className="text-[10px] text-slate-500 italic">Use {"{contact}"} and {"{company}"} as placeholders.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input 
                    placeholder="e.g. New York, US" 
                    value={newLead.location}
                    onChange={(e) => setNewLead({...newLead, location: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Gender</label>
                  <Select 
                    value={newLead.gender}
                    onChange={(e) => setNewLead({...newLead, gender: e.target.value as any})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lead Type</label>
                <Select 
                  value={newLead.type}
                  onChange={(e) => setNewLead({...newLead, type: e.target.value})}
                >
                  <option value="Importer">Importer</option>
                  <option value="Wholesaler">Wholesaler</option>
                  <option value="Retailer">Retailer</option>
                  <option value="Manufacturer">Manufacturer</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Buyer Intelligence / Notes</label>
                <textarea 
                  className="w-full h-24 p-3 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50"
                  placeholder="e.g. Source: LinkedIn. High demand for organic dried ginger..."
                  value={newLead.notes}
                  onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsAddModalOpen(false);
                  setEmailError("");
                }}>Cancel</Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleAddLead}
                  disabled={!!emailError || !newLead.email || !newLead.company || !newLead.contact}
                >
                  Save Lead
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batch Email Modal */}
      {isBatchEmailModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader className="bg-blue-600 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Batch Email Composer</CardTitle>
                  <CardDescription className="text-blue-100">
                    Generating personalized letters for {selectedLeads.length} buyers.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <Mail className="h-8 w-8 opacity-20" />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-white hover:bg-blue-500 rounded-full"
                    onClick={() => setIsBatchEmailModalOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700">Email Template</label>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        disabled={isImproving}
                        onClick={async () => {
                          setIsImproving(true);
                          try {
                            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
                            const response = await ai.models.generateContent({
                              model: "gemini-3-flash-preview",
                              contents: `Improve this email content while keeping the placeholders {salutation}, {contact}, {company}, {location}, {volume}, and {sender_name}. Make it more persuasive and professional. Return HTML format: \n\n ${emailTemplate}`,
                            });
                            setEmailTemplate(response.text);
                          } catch (error) {
                            console.error("Failed to improve email:", error);
                          } finally {
                            setIsImproving(false);
                          }
                        }}
                      >
                        {isImproving ? <Activity className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />} 
                        AI Improve Content
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        onClick={async () => {
                          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
                          const response = await ai.models.generateContent({
                            model: "gemini-3-flash-preview",
                            contents: "Write a professional, persuasive email template for selling premium ginger to international buyers. Use placeholders like {salutation}, {contact}, {company}, {location}, {volume}, and {sender_name}. Keep it concise but formal. Return HTML format with basic tags like <p>, <br>, <strong>, <em>.",
                          });
                          setEmailTemplate(response.text);
                        }}
                      >
                        <Sparkles className="h-3 w-3 mr-1" /> AI Generate Template
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border rounded-md">
                    <span className="text-[10px] font-bold text-slate-400 uppercase w-full mb-1">Insert Placeholders</span>
                    {[
                      { id: 'salutation', label: 'Salutation', icon: <UserPlus className="h-3 w-3" /> },
                      { id: 'contact', label: 'Contact Name', icon: <Users className="h-3 w-3" /> },
                      { id: 'company', label: 'Company', icon: <Building2 className="h-3 w-3" /> },
                      { id: 'location', label: 'Location', icon: <MapPin className="h-3 w-3" /> },
                      { id: 'volume', label: 'Volume', icon: <TrendingUp className="h-3 w-3" /> },
                      { id: 'sender_name', label: 'Sender Name', icon: <UserCircle className="h-3 w-3" /> },
                    ].map(p => (
                      <Button
                        key={p.id}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] px-2 py-0 border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        onClick={() => insertPlaceholder(p.id)}
                      >
                        {p.icon}
                        <span className="ml-1">{p.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="quill-wrapper border rounded-lg overflow-hidden bg-white">
                  <Quill 
                    ref={quillRef}
                    theme="snow"
                    value={emailTemplate}
                    onChange={setEmailTemplate}
                    modules={{
                      toolbar: [
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['clean']
                      ],
                    }}
                    placeholder="Dear {salutation} {contact}..."
                    className="h-48"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Sender Contact (Auto-saves)</label>
                <div className="flex gap-2">
                  <Input 
                    value={senderName}
                    onChange={(e) => {
                      setSenderName(e.target.value);
                      saveSenderContact(e.target.value);
                    }}
                    placeholder="Your Name / Company Name"
                    className="h-9"
                  />
                </div>
                <p className="text-[10px] text-slate-500 italic">This will be used for the {"{sender_name}"} placeholder.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Send Test Email</label>
                <div className="flex gap-2">
                  <Input 
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="test@example.com"
                    className="h-9"
                  />
                  <Button 
                    variant="outline"
                    onClick={sendTestEmail}
                    disabled={isSendingTestEmail || !testEmail}
                    className="h-9"
                  >
                    {isSendingTestEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Test"}
                  </Button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-12">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Preview (First Selected)</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      const text = document.querySelector('.email-preview')?.textContent;
                      if (text) navigator.clipboard.writeText(text);
                    }}
                    className="h-6 text-xs"
                  >
                    Copy
                  </Button>
                </div>
                <div 
                  className="email-preview text-sm text-slate-700 italic prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      const firstLead = leads.find(l => selectedLeads[0] === l.id);
                      if (!firstLead) return "No lead selected";
                      const salutation = getSalutation(firstLead);
                      return emailTemplate
                        .replace(/{salutation}/g, salutation)
                        .replace(/{contact}/g, firstLead.contact)
                        .replace(/{company}/g, firstLead.company)
                        .replace(/{location}/g, firstLead.location)
                        .replace(/{volume}/g, firstLead.volume)
                        .replace(/{type}/g, firstLead.type)
                        .replace(/{sender_name}/g, senderName);
                    })()
                  }}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsBatchEmailModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={generateBatchEmails}
                >
                  <Download className="mr-2 h-4 w-4" /> Generate & Download Batch
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Follow-up AI Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <CardHeader className="bg-emerald-600 text-white rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> AI Follow-up Generator
                  </CardTitle>
                  <CardDescription className="text-emerald-100">
                    Personalized outreach for {selectedLeadForFollowUp?.company}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-emerald-500 rounded-full"
                  onClick={() => setIsFollowUpModalOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {isGeneratingFollowUp ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="font-semibold text-slate-700">Analyzing lead history...</p>
                    <p className="text-xs text-slate-500">Crafting a personalized message based on score {selectedLeadForFollowUp?.score}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-[400px] overflow-auto">
                    <div 
                      className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: generatedFollowUp }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    <span>Target: {selectedLeadForFollowUp?.email}</span>
                    <span>Score: {selectedLeadForFollowUp?.score}/100</span>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setIsFollowUpModalOpen(false)}>
                      Close
                    </Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        navigator.clipboard.writeText(stripHtml(generatedFollowUp));
                        // In a real app, we'd open the email client or send via API
                        const mailto = `mailto:${selectedLeadForFollowUp?.email}?subject=Follow-up from GINGER AI&body=${encodeURIComponent(stripHtml(generatedFollowUp))}`;
                        window.location.href = mailto;
                      }}
                    >
                      <Mail className="mr-2 h-4 w-4" /> Copy & Send Email
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Contact Modal */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-xl">Add New Contact</CardTitle>
                <CardDescription>Save a new buyer or supplier to your directory.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsAddContactModalOpen(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                  <Input 
                    placeholder="e.g. John Doe"
                    value={newContact.name}
                    onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Company</label>
                  <Input 
                    placeholder="e.g. Global Spices Ltd"
                    value={newContact.company}
                    onChange={(e) => setNewContact({...newContact, company: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                  <Input 
                    type="email"
                    placeholder="john@example.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <Input 
                    placeholder="+1 234 567 890"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <Select 
                    value={newContact.category}
                    onChange={(e) => setNewContact({...newContact, category: e.target.value})}
                  >
                    <option value="Buyer">Buyer</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Partner">Partner</option>
                    <option value="Lead">Lead</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                  <Input 
                    placeholder="e.g. Singapore"
                    value={newContact.location}
                    onChange={(e) => setNewContact({...newContact, location: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsAddContactModalOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddContact}>
                  Save Contact
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Add Contact Modal */}
      {isQuickAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-xl">Quick Add</CardTitle>
                <CardDescription>Essential details only.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsQuickAddModalOpen(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Name</label>
                <Input 
                  placeholder="John Doe"
                  value={quickContact.name}
                  onChange={(e) => setQuickContact({...quickContact, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Company</label>
                <Input 
                  placeholder="Company Name"
                  value={quickContact.company}
                  onChange={(e) => setQuickContact({...quickContact, company: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                <Input 
                  type="email"
                  placeholder="john@example.com"
                  value={quickContact.email}
                  onChange={(e) => setQuickContact({...quickContact, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                <Input 
                  placeholder="+1 234 567 890"
                  value={quickContact.phone}
                  onChange={(e) => setQuickContact({...quickContact, phone: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsQuickAddModalOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleQuickAddContact}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Contact Modal */}
      {isEditContactModalOpen && currentContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-xl">Edit Contact</CardTitle>
                <CardDescription>Update details for {currentContact.name}.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsEditContactModalOpen(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
                  <Input 
                    value={currentContact.name}
                    onChange={(e) => setCurrentContact({...currentContact, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Company</label>
                  <Input 
                    value={currentContact.company}
                    onChange={(e) => setCurrentContact({...currentContact, company: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                  <Input 
                    type="email"
                    value={currentContact.email}
                    onChange={(e) => setCurrentContact({...currentContact, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <Input 
                    value={currentContact.phone}
                    onChange={(e) => setCurrentContact({...currentContact, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <Select 
                    value={currentContact.category}
                    onChange={(e) => setCurrentContact({...currentContact, category: e.target.value})}
                  >
                    <option value="Buyer">Buyer</option>
                    <option value="Supplier">Supplier</option>
                    <option value="Partner">Partner</option>
                    <option value="Lead">Lead</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Location</label>
                  <Input 
                    value={currentContact.location}
                    onChange={(e) => setCurrentContact({...currentContact, location: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsEditContactModalOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUpdateContact}>
                  Update Contact
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <>
            {/* Dashboard Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ginger Market Overview</h1>
            <p className="text-slate-500">Global buyer intelligence and market trends.</p>
            {enrichmentStatus && (
              <div className={`mt-2 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full w-fit animate-in slide-in-from-left-2 duration-300 ${
                enrichmentStatus.includes("failed") ? "bg-red-50 text-red-600" : "bg-purple-50 text-purple-600"
              }`}>
                {enrichmentStatus.includes("complete") || enrichmentStatus.includes("updated") ? <CheckCircle2 className="h-3 w-3" /> : <Sparkles className="h-3 w-3 animate-pulse" />}
                {enrichmentStatus}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshResearch}
                disabled={isEnriching}
                className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isEnriching ? 'animate-spin' : ''}`} />
                Refresh Research
              </Button>
              {selectedLeads.length > 0 && (
                <>
                  {hasPermission('CAN_ENRICH') && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={enrichBatchLeads} 
                        disabled={isEnriching}
                        className="text-purple-700 border-purple-200 hover:bg-purple-50"
                      >
                        {isEnriching ? (
                          <Activity className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {isEnriching ? "Enriching..." : `Enrich Batch (${selectedLeads.length})`}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={scoreBatchLeads} 
                        disabled={isScoring}
                        className="text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        {isScoring ? (
                          <Activity className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <TrendingUp className="mr-2 h-4 w-4" />
                        )}
                        {isScoring ? "Scoring..." : `Score AI (${selectedLeads.length})`}
                      </Button>
                    </>
                  )}
                  {hasPermission('CAN_BATCH_EMAIL') && (
                    <Button variant="default" size="sm" onClick={handleBatchEmail} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Mail className="mr-2 h-4 w-4" /> Batch Email ({selectedLeads.length})
                    </Button>
                  )}
                </>
              )}
              {hasPermission('CAN_EXPORT_CSV') && (
                <>
                  <Button variant="outline" size="sm" onClick={exportJpSgKrToCSV} className="text-blue-700 border-blue-200 hover:bg-blue-50">
                    <Download className="mr-2 h-4 w-4" /> Export JP/SG/KR
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportAsiaToCSV} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                    <Download className="mr-2 h-4 w-4" /> Export Asia Market
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToCSV}>
                    <Download className="mr-2 h-4 w-4" /> Export All
                  </Button>
                </>
              )}
            </div>
            
            <Card className="p-3 bg-emerald-50/50 border-emerald-100">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> WhatsApp Message Template
                  </span>
                  <Tooltip content="Use {contact} and {company} as placeholders">
                    <Activity className="h-3 w-3 text-emerald-400 cursor-help" />
                  </Tooltip>
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={whatsappTemplate}
                    onChange={(e) => setWhatsappTemplate(e.target.value)}
                    placeholder="Enter message template..."
                    className="h-8 text-xs bg-white border-emerald-200 focus-visible:ring-emerald-500"
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 text-[10px] text-emerald-700 hover:bg-emerald-100"
                    onClick={() => setWhatsappTemplate("Hello {contact} from {company}, I'm contacting you from GINGER AI regarding ginger commodities.")}
                  >
                    Default
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <ShoppingBag className="h-12 w-12 text-emerald-600" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Active Buyers</CardTitle>
              <Users className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leads.length}</div>
              <p className="text-xs text-emerald-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" /> +12% from last month
              </p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Activity className="h-12 w-12 text-blue-600" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Global Demand Volume</CardTitle>
              <Activity className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {leads.reduce((acc, lead) => acc + parseInt(lead.volume), 0).toLocaleString()} MT
              </div>
              <p className="text-xs text-emerald-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" /> +8.5% YoY
              </p>
            </CardContent>
          </Card>
          <Card className="relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <DollarSign className="h-12 w-12 text-amber-600" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Market Price</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$1.45 / kg</div>
              <p className="text-xs text-red-600 flex items-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1 rotate-180" /> -2.1% this week
              </p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-900 text-white border-none shadow-lg shadow-emerald-200/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-100">GINGER AI Status</CardTitle>
              <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Active</div>
              <p className="text-xs text-emerald-300 mt-1">
                Monitoring 124 global trade ports
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ginger Intelligence & Charts */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Global Ginger Trade Volume</CardTitle>
                <CardDescription>Monthly tracked imports across major regions (MT)</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Live Data</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="volume" fill="#059669" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 bg-slate-900 border-none text-white overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500"></div>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-400" />
                GINGER AI Insights
              </CardTitle>
              <CardDescription className="text-slate-400">AI-generated market intelligence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <h4 className="text-xs font-bold text-emerald-400 uppercase mb-1">Market Trend</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Demand for organic ginger is surging in Northern Europe. Prices are expected to stabilize as the harvest season in Southeast Asia peaks next month.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <h4 className="text-xs font-bold text-blue-400 uppercase mb-1">Logistics Alert</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Port congestion in Singapore may delay shipments to Japan by 3-5 days. Consider alternative routes via Port Klang.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <h4 className="text-xs font-bold text-purple-400 uppercase mb-1">Opportunity</h4>
                <p className="text-sm text-slate-300 leading-relaxed">
                  New import regulations in Saudi Arabia favor high-quality ginger with GAP certification. Premium margins available for certified suppliers.
                </p>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-2">
                Generate Full Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Collection Batches Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600" />
              Collection Batches (30-Day Intervals)
            </h2>
            <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
              Earliest: {getCollectionBatches().length > 0 ? new Date(getCollectionBatches()[getCollectionBatches().length - 1].start).toLocaleDateString() : 'N/A'}
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {getCollectionBatches().map((batch, idx) => (
              <Card key={idx} className="border-slate-200 hover:border-emerald-200 transition-colors cursor-default group">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Batch {getCollectionBatches().length - idx}</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] h-5">
                      {batch.leads.length} Contacts
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold">
                    {batch.start.toLocaleDateString()} - {batch.end.toLocaleDateString()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex -space-x-2 overflow-hidden">
                      {batch.leads.slice(0, 4).map((lead, i) => (
                        <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-600 border border-slate-200">
                          {lead.contact.split(' ').map(n => n[0]).join('')}
                        </div>
                      ))}
                      {batch.leads.length > 4 && (
                        <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 border border-slate-300">
                          +{batch.leads.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 italic">Collected in this window</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[10px] text-slate-400">Avg. Score: <span className="font-bold text-slate-600">{Math.round(batch.leads.reduce((acc, l) => acc + (l.score || 0), 0) / batch.leads.length)}</span></div>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => {
                      setSearchTerm("");
                      // We could add a date filter here if we had one
                    }}>
                      View Batch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Buyer Directory</CardTitle>
                <CardDescription>Manage and track your global leads.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button 
                  variant="default"
                  onClick={collectGingerBuyers}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={isCollecting}
                >
                  {isCollecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Collect Ginger Buyers
                </Button>
                <Button 
                  variant="outline"
                  onClick={verifyAllLeads}
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  disabled={isVerifyingAllLeads || filteredLeads.length === 0}
                >
                  {isVerifyingAllLeads ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Verify All
                </Button>
                <div className="w-40">
                  <Select 
                    label="Location" 
                    value={locationFilter} 
                    onChange={(e) => setLocationFilter(e.target.value)}
                  >
                    {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </Select>
                </div>
                <div className="w-32">
                  <Select 
                    label="Type" 
                    value={typeFilter} 
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
                <div className="w-32">
                  <Select 
                    label="Status" 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </div>
                {selectedLeads.length > 0 && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="mt-5 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={handleBatchEmail}
                  >
                    <Mail className="mr-2 h-4 w-4" /> Batch Email ({selectedLeads.length})
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-5 text-slate-500 hover:text-slate-900"
                  onClick={() => {
                    setLocationFilter("All");
                    setTypeFilter("All");
                    setStatusFilter("All");
                    setSearchTerm("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-auto px-6 pb-6 pt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Company & Contact</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Est. Volume</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className={selectedLeads.includes(lead.id) ? "bg-emerald-50/30" : ""}>
                      <TableCell>
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          checked={selectedLeads.includes(lead.id)}
                          onChange={() => toggleSelectLead(lead.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>{lead.company}</div>
                        <div className="text-xs text-slate-500 font-normal">{lead.contact}</div>
                      </TableCell>
                      <TableCell>
                        {lead.score !== undefined ? (
                          <Tooltip content={
                            <div className="max-w-[200px] space-y-1.5">
                              <div className="font-bold border-b border-slate-700 pb-1 mb-1">AI Scoring Reasoning</div>
                              <div className="text-xs text-slate-300 leading-relaxed italic">
                                "{lead.scoreReasoning || "No reasoning provided"}"
                              </div>
                              <div className="text-[10px] text-slate-500 pt-1">
                                Based on volume, location, and buyer type.
                              </div>
                            </div>
                          }>
                            <div className="flex items-center gap-2 cursor-help group">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all group-hover:scale-110 ${
                                lead.score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100" :
                                lead.score >= 60 ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100" :
                                "bg-slate-50 text-slate-700 border-slate-200"
                              }`}>
                                {lead.score}
                              </div>
                              {lead.score >= 85 && (
                                <div className="flex flex-col">
                                  <Badge variant="success" className="h-4 text-[8px] px-1 py-0 uppercase tracking-tighter">Hot</Badge>
                                  <Sparkles className="h-3 w-3 text-emerald-500 animate-pulse" />
                                </div>
                              )}
                            </div>
                          </Tooltip>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400 italic text-[10px]">
                            <Activity className="h-3 w-3 opacity-50" />
                            Unscored
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip content={
                          <div className="flex flex-col gap-2 min-w-[200px]">
                            <div className="font-semibold border-b border-slate-700 pb-1 mb-1">Contact Details</div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="break-all">{lead.email}</span>
                              {lead.verificationStatus === 'valid' && <ShieldCheck className="h-3 w-3 text-emerald-500" />}
                              {lead.verificationStatus === 'invalid' && <AlertCircle className="h-3 w-3 text-red-500" />}
                            </div>
                            {lead.verificationReason && (
                              <div className="text-[10px] text-slate-400 italic bg-red-500/10 p-1 rounded border border-red-500/20">
                                {lead.verificationReason}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-emerald-400" />
                              <span>{lead.phone}</span>
                            </div>
                            <Button 
                              size="sm" 
                              className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-[10px]"
                              onClick={() => openWhatsApp(lead)}
                            >
                              <MessageCircle className="h-3 w-3 mr-1" /> Contact via WhatsApp
                            </Button>
                            
                            <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                              {lead.notes && (
                                <div className="mb-3">
                                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Buyer Intelligence</div>
                                  <div className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-2 rounded border border-slate-700">
                                    {lead.notes}
                                  </div>
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Intelligence Tools</div>
                              <button 
                                onClick={() => openHunter(lead)}
                                className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors w-full text-left"
                              >
                                <SearchCode className="h-3.5 w-3.5" />
                                <span>Hunter.io → Find Email</span>
                              </button>
                              <button 
                                onClick={() => openApollo(lead)}
                                className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors w-full text-left"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                <span>Apollo.io → Find Buyer Person</span>
                              </button>
                              <button 
                                onClick={() => openLinkedIn(lead)}
                                className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors w-full text-left"
                              >
                                <Linkedin className="h-3.5 w-3.5" />
                                <span>LinkedIn → Procurement Manager</span>
                              </button>
                            </div>

                            {lead.phone.includes("WhatsApp") && (
                              <div className="flex items-center gap-2 text-emerald-400 font-medium mt-1 bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">
                                <MessageCircle className="h-3.5 w-3.5" />
                                <span>WhatsApp Active</span>
                              </div>
                            )}
                          </div>
                        }>
                          <div className="flex flex-col gap-1 text-xs text-slate-600 cursor-help group/contact">
                            <span className="flex items-center gap-1 group-hover/contact:text-emerald-600 transition-colors">
                              <Mail className="h-3 w-3" /> 
                              <span className="truncate max-w-[120px] group-hover/contact:underline decoration-emerald-400/30 underline-offset-2">{lead.email}</span>
                              {lead.verificationStatus === 'verifying' && <Loader2 className="h-2.5 w-2.5 text-slate-400 animate-spin" />}
                              {lead.verificationStatus === 'valid' && <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" />}
                              {lead.verificationStatus === 'invalid' && <AlertCircle className="h-2.5 w-2.5 text-red-500" />}
                            </span>
                            <span className="flex items-center gap-1 group-hover/contact:text-emerald-600 transition-colors">
                              <Phone className="h-3 w-3" /> 
                              <span className="group-hover/contact:underline decoration-emerald-400/30 underline-offset-2">{lead.phone}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsApp(lead);
                                }}
                                className="ml-1 text-emerald-500 hover:text-emerald-600 transition-colors p-0.5 rounded-full hover:bg-emerald-50"
                                title="Contact via WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </button>
                            </span>
                          </div>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-slate-600">
                          <MapPin className="h-3 w-3" /> {lead.location}
                        </div>
                      </TableCell>
                      <TableCell>{lead.type}</TableCell>
                      <TableCell>{lead.volume}</TableCell>
                      <TableCell>{getStatusBadge(lead.status)}</TableCell>
                      <TableCell>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {new Date(lead.collectionDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{lead.lastContact}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip content="Sales Intelligence Links">
                            <div className="flex items-center gap-1 mr-2 px-2 border-r border-slate-200">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600"
                                onClick={() => openHunter(lead)}
                                title="Hunter.io"
                              >
                                <SearchCode className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600"
                                onClick={() => openApollo(lead)}
                                title="Apollo.io"
                              >
                                <Globe className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600"
                                onClick={() => openLinkedIn(lead)}
                                title="LinkedIn"
                              >
                                <Linkedin className="h-4 w-4" />
                              </Button>
                            </div>
                          </Tooltip>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"
                            onClick={() => generateFollowUp(lead)}
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                            <span className="text-xs">Follow-up</span>
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 px-2 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"
                            onClick={() => exportSingleLeadToCSV(lead)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            <span className="text-xs">Export</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Contacts Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Contact Management</h1>
                <p className="text-slate-500">Manage your saved buyers, suppliers, and partners.</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={verifyAllContacts}
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  disabled={isVerifyingAll || filteredContacts.length === 0}
                >
                  {isVerifyingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Verify All
                </Button>
                <Button 
                  variant="outline"
                  onClick={exportContactsToCSV}
                  className="text-slate-600 border-slate-200 hover:bg-slate-50"
                  disabled={filteredContacts.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" /> 
                  {selectedContactIds.length > 0 ? `Export Selected (${selectedContactIds.length})` : "Export Contacts"}
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="import-csv"
                  />
                  <Button 
                    variant="outline"
                    className="text-slate-600 border-slate-200 hover:bg-slate-50"
                  >
                    <Upload className="mr-2 h-4 w-4" /> Import CSV
                  </Button>
                </div>
                {selectedContactIds.length > 0 && (
                  <>
                    <Button 
                      variant="destructive"
                      size="sm"
                      onClick={bulkDeleteContacts}
                    >
                      Delete Selected ({selectedContactIds.length})
                    </Button>
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedContactIds([])}
                    >
                      Clear Selection
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline"
                  onClick={verifyAllContacts}
                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  disabled={isVerifyingAllContacts || filteredContacts.length === 0}
                >
                  {isVerifyingAllContacts ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Verify All
                </Button>
                <Button 
                  variant="outline"
                  onClick={deleteInvalidContacts}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  disabled={contacts.filter(c => c.verificationStatus === 'invalid').length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Invalid
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setIsQuickAddModalOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Quick Add
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setIsAddContactModalOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Contact
                </Button>
              </div>
            </div>

            {/* Contacts Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search by name, company, email, or location..." 
                      className="pl-10"
                      value={contactSearchTerm}
                      onChange={(e) => setContactSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <Select 
                      label="Category" 
                      value={contactCategoryFilter}
                      onChange={(e) => setContactCategoryFilter(e.target.value)}
                    >
                      {uniqueContactCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="w-full md:w-48">
                    <Select 
                      label="Last Interaction" 
                      value={contactDateFilter}
                      onChange={(e) => setContactDateFilter(e.target.value)}
                    >
                      <option value="All">All Time</option>
                      <option value="Last 7 Days">Last 7 Days</option>
                      <option value="Last 30 Days">Last 30 Days</option>
                      <option value="More than 30 Days">More than 30 Days</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContactIds(filteredContacts.map(c => c.id));
                            } else {
                              setSelectedContactIds([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Name & Company</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Last Interaction</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(contact => (
                        <TableRow key={contact.id}>
                          <TableCell className="w-12">
                            <input
                              type="checkbox"
                              checked={selectedContactIds.includes(contact.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedContactIds([...selectedContactIds, contact.id]);
                                } else {
                                  setSelectedContactIds(selectedContactIds.filter(id => id !== contact.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-slate-900">{contact.name}</div>
                            <div className="text-xs text-slate-500">{contact.company}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-slate-600">{contact.email}</div>
                                {contact.verificationStatus === 'pending' && (
                                  <Tooltip content="Email verification is pending. Click 'Verify All' to check.">
                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-slate-50 text-slate-500 border-slate-200 flex items-center gap-1">
                                      <Clock className="h-2.5 w-2.5" /> Pending
                                    </Badge>
                                  </Tooltip>
                                )}
                                {contact.verificationStatus === 'verifying' && (
                                  <Tooltip content="Currently checking DNS and MX records for this domain...">
                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1">
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Verifying
                                    </Badge>
                                  </Tooltip>
                                )}
                                {contact.verificationStatus === 'valid' && (
                                  <Tooltip content={`Verified: DNS & MX records exist. ${contact.verificationReason || ""}`}>
                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200 flex items-center gap-1">
                                      <ShieldCheck className="h-2.5 w-2.5" /> Valid
                                    </Badge>
                                  </Tooltip>
                                )}
                                {contact.verificationStatus === 'invalid' && (
                                  <Tooltip content={contact.verificationReason || "Invalid email: Domain or MX records not found"}>
                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-red-50 text-red-600 border-red-200 flex items-center gap-1">
                                      <AlertCircle className="h-2.5 w-2.5" /> Invalid
                                    </Badge>
                                  </Tooltip>
                                )}
                                {!contact.verificationStatus && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0 text-slate-300 hover:text-emerald-500"
                                    onClick={() => verifyEmail(contact.id, contact.email)}
                                    title="Verify Email"
                                  >
                                    <ShieldCheck className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">{contact.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const badge = (() => {
                                switch (contact.category) {
                                  case 'Buyer': return { icon: <ShoppingBag className="h-3 w-3" />, color: "bg-blue-100 text-blue-800 border-blue-200" };
                                  case 'Supplier': return { icon: <Truck className="h-3 w-3" />, color: "bg-amber-100 text-amber-800 border-amber-200" };
                                  case 'Partner': return { icon: <Handshake className="h-3 w-3" />, color: "bg-purple-100 text-purple-800 border-purple-200" };
                                  case 'Lead': return { icon: <UserPlus className="h-3 w-3" />, color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
                                  default: return { icon: <Tag className="h-3 w-3" />, color: "bg-slate-100 text-slate-800 border-slate-200" };
                                }
                              })();
                              return (
                                <Badge variant="outline" className={`flex items-center gap-1 w-fit ${badge.color}`}>
                                  {badge.icon} {contact.category}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            <MapPin className="h-3 w-3 inline mr-1" /> {contact.location}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {new Date(contact.lastInteraction).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                                onClick={() => {
                                  setCurrentContact(contact);
                                  setIsEditContactModalOpen(true);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Tooltip content="Anonymize Contact (GDPR)">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to anonymize this contact? This action is irreversible.")) {
                                      anonymizeContact(contact.id);
                                    }
                                  }}
                                  disabled={contact.isAnonymized}
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                                onClick={() => handleDeleteContact(contact.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                          No contacts found matching your criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Market Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Market Overview</CardTitle>
                    <CardDescription>Summary of your contacts by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {uniqueContactCategories.filter(c => c !== 'All').map(cat => {
                        const count = contacts.filter(c => c.category === cat).length;
                        return (
                          <div key={cat} className="bg-slate-50 p-4 rounded-lg">
                            <div className="text-sm text-slate-500">{cat}s</div>
                            <div className="text-2xl font-bold text-slate-900">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Quick Contact Entry</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Name" value={quickContact.name} onChange={(e) => setQuickContact({...quickContact, name: e.target.value})} />
                    <Input placeholder="Email" value={quickContact.email} onChange={(e) => setQuickContact({...quickContact, email: e.target.value})} />
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleQuickAddContact}>Add Contact</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'extractor' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Data Extraction Engine</h1>
                <p className="text-slate-500">Parse unstructured text into standardized JSON contact payloads.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <ShieldCheck className="h-3 w-3 mr-1" /> PII Safe
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> MX Prep Ready
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Section */}
              <Card className="flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TypeIcon className="h-5 w-5 text-emerald-600" />
                      Unstructured Input
                    </CardTitle>
                    <CardDescription>
                      Paste raw text or upload a file containing contact notes.
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".txt,.csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      id="load-file"
                    />
                    <Button variant="outline" size="sm" className="h-8">
                      <Upload className="h-3.5 w-3.5 mr-2" />
                      Load File
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                  <textarea
                    className="flex-1 min-h-[400px] w-full p-4 font-mono text-sm bg-slate-50 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    placeholder="Example: Contacted John at john.doe@example.com. He's also on telegram as @johndoe_99 and instagram handle is jd_ginger_trader..."
                    value={unstructuredText}
                    onChange={(e) => setUnstructuredText(e.target.value)}
                  />
                  <Button 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-lg"
                    onClick={handleExtract}
                    disabled={isExtracting || !unstructuredText.trim()}
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Normalizing Data...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-5 w-5" />
                        Extract & Normalize
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Output Section */}
              <Card className="flex flex-col border-emerald-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <SearchCode className="h-5 w-5 text-emerald-600" />
                      Standardized JSON Output
                    </CardTitle>
                    <CardDescription>
                      Strictly formatted payload for downstream systems.
                    </CardDescription>
                  </div>
                  {extractedJson && (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearExtractor}
                        className="h-8 text-slate-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Clear
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => copyToClipboard(JSON.stringify(extractedJson, null, 2))}
                        className="h-8"
                      >
                        <Copy className="h-3.5 w-3.5 mr-2" />
                        Copy JSON
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden">
                  {extractionError ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-red-50 rounded-lg border border-red-100">
                      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                      <h3 className="font-semibold text-red-900">Extraction Failed</h3>
                      <p className="text-sm text-red-700 mt-1">{extractionError}</p>
                    </div>
                  ) : extractedJson ? (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 bg-slate-900 rounded-lg p-4 overflow-auto custom-scrollbar">
                        <pre className="text-emerald-400 font-mono text-xs leading-relaxed">
                          {JSON.stringify(extractedJson, null, 2)}
                        </pre>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <div className="text-[10px] uppercase font-bold text-emerald-700 mb-1">Contacts Found</div>
                          <div className="text-2xl font-bold text-emerald-900">{extractedJson.customer_contacts?.length || 0}</div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="text-[10px] uppercase font-bold text-blue-700 mb-1">Emails Extracted</div>
                          <div className="text-2xl font-bold text-blue-900">{extractedJson.emails?.length || 0}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <Activity className="h-12 w-12 text-slate-300 mb-4" />
                      <h3 className="font-semibold text-slate-500">Awaiting Input</h3>
                      <p className="text-sm text-slate-400 mt-1">Paste unstructured text on the left to begin extraction.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Rules Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-900 text-slate-300 border-none">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        PII Protection
                      </h4>
                      <p className="text-xs leading-relaxed opacity-70">
                        Sensitive data like passwords, credit cards, and SSNs are automatically discarded during the normalization process.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-emerald-400" />
                        Platform Mapping
                      </h4>
                      <p className="text-xs leading-relaxed opacity-70">
                        Handles are mapped to: facebook, instagram, whatsapp, wechat, telegram, amazon, tiktok, messenger, and notebook.
                      </p>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        MX Verification
                      </h4>
                      <p className="text-xs leading-relaxed opacity-70">
                        All extracted emails are flagged with "mx_verified": false to trigger downstream DNS lookups before database entry.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 text-slate-300 border-none">
                <CardContent className="p-6">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-emerald-400" />
                    OUTPUT FORMAT (JSON SCHEMA)
                  </h4>
                  <pre className="text-[10px] font-mono leading-tight opacity-80 bg-slate-900/50 p-3 rounded border border-slate-700 overflow-auto max-h-[120px] custom-scrollbar">
{`{
  "customer_contacts": [
    {
      "platform": "<standardized_platform_name>",
      "handle": "<extracted_username_or_number>"
    }
  ],
  "emails": [
    {
      "address": "<extracted_email>",
      "domain": "<extracted_domain_only>",
      "mx_verified": false,
      "domain_ready_for_check": true
    }
  ]
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        {activeTab === 'osint' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">OSINT Market Research</h1>
                <p className="text-slate-500">Real-time intelligence on international ginger import demand.</p>
              </div>
              <div className="flex items-center gap-4">
                <Input 
                  placeholder="Enter countries (e.g. USA, Japan, Germany)"
                  value={selectedCountries.join(', ')}
                  onChange={(e) => setSelectedCountries(e.target.value.split(',').map(c => c.trim()).filter(c => c !== ''))}
                  className="w-64"
                />
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={async () => {
                    setIsPerformingOsint(true);
                    try {
                      const results = await performGingerMarketResearch(selectedCountries);
                      setOsintResults(results);
                    } catch (error) {
                      console.error("OSINT research error:", error);
                    } finally {
                      setIsPerformingOsint(false);
                    }
                  }}
                  disabled={isPerformingOsint}
                >
                  {isPerformingOsint ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Execute Research
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Research Findings</CardTitle>
                  <CardDescription>Real-time intelligence on international ginger import demand.</CardDescription>
                </CardHeader>
                <CardContent>
                  {osintResults.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Demand</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Source Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {osintResults.map((result, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{result.company_name}</TableCell>
                            <TableCell>{result.registration_status}</TableCell>
                            <TableCell className="max-w-xs truncate">{result.demand_indicator}</TableCell>
                            <TableCell>{result.corporate_email}</TableCell>
                            <TableCell>{result.corporate_phone}</TableCell>
                            <TableCell>
                              <a href={result.data_source_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                View Source
                              </a>
                            </TableCell>
                            <TableCell>{result.government_source_type}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <SearchCode className="h-12 w-12 mb-4 opacity-20" />
                      <p>No research findings yet. Execute research to begin.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      Trade Data Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { name: "FreshDI", url: "https://freshdi.com" },
                      { name: "ImportInfo", url: "https://importinfo.com" },
                      { name: "Trademo", url: "https://trademo.com" },
                      { name: "Volza", url: "https://volza.com" },
                      { name: "Tendata", url: "https://tendata.com" },
                      { name: "Tridge", url: "https://tridge.com" },
                      { name: "TradeImex", url: "https://tradeimex.in" },
                      { name: "ExportersIndia", url: "https://exportersindia.com" }
                    ].map((site) => (
                      <a 
                        key={site.name}
                        href={site.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all group"
                      >
                        <span className="text-sm text-slate-600 font-medium">{site.name}</span>
                        <ExternalLink className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Search className="h-4 w-4 text-emerald-500" />
                      Google Search Shortcuts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[
                      { label: '"Ginger" Buyer/Importer', q: '"ginger" buyer OR importer' },
                      { label: 'Fresh Ginger Trade Data', q: 'fresh ginger importer buyer trade data' },
                      { label: '"Ginger" Import Intelligence', q: '"ginger" import' },
                      { label: 'Specific Importer Search', q: '"importer" "ginger"' }
                    ].map((search) => (
                      <a 
                        key={search.label}
                        href={`https://www.google.com/search?q=${encodeURIComponent(search.q)}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="block p-2 rounded-md hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all"
                      >
                        <div className="text-xs font-medium text-emerald-700">{search.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{search.q}</div>
                      </a>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-slate-50 border-dashed">
                  <CardContent className="p-4">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Other Resources</h4>
                    <div className="flex flex-wrap gap-2">
                      {["iahefood.eu", "usetorg.com", "abrams.wiki", "pubhtml5.com", "purveyd.com", "blifesrl.it"].map(domain => (
                        <a 
                          key={domain}
                          href={`https://${domain}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded hover:border-blue-300 hover:text-blue-600 transition-colors"
                        >
                          {domain}
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Privacy & GDPR Compliance</h1>
                <p className="text-slate-500">Manage data subject requests and ensure regulatory compliance.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <ShieldCheck className="h-3 w-3 mr-1" /> GDPR Compliant
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-blue-600" />
                    Data Subject Access Requests (DSAR)
                  </CardTitle>
                  <CardDescription>
                    Incoming requests from individuals regarding their personal data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject Email</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dsars.length > 0 ? (
                        dsars.map(dsar => (
                          <TableRow key={dsar.id}>
                            <TableCell className="font-medium">{dsar.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-slate-100">
                                {dsar.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">
                              {new Date(dsar.requestDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  dsar.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  dsar.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }
                              >
                                {dsar.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {dsar.status === 'Pending' && (
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    onClick={() => handleDSARAction(dsar.id, 'Completed')}
                                  >
                                    Approve
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleDSARAction(dsar.id, 'Rejected')}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-slate-400">
                            No active data subject requests.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Compliance Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-700 mb-1">Data Anonymization</h4>
                      <p className="text-[10px] text-slate-500 mb-3">
                        Irreversibly mask personal identifiers while preserving business context for analytics.
                      </p>
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveTab('contacts')}>
                        Go to Contacts to Anonymize
                      </Button>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-700 mb-1">Data Retention Policy</h4>
                      <p className="text-[10px] text-slate-500 mb-3">
                        Automatically flag leads older than 24 months for review or deletion.
                      </p>
                      <Button variant="outline" size="sm" className="w-full text-xs" disabled>
                        Configure Retention
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-emerald-900 text-white border-none">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Privacy Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-1">94%</div>
                    <div className="w-full bg-emerald-800 h-1.5 rounded-full overflow-hidden mb-3">
                      <div className="bg-emerald-400 h-full w-[94%]"></div>
                    </div>
                    <p className="text-[10px] text-emerald-300 leading-relaxed">
                      Your current data handling practices are highly compliant with GDPR and CCPA standards.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
