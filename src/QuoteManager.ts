import {
    newGuid,
    TradeResult,
    uint,
} from 'src/base';
import type {
    Double,
    Guid,
    IQuote,
    IQuoteManager,
    ITradeResult,
    UInt,
    TradingSymbol,
} from 'src/base';
import { QuoteCache } from 'src/QuoteCache';
import { QuoteUtil } from 'src/QuoteUtil';


export class QuoteManager implements IQuoteManager {
    private readonly cache = new QuoteCache();

    /**
     * Add or update the quote (specified by Id) in symbol's book.
     * If quote is new or no longer in the book, add it. Otherwise update it to match the given price, volume, and symbol.
     * @param quote
     */
    public AddOrUpdateQuote(quote: IQuote): void {
        this.cache.addOrUpdateQuote(quote);
    }

    /**
     * Remove quote by Id, if quote is no longer in symbol's book do nothing.
     * @param id
     */
    public RemoveQuote(id: Guid): void {
        this.cache.removeQuoteById(id);
    }

    /**
     * Remove all quotes on the specifed symbol's book.
     * @param symbol
     */
    public RemoveAllQuotes(symbol: TradingSymbol): void {
        this.cache.removeQuotesBySymbol(symbol);
    }

    /**
     * Get the best (i.e. lowest) price in the symbol's book that still has available volume.
     * If there is no quote on the symbol's book with available volume, return null.
     * Otherwise return a Quote object with all the fields set.
     * Don't return any quote which is past its expiration time, or has been removed.
     * @param symbol
     */
    public GetBestQuoteWithAvailableVolume(symbol: TradingSymbol): IQuote | null {
        let bestQuote: IQuote | null = null;
        for (const quote of this.cache.getQuotes()) {
            if (quote.Symbol !== symbol) {
                continue;
            }
            if (!quote.AvailableVolume || QuoteUtil.isQuoteExpired(quote)) {
                continue;
            }
            if (!bestQuote || quote.Price < bestQuote.Price) {
                bestQuote = quote;
            }
        }
        return bestQuote;
    }

    /**
     * Request that a trade be executed. For the purposes of this interface, assume that the trade is a request to BUY, not sell. Do not trade an expired quotes.
     * To Execute a trade:
     *      * Search available quotes of the specified symbol from best price to worst price.
     *      * Until the requested volume has been filled, use as much available volume as necessary (up to what is available) from each quote, subtracting the used amount from the available amount.
     * For example, we have two quotes:
     *      {Price: 1.0, Volume: 1,000, AvailableVolume: 750}
     *      {Price: 2.0, Volume: 1,000, AvailableVolume: 1,000}
     * After calling once for 500 volume, the quotes are:
     *      {Price: 1.0, Volume: 1,000, AvailableVolume: 250}
     *      {Price: 2.0, Volume: 1,000, AvailableVolume: 1,000}
     * And After calling this a second time for 500 volume, the quotes are:
     *      {Price: 1.0, Volume: 1,000, AvailableVolume: 0}
     *      {Price: 2.0, Volume: 1,000, AvailableVolume: 750}
     * @param symbol
     * @param volumeRequested
     */
    public ExecuteTrade(symbol: TradingSymbol, volumeRequested: UInt): ITradeResult {
        // TODO: if more performance is needed QuoteCache will need to be redesigned to keep prices and volumes sorted
        const sortedQuotes = Array
            .from(this.cache.getQuotesBySymbol(symbol))
            .sort(QuoteUtil.compareQuoteVolume)
            .sort(QuoteUtil.compareQuotePrice)
        ;
        let volumePrices: Array<{ volume: UInt, price: Double }> = [];
        let volumeRequestedRemaining = volumeRequested;
        for (const quote of sortedQuotes) {
            if (volumeRequestedRemaining === 0) {
                continue;
            }
            if (QuoteUtil.isQuoteExpired(quote)) {
                continue;
            }
            const maxConsumableVolume = uint(quote.AvailableVolume < volumeRequestedRemaining ? quote.AvailableVolume : volumeRequestedRemaining);
            volumeRequestedRemaining = uint(volumeRequestedRemaining - maxConsumableVolume);
            quote.AvailableVolume = uint(quote.AvailableVolume - maxConsumableVolume);
            if (quote.AvailableVolume > 0) {
                this.cache.addOrUpdateQuote(quote);
            } else {
                this.cache.removeQuote(quote);
            }
            volumePrices.push({ volume: maxConsumableVolume, price: quote.Price });
        }
        const volumeExecuted = uint(volumeRequested - volumeRequestedRemaining);
        const volumeWeightedAveragePrice = volumePrices.reduce<number>((sum, { volume, price }) => {
            return sum + (volume * price)
        }, 0) / volumeExecuted as Double;

        return new TradeResult({
            Id: newGuid(),
            Symbol: symbol,
            VolumeExecuted: volumeExecuted,
            VolumeRequested: volumeRequested,
            VolumeWeightedAveragePrice: volumeWeightedAveragePrice,
        });
    }
}
