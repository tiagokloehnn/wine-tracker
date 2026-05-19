import { NextResponse } from 'next/server';

export async function POST(request) {
  const { imageData, mimeType } = await request.json();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada no servidor.' }, { status: 500 });
  }

  let geminiResponse;
  try {
    geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: imageData,
                },
              },
              {
                text: 'Analise esta imagem de vinho e responda APENAS em JSON (sem nenhum outro texto) com este formato: {"wine_name": "Nome do vinho", "wine_type": "Tipo (Tinto/Branco/Rosé/Espumante)", "region": "Região", "grape": "Variedade da uva", "confidence": "Alta/Média/Baixa"}. Se não for uma imagem de vinho, coloque null em wine_name.',
              },
            ],
          }],
        }),
      }
    );
  } catch (erroRede) {
    return NextResponse.json({ error: `Falha de rede ao contatar o Gemini: ${erroRede.message}` }, { status: 502 });
  }

  const respostaTexto = await geminiResponse.text();

  if (!geminiResponse.ok) {
    console.error('Erro Gemini:', geminiResponse.status, respostaTexto);
    return NextResponse.json(
      { error: `Gemini retornou status ${geminiResponse.status}: ${respostaTexto}` },
      { status: geminiResponse.status }
    );
  }

  const data = JSON.parse(respostaTexto);
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
