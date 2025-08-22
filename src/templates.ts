// Templates para diferentes estágios da conversa
export const conversationTemplates = {
  greeting: {
    pattern: /^(oi|olá|ola|hello|hey)/i,
    context: "ESTÁGIO: ABERTURA - Responda ao cumprimento e inicie o protocolo de atendimento"
  },
  
  concern: {
    pattern: /(preocup|nervos|medo|ansios|assust)/i,
    context: "ESTÁGIO: TRANQUILIZAÇÃO - O paciente demonstrou preocupação. Priorize aspectos positivos e controláveis"
  },
  
  scheduling: {
    pattern: /(quando|retorn|agenda|consulta|marc)/i,
    context: "ESTÁGIO: AGENDAMENTO - Paciente interessado em agendar. Negocie data específica"
  },
  
  availability: {
    pattern: /(sexta|segunda|terça|quarta|quinta|sábado|domingo|manhã|tarde|pode)/i,
    context: "ESTÁGIO: NEGOCIAÇÃO DE DATA - Paciente indicou preferência. Confirme horário específico"
  },
  
  confirmation: {
    pattern: /(ok|certo|tudo bem|está bom|perfeito|pode ser)/i,
    context: "ESTÁGIO: CONFIRMAÇÃO - Paciente confirmou. Finalize o agendamento e encerre cordialmente"
  },
  
  thanks: {
    pattern: /(obrigad|valeu|muito bem|ótimo)/i,
    context: "ESTÁGIO: FINALIZAÇÃO - Paciente agradeceu. Responda cordialmente e finalize"
  }
};

export function getConversationStage(message: string): string {
  const messageLower = message.toLowerCase();
  
  for (const [stage, template] of Object.entries(conversationTemplates)) {
    if (template.pattern.test(messageLower)) {
      return template.context;
    }
  }
  
  return "ESTÁGIO: CONTINUAÇÃO - Continue seguindo o protocolo de atendimento";
}

export const responseGuidelines = {
  positive_first: "Sempre mencione aspectos positivos ANTES de qualquer preocupação",
  empathy: "Demonstre compreensão das preocupações do paciente",
  specific_scheduling: "Ofereça UMA data específica por vez, não liste opções",
  professional_tone: "Mantenha tom profissional mas humanizado",
  gradual_information: "Não forneça todas as informações de uma vez"
};
