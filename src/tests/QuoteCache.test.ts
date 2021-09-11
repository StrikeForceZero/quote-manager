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
        expect(cache.getQuotes().length).toBe(2);
        expect(cache.getQuotes()[1].Price).toBe(2);
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
        expect(cache.getQuotes().length).toBe(3);
        expect(cache.getQuotes()[0].Price).toBe(.1);
    });

});
