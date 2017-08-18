import * as pandoc from "pandoc-filter";
import {describe} from "./test";
import {test} from "./test";
import {toHtml} from "./render";

describe("smoke", () => {
    test("markdown", async () => {
        const html = await toHtml("*abc*", "markdown", "html5").promise();
        expect(html.trim()).toBe("<p><em>abc</em></p>");
    });
    test("org", async () => {
        const html = await toHtml("*abc*", "org", "html5").promise();
        expect(html.trim()).toBe("<p><strong>abc</strong></p>");
    });
    test("filter", async () => {
        const html = await toHtml("*abc*", "markdown", "html5", {
            filter: (key, value, _format, _meta) =>
                key === "Emph"
                ? pandoc.Strong(value as pandoc.EltMap["Emph"])
                : undefined
        }).promise();
        expect(html.trim()).toBe("<p><strong>abc</strong></p>");
    });
});
