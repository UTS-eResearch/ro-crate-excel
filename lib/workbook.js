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
const defaults = require('./defaults');
const rocrate = require('ro-crate');
const RoCrate = rocrate.ROCrate;
const _ = require("lodash");
const jsonld = require("jsonld");
const { v4: uuidv4 } = require('uuid');




class Workbook {
    constructor(opts) {
        if (opts && opts.crate) {
            this.propertyWarnings = {};
            this.workbook = new Excel.Workbook();
            this.crate = opts.crate;
            this.crate.index();
            
        } 
    }

    async crateToWorkbook() {
            this.crate.resolveContext();
            this.crate.index();
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
            this.addContextSheet();
            

            /* Add the worksheets for each type to the workbook */
            const types = new Set([ ...defaults.typeOrder, ...Object.keys(this.crate.types) ])
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
    }

    async loadExcel(filename) {
        this.workbook = new Excel.Workbook();
        await this.workbook.xlsx.readFile(filename);
        await this.workbookToCrate();
    }

    addContextSheet() {
        const context = this.crate.json_ld["@context"];
        this.contextWorksheet = this.workbook.addWorksheet("@context");
        this.contextWorksheet.columns = [
            {header: "name", key: "name", width: "20"},
            {header: "@id", key: "@id", width: "60"},
        ]
        for (let contextBlock of  context) {
                this.addContextTerms(contextBlock)    
        }
    }
    addContextTerms(terms) {
        if(typeof terms ==='string') {
            this.contextWorksheet.addRow({"URL": terms})
        } else {
            for (let term of Object.keys(terms)) {
                if (!(term === "@base") && !(term === "@vocab" && terms[term]==="http://schema.org/")){
                    const item = this.crate.getItem(terms[term]) || {};
                    const row = {}
                    row.name = item["name"] || term;
                    row.description = item["descripton"] || "";
                    row["@id"] = terms[term];
                    this.contextWorksheet.addRows([row]);
                }
            }
        } 
    }

