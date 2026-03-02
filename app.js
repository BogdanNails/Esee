import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs';

const state = { text: '' };

const pdfInput = document.getElementById('pdfInput');
const apiKeyInput = document.getElementById('apiKey');
const extractBtn = document.getElementById('extractBtn');
const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const summaryBtn = document.getElementById('summaryBtn');
const summaryEl = document.getElementById('summary');
const planBtn = document.getElementById('planBtn');
const planEl = document.getElementById('plan');
const mockBtn = document.getElementById('mockBtn');
const mockEl = document.getElementById('mock');
const askBtn = document.getElementById('askBtn');
const questionInput = document.getElementById('question');
const chatEl = document.getElementById('chat');

appendMessage('Asistent', 'Salut! Încarcă un PDF cu eseul tău și te ajut să îl înțelegi pas cu pas.');

extractBtn.addEventListener('click', async () => {
  const file = pdfInput.files?.[0];
  if (!file) {
    statusEl.textContent = 'Te rog selectează mai întâi un fișier PDF.';
    return;
  }

  statusEl.textContent = 'Procesez PDF-ul...';
  try {
    state.text = await extractPdfText(file);
    if (!state.text) throw new Error('Text gol');

    previewEl.textContent = state.text.slice(0, 2500) + (state.text.length > 2500 ? '\n\n...[trunchiat]' : '');
    statusEl.textContent = `Text extras cu succes (~${state.text.length} caractere).`;

    [summaryBtn, planBtn, mockBtn, askBtn].forEach((btn) => {
      btn.disabled = false;
    });
  } catch (error) {
    console.error(error);
    statusEl.textContent = 'Eroare la extragerea PDF. Încearcă alt fișier sau verifică formatul.';
  }
});

summaryBtn.addEventListener('click', () => {
  summaryEl.textContent = buildSummary(state.text);
});

planBtn.addEventListener('click', () => {
  const plan = buildStudyPlan(state.text);
  planEl.innerHTML = plan.map((step) => `<li>${step}</li>`).join('');
});

mockBtn.addEventListener('click', () => {
  mockEl.textContent = buildMockTest(state.text);
});

askBtn.addEventListener('click', async () => {
  const question = questionInput.value.trim();
  if (!question || !state.text) return;

  appendMessage('Tu', question);
  questionInput.value = '';

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    appendMessage('Asistent', 'Nu ai introdus cheia API. Pot răspunde local cu rezumat, plan și mock tests.');
    return;
  }

  const loading = appendMessage('Asistent', 'Gândesc un răspuns bun...');

  try {
    const aiReply = await askOpenAI(apiKey, question, state.text);
    loading.querySelector('span').textContent = aiReply;
  } catch (error) {
    console.error(error);
    loading.querySelector('span').textContent =
      'Nu am putut genera răspunsul AI. Verifică cheia API, soldul contului și încearcă din nou.';
  }
});

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let allText = '';

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    allText += `${pageText}\n`;
  }

  return allText.replace(/\s+/g, ' ').trim();
}

function buildSummary(text) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const key = sentences.slice(0, 6);
  if (!key.length) return 'Text prea scurt pentru rezumat.';
  return `Rezumat rapid:\n- ${key.join('\n- ')}`;
}

function buildStudyPlan(text) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const level = words > 1800 ? 'avansat' : words > 900 ? 'mediu' : 'rapid';

  return [
    `Pas 1 (${level}): Citește rezumatul și notează tema + mesajul central în 3 propoziții.`,
    'Pas 2: Identifică 3 idei principale și 2 citate/fragmente care le susțin.',
    'Pas 3: Separă elementele de structură: introducere, cuprins, concluzie.',
    'Pas 4: Exersează personajele/figurile de stil și rolul lor în argumentare.',
    'Pas 5: Răspunde la mock test fără ajutor, apoi verifică răspunsurile.',
    'Pas 6: Repetiție activă: explică eseul cu voce tare în 2-3 minute.',
  ];
}

function buildMockTest(text) {
  const sample = text.split(/(?<=[.!?])\s+/).slice(0, 8).join(' ');
  return [
    'Mock Test (10-15 min)',
    '',
    '1) Care este tema principală a eseului?',
    '2) Ce viziune despre lume transmite autorul?',
    '3) Menționează două argumente-cheie și explică-le.',
    '4) Identifică un element stilistic și rolul lui.',
    '5) Scrie o mini-concluzie (4-5 rânduri).',
    '',
    'Fragment util pentru recapitulare:',
    sample || 'Text insuficient pentru fragment.',
  ].join('\n');
}

async function askOpenAI(apiKey, question, essayText) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      input: [
        {
          role: 'system',
          content:
            'Ești mentor de limba română. Explică mereu pas cu pas, clar, cu structură: 1) idee pe scurt, 2) explicație simplă, 3) mini-exemplu, 4) verificare rapidă.',
        },
        {
          role: 'user',
          content: `Eseu:\n${essayText.slice(0, 18000)}\n\nÎntrebare utilizator: ${question}`,
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return extractOutputText(data);
}

function extractOutputText(data) {
  if (data.output_text && data.output_text.trim()) return data.output_text.trim();

  const parts = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) parts.push(content.text);
    }
  }

  return parts.join('\n').trim() || 'Modelul nu a returnat text.';
}

function appendMessage(role, text) {
  const box = document.createElement('div');
  box.className = 'msg';
  box.innerHTML = `<strong>${role}</strong><span>${escapeHtml(text)}</span>`;
  chatEl.appendChild(box);
  chatEl.scrollTop = chatEl.scrollHeight;
  return box;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
