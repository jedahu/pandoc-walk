import * as fl from "./future";
import * as most from "./most";
import * as nodeFs from "fs";
import * as pth from "path";
import {Future} from "./future";
import {Stream} from "./most";

export function exists(path : string) : Future<never, boolean> {
    return new Future((_, res) => nodeFs.exists(path, res));
}

export function createReadStream(path : string) : Stream<Buffer> {
    return most.fromReadable(nodeFs.createReadStream(path));
}

function hierarchy(path : string) : Array<string> {
    return path.split("/").reduce((paths, x) => {
        if (paths.length === 0 && x !== "") {
            paths.push(x);
        }
        else if (x !== ""){
            const last = paths[paths.length - 1];
            paths.push(pth.join(last, x));
        }
        return paths;
    }, [] as Array<string>);
}

export function ensureDir(path : string) : Future<Error, void> {
    return fl.tryP<Error, void>(async () => {
        for (const p of hierarchy(path)) {
            const exists = await new Promise(res => nodeFs.exists(p, res));
            if (!exists) {
                await new Promise(
                    (res, rej) =>
                        nodeFs.mkdir(p, undefined, err => {
                            if (err) { rej(err); } else { res(); }
                        }));
            }
        }
    });
}

export function outputFile(path : string, content : string)
: Future<Error, void> {
    return ensureDir(pth.dirname(path)).chain(_ => {
        return fl.node(k => nodeFs.writeFile(path, content, "utf8", k));
    });
}

export function readJson(path : string) : Future<Error, any> {
    return fl.node<Error, string>(k => nodeFs.readFile(path, "utf8", k)).
        chain(s => fl.encase(JSON.parse, s));
}

export function outputJson(path : string, content : any) : Future<Error, void> {
    return fl.encase<Error, string, void>(
        () => JSON.stringify(content), undefined)
        .chain(s => outputFile(path, s));
}
