"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//third party dependencies
const sass_1 = __importDefault(require("sass"));
const marked_1 = require("marked");
const ejs_1 = __importDefault(require("ejs"));
//first party dependencies
const constants_1 = require("./constants");
// node's standard modiles
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
var PROJECT_ROOT_DIR = "";
/**
 * Returns a JSON object containing the JSON object from the JSON string at the start of str and the
 * portion of str that did not make up the JSON string.
 * Returns NULL if there is no valid JSON string at the start of str or if the JSON was never closed.
 * @param {string} str - a string with the json front matter.
 * @returns {{json: any, remainingStr: string} | null}
 */
function parseJSONFrontMatter(str) {
    var contents = str.split('\n');
    var startedJson = false;
    var jsonStartLine = -1;
    var jsonEndLine = -1;
    var index = 0;
    var stack = [];
    while (index < contents.length) {
        var line = contents[index];
        for (let i = 0; i < line.length; i++) {
            var char = line.charAt(i);
            if (char === "{") {
                stack.push(char);
                if (!startedJson) {
                    jsonStartLine = index;
                }
                startedJson = true;
            }
            //if character is not whitespace and json {} has not been made
            else if (char.trim() !== '' && !startedJson) {
                //error: all markdown files must start with json
                return null;
            }
            else if (char === "}") {
                stack.pop();
                //end of json
                if (stack.length === 0) {
                    jsonEndLine = index;
                    break;
                }
            }
        }
        index++;
        //if end of json was found
        if (jsonEndLine !== -1) {
            break;
        }
    }
    //error: json front matter was never closed.
    if (jsonEndLine === -1) {
        return null;
    }
    var jsonString = contents.splice(jsonStartLine, jsonEndLine - jsonStartLine + 1).join("");
    try {
        var json = JSON.parse(jsonString);
        return { json: json, remainingStr: contents.join("\n") };
    }
    catch (err) {
        return null;
    }
}
/**
 * Retrieve the JSON front matter from the top of the markdown file, then parse the
 * rest of the file as a markdown file.
 * @param {String} absFilePath - absolute path name of existing markdown or html file
 * @returns {{html: String, json: Object | null}} the parsed HTML from the markdown file and a JSON of the front matter in the markdown file.
 */
function parseMarkdownToHTML(absFilePath) {
    if (!path_1.default.isAbsolute(absFilePath)) {
        throw new Error("Path " + absFilePath + " is not absolute.");
    }
    const file = fs_1.default.readFileSync(absFilePath, { encoding: 'utf-8' });
    const res = parseJSONFrontMatter(file);
    var htmlOutput = "";
    //if there was front matter in markdown file
    if (res !== null) {
        try {
            htmlOutput = marked_1.marked.parse(ejs_1.default.render(res.remainingStr, {}, { root: path_1.default.dirname(absFilePath) }));
            //console.log(res.json.layout);
            //console.log(htmlOutput);
        }
        catch (err) {
            throw new Error("Markdown at " + absFilePath + " failed to parse." + err);
        }
    }
    //if there was no front matter, convert the entire file to HTML
    else {
        htmlOutput = marked_1.marked.parse(ejs_1.default.render(file, {}, { root: path_1.default.dirname(absFilePath) }));
    }
    return { html: htmlOutput, json: res === null ? null : res.json };
}
/**
 *
 * @param {String} htmlStr - the HTML code that will be placed in the <%- content -%> section of the .ejs layout
 * @param {Object} json - the front matter of the webpage
 * @param {Array<String>} nested_layout_list - this is only used for recursion; never insert a parameter here.
 * @returns {String} - the raw HTML code that will be put on a web page with the layout specified in the json parameter
 */
