//first party dependencies
import { RESERVED_DIR_NAMES } from "./constants";
//import { buildSite } from "./build-site";


//node js modules
import fs from 'fs';
import path from 'path';

function setupExampleSite(absDir: string) {

}

function setupNewSite(absDir: string) {
    if(!path.isAbsolute(absDir)) {
        throw new Error("Path " + absDir + " is not absolute."); 
    } 

    if(fs.existsSync(absDir)) {
        if(!fs.lstatSync(absDir).isDirectory()) {
            throw new Error("Path " + absDir + " is not a directory.");
        }
        var contents = fs.readdirSync(absDir);
        if(contents.length !== 0) {
            throw new Error("Directory " + absDir + " must not exist or must be empty to create a new site.");
        }
    } else {
        //if absDir has non-existing parent directories, recursively create each non-existing parent directory.
        fs.mkdirSync(absDir, {recursive: true});
    }

    var directories = Object.values(RESERVED_DIR_NAMES);
    //create needed directories
    for(var dir of directories) {
        fs.mkdirSync(absDir + path.sep + dir);
    }
    
}

export default {setupNewSite, setupExampleSite};