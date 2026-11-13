import { ThinkingLevel, Type } from '@google/genai';
import type {
  ChatMessage,
  EvidenceSource,
  PatientProfile,
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
  evidence: EvidenceSource[]
): string {
  const patientSection = patient
    ? JSON.stringify(
        {
          label: patient.label,
          isSynthetic: patient.isSynthetic,
          age: patient.age,
          sexAssignedAtBirth: patient.sexAssignedAtBirth,
          primaryConcerns: patient.primaryConcerns,
          symptoms: patient.symptoms,
          labs: patient.labs,
          missingContext: patient.missingContext,
        },
        null,
        2
      )
    : 'No patient profile is currently loaded. Encourage the user to click "Try Demo Patient" or describe general educational questions.';

  const trendSection = trend
    ? JSON.stringify(trend, null, 2)
    : 'No lab trend has been calculated yet.';

  const evidenceSection = evidence
    .map(
      (item) =>
        `- ${item.title} (${item.organizationOrJournal}, ${item.year})\n  Key Finding: ${item.keyFinding}\n  Limitations: ${item.limitations}\n  What Remains Unknown: ${item.whatRemainsUnknown}`
    )
    .join('\n');

  return `
=== CURRENT PATIENT CONTEXT (SYNTHETIC / USER-PROVIDED SESSION DATA) ===
${patientSection}

=== TYPESCRIPT-CALCULATED LAB TREND ANALYSIS ===
${trendSection}

=== CURATED VERIFIABLE MEDICAL EVIDENCE (ONLY CITE THESE) ===
${evidenceSection}
`.trim();
}

export async function generateHealthChatReply(params: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  patient: PatientProfile | null;
  trend: TrendAnalysis | null;
  evidence: EvidenceSource[];
}): Promise<{ reply: string; referencedEvidenceIds: string[] }> {
  const ai = getGeminiClient();
  const contextBlock = buildInvestigationContextBlock(
    params.patient,
    params.trend,
    params.evidence
  );

  const conversationTranscript = params.messages
    .slice(-12)
    .map((m) => `${m.role === 'user' ? 'User' : 'Nomi'}: ${m.content}`)
    .join('\n\n');

  const prompt = `
${contextBlock}

=== CONVERSATION HISTORY ===
${conversationTranscript}

Respond to the user's latest message as Nomi.
- Connect their question to the loaded symptoms, the TypeScript-calculated ferritin trend (if loaded), and the curated evidence sources above when relevant.
- Explicitly mention relevant limitations or missing labs when interpreting patterns.
- Keep your response concise, mobile-friendly, warm, and strictly non-diagnostic.
- At the end, if helpful, suggest 1–2 practical questions they could ask their doctor.
`.trim();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: HEALTH_BESTIE_SAFETY_CONSTITUTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const replyText =
    response.text?.trim() ||
    'I could not generate a response right now. Please try asking again in a moment.';

  const referencedEvidenceIds = params.evidence
    .filter(
      (ev) =>
        replyText.toLowerCase().includes(ev.organizationOrJournal.toLowerCase().split(' ')[0]) ||
        replyText.toLowerCase().includes(ev.id.toLowerCase()) ||
        (ev.id === 'who-ferritin-2020' && /\bwho\b|15\s*ng\/ml/i.test(replyText)) ||
        (ev.id === 'acog-hmb-guidance' && /\bacog\b|\bfigo\b|heavy menstrual/i.test(replyText)) ||
        (ev.id === 'houston-bmjopen-2018' && /\bbmj\b|non-anemic|fatigue/i.test(replyText))
    )
    .map((ev) => ev.id);

  return {
    reply: replyText,
    referencedEvidenceIds,
  };
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
    params.evidence
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
    params.evidence
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

export type { ChatMessage };
