import * as K from "klaw";

export const walk
: (root : string, opts? : K.Options)
    => NodeJS.ReadableStream
    = K as any;

export {Item, QueueMethod, Options, Event, Walker} from "klaw";
