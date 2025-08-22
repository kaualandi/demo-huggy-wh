require("dotenv").config();

import express from "express";
import axios from "axios";
import fs from "fs";

import { assistantContext } from "./context";
import { voistonApi } from "./config";
import { Exam } from "./types/exam";
import { getConversationStage } from "./templates";
import { clinicConfig, getPreferredSchedulingSlot } from "./clinic-config";



const app = express();
app.use(express.json());

const gptToken = process.env.GPT_TOKEN;
const huggyApiToken = process.env.HUGGY_TOKEN;
const companyId = process.env.COMPANY_ID;
const flowId = process.env.FLOW_ID;
const PORT = process.env.PORT || 3000;

/* doPost:
- Recebe os eventos do Webhook da Huggy e verifica se é um evento de mensagem recebida (receivedMessage).
- Chama a função 'manageCalls'para gerenciar as chamadas para o chat GPT e para a Huggy.
*/

app.get('/', (req, res) => {
  res.status(200).json({ status: true });
});

// Endpoint de teste para simular conversa
app.post('/test-conversation', async (req, res) => {
  const { message, chatId = 'test-chat-123' } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  try {
    const result = await manageCalls(message, chatId);
    res.json({ 
      success: result,
      message: 'Test conversation completed',
      chatId 
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Test failed', 
      details: error.message 
    });
  }
});

app.post('/webhook', async (req, res) => {
  const requestData = req.body;  
  console.log("Receive webhook", requestData?.messages?.receivedMessage?.length);
  
  if (requestData.messages && requestData.messages.receivedMessage) {
    requestData.messages.receivedMessage.forEach(async (message: any) => {
      const stepsDone = await manageCalls(message.body, message.chat.id, requestData);
      stepsDone === false 
        ? res.json(returnStatus('O chat não pertence a um flow mapeado, ou algum processo falhou.')) 
        : res.json(returnStatus('Sucesso na execução.'));
    });
  } else {
    res.status(400).json(returnStatus('Dados inválidos recebidos'));
  }
});

/* manageCalls:
- Chama a função 'variablesChecker', para saber se a mensagem do chat contém uma variável de contexto relativa ao fluxo mapeado. Caso a variável for identificada, aciona a API do Chat GPT enviando a mensagem como prompt.
- Recebe o retorno do ChatGPT com a resposta e faz a chamada para a API da Huggy, que vai disparar no chat a resposta que veio do GPT.
- Após disparar a mensagem no chat, chama a API da Huggy para executar o flow contendo o menu com mais opções (permitindo continuar interagindo com o ChatGPT ou finalizando a conversa).
- Se todos passos acima forem executados é retornado 'true', caso contrário é retornado 'false'.
 */

