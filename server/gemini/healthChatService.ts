import { ThinkingLevel, Type } from '@google/genai';
import type {
  ChatMessage,
  EvidenceSource,
  PatientProfile,
  PubMedExplanationResponse,
  PubMedPaper,
  TrendAnalysis,
} from '../../src/shared/types.ts';
import {
  GEMINI_MODEL,
  HEALTH_BESTIE_SAFETY_CONSTITUTION,
  getGeminiClient,
} from './client.ts';

function buildInvestigationContextBlock(
  patient: PatientProfile | null,
  trend: TrendAnalysis | null,
  evidence: EvidenceSource[],
  demoMode: boolean
): string {
  const patientSection =
    demoMode && patient
      ? JSON.stringify(
          {
            id: patient.id,
            label: 'Synthetic Demo Patient (fictional test record, NOT the user’s real personal labs)',
            isSynthetic: patient.isSynthetic,
            age: patient.age,
            sexAssignedAtBirth: patient.sexAssignedAtBirth,
            primaryConcerns: patient.primaryConcerns,
            wearables: patient.wearables || 'none',
            symptoms: patient.symptoms,
            labs: patient.labs,
            missingContext: patient.missingContext,
          },
          null,
          2
        )
      : 'DEMO MODE: OFF. No synthetic demo patient or personal medical history is loaded. Only reference facts the user explicitly states in their own chat messages.';

  const trendSection =
    demoMode && trend
      ? JSON.stringify(trend, null, 2)
      : 'No lab trend is active (Demo Mode is OFF). Do NOT mention ferritin numbers or iron-depletion trends unless the user brings them up.';

  const evidenceSection = evidence
    .map(
      (item) =>
        `- ID: ${item.id}\n  Title: ${item.title}\n  Source: ${item.organizationOrJournal} (${item.year})\n  URL: ${item.url}\n  Key Finding: ${item.keyFinding}\n  Female Representation: ${item.femaleRepresentation}\n  Sex-Specific Findings: ${item.sexSpecificFindings}\n  Limitations: ${item.limitations}\n  What Remains Unknown: ${item.whatRemainsUnknown}`
    )
    .join('\n');

  return `
=== SESSION DEMO MODE STATUS: ${demoMode ? 'ON (SYNTHETIC DEMO PATIENT)' : 'OFF (GENERAL USER CHAT)'} ===
${patientSection}

=== TYPESCRIPT-CALCULATED LAB TREND ANALYSIS ===
${trendSection}

=== CURATED VERIFIABLE MEDICAL EVIDENCE (ONLY CITE THESE EXACT IDs IF GENUINELY RELEVANT) ===
${evidenceSection}
`.trim();
}

