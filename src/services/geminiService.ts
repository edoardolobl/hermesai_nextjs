// src/services/geminiService.ts
import { GoogleGenAI, GenerateContentResponse, Part, InlineDataPart, HarmCategory, HarmBlockThreshold, Type as GoogleGenType } from "@google/genai";
import {
    CEFRLevel, SkillType, AnyQuestion, MultipleChoiceQuestionType, ReadingComprehensionTask, WritingTask, ListeningComprehensionTask, SpeakingTask,
    DialogueLine, GeneratedMCQPayload, GeneratedReadingTaskPayload, GeneratedWritingPromptPayload, GeneratedListeningTaskPayload, GeneratedSpeakingPromptPayload,
    WritingAssessmentPayload, SpeakingAssessmentPayload, FinalReportPayload, SectionResult, FinalReport
} from '@/types';
import {
    QUESTIONS_PER_SKILL,
    // AUDIO_SAMPLE_RATE, // Not directly used here; client uses it for AudioContext
    GEMINI_MODEL_TEXT,
    GEMINI_MODEL_TTS
} from '@/constants';

const API_KEY = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI;

if (!API_KEY) {
    if (process.env.NODE_ENV !== 'test') {
        console.error(
            "CRITICAL SERVER ERROR: GEMINI_API_KEY is not set in server environment variables. " +
            "The Gemini Service will not function. Please ensure GEMINI_API_KEY (without NEXT_PUBLIC_) is in your .env.local file."
        );
    }
    ai = new GoogleGenAI("DUMMY_API_KEY_FOR_INIT_ONLY_DO_NOT_USE_IN_PROD");
} else {
    ai = new GoogleGenAI(API_KEY);
}

