import * as fl from "./future";
import * as most from "most";
import {Either} from "fp-ts/lib/Either";
import {Function1 as Fn1} from "fp-ts/lib/function";
import {Function2 as Fn2} from "fp-ts/lib/function";
import {Future} from "./future";
import {Option} from "fp-ts/lib/Option";
import {Stream} from "most";
import {StrictReduction} from "./reduce";
import {chunksOf} from "most-chunksof";
import {create} from "@most/create";

export * from "most";
export * from "most-node-streams";
export * from "most-chunksof";
export * from "@most/create";

export function fromFuture<E extends Error, A>(fa : Future<E, A>) : Stream<A> {
    return most.fromPromise(fa.promise());
}

export function justs<A>(xs : Stream<Option<A>>) : Stream<A> {
    return xs.chain(x => x.fold(most.empty, most.of));
}

export function rights<L, A>(xs : Stream<Either<L, A>>) : Stream<A> {
    return xs.chain(x => x.fold(_ => most.empty(), most.of));
}

export function reduce<A, B>(
    f : Fn2<B, A, B>,
    b : B,
    stream : Stream<A>
) : Future<Error, B> {
    return fl.tryP(() => stream.reduce(f, b));
}

export function reduct<A, B, C>(
    r : StrictReduction<B, C, A>,
    stream : Stream<A>
) : Future<Error, C> {
    return fl.tryP<Error, B>(() => stream.reduce(r.step, r.seed)).
        map(r.result);
}

export function foldMap<A, B>(
    f : Fn1<A, B>,
    g : Fn2<B, B, B>,
    b : B,
    stream : Stream<A>
) : Future<Error, B> {
    return fl.tryP(() => stream.reduce((b, a) => g(b, f(a)), b));
}

export function par<E, A>(n : number, stream : Stream<Future<E, A>>)
: Stream<Either<E, A>> {
    return create((add, end, error) => {
        const push = (fas : Array<Future<E, A>>) =>
            fl.parallel(n, fas.map(fl.catch_)).
            map(rs => rs.forEach(add)).
            promise();
        chunksOf(n, stream).reduce(
            (p, fas) => p.then(_ => push(fas)),
            Promise.resolve()
        ).then(_ => end(), error);
    });
}

export function seq<E, A>(n : number, stream : Stream<Future<E, A>>)
: Stream<Either<E, A>> {
    return create((add, end, error) => {
        stream.forEach(fa => fl.catch_(fa).fork(error, add)).then(end);
    });
}

export function collect<A>(stream : Stream<A>) : Future<Error, Array<A>> {
    return fl.tryP(
        () =>
            stream.reduce((xs, x) => {
                xs.push(x);
                return xs;
            }, [] as Array<A>));
}
