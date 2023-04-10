//third party dependencies
import sass from 'sass';
import { marked } from 'marked';
import ejs from 'ejs';

//first party dependencies
import { RESERVED_DIR_NAMES } from "./constants";

// node's standard modiles
import path from 'path';
import fs from 'fs';


var PROJECT_ROOT_DIR = "";


/**
 * Returns a JSON object containing the JSON object from the JSON string at the start of str and the 
 * portion of str that did not make up the JSON string. 
 * Returns NULL if there is no valid JSON string at the start of str or if the JSON was never closed.
 * @param {string} str - a string with the json front matter.
 * @returns {{json: any, remainingStr: string} | null}
 */
function parseJSONFrontMatter(str: string): { json: any; remainingStr: string; } | null {
    var contents = str.split('\n');
    
    var startedJson = false;
    var jsonStartLine = -1;
    var jsonEndLine = -1;
    var index = 0;
    var stack: Array<string> = [];
    
    while(index < contents.length) {
        var line = contents[index];
        for(let i = 0; i < line.length; i++) {
            var char = line.charAt(i);
            if(char === "{") {
                stack.push(char);
                if(!startedJson) {
                    jsonStartLine = index;
                }
                startedJson = true;
            }
            //if character is not whitespace and json {} has not been made
            else if(char.trim() !== '' && !startedJson) {
                //error: all markdown files must start with json
                return null;
            }
            else if(char === "}") {
                stack.pop();
                //end of json
                if(stack.length === 0) {
                    jsonEndLine = index;
                    break;
                }
            } 
        }
        index++;
        //if end of json was found
        if(jsonEndLine !== -1) {
            break;
        } 
    }    

    //error: json front matter was never closed.
    if(jsonEndLine === -1) {
        return null;
    }

    var jsonString = contents.splice(jsonStartLine, jsonEndLine - jsonStartLine + 1).join("");

    try {
        var json = JSON.parse(jsonString);
        return {json: json, remainingStr: contents.join("\n")};
    } catch(err) {
        return null;
    }
}

/**
 * Retrieve the JSON front matter from the top of the markdown file, then parse the
 * rest of the file as a markdown file.
 * @param {String} absFilePath - absolute path name of existing markdown or html file
 * @returns {{html: String, json: Object | null}} the parsed HTML from the markdown file and a JSON of the front matter in the markdown file.
 */
function parseMarkdownToHTML(absFilePath: string) : {html: string, json: Object | null} {
    if(!path.isAbsolute(absFilePath)) {
        throw new Error("Path " + absFilePath + " is not absolute.");
    }
    const file = fs.readFileSync(absFilePath, { encoding: 'utf-8' });
    const res = parseJSONFrontMatter(file);
    var htmlOutput = "";
    
    //if there was front matter in markdown file
    if(res !== null) {
        try {
            htmlOutput = marked.parse(ejs.render(res.remainingStr, {}, {root: path.dirname(absFilePath)}));
            //console.log(res.json.layout);
            //console.log(htmlOutput);
        } catch(err) {
            throw new Error("Markdown at " + absFilePath + " failed to parse." + err);
        }
    } 
    //if there was no front matter, convert the entire file to HTML
    else {
        htmlOutput = marked.parse(ejs.render(file, {}, {root: path.dirname(absFilePath)}));
    }

    return {html: htmlOutput, json: res === null ? null : res.json};
}

/**
 * 
 * @param {String} htmlStr - the HTML code that will be placed in the <%- content -%> section of the .ejs layout
 * @param {Object} json - the front matter of the webpage
 * @param {Array<String>} nested_layout_list - this is only used for recursion; never insert a parameter here.
 * @returns {String} - the raw HTML code that will be put on a web page with the layout specified in the json parameter
 */
function insertHTMLContentInLayout(htmlStr: string, json: any, nested_layout_list: Array<string> = []) : string {
    if(json === null || !json.hasOwnProperty('layout')) {
        return ejs.render(htmlStr);
    }
    const layoutFilename = PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.LAYOUT + path.sep + json.layout + ".ejs";
    const layoutFile = fs.readFileSync(layoutFilename, {encoding: 'utf-8'});
    var res = parseJSONFrontMatter(layoutFile);

    //base case, if no front matter is in layout file or there is no layout property
    if(res === null || !res.json.hasOwnProperty('layout')) {
        const outputHTML = ejs.render(
            layoutFile, 
            {
                content: htmlStr,
                site: {
                    directories: ['temporary', 'metadata', 'here']
                },
                title: json.title
            },
            {
                root: PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.PARTIALS //requires this for include in ejs to work
            }
        );
        return outputHTML;
    } 
    //if there is front matter in layout file and it references another layout, then the HTML formed
    //by inserting content into the currrent layout becomes the content of the parent layout.
    //This function will continue adding content to the parent layout until the current layout
    //does not reference another layout

    //if the current layout references a layout that was aleady used, then this
    // recursive function will never end unless this is caught
    if(nested_layout_list.includes(res.json.layout)) {
        nested_layout_list.push(res.json.layout);
        throw new Error("A layout cannot have a layout of itself. Here's every parent layout: [" +
            nested_layout_list.join(", ") + "]\n");
    }
    //add current layout to the list of parent layouts
    nested_layout_list.push(json.layout);

    const outputHTML = ejs.render(res.remainingStr, {
        content: htmlStr,
        site: {
            directories: ['temporary', 'metadata', 'here']
        }
    });
    return insertHTMLContentInLayout(outputHTML, res.json, nested_layout_list);
}


