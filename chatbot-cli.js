import 'dotenv/config';
import readline from 'node:readline';
import Stream from 'node:stream';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const history = [
  { role: 'system', content: 'tu es un assistant utile.' }
];

const PROVIDERS = {
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest'
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile'
  }
}

const MAX_HISTORY = 20;

let currentProvider = PROVIDERS.mistral;


function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}


async function compressHistory() {
  const conversation = history
    .slice(1)
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const response = await fetch(currentProvider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentProvider.key}`
    },
    body: JSON.stringify({
      model: currentProvider.model,
      messages: [
        {
          role: 'system',
          content: 'Résume cette conversation en 3 à 5 phrases. Garde les infos importantes.'
        },
        {
          role: 'user',
          content: conversation
        }
      ],
      temperature: 0.3
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function askLLM(userMessage) {
  history.push({ role: 'user', content: userMessage });

  const response = await fetch( currentProvider.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentProvider.key}`
    },
    body: JSON.stringify({
      model: currentProvider.model,
      stream: true,
      messages: history
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let fullContent = '';

  process.stdout.write(`IA [${currentProvider.model}]: `);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

    for (const line of lines) {
      const jsonStr = line.slice(6);

      if (jsonStr.trim() === '[DONE]') continue;

      try {
        const parsed = JSON.parse(jsonStr);
        const delta = parsed.choices[0]?.delta?.content;

        if (delta) {
          process.stdout.write(delta);
          fullContent += delta;
        }
      } catch {
        // ignore erreurs de parsing
      }
    }
  }

  process.stdout.write('\n\n');

  history.push({ role: 'assistant', content: fullContent });

  return fullContent;
}

async function translateLast(targetLanguage){
  const lastAssistant = [...history]
    .reverse()
    .find(m => m.role === 'assistant');

    if (!lastAssistant){
      console.log("Aucune réponse à traduire.");
      return;
    }

    const response = await fetch(currentProvider.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentProvider.key}`
      },
      body: JSON.stringify({
        model: currentProvider.model,
        messages: [
          {
            role: 'system',
            content: `Tu es un traducteur professionnel. Traduis le texte en ${targetLanguage}. Réponds uniquement avec la traduction.`
          },
          {
            role: 'user',
            content: lastAssistant.content
          }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
}

while (true) {
  const input = await question('Vous : ');
  if (input.startsWith('/provider ')) {
    const name = input.split(' ')[1];
    if (PROVIDERS[name]) {
      currentProvider = PROVIDERS[name];
      console.log('Provider changé :', name);
    }
    continue;
  }
  if (input === '/resume'){
    const resume = await compressHistory();
    console.log('IA-resume: ', resume);
    continue;
  }

  if(input.startsWith('/translate ')){
    const lang = input.split(' ')[1];

    const translated = await translateLast(lang);;

    if (translated) {
      console.log('\nTraduction : \n', translated, '\n');
    }

    continue;
  }

  await askLLM(input);

  if (history.length > MAX_HISTORY) {
    const summary = await compressHistory();

    history.splice(1, history.length - 1, {
      role: 'system',
      content: `Résumé de la conversation : ${summary}`
    });

    console.log('💡 Contexte compressé !');
  }
}