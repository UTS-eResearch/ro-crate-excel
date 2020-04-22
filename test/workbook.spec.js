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
const rocrate = require('ro-crate');
const RoCrate = rocrate.ROCrate;
const Workbook = require("../lib/workbook.js");
const assert = require("assert");



describe("Create a workbook from a crate", function() {


  it("Should create a workbook with one sheet", function(done) {
    const c = new RoCrate();
    const workbook = new Workbook(c);
    const rootSheet = workbook.excel.Sheets["Collection"];
    console.log(workbook.excel.Sheets["Collection"]);
    
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
        "@id"
      );
      assert.equal(
          rootSheet.B2.v,
          "./"
        );

    done();
  });
});





