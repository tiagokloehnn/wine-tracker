import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: 'Token de convite inválido.' }, { status: 400 });
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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('shared_cellar_invites')
      .select('owner_id, status')
      .eq('invite_token', token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Convite não encontrado ou expirado.' }, { status: 404 });
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Este convite já foi utilizado.' }, { status: 409 });
    }
    if (invite.owner_id === user.id) {
      return NextResponse.json({ error: 'Você não pode aceitar seu próprio convite.' }, { status: 400 });
    }

    const { data: inviteeProfile } = await supabaseAdmin
      .from('profiles')
      .select('cellar_partner_id')
      .eq('id', user.id)
      .single();

    if (inviteeProfile?.cellar_partner_id) {
      return NextResponse.json({ error: 'Você já faz parte de uma adega compartilhada.' }, { status: 409 });
    }

    await supabaseAdmin.from('profiles')
      .update({ cellar_partner_id: user.id })
      .eq('id', invite.owner_id);

    await supabaseAdmin.from('profiles')
      .update({ cellar_partner_id: invite.owner_id })
      .eq('id', user.id);

    await supabaseAdmin.from('shared_cellar_invites')
      .update({ status: 'accepted' })
      .eq('invite_token', token);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