function parseMarkdownAndHTMLToBuildDir(absFilePath: string) {
    var absInputDirPath = PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.INPUT;
    var relativeToInputDirPath = path.relative(absInputDirPath, absFilePath);
    var res = parseMarkdownToHTML(absInputDirPath + path.sep + relativeToInputDirPath);
    //if there is no front matter in markdown file, do not process it into an html file and just output it as is.
    if(res.json === null) {
        parseMiscFileToBuildDir(absFilePath);
        return;
    }
    var htmlOutput = insertHTMLContentInLayout(res.html, res.json);

    var outputFilePath = PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.OUTPUT + path.sep + relativeToInputDirPath;
    //replace extension with .html, even if prev extension was .htm
    outputFilePath = outputFilePath.slice(0, outputFilePath.lastIndexOf(".")) + ".html";
    fs.writeFileSync(outputFilePath, htmlOutput);
}

function parseMiscFileToBuildDir(absFilePath: string) {
    var absInputDirPath = PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.INPUT;
    var relativeToInputDirPath = path.relative(absInputDirPath, absFilePath);
    var outputFilePath = PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.OUTPUT + path.sep + relativeToInputDirPath;
    fs.writeFileSync(outputFilePath, fs.readFileSync(absInputDirPath + path.sep + relativeToInputDirPath));
}

function parseSassToBuildDir(absFilePath: string) {
    var absInputDirPath = PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.INPUT;
    var relativeToInputDirPath = path.relative(absInputDirPath, absFilePath);
    var sassLoadPaths = [PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.SASS];
    var result = sass.compile(absFilePath, {loadPaths: sassLoadPaths});
    var absOutputPath = PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.OUTPUT + path.sep + relativeToInputDirPath;
    //replace file extension with .css
    absOutputPath = absOutputPath.slice(0, absOutputPath.lastIndexOf(".")) + ".css";
    fs.writeFileSync(absOutputPath, result.css);

}


function processDirectory(curAbsDirectory: string) {
    if(!path.isAbsolute(curAbsDirectory)) {
        throw new Error("Path " + curAbsDirectory + " is not absolute");
    }
    var dirContents = fs.readdirSync(curAbsDirectory);
    for(var content of dirContents) {
        //ignore hidden files or folders starting with . (ex: .npm, .git, .DS_Store)
        if(content.startsWith(".", 0)) {
            continue;
        }
        var absPathContent = curAbsDirectory + path.sep + content;
        var lstat = fs.lstatSync(absPathContent);
        if(lstat.isDirectory()) {
            var newDirectoryRelPath = path.sep + path.relative(PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.INPUT, absPathContent);
            //must create directory in output dir before files are written inside that directory
            fs.mkdirSync(PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.OUTPUT + newDirectoryRelPath);
            processDirectory(PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.INPUT + newDirectoryRelPath);
        } else if(lstat.isFile()) {
            var ext = path.extname(content);
            switch(ext) {
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

function clearBuildDir(abs_dir: string) : void {
    if(!path.isAbsolute(abs_dir)) {
        throw new Error("Path " + abs_dir + " is not absolute!");
    }
    var buildDir = abs_dir + path.sep + RESERVED_DIR_NAMES.OUTPUT;
    var contents = fs.readdirSync(buildDir);
    for(var content of contents) {
        var absPathContent = buildDir + path.sep + content;
        var lstat = fs.lstatSync(absPathContent);
        if(lstat.isDirectory()) {
            //recursively delete directory and all of its contents
            fs.rmSync(absPathContent, {recursive: true});
        } else {
            //delete files and symbolic links
            fs.unlinkSync(absPathContent);
        }
    }
}

function buildSite(abs_dir: string) {
    if(!fs.existsSync(abs_dir)) {
        throw new Error("The directory " + abs_dir + " does not exist.");
    } else if(!path.isAbsolute(abs_dir)) {
        throw new Error("Path " + abs_dir + " is not absolute.");
    } else if(!fs.lstatSync(abs_dir).isDirectory()) {
        throw new Error("The path " + abs_dir + " is not a directory.");
    }

    clearBuildDir(abs_dir);

    PROJECT_ROOT_DIR = abs_dir;

    var dirContents = fs.readdirSync(PROJECT_ROOT_DIR);
    for(var content of dirContents) {
        var lstat = fs.lstatSync(PROJECT_ROOT_DIR + path.sep + content);
        if(lstat.isDirectory()) {
            if(content === RESERVED_DIR_NAMES.INPUT) {
                processDirectory(PROJECT_ROOT_DIR + path.sep + RESERVED_DIR_NAMES.INPUT);
            }
        } 
    }


}


export default {buildSite};