import type { IQuote } from 'src/base';

export class QuoteUtil {
    // this could be a method on Quote, but since IQuote does not guarantee its existence we went from OOP to functional to satisfy the types
    public static isQuoteExpired(quote: IQuote): boolean {
        return quote.ExpirationDate.getTime() <= Date.now();
    }

    public static compareQuoteVolume(quoteA: IQuote, quoteB: IQuote): -1 | 0 | 1  {
        if (quoteA.AvailableVolume < quoteB.AvailableVolume) {
            return -1;
        }
        if (quoteA.AvailableVolume === quoteB.AvailableVolume) {
            return 0;
        }
        if (quoteA.AvailableVolume > quoteB.AvailableVolume) {
            return 1;
        }
        throw new Error('impossible');
    }

    public static compareQuotePrice(quoteA: IQuote, quoteB: IQuote): -1 | 0 | 1  {
        if (quoteA.Price < quoteB.Price) {
            return -1;
        }
        if (quoteA.Price === quoteB.Price) {
            return 0;
        }
        if (quoteA.Price > quoteB.Price) {
            return 1;
        }
        throw new Error('impossible');
    }
}
