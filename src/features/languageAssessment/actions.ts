// src/features/languageAssessment/actions.ts
"use server";

console.log("SERVER ACTIONS FILE: GEMINI_API_KEY:", process.env.GEMINI_API_KEY);
console.log("SERVER ACTIONS FILE: ALL ENV KEYS:", Object.keys(process.env)); // See all available keys


import {
    generateQuestionsForSkill as originalGenerateQuestions,
    assessStudentWriting as originalAssessWriting,
    assessStudentSpeaking as originalAssessSpeaking,
    generateComprehensiveReport as originalGenerateReport,
    generateAudioFromDialogue as originalGenerateAudio,
} from "@/services/geminiService";

import {
    CEFRLevel, SkillType, AnyQuestion, WritingAssessmentPayload,
    SpeakingAssessmentPayload, FinalReport, SectionResult, DialogueLine
} from "@/types";
import { QUESTIONS_PER_SKILL } from "@/constants"; // Corrected import path

// Helper to convert Uint8Array to Base64 string (server-side)
function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    // btoa is available in modern Node.js server environments (often via undici)
    // If issues arise, Buffer.from(bytes).toString('base64') is an alternative.
    try {
        return btoa(binary);
    } catch (e) {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(bytes).toString('base64');
        }
        console.error("btoa not available and Buffer API also failed for Base64 conversion.");
        throw e;
    }
}

export async function generateQuestionsAction(
    skill: SkillType,
    level: CEFRLevel
): Promise<AnyQuestion[] | { error: string }> {
    try {
        // QUESTIONS_PER_SKILL is now correctly imported and used by originalGenerateQuestions
        const questions = await originalGenerateQuestions(skill, level, QUESTIONS_PER_SKILL);
        return questions;
    } catch (error: any) {
        console.error("Server Action Error (generateQuestionsAction):", error.message);
        return { error: `Failed to generate questions: ${error.message}` };
    }
}

export async function assessStudentWritingAction(
    originalPrompt: string,
    studentText: string,
    level: CEFRLevel
): Promise<WritingAssessmentPayload | { error: string }> {
    try {
        const assessment = await originalAssessWriting(originalPrompt, studentText, level);
        return assessment;
    } catch (error: any) {
        console.error("Server Action Error (assessStudentWritingAction):", error.message);
        return { error: `Failed to assess writing: ${error.message}` };
    }
}

export async function assessStudentSpeakingAction(
    speakingPrompt: string,
    audioBase64: string,
    audioMimeType: string,
    level: CEFRLevel
): Promise<SpeakingAssessmentPayload | { error: string }> {
    try {
        const assessment = await originalAssessSpeaking(speakingPrompt, audioBase64, audioMimeType, level);
        return assessment;
    } catch (error: any) {
        console.error("Server Action Error (assessStudentSpeakingAction):", error.message);
        return { error: `Failed to assess speaking: ${error.message}` };
    }
}

export async function generateComprehensiveReportAction(
    studentName: string,
    sectionResults: SectionResult[],
    assessedLevel: CEFRLevel
): Promise<FinalReport | { error: string }> {
    try {
        const report = await originalGenerateReport(studentName, sectionResults, assessedLevel);
        return report;
    } catch (error: any) {
        console.error("Server Action Error (generateComprehensiveReportAction):", error.message);
        return { error: `Failed to generate report: ${error.message}` };
    }
}

export async function generateAudioFromDialogueAction(
    dialogueLines: DialogueLine[],
    speakerVoiceMap: { [scriptSpeakerName: string]: string } | undefined
): Promise<{ audioBase64: string } | { error: string }> {
    try {
        const pcmData: Uint8Array = await originalGenerateAudio(dialogueLines, speakerVoiceMap);
        const audioBase64 = uint8ArrayToBase64(pcmData);
        return { audioBase64 };
    } catch (error: any)
    {
        console.error("Server Action Error (generateAudioFromDialogueAction):", error.message);
        return { error: `Failed to generate audio: ${error.message}` };
    }
}
