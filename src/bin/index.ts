#!/usr/bin/env node
import site_builder from "../lib/build-site";
import new_site from "../lib/new-site";
import serve_site from "../lib/serve-site";
import metadataHandler from "../lib/metadata-handler";

import path from 'path';
import { RESERVED_DIR_NAMES } from "../lib/constants";

const SUB_COMMANDS: any = {
    new: createNewSite,
    build: buildSite,
    serve: serveSite,
    help: printHelp
};

function isSubCommand(cmd: string) {
    return SUB_COMMANDS.hasOwnProperty(cmd);
}

function getAbsDir(relativeDir: string) {
    if(path.isAbsolute(relativeDir)) {
        return relativeDir;
    } 
    return path.resolve(process.cwd(), relativeDir);
}

function serveSite(args: Array<string>) {
    buildSite(args);
    var inputPath = "";
    if(args.length !== 0) {
        inputPath = args[0];
    } 
    // run a nodejs server to serve the files in the OUTPUT
    serve_site.serveSite(getAbsDir(inputPath) + path.sep + RESERVED_DIR_NAMES.OUTPUT);
}

function createNewSite(args: Array<string>) {
    var inputPath = "";
    if(args.length !== 0) {
        inputPath = args[0];
    } 
    new_site.setupNewSite(getAbsDir(inputPath));
}

function buildSite(args: Array<string>) {
    var inputPath = "";
    if(args.length !== 0) {
        inputPath = args[0];
    } 
    metadataHandler.initGlobalVars(getAbsDir(inputPath));
    site_builder.buildSite(getAbsDir(inputPath));
}

function printHelp(args: Array<string>) {
    console.log("Help me.");
}


/******************************/
/*******   Main Script  *******/
/******************************/

//first 2 args are node and staticsitegen, so these can be ignored
const argv = process.argv.slice(2);

if(argv.length == 0) {
    printHelp([]);
} else if(isSubCommand(argv[0])) {
    SUB_COMMANDS[argv[0]].call(this, argv.slice(1));
} else {
    console.error("Invalid command!");
    printHelp([]);
}


