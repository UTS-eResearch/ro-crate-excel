/* This is part of Calcyte a tool for implementing the DataCrate data packaging
spec.  Copyright (C) 2018  University of Technology Sydney

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

/* Test for collection.js */

const assert = require("assert");
const shell = require("shelljs");
const fs = require("fs-extra");
const path = require("path");
const fixtures = require("./fixtures");
const Files = require("../lib/files.js");

describe("List files", function() {
 var testPath;

  before(function () { testPath = fixtures.buildup(); });
  //after(function () { fixtures.teardown(); });


  it("Should create a list of test files", function() {
    f = new Files(testPath, 5);
    assert.equal(Object.keys(f.files).length, 12);
  });

  it("Should count the files in test_data/samples", function() {
    f = new Files("test_data/sample", 5);
    assert.equal(Object.keys(f.files).length, 4, "Four files");
    assert.equal(Object.keys(f.datasets).length, 4, "Four datasets");
    assert.equal(Object.keys(f.encodingFormats).length, 3, "Three encoding formats");

  });

  it("Should count the files in test_data/samples/ first level", function() {
    f = new Files("test_data/sample", 0);
    assert.equal(Object.keys(f.files).length, 0);
  });

  it("Should count the files in test_data/samples/pics", function() {
    f = new Files("test_data/sample/pics", 0);
    assert.equal(Object.keys(f.files).length, 2);
  });

});

 



