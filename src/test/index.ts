import {Generator as Gen} from "testcheck";
import * as jasmineCheck from "jasmine-check";

jasmineCheck.install();

export * from "testcheck";
export {Generator as Gen} from "testcheck";

const G : any = global;

export const it : jest.It = G.it;
export const describe : jest.Describe = G.describe;
export const test : jest.It = G.test
export const expect : jest.Expect = G.expect;

export type CheckitOpts = {
    times? : number;
    maxSize? : number;
    seed? : number;
};

export function checkit<A>(
    name : string,
    gens : [Gen<A>],
    f : (a : A) => void
) : void;

export function checkit<A, B>(
    name : string,
    gens : [Gen<A>, Gen<B>],
    f : (a : A, b : B) => void
) : void;

export function checkit<A, B, C>(
    name : string,
    gens : [Gen<A>, Gen<B>, Gen<C>],
    f : (a : A, b : B, c : C) => void
) : void;

export function checkit<A, B, C, D>(
    name : string,
    gens : [Gen<A>, Gen<B>, Gen<C>, Gen<D>],
    f : (a : A, b : B, c : C, d : D) => void
) : void;

export function checkit(
    name : string,
    gens : Array<Gen<any>>,
    f : (...args : Array<any>) => void
) : void {
    return G.check.it(name, gens, f);
}

export function checkitWith<A>(
    name : string,
    opts : CheckitOpts,
    gens : [Gen<A>],
    f : (a : A) => void
) : void;

export function checkitWith<A, B>(
    name : string,
    opts : CheckitOpts,
    gens : [Gen<A>, Gen<B>],
    f : (a : A, b : B) => void
) : void;

export function checkitWith<A, B, C>(
    name : string,
    opts : CheckitOpts,
    gens : [Gen<A>, Gen<B>, Gen<C>],
    f : (a : A, b : B, c : C) => void
) : void;

export function checkitWith<A, B, C, D>(
    name : string,
    opts : CheckitOpts,
    gens : [Gen<A>, Gen<B>, Gen<C>, Gen<D>],
    f : (a : A, b : B, c : C, d : D) => void
) : void;

export function checkitWith(
    name : string,
    opts : CheckitOpts,
    gens : Array<Gen<any>>,
    f : (...args : Array<any>) => void
) : void {
    return G.check.it(name, opts, gens, f);
}