const generationConfigForTextModelsJSON = {
    responseMimeType: "application/json",
    // temperature: 0.7, // Optional: Adjust for creativity
    // maxOutputTokens: 2048, // Optional: Adjust as needed
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// --- TTS Voice Data ---
interface TTSVoice { name: string; gender: 'female' | 'male'; characteristic: string; }
const ALL_AVAILABLE_TTS_VOICES: TTSVoice[] = [
    { name: 'zephyr', gender: 'female', characteristic: 'Bright' }, { name: 'puck', gender: 'male', characteristic: 'Upbeat' },
    { name: 'charon', gender: 'male', characteristic: 'Informative' }, { name: 'kore', gender: 'female', characteristic: 'Firm' },
    { name: 'fenrir', gender: 'male', characteristic: 'Excitable' }, { name: 'leda', gender: 'female', characteristic: 'Youthful' },
    { name: 'orus', gender: 'male', characteristic: 'Firm' }, { name: 'aoede', gender: 'female', characteristic: 'Breezy' },
    { name: 'callirrhoe', gender: 'female', characteristic: 'Easy-going' }, { name: 'autonoe', gender: 'female', characteristic: 'Bright' },
    { name: 'enceladus', gender: 'male', characteristic: 'Breathy' }, { name: 'iapetus', gender: 'male', characteristic: 'Clear' },
    { name: 'umbriel', gender: 'male', characteristic: 'Easy-going' }, { name: 'algieba', gender: 'male', characteristic: 'Smooth' },
    { name: 'despina', gender: 'female', characteristic: 'Smooth' }, { name: 'erinome', gender: 'female', characteristic: 'Clear' },
    { name: 'algenib', gender: 'male', characteristic: 'Gravelly' }, { name: 'rasalgethi', gender: 'male', characteristic: 'Informative' },
    { name: 'laomedeia', gender: 'female', characteristic: 'Upbeat' }, { name: 'achernar', gender: 'female', characteristic: 'Soft' },
    { name: 'alnilam', gender: 'male', characteristic: 'Firm' }, { name: 'schedar', gender: 'male', characteristic: 'Even' },
    { name: 'gacrux', gender: 'female', characteristic: 'Mature' }, { name: 'pulcherrima', gender: 'male', characteristic: 'Forward' },
    { name: 'achird', gender: 'male', characteristic: 'Friendly' }, { name: 'zubenelgenubi', gender: 'male', characteristic: 'Casual' },
    { name: 'vindemiatrix', gender: 'female', characteristic: 'Gentle' }, { name: 'sadachbia', gender: 'male', characteristic: 'Lively' },
    { name: 'sadaltager', gender: 'male', characteristic: 'Knowledgeable' }, { name: 'sulafat', gender: 'female', characteristic: 'Warm' },
];
const FEMALE_TTS_VOICES = ALL_AVAILABLE_TTS_VOICES.filter(v => v.gender === 'female');
const MALE_TTS_VOICES = ALL_AVAILABLE_TTS_VOICES.filter(v => v.gender === 'male');

function selectDistinctVoicesForDialogue(): TTSVoice[] {
    const selectedVoices: TTSVoice[] = [];
    const availableFemale = [...FEMALE_TTS_VOICES];
    const availableMale = [...MALE_TTS_VOICES];
    if (availableFemale.length > 0) { selectedVoices.push(availableFemale.splice(Math.floor(Math.random() * availableFemale.length), 1)[0]); }
    if (availableMale.length > 0) { selectedVoices.push(availableMale.splice(Math.floor(Math.random() * availableMale.length), 1)[0]); }
    const allRemaining = ALL_AVAILABLE_TTS_VOICES.filter(v => !selectedVoices.find(sv => sv.name === v.name));
    while (selectedVoices.length < 2 && allRemaining.length > 0) { selectedVoices.push(allRemaining.splice(Math.floor(Math.random() * allRemaining.length), 1)[0]); }
    if (selectedVoices.length === 0) {
        selectedVoices.push(ALL_AVAILABLE_TTS_VOICES[0] || {name: "puck", gender:"male", characteristic:"Upbeat"});
        selectedVoices.push(ALL_AVAILABLE_TTS_VOICES[1] || ALL_AVAILABLE_TTS_VOICES[0] || {name: "zephyr", gender:"female", characteristic:"Bright"});
    } else if (selectedVoices.length === 1) {
        const other = ALL_AVAILABLE_TTS_VOICES.find(v => v.name !== selectedVoices[0].name) || ALL_AVAILABLE_TTS_VOICES[0];
        selectedVoices.push(other);
    }
    return selectedVoices.slice(0,2);
}
// --- End TTS Voice Data ---

// --- Server-Safe Audio Utility ---
function decodeBase64(base64: string): Uint8Array {
    try {
        if (typeof atob === 'function') {
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
            return bytes;
        } else if (typeof Buffer !== 'undefined') {
            return Buffer.from(base64, 'base64');
        }
        throw new Error("Base64 decoding unsupported in this server environment.");
    } catch (e) {
        console.error("Error decoding base64 (server-side):", e);
        throw e;
    }
}
// --- End Server-Safe Audio Utility ---

// --- Utility Functions ---
function parseJsonFromGeminiResponse<T>(responseText: string): T {
    let jsonStr = responseText.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) { jsonStr = match[1].trim(); }
    try { return JSON.parse(jsonStr) as T; }
    catch (e) {
        if (e instanceof Error) {
            throw new Error(`Invalid JSON from AI. Error: ${e.message}. Text: ${responseText.substring(0,500)}`);
        }
        throw new Error(`Invalid JSON from AI. Unknown error. Text: ${responseText.substring(0,500)}`);
    }
}

const generateUniqueId = (skill: SkillType, level: CEFRLevel, index: number, subIndex?: number): string => {
    const skillPart = skill.toLowerCase().replace(/\s+/g, '-');
    return `${skillPart}-${level}-${index}${subIndex !== undefined ? `-${subIndex}` : ''}`;
};
// --- End Utility Functions ---

// --- Core Gemini API Interaction Functions ---

