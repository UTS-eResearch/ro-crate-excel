/* This is part of RO-Crate-excel a tool for implementing the DataCrate data packaging
spec.  Copyright (C) 2020  University of Technology Sydney

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

const defaults = require('./defaults.js');
const path = require('path');
const shell = require("shelljs");
const fs = require("fs-extra");



class Files {
    constructor(rootPath, maxDepth) {
        this.maxDepth = maxDepth || 0;
        this.rootPath = rootPath;
        this.graph = [];
        this.files = {};
        this.datasets = {};
        this.encodingFormats = {};
        var items = fs.readdirSync(rootPath);
        // TODO - recurse this
        this.ls(rootPath, 0);
       
    }

    ls(dir, depth) {
        if (depth > this.maxDepth) { return }
        var items = fs.readdirSync(dir);
        items = items.filter(item => !defaults.ignore_file_regex.test(item));
        items = items.filter(item => shell.test("-f", path.join(dir, item)));

        var fileInfo;
        if (items.length < defaults.maxFilesInDir) {
            try {
              //console.log("Running SF")
              fileInfo = JSON.parse(shell.exec(`sf -nr -json "${dir}"`, {silent:true}).stdout);
            } catch(e) {
              console.error("File identification error: " + e);
              console.error("Have you installed Siegfried?");
              console.error("https://github.com/richardlehane/siegfried/wiki/Getting-started");
              process.exit(1);
            }
            //console.log("files", JSON.stringify(fileInfo));
        }
        else  {
          console.log(`WARNING: Max ${defaults.maxFilesInDir} files exceeded (${items.length}) in ${dir}\n HINT: Re-run \n     ${process.argv.join(" ")} -m ${defaults.maxFilesInDir + 1}`)
        }
        if (fileInfo) {
            for (let file of fileInfo.files) {
                const thisFile = path.relative(this.rootPath, file.filename);
                
                if (path.basename(thisFile).match(defaults.ignore_file_regex)) {
                    continue;
                }
                const f = {
                    "@id" : thisFile,
                    "@type": "File",
                    "name" : path.basename(thisFile),
                    "description" : "",
                    "contentSize": file.filesize,
                    "dateModified": file.modified,
                    encodingFormat: []
                }
                for (let match of file.matches) {
                    if (match.puid != "UNKNOWN") {
                        f.encodingFormat.push(
                            {"@id": `https://www.nationalarchives.gov.uk/PRONOM/fmt/${match.puid}`}
                        );
                        f.encodingFormat.push(match.mime);
                        if (!this.encodingFormats[match.puid]){
                            this.encodingFormats[match.puid] = 
                                {  "@id": `https://www.nationalarchives.gov.uk/PRONOM/fmt/${match.puid}`,
                                    "@type": "website",
                                    "name": match.format}
                        }
                    }
                }
                this.files[thisFile] = f;
            }
            

            }
    var subdirs = fs
        .readdirSync(dir)
        .filter(
        item =>
            fs.lstatSync(path.join(dir, item)).isDirectory() &&
            !item.match(defaults.ignore_dir_regex)
        );
    for (let subdir of subdirs) {
        const id =  path.relative(this.rootPath, path.join(dir, subdir)) + "/";
        this.datasets[id] =
            {
                "@type": "Dataset",
                "@id": id,
                "name": subdir,
                "description": ""

            }
        

        this.ls(path.join(dir, subdir), depth + 1) 

    }
}
}
module.exports = Files;



