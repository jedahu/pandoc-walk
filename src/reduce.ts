import {Either} from "fp-ts/lib/Either";
import {isRight} from "fp-ts/lib/Either";
import {left} from "fp-ts/lib/Either";
import {right} from "fp-ts/lib/Either";
import {tuple} from "fp-ts/lib/function";

export type Reducer<B, A> = (b : B, a : A) => Either<B, B>;
export type StrictReducer<B, A> = (b : B, a : A) => B;

export type Reduction<B, C, A> = {
    seed : B;
    step : Reducer<B, A>;
    result : (b : B) => C
};

export type StrictReduction<B, C, A> = {
    seed : B;
    step : StrictReducer<B, A>;
    result : (b : B) => C
};

export function strictReducer<B, A>(r : Reducer<B, A>) : StrictReducer<B, A> {
    return (b, a) => r(b, a).value;
}

export function strictReduction
<B, C, A>(r : Reduction<B, C, A>) : StrictReduction<B, C, A> {
    const {seed, step, result} = r;
    return {seed, step: strictReducer(step), result};
};

export const zip = <B1, C1, B2, C2, A>(
    r1 : Reduction<B1, C1, A>,
    r2 : Reduction<B2, C2, A>
) : Reduction<[B1, B2], [C1, C2], A> => ({
    seed: [r1.seed, r2.seed],
    step: (b, a) => {
        const b1 = r1.step(b[0], a);
        const b2 = r2.step(b[1], a);
        return isRight(b1) && isRight(b2)
            ? right(tuple(b1.value, b2.value))
            : left(tuple(b1.value, b2.value));
    },
    result: ([b1, b2]) =>
        [r1.result(b1), r2.result(b2)]
});

export const strictZip = <B1, C1, B2, C2, A>(
    r1 : StrictReduction<B1, C1, A>,
    r2 : StrictReduction<B2, C2, A>
) : StrictReduction<[B1, B2], [C1, C2], A> => ({
    seed: [r1.seed, r2.seed],
    step: (b, a) => {
        const b1 = r1.step(b[0], a);
        const b2 = r2.step(b[1], a);
        return [b1, b2];
    },
    result: ([b1, b2]) =>
        [r1.result(b1), r2.result(b2)]
});