export async function generateAudioFromDialogue(
    dialogueLines: DialogueLine[],
    speakerVoiceMapInput: { [scriptSpeakerName: string]: string } | undefined
): Promise<Uint8Array> {
    if (!API_KEY) throw new Error("SERVER: GEMINI_API_KEY not configured for TTS.");

    let fullTranscript = "";
    const uniqueScriptSpeakers = new Set<string>();
    dialogueLines.forEach(dl => {
        fullTranscript += `${dl.speaker}: ${dl.line}\n`;
        uniqueScriptSpeakers.add(dl.speaker);
    });

    const speechConfigPayload: any = {};
    const speakerVoiceMap = speakerVoiceMapInput || {};

    if (uniqueScriptSpeakers.size > 1) {
        const speakerConfigs: any[] = [];
        Array.from(uniqueScriptSpeakers).forEach(scriptSpeakerName => {
            const ttsVoiceName = speakerVoiceMap[scriptSpeakerName];
            if (ttsVoiceName) {
                speakerConfigs.push({ speaker: scriptSpeakerName, voiceConfig: { prebuiltVoiceConfig: { voiceName: ttsVoiceName.toLowerCase() } } });
            } else { console.warn(`SERVER: No TTS voice mapped for dialogue speaker "${scriptSpeakerName}".`); }
        });
        if (speakerConfigs.length > 0) { speechConfigPayload.multiSpeakerVoiceConfig = { speakerVoiceConfigs: speakerConfigs }; }
        else { speechConfigPayload.voiceConfig = { prebuiltVoiceConfig: { voiceName: ALL_AVAILABLE_TTS_VOICES[0].name.toLowerCase() } }; }
    } else if (uniqueScriptSpeakers.size === 1) {
        const singleSpeakerName = Array.from(uniqueScriptSpeakers)[0];
        const ttsVoiceName = speakerVoiceMap[singleSpeakerName] || ALL_AVAILABLE_TTS_VOICES[0].name;
        speechConfigPayload.voiceConfig = { prebuiltVoiceConfig: { voiceName: ttsVoiceName.toLowerCase() } };
    } else { throw new Error("Cannot generate dialogue audio: no speakers found."); }

    const textualContents = [{ role: "user" as const, parts: [{ text: fullTranscript.trim() }] }];
    const configForApi = { responseModalities: ['AUDIO' as const], speechConfig: speechConfigPayload };

    console.log("SERVER: TTS Request - Model:", GEMINI_MODEL_TTS);
    try {
        const model = ai.getGenerativeModel({ model: GEMINI_MODEL_TTS });
        const response = await model.generateContent({ contents: textualContents, generationConfig: configForApi as any });
        const typedResponse = response as GenerateContentResponse;
        const audioPart = typedResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('audio/')) as InlineDataPart | undefined;
        if (!audioPart?.inlineData?.data) throw new Error("No audio data received from TTS model.");
        return decodeBase64(audioPart.inlineData.data);
    } catch (error) {
        if (error instanceof Error) {
            console.error("SERVER: Error in generateAudioFromDialogue:", error.message);
            throw new Error(`TTS API Error: ${error.message}`);
        }
        console.error("SERVER: Error in generateAudioFromDialogue: Unknown error occurred");
        throw new Error(`TTS API Error: Unknown error occurred`);
    }
}

async function generateMCQQuestions(skill: SkillType, level: CEFRLevel, count: number): Promise<MultipleChoiceQuestionType[]> {
    if (!API_KEY) throw new Error("SERVER: GEMINI_API_KEY not configured.");
    let specificInstruction = "";
    if (skill === SkillType.VOCABULARY) {
        specificInstruction = "For vocabulary questions, do NOT ask the student to describe an image. All information needed to answer the question must be present in the question text and options. Focus on word meaning, usage in context, synonyms, or antonyms.";
    } else if (skill === SkillType.GRAMMAR) {
        specificInstruction = "For grammar questions, focus on common grammatical structures, tenses, prepositions, articles, or sentence construction appropriate for the CEFR level.";
    }
    const prompt = `You are an expert language assessment creator specializing in ${skill} for English learners. Generate ${count} multiple-choice ${skill.toLowerCase()} questions suitable for a CEFR ${level} English learner. ${specificInstruction} Ensure correct grammar and spelling in all generated text. The difficulty of the questions and vocabulary used must be appropriate for CEFR level ${level}.`;

    const generativeModel = ai.getGenerativeModel({ model: GEMINI_MODEL_TEXT, safetySettings });
    const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            ...generationConfigForTextModelsJSON,
            responseSchema: {
                type: GoogleGenType.OBJECT,
                properties: { questions: { type: GoogleGenType.ARRAY, items: {
                            type: GoogleGenType.OBJECT,
                            properties: {
                                questionText: { type: GoogleGenType.STRING },
                                options: { type: GoogleGenType.OBJECT, properties: { A: { type: GoogleGenType.STRING }, B: { type: GoogleGenType.STRING }, C: { type: GoogleGenType.STRING }, D: { type: GoogleGenType.STRING }}, required: ["A", "B", "C", "D"]},
                                correctAnswerKey: { type: GoogleGenType.STRING }
                            }, required: ["questionText", "options", "correctAnswerKey"]
                        }}}, required: ["questions"]
            }
        }
    });
    const payload = parseJsonFromGeminiResponse<GeneratedMCQPayload>(result.response.text());
    return payload.questions.map((item, index) => ({
        id: generateUniqueId(skill, level, index), skill, cefrLevel: level, questionText: item.questionText,
        options: Object.entries(item.options).map(([key, value]) => ({ id: key, text: value })),
        correctAnswerId: item.correctAnswerKey,
    }));
}

