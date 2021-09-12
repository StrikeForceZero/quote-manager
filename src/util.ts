// noinspection RedundantIfStatementJS
function isValidIndex<T>(arr: T[], nextIndex: number | void): nextIndex is number {
    if (nextIndex === undefined) {
        return false;
    }
    // no index is valid when the array is empty
    if (arr.length === 0) {
       return false;
    }
    // within range
    // noinspection RedundantIfStatementJS
    if (arr.length <= nextIndex || nextIndex < 0) {
        return false;
    }
    return true;
}

export function *entriesReverse<T>(items: T[]): Generator<[number, T], void, number | void> {
    let ix = items.length;
    while (--ix >= 0) {
        let nextIx = yield [ix, items[ix]];
        if (isValidIndex(items, nextIx)) {
            ix = nextIx;
        } else {
            if (typeof nextIx === 'number') {
                throw new Error('invalid index');
            }
        }
    }
}

export function *iteratorReverse<T>(items: T[]): Generator<T, void, number | void> {
    let ix = items.length;
    while (--ix >= 0) {
        let nextIx = yield items[ix];
        if (isValidIndex(items, nextIx)) {
            ix = nextIx;
        } else {
            if (typeof nextIx === 'number') {
                throw new Error('invalid index');
            }
        }
    }
}
