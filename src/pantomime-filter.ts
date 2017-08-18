import * as pandoc from "pandoc-filter";
import {AttrList} from "pandoc-filter";

const _tsDemoAttrs =
        ["module", "hide", "invisible", "check-module", "input-module"];

const tsDemoAttrs =
    [..._tsDemoAttrs, _tsDemoAttrs.map(a => `rundoc-${a}`)];

const attrMap = (list : Array<[string, string]>) : {[k : string] : string} => {
    const obj : {[k : string] : string} = {};
    for (const [k, v] of list) {
        obj[k] = v;
    }
    return obj;
};

export const filter : pandoc.FilterAction =
    (key, value, format, meta) => {
        if (key !== "CodeBlock") {
            return undefined;
        }
        const [[id, clazz, kvs], str] = value as pandoc.EltMap["CodeBlock"];
        const [lang, ...classes] = clazz;
        const attrs = attrMap(kvs);
        const attr = (name : string) => attrs[name] || attrs[`rundoc-${name}`];
        const module = attr("module");
        const hide = attr("hide");
        const invisible = attr("invisible");
        const check = attr("check-module");
        const input = attr("input-module");
        const isTest = lang === "yaml" && (check || input);
        if (isTest) {
            return [];
        }
        if (!module || !["ts", "typescript"].includes(lang)) {
            return undefined;
        }
        const secId = `ts-demo-module-sec-${id}`;
        const closed = hide ? ["ts-demo-expander-closed"] : [];
        const invis : AttrList = invisible ? [["style", "display: none"]] : [];
        const secClasses =
            ["ts-demo-module-sec", "ts-demo-expander", ...closed];
        const secAttrs : AttrList =
            [["data-ts-demo-module", module], ...invis];
        const headClasses = ["ts-demo-module-title", "ts-demo-expander-toggle"];
        const headAttrs : AttrList = [["data-ts-demo-module", module]];
        const codeClasses = ["ts-demo-module-panel", "ts-demo-expander-content"];
        const cbAttrs = kvs.filter(([k, _]) => !tsDemoAttrs.includes(k))
        return pandoc.Div([secId, secClasses, secAttrs], [
            pandoc.Header(6, ["", headClasses, headAttrs], [
                pandoc.Span(["", [], []], [pandoc.Str(`${module}.ts`)])
            ]),
            pandoc.Div(["", codeClasses, []], [
                pandoc.CodeBlock([id, classes, cbAttrs], str)
            ])
        ]);
    };
