/* This is part of Calcyte, a tool for implementing the DataCrate data packaging
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

/* Bags a datacrate wich already has a metadata.json file */

const path = require("path");
const fs = require("fs-extra");
const hasha = require('hasha');
const _ = require('lodash');
const DIGEST_ALGORITHM = 'sha512';

class Bag {
      generate_bag_info() {
      this.bag_meta = {
        "ROCrate_Specification_Identifier":
          this.crate.defaults.ROCrate_Specification_Identifier
      }


      if (this.root["contactPoint"] && this.root["contactPoint"]["@id"]) {
        var contact = this.crate.getItem(this.root["contactPoint"]["@id"]);
        var map = {
          email: "Contact-Email",
          phone: "Contact-Telephone",
          name: "Contact-Name"
        };
        
        for (var [k, v] of Object.entries(map)) {
          if (contact[k]) {
            this.bag_meta[v] = String(contact[k]);
          }
        }
      }

      if (this.root["publisher"] && this.root["publisher"]["@id"]) {
        var publisher = this.crate.getItem(this.root["publisher"]["@id"]);
        
        if(publisher["name"]) {
          this.bag_meta["SourceOrganization"] = publisher.name
          
        }
      }
      if (this.root["description"]) {
        this.bag_meta["External-Description"] = this.root["description"];
      }
      this.bag_meta["Bagging-Date"] = new Date().toISOString();
      // Return a hash of BagIt style metadata by looking for it in the JSON-LD structure


    }
   

   save_bag_info() {
      var bag_info = "";
      for (var [k, v] of Object.entries(this.bag_meta)) {
        bag_info += k + ": " + v + "\n";
      }
      fs.writeFileSync(path.join(this.targetDir, "bag-info.txt"), bag_info);
    }

    update_bag_tags() {
      //shell.exec(`bagit updatetagmanifests  "${this.targetDir}"`);
    };

   
  async bag(sourceDir, bag_dir, crate) {
      // TODO Generate a list of all files
      // FOR NOW: delete metadata.json and index.html
      // Generate bag info later

      this.crate = crate;
      this.crate.index(); 
      this.root = crate.getRootDataset();
      this.helper = crate.utils;
      this.targetDir = bag_dir;
      console.log("TARGET", this.targetDir, "SOURCE", sourceDir)
      var dataPath = path.join(this.targetDir, "data");
      if (fs.existsSync(this.targetDir)) {
        await fs.remove(this.targetDir);
      }
      await fs.mkdirs(this.targetDir)
      //TODO remove target
      await fs.copy(sourceDir, path.resolve(dataPath));
      var items = {};
      await this.digest_dir(path.resolve(this.targetDir), items);
      var manifestPath = path.resolve(path.join(this.targetDir, `manifest-${DIGEST_ALGORITHM}.txt`));
      var manifest = "";
      for (let item of Object.keys(items)){
        manifest += `${items[item]} ${path.relative(this.targetDir, item)}\n`;
      }
      await fs.writeFile(manifestPath, manifest);
      var bagFilePath = path.resolve(path.join(this.targetDir, "bagit.txt"));
      await fs.writeFile(bagFilePath, "BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8");
     
      return this.targetDir;
    }

  async digest_dir(dir, items) {
    const contents = await fs.readdir(dir);
    items = _.flatten(await Promise.all(contents.map(async (p1) => {
      const p = path.join(dir, p1);
      const stats = await fs.stat(p);
      if (stats.isDirectory()) {
        await this.digest_dir(p, items);
      } else {
        const h = await this.hash_file(p);
        items[p] = h;
      }
    })));
  }

  async hash_file(p) {
    const hash = await hasha.fromFile(p, { algorithm: DIGEST_ALGORITHM })
    return hash;
  }
  }

module.exports  = Bag;