async function manageCalls(chatMessage: string, chatId: string, data?: unknown) {
  const monitoredFlow = await variablesChecker(chatId);
  if (!monitoredFlow) {
    console.log('Nenhuma operação será realizada, pois o flow não está mapeado.');
    return false;
  }

  console.log('data', data);
  
  const oldMessages = await getOldMessages(chatId);
  const exams: Exam[] = await getPatientExamsData(280398);
  if (!exams.length) {
    console.log('Nenhum exame encontrado para o paciente.');
    return;
  }

  const exam = exams[0];
  
  // Obter orientações específicas baseadas no tipo de exame
  const examGuidance = getExamSpecificGuidance(exam.Title, exam.ReportTranscript || '');
  
  // Formatar data do exame
  const examDate = new Date(exam.DateTaken);
  const formattedDate = examDate.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long'
  });

  // Estruturar dados do paciente para o contexto
  const patientData = `DADOS DO PACIENTE E EXAME:

Paciente: ${exam.PatientName || 'Paciente'}
Exames realizados: ${exam.Title}
Tipo de exame: ${exam.ExamTypeName || 'Exame oftalmológico'}
Data dos exames: ${formattedDate}
Médico responsável: ${clinicConfig.doctors.ophthalmologist.name}
Resultado/Diagnóstico: ${exam.ReportTranscript || 'Resultado do exame em análise'}

ORIENTAÇÕES MÉDICAS:
- Período para retorno: ${examGuidance.followUpPeriod}
- Tipo de acompanhamento: ${examGuidance.urgency}
- Recomendações: ${examGuidance.recommendations}

AGENDAMENTO DISPONÍVEL (negocie uma data por vez):
${clinicConfig.availableSlots.map(slot => 
  `- ${slot.dayOfWeek}, ${slot.date} às ${slot.time}`
).join('\n')}

EXEMPLO DE CONVERSA IDEAL:
Seja como o modelo de conversa fornecido - natural, empático, estruturado e eficiente.

INSTRUÇÃO ESPECIAL: Use estes dados para conduzir uma conversa natural e empática, seguindo rigorosamente o protocolo estabelecido.`;

  // save old messages in .json
  
  const url = 'https://api.openai.com/v1/chat/completions';
  const gptModel = 'gpt-3.5-turbo';
  const gptHeaders = {Authorization: `Bearer ${gptToken}`, 'Content-Type': 'application/json'}
  
  if (monitoredFlow === true) {
    // Verificar se é a primeira mensagem da conversa
    const isFirstMessage = oldMessages.length === 0;
    
    // Determinar o estágio da conversa baseado na mensagem do paciente
    const conversationStage = getConversationStage(chatMessage);
    
    const body = {
      model: gptModel,
      messages: [
        {
          role: 'system',
          content: assistantContext,
        },
        {
          role: 'system',
          content: patientData,
        },
        {
          role: 'system',
          content: `CONTEXTO DA CONVERSA: ${isFirstMessage ? 'Esta é a primeira mensagem. Inicie o atendimento seguindo o protocolo.' : 'Conversa em andamento. Continue seguindo o protocolo de atendimento.'}`
        },
        {
          role: 'system',
          content: conversationStage
        },
        ...oldMessages.reverse().map((msg: any) => ({
          role: msg.senderType === 'whatsapp-enterprise' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: 'user',
          content: chatMessage
        }
      ],
    };
    try {
      const response = await axios.post(url, body, {headers: gptHeaders});
      let allStepsPerformed = true;
      const gptMessage = extractMessage(JSON.stringify(response.data));
      
      // Verificar se a conversa chegou ao ponto de agendamento confirmado
      const isConversationComplete = gptMessage.toLowerCase().includes('qualquer coisa, estamos à disposição') ||
                                    gptMessage.toLowerCase().includes('agradecemos') ||
                                    gptMessage.toLowerCase().includes('confirmado');
      
      const messageAdded = await addMessageInChat(gptMessage, chatId);
      
      // Se a conversa foi concluída, salvar estado
      if (isConversationComplete) {
        const conversationSummary = {
          chatId,
          patientName: exam.PatientName,
          examType: exam.Title,
          conversationStatus: 'completed',
          timestamp: new Date().toISOString()
        };
        
        console.log(`Conversa concluída para o chat ${chatId}`);
      }

      return allStepsPerformed;
    } catch (error: any) {
      console.error('Error calling GPT:', error.response);
      return false;
    }
  } else {
    console.log('Nenhuma operação será realizada, pois o flow não está mapeado.');
    return false;
  }
}

/*variablesChecker:
Verifica se o chat possui uma variável de contexto correspondente ao flow que interage com o ChatGPT. Essa variável está presente no flow chamado de 'ChatGPT | Use como Flow de entrada'.
Detalhes em https://developers.huggy.io/pt/API/api-v3.html#get-chats-id-contextvariables
*/
async function variablesChecker(chatId: string) {
  try {
    const response = await axios.get(
      `https://api.huggy.app/v3/companies/${companyId}/chats/${chatId}/contextVariables`,
      {
        headers: {
          Authorization: `Bearer ${huggyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { contextVariables } = response.data;
    console.log({ contextVariables });
    
    if (contextVariables.nome === 'Kauã Landi') {
      return true;

    } else {
      return false;
    }
   
  } catch (error: any) {
    console.error('erro:', error.message);
    return false;
  }
}

/* addMessageInChat:
Adiciona a resposta do ChatGPT como mensagem no chat da Huggy. Detalhes em: https://developers.huggy.io/pt/API/api-v3.html#post-chats-id-messages
*/
async function addMessageInChat(chatMessage: string, chatId: string) {
  const data = {
    text: chatMessage
  };

  try {
    const response = await axios.post(
      `https://api.huggy.app/v3/companies/${companyId}/chats/${chatId}/messages/`,
      data,
      {
        headers: {
          Authorization: `Bearer ${huggyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return true;
  } catch (error: any) {
    console.error('Error sending message:', error.response);
    return false;
  }
}

/* getOldMessages:
Obtém as mensagens antigas de um chat específico para contexto da AI. Detalhes em: https://developers.huggy.io/pt/API/api-v3.html#get-chats-id-messages
*/
async function getOldMessages(chatId: string) {
  try {
    const response = await axios.get(
      `https://api.huggy.app/v3/companies/${companyId}/chats/${chatId}/messages/`,
      {
        headers: {
          Authorization: `Bearer ${huggyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error fetching old messages:', error.message);
    return [];
  }
}

async function getPatientExamsData(patientId: number) {
  try {
    const response = await voistonApi.get(`/Exam/List/ByPatient/${patientId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching patient data:', error.message);
    return [];
  }
}

// Função auxiliar para determinar orientações específicas baseadas no tipo de exame
function getExamSpecificGuidance(examTitle: string, result: string) {
  const examLower = examTitle.toLowerCase();
  const resultLower = result?.toLowerCase() || '';
  
  if (examLower.includes('oct') || examLower.includes('tomografia')) {
    if (resultLower.includes('dmri') || resultLower.includes('degeneração macular')) {
      return {
        followUpPeriod: 'três meses',
        urgency: 'preventivo',
        recommendations: 'suplementação com vitaminas específicas (fórmula AREDS 2) e controle dos fatores de risco'
      };
    }
  }
  
  if (examLower.includes('retinografia') || examLower.includes('fundo de olho')) {
    return {
      followUpPeriod: 'seis meses',
      urgency: 'acompanhamento regular',
      recommendations: 'monitoramento contínuo da saúde retiniana'
    };
  }
  
  // Padrão genérico
  return {
    followUpPeriod: 'três a seis meses',
    urgency: 'acompanhamento preventivo',
    recommendations: 'seguimento regular conforme orientação médica'
  };
}

/* triggerFlowMenu:
Dispara o flow de opções adicionais na conversa. É chamada logo após a mensagem do GPT ser disparada. Detalhes em: https://developers.huggy.io/pt/API/api-v3.html#post-chats-id-flow
*/
async function triggerFlowMenu(chatId: string, flowId: string) {
  let data = {
    "flowId": flowId
  };

  try {
    const response = await axios.post(
      `https://api.huggy.app/v3/companies/${companyId}/chats/${chatId}/flow/`,
      data,
      {
        headers: {
          Authorization: `Bearer ${huggyApiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return true;
  } catch (error: any) {
    console.error('Error triggering flow:', error.message);
    return false;
  }
}

function extractMessage(jsonString: string) {
  const data = JSON.parse(jsonString);
  const message = data.choices[0].message;
  return message.content;
}

function returnStatus(message: string) {
  const responseData = {
    status: message,
    timestamp: Date.now()
  };
  return responseData;
}

// Inicializar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

export default app;