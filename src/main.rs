use chrono::{Utc, DateTime, TimeZone};
use std::cell::{Cell};
use std::collections::HashMap;
use std::rc::Rc;
use std::hash::{Hash};
use std::collections::VecDeque;
use uuid::Uuid;
use std::time::Instant;

#[derive(Clone,Debug,Hash,Eq,PartialEq)]
struct TradingSymbol(Rc<String>);

#[derive(Clone,Debug)]
struct Quote {
    pub id: Uuid,
    pub symbol: TradingSymbol,
    pub price: f64,
    pub volume_available: Cell<usize>,
    pub expiration_date: DateTime<Utc>,
}

impl Quote {
    pub fn is_valid(&self) -> bool {
        self.volume_available.get() > 0 && self.expiration_date > Utc::now()
    }
}

#[derive(Debug)]
struct QuotePosObj {
    pub position: usize,
    pub symbol: TradingSymbol,
}

struct QuoteManager {
    pub position_map: HashMap<Uuid, QuotePosObj>,
    pub symbol_quotes: HashMap<TradingSymbol, VecDeque<Quote>>,
}

#[derive(Debug)]
struct TradingResult {
    pub id: Uuid,
    pub symbol: TradingSymbol,
    pub volume_executed: usize,
    pub volume_requested: usize,
    pub volume_weighted_average_price: f64,
}

impl QuoteManager {
    //noinspection RsSelfConvention
    fn get_or_initialize_pos_obj(&mut self, quote: Quote) -> &QuotePosObj {
        let QuoteManager { position_map, symbol_quotes } = self;
        position_map.entry(quote.id.clone()).or_insert_with(|| {
            let quotes = symbol_quotes.entry(quote.symbol.clone()).or_default();
            let mut next_index = 0;
            for (index, existing_quote) in quotes.iter().enumerate() {
                if quote.price < existing_quote.price {
                    break
                }
                next_index = index;
            }
            let symbol = quote.symbol.clone();
            quotes.insert(next_index, quote);
            QuotePosObj {
                position: next_index,
                symbol,
            }
        })
    }
    pub fn add_quote(&mut self, quote: Quote) {
        self.get_or_initialize_pos_obj(quote);
    }
    pub fn remove_quote(&mut self, quote: &Quote) {
        {
            let QuoteManager { position_map, symbol_quotes } = self;
            let symbol = quote.symbol.clone();
            if let Some(quotes) = symbol_quotes.get_mut(&symbol) {
                let position = if let Some(position_obj) = position_map.get(&quote.id) { position_obj.position } else { return; };
                quotes.remove(position);
                for (index, remaining_quote) in quotes.iter().enumerate() {
                    if index > position {
                        break;
                    }
                    if let Some(remaining_quote_pos_obj) = position_map.get_mut(&remaining_quote.id) {
                        remaining_quote_pos_obj.position += index;
                    } else {
                        panic!("whoops")
                    }
                }
            }
        }
        self.position_map.remove(&quote.id);
    }
    #[allow(dead_code)]
    pub fn remove_quote_by_id(&mut self, quote_id: Uuid) {
        let QuoteManager { position_map, symbol_quotes } = self;
        let position_obj = if let Some(position_obj) = position_map.get(&quote_id) { position_obj } else { return; };
        let quotes = if let Some(quotes) = symbol_quotes.get(&position_obj.symbol) { quotes } else { return; };
        let quote = if let Some(quote) = quotes.get(position_obj.position) { quote } else { return; };
        let quote = quote.clone();
        self.remove_quote(&quote);
    }
    pub fn find_best_quote_by_symbol(&mut self, symbol: TradingSymbol) -> Option<&Quote> {
        let mut quotes_to_remove: Vec<Quote> = vec![];
        let mut best_quote_id: Option<Uuid> = None;

        for quote in self.symbol_quotes.get(&symbol).iter().copied().flat_map(|x| x.iter()) {
            if !quote.is_valid() {
                quotes_to_remove.push(quote.clone());
                continue;
            }
            best_quote_id = Some(quote.id.clone());
            break;
        }
        for quote in quotes_to_remove.into_iter() {
            self.remove_quote(&quote.clone());
        }

        // rust is feisty or else we could have saved ourselves some time grabbing the best quote from above
        let best_quote_id = if let Some(best_quote_id) = best_quote_id { best_quote_id } else { return None };
        let position_obj = if let Some(position_obj) = self.position_map.get(&best_quote_id) { position_obj } else { return None };
        let quotes = if let Some(quotes) = self.symbol_quotes.get(&position_obj.symbol) { quotes } else { return None };
        quotes.get(position_obj.position)
    }
    pub fn execute_trade(&mut self, symbol: TradingSymbol, volume_requested: usize) -> TradingResult {
        let mut volume_price_tuples: Vec<(f64, usize)> = vec![];
        let mut volume_requested_remaining = volume_requested;
        while volume_requested_remaining > 0 {
            let quote = if let Some(quote) = self.find_best_quote_by_symbol(symbol.clone()) { quote } else { break; };
            let max_consumable_volume = if quote.volume_available.get() < volume_requested_remaining { quote.volume_available.get() } else { volume_requested_remaining };
            volume_requested_remaining -= max_consumable_volume;
            quote.volume_available.set(quote.volume_available.get() - max_consumable_volume);
            /*if quote.volume_available.get() == 0 {
                self.remove_quote(quote);
            }*/
            volume_price_tuples.push((quote.price, max_consumable_volume));
        }
        let volume_executed = volume_requested - volume_requested_remaining;
        let volume_weighted_average_price = volume_price_tuples.iter().fold(0.0, |sum, (price, volume)| sum + (*price * *volume as f64)) / volume_executed as f64;
        TradingResult {
            id: Uuid::new_v4(),
            symbol: symbol.clone(),
            volume_executed,
            volume_requested,
            volume_weighted_average_price,
        }
    }
}

fn main() {
    let mut qm = QuoteManager {
        position_map: Default::default(),
        symbol_quotes: Default::default()
    };
    let trading_symbol: TradingSymbol = TradingSymbol(Rc::new("ABC".to_string()));
    let a = Instant::now();
    for ix in (0..1_000_000i64).rev() {
        qm.add_quote(Quote {
            id: Uuid::new_v4(),
            symbol: trading_symbol.clone(),
            price: ix as f64,
            volume_available: Cell::new(1),
            expiration_date: Utc.ymd(2021, 10, 01).and_hms(0,0,0),
        })
    }
    let b = Instant::now();
    println!("{:?}", b.duration_since(a));
    println!("{:?}", qm.execute_trade(trading_symbol.clone(), 1_000_000));
    println!("{:?}", qm.execute_trade(trading_symbol.clone(), 1));
    let c = Instant::now();
    println!("{:?}", c.duration_since(b));
}