async function generateReadingTask(level: CEFRLevel): Promise<ReadingComprehensionTask[]> {
    if (!API_KEY) throw new Error("SERVER: GEMINI_API_KEY not configured.");
    const numSubQuestions = 2; // This variable is used in the prompt and response schema description.
    const prompt = `You are an expert language assessment creator. Generate 1 reading comprehension task for a CEFR ${level} English learner. The task consists of a reading passage and ${numSubQuestions} multiple-choice questions about the passage. Passage length guidelines: A1/A2: 80-120 words; B1: 120-180 words; B2: 180-240 words; C1/C2: 240-300 words. Ensure content is appropriate for the CEFR level and all text values are in English.`;

    const generativeModel = ai.getGenerativeModel({ model: GEMINI_MODEL_TEXT, safetySettings });
    const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{text: prompt }] }],
        generationConfig: {
            ...generationConfigForTextModelsJSON,
            responseSchema: {
                type: GoogleGenType.OBJECT,
                properties: {
                    passage: { type: GoogleGenType.STRING, description: "The reading passage." },
                    questions: { type: GoogleGenType.ARRAY, description: `Array of ${numSubQuestions} MCQ sub-questions.`, items: {
                            type: GoogleGenType.OBJECT,
                            properties: {
                                questionText: { type: GoogleGenType.STRING },
                                options: { type: GoogleGenType.OBJECT, properties: { A: { type: GoogleGenType.STRING }, B: { type: GoogleGenType.STRING }, C: { type: GoogleGenType.STRING }}, required: ["A", "B", "C"]},
                                correctAnswerKey: { type: GoogleGenType.STRING }
                            }, required: ["questionText", "options", "correctAnswerKey"]
                        }}
                }, required: ["passage", "questions"]
            }
        }
    });
    const payload = parseJsonFromGeminiResponse<GeneratedReadingTaskPayload>(result.response.text());
    const mainTaskId = generateUniqueId(SkillType.READING, level, 0);
    return [{
        id: mainTaskId, skill: SkillType.READING, cefrLevel: level,
        questionText: `Read the passage below and answer the questions that follow.`, passage: payload.passage,
        subQuestions: payload.questions.map((sq, index) => ({
            id: generateUniqueId(SkillType.READING, level, 0, index), skill: SkillType.READING, cefrLevel: level,
            questionText: sq.questionText, options: Object.entries(sq.options).map(([key, value]) => ({ id: key, text: value })),
            correctAnswerId: sq.correctAnswerKey,
        })),
    }];
}