export async function generateHealthChatReply(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  demoMode: boolean;
  patient: PatientProfile | null;
  trend: TrendAnalysis | null;
  evidence: EvidenceSource[];
}): Promise<{ reply: string; referencedEvidenceIds: string[] }> {
  const ai = getGeminiClient();
  const activePatient = params.demoMode ? params.patient : null;
  const activeTrend = params.demoMode ? params.trend : null;

  const contextBlock = buildInvestigationContextBlock(
    activePatient,
    activeTrend,
    params.evidence,
    params.demoMode
  );

  const conversationTranscript = params.messages
    .slice(-12)
    .map((m) => `${m.role === 'user' ? 'User' : 'Nomi'}: ${m.content}`)
    .join('\n\n');

  const groundingInstructions =
    params.demoMode && activePatient
      ? `- DEMO MODE IS ON (Synthetic Demo Patient ${activePatient.id}):
  - Explicitly label any reference to the loaded profile as the **Synthetic Demo Patient** (for example: "In the Synthetic Demo Patient record (${activePatient.id})..."), clearly distinguishing that synthetic profile from whatever new symptom the user just shared in chat.
  - Only bring up the demo ferritin trend (52 → 12 ng/mL) or heavy bleeding as context from the Synthetic Demo Patient when relevant, never claiming it is the user's real personal lab history.`
      : `- DEMO MODE IS OFF:
  - Do NOT mention ferritin values (52, 34, 21, 12, or 15 ng/mL), heavy menstrual bleeding, or any synthetic demo history unless the user explicitly mentions them in their own messages.
  - Answer only based on what the user explicitly shared and general, non-diagnostic educational women's health literacy.`;

  const prompt = `
${contextBlock}

=== CONVERSATION HISTORY ===
${conversationTranscript}

Respond to the user's latest message as Nomi.
${groundingInstructions}

CONVERSATIONAL QUALITY & FORMATTING RULES:
- For brief or incomplete symptom messages (such as "Hi My period is irregular"), keep the response concise (around 70–130 words total):
  1. Give a brief, warm, empathetic educational overview (no diagnosis, no treatment/prescriptions, and do NOT overwhelm with long lists of blood tests unless asked).
  2. Ask **ONE** clear, helpful follow-up question about cycle timing, cycle length/variation, bleed duration, or missed periods.
  3. Include brief urgent care awareness only when clinically appropriate without turning a greeting into an alarming list.
- Format cleanly in standard GitHub-flavored Markdown (plain paragraphs, optional concise bullets). Never output raw HTML, raw <svg> tags, or backslash-escaped asterisks (\\*).
- In "referencedEvidenceIds", include ONLY IDs from the curated evidence list above that directly support a statement in your reply. If the user asked about something not covered by those 3 sources (e.g., general irregular periods when Demo Mode is OFF), return an empty array [].
`.trim();

  const validIds = new Set(params.evidence.map((e) => e.id));

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: HEALTH_BESTIE_SAFETY_CONSTITUTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description:
              'Concise, warm, mobile-friendly Markdown reply distinguishing user facts vs synthetic demo data (if Demo Mode is ON) and ending with ONE focused follow-up question.',
          },
          referencedEvidenceIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              'Exact IDs from the curated evidence dataset that were genuinely relevant to the reply, or [] if none apply.',
          },
        },
        required: ['reply', 'referencedEvidenceIds'],
      },
    },
  });

  const raw = (response.text ?? '{}').trim();
  try {
    const parsed = JSON.parse(raw) as {
      reply?: string;
      referencedEvidenceIds?: string[];
    };
    const replyText =
      parsed.reply?.trim() ||
      'I’d be glad to explore this with you. Could you share a bit more about how your cycle timing or duration has been changing recently?';
    const filteredIds = Array.isArray(parsed.referencedEvidenceIds)
      ? Array.from(
          new Set(parsed.referencedEvidenceIds.filter((id) => validIds.has(id)))
        )
      : [];

    return {
      reply: replyText,
      referencedEvidenceIds: filteredIds,
    };
  } catch {
    return {
      reply:
        raw ||
        'I’d be glad to explore this with you. Could you share a bit more about how your cycle timing or duration has been changing recently?',
      referencedEvidenceIds: [],
    };
  }
}

export async function explainLabSignalsWithGemini(params: {
  patient: PatientProfile;
  trend: TrendAnalysis;
  evidence: EvidenceSource[];
}): Promise<{ explanation: string; questionsToExplore: string[] }> {
  const ai = getGeminiClient();
  const contextBlock = buildInvestigationContextBlock(
    params.patient,
    params.trend,
    params.evidence,
    true
  );

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `
${contextBlock}

Task: Using ONLY the deterministic TypeScript trend metrics and curated evidence above, explain why this longitudinal lab pattern matters even when earlier individual lab results fell inside a standard single-year reference range.
Explain clearly without making any diagnosis, without predicting cancer, and without recommending supplement doses.
Also provide 3 focused, practical questions the patient could bring to a clinician.
`.trim(),
    config: {
      systemInstruction: HEALTH_BESTIE_SAFETY_CONSTITUTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: {
            type: Type.STRING,
            description:
              'A clear, warm, non-diagnostic 2-3 paragraph educational explanation of the longitudinal ferritin trend and how it relates to symptoms and evidence limitations.',
          },
          questionsToExplore: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3 practical, non-prescriptive questions for a doctor visit.',
          },
        },
        required: ['explanation', 'questionsToExplore'],
      },
    },
  });

  const raw = (response.text ?? '{}').trim();
  try {
    const parsed = JSON.parse(raw) as {
      explanation?: string;
      questionsToExplore?: string[];
    };
    return {
      explanation:
        parsed.explanation?.trim() || params.trend.deterministicSummary,
      questionsToExplore: Array.isArray(parsed.questionsToExplore)
        ? parsed.questionsToExplore.slice(0, 4)
        : [],
    };
  } catch {
    return {
      explanation: params.trend.deterministicSummary,
      questionsToExplore: [
        'Looking at my 4-year ferritin trend alongside my fatigue and heavy periods, what follow-up labs (such as a CBC or inflammatory markers) would give a clearer picture?',
        'What could be contributing to my heavy menstrual bleeding, and how should we evaluate it?',
        'What ferritin and iron store targets make sense for my situation?',
      ],
    };
  }
}

