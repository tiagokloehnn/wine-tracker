import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  premium: process.env.STRIPE_PRICE_ID_PREMIUM,
  shared: process.env.STRIPE_PRICE_ID_SHARED,
};

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

    const { plan } = await request.json();
    const priceId = PRICE_IDS[plan];
    if (!priceId) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: user.email,
      metadata: { user_id: user.id, plan },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}?payment=success`,
      cancel_url: `${appUrl}?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
