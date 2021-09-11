import type {
    Guid,
    IQuote,
    TradingSymbol,
} from 'src/base';

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
            let newIndex = 0;
            // sort by price lowest to highest
            for (const [index, existingQuote] of quotesForSymbol.entries()) {
                // using > maintains FIFO
                if (existingQuote.Price > quote.Price) {
                    break;
                }
                newIndex = index + 1;
            }
            // shift all existing index markers after newIndex by one
            for (const [index, existingQuote] of quotesForSymbol.entries()) {
                if (index < newIndex) {
                    continue;
                }
                const existingQuoteSymbolPosObj = this.quoteSymbolPosMap.get(existingQuote.Id)
                if (!existingQuoteSymbolPosObj) {
                    throw new Error('impossible');
                }
                existingQuoteSymbolPosObj.pos = index + 1;
            }
            quotesForSymbol.splice(newIndex, 0, quote);
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

    public removeQuote(quote: IQuote): void {
        const symbolPosObj = this.quoteSymbolPosMap.get(quote.Id);
        if (!symbolPosObj) {
            return;
        }
        const quotes = this.quotesBySymbol.get(quote.Symbol);
        if (!quotes) {
            return;
        }
        quotes.splice(symbolPosObj.pos, 1);
        for (const [index, quote] of quotes.entries()) {
            if (index < symbolPosObj.pos) {
                continue;
            }

            {
                const symbolPosObj = this.quoteSymbolPosMap.get(quote.Id);
                if (!symbolPosObj) {
                    throw new Error('impossible')
                }
                symbolPosObj.pos = index;
            }
        }
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

    public getQuotes(): IQuote[] {
        return Array.from(this.quotesBySymbol.values()).flat();
    }

    public getQuotesBySymbol(symbol: TradingSymbol): IQuote[] {
        return this.quotesBySymbol.get(symbol) ?? [];
    }
}