function insertHTMLContentInLayout(htmlStr, json, nested_layout_list = []) {
    if (json === null || !json.hasOwnProperty('layout')) {
        return ejs_1.default.render(htmlStr);
    }
    const layoutFilename = PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.LAYOUT + path_1.default.sep + json.layout + ".ejs";
    const layoutFile = fs_1.default.readFileSync(layoutFilename, { encoding: 'utf-8' });
    var res = parseJSONFrontMatter(layoutFile);
    //base case, if no front matter is in layout file or there is no layout property
    if (res === null || !res.json.hasOwnProperty('layout')) {
        const outputHTML = ejs_1.default.render(layoutFile, {
            content: htmlStr,
            site: {
                directories: ['temporary', 'metadata', 'here']
            },
            title: json.title
        }, {
            root: PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.PARTIALS //requires this for include in ejs to work
        });
        return outputHTML;
    }
    //if there is front matter in layout file and it references another layout, then the HTML formed
    //by inserting content into the currrent layout becomes the content of the parent layout.
    //This function will continue adding content to the parent layout until the current layout
    //does not reference another layout
    //if the current layout references a layout that was aleady used, then this
    // recursive function will never end unless this is caught
    if (nested_layout_list.includes(res.json.layout)) {
        nested_layout_list.push(res.json.layout);
        throw new Error("A layout cannot have a layout of itself. Here's every parent layout: [" +
            nested_layout_list.join(", ") + "]\n");
    }
    //add current layout to the list of parent layouts
    nested_layout_list.push(json.layout);
    const outputHTML = ejs_1.default.render(res.remainingStr, {
        content: htmlStr,
        site: {
            directories: ['temporary', 'metadata', 'here']
        }
    });
    return insertHTMLContentInLayout(outputHTML, res.json, nested_layout_list);
}
function parseMarkdownAndHTMLToBuildDir(absFilePath) {
    var absInputDirPath = PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.INPUT;
    var relativeToInputDirPath = path_1.default.relative(absInputDirPath, absFilePath);
    var res = parseMarkdownToHTML(absInputDirPath + path_1.default.sep + relativeToInputDirPath);
    //if there is no front matter in markdown file, do not process it into an html file and just output it as is.
    if (res.json === null) {
        parseMiscFileToBuildDir(absFilePath);
        return;
    }
    var htmlOutput = insertHTMLContentInLayout(res.html, res.json);
    var outputFilePath = PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.OUTPUT + path_1.default.sep + relativeToInputDirPath;
    //replace extension with .html, even if prev extension was .htm
    outputFilePath = outputFilePath.slice(0, outputFilePath.lastIndexOf(".")) + ".html";
    fs_1.default.writeFileSync(outputFilePath, htmlOutput);
}
function parseMiscFileToBuildDir(absFilePath) {
    var absInputDirPath = PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.INPUT;
    var relativeToInputDirPath = path_1.default.relative(absInputDirPath, absFilePath);
    var outputFilePath = PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.OUTPUT + path_1.default.sep + relativeToInputDirPath;
    fs_1.default.writeFileSync(outputFilePath, fs_1.default.readFileSync(absInputDirPath + path_1.default.sep + relativeToInputDirPath));
}
function parseSassToBuildDir(absFilePath) {
    var absInputDirPath = PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.INPUT;
    var relativeToInputDirPath = path_1.default.relative(absInputDirPath, absFilePath);
    var sassLoadPaths = [PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.SASS];
    var result = sass_1.default.compile(absFilePath, { loadPaths: sassLoadPaths });
    var absOutputPath = PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.OUTPUT + path_1.default.sep + relativeToInputDirPath;
    //replace file extension with .css
    absOutputPath = absOutputPath.slice(0, absOutputPath.lastIndexOf(".")) + ".css";
    fs_1.default.writeFileSync(absOutputPath, result.css);
}
function processDirectory(curAbsDirectory) {
    if (!path_1.default.isAbsolute(curAbsDirectory)) {
        throw new Error("Path " + curAbsDirectory + " is not absolute");
    }
    var dirContents = fs_1.default.readdirSync(curAbsDirectory);
    for (var content of dirContents) {
        //ignore hidden files or folders starting with . (ex: .npm, .git, .DS_Store)
        if (content.startsWith(".", 0)) {
            continue;
        }
        var absPathContent = curAbsDirectory + path_1.default.sep + content;
        var lstat = fs_1.default.lstatSync(absPathContent);
        if (lstat.isDirectory()) {
            var newDirectoryRelPath = path_1.default.sep + path_1.default.relative(PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.INPUT, absPathContent);
            //must create directory in output dir before files are written inside that directory
            fs_1.default.mkdirSync(PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.OUTPUT + newDirectoryRelPath);
            processDirectory(PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.INPUT + newDirectoryRelPath);
        }
        else if (lstat.isFile()) {
            var ext = path_1.default.extname(content);
            switch (ext) {
                case ".md":
                case ".markdown":
                case ".html":
                case ".htm":
                    parseMarkdownAndHTMLToBuildDir(absPathContent);
                    break;
                case ".scss":
                case ".sass":
                    parseSassToBuildDir(absPathContent);
                    break;
                default:
                    parseMiscFileToBuildDir(absPathContent);
            }
        }
    }
}
function clearBuildDir(abs_dir) {
    if (!path_1.default.isAbsolute(abs_dir)) {
        throw new Error("Path " + abs_dir + " is not absolute!");
    }
    var buildDir = abs_dir + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.OUTPUT;
    var contents = fs_1.default.readdirSync(buildDir);
    for (var content of contents) {
        var absPathContent = buildDir + path_1.default.sep + content;
        var lstat = fs_1.default.lstatSync(absPathContent);
        if (lstat.isDirectory()) {
            //recursively delete directory and all of its contents
            fs_1.default.rmSync(absPathContent, { recursive: true });
        }
        else {
            //delete files and symbolic links
            fs_1.default.unlinkSync(absPathContent);
        }
    }
}
function buildSite(abs_dir) {
    if (!fs_1.default.existsSync(abs_dir)) {
        throw new Error("The directory " + abs_dir + " does not exist.");
    }
    else if (!path_1.default.isAbsolute(abs_dir)) {
        throw new Error("Path " + abs_dir + " is not absolute.");
    }
    else if (!fs_1.default.lstatSync(abs_dir).isDirectory()) {
        throw new Error("The path " + abs_dir + " is not a directory.");
    }
    clearBuildDir(abs_dir);
    PROJECT_ROOT_DIR = abs_dir;
    var dirContents = fs_1.default.readdirSync(PROJECT_ROOT_DIR);
    for (var content of dirContents) {
        var lstat = fs_1.default.lstatSync(PROJECT_ROOT_DIR + path_1.default.sep + content);
        if (lstat.isDirectory()) {
            if (content === constants_1.RESERVED_DIR_NAMES.INPUT) {
                processDirectory(PROJECT_ROOT_DIR + path_1.default.sep + constants_1.RESERVED_DIR_NAMES.INPUT);
            }
        }
    }
}
exports.default = { buildSite };
