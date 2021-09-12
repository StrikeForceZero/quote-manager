// file.skip

import * as DateFns from 'date-fns';
import {
    performance,
    PerformanceEntry,
    PerformanceObserver,
} from 'perf_hooks';
import {
    Double,
    newGuid,
    Quote,
    tradingSymbol,
    uint,
    UInt,
} from 'src/base';
import { QuoteManager } from 'src/QuoteManager';

describe('benchmark', () => {
    it('should not take forever on 10k quotes', done => {
        const symbol = tradingSymbol('FOO');
        const markSeenMap = {
            A: false,
            B: false,
        };
        const markExpectMap = {
            A(entry: PerformanceEntry) { markSeenMap.A = true; expect(entry.duration).toBeLessThan(2000) },
            B(entry: PerformanceEntry) { markSeenMap.B = true; expect(entry.duration).toBeLessThan(2000) },
        }
        const obs = new PerformanceObserver((items) => {
            for (const entry of items.getEntries()) {
                console.log(entry.name, entry.duration);
                if (!Object.keys(markExpectMap).includes(entry.name)) {
                    continue;
                }
                markExpectMap[entry.name as keyof typeof markExpectMap](entry);
            }
            if (Object.values(markSeenMap).every(x => x)) {
                done();
            }
        });
        obs.observe({ entryTypes: ['measure'] });
        performance.mark('A');
        const qm = new QuoteManager();
        const SIZE = 10_000;
        for (let ix = 0; ix < SIZE; ix++) {
            qm.AddOrUpdateQuote(new Quote({
                Id: newGuid(),
                AvailableVolume: ix as UInt,
                ExpirationDate: DateFns.addDays(new Date(), 1),
                Price: ix as Double,
                Symbol: symbol,
            }));
        }
        performance.measure('A', 'A');
        performance.mark('B');
        qm.ExecuteTrade(symbol, uint(100));
        performance.measure('B', 'B');
    })
})