async function generateListeningTask(level: CEFRLevel): Promise<ListeningComprehensionTask[]> {
    if (!API_KEY) throw new Error("SERVER: GEMINI_API_KEY not configured.");
    const numSubQuestions = 2;
    const [selectedVoice1, selectedVoice2] = selectDistinctVoicesForDialogue();
    const prompt = `You are an expert language assessment creator. Pre-selected voices: VOICE_INFO_1 (${selectedVoice1.gender}, name '${selectedVoice1.name}', characteristic '${selectedVoice1.characteristic}') and VOICE_INFO_2 (${selectedVoice2.gender}, name '${selectedVoice2.name}', characteristic '${selectedVoice2.characteristic}'). Generate 1 listening task for CEFR ${level} with a short dialogue (2-4 turns/speaker). Speakers in JSON lines must match characterAssignment names. Ensure natural dialogue for voices/level. All text in English.`;

    const generativeModel = ai.getGenerativeModel({ model: GEMINI_MODEL_TEXT, safetySettings });
    const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{text: prompt }] }],
        generationConfig: {
            ...generationConfigForTextModelsJSON,
            responseSchema: {
                type: GoogleGenType.OBJECT,
                properties: {
                    dialogueTitle: { type: GoogleGenType.STRING, nullable: true },
                    characterAssignment: { type: GoogleGenType.OBJECT, properties: {
                            character1_Name: { type: GoogleGenType.STRING }, character1_TTSVoiceName: { type: GoogleGenType.STRING, enum: [selectedVoice1.name] },
                            character2_Name: { type: GoogleGenType.STRING }, character2_TTSVoiceName: { type: GoogleGenType.STRING, enum: [selectedVoice2.name] }
                        }, required: ["character1_Name", "character1_TTSVoiceName", "character2_Name", "character2_TTSVoiceName"]},
                    lines: { type: GoogleGenType.ARRAY, items: {
                            type: GoogleGenType.OBJECT, properties: { speaker: { type: GoogleGenType.STRING }, line: { type: GoogleGenType.STRING }}, required: ["speaker", "line"]
                        }},
                    questions: { type: GoogleGenType.ARRAY, items: {
                            type: GoogleGenType.OBJECT, properties: {
                                questionText: { type: GoogleGenType.STRING },
                                options: { type: GoogleGenType.OBJECT, properties: { A: { type: GoogleGenType.STRING }, B: { type: GoogleGenType.STRING }, C: { type: GoogleGenType.STRING }}, required: ["A", "B", "C"]},
                                correctAnswerKey: { type: GoogleGenType.STRING }
                            }, required: ["questionText", "options", "correctAnswerKey"]
                        }}
                }, required: ["characterAssignment", "lines", "questions"]
            }
        }
    });
    const payload = parseJsonFromGeminiResponse<GeneratedListeningTaskPayload>(result.response.text());
    const mainTaskId = generateUniqueId(SkillType.LISTENING, level, 0);
    const speakerVoiceMap: { [scriptSpeakerName: string]: string } = {};
    speakerVoiceMap[payload.characterAssignment.character1_Name] = payload.characterAssignment.character1_TTSVoiceName;
    speakerVoiceMap[payload.characterAssignment.character2_Name] = payload.characterAssignment.character2_TTSVoiceName;
    payload.lines.forEach(line => {
        if (!speakerVoiceMap[line.speaker]) {
            console.warn(`SERVER: ListeningTask Speaker "${line.speaker}" not in charAssignment. Fallback.`);
            speakerVoiceMap[line.speaker] = line.speaker === payload.characterAssignment.character1_Name ? payload.characterAssignment.character1_TTSVoiceName : payload.characterAssignment.character2_TTSVoiceName;
        }
    });
    return [{
        id: mainTaskId, skill: SkillType.LISTENING, cefrLevel: level,
        questionText: `Listen to the dialogue${payload.dialogueTitle ? ` titled "${payload.dialogueTitle}"` : ""} and answer the questions.`,
        dialogueTitle: payload.dialogueTitle, dialogueLines: payload.lines, speakerVoiceMap: speakerVoiceMap,
        subQuestions: payload.questions.map((sq, index) => ({
            id: generateUniqueId(SkillType.LISTENING, level, 0, index), skill: SkillType.LISTENING, cefrLevel: level,
            questionText: sq.questionText, options: Object.entries(sq.options).map(([key, value]) => ({ id: key, text: value })),
            correctAnswerId: sq.correctAnswerKey,
        })),
    }];
}

async function generateWritingPrompt(level: CEFRLevel): Promise<WritingTask[]> {
    if (!API_KEY) throw new Error("SERVER: GEMINI_API_KEY not configured.");
    const prompt = `You are an expert language assessment creator. Generate 1 writing prompt for a CEFR ${level} English learner. The prompt should encourage text of appropriate length (A1/A2: 40-60 words; B1/B2: 80-120 words; C1/C2: 150-200 words). All text in English.`;
    const generativeModel = ai.getGenerativeModel({ model: GEMINI_MODEL_TEXT, safetySettings });
    const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{text: prompt }] }],
        generationConfig: {
            ...generationConfigForTextModelsJSON,
            responseSchema: {
                type: GoogleGenType.OBJECT,
                properties: {
                    prompt: { type: GoogleGenType.STRING }, taskDescription: { type: GoogleGenType.STRING }
                }, required: ["prompt", "taskDescription"]
            }
        }
    });
    const payload = parseJsonFromGeminiResponse<GeneratedWritingPromptPayload>(result.response.text());
    return [{
        id: generateUniqueId(SkillType.WRITING, level, 0), skill: SkillType.WRITING, cefrLevel: level,
        questionText: payload.prompt, taskDescription: payload.taskDescription,
    }];
}

