export async function translateLast(targetLanguage, currentProvider){
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