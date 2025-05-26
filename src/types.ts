
/**
 * Defines the Common European Framework of Reference for Languages (CEFR) levels.
 */
export enum CEFRLevel {
  A1 = "A1",
  A2 = "A2",
  B1 = "B1",
  B2 = "B2",
  C1 = "C1",
  C2 = "C2",
}

/**
 * Defines the different language skills that can be assessed.
 */
export enum SkillType {
  VOCABULARY = "Vocabulary",
  GRAMMAR = "Grammar",
  READING = "Reading Comprehension",
  WRITING = "Writing",
  LISTENING = "Oral Comprehension",
  SPEAKING = "Speaking",
}

/**
 * Represents an option for a multiple-choice question.
 */
export interface QuestionOption {
  id: string; // e.g., 'A', 'B', 'C', 'D'
  text: string;
}

/**
 * Base interface for all question types.
 */
export interface BaseQuestion {
  id: string; // Unique ID, can be generated (e.g. skill-level-index)
  skill: SkillType;
  cefrLevel: CEFRLevel;
  questionText: string; // The main text of the question or prompt
}

/**
 * Represents a multiple-choice question.
 */
export interface MultipleChoiceQuestionType extends BaseQuestion {
  options: QuestionOption[];
  correctAnswerId: string; // id of the correct QuestionOption (e.g., 'A')
}

/**
 * Represents a fill-the-blank question.
 * This is currently implicitly handled by checking for `correctAnswer` and no `options`.
 */
export interface FillTheBlankQuestion extends BaseQuestion {
  correctAnswer: string;
}

/**
 * Represents a reading comprehension task, which includes a passage and sub-questions.
 */
export interface ReadingComprehensionTask extends BaseQuestion {
  passage: string;
  subQuestions: MultipleChoiceQuestionType[];
}

/**
 * Represents a writing task.
 */
export interface WritingTask extends BaseQuestion {
  taskDescription?: string; // e.g. "Write about 100 words."
}

/**
 * Represents a single line of dialogue in a listening task.
 */
export interface DialogueLine {
  speaker: string; // This will be the AI-generated character name (e.g., "Sarah")
  line: string;
}

/**
 * Represents a listening comprehension task, including dialogue and sub-questions.
 */
export interface ListeningComprehensionTask extends BaseQuestion {
  dialogueTitle?: string;
  dialogueLines: DialogueLine[];
  subQuestions: MultipleChoiceQuestionType[];
  /**
   * Maps AI-generated character names (from dialogueLines.speaker)
   * to specific TTS voice names (e.g., { "Sarah": "zephyr", "David": "puck" }).
   */
  speakerVoiceMap?: { [scriptSpeakerName: string]: string };
}

/**
 * Represents a speaking task.
 */
export interface SpeakingTask extends BaseQuestion {
  taskDescription?: string; // e.g., "Speak for about 1-2 minutes."
}

/**
 * A union type representing any possible question structure in the assessment.
 */
export type AnyQuestion =
  | MultipleChoiceQuestionType
  | FillTheBlankQuestion // Included for completeness, though often part of Reading/Listening
  | ReadingComprehensionTask
  | WritingTask
  | ListeningComprehensionTask
  | SpeakingTask;

/**
 * Represents a student's answer to a question.
 */
export interface StudentAnswer {
  questionId: string;
  answer: string | string[]; // string for most, could be array for future complex inputs. For speaking, this holds base64 audio.
  isCorrect?: boolean;
  feedback?: string;
  score?: number; // Primarily for Writing/Speaking
}

/**
 * Stores the results for a single skill section of the assessment.
 */
export interface SectionResult {
  skill: SkillType;
  questions: AnyQuestion[];
  answers: StudentAnswer[];
  score?: number; // Overall score for the section (percentage)
  feedback?: string; // Overall feedback for Writing/Speaking sections
}

/**
 * Represents the final comprehensive report generated after the assessment.
 */