export async function synthesizeDoctorSummaryWithGemini(params: {
  patient: PatientProfile;
  trend: TrendAnalysis;
  evidence: EvidenceSource[];
}): Promise<{
  visitOverview: string;
  uncertainties: string[];
  questionsForDoctor: string[];
}> {
  const ai = getGeminiClient();
  const contextBlock = buildInvestigationContextBlock(
    params.patient,
    params.trend,
    params.evidence,
    true
  );

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `
${contextBlock}

Task: Generate a structured, respectful, patient-ready Doctor Visit Summary grounded strictly in the patient's symptoms, TypeScript-calculated ferritin trend, and curated evidence.
- Do not make a diagnosis or recommend medication doses.
- Clearly highlight key uncertainties / missing labs.
- Provide 4 concise, high-value questions the patient can hand to or ask their doctor.
`.trim(),
    config: {
      systemInstruction: HEALTH_BESTIE_SAFETY_CONSTITUTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          visitOverview: {
            type: Type.STRING,
            description:
              'A 2-3 sentence neutral clinical summary of the patient’s reported symptoms and multi-year ferritin trajectory for a doctor visit.',
          },
          uncertainties: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-5 clear gaps in information or missing labs needed before drawing conclusions.',
          },
          questionsForDoctor: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '4 thoughtful questions for the clinician.',
          },
        },
        required: ['visitOverview', 'uncertainties', 'questionsForDoctor'],
      },
    },
  });

  const raw = (response.text ?? '{}').trim();
  try {
    const parsed = JSON.parse(raw) as {
      visitOverview?: string;
      uncertainties?: string[];
      questionsForDoctor?: string[];
    };
    return {
      visitOverview:
        parsed.visitOverview?.trim() || params.trend.deterministicSummary,
      uncertainties:
        Array.isArray(parsed.uncertainties) && parsed.uncertainties.length > 0
          ? parsed.uncertainties
          : params.patient.missingContext,
      questionsForDoctor:
        Array.isArray(parsed.questionsForDoctor) && parsed.questionsForDoctor.length > 0
          ? parsed.questionsForDoctor
          : [
              'Could we review my multi-year ferritin drop alongside a Complete Blood Count (CBC) to check hemoglobin and red blood cell indices?',
              'Would checking CRP/ESR, transferrin saturation, thyroid function (TSH), B12, or Vitamin D help clarify what is driving my fatigue?',
              'How should we evaluate the underlying reason for my heavy menstrual bleeding?',
              'What follow-up timeline and evidence-based options should we consider together?',
            ],
    };
  } catch {
    return {
      visitOverview: params.trend.deterministicSummary,
      uncertainties: params.patient.missingContext,
      questionsForDoctor: [
        'Could we review my multi-year ferritin drop alongside a Complete Blood Count (CBC) to check hemoglobin and red blood cell indices?',
        'Would checking CRP/ESR, transferrin saturation, thyroid function (TSH), B12, or Vitamin D help clarify what is driving my fatigue?',
        'How should we evaluate the underlying reason for my heavy menstrual bleeding?',
        'What follow-up timeline and evidence-based options should we consider together?',
      ],
    };
  }
}

