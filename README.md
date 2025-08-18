<h1 align="center">Demo Huggy Webhook 👋</h1>
<p align="center">
<img alt="Versão" src="https://img.shields.io/badge/version-1.0-blue.svg?cacheSeconds=2592000" />
<img alt="Licença: APACHE 2.0" src="https://img.shields.io/badge/License-APACHE 2.0-yellow.svg" />
<img alt="made-with-node" src="https://img.shields.io/badge/Made%20with-node-1f425f.svg"/>
<img alt="made-with-typescript" src="https://img.shields.io/badge/Made%20with-TypeScript-3178c6.svg"/>

</p>

> Webhook para integração entre Huggy e ChatGPT usando Express.js e TypeScript.

## Instalação

```bash
git clone https://github.com/kaualandi/wa-bot-express.git
```

```bash
cd demo-huggy-wh
```

```bash
npm install
```

## Configuração

1. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

2. Preencha as variáveis de ambiente no arquivo `.env`:

```env
# Configurações da API do OpenAI
GPT_TOKEN=seu_token_do_openai_aqui

# Configurações da API da Huggy
HUGGY_TOKEN=seu_token_da_huggy_aqui
COMPANY_ID=seu_company_id_da_huggy_aqui
FLOW_ID=seu_flow_id_da_huggy_aqui

# Porta do servidor (opcional, padrão: 3000)
PORT=3000
```

### Descrição das variáveis:

- **GPT_TOKEN:** Token de autorização da API do OpenAI
- **HUGGY_TOKEN:** Token de autorização da API da Huggy
- **COMPANY_ID:** ID da empresa na Huggy
- **FLOW_ID:** ID do fluxo que será executado após a resposta do ChatGPT
- **PORT:** Porta onde o servidor será executado (padrão: 3000)

## Executando

### Desenvolvimento
```bash
npm start
```

### Produção
```bash
npm run start:prod
```

## Endpoint

### POST /webhook
Recebe eventos do webhook da Huggy e processa mensagens recebidas.

**Exemplo de payload:**
```json
{
  "messages": {
    "receivedMessage": [
      {
        "body": "Mensagem do usuário",
        "chat": {
          "id": "12345"
        }
      }
    ]
  }
}
```

## Funcionamento

1. O webhook recebe eventos da Huggy
2. Verifica se há mensagens recebidas (`receivedMessage`)
3. Para cada mensagem, verifica se o chat possui a variável de contexto `experimentar_gpt` com valor `'Testar o ChatGPT'`
4. Se a condição for atendida, envia a mensagem para o ChatGPT
5. Retorna a resposta do ChatGPT para o chat da Huggy
6. Executa um fluxo adicional com opções para o usuário

## Estrutura do Projeto

```
├── src/
│   └── app.ts          # Arquivo principal com o servidor Express
├── .env.example        # Exemplo de variáveis de ambiente
├── package.json        # Dependências e scripts
├── tsconfig.json       # Configuração do TypeScript
└── nodemon.json        # Configuração do nodemon
```

> Surgirão mais conforme a necessidade.

## Execução do Bot

```bash
npm start
```

Escaneie o QR Code como se estivesse conectando ao whatsapp web e dê _send_ na requisição.

> Não se esqueça de verificar se o multidevices (Multiplos Dispositivos) está ativado em seu whatsapp.
