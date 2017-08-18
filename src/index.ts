import * as chokidar from "chokidar";
import * as crypto from "crypto";
import * as fl from "./future";
import * as iots from "io-ts";
import * as klaw from "./klaw";
import * as most from "./most";
import * as pth from "ts-refined-path";
import * as realFs from "./fs";
import * as reduce from "./reduce";
import {Either} from "fp-ts/lib/Either";
import {FPath} from "ts-refined-path";
import {Future} from "./future";
import {Options} from "./render";
import {Option} from "fp-ts/lib/Option";
import {Par} from "./future";
import {Path} from "ts-refined-path";
import {Stream} from "./most";
import {StrictReduction} from "./reduce";
import {concurrentFluture} from "fp-ts-fluture";
import {defaultOptions} from "./render";
import {left} from "fp-ts/lib/Either";
import {liftUnsafe} from "ts-refined";
import {lift} from "ts-refined";
import {none} from "fp-ts/lib/Option";
import {right} from "fp-ts/lib/Either";
import {some} from "fp-ts/lib/Option";
import {toHtml} from "./render";
import {zip} from "./applicative";

const extFilter =
    (path : Path) : boolean =>
    path.endsWith(".md") || path.endsWith(".org");

type TextSum = {
    text : string;
    checksum : string;
};

export const checksum =
    (s : string) : string =>
    crypto.createHash("md5").update(s).digest("hex");

function hashR(algo : string = "md5")
: StrictReduction<crypto.Hash, string, Buffer> {
    return {
        seed: crypto.createHash(algo),
        step: (hash, a) => hash.update(a),
        result: hash => hash.digest("hex")
    };
}

function textR(enc : string = "utf8")
: StrictReduction<Array<Buffer>, string, Buffer> {
    return {
        seed: [],
        step: (xs, a) => {
            xs.push(a);
            return xs;
        },
        result: xs => Buffer.concat(xs).toString(enc)
    };
}

export type Stamp = {
    doc: string;
    out: string;
};

const StampType : iots.Type<Stamp> = iots.interface({
    doc: iots.string,
    out: iots.string
});

type RelevantData = {
    doc : Future<Error, TextSum>;
    outSum : Future<Error, Option<string>>;
    stamp : Future<Error, Option<Stamp>>;
    docFile : Path;
    outFile : Path;
    stampFile : Path;
};

const extFormat : {[k : string] : string} = {
    md: "markdown",
    org: "org"
};

export type RenderPaths = {
    src : Path;
    dest : Path;
    stamp? : Path;
};

type AllPaths = {
    src : Path;
    dest : Path;
    stamp : Path;
};

export type RenderOpts = {
    to : string;
    toExt : string;
    stampExt : string;
    force : boolean;
    hash : boolean;
    fs : typeof realFs;
    concurrent : number;
    verbose : boolean;
} & Options;

export const enum Reason {
    force = "force",
    missingDestination = "missing destination",
    missingStamp = "missing stamp",
    stampOrigin = "different origin stamp",
    stampDestination = "different destination stamp"
}

export type FileData = {
    text : string;
    checksum : string;
    docFile : Path;
    outFile : Path;
    stampFile : Path;
    reason : Reason;
};

export type Rendering = {
    outFile : Path;
    stampFile : Path;
    content : string;
    stamp : Option<Stamp>;
};

export class Renderer {
    private readonly fs : typeof realFs;

    private constructor(
        private readonly paths : AllPaths,
        private readonly opts : RenderOpts
    ) {
        this.paths = allPaths(paths);
        this.opts = allOpts(opts);
        this.fs = this.opts.fs;
    }

    static mk(paths : RenderPaths, opts? : Partial<RenderOpts>) {
        return new Renderer(allPaths(paths), allOpts(opts));
    }

    sourcePaths() : Stream<Path> {
        const {paths} = this;
        return sourceFiles(paths.src).
            map(p => pth.relative(paths.src, p));
    }

    private relevantData(path : Path) : RelevantData {
        const {paths, opts, fs} = this;
        const docOnly = opts.force || !opts.hash;
        const docFile = pth.resolve(paths.src, path);
        const outFile = pth.join(paths.dest, replaceExt(path, opts.toExt));
        const stampFile = pth.join(paths.stamp, replaceExt(path, opts.stampExt));
        const docStream = fs.createReadStream(docFile);
        const outStream = () => fs.createReadStream(outFile);
        const outExists = fs.exists(outFile);
        const doc =
            most.reduct(reduce.strictZip(textR(), hashR()), docStream).
            map(([text, checksum]) => ({text, checksum}));
        const outSum =
            outExists.chain(
                ex =>
                    docOnly || !ex
                    ? fl.of(none)
                    : most.reduct(hashR(), outStream()).
                    map(some).
                    chainRej(_ => fl.of(none)));
        const stamp =
            docOnly
            ? fl.of(none)
            : fs.readJson(stampFile).
                map((x : any) => iots.validate(x, StampType).toOption()).
                chainRej(_ => fl.of(none));
        return {doc, outSum, stamp, docFile, outFile, stampFile};
    }

