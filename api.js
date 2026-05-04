import express from 'express';
import 'dotenv/config';
import { askLLM } from './features/LLM_fix.js';
import { compressHistory } from './features/resume.js';

const PROVIDERS = {
  mistral: {
    name: 'mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: process.env.MISTRAL_API_KEY,
    model: 'mistral-small-latest'
  },
  groq: {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    model: 'llama-3.3-70b-versatile'
  }
}

let currentProvider = PROVIDERS.groq;

const sessionHistory = [
  { role: 'system', content: 'Tu es un assistant utile.', }
];

const MAX_SESSION_HISTORY = 20;


const app = express();
app.use(express.json());

app.get('/chat', async(req, res) => {
    try {
        const userMessage = req.query.q;
        
        if(!userMessage){
            return res.status(400).json({ error: 'Paramètre q manquant' });
        }

          const provMessage = req.query.provider;

          const provider = provMessage && PROVIDERS[provMessage] ? PROVIDERS[provMessage] : currentProvider;
          currentProvider = provider;

          sessionHistory.push({ role: 'user', content: userMessage });

          if (sessionHistory.length > MAX_SESSION_HISTORY) {
            const resume = await compressHistory(sessionHistory, currentProvider);

            sessionHistory.splice(1, sessionHistory.length - 1, {
                role: 'system',
                content: `Résumé de la conversation: ${resume}` 
            });

          }

          const { reply, tokens } = await askLLM(provider, sessionHistory);

          sessionHistory.push({ role: 'assistant', content: reply });
        
        res.json({
            reply,
            provider: currentProvider.model,
            tokens
        });
    }catch (error){
        res.status(500).json({ error: error.message });
    }
});

app.delete('/history', (req, res) => {
  sessionHistory.splice(1); 

  res.json({ message: 'Historique réinitialisé' });
});

app.listen(3000, () => {
      console.log('Server lancer sur http://localhost:3000');
});