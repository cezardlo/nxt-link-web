// Merge plain chat messages with embedded offer cards into one
// chronologically-ordered thread (R4 "offer-in-chat"). Pure/framework-free —
// src/components/marketplace/useChatPolling.ts's ChatMessage and
// offerTimeline.ts's OfferCardView are combined here; the page components
// just map over the result.

import type { OfferCardView } from './offerTimeline';

export interface ThreadMessageLike {
  id: string;
  created_at: string;
}

export type ThreadItem<M extends ThreadMessageLike> =
  | { kind: 'message'; at: string; message: M }
  | { kind: 'offer'; at: string; offer: OfferCardView };

export function buildThreadTimeline<M extends ThreadMessageLike>(
  messages: M[],
  offers: OfferCardView[],
): ThreadItem<M>[] {
  const items: ThreadItem<M>[] = [
    ...messages.map((message): ThreadItem<M> => ({ kind: 'message', at: message.created_at, message })),
    ...offers.map((offer): ThreadItem<M> => ({ kind: 'offer', at: offer.at, offer })),
  ];
  items.sort((a, b) => a.at.localeCompare(b.at));
  return items;
}

/** The latest (most recent revision) offer card, if any — the pinned
 * tracker's "jump to latest offer" target always points here. */
export function latestOffer(offers: OfferCardView[]): OfferCardView | null {
  if (offers.length === 0) return null;
  return offers.reduce((latest, o) => (o.revision > latest.revision ? o : latest), offers[0]);
}
