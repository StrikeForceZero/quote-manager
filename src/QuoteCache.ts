import type {
    Guid,
    IQuote,
    TradingSymbol,
} from 'src/base';
import { entriesReverse } from 'src/util';

type SymbolPosObj = { symbol: TradingSymbol, pos: number };

export class QuoteCache {
    private readonly quoteSymbolPosMap = new Map<Guid, SymbolPosObj>();
    private readonly quotesBySymbol = new Map<TradingSymbol, IQuote[]>();

    private getOrInitializeQuoteArr(symbol: TradingSymbol): IQuote[] {
        let quotes: IQuote[] | undefined = this.quotesBySymbol.get(symbol);
        if (!quotes) {
            quotes = [];
            this.quotesBySymbol.set(symbol, quotes);
        }
        return quotes;
    }

    private getOrInitializeNestedQuotePosObj(quote: IQuote): SymbolPosObj {
        let symbolPosObj: SymbolPosObj | undefined = this.quoteSymbolPosMap.get(quote.Id);
        let quotesForSymbol = this.getOrInitializeQuoteArr(quote.Symbol);

        if (!symbolPosObj) {
            let newIndex = quotesForSymbol.length;
            // sort by price highest to lowest
            for (const [index, existingQuote] of entriesReverse(quotesForSymbol)) {
                // using > maintains FIFO on the "stack" sorted by price
                if (existingQuote.Price > quote.Price) {
                    break;
                }
                newIndex = index;
            }
            // shift all existing index markers after newIndex by one
            for (const [index, existingQuote] of entriesReverse(quotesForSymbol)) {
                if (index < newIndex) {
                    break;
                }
                const existingQuoteSymbolPosObj = this.quoteSymbolPosMap.get(existingQuote.Id)
                if (!existingQuoteSymbolPosObj) {
                    throw new Error('impossible');
                }
                existingQuoteSymbolPosObj.pos = index + 1;
            }
            // without directly benchmarking the performance from .splice(array.length, 0, quote) vs .push(quote)
            // we will assume this gives us a small but exponential performance gain
            // by splitting these paths into just pushing off the end versus splicing and reindexing the array
            if (quotesForSymbol.length === newIndex) {
                quotesForSymbol.push(quote);
            } else {
                quotesForSymbol.splice(newIndex, 0, quote);
            }
            symbolPosObj = {
                symbol: quote.Symbol,
                pos: newIndex,
            };
            this.quoteSymbolPosMap.set(quote.Id, symbolPosObj);
        }
        // used for updating existing quotes
        quotesForSymbol[symbolPosObj.pos] = quote;
        return symbolPosObj;
    }


    public addOrUpdateQuote(quote: IQuote): void {
        this.getOrInitializeNestedQuotePosObj(quote);
    }

    public removeQuotesBySymbol(symbol: TradingSymbol): void {
        const nestedMap = this.quotesBySymbol.get(symbol);
        if (!nestedMap) {
            return;
        }
        for (const quote of nestedMap.values()) {
            this.quoteSymbolPosMap.delete(quote.Id);
        }
        this.quotesBySymbol.delete(symbol);
    }

    private removeQuoteAndReIndexCache(quote: IQuote): void {
        const symbolPosObj = this.quoteSymbolPosMap.get(quote.Id);
        if (!symbolPosObj) {
            return;
        }
        const quotes = this.quotesBySymbol.get(quote.Symbol);
        if (!quotes) {
            return;
        }
        quotes.splice(symbolPosObj.pos, 1);
        // in the event we arent removing a quote that is considered the "best price" we might as well still iterate from lowest to highest price
        for (const [index, quote] of entriesReverse(quotes)) {
            if (index < symbolPosObj.pos) {
                break;
            }

            {
                const symbolPosObj = this.quoteSymbolPosMap.get(quote.Id);
                if (!symbolPosObj) {
                    throw new Error('impossible')
                }
                symbolPosObj.pos = index;
            }
        }
    }

    public removeQuote(quote: IQuote): void {
        const symbolPosObj = this.quoteSymbolPosMap.get(quote.Id);
        if (!symbolPosObj) {
            return;
        }
        const quotes = this.quotesBySymbol.get(quote.Symbol);
        if (!quotes) {
            return;
        }
        // without directly benchmarking the performance from .splice(array.length - 1, 1) vs .pop()
        // we will assume this gives us a small but exponential performance gain
        // by splitting these paths into just popping off the end versus splicing and reindexing the array
        if (quotes.length - 1 === symbolPosObj.pos) {
            quotes.pop();
        } else {
            this.removeQuoteAndReIndexCache(quote);
        }
        this.quoteSymbolPosMap.delete(quote.Id);
        // cleanup
        if (!quotes.length) {
            this.quotesBySymbol.delete(quote.Symbol);
        }
    }

    public removeQuoteById(id: Guid): void {
        const symbolPosObj = this.quoteSymbolPosMap.get(id);
        if (!symbolPosObj) {
            return;
        }
        const quotes = this.quotesBySymbol.get(symbolPosObj.symbol) ?? [];
        const quote = quotes[symbolPosObj.pos];
        if (!quote) {
            throw new Error('impossible');
        }
        this.removeQuote(quote);
    }

    public getAllQuotes(): IQuote[] {
        return Array.from(this.quotesBySymbol.values()).flat();
    }

    public getAllQuotesBySymbol(symbol: TradingSymbol): IQuote[] {
        return this.quotesBySymbol.get(symbol) ?? [];
    }
}
