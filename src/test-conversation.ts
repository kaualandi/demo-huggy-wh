import axios from 'axios';


// Teste da conversa - simula o fluxo completo
const testConversation = async () => {
  const baseUrl = 'http://localhost:3000';
  const chatId = 'test-chat-conversation';
  
  const conversationFlow = [
    'Oi Leonardo, tudo bem?',
    'Fico aliviada, mas preocupada também…',
    'E quando devo retornar?',
    'Pode sim, de preferência numa sexta.',
    'Está ótimo. Obrigada, Leonardo.'
  ];
  
  console.log('🧪 Iniciando teste de conversa...\n');
  
  for (let i = 0; i < conversationFlow.length; i++) {
    const message = conversationFlow[i];
    console.log(`👤 Paciente: ${message}`);
    
    try {
      const response = await axios.post(`${baseUrl}/test-conversation`, {
        message,
        chatId
      });
      
      if (response.data.success) {
        // Simular delay entre mensagens
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Resposta enviada com sucesso\n');
      } else {
        console.log('❌ Erro ao enviar resposta\n');
      }
    } catch (error: any) {
      console.log(`❌ Erro: ${error.message}\n`);
    }
  }
  
  console.log('🎉 Teste de conversa finalizado!');
  console.log('📄 Verifique os arquivos JSON gerados para ver o histórico');
};

// Executar teste se for chamado diretamente
if (require.main === module) {
  testConversation();
}

export { testConversation };
