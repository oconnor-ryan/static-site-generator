"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
function getHTMLLinksToFilesInDir(absDir, url) {
    var rtn = "<h1>Directory " + url + "</h1>\n";
    //if not root directory
    if (url !== "/") {
        //remove / from right end of url to avoid issue when linking to content in this directory
        url = url.endsWith("/") ? url.slice(0, url.length - 1) : url;
        var parentDirName = path_1.default.dirname(url);
        rtn += "<br><a href=\"" + parentDirName + "\">Parent Directory</a>\n";
    }
    var contents = fs_1.default.readdirSync(absDir);
    for (var content of contents) {
        rtn += "<br><a href=\"" + url + "/" + content + "\">" + content + "</a>\n";
    }
    return rtn;
}
function serveSite(absDocumentRootDir) {
    const hostname = 'localhost';
    const port = 3000;
    const server = http_1.default.createServer((req, res) => {
        if (req.method === undefined || req.method !== "GET") {
            res.writeHead(403);
            res.end("This server only accepts GET requests because this is a static site.");
            return;
        }
        if (req.url === undefined) {
            res.writeHead(404);
            res.end("The URL was undefined.");
            return;
        }
        //replace / with os-specific path separator for this server
        var filePath = absDocumentRootDir + req.url.replace("/", path_1.default.sep);
        //if file or directory does not exist
        if (!fs_1.default.existsSync(filePath)) {
            res.writeHead(404);
            res.end("The file at " + req.url + " does not exist.");
            return;
        }
        //if filePath requested by url is directory, look for index.html or show the directory's content list
        if (fs_1.default.lstatSync(filePath).isDirectory()) {
            //remove the path separator at the end of the filePath
            var absDirPath = filePath.endsWith(path_1.default.sep) ? filePath.slice(0, filePath.length - 1) : filePath;
            var absIndexFilePath = absDirPath + path_1.default.sep + "index.html";
            //if there is no index.html in the filePath directory
            if (!fs_1.default.existsSync(absIndexFilePath)) {
                res.setHeader("Content-Type", "text/html");
                res.writeHead(200);
                res.end(getHTMLLinksToFilesInDir(absDirPath, req.url));
                return;
            }
            else {
                //set the filePath to the path of the index.html file
                filePath = absIndexFilePath;
            }
        }
        fs_1.default.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end(JSON.stringify(err));
                return;
            }
            res.writeHead(200);
            res.end(data);
        });
    });
    server.listen(port, hostname, () => {
        //colors use \x1b[33m %s \x1b[0m
        //where \x1b is the escape key, [33m is green, and is closed by \x1b[0m
        console.log("Server running at \x1b[32m%s\x1b[0m", `http://${hostname}:${port}`);
        console.log('Type ^C or Ctrl-C to stop the server.\n');
    });
}
exports.default = { serveSite };
