import type Stripe from 'stripe'

type ProductPricing = {
  title: string
  priceCents: number
  currency: string
  stripePriceId?: string | null
}

export function buildLineItem(
  product: ProductPricing,
): Stripe.Checkout.SessionCreateParams.LineItem {
  if (product.stripePriceId) {
    return { price: product.stripePriceId, quantity: 1 }
  }
  return {
    price_data: {
      currency: product.currency,
      unit_amount: product.priceCents,
      product_data: { name: product.title },
    },
    quantity: 1,
  }
}
