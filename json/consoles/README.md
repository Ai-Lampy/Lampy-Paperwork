# Console Reference Library

`manifest.json` lists the manufacturer console libraries loaded by Lampy Paperwork.

Store one JSON file per manufacturer in this folder. Add every new file to the manifest:

```json
{
  "name": "Manufacturer Name",
  "file": "manufacturer-name.json"
}
```

Manufacturer files use the rack-library-style `devices` collection:

```json
{
  "schemaVersion": 4,
  "manufacturer": "Manufacturer Name",
  "devices": [
    {
      "id": "manufacturer-unique-console-id",
      "manufacturer": "Manufacturer Name",
      "name": "Console Name",
      "type": "Lighting Console",
      "dimensionsMm": {
        "width": null,
        "height": null,
        "depth": null
      },
      "weightKg": null,
      "imageUrl": "images/consoles/console-name.png",
      "ports": [
        {
          "connector": "XLR-5 female",
          "directions": ["output"],
          "facing": "rear",
          "quantity": 1
        }
      ],
      "power": {
        "connectors": [],
        "poeIn": false
      },
      "protocols": [],
      "softwareVersions": [
        {
          "platformName": "1.0"
        }
      ],
      "softwareModes": []
    }
  ]
}
```

Keep device IDs unique across every manufacturer file because saved projects use them to reconnect console references. Retain existing IDs when updating a console. Port `directions` must be an array; use both `"input"` and `"output"` for a bidirectional port.

Console protocols may be listed at device level or within individual port records. Lampy derives the device protocol choices from its port records when the device-level list is absent.

For a single-platform console, each software-version object uses the platform name as its key, such as `{ "titan": "19.2" }`, `{ "magicQ": "1.9.8.3" }`, `{ "quickQ": "12.1" }`, `{ "eos": "3.2.11" }`, or `{ "hogOs": "4.2.0" }`. The existing paired `mode3` and `mode2` version structure remains supported for MA consoles.
