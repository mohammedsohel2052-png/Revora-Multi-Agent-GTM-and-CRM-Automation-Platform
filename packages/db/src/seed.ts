import {
  db,
  tenants,
  users,
  memberships,
  companies,
  contacts,
  leads,
  conversations,
  messages,
  opportunities,
  approvalRequests,
  payments,
  auditEvents,
  knowledgeDocuments,
  knowledgeChunks,
} from './index';
import { randomUUID } from 'crypto';

export async function seedDemoData() {
  console.log('🌱 Starting Revora dual-workspace portfolio demo data seeding...');

  // =========================================================================
  // WORKSPACE A: Mumbai Growth Studio
  // Digital marketing agency | AI lead automation | Friendly & direct | SMBs
  // =========================================================================
  const tenantAId = randomUUID();
  const userAId = randomUUID();
  const userA2Id = randomUUID();

  await db.insert(tenants).values({
    id: tenantAId,
    name: 'Mumbai Growth Studio',
    slug: 'mumbai-growth-studio',
    plan: 'enterprise',
    settings: {
      industry: 'Digital marketing agency',
      offer: 'AI lead automation',
      brand_voice: 'Friendly and direct',
      icp: 'Small and medium-sized businesses with $500k-$10M ARR',
      autonomous_sending: false,
      max_discount_percent: 15,
      allowed_channels: ['email', 'whatsapp', 'instagram'],
    },
  });

  await db.insert(users).values([
    {
      id: userAId,
      email: 'rohit@mumbaigrowth.io',
      name: 'Rohit Sharma',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    },
    {
      id: userA2Id,
      email: 'priya@mumbaigrowth.io',
      name: 'Priya Patel',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    },
  ]);

  await db.insert(memberships).values([
    {
      id: randomUUID(),
      tenantId: tenantAId,
      userId: userAId,
      role: 'workspace_owner',
    },
    {
      id: randomUUID(),
      tenantId: tenantAId,
      userId: userA2Id,
      role: 'sales_manager',
    },
  ]);

  // Companies for Tenant A (10 companies)
  const companyAIds: string[] = [];
  const companyANames = [
    { name: 'Kalyan Retailers Ltd', domain: 'kalyanretail.com', industry: 'Retail & E-commerce', size: '50-100' },
    { name: 'Deccan Logistics Pvt', domain: 'deccanlogistics.in', industry: 'Supply Chain', size: '100-250' },
    { name: 'Bandra Bites Hospitality', domain: 'bandrabites.com', industry: 'Hospitality', size: '20-50' },
    { name: 'Andheri Fintech Labs', domain: 'andherifintech.in', industry: 'Fintech SMB', size: '30-80' },
    { name: 'Apex Digital Print', domain: 'apexprint.co.in', industry: 'Commercial Printing', size: '15-40' },
    { name: 'Saffron Spice Exports', domain: 'saffronspice.com', industry: 'Food & Beverage', size: '50-150' },
    { name: 'Zenith Legal Advisors', domain: 'zenithlegal.in', industry: 'Professional Services', size: '20-60' },
    { name: 'Navi Mumbai Auto Spares', domain: 'nmautoparts.com', industry: 'Automotive Distribution', size: '40-100' },
    { name: 'Sahara Solar Solutions', domain: 'saharasolar.in', industry: 'Clean Energy', size: '25-70' },
    { name: 'Lotus Wellness Spa', domain: 'lotuswellness.co.in', industry: 'Healthcare & Wellness', size: '10-30' },
  ];

  for (const c of companyANames) {
    const cid = randomUUID();
    companyAIds.push(cid);
    await db.insert(companies).values({
      id: cid,
      tenantId: tenantAId,
      name: c.name,
      domain: c.domain,
      industry: c.industry,
      sizeEstimate: c.size,
      location: 'Mumbai, India',
      enrichmentSource: 'waterfall:clearbit+apollo',
    });
  }

  // Contacts for Tenant A (20 contacts)
  const contactAIds: string[] = [];
  const contactADetails = [
    { name: 'Aditya Verma', email: 'aditya@kalyanretail.com', phone: '+919820011221', jobTitle: 'Marketing Director', compIdx: 0 },
    { name: 'Sunita Rao', email: 'sunita@kalyanretail.com', phone: '+919820011222', jobTitle: 'COO', compIdx: 0 },
    { name: 'Rajesh Kulkarni', email: 'rajesh@deccanlogistics.in', phone: '+919820011223', jobTitle: 'VP Operations', compIdx: 1 },
    { name: 'Meera Deshmukh', email: 'meera@bandrabites.com', phone: '+919820011224', jobTitle: 'Managing Partner', compIdx: 2 },
    { name: 'Vikram Seth', email: 'vikram@andherifintech.in', phone: '+919820011225', jobTitle: 'Chief Growth Officer', compIdx: 3 },
    { name: 'Neha Kapoor', email: 'neha@apexprint.co.in', phone: '+919820011226', jobTitle: 'Head of Sales', compIdx: 4 },
    { name: 'Farhan Akhtar', email: 'farhan@saffronspice.com', phone: '+919820011227', jobTitle: 'Export Director', compIdx: 5 },
    { name: 'Ananya Roy', email: 'ananya@zenithlegal.in', phone: '+919820011228', jobTitle: 'Managing Partner', compIdx: 6 },
    { name: 'Deepak Joshi', email: 'deepak@nmautoparts.com', phone: '+919820011229', jobTitle: 'Owner', compIdx: 7 },
    { name: 'Kavita Menon', email: 'kavita@saharasolar.in', phone: '+919820011230', jobTitle: 'VP Business Development', compIdx: 8 },
    { name: 'Arjun Nair', email: 'arjun@lotuswellness.co.in', phone: '+919820011231', jobTitle: 'Founder', compIdx: 9 },
    { name: 'Simran Bajaj', email: 'simran@kalyanretail.com', phone: '+919820011232', jobTitle: 'E-commerce Manager', compIdx: 0 },
    { name: 'Gaurav Mehta', email: 'gaurav@deccanlogistics.in', phone: '+919820011233', jobTitle: 'Logistics Tech Lead', compIdx: 1 },
    { name: 'Tanvi Shinde', email: 'tanvi@bandrabites.com', phone: '+919820011234', jobTitle: 'Brand Strategy Lead', compIdx: 2 },
    { name: 'Kabir Singhania', email: 'kabir@andherifintech.in', phone: '+919820011235', jobTitle: 'CEO', compIdx: 3 },
    { name: 'Pooja Hegde', email: 'pooja@apexprint.co.in', phone: '+919820011236', jobTitle: 'Procurement Specialist', compIdx: 4 },
    { name: 'Sanjay Dutt', email: 'sanjay@saffronspice.com', phone: '+919820011237', jobTitle: 'Commercial Manager', compIdx: 5 },
    { name: 'Ayesha Khan', email: 'ayesha@zenithlegal.in', phone: '+919820011238', jobTitle: 'Practice Lead', compIdx: 6 },
    { name: 'Rohan Gupta', email: 'rohan@nmautoparts.com', phone: '+919820011239', jobTitle: 'Sales Manager', compIdx: 7 },
    { name: 'Ishaan Khatter', email: 'ishaan@saharasolar.in', phone: '+919820011240', jobTitle: 'Project Consultant', compIdx: 8 },
  ];

  for (const c of contactADetails) {
    const cid = randomUUID();
    contactAIds.push(cid);
    await db.insert(contacts).values({
      id: cid,
      tenantId: tenantAId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      companyId: companyAIds[c.compIdx]!,
      jobTitle: c.jobTitle,
      leadSource: 'whatsapp_inbound',
      consentStatus: 'granted',
      tags: ['smb-target', 'mumbai-metro'],
      ownerUserId: userAId,
    });
  }

  // Leads for Tenant A (15 leads, including meeting_booked)
  const leadAIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const lid = randomUUID();
    leadAIds.push(lid);
    const isMeeting = i < 2; // at least 2 meetings
    await db.insert(leads).values({
      id: lid,
      tenantId: tenantAId,
      contactId: contactAIds[i]!,
      status: isMeeting ? 'meeting_booked' : i < 6 ? 'qualified' : i < 10 ? 'contacted' : 'nurture',
      qualificationStatus: isMeeting || i < 6 ? 'qualified' : 'pending',
      icpFitScore: 70 + (i % 25),
      intentScore: 65 + (i % 30),
      scoreReasons: [
        'Matches Mumbai SMB ICP profile ($1M-$5M turnover target)',
        'Decision maker title verified via enrichment',
      ],
      sourceChannel: 'whatsapp',
      assignedOwnerId: userAId,
      nextAction: isMeeting ? 'Prepare pre-meeting discovery dossier' : 'Send automated qualification follow-up',
    });
  }

  // Conversations for Tenant A (5 total, at least 3 stale)
  const convAIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const convId = randomUUID();
    convAIds.push(convId);
    const isStale = i < 3; // 3 stale conversations
    const lastMsgDate = isStale
      ? new Date(Date.now() - (55 + i * 10) * 3600 * 1000) // >48h ago
      : new Date(Date.now() - 2 * 3600 * 1000); // 2h ago

    await db.insert(conversations).values({
      id: convId,
      tenantId: tenantAId,
      contactId: contactAIds[i]!,
      leadId: leadAIds[i]!,
      channel: 'whatsapp',
      status: isStale ? 'stale' : 'active',
      lastMessageAt: lastMsgDate,
    });

    await db.insert(messages).values({
      id: randomUUID(),
      tenantId: tenantAId,
      conversationId: convId,
      direction: 'inbound',
      content: `Hello Mumbai Growth Studio, interested in your AI lead automation packages for our team.`,
      channel: 'whatsapp',
      senderType: 'contact',
      senderId: contactAIds[i]!,
      status: 'delivered',
      createdAt: lastMsgDate,
    });
  }

  // Opportunities for Tenant A (3 opportunities)
  const oppAIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const oppId = randomUUID();
    oppAIds.push(oppId);
    await db.insert(opportunities).values({
      id: oppId,
      tenantId: tenantAId,
      leadId: leadAIds[i]!,
      contactId: contactAIds[i]!,
      companyId: companyAIds[i]!,
      stage: i === 0 ? 'proposal' : i === 1 ? 'negotiation' : 'won',
      value: `${(15000 + i * 5000).toFixed(2)}`,
      currency: 'USD',
      probability: 70 + i * 10,
    });
  }

  // Payments for Tenant A (2 payments verified via webhook)
  for (let i = 0; i < 2; i++) {
    await db.insert(payments).values({
      id: randomUUID(),
      tenantId: tenantAId,
      opportunityId: oppAIds[i]!,
      contactId: contactAIds[i]!,
      stripeSessionId: `cs_mumbai_test_${i + 1}`,
      amount: `${(499 + i * 500).toFixed(2)}`,
      currency: 'USD',
      status: 'completed',
      verifiedViaWebhook: true,
      webhookEventId: `evt_mumbai_webhook_${i + 1}`,
      completedAt: new Date(),
    });
  }

  // Approval Requests for Tenant A (3 approval requests)
  for (let i = 0; i < 3; i++) {
    await db.insert(approvalRequests).values({
      id: randomUUID(),
      tenantId: tenantAId,
      leadId: leadAIds[i]!,
      conversationId: convAIds[i]!,
      actionType: 'send_outbound_message',
      actionSummary: `Send custom AI Lead Automation deployment quote to ${contactADetails[i]!.name}`,
      proposedAction: {
        channel: 'whatsapp',
        quoteAmount: 2500,
        message: `Namaste ${contactADetails[i]!.name}, here is your tailored AI lead intake blueprint for ${companyANames[i]!.name}.`,
      },
      riskLevel: 'high',
      status: i === 0 ? 'pending' : i === 1 ? 'approved' : 'rejected',
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
  }

  // Audit Events for Tenant A (10 audit events)
  for (let i = 0; i < 10; i++) {
    await db.insert(auditEvents).values({
      id: randomUUID(),
      tenantId: tenantAId,
      userId: userAId,
      toolName: i % 2 === 0 ? 'lead_qualification_agent' : 'conversation_agent',
      inputParams: { channel: 'whatsapp', leadIndex: i },
      outputSummary: `Audit event #${i + 1} for Mumbai Growth Studio: evaluated prospect response and synced CRM.`,
      policyDecision: 'ALLOWED',
      result: 'success',
      timestamp: new Date(Date.now() - (10 - i) * 3600 * 1000),
    });
  }

  // Knowledge Documents for Tenant A (Digital Marketing & AI Lead Automation)
  const docAId = randomUUID();
  await db.insert(knowledgeDocuments).values({
    id: docAId,
    tenantId: tenantAId,
    title: 'Mumbai Growth Studio — AI Lead Intake Playbook',
    content: 'Mumbai Growth Studio provides automated omnichannel lead capture (WhatsApp, Instagram, Web) with 60-second response SLAs and CRM integration for Indian SMBs.',
    docType: 'service_playbook',
    visibility: 'agents',
    embeddingStatus: 'completed',
    freshnessStatus: 'fresh',
  });

  await db.insert(knowledgeChunks).values({
    id: randomUUID(),
    tenantId: tenantAId,
    documentId: docAId,
    content: 'Standard pricing starts at $499/mo for Starter and $1,499/mo for Full Automation Suite with human-in-the-loop review.',
    chunkIndex: 0,
  });

  // =========================================================================
  // WORKSPACE B: Northstar Fitness
  // Fitness and coaching | Premium coaching program | Motivational & concise | Professionals
  // =========================================================================
  const tenantBId = randomUUID();
  const userBId = randomUUID();
  const userB2Id = randomUUID();

  await db.insert(tenants).values({
    id: tenantBId,
    name: 'Northstar Fitness',
    slug: 'northstar-fitness',
    plan: 'pro',
    settings: {
      industry: 'Fitness and coaching',
      offer: 'Premium coaching program',
      brand_voice: 'Motivational and concise',
      icp: 'Working professionals seeking executive physical conditioning',
      autonomous_sending: false,
      max_discount_percent: 10,
      allowed_channels: ['email', 'instagram'],
    },
  });

  await db.insert(users).values([
    {
      id: userBId,
      email: 'marcus@northstarfit.com',
      name: 'Marcus Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    },
    {
      id: userB2Id,
      email: 'claire@northstarfit.com',
      name: 'Claire Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    },
  ]);

  await db.insert(memberships).values([
    {
      id: randomUUID(),
      tenantId: tenantBId,
      userId: userBId,
      role: 'workspace_owner',
    },
    {
      id: randomUUID(),
      tenantId: tenantBId,
      userId: userB2Id,
      role: 'reviewer',
    },
  ]);

  // Companies for Tenant B (10 companies)
  const companyBIds: string[] = [];
  const companyBNames = [
    { name: 'Apex Capital Partners', domain: 'apexcap.com', industry: 'Private Equity', size: '20-50' },
    { name: 'Beacon Strategy Consulting', domain: 'beaconstrat.com', industry: 'Management Consulting', size: '50-100' },
    { name: 'CyberShield Systems', domain: 'cybershield.io', industry: 'Cybersecurity', size: '100-250' },
    { name: 'Delphi Analytics', domain: 'delphianalytics.com', industry: 'Data & AI', size: '40-80' },
    { name: 'Elevate Health Ventures', domain: 'elevatehv.com', industry: 'Venture Capital', size: '15-30' },
    { name: 'Frontier Media Tech', domain: 'frontiermedia.tv', industry: 'Digital Media', size: '30-70' },
    { name: 'Garrison Architecture Group', domain: 'garrisonarch.com', industry: 'Architecture & Design', size: '25-60' },
    { name: 'Horizon Cloud Networks', domain: 'horizoncloud.net', industry: 'Cloud Infrastructure', size: '60-150' },
    { name: 'IronClad Wealth Advisory', domain: 'ironcladwealth.com', industry: 'Wealth Management', size: '20-45' },
    { name: 'Jupiter BioPharma', domain: 'jupiterbio.com', industry: 'Biotechnology', size: '80-200' },
  ];

  for (const c of companyBNames) {
    const cid = randomUUID();
    companyBIds.push(cid);
    await db.insert(companies).values({
      id: cid,
      tenantId: tenantBId,
      name: c.name,
      domain: c.domain,
      industry: c.industry,
      sizeEstimate: c.size,
      location: 'London / New York',
      enrichmentSource: 'waterfall:pdl+clearbit',
    });
  }

  // Contacts for Tenant B (20 contacts)
  const contactBIds: string[] = [];
  const contactBDetails = [
    { name: 'David sterling', email: 'david@apexcap.com', phone: '+14155550201', jobTitle: 'Managing Partner', compIdx: 0 },
    { name: 'Samantha Cole', email: 'samantha@beaconstrat.com', phone: '+14155550202', jobTitle: 'Senior Partner', compIdx: 1 },
    { name: 'Julian Drake', email: 'julian@cybershield.io', phone: '+14155550203', jobTitle: 'CTO', compIdx: 2 },
    { name: 'Rachel Zane', email: 'rachel@delphianalytics.com', phone: '+14155550204', jobTitle: 'VP Analytics', compIdx: 3 },
    { name: 'Oliver Queen', email: 'oliver@elevatehv.com', phone: '+14155550205', jobTitle: 'General Partner', compIdx: 4 },
    { name: 'Helena Bertinelli', email: 'helena@frontiermedia.tv', phone: '+14155550206', jobTitle: 'Creative Director', compIdx: 5 },
    { name: 'Arthur Pendelton', email: 'arthur@garrisonarch.com', phone: '+14155550207', jobTitle: 'Principal Architect', compIdx: 6 },
    { name: 'Victoria Stone', email: 'victoria@horizoncloud.net', phone: '+14155550208', jobTitle: 'VP Infrastructure', compIdx: 7 },
    { name: 'Bruce Wayne', email: 'bruce@ironcladwealth.com', phone: '+14155550209', jobTitle: 'Chief Investment Officer', compIdx: 8 },
    { name: 'Diana Prince', email: 'diana@jupiterbio.com', phone: '+14155550210', jobTitle: 'Chief Science Officer', compIdx: 9 },
    { name: 'Barry Allen', email: 'barry@apexcap.com', phone: '+14155550211', jobTitle: 'Associate Partner', compIdx: 0 },
    { name: 'Iris West', email: 'iris@beaconstrat.com', phone: '+14155550212', jobTitle: 'Principal Consultant', compIdx: 1 },
    { name: 'Cisco Ramon', email: 'cisco@cybershield.io', phone: '+14155550213', jobTitle: 'Lead Security Architect', compIdx: 2 },
    { name: 'Caitlin Snow', email: 'caitlin@delphianalytics.com', phone: '+14155550214', jobTitle: 'Data Director', compIdx: 3 },
    { name: 'Ray Palmer', email: 'ray@elevatehv.com', phone: '+14155550215', jobTitle: 'Venture Partner', compIdx: 4 },
    { name: 'Felicity Smoak', email: 'felicity@frontiermedia.tv', phone: '+14155550216', jobTitle: 'Tech Lead', compIdx: 5 },
    { name: 'John Diggle', email: 'john@garrisonarch.com', phone: '+14155550217', jobTitle: 'Operations Director', compIdx: 6 },
    { name: 'Thea Queen', email: 'thea@horizoncloud.net', phone: '+14155550218', jobTitle: 'Client Success Director', compIdx: 7 },
    { name: 'Harvey Dent', email: 'harvey@ironcladwealth.com', phone: '+14155550219', jobTitle: 'Senior Counsel', compIdx: 8 },
    { name: 'Selina Kyle', email: 'selina@jupiterbio.com', phone: '+14155550220', jobTitle: 'Strategic Advisor', compIdx: 9 },
  ];

  for (const c of contactBDetails) {
    const cid = randomUUID();
    contactBIds.push(cid);
    await db.insert(contacts).values({
      id: cid,
      tenantId: tenantBId,
      name: c.name,
      email: c.email,
      phone: c.phone,
      companyId: companyBIds[c.compIdx]!,
      jobTitle: c.jobTitle,
      leadSource: 'instagram_inbound',
      consentStatus: 'granted',
      tags: ['executive-fitness', 'vip-coaching'],
      ownerUserId: userBId,
    });
  }

  // Leads for Tenant B (15 leads, at least 2 meetings)
  const leadBIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const lid = randomUUID();
    leadBIds.push(lid);
    const isMeeting = i < 2; // at least 2 meetings
    await db.insert(leads).values({
      id: lid,
      tenantId: tenantBId,
      contactId: contactBIds[i]!,
      status: isMeeting ? 'meeting_booked' : i < 6 ? 'qualified' : i < 10 ? 'contacted' : 'nurture',
      qualificationStatus: isMeeting || i < 6 ? 'qualified' : 'pending',
      icpFitScore: 80 + (i % 20),
      intentScore: 75 + (i % 25),
      scoreReasons: [
        'Executive professional role with demanding travel schedule',
        'Direct inquiry for private 1-on-1 performance coaching',
      ],
      sourceChannel: 'instagram',
      assignedOwnerId: userBId,
      nextAction: isMeeting ? 'Prepare high-performance conditioning dossier' : 'Send executive onboarding brief',
    });
  }

  // Conversations for Tenant B (5 conversations, at least 3 stale)
  const convBIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const convId = randomUUID();
    convBIds.push(convId);
    const isStale = i < 3; // at least 3 stale
    const lastMsgDate = isStale
      ? new Date(Date.now() - (60 + i * 12) * 3600 * 1000)
      : new Date(Date.now() - 3 * 3600 * 1000);

    await db.insert(conversations).values({
      id: convId,
      tenantId: tenantBId,
      contactId: contactBIds[i]!,
      leadId: leadBIds[i]!,
      channel: 'instagram',
      status: isStale ? 'stale' : 'active',
      lastMessageAt: lastMsgDate,
    });

    await db.insert(messages).values({
      id: randomUUID(),
      tenantId: tenantBId,
      conversationId: convId,
      direction: 'inbound',
      content: 'Hey Northstar, looking to optimize physical endurance and cognitive stamina while traveling.',
      channel: 'instagram',
      senderType: 'contact',
      senderId: contactBDetails[i]!.email,
      status: 'delivered',
      createdAt: lastMsgDate,
    });
  }

  // Opportunities for Tenant B (3 opportunities)
  const oppBIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const oppId = randomUUID();
    oppBIds.push(oppId);
    await db.insert(opportunities).values({
      id: oppId,
      tenantId: tenantBId,
      leadId: leadBIds[i]!,
      contactId: contactBIds[i]!,
      companyId: companyBIds[i]!,
      stage: i === 0 ? 'proposal' : i === 1 ? 'negotiation' : 'won',
      value: `${(5000 + i * 2500).toFixed(2)}`,
      currency: 'USD',
      probability: 80,
    });
  }

  // Payments for Tenant B (2 verified payments)
  for (let i = 0; i < 2; i++) {
    await db.insert(payments).values({
      id: randomUUID(),
      tenantId: tenantBId,
      opportunityId: oppBIds[i]!,
      contactId: contactBIds[i]!,
      stripeSessionId: `cs_northstar_test_${i + 1}`,
      amount: `${(999 + i * 1000).toFixed(2)}`,
      currency: 'USD',
      status: 'completed',
      verifiedViaWebhook: true,
      webhookEventId: `evt_northstar_webhook_${i + 1}`,
      completedAt: new Date(),
    });
  }

  // Approval Requests for Tenant B (3 approval requests)
  for (let i = 0; i < 3; i++) {
    await db.insert(approvalRequests).values({
      id: randomUUID(),
      tenantId: tenantBId,
      leadId: leadBIds[i]!,
      conversationId: convBIds[i]!,
      actionType: 'send_outbound_message',
      actionSummary: `Send Executive Performance Protocol invite to ${contactBDetails[i]!.name}`,
      proposedAction: {
        channel: 'instagram',
        quoteAmount: 5000,
        message: `Focus, discipline, results. Ready to elevate your performance, ${contactBDetails[i]!.name}? Review your bespoke training schedule.`,
      },
      riskLevel: 'high',
      status: i === 0 ? 'pending' : i === 1 ? 'approved' : 'rejected',
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    });
  }

  // Audit Events for Tenant B (10 audit events)
  for (let i = 0; i < 10; i++) {
    await db.insert(auditEvents).values({
      id: randomUUID(),
      tenantId: tenantBId,
      userId: userBId,
      toolName: i % 2 === 0 ? 'qualification_agent' : 'booking_agent',
      inputParams: { channel: 'instagram', leadIndex: i },
      outputSummary: `Audit log #${i + 1} for Northstar Fitness: logged executive fitness qualification & calendar sync.`,
      policyDecision: 'ALLOWED',
      result: 'success',
      timestamp: new Date(Date.now() - (10 - i) * 3600 * 1000),
    });
  }

  // Knowledge Documents for Tenant B (Fitness & Executive Coaching)
  const docBId = randomUUID();
  await db.insert(knowledgeDocuments).values({
    id: docBId,
    tenantId: tenantBId,
    title: 'Northstar Fitness — Executive Coaching Methodology',
    content: 'Northstar Fitness delivers bio-individualized training, nutrition tracking, and executive recovery protocols designed specifically for high-stress corporate leaders.',
    docType: 'coaching_protocol',
    visibility: 'agents',
    embeddingStatus: 'completed',
    freshnessStatus: 'fresh',
  });

  await db.insert(knowledgeChunks).values({
    id: randomUUID(),
    tenantId: tenantBId,
    documentId: docBId,
    content: 'Executive tier is $999/month including weekly live video check-ins, custom biometric dashboards, and hotel workout regimens.',
    chunkIndex: 0,
  });

  console.log('✅ Revora dual-workspace portfolio demo seed completed!');
  console.log(`Workspace A (Mumbai Growth Studio): ${tenantAId}`);
  console.log(`Workspace B (Northstar Fitness): ${tenantBId}`);

  return {
    workspaceA: { id: tenantAId, name: 'Mumbai Growth Studio' },
    workspaceB: { id: tenantBId, name: 'Northstar Fitness' },
  };
}
