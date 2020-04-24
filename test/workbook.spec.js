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
const path = require('path');
const fs = require('fs-extra');
const rocrate = require('ro-crate');
const RoCrate = rocrate.ROCrate;
const Workbook = require("../lib/workbook.js");
const assert = require("assert");



describe("Create a workbook from a crate", function() {

  it("Should create a workbook with one sheet", function(done) {
    const c = new RoCrate();
    c.index();
    const workbook = new Workbook(c);
    const rootSheet = workbook.excel.Sheets["RootDataset"];
    console.log(rootSheet);
    
    assert.equal(
      rootSheet.A1.v,
      "Name"
    );
    assert.equal(
        rootSheet.B1.v,
        "Value"
      );
      assert.equal(
        rootSheet.A2.v,
        "@type"
      );
      assert.equal(
          rootSheet.B2.v,
          "Dataset"
        );

    done();
  });


  it("Should create a workbook with one sheets and some metadata", function(done) {
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
    console.log(c.json_ld)
    const root = c.getRootDataset();
    root["name"] =  "My dataset";
    root["description"] =  "Some old dataset";
    c.addItem({
        "@id": "https://ror.org/03f0f6041",
        "name": "Universtiy of Technology Sydney",
        "@type": "Organization"
    })
    const workbook = new Workbook(c);
    const orgJSON =  XLSX.utils.sheet_to_json(workbook.excel.Sheets["@type=Organization"]);
    console.log(workbook.excel.Sheets)
    assert.equal(Object.keys(workbook.excel.Sheets).length, 2, "Only 2 sheets (not an extra Dataset or a CreativeWork")
    console.log(orgJSON);
    assert.equal(orgJSON.length, 1, "one org");
    assert.equal(orgJSON[0]["@id"], "https://ror.org/03f0f6041");

    done();
  });

  it("Should handle the sample dataset ", function(done) {
    metadataPath = "test_data/sample/ro-crate-metadata.jsonld";
    var c = new RoCrate(JSON.parse(fs.readFileSync(metadataPath)));
    c.index();
    
    const workbook = new Workbook(c);
    const orgJSON =  XLSX.utils.sheet_to_json(workbook.excel.Sheets["@type=Organization"]);
    //console.log(workbook.excel.Sheets)

    XLSX.writeFile(workbook.excel, 'test.xlsx');

    assert.equal(Object.keys(workbook.excel.Sheets).length, 16, "Only 2 sheets (not an extra Dataset or a CreativeWork")
    //console.log(orgJSON);
    assert.equal(orgJSON.length, 3, "three org");
    assert.equal(orgJSON[0]["@id"], "https://ror.org/03f0f6041");

    done();
  });

});





