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
const IDRC_metadataPath = "test_data/IDRC/ro-crate-metadata.json";


describe("Create a workbook from a crate", function() {

  it("Should create a workbook with just one sheet", function(done) {
    const c = new RoCrate();
    c.index();
    const workbook = new Workbook(c);
    const sheet = workbook.workbook.getWorksheet("RootDataset");
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
    root["name"] =  "My dataset";
    root["description"] =  "Some old dataset";
    const workbook = new Workbook(c);
    const rootSheetName = "RootDataset";
    datasetItem = workbook.sheetToItem(rootSheetName);
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
    assert.equal(workbook.workbook["_worksheets"].length, 4, "There are only two sheets");


    done();
  });

  it("Should handle the sample dataset", async function(done) {
    var c = new RoCrate(JSON.parse(fs.readFileSync(metadataPath)));
    c.index();
    
    const workbook = new Workbook(c);
    //console.log(workbook.excel.Sheets)
    assert.equal(workbook.workbook["_worksheets"].length, 15, "14 sheets")

    workbook.workbook.xlsx.writeFile("test.xlsx");
    const root = workbook.sheetToItem("RootDataset");
    assert.equal(root.publisher, `"https://ror.org/0384j8v12"`)
    expect(root.hasPart).to.deep.equal([`"lots_of_little_files/"`, `"pics/"`])

    // Name indexing works
    workbook.indexCrateByName();
    const pt = workbook.getItemByName("Peter Sefton")
    assert.equal(pt.name, "Peter Sefton")

    //@context handling works
    const context = workbook.workbook.getWorksheet("@context")
    console.log("ROW", context.getRow(3).values)
    expect(context.getRow(3).values[1]).to.equal("@vocab");
    expect(context.getRow(3).values[2]).to.equal("http://schema.org/");

    const items = workbook.sheetToItems("@type=Person");
    assert.equal(items.length, 1);
    assert.equal(items[0].name, "Peter Sefton");

    done();
  });


  it("Should handle the the IDRC (Cameron Neylon) dataset", async function(done) {
    var c = new RoCrate(JSON.parse(fs.readFileSync(IDRC_metadataPath)));
    c.index();
    
    const workbook = new Workbook(c);
    //console.log(workbook.excel.Sheets)
    //assert.equal(workbook.workbook["_worksheets"].length, 15, "14 sheets")

    workbook.workbook.xlsx.writeFile("METADATA_IDRC.xlsx");
   

    done();
  });

  it("Can resolve double quoted references", async function(done) {
    var c = new RoCrate();
    c.index();
    const workbook = new Workbook(c);
    const graph = workbook.crate.getGraph();
    graph.push(
      {"@id": "#test1", name: "test 1"},
      {"@id": "#test2", name: "test 2"},
      {"@id": "#test3", name: "test 3"},
      {
        "@id": "#test4", 
        name: "references",
        author: `"#test1"`, //By ID
        publisher: `"test2"`, // BY ID minus #
        contributor: `"test 3"` // By name
      }
    )
    
    workbook.resolveLinks();
    const item4 = workbook.crate.getItem("#test4")
    assert.equal(item4.author["@id"], "#test1");
    assert.equal(item4.publisher["@id"], "#test2");
    assert.equal(item4.contributor["@id"], "#test3");
    done();
});


it("Can deal with extra context terms", async function() {
  var c = new RoCrate();
  c.index();

  c.json_ld["@graph"].push(
    {
      "@type": "Property",
      "@id": "_:myprop",
      "label": "myProp",
      "comment": "My description of my custom property",
      })
    c.json_ld["@graph"].push(
      {
        "@type": "Property",
        "@id": "_:http://example.com/mybetterprop",
        "label": "myBetterProp",
        "comment": "My description of my custom property",
      })
  c.json_ld["@context"].push({ 
    myProp: "_:myprop",
    myBetterProp: "_:http://example.com/mybetterprop"
  }
  )

  
  const workbook = new Workbook(c);
  await workbook.workbook.xlsx.writeFile("test_context.xlsx");

  console.log(workbook.crate.json_ld["@context"])
  const contextSheet = workbook.workbook.getWorksheet("@context")
  expect(contextSheet.getRow(3).values[1]).to.equal("@vocab");
  expect(contextSheet.getRow(3).values[2]).to.equal("http://schema.org/");
  console.log(contextSheet.getRow(4).values[1]);
  console.log(contextSheet.getRow(5).values)

  
  
});




  it("Can export a workbook to a crate", async function() {
    var c = new RoCrate(JSON.parse(fs.readFileSync(metadataPath)));
    const graphLength = c.getGraph().length;
    c.index();
    const workbook = new Workbook(c);
    // 
    prom = await workbook.workbookToCrate();
    //console.log(workbook.crate.getGraph(), "XXX");
    expect(workbook.crate.getGraph().length).to.eql(graphLength);

    
});


});