async function generateSpeakingPrompt(level: CEFRLevel): Promise<SpeakingTask[]> {
    if (!API_KEY) throw new Error("SERVER: GEMINI_API_KEY not configured.");
    const prompt = `You are an expert language assessment creator. Generate 1 speaking prompt for a CEFR ${level} English learner. Encourage speech for an appropriate length (A1/A2: 30-60s; B1/B2: 1-2min; C1/C2: 2-3min). All text in English.`;
    const generativeModel = ai.getGenerativeModel({ model: GEMINI_MODEL_TEXT, safetySettings });
    const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{text: prompt }] }],
        generationConfig: {
            ...generationConfigForTextModelsJSON,
            responseSchema: {
                type: GoogleGenType.OBJECT,
                properties: {
                    prompt: { type: GoogleGenType.STRING },
                    taskDescription: { type: GoogleGenType.STRING, nullable: true }
                }, required: ["prompt"]
            }
        }
    });
    const payload = parseJsonFromGeminiResponse<GeneratedSpeakingPromptPayload>(result.response.text());
    return [{
        id: generateUniqueId(SkillType.SPEAKING, level, 0), skill: SkillType.SPEAKING, cefrLevel: level,
        questionText: payload.prompt, taskDescription: payload.taskDescription,
    }];
}

export async function generateQuestionsForSkill(skill: SkillType, level: CEFRLevel, countPerSkillConfig: typeof QUESTIONS_PER_SKILL): Promise<AnyQuestion[]> {
    const count = countPerSkillConfig[skill] || 1; // Default to 1 if not specified
    console.log(`SERVER: Generating ${count} question(s) for skill "${skill}" at level ${level}.`);
    switch (skill) {
        case SkillType.VOCABULARY: return generateMCQQuestions(SkillType.VOCABULARY, level, count);
        case SkillType.GRAMMAR: return generateMCQQuestions(SkillType.GRAMMAR, level, count);
        case SkillType.READING: return generateReadingTask(level);
        case SkillType.LISTENING: return generateListeningTask(level);
        case SkillType.WRITING: return generateWritingPrompt(level);
        case SkillType.SPEAKING: return generateSpeakingPrompt(level);
        default: console.error(`SERVER: Unsupported skill type: ${skill}`); return Promise.resolve([]);
    }
}

export async function assessStudentWriting(originalPromptText: string, studentText: string, level: CEFRLevel): Promise<WritingAssessmentPayload> {
    if (!API_KEY) throw new Error("SERVER: GEMINI_API_KEY not configured.");
    const prompt = `A student at CEFR level ${level} was given the writing prompt: "${originalPromptText}". Student response: "${studentText}". Assess based on grammar, vocabulary, task achievement, coherence, cohesion for CEFR ${level}. Provide constructive feedback.`;
    const generativeModel = ai.getGenerativeModel({ model: GEMINI_MODEL_TEXT, safetySettings });
    const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{text: prompt }] }],
        generationConfig: {
            ...generationConfigForTextModelsJSON,
            responseSchema: {
                type: GoogleGenType.OBJECT,
                properties: {
                    score: { type: GoogleGenType.NUMBER }, feedback: { type: GoogleGenType.STRING },
                    estimatedCefrLevel: { type: GoogleGenType.STRING }
                }, required: ["score", "feedback", "estimatedCefrLevel"]
            }
        }
    });
    return parseJsonFromGeminiResponse<WritingAssessmentPayload>(result.response.text());
}

