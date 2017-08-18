import * as fl from "../future";
import * as most from "../most";
import * as realFs from "../fs";
import {Future} from "../future";
import {Stream} from "../most";

export type MockFs = {[path : string] : string};

export function mockFs(files : MockFs) : typeof realFs {
    return {
        exists(path : string) : Future<never, boolean> {
            return fl.of(files[path] !== undefined);
        },
        createReadStream(path : string) : Stream<Buffer> {
            return most.of(Buffer.from(files[path]));
        },
        ensureDir(path : string) : Future<Error, void> {
            return fl.of(undefined);
        },
        outputFile(path : string, content : string) : Future<Error, void> {
            return fl.encase(() => { files[path] = content }, undefined);
        },
        readJson(path : string) : Future<Error, any> {
            return fl.encase(JSON.parse, files[path]);
        },
        outputJson(path : string, content : string) : Future<Error, void> {
            return fl.encase(() => {
                files[path] = JSON.stringify(content);
            }, undefined);
        }
    };
}

export async function withFs<A>(
    conf : MockFs,
    f : (fs : typeof realFs, data : MockFs) => Promise<A>
) : Promise<A> {
    const copy : MockFs = {};
    for (const k of Object.keys(conf)) {
        copy[k] = conf[k];
    }
    return await f(mockFs(copy), copy);
};
