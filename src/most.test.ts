import * as fl from "./future";
import * as most from "./most";
import {left} from "fp-ts/lib/Either";
import {right} from "fp-ts/lib/Either";
import {test} from "./test";

describe("most", () => {
    test("collect", async () => {
        const xs = await most.collect(most.from([1,2,3,4])).promise();
        expect(xs).toEqual([1,2,3,4]);
    });

    test("rights", async () => {
        const xs = await
        most.collect(most.rights(most.from([left(1), right(2)]))).promise();
        expect(xs).toEqual([2]);
    });

    test("par", async () => {
        const xs = await most.collect(
            most.rights(
                most.par(3, most.from([1,2,3,4,5,6,7].map(fl.of))))
        ).promise();
        expect(xs).toEqual([1,2,3,4,5,6,7]);
    });

    test("under par", async () => {
        const xs = await most.collect(
            most.rights(
                most.par(4, most.from([1,2].map(fl.of))))
        ).promise();
        expect(xs).toEqual([1,2]);
    });
});
