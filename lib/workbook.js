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


const defaults = require('./defaults');
const rocrate = require('ro-crate');
const XLSX = require('xlsx');
const path = require('path');
const RoCrate = rocrate.ROCrate;

class Workbook {
    constructor(crate) {

        this.excel = XLSX.utils.book_new();
        this.crate = crate;
        var ws_name = "Collection";
    
        /* make worksheet */
        var ws_data = [
            [ "Name", "Value" ],
            ["@id", "./"]
        ];
        var ws  = XLSX.utils.aoa_to_sheet(ws_data);
        
        /* Add the worksheet to the workbook */
        XLSX.utils.book_append_sheet(this.excel, ws, ws_name);
        
    }
    
}

module.exports = Workbook;



