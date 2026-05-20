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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_plan, cellar_partner_id')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_plan !== 'shared') {
      return NextResponse.json({ error: 'Plano Adega Compartilhada necessário.' }, { status: 403 });
    }
    if (profile.cellar_partner_id) {
      return NextResponse.json({ error: 'Você já tem um parceiro de adega.' }, { status: 409 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: existing } = await supabaseAdmin
      .from('shared_cellar_invites')
      .select('invite_token')
      .eq('owner_id', user.id)
      .single();

    const token = existing?.invite_token ?? null;
    let finalToken = token;

    if (!token) {
      const { data: created, error: createError } = await supabaseAdmin
        .from('shared_cellar_invites')
        .insert({ owner_id: user.id })
        .select('invite_token')
        .single();
      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
      finalToken = created.invite_token;
    }

    return NextResponse.json({ token: finalToken });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
