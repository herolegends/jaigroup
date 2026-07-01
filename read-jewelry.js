exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({error:'Method not allowed'}) };
  }

  try {
    const { imageBase64, mimeType } = JSON.parse(event.body);
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) throw new Error('API key not configured');

    const prompt = `Mira esta foto de una joya. En la esquina inferior derecha hay texto negro en negrita sobre fondo claro. Lee ese texto y responde SOLO con JSON:
{"categoria":"Argolla","referencia":"Z-287","peso":"2.09gr","medida":"30mm","grosor":"","recargo":"+4.5","codigo":""}
- categoria: Pulsera/Argolla/Cadena/Arete/Anillo (Z-XXX = Argolla)
- referencia: código completo
- peso: con gr
- medida: en cm o mm
- grosor: segundo mm si existe
- recargo: con +
- codigo: estilo si aparece (Figaro 060 etc)
SOLO el JSON, nada más.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.content[0].text.trim();
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('No JSON in response: ' + text);

    return { statusCode: 200, headers, body: match[0] };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
