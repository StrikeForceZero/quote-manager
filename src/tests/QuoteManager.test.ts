import * as DateFns from 'date-fns';

import {
    double,
    Guid,
    newGuid,
    Quote,
    tradingSymbol,
    uint,
} from 'src/base';
import type { QuoteCache } from 'src/QuoteCache';
import { QuoteManager } from 'src/QuoteManager';

function seedQuoteManager(quotes: Quote[]): QuoteManager {
    const qm = new QuoteManager();
    for (const quote of quotes) {
        qm.AddOrUpdateQuote(quote);
    }
    return qm;
}

function quote({
    Id = newGuid(),
    AvailableVolume,
    ExpirationDate,
    Price,
    Symbol,
}: {
    Id?: Guid,
    AvailableVolume: number,
    ExpirationDate: Date,
    Price: number,
    Symbol: string,
}): Quote {
    return new Quote({
        Id,
        AvailableVolume: uint(AvailableVolume),
        ExpirationDate: ExpirationDate,
        Price: double(Price),
        Symbol: tradingSymbol(Symbol),
    })
}

function getCache(qm: QuoteManager): QuoteCache {
    return ((qm as any).cache as QuoteCache);
}

describe('ExecuteTrade', () => {

    it('should handle simple transactions', () => {
        const symbol = tradingSymbol('ABC');
        const quotes = [
            quote({
                AvailableVolume: 750,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 1,
                Symbol: symbol,
            }),
            quote( {
                AvailableVolume: 1000,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 2,
                Symbol: symbol,
            }),
        ];
        const qm = seedQuoteManager(quotes);
        {
            const tradingResult = qm.ExecuteTrade(symbol, uint(500));
            expect(tradingResult.Symbol).toBe(symbol);
            expect(tradingResult.VolumeExecuted).toBe(uint(500))
            expect(tradingResult.VolumeWeightedAveragePrice).toBe(double(1))
        }
        {
            const tradingResult = qm.ExecuteTrade(symbol, uint(500));
            expect(tradingResult.Symbol).toBe(symbol);
            expect(tradingResult.VolumeExecuted).toBe(uint(500))
            expect(tradingResult.VolumeWeightedAveragePrice).toBe(double(1.5))
        }
        {
            const tradingResult = qm.ExecuteTrade(symbol, uint(500));
            expect(tradingResult.Symbol).toBe(symbol);
            expect(tradingResult.VolumeExecuted).toBe(uint(500))
            expect(tradingResult.VolumeWeightedAveragePrice).toBe(double(2))
        }
        {
            const tradingResult = qm.ExecuteTrade(symbol, uint(500));
            expect(tradingResult.Symbol).toBe(symbol);
            expect(tradingResult.VolumeExecuted).toBe(uint(250))
            expect(tradingResult.VolumeWeightedAveragePrice).toBe(double(2))
        }
    });

    it('should ignore expired quotes', () => {
        const symbol = tradingSymbol('ABC');
        const quotes = [
            quote({
                AvailableVolume: 1,
                ExpirationDate: DateFns.subDays(new Date(), 1),
                Price: 1,
                Symbol: symbol,
            }),
            quote({
                AvailableVolume: 1,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 2,
                Symbol: symbol,
            }),
        ];
        const qm = seedQuoteManager(quotes);
        {
            // since the first quote is expired we should only get the 2nd one
            const tradingResult = qm.ExecuteTrade(symbol, uint(1));
            expect(tradingResult.Symbol).toBe(symbol);
            expect(tradingResult.VolumeExecuted).toBe(uint(1))
            expect(tradingResult.VolumeWeightedAveragePrice).toBe(double(2))
        }
        {
            // should get none
            const tradingResult = qm.ExecuteTrade(symbol, uint(1));
            expect(tradingResult.Symbol).toBe(symbol);
            expect(tradingResult.VolumeExecuted).toBe(uint(0))
        }
    });

    it('should ignore no volume', () => {
        const symbol = tradingSymbol('ABC');
        const quotes = [
            quote({
                AvailableVolume: 0,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 1,
                Symbol: symbol,
            }),
            quote( {
                AvailableVolume: 1,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 2,
                Symbol: symbol,
            }),
        ];
        const qm = seedQuoteManager(quotes);
        {
            // since the first quote has no volume we should only get the 2nd one
            const tradingResult = qm.ExecuteTrade(symbol, uint(1));
            expect(tradingResult.Symbol).toBe(symbol);
            expect(tradingResult.VolumeExecuted).toBe(uint(1));
            expect(tradingResult.VolumeWeightedAveragePrice).toBe(double(2));
        }
        {
            // should get none
            const tradingResult = qm.ExecuteTrade(symbol, uint(1));
            expect(tradingResult.Symbol).toBe(symbol);
            expect(tradingResult.VolumeExecuted).toBe(uint(0));
        }
    });

});

