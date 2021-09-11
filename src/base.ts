import type { Opaque } from 'ts-essentials';
// latest versions of node have webcrypto.randomUUID()
import { v4 as generateId } from 'uuid';

export type Guid = Opaque<string, 'guid'>;
export type UInt = Opaque<number, 'uint'>;
export type Double = Opaque<number, 'double'>;
export type TradingSymbol = Opaque<string, 'symbol'>;

export function newGuid(): Guid {
    return generateId() as Guid;
}

export function uint(value: number): UInt {
    if (value < 0 || Number.isNaN(value)) {
        throw new Error(`${value} not valid uint`);
    }
    return value as UInt;
}

export function double(value: number): Double {
    // all javascript numbers are doubles
    return value as Double;
}

export function tradingSymbol(symbol: string): TradingSymbol {
    return symbol as TradingSymbol;
}

// namespace Quoter
export interface IQuote {
    Id: Guid;
    Symbol: TradingSymbol;
    Price: Double;
    AvailableVolume: UInt;
    ExpirationDate: Date;
}

export class Quote implements IQuote {
    public Id: Guid;
    public Symbol: TradingSymbol;
    public Price: Double;
    public AvailableVolume: UInt;
    public ExpirationDate: Date;

    constructor(data: IQuote) {
        // normally I would do Object.assign(this, data)
        // or
        /*
            constructor(
                public Id: Guid,
                public Symbol: string,
                ...
            ) { }
         */
        // but since we have too many fields and want satisfy strictPropertyInitialization; we'll do each one manually
        this.Id = data.Id;
        this.Symbol = data.Symbol;
        this.Price = data.Price;
        this.AvailableVolume = data.AvailableVolume;
        this.ExpirationDate = data.ExpirationDate;
    }
}

export interface ITradeResult {
    Id: Guid;
    Symbol: TradingSymbol;
    VolumeWeightedAveragePrice: Double;
    VolumeRequested: UInt;
    VolumeExecuted: UInt;
}

export class TradeResult implements ITradeResult {
    public Id: Guid;
    public Symbol: TradingSymbol;
    public VolumeWeightedAveragePrice: Double;
    public VolumeRequested: UInt;
    public VolumeExecuted: UInt;

    constructor(data: ITradeResult) {
        this.Id = data.Id;
        this.Symbol = data.Symbol;
        this.VolumeWeightedAveragePrice = data.VolumeWeightedAveragePrice;
        this.VolumeRequested = data.VolumeRequested;
        this.VolumeExecuted = data.VolumeExecuted;
    }
}

// Please create your own quote manager which implements IQuoteManager interface.
//
// Do not change the interface.
//
// Please adhere to good Object Oriented Programming concepts, and create whatever support code you feel is necessary.
//
// Efficiency counts think about what data structures you use and how each method will perform.
//
// Though not required, feel free to includes any notes on any areas of this interface that you would improve, or which you
// feel don't adhere to good design concepts or implementation practices.
export interface IQuoteManager {
    // Add or update the quote (specified by Id) in symbol's book.
    // If quote is new or no longer in the book, add it. Otherwise update it to match the given price, volume, and symbol.
    AddOrUpdateQuote(quote: IQuote): void;

    // Remove quote by Id, if quote is no longer in symbol's book do nothing.
    RemoveQuote(id: Guid): void;

    // Remove all quotes on the specifed symbol's book.
    RemoveAllQuotes(symbol: TradingSymbol): void;

    // Get the best (i.e. lowest) price in the symbol's book that still has available volume.
    // If there is no quote on the symbol's book with available volume, return null.
    // Otherwise return a Quote object with all the fields set.
    // Don't return any quote which is past its expiration time, or has been removed.
    GetBestQuoteWithAvailableVolume(symbol: TradingSymbol): IQuote | null;

    // Request that a trade be executed. For the purposes of this interface, assume that the trade is a request to BUY, not sell. Do not trade an expired quotes.
    // To Execute a trade:
    //   * Search available quotes of the specified symbol from best price to worst price.
    //   * Until the requested volume has been filled, use as much available volume as necessary (up to what is available) from each quote, subtracting the used amount from the available amount.
    // For example, we have two quotes:
    //   {Price: 1.0, Volume: 1,000, AvailableVolume: 750}
    //   {Price: 2.0, Volume: 1,000, AvailableVolume: 1,000}
    // After calling once for 500 volume, the quotes are:
    //   {Price: 1.0, Volume: 1,000, AvailableVolume: 250}
    //   {Price: 2.0, Volume: 1,000, AvailableVolume: 1,000}
    // And After calling this a second time for 500 volume, the quotes are:
    //   {Price: 1.0, Volume: 1,000, AvailableVolume: 0}
    //   {Price: 2.0, Volume: 1,000, AvailableVolume: 750}
    ExecuteTrade(symbol: TradingSymbol, volumeRequested: UInt): ITradeResult;
}
