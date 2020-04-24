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


const defaultss = require('./defaults');
const rocrate = require('ro-crate');
const XLSX = require('xlsx');
const path = require('path');
const RoCrate = rocrate.ROCrate;

const defaults = {
    embedTypes: ["GeoJson"]
}
class Workbook {
    constructor(crate) {

        this.excel = XLSX.utils.book_new();
        this.crate = crate;
        var sheetName = "RootDataset";
        console.log(crate.json)
        /* make worksheet */
        var ws_data = [
            [ "Name", "Value" ]
        ];
        const root = this.crate.getRootDataset();
        for (let prop of Object.keys(root)) {
            console.log("PROP", prop)
            ws_data.push([prop, root[prop]])
        }

        var sheet  = XLSX.utils.aoa_to_sheet(ws_data);
        
        /* Add the worksheet to the workbook */
        XLSX.utils.book_append_sheet(this.excel, sheet, sheetName);
        this.indexByType();
        for (let t of Object.keys(this.crate.types)) {
            const typeSheet = XLSX.utils.json_to_sheet(this.crate.types[t]);
            XLSX.utils.book_append_sheet(this.excel, typeSheet, `@type=${t}`);
        }
    }
    indexByType() {
        this.crate.types = {}
        for (let item of this.crate.getGraph()) {
            if (!(item["@id"] && (item["@id"] === "./" || item["@id"].match(/^ro-crate-metadata.json(ld)?$/)))){
                for (let t of this.crate.utils.asArray(item["@type"])) {
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
            const val = item[prop];
            if (Array.isArray(val)) {
              
               strung[prop] = `[${val.map(v => this.format(v)).join(", ")}]`
            } else {
             strung[prop] = this.format(val);
            }
        }
        return strung;
    }
    format(val) {
        if (val["@id"]) {
            return val["@id"];
        } else {
            return val;
        }
        
    }
    sheetToItem(sheetName) {
        // For worksheets that have a vertical (Name | Value layout) - turn them into a JSON-LD item
        // Note that values will be in calcyte format and need post-processing to find references etc
        const item = {}
        const sheet = this.excel.Sheets[sheetName];
        const sheetJson =  XLSX.utils.sheet_to_json(sheet);

        for (let row of sheetJson) {
            console.log(row)
            item[row.Name] = row.Value;
        }
        return item;
    }  
}

module.exports = Workbook;



