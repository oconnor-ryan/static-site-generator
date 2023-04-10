import {RESERVED_DIR_NAMES} from "./constants";
import fs from 'fs';
import path from 'path';


interface PageGlobals {
    page: PageData
    site: Site
}


interface FrontMatter {
    layout: string,
    [userDefinedAttribs: string] : any
}

//if parentDir is null, then that object is the root directory
interface DirData {
    parentDir: DirData | null,
    url: string,
    basename: string,
    directories: Array<DirData>,
    pages: Array<PageData>
}
interface PageData {
    parentDir: DirData,
    basename: string,
    url: string
    frontMatter: FrontMatter
}

class Site {
    public readonly rootDirData: DirData;
    constructor(rootDirData: DirData) {
        this.rootDirData = rootDirData;
    }

    public getDirData(absWebPath: string, curDirData: DirData = this.rootDirData): DirData | null {
        if(absWebPath === curDirData.url) {
            return curDirData;
        }

        for(var childDir of curDirData.directories) {
            var res = this.getDirData(absWebPath, childDir);
            if(res !== null) {
                return res;
            }
        }
        return null;
    }
    
}

function insertMetaDataToDir(absSiteRoot: string, dirData: DirData) {
    //if dirData's url is not root "/", then remove the first /
    var relPath = dirData.url === "/" ? "" : dirData.url.slice(1, dirData.url.length);
    //replace / in url with appropriate path separator for server
    relPath = relPath.replace("/", path.sep);

    var absDirPath = relPath === "" ? absSiteRoot : absSiteRoot + path.sep + relPath;
    var contents = fs.readdirSync(absDirPath);
    for(var content of contents) {
        //ignore hidden files and folders
        if(content.startsWith(".")) {
            continue;
        }
        var absPathContent = absDirPath + path.sep + content;
        var lstat = fs.lstatSync(absPathContent);
        var childUrl = dirData.url === "/" ? "/" + content : dirData.url + "/" + content;
        
        if(lstat.isDirectory()) {
            var childDirData: DirData = {
                pages: [],
                parentDir: dirData,
                url: childUrl,
                directories: [],
                basename: content
            };
            dirData.directories.push(childDirData);
            insertMetaDataToDir(absSiteRoot, childDirData);
        } else if(lstat.isFile()) {
            var childFileData: PageData = {
                basename: content,
                url: childUrl,
                parentDir: dirData,
                frontMatter: {layout: ""} //temporary
            };
            dirData.pages.push(childFileData);
        }
    }

}

function getFrontMatter() {
    
}


function getMetaDataForSite(absProjectRoot: string) : Site {
    if(!fs.existsSync(absProjectRoot)) {
        throw new Error("Path " + absProjectRoot + " does not exist.");
    } else if(!fs.lstatSync(absProjectRoot).isDirectory()) {
        throw new Error("Path " + absProjectRoot + " is not a directory.");
    } else if(!path.isAbsolute(absProjectRoot)) {
        throw new Error("Path " + absProjectRoot + " is not an absolute path.");
    }

    var rootDirData: DirData = {
        pages: [],
        parentDir: null,
        url: "/",
        basename: "/",
        directories: [],
    };

    insertMetaDataToDir(absProjectRoot + path.sep + RESERVED_DIR_NAMES.INPUT, rootDirData);
    return new Site(rootDirData);
}

function initGlobalVars(absProjectRoot: string) {
    var site = getMetaDataForSite(absProjectRoot);
    var GLOBALS: PageGlobals = {
        site: site,
        page: site.rootDirData.pages[0]
    };
    printDirData(GLOBALS.site.rootDirData);
    console.log("Testing Site.getDirData()");
    console.log(GLOBALS.site.getDirData("/s"));
}


function printPageData(data: PageData, spaces: string = "|") {
    console.log(spaces + "Page Basename = " + data.basename);
    console.log(spaces + "Page url = " + data.url);
    console.log(spaces + "Page Front Matter = " + JSON.stringify(data.frontMatter));
    console.log(spaces + "Parent Dir Path = " + (data.parentDir === null ? "null" : data.parentDir.url));
    console.log(spaces);
}

function printDirData(data: DirData, spaces: string = "") {
    console.log(spaces + "Parent Dir Path = " + (data.parentDir === null ? "null" : data.parentDir.url));
    console.log(spaces + "Basename = " + data.basename);
    console.log(spaces + "Url = " + data.url);
    console.log(spaces + "Pages = ");
    if(data.pages.length === 0) {
        console.log(spaces + "None");
    } else {
        for(var childPage of data.pages) {
            printPageData(childPage, spaces + "|  ");
        }
    }
    console.log(spaces + "Directories: ");
    if(data.directories.length === 0) {
        console.log(spaces + "None");
    } else {
        for(var childDir of data.directories) {
            printDirData(childDir, spaces + "|  ");
        }
    }
    
    console.log(spaces);
}


export default {initGlobalVars};