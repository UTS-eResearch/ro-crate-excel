const update = require("../lib/update.js");
const Workbook = require("../lib/workbook");
const path = require("path");
const shell = require("shelljs");
const {ROCrate} = require("ro-crate");
const fs = require("fs-extra");
const assert = require("assert");

describe("excel to rocrate", function () {
    let dir;
    let catalogPath;
    let fromJSON;
    let metadataPath;
    before(function () {
        dir = path.join("test_data", "additional");
        metadataPath = path.join(dir, "ro-crate-metadata.json")
        shell.rm(metadataPath);
        catalogPath = path.join(dir, "ro-crate-metadata.xlsx");
        fromJSON = path.join(dir, "additional-ro-crate-metadata.xlsx");
    });

    it("Should read an excel spreadsheet", async function () {
        const wb = new Workbook();
        await wb.loadExcel(catalogPath);
    });

    it("should process additional excel spreadsheet", async function () {
        const existingCrate = true;
        const depth = 0;
        await update(dir, depth, fromJSON, existingCrate);
    });

    it("should have ro-crate entities", async function () {
        const json = JSON.parse(await fs.readFile(metadataPath, "utf8"));
        const crate = new ROCrate(json, {array: true, link: true});
        const objectRosa = crate.getItem("#OBJECT_Rosa");
        const speakerNumber = objectRosa["speakerNumber"];
        assert(speakerNumber[0] === "11", "should include speakerNumber");
        const rosa = objectRosa['speaker'];
        const rosaId = rosa[0]['@id'];
        assert(rosaId, '#Rosa');
        const eaf = crate.getItem("Transcripts_Anonymised/EAF_Rosa_anon.eaf");
        assert(eaf['@id'] === "Transcripts_Anonymised/EAF_Rosa_anon.eaf");
        const someProperty = eaf['someProperty'];
        assert(someProperty[0], "anon");
        const wav = crate.getItem("Audio_Anonymised/AUDIO_Rosa_anon.wav");
        assert(wav['@id'] === "Audio_Anonymised/AUDIO_Rosa_anon.wav");
        const someOtherProperty = wav['someOtherProperty'];
        assert(someOtherProperty[0], "anon");
        const maria = crate.getItem("#Maria");
        const mariaType = maria["@type"][0];
        assert(mariaType, "Person");
        const mariaGender = maria["gender"];
        assert(mariaGender?.[0] === "Female", "Should include gender property");
    });
});