export async function assessStudentSpeaking(speakingPromptText: string, audioBase64: string, audioMimeType: string, level: CEFRLevel): Promise<SpeakingAssessmentPayload> {
    if (!API_KEY) throw new Error("SERVER: GEMINI_API_KEY not configured.");
    const textPart = { text: `A student at CEFR level ${level} was given speaking prompt: "${speakingPromptText}". Their audio response is provided. Assess fluency, pronunciation, intonation, grammar, vocabulary, task fulfillment for CEFR ${level}.` };
    const audioPart = { inlineData: { mimeType: audioMimeType, data: audioBase64 } };

    const generativeModel = ai.getGenerativeModel({ model: GEMINI_MODEL_TEXT, safetySettings });
    const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [textPart, audioPart as Part] }],
        generationConfig: {
            ...generationConfigForTextModelsJSON,
            responseSchema: {
                type: GoogleGenType.OBJECT,
                properties: {
                    score: { type: GoogleGenType.NUMBER }, feedback: { type: GoogleGenType.STRING },
                    estimatedCefrLevel: { type: GoogleGenType.STRING }
                }, required: ["score", "feedback", "estimatedCefrLevel"]
            }
        }
    });
    return parseJsonFromGeminiResponse<SpeakingAssessmentPayload>(result.response.text());
}

const cefrOrder: CEFRLevel[] = [CEFRLevel.A1, CEFRLevel.A2, CEFRLevel.B1, CEFRLevel.B2, CEFRLevel.C1, CEFRLevel.C2];
function getBaseCefr(levelString: string): CEFRLevel | null {
    if (!levelString) return null;
    for (const level of cefrOrder) { if (levelString.toUpperCase().includes(level)) return level; }
    return null;
}