export interface FinalReport {
  studentName: string;
  assessedCefrLevel: CEFRLevel; // The CEFR level the assessment was targeted for
  overallEstimatedCefrLevel: string; // AI's estimation of the student's overall level (e.g., "B1 Intermediate")
  skillSummaries: Array<{
    skill: SkillType;
    score?: number; // Percentage score for the skill
    achievedLevel?: string; // AI's estimated CEFR level for this specific skill (e.g., "B1+", "As targeted")
    strengths: string; // In Portuguese
    weaknesses: string; // In Portuguese
    recommendations: string; // In Portuguese
  }>;
  detailedFeedback: string; // Overall summary and next steps, in Portuguese
  levelProgressionSuggestion?: string; // Suggestion for next CEFR level, in Portuguese
}


// --- Types for Gemini API JSON responses (expected structures from AI) ---

/**
 * Expected structure for a single MCQ item from the AI.
 */
export interface GeneratedMCQItem {
    questionText: string;
    options: { [key: string]: string }; // e.g., { "A": "Option A", "B": "Option B" }
    correctAnswerKey: string; // e.g., "A"
}
/**
 * Expected payload for MCQ generation from the AI.
 */
export interface GeneratedMCQPayload {
    questions: GeneratedMCQItem[];
}

/**
 * Expected structure for a sub-question within a reading task from the AI.
 */
export interface GeneratedReadingSubQuestion {
    questionText: string;
    options: { [key: string]: string };
    correctAnswerKey: string;
}
/**
 * Expected payload for reading task generation from the AI.
 */
export interface GeneratedReadingTaskPayload {
    passage: string;
    questions: GeneratedReadingSubQuestion[];
}

/**
 * Expected payload for writing prompt generation from the AI.
 */
export interface GeneratedWritingPromptPayload {
    prompt: string;
    taskDescription: string;
}

/**
 * Expected structure for character voice assignment in listening task generation.
 */
export interface GeneratedListeningCharacterAssignment {
  character1_Name: string;
  character1_TTSVoiceName: string; // The pre-selected TTS voice name (e.g., "zephyr")
  character2_Name: string;
  character2_TTSVoiceName: string; // The pre-selected TTS voice name (e.g., "puck")
}

/**
 * Expected payload for listening task generation from the AI.
 */
export interface GeneratedListeningTaskPayload {
  dialogueTitle?: string;
  characterAssignment: GeneratedListeningCharacterAssignment;
  lines: DialogueLine[]; // `speaker` here will be character1_Name or character2_Name
  questions: GeneratedReadingSubQuestion[]; // Reusing reading sub-question structure
}

/**
 * Expected payload for speaking prompt generation from the AI.
 */
export interface GeneratedSpeakingPromptPayload {
    prompt: string;
    taskDescription?: string;
}

/**
 * Expected payload for writing assessment from the AI.
 */
export interface WritingAssessmentPayload {
    score: number; // 0-100
    feedback: string;
    estimatedCefrLevel: string; // e.g., "B1"
}

/**
 * Expected payload for speaking assessment from the AI.
 */
export interface SpeakingAssessmentPayload {
    score: number; // 0-100
    feedback: string;
    estimatedCefrLevel: string; // e.g., "B1"
}

/**
 * Expected structure for a single skill summary in the FinalReportPayload from the AI.
 */
export interface SkillSummaryPayload {
    skill: string; // AI returns string, will be cast to SkillType
    score?: number;
    achievedLevel?: string;
    strengths: string; // English
    strengths_pt: string; // Brazilian Portuguese
    weaknesses: string; // English
    weaknesses_pt: string; // Brazilian Portuguese
    recommendations: string; // English
    recommendations_pt: string; // Brazilian Portuguese
}

/**
 * Expected payload for the final comprehensive report from the AI.
 */
export interface FinalReportPayload {
    overallEstimatedCefrLevel: string; // e.g., "B1 Intermediate"
    skillSummaries: SkillSummaryPayload[];
    detailedFeedback: string; // English
    detailedFeedback_pt: string; // Brazilian Portuguese
}
