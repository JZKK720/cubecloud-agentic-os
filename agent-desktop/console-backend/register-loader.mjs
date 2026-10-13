// register-loader.mjs — registers resolve-ts-loader via module.register
// (the modern hooks API; --loader + --experimental-loader are deprecated).

import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./resolve-ts-loader.mjs", pathToFileURL(import.meta.filename));