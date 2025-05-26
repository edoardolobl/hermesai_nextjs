
/**
 * Brazilian Portuguese (pt-BR) translations for the application UI.
 */
export const ptTranslations = {
  // App.tsx
  loading_please_wait: "Carregando, por favor aguarde...",
  error_occurred_title: "Ocorreu um Erro",
  error_failed_to_load_questions: (skill: string) => `Falha ao carregar as perguntas para ${skill}. Verifique sua chave de API e conexão de rede, depois tente atualizar.`,
  error_processing_answers: (skill: string) => `Ocorreu um erro ao processar suas respostas para ${skill}. Por favor, tente novamente.`,
  try_again: "Tentar Novamente",

  // WelcomeScreen.tsx
  welcome_title: "Bem-vindo(a) à Avaliação de Idiomas",
  welcome_subtitle: "Esta avaliação testará suas habilidades em Vocabulário, Gramática, Leitura, Audição, Escrita e Fala. As perguntas e o feedback são gerados por IA. Por favor, responda o melhor que puder.",
  your_name_label: "Seu Nome",
  your_name_placeholder: "Digite seu nome",
  target_cefr_level_label: "Nível CEFR Alvo para Avaliação",
  start_assessment_button: "Iniciar Avaliação",

  // AssessmentView.tsx
  assessment_title_suffix: "Avaliação de", // e.g., "Avaliação de Vocabulário"
  student_label: "Estudante",
  target_level_label: "Nível Alvo",
  reading_passage_title: "Trecho de Leitura",
  listening_dialogue_title: "Diálogo de Audição",
  play_dialogue_button: "Reproduzir Diálogo",
  stop_dialogue_button: "Parar Diálogo",
  loading_audio_button: "Carregando Áudio...",
  audio_error_prefix: "Erro de Áudio",
  no_dialogue_available: "Nenhum diálogo disponível para reproduzir.",
  failed_to_initialize_audio: "Falha ao inicializar a reprodução de áudio. Seu navegador pode não suportá-lo ou ocorreu um erro.",
  could_not_resume_audio: "Não foi possível resumir o áudio. Por favor, interaja com a página (ex: clique em um botão) e tente novamente.",
  audio_context_not_ready: "Contexto de áudio não está pronto para reprodução após a geração do áudio.",
  no_audio_data_received: "Nenhum dado de áudio recebido do modelo TTS. A resposta pode não conter a parte de áudio esperada.",
  start_recording_button: "Iniciar Gravação",
  stop_recording_button: "Parar Gravação",
  playback_button: "Reproduzir",
  playing_button: "Reproduzindo...",
  rerecord_button: "Gravar Novamente",
  recording_in_progress_message: "Gravação em andamento...",
  audio_recorded_success_message: "Áudio gravado com sucesso. Pronto para reproduzir ou enviar.",
  click_start_recording_message: "Clique em 'Iniciar Gravação' para gravar sua resposta.",
  next_question_button: "Próxima Pergunta",
  submit_section_button: "Enviar Seção",
  recording_format_not_supported_error: (format: string) => `Formato de gravação (${format}) não é suportado por este navegador. Tente um navegador diferente como Chrome ou Firefox.`,
  microphone_permission_denied_error: "Permissão do microfone negada. Por favor, habilite nas configurações do seu navegador e atualize a página.",
  no_microphone_found_error: "Nenhum microfone encontrado. Por favor, conecte um microfone e atualize a página.",
  could_not_start_recording_error: (message: string) => `Não foi possível iniciar a gravação: ${message}`,
  error_playing_recorded_audio: (message: string) => `Não foi possível reproduzir o áudio gravado: ${message}. O arquivo pode estar corrompido ou não suportado.`,
  error_playing_recorded_audio_generic: "Erro ao reproduzir áudio gravado. O arquivo pode estar corrompido ou o formato não é suportado pelo seu navegador.",
  no_audio_data_captured_error: "Nenhum dado de áudio foi capturado. A gravação pode ter sido muito curta ou ocorreu um problema.",
  failed_to_process_recorded_audio_blob_error: "Falha ao processar os dados de áudio gravados (criação do Blob).",
  failed_to_create_playable_url_error: "Falha ao criar uma URL reproduzível para o áudio gravado.",
  failed_to_process_audio_for_submission_error: "Falha ao processar áudio para envio. Por favor, tente gravar novamente.",
  recording_stopped_submit_again_warning: "A gravação estava em andamento. Ela foi interrompida. Tente enviar novamente assim que o processamento for concluído.",
  your_response_label: "Sua Resposta:",
  no_questions_available: "Nenhuma pergunta disponível para esta seção.",
  loading_questions_for_skill: (skill: string) => `Carregando perguntas para ${skill}...`,


  // ReportView.tsx
  assessment_report_title: "Relatório de Avaliação",
  overall_estimated_cefr_level_label: "Nível CEFR Geral Estimado",
  skill_breakdown_title: "Detalhamento por Habilidade:",
  strengths_label: "Pontos Fortes:",
  weaknesses_label: "Pontos Fracos:",
  recommendations_label: "Recomendações:",
  overall_feedback_next_steps_title: "Feedback Geral & Próximos Passos:",
  level_progression_suggestion_title: "Sugestão de Progressão de Nível:",
  start_new_assessment_button: "Iniciar Nova Avaliação",
  not_applicable_short: "N/A", // For strengths, weaknesses if empty
  as_targeted_level: "Conforme o alvo", // For achievedLevel if not specifically different

  // QuestionCard.tsx
  question_count_of_total: (current: number, total: number) => `Pergunta ${current} de ${total}`,
  interactive_component_not_available: "Componente interativo para este tipo de pergunta não está disponível.",
  reading_passage_card_title: "Trecho de Leitura:", // Used in QuestionCard if displaying main task directly
  answer_placeholder: "Sua resposta aqui",
  writing_response_placeholder: "Digite sua resposta aqui...",

  // Button.tsx
  button_loading_text_default: "Carregando...",

  // Header.tsx
  header_subtitle: "Avaliação de Proficiência Linguística com IA",

  // Footer.tsx
  footer_copyright: (year: number) => `© ${year} Hermes AI. Todos os direitos reservados.`, // Updated "CEFR Language Assessor" to "Hermes AI"

  // SkillType translations
  skill_vocabulary: "Vocabulário",
  skill_grammar: "Gramática",
  skill_reading_comprehension: "Interpretação de Texto",
  skill_writing: "Escrita",
  skill_oral_comprehension: "Compreensão Oral",
  skill_speaking: "Fala",

  // CEFR Levels (Optional, if you need to display them translated)
  cefr_a1: "A1",
  cefr_a2: "A2",
  cefr_b1: "B1",
  cefr_b2: "B2",
  cefr_c1: "C1",
  cefr_c2: "C2",
};
