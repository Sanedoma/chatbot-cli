export async function askLLM(userMessage, currentProvider, history) {
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