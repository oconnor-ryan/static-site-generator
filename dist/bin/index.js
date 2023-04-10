#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const build_site_1 = __importDefault(require("../lib/build-site"));
const new_site_1 = __importDefault(require("../lib/new-site"));
const serve_site_1 = __importDefault(require("../lib/serve-site"));
const metadata_handler_1 = __importDefault(require("../lib/metadata-handler"));
const path_1 = __importDefault(require("path"));
const constants_1 = require("../lib/constants");
const SUB_COMMANDS = {
    new: createNewSite,
    build: buildSite,
    serve: serveSite,
    help: printHelp
};
function isSubCommand(cmd) {
    return SUB_COMMANDS.hasOwnProperty(cmd);
}
function getAbsDir(relativeDir) {
    if (path_1.default.isAbsolute(relativeDir)) {
        return relativeDir;
    }
    return path_1.default.resolve(process.cwd(), relativeDir);
}
function serveSite(args) {
    buildSite(args);
    var inputPath = "";
    if (args.length !== 0) {
        inputPath = args[0];
    }
    // run a nodejs server to serve the files in the OUTPUT
    serve_site_1.default.serveSite(getAbsDir(inputPath) + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.OUTPUT);
}
function createNewSite(args) {
    var inputPath = "";
    if (args.length !== 0) {
        inputPath = args[0];
    }
    new_site_1.default.setupNewSite(getAbsDir(inputPath));
}
function buildSite(args) {
    var inputPath = "";
    if (args.length !== 0) {
        inputPath = args[0];
    }
    metadata_handler_1.default.initGlobalVars(getAbsDir(inputPath));
    build_site_1.default.buildSite(getAbsDir(inputPath));
}
function printHelp(args) {
    console.log("Help me.");
}
/******************************/
/*******   Main Script  *******/
/******************************/
//first 2 args are node and staticsitegen, so these can be ignored
const argv = process.argv.slice(2);
if (argv.length == 0) {
    printHelp([]);
}
else if (isSubCommand(argv[0])) {
    SUB_COMMANDS[argv[0]].call(this, argv.slice(1));
}
else {
    console.error("Invalid command!");
    printHelp([]);
}
