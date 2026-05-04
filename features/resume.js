export async function compressHistory(history, currentProvider) {
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