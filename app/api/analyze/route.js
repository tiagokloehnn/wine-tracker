import { NextResponse } from 'next/server';

export async function POST(request) {
  const { imageData } = await request.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key não configurada.' }, { status: 500 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageData,
              }
            },
            {
              text: 'Analise esta imagem de vinho e responda APENAS em JSON (sem nenhum outro texto) com este formato: {"wine_name": "Nome do vinho", "wine_type": "Tipo (Tinto/Branco/Rosé/Espumante)", "region": "Região", "grape": "Variedade da uva", "confidence": "Alta/Média/Baixa"}. Se não for uma imagem de vinho, coloque null em wine_name.'
            }
          ]
        }]
      })
    }
  );

  if (!response.ok) {
    const erro = await response.text();
    console.error('Erro Gemini:', erro);
    return NextResponse.json({ error: erro }, { status: response.status });
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  let analysis;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    analysis = null;
  }

  return NextResponse.json({ analysis });
}
