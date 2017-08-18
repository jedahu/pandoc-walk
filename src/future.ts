import {ConcurrentFuture} from "fluture";
import {Curried2} from "fp-ts/lib/function";
import {Either} from "fp-ts/lib/Either";
import {Function1} from "fp-ts/lib/function";
import {Future} from "fluture";
import {Par} from "fluture";
import {curry} from "fp-ts/lib/function";
import {left} from "fp-ts/lib/Either";
import {right} from "fp-ts/lib/Either";
import {tuple} from "fp-ts/lib/function";

export * from "fluture";

export function now<E, A>(a : A) : Future<E, A> {
    return Future.of(a);
}

export function zip<E, A, B>(fa : Future<E, A>, fb : Future<E, B>)
: Future<E, [A, B]> {
    return fa.map<Function1<B, [A, B]>>(curry(tuple)).ap(fb);
}

export function parZip<E, A, B>(
    fa : ConcurrentFuture<E, A>,
    fb : ConcurrentFuture<E, B>
) : ConcurrentFuture<E, [A, B]> {
    return Par.ap(Par.map(curry(tuple) as Curried2<A, B, [A, B]>, fa), fb);
};

export function catch_<E, A>(fa : Future<E, A>) : Future<never, Either<E, A>> {
    return fa.fold<Either<E, A>>(left, right);
}
