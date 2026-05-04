export async function askLLM(currentProvider, history) {
    const response = await fetch(currentProvider.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentProvider.key}`
        },
        body: JSON.stringify({
            model: currentProvider.model,
            messages: history
        })
    });

    if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`Provider error: ${response.status} ${text}`);
    }

    const data = await response.json().catch(() => ({}));

    const reply = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';
    const tokens = data?.usage?.total_tokens || 0;

    return { reply, tokens };
}