    dirtyContent = (path : Path)
    : Future<Error, Either<string, FileData>> => {
        const {opts} = this;
        const data = this.relevantData(path);
        const {docFile, outFile, stampFile} = data;

        const clean = left<string, FileData>(docFile);

        const dirty =
            (doc : TextSum, reason : Reason)
            : Either<string, FileData> =>
            right({...doc, reason, docFile, outFile, stampFile});

        const onlyIfDirty = () => {
            return fl.both(data.stamp, data.doc).chain(
                ([stamp, doc]) =>
                    stamp.fold(
                        () => fl.of(dirty(doc, Reason.missingStamp)),
                        st =>
                            doc.checksum === st.doc
                            ? data.outSum.map(
                                os => os.fold(
                                    () => dirty(doc, Reason.missingDestination),
                                    s => s === st.out
                                        ? clean
                                        : dirty(doc, Reason.stampDestination)))
                            : fl.of(dirty(doc, Reason.stampOrigin))));
        }

        return opts.force
            ? data.doc.map(d => dirty(d, Reason.force))
            : onlyIfDirty();
    }

    renderFile = (file : FileData) : Future<Error, Rendering> => {
        const {opts} = this;
        const {docFile, outFile, stampFile} = file;
        const ext = pth.extname(docFile).slice(1);
        const from = extFormat[ext];
        const html = toHtml(file.text, from, opts.to, opts);
        return html.
            mapRej(e => e as Error).
            map(html => {
                const stamp =
                    opts.hash
                    ? some({doc: file.checksum, out: checksum(html)})
                    : none;
                return {outFile, stampFile, content: html, stamp};
            });
    }

    private writeRendering = (r : Rendering) : Future<Error, void> => {
        const {fs} = this;
        return zip(concurrentFluture)(
            Par(fs.outputFile(r.outFile, r.content)),
            Par(r.stamp.fold(
                () => Future.of(undefined),
                s => fs.outputJson(r.stampFile, s)))
        ).sequential.map(_ => undefined);
    }

    private logErr(...args : Array<any>) : void {
        console.log(...args);
    }

    private vlog(...args : Array<any>) : void {
        const {opts} = this;
        if (opts.verbose) {
            console.log(...args);
        }
    }

    private processFile = (path : Path) : Future<Error, boolean> => {
        return this.dirtyContent(path).chain(
            x => x.fold(
                docFile => {
                    this.vlog(`Skipping (no change): ${docFile}`);
                    return fl.of(false);
                },
                dirty => {
                    this.vlog(`Processing (${dirty.reason}): ${dirty.docFile}`);
                    this.vlog("...");
                    return this.renderFile(dirty).
                        chain(this.writeRendering).
                        map(_ => true);
                }));
    }

    private dirtyFiles(files : Stream<Path>)
    : Stream<Future<Error, Either<string, FileData>>> {
        return files.map(this.dirtyContent);
    }

    listDirtyFiles() : Stream<Path> {
        const {paths, opts: {concurrent}} = this;
        const xs =
            most.rights(
                most.par(
                    concurrent,
                    this.dirtyFiles(sourceFiles(paths.src))));
        return most.rights(xs).map(df => df.docFile);
    }

    listSourceFiles() : Stream<Path> {
        const {paths} = this;
        return sourceFiles(paths.src);
    }

    renderStream(data : Stream<FileData>) : Stream<Either<Error, Rendering>> {
        const {opts: {concurrent}} = this;
        return most.par(concurrent, data.map(this.renderFile));
    }

    renderFiles(files? : Stream<Path>)
    : Promise<{errors : number, files : number, skipped: number}> {
        const {paths, opts: {concurrent}} = this;
        files = files || sourceFiles(paths.src);
        const results = most.par(concurrent, files.map(this.processFile));
        return most.reduce(
            ({errors, files, skipped}, x) =>
                x.fold(
                    err => {
                        this.logErr(err);
                        return {errors: errors + 1, files, skipped};
                    },
                    written => {
                        if (written) {
                            this.vlog("done");
                            return {errors, skipped, files: files + 1};
                        }
                        return {errors, files, skipped: skipped + 1};
                    }),
            {errors: 0, files: 0, skipped: 0},
            results
        ).promise();
    }

    watchTree() : void {
        const {paths} = this;
        chokidar.watch(`${paths.src}/**/*.(md|org)`, {
            persistent: true
        }).
            on("add", this.processFile).
            on("change", this.processFile).
            on("error", err => console.error(err));
    }
}

function sourceFiles(srcDir : Path) : Stream<Path> {
    return most.fromReadable(klaw.walk(srcDir, {filter: extFilter})).
        map(i => lift((i as any as klaw.Item).path, FPath)).
        filter(extFilter);
}

function allPaths(paths : RenderPaths) : AllPaths {
    return {
        stamp: pth.join(paths.dest, lift(".stamp", FPath)),
        ...paths
    };
}

function allOpts(opts : Partial<RenderOpts> | undefined) : RenderOpts {
    return {
        ...defaultOptions,
        to: "html5",
        toExt: "html",
        stampExt: "stamp",
        force: false,
        hash: true,
        fs: realFs,
        concurrent: 4,
        verbose : false,
        ...opts || {}
    };
};

export function replaceExt<A>(path : Path<A>, ext : string) : Path<A> {
    return liftUnsafe<string, FPath & A>(
        pth.join(
            pth.dirname(path),
            liftUnsafe<string, FPath>(
                pth.basename(path, pth.extname(path)) + "." + ext)));
}
