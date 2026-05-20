import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    const { imageData, mimeType } = await request.json();

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY não configurada no servidor.' }, { status: 500 });
    }

    let groqResponse;
    try {
      groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType || 'image/jpeg'};base64,${imageData}`,
                  },
                },
                {
                  type: 'text',
                  text: 'Analise esta imagem de vinho e responda APENAS em JSON (sem nenhum outro texto) com este formato: {"wine_name": "Nome do vinho", "wine_type": "Tipo (Tinto/Branco/Rosé/Espumante)", "region": "Região", "grape": "Variedade da uva", "confidence": "Alta/Média/Baixa", "description": "Apresentação do vinho em 2 a 3 frases em português: origem, características principais e uma curiosidade histórica ou cultural"}. Se não for uma imagem de vinho, coloque null em wine_name e null em description.',
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });
    } catch (erroRede) {
      return NextResponse.json({ error: `Falha de rede ao contatar o Groq: ${erroRede.message}` }, { status: 502 });
    }

    const respostaTexto = await groqResponse.text();

    if (!groqResponse.ok) {
      console.error('Erro Groq:', groqResponse.status, respostaTexto);
      return NextResponse.json(
        { error: `Groq retornou status ${groqResponse.status}: ${respostaTexto}` },
        { status: groqResponse.status }
      );
    }

    let data;
    try {
      data = JSON.parse(respostaTexto);
    } catch (erroJson) {
      return NextResponse.json(
        { error: `Resposta inválida do Groq: ${respostaTexto.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const text = data.choices?.[0]?.message?.content || '';

    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysis = null;
    }

    return NextResponse.json({ analysis });

  } catch (erroGeral) {
    console.error('Erro inesperado no handler:', erroGeral);
    return NextResponse.json(
      { error: `Erro interno no servidor: ${erroGeral.message}` },
      { status: 500 }
    );
  }
}
