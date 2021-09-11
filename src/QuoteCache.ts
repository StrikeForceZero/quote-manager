import type {
    Guid,
    IQuote,
    TradingSymbol,
} from 'src/base';

export class QuoteCache {
    private readonly quotesByGuid = new Map<Guid, IQuote>();
    private readonly quotesBySymbol = new Map<TradingSymbol, Map<Guid, IQuote>>();

    private getOrInitializeNestedMap(symbol: TradingSymbol): Map<Guid, IQuote> {
        let nestedMap: Map<Guid, IQuote> | undefined = this.quotesBySymbol.get(symbol);
        if (!nestedMap) {
            nestedMap = new Map<Guid, IQuote>();
            this.quotesBySymbol.set(symbol, nestedMap);
        }
        return nestedMap;
    }

    private static setMap(map: Map<Guid, IQuote>, quote: IQuote): void {
        map.set(quote.Id, quote);
    }

    private static deleteMap(map: Map<Guid, IQuote>, quote: IQuote): void {
        map.delete(quote.Id);
    }

    public addOrUpdateQuote(quote: IQuote): void {
        QuoteCache.setMap(this.quotesByGuid, quote);
        QuoteCache.setMap(this.getOrInitializeNestedMap(quote.Symbol), quote);
    }

    public removeQuotesBySymbol(symbol: TradingSymbol): void {
        const nestedMap = this.quotesBySymbol.get(symbol);
        if (!nestedMap) {
            return;
        }
        for (const quote of nestedMap.values()) {
            this.quotesByGuid.delete(quote.Id);
        }
        nestedMap.clear();
    }

    public removeQuote(quote: IQuote): void {
        QuoteCache.deleteMap(this.quotesByGuid, quote);
        const nestedMap = this.getOrInitializeNestedMap(quote.Symbol);
        QuoteCache.deleteMap(nestedMap, quote);
        // cleanup
        if (!nestedMap.size) {
            this.quotesBySymbol.delete(quote.Symbol);
        }
    }

    public removeQuoteById(id: Guid): void {
        const quote = this.quotesByGuid.get(id);
        if (!quote) {
            return;
        }
        this.removeQuote(quote);
    }

    public getQuotes(): IterableIterator<IQuote> {
        return this.quotesByGuid.values();
    }

    public getQuotesBySymbol(symbol: TradingSymbol): IterableIterator<IQuote> | [] {
        const nestedMap = this.quotesBySymbol.get(symbol);
        if (!nestedMap) {
            return [];
        }
        return nestedMap.values();
    }
}
