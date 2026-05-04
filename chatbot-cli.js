import 'dotenv/config';
import readline from 'node:readline';
import Stream from 'node:stream';
import { translateLast } from './features/translate.js';
import { askLLM } from './features/LLM_stream.js';
import { compressHistory } from './features/resume.js';

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
    const resume = await compressHistory(history, currentProvider);
    console.log('IA-resume: ', resume);
    continue;
  }

  if(input.startsWith('/translate ')){
    const lang = input.split(' ')[1];

    const translated = await translateLast(lang, currentProvider);

    if (translated) {
      console.log('\nTraduction : \n', translated, '\n');
    }

    continue;
  }

  await askLLM(input, currentProvider, history);

  if (history.length > MAX_HISTORY) {
    const summary = await compressHistory(history, currentProvider);

    history.splice(1, history.length - 1, {
      role: 'system',
      content: `Résumé de la conversation : ${summary}`
    });

    console.log('💡 Contexte compressé !');
  }
}