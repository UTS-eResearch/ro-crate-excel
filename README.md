# ro-crate-excel

Node library with utilities for converting RO-Crates to Spreadsheet format for data entry and vice versa

## What is this?

This is a library for building tools to assist in JSON-lD data entry, it has been built for RO-Crate but could be used for more general purpose JSON-LD <-> Spreadsheet conversion.

## Installation

(Not published on npm yet)

Get this repository (assuming you are working in `~/working`):

`git clone https://github.com/UTS-eResearch/ro-crate-excel.git  ~/working/ro-crate-excel`

Change into the directory:
 `cd ~/working/ro-crate-excel`

Install the app:

`npm install .`

Run the tests:

`mocha`

# About the spreadsheet format

This library allows transformation between RO-Crate and Excel spreadsheets using multiple worksheets in a workbook.

## The `Root Dataset Worksheet`

The root dataset item is represented by a worksheet named "RootDataset" referred to as the `Root Dataset Worksheet`;  this worksheet has two columns, `Name` and `Value`. 
Each value of a property is represented as a row in the spreadsdheet. 

For example - the worksheet for this `Dataset`:

```
{
    "@id": "./",
   "@type": "Dataset",
    "datePublished": "2017",
    "name": "Example Dataset",
    "identifier": "https://doi.org/10.4225/59/59672c09f4a4b", 
    "description": "Do try to put more info in here than the title. Please.",
    "author": [{"@id": "https://orcid.org/0000-0002-3545-944X"}, {"@id": "https://orcid.org/0000-0001-5152-5307"}],
    "license": {"@id": "https://creativecommons.org/licenses/by-nc-sa/3.0/au/"}
 }
 ```

Is structured as per this table

| Name        | Value      |
| ----        | -----      |
| @id         | ./         |
| @type       | Dataset    |
| name        | Example Dataset |
| description | Do try to put more info in here than the title. Please.  |
| author      | "Peter Sefton" |
| author      | "Michael Lynch" |
| license     |  "https://creativecommons.org/licenses/by-nc-sa/3.0/au/" |

### Multiple values use multiple lines

The multi-valued `author` property is represented as two rows as this is convenient to do in this vertically aligned Name/Value format. 


### References

The quotes around the `Value`s for license and author indicate that the value is a reference to another item - these references can be to the `name` or `@id` property of the item. If the license and person items are JSON-LD items like these:

```
{
  "@id": "https://creativecommons.org/licenses/by/4.0/",
  "@type": "CreativeWork",
  "name": "CC BY 4.0",
  "description": "Creative Commons Attribution 4.0 International License"
},
{
      "@id": "http://orcid.org/0000-0002-3545-944X",
      "@type": "Person",
      "name": "Peter Sefton",
      "familyName": "Sefton",
      "givenName": "Peter",
      "affiliation": {
        "@id": "https://ror.org/0384j8v12"
      }
    }

    {
      "@id": "https://orcid.org/0000-0001-5152-5307",
      "@type": "Person",
      "name": "Michael Lynch",
      "familyName": "Lynch",
      "givenName": "Michael",
      "affiliation": {
        "@id": "https://ror.org/0384j8v12"
      }
          }

```

Then the Person and the CreativeWork will be described in two additional worksheets named `@type=Person` and `@type=CreativeWork`, these `Type Worksheets` use a different format to represent one item per line.

The `@type=Person` worksheet is as follows:

| @id | @type | name | FamilyName | givenName  | affiliation |  
| -- | -- | -- | -- | -- | -- |
| http://orcid.org/0000-0002-3545-944X | Person  | Peter Sefton | Sefton | Peter | 	"https://ror.org/0384j8v12" | 
| https://orcid.org/0000-0001-5152-5307 | Person | Michael Lynch | Lynch | Michael | "https://ror.org/0384j8v12" | 


And the `@type=CreativeWork` worksheet:

| @id | @type  | name   | description |
| --- | ------ | ------ | ----------- |
| https://creativecommons.org/licenses/by/4.0/ | CreativeWork | CC BY 4.0 | Creative Commons Attribution 4.0 International License | 



### Representing multiple values

To represent multiple values - for example if there are multiple affiliations for a person then a comma separated list enclosed in square brackets.

| @id | @type | name | FamilyName | givenName  | affiliation |  
| -- | -- | -- | -- | -- | -- |
| http://orcid.org/0000-0002-3545-944X | Person  | Peter Sefton | Sefton | Peter | 	["https://ror.org/0384j8v12", http://ptsefton.com] | 


This approach can also be used in the `Root Dataset Worksheet`. The URL is treated as a string value as it is not enclosed in double quotes.

| Name        | Value                             |
| ----        | --------------------------------- |
| author      | ["Peter Sefton", http://ptsefton.com] |

These values will be interpreted as references, omitting the quotes will cause a value to be interpreted as a string.

### Embedding JSON

To avoid having to create `@type Worksheets`  for things such as `GeoCoordinates` or `PropertyVale` items, items, or arrays of items may be embedded in a cell using standard JSON-LD.

For example, this `Place` item:
```
{
      "@id": "http://www.geonames.org/8152662/catalina-park.html",
      "@type": "Place",
      "address": "Katoomba, NSW",
      "description": "Catalina Park is a disused motor racing venue, located at Katoomba, in the Blue Mountains, New South Wales, Australia, and is recognised as an Aboriginal Place due to the long association of the local Gundungarra and Darug clans to the area.",
      "geo": {
        "@id": "#d2c5b5e0-a720-4b21-ad3a-f44ad89488e7"
      },
      "name": "Catalina Park"
    }
```

 Can be represented in the `@type=Place` worksheet:

@id | @type | address | description | geo | name
--- | ------|  -------- | ----------------------------------- | --- | ----
http://www.geonames.org/8152662/catalina-park.html | Place | Katoomba, NSW | Catalina Park is a disused motor racing venue, located at Katoomba, in the Blue Mountains, New South Wales, Australia, and is recognised as an Aboriginal Place due to the long association of the local Gundungarra and Darug clans to the area. | {"@id":"#d2c5b5e0-a720-4b21-ad3a-f44ad89488e7","@type":"GeoCoordinates","latitude":"-33.7152","longitude":"150.30119","name":"Latitude: -33.7152, Longitude: 150.30119"} | Catalina Park

NOTE: Any cell that contains at least one `{` and one `}` will be parsed as JSON - if that fails it will be included as an escaped string.

# Implementing Workbook to RO-Crate 


When converting from a worksheet to a JSON-LD item the process is to:

-  Convert the `Root DataSet Workseet` to an RO Crate `Root Dataset` - with the necessary `@id` and other 

-  Convert  each `@type sheet` to an item by mapping column names to properties; each row becomes an item in the RO-Crate graph.

-  Index the crate by @id and by name

-  For every item in the `@graph` array:
  -  Normalise the item's `@id`:
    - If the `@id` is a URL, or the item is, in RO-Crate terms a `Data Entity` - that has @type `File` or `Dataset` or it starts with `#` then leave it as-is. 
    - else prepend `#` to the `@id`
  -  for each value of a property that starts and ends with double quotes:
    -  If the value matches a known @id then add a reference `{"@id": "#someid"}`
    -  else if the value (without quotes) matches a known name add a reference to the item with that name
    -  else if the value (without quotes) does not start with `#` prepend `#` and see if it matches a known `@id` - if it does add it as a reference 


