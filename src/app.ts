import express from "express";
import axios from "axios";
import fs from "fs";

import { assistantContext } from "./context";


require("dotenv").config();

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

app.post('/webhook', async (req, res) => {
  const requestData = req.body;
  console.log(requestData);
  

  if (requestData.messages && requestData.messages.receivedMessage) {
    requestData.messages.receivedMessage.forEach(async (message: any) => {
      const stepsDone = await manageCalls(message.body, message.chat.id);
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

async function manageCalls(chatMessage: string, chatId: string) {
  const monitoredFlow = await variablesChecker(chatId);
  const oldMessages = await getOldMessages(chatId);
  // save old messages in .json
  fs.writeFileSync(`./${chatId}.json`, JSON.stringify(oldMessages));
  const url = 'https://api.openai.com/v1/chat/completions';
  const gptModel = 'gpt-3.5-turbo';
  const gptHeaders = {Authorization: `Bearer ${gptToken}`, 'Content-Type': 'application/json'}
  
  if (monitoredFlow === true) {
    const body = {
      model: gptModel,
      messages: [
        {
          role: 'system',
          content: assistantContext,
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
      const messageAdded = await addMessageInChat(extractMessage(JSON.stringify(response.data)), chatId);
      // const flowTriggered = flowId ? await triggerFlowMenu(chatId, flowId) : false;

      // messageAdded === false || flowTriggered === false ? allStepsPerformed = false : allStepsPerformed = true;

      return (allStepsPerformed);
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

    console.error('Error sending message:', error.message);
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