import { Card, Suit, CardRank } from '../../types/game';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export class Deck {
  static create(): Card[] {
    const deck: Card[] = [];

    for (const suit of SUITS) {
      for (const rank of RANKS) {
        let value: number;
        
        switch (rank) {
          case 'A': value = 1; break;
          case 'J': value = 11; break;
          case 'Q': value = 12; break;
          case 'K': value = 13; break;
          default: value = parseInt(rank, 10); break;
        }

        deck.push({ suit, rank, value });
      }
    }

    return deck;
  }

  static shuffle(deck: Card[]): Card[] {
    const shuffled = [...deck];
    // Fisher-Yates Shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static draw(deck: Card[], count: number = 1): { drawn: Card[]; remaining: Card[] } {
    if (count > deck.length) {
      throw new Error('Not enough cards in the deck');
    }

    return {
      drawn: deck.slice(0, count),
      remaining: deck.slice(count),
    };
  }
}
