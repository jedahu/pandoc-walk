import {describe, test} from "./test";
import {toHtml} from "./render";
import {filter} from "./pantomime-filter";

describe("code", () => {
    test("non-module", async () => {
        const html = await toHtml(`
~~~ js
console.log("test");
~~~
`, "markdown", "html5", {filter}).promise();
        expect(html.trim()).toMatch(/<div.*?<pre.*?<code/);
    });
    test("module markdown", async () => {
        const html = await toHtml(`
~~~ {.ts module=abc}
console.log("test");
~~~
`, "markdown", "html5", {filter}).promise();
        expect(html.trim()).
            toMatch(
                /<h6[^]*?data-ts-demo-module="abc[^]*?<span>abc\.ts[^]*?<div[^]*?<pre[^]*?<code/);
    });

    test("module org", async () => {
        const html = await toHtml(`
#+BEGIN_SRC ts :module abc
console.log("test");
#+END_SRC
`, "org", "html5", {filter}).promise();
        expect(html.trim()).
            toMatch(
                /<h6[^]*?data-ts-demo-module="abc[^]*?<span>abc\.ts[^]*?<div[^]*?<pre[^]*?<code/);
    });

    test("check markdown", async () => {
        const html = await toHtml(`
~~~ {.yaml check-module=abc}
foo: |
  /abc/
~~~
`, "markdown", "html5", {filter}).promise();
        expect(html.trim()).not.toMatch(/<pre/);
    });

    test("input org", async () => {
        const html = await toHtml(`
#+BEGIN_SRC yaml :input-module abc
foo: bar
#+END_SRC
`, "org", "html5", {filter}).promise();
        expect(html.trim()).not.toMatch(/<pre/);
    });
});
