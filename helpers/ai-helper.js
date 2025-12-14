class AIHelper {
    constructor(model = 'llama3.2') {
        this.baseUrl = 'http://localhost:11434/api/generate';
        this.model = model;
    }

    async analyzeError(testCode, errorMessage) {
        const prompt = `
      You are a QA Automation Expert using Playwright.
      Analyze the following test failure:
      
      CODE:
      ${testCode}
      
      ERROR:
      ${errorMessage}
      
      Explain why it failed and suggest a fix. Be concise.
    `;

        return this._queryOllama(prompt);
    }

    async suggestSelector(badSelector) {
        const prompt = `
      The selector "${badSelector}" failed in a Playwright test.
      Suggest 3 alternative robust selectors (CSS or XPath) for this element.
      Return ONLY the selectors as a list.
    `;

        return this._queryOllama(prompt);
    }

    async _queryOllama(prompt) {
        try {
            // Ensure a fetch implementation is available (Node 18+ has global fetch).
            const fetchFn = (typeof fetch !== 'undefined')
                ? fetch
                : (await import('node-fetch')).default;

            const response = await fetchFn(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false
                }),
                // give a reasonable timeout via AbortController if available
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(`Ollama API Error: ${response.status} ${response.statusText} - ${text}`);
            }

            const data = await response.json().catch(() => null);
            // Flexible parsing for different Ollama response shapes
            if (!data) return 'AI Analysis Unavailable (empty response)';

            // Common possible fields: 'response', 'text', 'results', 'choices'
            if (typeof data.response === 'string') return data.response;
            if (typeof data.text === 'string') return data.text;
            if (Array.isArray(data.results) && data.results[0] && data.results[0].content) {
                // results -> [{ content: [{ type: 'output_text', text: '...' }] }]
                const r = data.results[0].content.find(c => c.type === 'output_text' || c.type === 'output');
                if (r && r.text) return r.text;
            }
            if (Array.isArray(data.choices) && data.choices[0]) {
                // choices -> [{ content: { text: '...' } }] or [{message: {content: [{text}]}}]
                const ch = data.choices[0];
                if (ch.content && typeof ch.content.text === 'string') return ch.content.text;
                if (ch.message && Array.isArray(ch.message.content) && ch.message.content[0] && ch.message.content[0].text) return ch.message.content[0].text;
            }

            // Fallback: stringify whole payload for debugging
            return JSON.stringify(data);
        } catch (error) {
            console.error('AI Helper Error:', error && error.message ? error.message : error);
            return `AI Analysis Unavailable (${error && error.message ? error.message : 'unknown error'})`;
        }
    }
}

module.exports = new AIHelper();