export async function generateComprehensiveReport(studentName: string, sectionResults: SectionResult[], assessedLevel: CEFRLevel): Promise<FinalReport> {
    if (!API_KEY) throw new Error("SERVER: GEMINI_API_KEY not configured.");
    const resultsSummary = sectionResults.map(sr => {
        let details = `Skill: ${sr.skill}, Score: ${sr.score !== undefined ? sr.score.toFixed(0) + '%' : 'N/A'}. `;
        if ((sr.skill === SkillType.WRITING || sr.skill === SkillType.SPEAKING) && sr.feedback) { details += `AI Feedback (English): "${sr.feedback}". `; }
        else if (sr.answers.length > 0 && sr.questions.length > 0) {
            const mainTaskOrQuestions = sr.questions[0];
            let actualGradableItemCount = sr.questions.length;
            if ((mainTaskOrQuestions.skill === SkillType.READING || mainTaskOrQuestions.skill === SkillType.LISTENING) && 'subQuestions' in mainTaskOrQuestions && Array.isArray(mainTaskOrQuestions.subQuestions)) {
                actualGradableItemCount = (mainTaskOrQuestions as ReadingComprehensionTask | ListeningComprehensionTask).subQuestions.length;
            }
            const correctAnswers = sr.answers.filter(a => a.isCorrect).length;
            if (actualGradableItemCount > 0) { details += `Correct answers: ${correctAnswers} out of ${actualGradableItemCount}. `; }
        }
        return details;
    }).join('\\n');
    const prompt = `A student named ${studentName} completed an assessment for CEFR level ${assessedLevel}. Performance summary: ${resultsSummary}. Generate a comprehensive report. Ensure *_pt fields are in Brazilian Portuguese. English text should be professional.`;

    const generativeModel = ai.getGenerativeModel({ model: GEMINI_MODEL_TEXT, safetySettings });
    const result = await generativeModel.generateContent({
        contents: [{ role: "user", parts: [{text: prompt }] }],
        generationConfig: {
            ...generationConfigForTextModelsJSON,
            responseSchema: {
                type: GoogleGenType.OBJECT,
                properties: {
                    overallEstimatedCefrLevel: { type: GoogleGenType.STRING },
                    skillSummaries: { type: GoogleGenType.ARRAY, items: {
                            type: GoogleGenType.OBJECT,
                            properties: {
                                skill: { type: GoogleGenType.STRING, enum: Object.values(SkillType) },
                                score: { type: GoogleGenType.NUMBER, nullable: true },
                                achievedLevel: { type: GoogleGenType.STRING, nullable: true },
                                strengths: { type: GoogleGenType.STRING }, strengths_pt: { type: GoogleGenType.STRING },
                                weaknesses: { type: GoogleGenType.STRING }, weaknesses_pt: { type: GoogleGenType.STRING },
                                recommendations: { type: GoogleGenType.STRING }, recommendations_pt: { type: GoogleGenType.STRING }
                            }, required: ["skill", "strengths", "strengths_pt", "weaknesses", "weaknesses_pt", "recommendations", "recommendations_pt"]
                        }},
                    detailedFeedback: { type: GoogleGenType.STRING },
                    detailedFeedback_pt: { type: GoogleGenType.STRING }
                }, required: ["overallEstimatedCefrLevel", "skillSummaries", "detailedFeedback", "detailedFeedback_pt"]
            }
        }
    });
    const payload = parseJsonFromGeminiResponse<FinalReportPayload>(result.response.text());
    let levelProgressionSuggestionPt = "";
    const assessedBaseLevel = getBaseCefr(assessedLevel);
    const estimatedBaseLevel = getBaseCefr(payload.overallEstimatedCefrLevel);
    const estimatedLevelDisplay = payload.overallEstimatedCefrLevel || "nível estimado";
    if (assessedBaseLevel && estimatedBaseLevel) {
        const assessedIdx = cefrOrder.indexOf(assessedBaseLevel);
        const estimatedIdx = cefrOrder.indexOf(estimatedBaseLevel);
        if (estimatedIdx > assessedIdx) { levelProgressionSuggestionPt = `Excelente desempenho! Com base nos seus resultados (avaliado como ${estimatedLevelDisplay}), sugerimos que você avance para o próximo nível (${cefrOrder[Math.min(estimatedIdx, cefrOrder.length -1)] || estimatedLevelDisplay}). Continue assim!`; }
        else if (estimatedIdx < assessedIdx) { const lowerLevelDisplay = cefrOrder[Math.max(estimatedIdx, 0)] || estimatedBaseLevel; levelProgressionSuggestionPt = `Seu desempenho (avaliado como ${estimatedLevelDisplay}) indica que pode ser benéfico revisar os tópicos do nível ${lowerLevelDisplay} ou focar em fortalecer as bases do nível ${assessedLevel} antes de tentar um nível mais avançado.`; }
        else {
            if (payload.overallEstimatedCefrLevel.toLowerCase().includes("high") || payload.overallEstimatedCefrLevel.toLowerCase().includes("upper") || payload.overallEstimatedCefrLevel.toLowerCase().includes("alto") || payload.overallEstimatedCefrLevel.toLowerCase().includes("superior")) { levelProgressionSuggestionPt = `Muito bom! Você está demonstrando um forte domínio do nível ${assessedBaseLevel} (avaliado como ${estimatedLevelDisplay}). Considere desafios adicionais neste nível ou prepare-se para avançar.`; }
            else if (payload.overallEstimatedCefrLevel.toLowerCase().includes("low") || payload.overallEstimatedCefrLevel.toLowerCase().includes("baixo")) { levelProgressionSuggestionPt = `Você está progredindo no nível ${assessedBaseLevel} (avaliado como ${estimatedLevelDisplay}). Continue praticando e focando nas áreas de melhoria para consolidar seu conhecimento neste nível.`; }
            else { levelProgressionSuggestionPt = `Você está operando consistentemente no nível ${assessedBaseLevel} (avaliado como ${estimatedLevelDisplay}). Continue fortalecendo suas habilidades e explore tópicos mais complexos dentro deste nível.`; }
        }
    } else { levelProgressionSuggestionPt = "Não foi possível determinar uma sugestão de progressão de nível com base na estimativa fornecida."; }

    return {
        studentName, assessedCefrLevel: assessedLevel, overallEstimatedCefrLevel: payload.overallEstimatedCefrLevel,
        skillSummaries: payload.skillSummaries.map(s => ({
            skill: s.skill as SkillType, score: s.score ?? undefined, achievedLevel: s.achievedLevel ?? undefined,
            strengths: s.strengths_pt || s.strengths, weaknesses: s.weaknesses_pt || s.weaknesses,
            recommendations: s.recommendations_pt || s.recommendations,
        })).filter(s => Object.values(SkillType).includes(s.skill as SkillType)),
        detailedFeedback: payload.detailedFeedback_pt || payload.detailedFeedback,
        levelProgressionSuggestion: levelProgressionSuggestionPt,
    };
}
