# 💡 Biblioteca de Exemplos de Prompts

Exemplos práticos de prompts para testar e interagir com cada uma das ferramentas e recursos do **AI Agent 24/7**.

---

## 1. 🔍 Pesquisa & Navegação Web
- **Busca Web:**  
  `"Pesquise na web quais foram os principais lançamentos da NVIDIA na última conferência GTC e resuma em 3 pontos."`
- **Leitura de Página (Scraping):**  
  `"Acesse a página https://news.ycombinator.com e me diga quais são os 3 tópicos mais comentados de hoje."`
- **Navegação com Headless Browser (Playwright):**  
  `"Use o navegador headless para acessar o site https://quotes.toscrape.com e extrair as citações da página inicial."`

---

## 2. 🐙 Integração com GitHub
- **Listar Issues:**  
  `"Consulte as issues abertas no repositório octocat/Hello-World e liste os títulos e números."`
- **Obter detalhes de uma Issue:**  
  `"Mostre o conteúdo detalhado da issue #42 no repositório minha-empresa/meu-app."`
- **Criar uma nova Issue:**  
  `"Abra uma issue no repositório minha-empresa/meu-app com o título 'Bug no checkout' e a descrição 'O botão de pagamento não responde no Safari'."`

---

## 3. 📧 Gmail & 📅 Google Calendar
- **Buscar E-mails Recentes:**  
  `"Verifique se recebi algum e-mail não lido com o assunto 'Relatório Financeiro'."`
- **Enviar E-mail:**  
  `"Envie um e-mail para financeiro@empresa.com com o assunto 'Fatura Aprovada' e o texto 'Segue confirmação da fatura para pagamento'."`
- **Listar Eventos da Agenda:**  
  `"Quais são os meus próximos compromissos agendados no Google Calendar para esta semana?"`
- **Agendar Reunião:**  
  `"Agende uma reunião no Calendar chamada 'Alinhamento de Sprint' para 2026-10-15 das 14:00 às 15:00."`

---

## 4. 👁️ Visão Computacional (Multimodal)
- **Descrever Imagem:**  
  `"Analise a imagem https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg e descreva o que você vê."`
- **Extrair Informações de Diagrama:**  
  `"Analise este diagrama de arquitetura e me diga quais são os bancos de dados utilizados."`

---

## 5. 🎙️ Comandos de Voz (STT + TTS)
- **Processamento de Áudio:**  
  Envie um arquivo de áudio (MP3, WAV ou OGG) para o endpoint `POST /voice/chat`:
  - O áudio é transcrito automaticamente via Whisper.
  - O agente processa a mensagem e executa as ferramentas necessárias.
  - A resposta é sintetizada em áudio de volta junto com a transcrição.

---

## 6. 🚨 Gatilhos de Transbordo Humano (Human Handoff)
- **Português:**  
  - `"Quero meu reembolso imediatamente!"`
  - `"Gostaria de cancelar meu contrato agora."`
  - `"Vou abrir um processo judicial contra a empresa e chamar meu advogado."`
  - `"Por favor, transfira para um atendente humano."`
- **Inglês:**  
  - `"I want a full refund right now."`
  - `"Cancel my contract immediately."`
  - `"I want to talk to a human agent, not a bot."`
  - `"This is fraud, I am filing a lawsuit."`
