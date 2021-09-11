import * as DateFns from 'date-fns';
import {
    double,
    newGuid,
    Quote,
    tradingSymbol,
    uint,
} from 'src/base';
import { QuoteUtil } from 'src/QuoteUtil';

describe('sorting', () => {

    it('should sort quotes', () => {
        const symbol = tradingSymbol('A');
        const cheapest = new Quote({
            Id: newGuid(),
            AvailableVolume: uint(5),
            ExpirationDate: DateFns.addDays(new Date(), 1),
            Price: double(.1),
            Symbol: symbol,
        });
        const quotes = [
            new Quote({
                Id: newGuid(),
                AvailableVolume: uint(1),
                ExpirationDate: DateFns.subDays(new Date(), 1),
                Price: double(1),
                Symbol: symbol,
            }),
            new Quote({
                Id: newGuid(),
                AvailableVolume: uint(1),
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: double(1),
                Symbol: symbol,
            }),
            new Quote({
                Id: newGuid(),
                AvailableVolume: uint(4),
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: double(2),
                Symbol: symbol,
            }),
            cheapest,
            new Quote({
                Id: newGuid(),
                AvailableVolume: uint(4),
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: double(1),
                Symbol: symbol,
            }),
        ];

        const [ first ] = quotes;

        quotes.sort(QuoteUtil.compareQuoteVolume);
        expect(quotes[0]).toBe(first);

        quotes.sort(QuoteUtil.compareQuotePrice);
        expect(quotes[0]).toBe(cheapest);
    })

})