export async function explainPubMedPaperWithGemini(params: {
  paper: PubMedPaper;
  topic?: string;
}): Promise<PubMedExplanationResponse> {
  const ai = getGeminiClient();

  const metadataBlock = JSON.stringify(
    {
      pmid: params.paper.pmid,
      title: params.paper.title,
      authors: params.paper.authors,
      journal: params.paper.fullJournalName || params.paper.journal,
      pubDate: params.paper.pubDate,
      publicationDetails: params.paper.publicationDetails,
      publicationTypes: params.paper.publicationTypes,
      pubmedUrl: params.paper.pubmedUrl,
    },
    null,
    2
  );

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `
=== RETRIEVED PUBMED ESUMMARY RECORD (BIBLIOGRAPHIC METADATA ONLY) ===
${metadataBlock}

General topic searched: ${(params.topic || 'women’s health, ferritin, and fatigue').trim()}

Task:
Help a patient understand what this specific PubMed record covers, STRICTLY separating:
1. "sourceSupported": Facts directly visible in the retrieved PubMed ESummary metadata (title topic, publication year, journal, publication type like Systematic Review or Review, authors). Do NOT invent abstracts, sample sizes, female cohort percentages, p-values, or study outcomes.
2. "uncertaintyAndGaps": What remains unknown from ESummary metadata alone (for example: full abstract and study text were not retrieved here, exact sample size, female participation percentage, ferritin cutoff definitions, effect sizes, and whether findings apply to an individual).
3. "summaryNote": 1–2 plain-language non-diagnostic sentences framing how to read this title/type responsibly.
4. "questionsForClinician": 2 concise, non-diagnostic questions to discuss with a doctor.
`.trim(),
    config: {
      systemInstruction: HEALTH_BESTIE_SAFETY_CONSTITUTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sourceSupported: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2-3 statements strictly grounded in the retrieved PubMed ESummary metadata.',
          },
          uncertaintyAndGaps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2-3 clear uncertainties, missing abstract details, or individual gaps.',
          },
          summaryNote: {
            type: Type.STRING,
            description: '1-2 concise educational sentences without diagnosis or fabricated findings.',
          },
          questionsForClinician: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2 practical questions for a clinician visit.',
          },
        },
        required: [
          'sourceSupported',
          'uncertaintyAndGaps',
          'summaryNote',
          'questionsForClinician',
        ],
      },
    },
  });

  const raw = (response.text ?? '{}').trim();
  try {
    const parsed = JSON.parse(raw) as Partial<PubMedExplanationResponse>;
    return {
      pmid: params.paper.pmid,
      sourceSupported:
        Array.isArray(parsed.sourceSupported) && parsed.sourceSupported.length > 0
          ? parsed.sourceSupported.slice(0, 4)
          : [
              `Indexed in PubMed (PMID ${params.paper.pmid}) in ${params.paper.journal} (${params.paper.pubDate}).`,
              `Title indicates focus on: "${params.paper.title}"${
                params.paper.publicationTypes.length > 0
                  ? ` (${params.paper.publicationTypes.join(', ')})`
                  : ''
              }.`,
            ],
      uncertaintyAndGaps:
        Array.isArray(parsed.uncertaintyAndGaps) && parsed.uncertaintyAndGaps.length > 0
          ? parsed.uncertaintyAndGaps.slice(0, 4)
          : [
              'NCBI ESummary returns bibliographic metadata only; the abstract, sample size, female cohort percentage, and statistical results were not retrieved.',
              'Whether this paper applies to an individual depends on full-text review and clinical evaluation.',
            ],
      summaryNote:
        parsed.summaryNote?.trim() ||
        'This PubMed entry confirms the study topic and publication type; full outcomes require inspecting the linked PubMed abstract or full article.',
      questionsForClinician:
        Array.isArray(parsed.questionsForClinician) && parsed.questionsForClinician.length > 0
          ? parsed.questionsForClinician.slice(0, 3)
          : [
              'How does this type of research apply—or not apply—to my specific symptoms and lab history?',
              'What clinical guidelines or follow-up tests do you rely on when evaluating these concerns?',
            ],
    };
  } catch {
    return {
      pmid: params.paper.pmid,
      sourceSupported: [
        `PubMed record PMID ${params.paper.pmid} published in ${params.paper.journal} (${params.paper.pubDate}).`,
        `Publication type(s): ${
          params.paper.publicationTypes.join(', ') || 'Journal Article'
        }.`,
      ],
      uncertaintyAndGaps: [
        'Abstract text, sample size, female cohort percentage, and numerical findings are not included in ESummary metadata.',
        'Open the PubMed URL directly to review the full abstract and limitations before drawing conclusions.',
      ],
      summaryNote:
        'Only verified bibliographic metadata was retrieved; avoid inferring study outcomes from a title alone.',
      questionsForClinician: [
        'Could we discuss how current medical guidelines interpret findings on this topic for my health context?',
      ],
    };
  }
}

export type { ChatMessage };
