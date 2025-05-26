import { CEFRLevel, SkillType } from '@/types';

/**
 * @constant GEMINI_MODEL_TEXT
 * @description The specific Gemini model identifier recommended for general text generation,
 * multimodal capabilities (if applicable in the future), and tasks requiring JSON mode output.
 */
export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-05-20'; // Recommended model for general text, multimodal capabilities, and JSON mode.

/**
 * @constant GEMINI_MODEL_TTS
 * @description The specific Gemini model identifier used for Text-to-Speech (TTS) generation.
 */
export const GEMINI_MODEL_TTS = 'gemini-2.5-flash-preview-tts';    // Model for Text-to-Speech generation.

/**
 * @constant DEFAULT_CEFR_LEVEL
 * @description The default Common European Framework of Reference for Languages (CEFR) level
 * used for language assessments if no specific level is provided.
 * @see CEFRLevel
 */
export const DEFAULT_CEFR_LEVEL = CEFRLevel.B1;

/**
 * @constant CEFR_LEVELS_OPTIONS
 * @description An array containing all available CEFR levels defined in the `CEFRLevel` enum.
 * This is typically used for populating selection UI elements.
 * @see CEFRLevel
 */
export const CEFR_LEVELS_OPTIONS = Object.values(CEFRLevel);

/**
 * @constant SKILLS_ORDER
 * @description Defines the specific order in which different language skills are assessed
 * within the application. This ensures a consistent assessment flow.
 * @type {SkillType[]}
 * @see SkillType
 */
export const SKILLS_ORDER: SkillType[] = [
  SkillType.VOCABULARY,
  SkillType.GRAMMAR,
  SkillType.READING,
  SkillType.LISTENING,
  SkillType.WRITING,
  SkillType.SPEAKING,
];

/**
 * @constant QUESTIONS_PER_SKILL
 * @description An object that maps each `SkillType` to the number of questions or tasks
 * to be generated for that skill during an assessment.
 * For `SkillType.READING` and `SkillType.LISTENING`, this usually means one main task
 * (e.g., a passage or dialogue) which then contains its own sub-questions (typically 2-3,
 * as defined in the service prompts).
 * @type {{ [key in SkillType]?: number }}
 * @see SkillType
 */
export const QUESTIONS_PER_SKILL: { [key in SkillType]?: number } = {
  [SkillType.VOCABULARY]: 3,    // Number of individual MCQs
  [SkillType.GRAMMAR]: 3,       // Number of individual MCQs
  [SkillType.READING]: 1,       // 1 passage task
  [SkillType.LISTENING]: 1,     // 1 dialogue task
  [SkillType.WRITING]: 1,       // 1 writing prompt
  [SkillType.SPEAKING]: 1,      // 1 speaking prompt
};

/**
 * @constant APP_TITLE
 * @description The title of the application. Currently "Hermes AI".
 */
export const APP_TITLE = "Hermes AI";

/**
 * @constant AUDIO_SAMPLE_RATE
 * @description The standard audio sample rate in Hertz (Hz) used for Text-to-Speech (TTS) generation
 * and potentially for audio recording. This value is chosen for compatibility with Gemini TTS.
 */
export const AUDIO_SAMPLE_RATE = 24000; // Standard sample rate supported by Gemini TTS.

/**
 * @constant RECORDING_MIME_TYPE
 * @description The preferred MIME type to be used with the `MediaRecorder` API for audio recordings.
 * 'audio/webm;codecs=opus' is chosen for its broad browser compatibility and good audio quality.
 */
export const RECORDING_MIME_TYPE = 'audio/webm;codecs=opus'; // Preferred MIME type for MediaRecorder for broad compatibility and quality.