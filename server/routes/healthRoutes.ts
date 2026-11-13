import { Router } from 'express';
import type { DoctorSummaryData, PatientProfile, PubMedPaper } from '../../src/shared/types.ts';
import { analyzeFerritinTrend, detectUrgentSymptoms } from '../analysis/trendEngine.ts';
import { CURATED_EVIDENCE, DEMO_PATIENT } from '../data/demoPatient.ts';
import { formatGeminiError } from '../gemini/client.ts';
import {
  explainLabSignalsWithGemini,
  explainPubMedPaperWithGemini,
  generateHealthChatReply,
  synthesizeDoctorSummaryWithGemini,
} from '../gemini/healthChatService.ts';
import { searchPubMedResearch } from '../services/pubmedService.ts';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nomi' });
});

healthRouter.get('/demo-patient', (_req, res) => {
  const trend = analyzeFerritinTrend(DEMO_PATIENT.labs);
  res.json({
    patient: DEMO_PATIENT,
    trend,
    evidence: CURATED_EVIDENCE,
  });
});

healthRouter.get('/evidence', (_req, res) => {
  res.json({ evidence: CURATED_EVIDENCE });
});

healthRouter.get('/research', async (req, res) => {
  const rawQuery = typeof req.query.query === 'string' ? req.query.query : '';
  const result = await searchPubMedResearch(rawQuery);
  res.json(result);
});

healthRouter.post('/research/explain', async (req, res) => {
  try {
    const body = req.body as { paper?: PubMedPaper; topic?: string };
    if (!body?.paper?.pmid || !body?.paper?.title) {
      res.status(400).json({ error: 'Valid PubMed paper metadata is required.' });
      return;
    }

    const explanation = await explainPubMedPaperWithGemini({
      paper: body.paper,
      topic: body.topic,
    });
    res.json(explanation);
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

healthRouter.post('/analyze-signals', async (req, res) => {
  try {
    const body = req.body as { patient?: PatientProfile };
    const patient = body?.patient ?? DEMO_PATIENT;
    const trend = analyzeFerritinTrend(patient.labs);
    const symptomText = patient.symptoms.map((s) => `${s.name} ${s.notes}`).join(' ');
    const urgentAlert = detectUrgentSymptoms(symptomText);

    const geminiResult = await explainLabSignalsWithGemini({
      patient,
      trend,
      evidence: CURATED_EVIDENCE,
    });

    res.json({
      trend,
      explanation: geminiResult.explanation,
      questionsToExplore: geminiResult.questionsToExplore,
      urgentAlert,
    });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

healthRouter.post('/chat', async (req, res) => {
  try {
    const body = req.body as {
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
      demoMode?: boolean;
      patient?: PatientProfile | null;
    };

    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const latestUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    if (!latestUserMsg.trim()) {
      res.status(400).json({ error: 'Please enter a health question to ask Nomi.' });
      return;
    }

    const demoMode = typeof body?.demoMode === 'boolean' ? body.demoMode : Boolean(body?.patient);
    const patient = demoMode ? body?.patient ?? DEMO_PATIENT : null;
    const trend = patient ? analyzeFerritinTrend(patient.labs) : null;
    const urgentAlert = detectUrgentSymptoms(latestUserMsg);

    const result = await generateHealthChatReply({
      messages,
      demoMode,
      patient,
      trend,
      evidence: CURATED_EVIDENCE,
    });

    res.json({
      reply: result.reply,
      referencedEvidenceIds: result.referencedEvidenceIds,
      urgentAlert,
      trend,
      demoMode,
    });
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

healthRouter.post('/doctor-summary', async (req, res) => {
  try {
    const body = req.body as { patient?: PatientProfile };
    const patient = body?.patient ?? DEMO_PATIENT;
    const trend = analyzeFerritinTrend(patient.labs);

    const synthesized = await synthesizeDoctorSummaryWithGemini({
      patient,
      trend,
      evidence: CURATED_EVIDENCE,
    });

    const summary: DoctorSummaryData = {
      generatedAt: new Date().toISOString(),
      patient,
      trend,
      evidence: CURATED_EVIDENCE,
      visitOverview: synthesized.visitOverview,
      uncertainties: synthesized.uncertainties,
      questionsForDoctor: synthesized.questionsForDoctor,
      urgentGuidanceNote:
        'Seek prompt in-person or urgent care for chest pain, shortness of breath at rest, fainting, severe dizziness, or soaking through a pad/tampon every hour for 2+ hours.',
    };

    res.json(summary);
  } catch (error) {
    const formatted = formatGeminiError(error);
    res.status(formatted.status).json({ error: formatted.message });
  }
});
