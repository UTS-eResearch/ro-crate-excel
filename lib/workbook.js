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

const Excel = require('exceljs');
const defaultss = require('./defaults');
const rocrate = require('ro-crate');
const XLSX = require('xlsx');
const path = require('path');
const RoCrate = rocrate.ROCrate;

const defaults = {
    embedTypes: ["PropertyValue", "GeoCoordinates"],
    typeOrder: new Set(["Dataset", "File",  "Person",  "Organization", "Place", "ScholarlyArticle"])
}
class Workbook {
    constructor(crate) {
        this.workbook = new Excel.Workbook();
        this.crate = crate;
        var sheetName = "RootDataset";
        const root = this.crate.getRootDataset();
        // Turn @id refs into inferred references
        //this.collapseReferences();
        this.indexByType();

        var worksheet = this.workbook.addWorksheet(sheetName);
        worksheet.views = [
            {state: 'frozen', xSplit: 1, activeCell: 'A2'}
          ];
        worksheet.columns = [
            { header: 'Name', key: 'Name', width: 10 },
            { header: 'Value', key: 'Value', width: 100 }

        ]
        for (let prop of Object.keys(root)) {
            worksheet.addRow({Name: prop, Value: this.formatMultiple(root[prop])});
        }

        /* Add the worksheet to the workbook */
        const types = new Set([ ...defaults.typeOrder, ...Object.keys(this.crate.types) ])
        console.log(this.crate.types)
        for (let t of types) {
            if (this.crate.types[t]) {
                const sheet = this.workbook.addWorksheet(`@type=${t}`);
                const cols = {}
                var columns = []
                for (let item of this.crate.types[t]) {
                    for (let prop of Object.keys(item)) {
                        if (!cols[prop]) {
                            cols[prop] = prop;
                            columns.push({ header: prop, key: prop, width: 20 })
                        }
                    }
                }
                sheet.columns = columns;
                sheet.addRows(this.crate.types[t]);
            }
        }
        //console.log("Book", this.workbook)
    }

    indexByType() {
        this.crate.types = {}
        for (let item of this.crate.getGraph()) {
            if (!(item["@id"] && (item["@id"] === "./" || item["@id"].match(/^ro-crate-metadata.json(ld)?$/)))){
                // Only need to check first type cos we don't want this thing showing up in two places?
                const t = this.crate.utils.asArray(item["@type"])[0];    
                if (!defaults.embedTypes.includes(t)) {
                    const stringifiedItem = this.stringify(item);
                    if (!this.crate.types[t]) {
                        this.crate.types[t] = [stringifiedItem];
                    } else {
                        this.crate.types[t].push(stringifiedItem);
                    }
                }
            }
        }
    }
    stringify(item) {
        const strung = {}
        for (let prop of Object.keys(item)) {
            strung[prop] = this.formatMultiple(item[prop]); 
        }
        return strung;
    }
    formatMultiple(vals) {
        if (Array.isArray(vals)) {
            return `[${vals.map(v => this.formatSingle(v)).join(", ")}]`
         } else {
            return this.formatSingle(vals);
         }
    }
    formatSingle(val) {
        if (val["@id"]) {
            const target = this.crate.getItem(val["@id"]);
            // TODO what to do about arrays of type?
            if (target && defaults.embedTypes.includes(this.crate.utils.asArray(target["@type"])[0])) {
                return JSON.stringify(target);
            }
            return `"${val["@id"]}"`;
        } else {
            return val;
        }
        
    }
    sheetToItem(sheetName) {
        // For worksheets that have a vertical (Name | Value layout) - turn them into a JSON-LD item
        // TODO - deal with wrong headers - no Name / Value (other stuff will be discarded)
        const item = {}
        const sheet = this.workbook.getWorksheet(sheetName);
        sheet.eachRow(function(row, rowNumber) {
            if (rowNumber > 1) {
                 item[row.values[1]] = row.values[2];
            }
            });
        return item;
    }  
    sheetToItems(sheetName) {
        // get default type


        // deal with embedded stuff


        // Add to graph


    }
}

module.exports = Workbook;



