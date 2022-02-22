const Excel = require('exceljs');

describe("Read and write arabic text", function() {
   
    it("Should read the spreadsheet", async function() {
      this.timeout(15000); 
      workbook = new Excel.Workbook();
       await workbook.xlsx.readFile("test_data/arabic.xlsx");
       workbook.eachSheet(function(worksheet, sheetId) {
            worksheet.eachRow(function(row, rowNumber) {
                          console.log('Row ' + rowNumber + ' = ' + JSON.stringify(row.values));
              });
        });
    })
})
  



