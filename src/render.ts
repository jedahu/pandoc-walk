import * as fl from "fluture";
import * as pandoc from "pandoc-filter";
import * as untypedPdc from "pdc";
import {Future} from "fluture";

type ResultCallback = (err : Error, result : string) => void;

const typedPdc : (
    src : string,
    from : string,
    to : string,
    args : Array<string>,
    opts : {[k : string] : string},
    callback : ResultCallback
) => void = untypedPdc;

export class PandocConversionError extends Error {
    constructor(readonly originalError : Error) {
        super(originalError.message);
    }

    static mk(err : Error) : PandocConversionError {
        return new PandocConversionError(err);
    }
}

function convert(
    src : string,
    from : string,
    to : string,
    args : Array<string>,
    opts? : {[k : string] : string}
) : Future<PandocConversionError, string> {
    return fl.
        node<Error, string>(k => typedPdc(src, from, to, args, opts || {}, k)).
        mapRej(PandocConversionError.mk);
}

function filterPandocJson(json : any, action : pandoc.FilterAction) : any {
    return pandoc.filter(json, action, "html5");
}

const defaultPandocArgs =
    ["--section-divs", "--smart"];

export type Options = {
    pandocArgs : Array<string>;
    filter? : pandoc.FilterAction;
};

export const defaultOptions : Options = {
    pandocArgs: defaultPandocArgs,
};

export function toHtml(
    src : string,
    from : string,
    to : string,
    opts_? : Partial<Options>
) : Future<PandocConversionError, string> {
    const opts : Options = {...defaultOptions, ...opts_};
    const filter = opts.filter;
    if (filter) {
        return convert(src, from, "json", opts.pandocArgs).
            chain(text => fl.encase(JSON.parse)(text).mapRej(PandocConversionError.mk)).
            map(input => JSON.stringify(filterPandocJson(input, filter))).
            chain(
                filtered =>
                    convert(filtered, "json", to, opts.pandocArgs));
    }
    else {
        return convert(src, from, to, opts.pandocArgs);
    }
};
