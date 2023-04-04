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
const { v4: uuidv4 } = require('uuid');





class Workbook {
    constructor(opts) {
        this.propertyWarnings = {};
        if (opts && opts.crate) {
            this.workbook = new Excel.Workbook();
            this.crate = opts.crate;            
        } 
    }

    async crateToWorkbook() {
            this.crate.resolveContext();
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
                    const sheet = this.workbook.addWorksheet(`@type=${t.replace(/:/,"")}`);
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
                    //console.log(this.crate.types[t])
                    sheet.addRows(this.crate.types[t]);
                }
            }
    }


     /**
     * Load in an existing spreadshsset
     * @param {string} [filename] - Path to an excel sheet
     * @param {boolean} [addToCrate] - Optionaly don't treat the spreadsheet as containing a whole crate, just load in worksheets into the existing crate
      */

    async loadExcel(filename, addToCrate) {
        var addToExistingCrate = false;
        if (addToCrate) {
            addToExistingCrate = true;
        }
        this.workbook = new Excel.Workbook();
        await this.workbook.xlsx.readFile(filename);
        await this.workbookToCrate(addToExistingCrate);
       
    }

    addContextSheet() {
        const context = this.crate.getJson()["@context"];
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
            console.log("adding these terms", terms)
            for (let term of Object.keys(terms)) {
                if (!(term === "@base") && !(term === "@vocab" && terms[term]==="http://schema.org/")){
                    const item = this.crate.getItem(terms[term]) || {};
                    
                        const row = {}
                        row.name = item["name"] || term;
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
            if (target) {
                if (defaults.embedTypes.includes(this.crate.utils.asArray(target["@type"])[0])) {
                        return JSON.stringify(target);
                }else {
                    return `"${val["@id"]}"`;
                }
            } else {
                return JSON.stringify(val);
            }
          
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
        //console.log(sheetName, sheet)
        // TODO - deal with repeated props
        sheet.eachRow(function(row, rowNumber) {
            if (rowNumber > 1) {
                 //TODO - normalise property values to lowercase?
                 const prop = row.values[1];
                 if (prop && !prop.startsWith("@") && !me.crate.resolveTerm(prop)) {
                     if (!me.propertyWarnings[prop]) {
                        me.propertyWarnings[prop] = true;
                        console.log("Warning: undefined property", prop)
                     }
                    
                 }
                 // TODO check prop is in context and optionaly normalize
                const val  = row.getCell(2);
                item[prop] = me.parseCell(val);
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
            sheet.eachRow({ includeEmpty: false },function(row, rowNumber) {
                if (rowNumber > 1) {      
                    additionalContext[row.values[1]] = me.parseCell(row.getCell(2));      
                }
                });
        }
        return additionalContext;
    } 
 
    parseCell(val) {
        var cellString = "";

        // TODO: Not sure if these first two are needed
        if (val.text) {
            cellString = val.text;
        } else if (val.result) {
            cellString = val.result;
        } else if (val.value && val.value.richText) {
            for (let t of val.value.richText) {
                cellString += t.text;
            }
        } else {
            cellString = val.value;
        }
        // Look for curly braces - if they're there then it's JSON
        if (!cellString) {
            return "";
        }

        /*
        
        */

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
            const item = {}
            const additionalTypes = [];
            row.eachCell({ includeEmpty: false }, function(cell, cellNumber) {

                if (columns[cell._column._number]) {
                    const prop = columns[cell._column._number];
                    //console.log(prop, val);

                    if (prop && !prop.startsWith("@") && !me.crate.resolveTerm(prop)) {
                        if (!me.propertyWarnings[prop]) {
                            me.propertyWarnings[prop] = true;
                            console.log("Warning: undefined property", prop)
                        }
                    }
                    
                    const propValue = me.parseCell(cell); // TODO -- remove [] and {} if they're there
                    if (prop && prop.startsWith("is@type") && propValue) {
                        additionalTypes.push(prop.replace("is@type", ""))
                    } else {
                        item[prop] = propValue
                    }
                    
                    
                }
            })
            if (!item["@type"]) {
                item["@type"] = ["Thing"];
            } 
            if (!Array.isArray(item["@type"])) {
                item["@type"] = [item["@type"]];
            }
            item["@type"] = item["@type"].concat(additionalTypes);
            items.push(item);

           
            }
         
          });
        // deal with embedded stuff
        return items;
        // Add to graph
    }

    async workbookToCrate(addToExistingCrate) {
        if (!addToExistingCrate || !this.crate) {
            this.crate = new RoCrate({"array": true, "link": true});
        }

        this.crate.addContext(this.parseContextSheet());
        await this.crate.resolveContext();
        if (!addToExistingCrate) {
            this.crate = new RoCrate({"array": true, "link": true});
        
            const newRoot =   this.sheetToItem("RootDataset");
            
            for (let prop of Object.keys(newRoot)) {
                if (prop === "@id") {
                    this.crate.updateEntityId(this.crate.rootDataset, newRoot["@id"])
                } else {
                    this.crate.rootDataset[prop] = newRoot[prop]
                }
            }
        }
        const me = this;
        this.workbook.eachSheet(function(worksheet, worksheetID) {
            if (!["@context","RootDataset", "config","SheetDefaults"].includes(me.workbook.getWorksheet(worksheetID).name)) {
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
                            //console.log("ID", potentialID)
                            if (this.crate.getItem(potentialID)) {
                                vals.push({"@id": this.crate.getItem(potentialID)["@id"]})
                            }  else if (this.crate.resolveTerm(potentialID)) {
                                vals.push({"@id": this.crate.resolveTerm(potentialID)})              
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