    indexCrateByName() {
        // TODO - warn about duplicate names
        this.crate.itemByName = {}
        for (let item of this.crate.getGraph()) {
            if (item.name) {
                this.crate.itemByName[item.name] = item;
            }
        }

    }
    getItemByName(name) {
        if (this.crate.itemByName[name]) {
            return this.crate.itemByName[name]      
      } else {
            return null;
        }
    }
    indexByType() {
        this.crate.types = {}
        for (let item of this.crate.getGraph()) {
            if (!(item["@id"] && (item["@id"] === "./" || item["@id"].match(/^ro-crate-metadata.json(ld)?$/)))){
                // Only need to check first type cos we don't want this thing showing up in two places?
                if (!item["@type"]) {
                    item["@type"] = "Thing";
                }
                if (!item["name"]) {
                    item["name"] = "";
                }
                const t = this.crate.utils.asArray(item["@type"])[0] || "Thing"; 
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
        const me = this;
        // TODO - deal with repeated props
        sheet.eachRow(function(row, rowNumber) {
            if (rowNumber > 1) {
                 //TODO - normalise property values to lowercase?
                 const prop = item[row.values[1]];
                 if (prop && !prop.startsWith("@") && !me.crate.resolveTerm(prop)) {
                     if (!me.propertyWarnings[prop]) {
                        me.propertyWarnings[prop] = true;
                        console.log("Warning: undefined property", prop)
                     }
                    
                 }
                 // TODO check prop is in context and optionaly normalize
                item[row.values[1]] = me.parseCell(row.values[2]);
            }
            });
    
        return item;
    }  

    parseContextSheet(sheetName) {
        // For worksheets that have a vertical (Name | Value layout) - turn them into a JSON-LD item
        // TODO - deal with wrong headers - no Name / Value (other stuff will be discarded)
        const additionalContext = {};
        const sheet = this.workbook.getWorksheet("@context");
        const me = this;
        if (sheet) {
            sheet.eachRow(function(row, rowNumber) {
                if (rowNumber > 1) {
                    additionalContext[row.values[1]] = me.parseCell(row.values[2]);
                }
                });
        }
        return additionalContext;
    } 
 
    parseCell(cellString) {
   
        // Look for curly braces - if they're there then it's JSON
        if (!cellString) {
            return "";
        }

        if (cellString.text) {
            cellString = cellString.text;
        } else if (cellString.result) {
            cellString = cellString.result;
        } 

        cellString = cellString.toString();
      
        const curly = cellString.match(/{(.*)}/);
        if (curly) {
            try {
                return JSON.parse(cellString);
            } catch(error) {
                return cellString;
            }
        } else {
            // Look for arrays of strings or references
            const sq = cellString.match(/^\s*\[\s*(.*?)\s*\]\s*$/);
            if (sq){
                return sq[1].split(/\s*,\s*/)//.map(x => this.parseCell(x));
            }   
        }
        return cellString;
    }
    sheetToItems(sheetName) {
        // TODO get default type
        const worksheet = this.workbook.getWorksheet(sheetName);
        if (!this.propertyWarnings) {
            this.propertyWarnings = {}
        }
        const columns = worksheet.getRow(1).values;
        var items = [];
        const me = this;
        worksheet.eachRow({ includeEmpty: false }, function(row, rowNumber) {
            if (rowNumber > 1) {
            var index = 0;
            const item = {}
            for (let val of row.values) {
                if (columns[index]) {
                    const prop = columns[index];
                    if (prop && !prop.startsWith("@") && !me.crate.resolveTerm(prop)) {
                        if (!me.propertyWarnings[prop]) {
                            me.propertyWarnings[prop] = true;
                            console.log("Warning: undefined property", prop)
                        }
                    }
                    item[prop] = me.parseCell(val)
                }
                index++;
            }
            items.push(item)
            }
          });
        // deal with embedded stuff
        return items;
        // Add to graph
    }
    async flatten() {
        const c = this.crate.json_ld["@context"];
        c.push({"@base": null});
        this.crate.json_ld = await jsonld.flatten(this.crate.json_ld, c);
        this.crate.json_ld = await jsonld.compact(this.crate.json_ld, c);
      
        this.crate.index()
       
    }
    async workbookToCrate() {
        const def = new RoCrate().defaults;
        this.crate = new RoCrate();
        this.crate.json_ld["@context"].push(this.parseContextSheet());
        await this.crate.resolveContext();
        this.crate.json_ld["@graph"] = [
            this.sheetToItem("RootDataset"),
            _.clone(def.metadataFileDescriptorTemplate)
        ]
        this.crate.index();

        //this.crate.getGraph().push(); WTF?
        const me = this;
        this.workbook.eachSheet(function(worksheet, worksheetID) {
            if (!["@context","RootDataset"].includes(me.workbook.getWorksheet(worksheetID).name)) {
                const items = (me.sheetToItems(worksheetID));
                for (let item of items) {
                    if (!item["@id"]) {
                        console.log("Warning item does not have an @id", item)
                        item["@id"] = `#${uuidv4()}`
                    }
                    me.crate.addItem(item);
                }
        }
        });
        // TODO - Flatten crate
        await this.flatten();
        this.resolveLinks();

    }
    resolveLinks() {
        // Anything in "" is potentially a reference by ID or Name
        this.crate.index();
        this.indexCrateByName();
        for (let item of this.crate.getGraph()) {
            for (let prop of Object.keys(item)) {
                var vals = [];
                for (let val of this.crate.utils.asArray(item[prop])) {
                    if (val && !val["@id"]) {
                        var linkMatch = val.toString().match(/^"(.*)"$/);
                        if (linkMatch) {
                            const potentialID = linkMatch[1];
                            if (this.crate.getItem(potentialID)) {
                                vals.push({"@id": this.crate.getItem(potentialID)["@id"]})
                            } else if (this.getItemByName(potentialID)) {
                                vals.push({"@id": this.getItemByName(potentialID)["@id"]})
                            } else if (this.crate.getItem(`#${potentialID}`)) {

                                vals.push({"@id": this.crate.getItem(`#${potentialID}`)["@id"]})
                            } else {
                                vals.push(val);
                            }
                        } else {
                            vals.push(val)
                        }
                }else {

                    vals.push(val);
                }
                }
                if (vals.length === 1) {
                    vals = vals[0];
                } else if (vals.length === 0 ) {
                    vals = "";
                }
                item[prop] = vals;
            }
        }
    }
}

module.exports = Workbook;



