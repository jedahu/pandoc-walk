import {Renderer} from "./src";
import {filter} from "./src/ts-demonstrate-filter";

(async () : Promise<void> => {
    const r = Renderer.mk(
        {src: "./doc", dest: "./html"},
        {filter, verbose: true});
    await r.listSourceFiles().forEach(f => console.log("file", f));
    await r.listDirtyFiles().forEach(f => console.log("dirty", f));
    await r.renderFiles().then(
        ({errors, files}) => {
            console.log(`Errors: ${errors}. Files: ${files}.`);
            if (errors > 0) { process.exit(1); }
        },
        err => {
            console.log("Error", err);
            process.exit(1);
        });
})();
