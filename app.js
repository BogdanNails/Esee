import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs';

const state = {
  essayText: '',
};

const apiKeyInput = document.getElementById('apiKey');
const pdfInput = document.getElementById('pdfInput');
const statusEl = document.getElementById('status');
const summarizeBtn = document.getElementById('summarizeBtn');
const summaryEl = document.getElementById('summary');
const flashcardsBtn = document.getElementById('flashcardsBtn');
const flashcardsEl = document.getElementById('flashcards');
const askBtn = document.getElementById('askBtn');
const questionInput = document.getElementById('question');
const chatEl = document.getElementById('chat');

pdfInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  statusEl.textContent = 'Procesez PDF-ul...';
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      text += `\n${pageText}`;
    }

    state.essayText = text.trim();

    if (!state.essayText) {
      statusEl.textContent = 'Nu am putut extrage text din PDF.';
      return;
    }

    statusEl.textContent = `PDF incarcat. Text extras: ~${state.essayText.length} caractere.`;
    summarizeBtn.disabled = false;
    flashcardsBtn.disabled = false;
    askBtn.disabled = false;
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'A aparut o eroare la procesarea PDF-ului.';
  }
});

summarizeBtn.addEventListener('click', () => {
  if (!state.essayText) return;
  summaryEl.textContent = buildLocalSummary(state.essayText);
});

flashcardsBtn.addEventListener('click', () => {
  if (!state.essayText) return;
  const cards = buildFlashcards(state.essayText);
  flashcardsEl.innerHTML = cards
    .map((card) => `<li><strong>${card.q}</strong><br/>${card.a}</li>`)
    .join('');
});

askBtn.addEventListener('click', async () => {
  const question = questionInput.value.trim();
  if (!question || !state.essayText) return;

  appendChat('Tu', question);
  questionInput.value = '';

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    appendChat(
      'Asistent',
      'Adauga o cheie OpenAI API pentru raspuns AI. Pana atunci poti folosi rezumatul si cardurile locale.'
    );
    return;
  }

  appendChat('Asistent', 'Se gandeste...');
  const loadingNode = chatEl.lastElementChild;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              'Esti profesor de limba romana. Explica simplu, pe pasi, cu exemple scurte, doar pe baza eseului oferit.',
          },
          {
            role: 'user',
            content: `Eseu:\n${state.essayText.slice(0, 15000)}\n\nIntrebare: ${question}`,
          },
        ],
      }),
    });

    const data = await response.json();
    const answer = data.output_text || 'Nu am putut genera un raspuns.';
    loadingNode.querySelector('.message').textContent = answer;
  } catch (error) {
    console.error(error);
    loadingNode.querySelector('.message').textContent = 'Eroare la apelul AI. Verifica API key.';
  }
});

function appendChat(role, message) {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-entry';

  const roleEl = document.createElement('div');
  roleEl.className = 'role';
  roleEl.textContent = role;

  const messageEl = document.createElement('div');
  messageEl.className = 'message';
  messageEl.textContent = message;

  wrapper.appendChild(roleEl);
  wrapper.appendChild(messageEl);
  chatEl.appendChild(wrapper);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function buildLocalSummary(text) {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const preview = sentences.slice(0, 5);
  return preview.length
    ? `Idei principale identificate:\n- ${preview.join('\n- ')}`
    : 'Textul este prea scurt pentru un rezumat.';
}

function buildFlashcards(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const fragments = cleaned.split(/[.!?]/).map((x) => x.trim()).filter((x) => x.length > 40);

  const selected = fragments.slice(0, 4);
  if (!selected.length) {
    return [{ q: 'Despre ce este eseul?', a: 'Textul este prea scurt pentru carduri automate.' }];
  }

  return selected.map((fragment, idx) => ({
    q: `Card ${idx + 1}: Ce idee transmite autorul aici?`,
    a: fragment,
  }));
}
