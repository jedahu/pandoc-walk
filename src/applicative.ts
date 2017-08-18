import {Applicative} from "fp-ts/lib/Applicative";
import {HKT} from "fp-ts/lib/HKT";
import {HKTS} from "fp-ts/lib/HKT";
import {HKTAs} from "fp-ts/lib/HKT";
import {HKT2S} from "fp-ts/lib/HKT";
import {HKT2As} from "fp-ts/lib/HKT";
import {curry} from "fp-ts/lib/function";
import {getApplicativeComposition} from "fp-ts/lib/Applicative";
import {tuple} from "fp-ts/lib/function";

export function zip<F extends HKTS, G extends HKTS>(
    AF : Applicative<F>,
    AG : Applicative<G>
) : <A, B>(
    fga : HKTAs<F, HKTAs<G, A>>,
    fgb : HKTAs<F, HKTAs<G, B>>
) => HKTAs<F, HKTAs<G, [A, B]>>;

export function zip<F extends HKTS, G extends HKT2S>(
    AF : Applicative<F>,
    AG : Applicative<G>
) : <L, A, B>(
    fga : HKTAs<F, HKT2As<G, L, A>>,
    fgb : HKTAs<F, HKT2As<G, L, B>>
) => HKTAs<F, HKT2As<G, L, [A, B]>>;

export function zip<F extends HKT2S, G extends HKTS>(
    AF : Applicative<F>,
    AG : Applicative<G>
) : <L, A, B>(
    fga : HKT2As<F, L, HKTAs<G, A>>,
    fgb : HKT2As<F, L, HKTAs<G, B>>
) => HKT2As<F, L, HKTAs<G, [A, B]>>;

export function zip<F extends HKT2S, G extends HKT2S>(
    AF : Applicative<F>,
    AG : Applicative<G>
) : <L, M, A, B>(
    fga : HKT2As<F, L, HKT2As<G, M, A>>,
    fgb : HKT2As<F, L, HKT2As<G, M, B>>
) => HKT2As<F, L, HKT2As<G, M, [A, B]>>;

export function zip<F, G>(
    AF : Applicative<F>,
    AG : Applicative<G>
) : <A, B>(
    fga : HKT<F, HKT<G, A>>,
    fgb : HKT<F, HKT<G, B>>
) => HKT<F, HKT<G, [A, B]>>;

export function zip<F extends HKT2S>(
    applicative : Applicative<F>
) : <L, A, B>(
    fa : HKT2As<F, L, A>,
    fb : HKT2As<F, L, B>
) =>  HKT2As<F, L, [A, B]>;

export function zip<F extends HKTS>(
    applicative : Applicative<F>
) : <A, B>(
    fa : HKTAs<F, A>,
    fb : HKTAs<F, B>
) => HKTAs<F, [A, B]>;

export function zip<F>(
    applicative : Applicative<F>
) : <A, B>(
    fa : HKT<F, A>,
    fb : HKT<F, B>
) => HKT<F, [A, B]>;

export function zip<A, B>(f : Applicative<any>, g? : Applicative<any>) {
    const applicative = g ? getApplicativeComposition(f, g) : f;
    return (fa : HKT<any, A>, fb : HKT<any, B>) =>
        applicative.ap(
            applicative.ap(
                applicative.of(curry(tuple)),
                fa),
            fb);
}