describe('AddOrUpdateQuote', () => {

    it('should only add one', () => {
        const qm = seedQuoteManager([]);
        expect(getCache(qm).getAllQuotes().length).toBe(0);
        qm.AddOrUpdateQuote(quote({
            AvailableVolume: 1,
            ExpirationDate: DateFns.subDays(new Date(), 1),
            Price: 1,
            Symbol: 'FOO',
        }));
        expect(getCache(qm).getAllQuotes().length).toBe(1);
    });

    it('should update existing', () => {
        const a = quote({
            AvailableVolume: 1,
            ExpirationDate: DateFns.addDays(new Date(), 1),
            Price: 1,
            Symbol: 'FOO',
        });
        const qm = seedQuoteManager([a]);
        qm.AddOrUpdateQuote({ ...a, Price: double(5) });
        expect(qm.GetBestQuoteWithAvailableVolume(a.Symbol)?.Price).toBe(5);
    })

    it('should remove all by symbol', () => {
        const qm = seedQuoteManager([
            quote({
                AvailableVolume: 1,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 1,
                Symbol: 'A',
            }),
            quote({
                AvailableVolume: 1,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 1,
                Symbol: 'A',
            }),
            quote({
                AvailableVolume: 1,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 1,
                Symbol: 'B',
            })
        ]);
        expect(getCache(qm).getAllQuotes().length).toBe(3);
        qm.RemoveAllQuotes(tradingSymbol('A'));
        expect(getCache(qm).getAllQuotes().length).toBe(1);
    });

    it('should remove one by id', () => {
        const quotes = [
            quote({
                AvailableVolume: 1,
                ExpirationDate: DateFns.subDays(new Date(), 1),
                Price: 1,
                Symbol: 'A',
            }),
            quote({
                AvailableVolume: 1,
                ExpirationDate: DateFns.subDays(new Date(), 1),
                Price: 1,
                Symbol: 'B',
            })
        ];
        const qm = seedQuoteManager(quotes);
        expect(getCache(qm).getAllQuotes().length).toBe(2);
        qm.RemoveQuote(quotes[0].Id);
        expect(getCache(qm).getAllQuotes().length).toBe(1);
    });

    it('should get best quote by symbol', () => {
        const bestValidQuote = quote({
            AvailableVolume: 1,
            ExpirationDate: DateFns.addDays(new Date(), 1),
            Price: 1,
            Symbol: 'A',
        });
        const quotes = [
            quote({
                AvailableVolume: 1,
                ExpirationDate: DateFns.subDays(new Date(), 1),
                Price: 1,
                Symbol: 'A',
            }),
            bestValidQuote,
            quote({
                AvailableVolume: 1,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 1,
                Symbol: 'A',
            }),
            quote({
                AvailableVolume: 0,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: 0.1,
                Symbol: 'A',
            }),
        ];
        const qm = seedQuoteManager(quotes);
        {
            const bestQuote = qm.GetBestQuoteWithAvailableVolume(tradingSymbol('A'));
            expect(bestQuote).toBe(bestValidQuote);
        }
        {
            const bestQuote = qm.GetBestQuoteWithAvailableVolume(tradingSymbol('C'));
            expect(bestQuote).toBeNull();
        }
    });

});
