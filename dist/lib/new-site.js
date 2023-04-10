"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//first party dependencies
const constants_1 = require("./constants");
//import { buildSite } from "./build-site";
//node js modules
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function setupExampleSite(absDir) {
}
function setupNewSite(absDir) {
    if (!path_1.default.isAbsolute(absDir)) {
        throw new Error("Path " + absDir + " is not absolute.");
    }
    if (fs_1.default.existsSync(absDir)) {
        if (!fs_1.default.lstatSync(absDir).isDirectory()) {
            throw new Error("Path " + absDir + " is not a directory.");
        }
        var contents = fs_1.default.readdirSync(absDir);
        if (contents.length !== 0) {
            throw new Error("Directory " + absDir + " must not exist or must be empty to create a new site.");
        }
    }
    else {
        //if absDir has non-existing parent directories, recursively create each non-existing parent directory.
        fs_1.default.mkdirSync(absDir, { recursive: true });
    }
    var directories = Object.values(constants_1.RESERVED_DIR_NAMES);
    //create needed directories
    for (var dir of directories) {
        fs_1.default.mkdirSync(absDir + path_1.default.sep + dir);
    }
}
exports.default = { setupNewSite, setupExampleSite };
