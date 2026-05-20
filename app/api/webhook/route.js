import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook inválido: ${err.message}` }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { error } = await supabase.from('profiles').update({
      is_premium: true,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
    }).eq('id', session.metadata.user_id);
    if (error) console.error('Erro ao ativar premium:', error.message);
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const { error } = await supabase.from('profiles')
      .update({ is_premium: false })
      .eq('stripe_subscription_id', sub.id);
    if (error) console.error('Erro ao desativar premium:', error.message);
  }

  return NextResponse.json({ received: true });
}
