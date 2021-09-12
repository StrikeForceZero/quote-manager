import {
    double,
    newGuid,
    Quote,
    tradingSymbol,
    uint,
} from 'src/base';
import { QuoteCache } from 'src/QuoteCache';

describe('getOrInitializeNestedQuotePosObj', () => {

    it('should properly maintain state', () => {
        const cache = new QuoteCache();
        // @ts-ignore
        cache.getOrInitializeNestedQuotePosObj(new Quote({
            Id: newGuid(),
            AvailableVolume: uint(1),
            ExpirationDate: new Date(),
            Price: double(1),
            Symbol: tradingSymbol('FOO'),
        }));
        // @ts-ignore
        cache.getOrInitializeNestedQuotePosObj(new Quote({
            Id: newGuid(),
            AvailableVolume: uint(2),
            ExpirationDate: new Date(),
            Price: double(2),
            Symbol: tradingSymbol('FOO'),
        }));
        expect(cache.getAllQuotes().length).toBe(2);
        expect(cache.getAllQuotes()[0].Price).toBe(2);
    });

    it('should properly maintain order', () => {
        const cache = new QuoteCache();
        // @ts-ignore
        cache.getOrInitializeNestedQuotePosObj(new Quote({
            Id: newGuid(),
            AvailableVolume: uint(1),
            ExpirationDate: new Date(),
            Price: double(1),
            Symbol: tradingSymbol('FOO'),
        }));
        // @ts-ignore
        cache.getOrInitializeNestedQuotePosObj(new Quote({
            Id: newGuid(),
            AvailableVolume: uint(2),
            ExpirationDate: new Date(),
            Price: double(2),
            Symbol: tradingSymbol('FOO'),
        }));
        // @ts-ignore
        cache.getOrInitializeNestedQuotePosObj(new Quote({
            Id: newGuid(),
            AvailableVolume: uint(1),
            ExpirationDate: new Date(),
            Price: double(.1),
            Symbol: tradingSymbol('FOO'),
        }));
        const cacheQuotes = cache.getAllQuotes();
        expect(cacheQuotes.length).toBe(3);
        expect(cacheQuotes[cacheQuotes.length-1].Price).toBe(.1);
    });

    it('should remove quote from left side of cache', () => {
        const cache = new QuoteCache();
        // @ts-ignore
        cache.getOrInitializeNestedQuotePosObj(new Quote({
            Id: newGuid(),
            AvailableVolume: uint(1),
            ExpirationDate: new Date(),
            Price: double(1),
            Symbol: tradingSymbol('FOO'),
        }));
        // @ts-ignore
        cache.getOrInitializeNestedQuotePosObj(new Quote({
            Id: newGuid(),
            AvailableVolume: uint(2),
            ExpirationDate: new Date(),
            Price: double(2),
            Symbol: tradingSymbol('FOO'),
        }));
        expect(cache.getAllQuotes()[0].Price).toBe(2);
        cache.removeQuote(cache.getAllQuotes()[0]);
        expect(cache.getAllQuotes().length).toBe(1);
        expect(cache.getAllQuotes()[0].Price).toBe(1);
    })

});
