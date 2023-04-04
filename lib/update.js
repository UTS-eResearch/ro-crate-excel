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
const Workbook = require('./workbook.js');
const Files = require('./files.js');  
const rocrate = require('ro-crate');
const ROCrate = rocrate.ROCrate;
const path = require('path');
const shell = require("shelljs");
const fs = require("fs-extra");

function addToGraph(crate, items ) {
    for (let k of Object.keys(items)) {
        const item = items[k];
        const existingItem = crate.getItem(k);
        if (existingItem) {
            // Copy props from files 
            if (item["@type"] === "File") {
                existingItem.contentSize = item.contentSize;
                existingItem.dateModified = item.dateModified;
                existingItem.encodingFormat = item.encodingFormat;
            } else  {
                //NEED TO MERGE THEM
                addParts(crate, "hasPart", existingItem, item);
            }
        } else {
            crate.addItem(item);
        }
    }
}

function addParts(crate, prop, existingItem, item) {
    partIds = [];
    existingItem[prop] = crate.utils.asArray(existingItem[prop])
    for (let part of existingItem[prop]) {
        if (part["@id"]) {
            partIds.push(part["@id"]);
        }
    }
    for (let newPart of item[prop] ) {
        if (!partIds.includes(newPart["@id"])) {
            crate.addValues(existingItem, prop, newPart)
        }
    }
    //existingItem.hasPart = item.hasPart;
    //existingItem.hasFile = item.hasFile;
}

async function update(dir, depth, fromJSON) {
    const catalogPath = path.join(dir, defaults.metadata_excel_file_name);
    const metadataPath = path.join(dir, defaults.metadata_json_file_name);

    var statusMessage = [];
    var sourceCrate;
    
    if (!fromJSON && await fs.pathExists(catalogPath)){
        // We havea  spreadsheet
        const wb = new Workbook();
        
        await wb.loadExcel(catalogPath);
        // Start with a crate from a spreadsheet
        sourceCrate = wb.crate;
        statusMessage.push(`Using existing spreadsheet: ${catalogPath}`);
        
    } else {
        if (await fs.exists(metadataPath)) {
            statusMessage.push(`Using existing RO-Crate metadata: ${metadataPath}`);
            const js = JSON.parse(await fs.readFile(metadataPath, "utf8"));
            sourceCrate = new ROCrate(js);
        } else {
            // Start with an empty crate
            statusMessage.push(`No metadata or catalog found, making: ${metadataPath}`);
            sourceCrate = new ROCrate();
        }
    }
    sourceCrate.index();
    
    const files = new Files(dir, depth);
    addToGraph(sourceCrate, files.files);
    addToGraph(sourceCrate, files.datasets);
    addToGraph(sourceCrate, files.encodingFormats);
    sourceCrate.index();

    //console.log("PARTS", root.hasPart)

    const outBook = new Workbook({crate: sourceCrate});
    await outBook.crateToWorkbook();
    await outBook.workbook.xlsx.writeFile(catalogPath);
    statusMessage.push(`Saving spreadsheet ${catalogPath}`)
    statusMessage.push(`Saving json ${metadataPath}`)

    const j = JSON.parse(JSON.stringify(sourceCrate.getJson()));
    await fs.writeFile(metadataPath, JSON.stringify(j, null, 2), "utf8");

    return statusMessage;
}

module.exports = update;

