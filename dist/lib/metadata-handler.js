"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("./constants");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class Site {
    constructor(rootDirData) {
        this.rootDirData = rootDirData;
    }
    getDirData(absWebPath, curDirData = this.rootDirData) {
        if (absWebPath === curDirData.url) {
            return curDirData;
        }
        for (var childDir of curDirData.directories) {
            var res = this.getDirData(absWebPath, childDir);
            if (res !== null) {
                return res;
            }
        }
        return null;
    }
}
function insertMetaDataToDir(absSiteRoot, dirData) {
    //if dirData's url is not root "/", then remove the first /
    var relPath = dirData.url === "/" ? "" : dirData.url.slice(1, dirData.url.length);
    //replace / in url with appropriate path separator for server
    relPath = relPath.replace("/", path_1.default.sep);
    var absDirPath = relPath === "" ? absSiteRoot : absSiteRoot + path_1.default.sep + relPath;
    var contents = fs_1.default.readdirSync(absDirPath);
    for (var content of contents) {
        //ignore hidden files and folders
        if (content.startsWith(".")) {
            continue;
        }
        var absPathContent = absDirPath + path_1.default.sep + content;
        var lstat = fs_1.default.lstatSync(absPathContent);
        var childUrl = dirData.url === "/" ? "/" + content : dirData.url + "/" + content;
        if (lstat.isDirectory()) {
            var childDirData = {
                pages: [],
                parentDir: dirData,
                url: childUrl,
                directories: [],
                basename: content
            };
            dirData.directories.push(childDirData);
            insertMetaDataToDir(absSiteRoot, childDirData);
        }
        else if (lstat.isFile()) {
            var childFileData = {
                basename: content,
                url: childUrl,
                parentDir: dirData,
                frontMatter: { layout: "" } //temporary
            };
            dirData.pages.push(childFileData);
        }
    }
}
function getMetaDataForSite(absProjectRoot) {
    if (!fs_1.default.existsSync(absProjectRoot)) {
        throw new Error("Path " + absProjectRoot + " does not exist.");
    }
    else if (!fs_1.default.lstatSync(absProjectRoot).isDirectory()) {
        throw new Error("Path " + absProjectRoot + " is not a directory.");
    }
    else if (!path_1.default.isAbsolute(absProjectRoot)) {
        throw new Error("Path " + absProjectRoot + " is not an absolute path.");
    }
    var rootDirData = {
        pages: [],
        parentDir: null,
        url: "/",
        basename: "/",
        directories: [],
    };
    insertMetaDataToDir(absProjectRoot + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.INPUT, rootDirData);
    return new Site(rootDirData);
}
function initGlobalVars(absProjectRoot) {
    var site = getMetaDataForSite(absProjectRoot);
    var GLOBALS = {
        site: site,
        page: site.rootDirData.pages[0]
    };
    printDirData(GLOBALS.site.rootDirData);
    console.log("Testing Site.getDirData()");
    console.log(GLOBALS.site.getDirData("/s"));
}
function printPageData(data, spaces = "|") {
    console.log(spaces + "Page Basename = " + data.basename);
    console.log(spaces + "Page url = " + data.url);
    console.log(spaces + "Page Front Matter = " + JSON.stringify(data.frontMatter));
    console.log(spaces + "Parent Dir Path = " + (data.parentDir === null ? "null" : data.parentDir.url));
    console.log(spaces);
}
function printDirData(data, spaces = "") {
    console.log(spaces + "Parent Dir Path = " + (data.parentDir === null ? "null" : data.parentDir.url));
    console.log(spaces + "Basename = " + data.basename);
    console.log(spaces + "Url = " + data.url);
    console.log(spaces + "Pages = ");
    if (data.pages.length === 0) {
        console.log(spaces + "None");
    }
    else {
        for (var childPage of data.pages) {
            printPageData(childPage, spaces + "|  ");
        }
    }
    console.log(spaces + "Directories: ");
    if (data.directories.length === 0) {
        console.log(spaces + "None");
    }
    else {
        for (var childDir of data.directories) {
            printDirData(childDir, spaces + "|  ");
        }
    }
    console.log(spaces);
}
exports.default = { initGlobalVars };
