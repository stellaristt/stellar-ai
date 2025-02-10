export class OllamaAPI {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  async chat(params: { model: string; messages: Array<{ role: string; content: string }> }) {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Membaca data streaming secara bertahap
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get reader from response body');

      let fullMessage = '';
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode chunk JSON dan pisahkan jika ada beberapa JSON dalam satu chunk
        const text = decoder.decode(value, { stream: true });
        const jsonStrings = text.split('\n').filter((line) => line.trim().length > 0);

        for (const jsonString of jsonStrings) {
          try {
            const data = JSON.parse(jsonString);
            if (data.message?.content) {
              fullMessage += data.message.content;
            }
            if (data.done) break;
          } catch (err) {
            console.error('Error parsing JSON:', err);
          }
        }
      }

      return { message: { content: fullMessage } };
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      throw error;
    }
  }
}
