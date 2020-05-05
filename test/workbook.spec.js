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

/* Test for workbook.js */
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs-extra');
const rocrate = require('ro-crate');
const RoCrate = rocrate.ROCrate;
const Workbook = require("../lib/workbook.js");
const assert = require("assert");
const chai = require('chai');
const expect = chai.expect;    

// Fixtures
const metadataPath = "test_data/sample/ro-crate-metadata.jsonld";


describe("Create a workbook from a crate", function() {

  it("Should create a workbook with just one sheet", function(done) {
    const c = new RoCrate();
    c.index();
    const workbook = new Workbook(c);
    const sheet = workbook.workbook.getWorksheet("RootDataset");
    console.log("SHEET", sheet)
    assert.equal(
      sheet.getCell("A1").value,
      "Name"
    );
    assert.equal(
        sheet.getCell("B1").value,
        "Value"
      );
      assert.equal(
        sheet.getCell("A2").value,
        "@type"
      );
      assert.equal(
          sheet.getCell("B2").value,
          "Dataset"
        );

    done();
  });


  it("Should create a workbook with one sheet and some metadata", function(done) {
    const c = new RoCrate();
    c.index();
    const root = c.getRootDataset();
    console.log("ROOT", root);
    root["name"] =  "My dataset";
    root["description"] =  "Some old dataset";
    const workbook = new Workbook(c);
    const rootSheetName = "RootDataset";
    datasetItem = workbook.sheetToItem(rootSheetName);
    console.log(datasetItem);
    assert.equal(Object.keys(datasetItem).length, 4)
    assert.equal(datasetItem.name, "My dataset");
    assert.equal(datasetItem.description, "Some old dataset");
    done();
  });


  it("Should create a workbook with two sheets", function(done) {
    const c = new RoCrate();
    c.index();
    const root = c.getRootDataset();
    root["name"] =  "My dataset";
    root["description"] =  "Some old dataset";
    c.addItem({
        "@id": "https://ror.org/03f0f6041",
        "name": "Universtiy of Technology Sydney",
        "@type": "Organization"
    })
    const workbook = new Workbook(c);
    // This is not using the api - may be fragile
    assert.equal(workbook.workbook["_worksheets"].length, 3, "There are only two sheets");


    done();
  });

  it("Should handle the sample dataset ", async function(done) {
    var c = new RoCrate(JSON.parse(fs.readFileSync(metadataPath)));
    c.index();
    
    const workbook = new Workbook(c);
    //console.log(workbook.excel.Sheets)
    assert.equal(workbook.workbook["_worksheets"].length, 14, "13 sheets")

    workbook.workbook.xlsx.writeFile("test.xlsx");
    const root = workbook.sheetToItem("RootDataset");
    assert.equal(root.publisher, `"https://ror.org/0384j8v12"`)
    assert.equal(root.hasPart, `["lots_of_little_files/", "pics/"]`)

    workbook.indexCrateByName();
    const pt = workbook.getItemByName("Peter Sefton")
    assert.equal(pt.name, "Peter Sefton")

    const items = workbook.sheetToItems("@type=Person");
    assert.equal(items.length, 1);
    assert.equal(items[0].name, "Peter Sefton");

    done();
  });


  it("Can parse string values into arrays", async function(done) {
    var c = new RoCrate();
    c.index();
    const workbook = new Workbook(c);
    assert.equal(workbook.parseCell(`string`), "string");
    assert.equal(workbook.parseCell(`"string"`), `"string"`);
    expect(workbook.parseCell(`["string", "string2"]`)).to.eql([`"string"`, `"string2"`]);
    expect(workbook.parseCell(`["string",   "string2"]`)).to.eql([`"string"`, `"string2"`]);
    expect(workbook.parseCell(`["string",string2] `)).to.eql([`"string"`, `string2`]);
    expect(workbook.parseCell(`{"@id": "#id", "name": "something"}`)).to.eql({"@id": "#id", "name": "something"});
    expect(workbook.parseCell(`[{"@id": "#id", "name": "something"}, {"@id2": "#id2", "name": "something2"}]`)).to.eql([{"@id": "#id", "name": "something"}, {"@id2": "#id2", "name": "something2"}]);
    // IF the JSON is broken don't accept it as JSON
    expect(workbook.parseCell(`[{"@id": "#id", name: "something"}, {"@id2": "#id2", "name": "something2"}]`)).to.eql(`[{"@id": "#id", name: "something"}, {"@id2": "#id2", "name": "something2"}]`);

    done();
});

  it("Can export a workbook to a crate", async function(done) {
    var c = new RoCrate(JSON.parse(fs.readFileSync(metadataPath)));
    c.index();
    const workbook = new Workbook(c);
    // 
    prom = await workbook.workbookToCrate();
    //console.log(workbook.crate.getGraph(), "XXX");
    return prom;
});


});





