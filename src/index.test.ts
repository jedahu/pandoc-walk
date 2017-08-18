import * as _match from "lodash-match-pattern";
import * as most from "./most";
import * as realFs from "./fs";
import {FPath} from "ts-refined-path";
import {FileData} from "./index";
import {Path} from "ts-refined-path";
import {Reason} from "./index";
import {Renderer} from "./index";
import {checksum} from "./index";
import {describe} from "./test";
import {isSome} from "fp-ts/lib/Option";
import {left} from "fp-ts/lib/Either";
import {lift} from "ts-refined";
import {right} from "fp-ts/lib/Either";
import {test} from "./test";
import {withFs} from "./test/mockfs";

const _ : any = _match.getLodashModule();

function path(s : string) : Path {
    return lift(s, FPath);
}

const fileData : Array<FileData> = [
    { docFile: path("/a.md"),
      text: "*abc*",
      checksum: checksum("*abc*"),
      outFile: path("/a.html"),
      stampFile: path("/a.stamp"),
      reason: Reason.force
    },
    { docFile: path("/b.org"),
      text: "*abc*",
      checksum: checksum("*abc*"),
      outFile: path("/b.html"),
      stampFile: path("/b.stamp"),
      reason: Reason.force
    }
];

const fileSystem = {
    clean: {
        "/clean.md": "clean",
        "/clean.html": "<p>clean</p>",
        "/clean.stamp": JSON.stringify({
            doc: checksum("clean"),
            out: checksum("<p>clean</p>")
        })
    },
    force: {
        "/force.md": "clean",
        "/force.html": "<p>clean</p>",
        "/force.stamp": JSON.stringify({
            doc: checksum("clean"),
            out: checksum("<p>clean</p>")
        }),
    },
    dirtySrc: {
        "/dirty-src.md": "foo",
        "/dirty-src.html": "<p>bar</p>",
        "/dirty-src.stamp": JSON.stringify({
            doc: checksum("bar"),
            out: checksum("<p>bar</p>")
        }),
    },
    dirtyDest: {
        "/dirty-dest.md": "foo",
        "/dirty-dest.html": "<p>foo</p>",
        "/dirty-dest.stamp": JSON.stringify({
            doc: checksum("foo"),
            out: checksum("<p>bar</p>")
        }),
    },
    missingDest: {
        "/missing-dest.md": "abc",
        "/missing-dest.stamp": JSON.stringify({
            doc: checksum("abc"),
            out: checksum("<p>abc</p>")
        }),
    },
    missingStamp: {
        "/missing-stamp.md": "abc",
        "/missing-stamp.html": "<p>abc</p>"
    }
};

function r(fs : typeof realFs = realFs, force : boolean = false) {
    return Renderer.mk(
        {src: path("/"), dest: path("/"), stamp: path("/")},
        {fs, force});
}

describe("renderFile", () => {
    test("content", async () => {
        const x = await r().renderFile(fileData[0]).promise();
        expect(_match(x, {
            outFile: "/a.html",
            stampFile: "/a.stamp",
            content: /<p><em>abc<\/em><\/p>/,
            "...": ""
        })).toBeNull();
        expect(_match(isSome(x.stamp) && x.stamp.value, {
            doc: _.isString,
            out: _.isString
        })).toBeNull();
    });
});

describe("renderStream", () => {
    test("props", async () => {
        const xs = await
            most.collect(most.rights(r().renderStream(most.from(fileData)))).
                promise();
        expect(xs.length).toBe(2);
        for (const x of xs) {
            expect(x).toHaveProperty("outFile");
            expect(x).toHaveProperty("stampFile");
            expect(x).toHaveProperty("content");
            expect(x).toHaveProperty("stamp");
        }
    });
});

describe("dirtyContent", () => {
    test("clean", () => withFs(fileSystem.clean, async (fs, mfs) => {
        const x = await r(fs).dirtyContent(path("/clean.md")).promise();
        expect(x).toEqual(left("/clean.md"));
    }));
    test("force", () => withFs(fileSystem.force, async (fs, mfs) => {
        const x = await r(fs, true).dirtyContent(path("/force.md")).promise();
        const text = mfs["/force.md"];
        expect(x).toEqual(right({
            text,
            checksum: checksum(text),
            docFile: "/force.md",
            outFile: "/force.html",
            stampFile: "/force.stamp",
            reason: Reason.force
        }));
    }));
    test("dirty source", () => withFs(fileSystem.dirtySrc, async (fs, mfs) => {
        const x = await r(fs).dirtyContent(path("/dirty-src.md")).promise();
        const text = mfs["/dirty-src.md"];
        expect(x).toEqual(right({
            text,
            checksum: checksum(text),
            docFile: "/dirty-src.md",
            outFile: "/dirty-src.html",
            stampFile: "/dirty-src.stamp",
            reason: Reason.stampOrigin
        }));
    }));
    test("dirty destination", () => withFs(fileSystem.dirtyDest, async (fs, mfs) => {
        const x = await r(fs).dirtyContent(path("/dirty-dest.md")).promise();
        const text = mfs["/dirty-dest.md"];
        expect(x).toEqual(right({
            text,
            checksum: checksum(text),
            docFile: "/dirty-dest.md",
            outFile: "/dirty-dest.html",
            stampFile: "/dirty-dest.stamp",
            reason: Reason.stampDestination
        }));
    }));
    test("missing destination", () => withFs(fileSystem.missingDest, async (fs, mfs) => {
        const x = await r(fs).dirtyContent(path("/missing-dest.md")).promise();
        const text = mfs["/missing-dest.md"];
        expect(x).toEqual(right({
            text,
            checksum: checksum(text),
            docFile: "/missing-dest.md",
            outFile: "/missing-dest.html",
            stampFile: "/missing-dest.stamp",
            reason: Reason.missingDestination
        }));
    }));
    test("missing stamp", () => withFs(fileSystem.missingStamp, async (fs, mfs) => {
        const x = await r(fs).dirtyContent(path("/missing-stamp.md")).promise();
        const text = mfs["/missing-stamp.md"];
        expect(x).toEqual(right({
            text,
            checksum: checksum(text),
            docFile: "/missing-stamp.md",
            outFile: "/missing-stamp.html",
            stampFile: "/missing-stamp.stamp",
            reason: Reason.missingStamp
        }));
    }));
});
