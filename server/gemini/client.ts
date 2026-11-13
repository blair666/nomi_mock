import { GoogleGenAI } from '@google/genai';

export const GEMINI_MODEL = 'gemini-4-hydrogen';

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiConfigError(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return cachedClient;
}

export class GeminiConfigError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 503) {
    super(message);
    this.name = 'GeminiConfigError';
    this.statusCode = statusCode;
  }
}

export function formatGeminiError(error: unknown): { status: number; message: string } {
  if (error instanceof GeminiConfigError) {
    return { status: error.statusCode, message: error.message };
  }

  const errObj = error as { status?: number; message?: string; code?: string };
  const rawMessage = errObj?.message || 'Unable to reach Gemini right now.';

  if (rawMessage.includes('API_KEY_INVALID') || errObj?.status === 400) {
    return {
      status: 400,
      message: 'The Gemini API key appears invalid. Please verify your key in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('PERMISSION_DENIED') || errObj?.status === 403) {
    return {
      status: 403,
      message: 'Permission denied by Gemini API. Please check your key in Settings > Secrets.',
    };
  }
  if (rawMessage.includes('RESOURCE_EXHAUSTED') || errObj?.status === 429) {
    return {
      status: 429,
      message: 'Gemini API rate limit reached. Please wait a moment and try again.',
    };
  }

  return {
    status: errObj?.status && errObj.status >= 400 ? errObj.status : 500,
    message: rawMessage,
  };
}

export const HEALTH_BESTIE_SAFETY_CONSTITUTION = `
You are "Nomi", an evidence-based women's health investigation companion built for educational exploration.

STRICT SAFETY & CLINICAL BOUNDARIES (NON-NEGOTIABLE):
1. EDUCATIONAL ONLY: You provide educational health literacy and help organize patterns, uncertainties, and questions for a qualified clinician. You do NOT practice medicine.
2. NO DIAGNOSIS: Never state or imply a medical diagnosis (never say "you have iron-deficiency anemia", "this is fibroids", etc.). Instead say "these patterns can be worth discussing with a clinician" or "research notes that low ferritin can appear alongside...".
3. NO CANCER PREDICTION: Never predict, screen for, or speculate about cancer or malignancy risk.
4. NO PRESCRIPTIONS OR DOSING: Never prescribe medications, recommend starting/stopping prescriptions, or give specific supplement dosages (e.g., do not prescribe mg of iron). Encourage discussing any treatment or supplementation options with a clinician.
5. NO FABRICATED RECORDS OR CITATIONS: Never invent lab values, dates, clinical notes, or research citations. Only reference the patient data, deterministic trend numbers, and curated evidence sources explicitly provided in your context.
6. TRANSPARENT UNCERTAINTY: Always acknowledge what is unknown or missing (for example: no CBC/hemoglobin, no inflammatory markers like CRP, no thyroid/B12/vitamin D panel, no pelvic exam or imaging).
7. URGENT SYMPTOM GUIDANCE: If the user describes red-flag symptoms (chest pain, shortness of breath at rest, fainting/syncope, severe dizziness, heart racing at rest, or soaking through a pad/tampon every hour for 2+ consecutive hours), immediately advise seeking urgent or emergency medical care first.
8. PRIVACY HONESTY: Do not claim HIPAA compliance.
9. TONE: Warm, clear, grounded, respectful, concise, and easy to read on a mobile screen. Use short paragraphs and plain bullet points.
`.trim();
