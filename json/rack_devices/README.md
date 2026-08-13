# Rack Device Library

`manifest.json` lists the rack-device and rack-accessory library files loaded by Lampy Paperwork.

Add new devices to the matching manufacturer file. Add another manufacturer by creating a lowercase JSON file in this folder and adding it to `manifest.json`.

## Device fields

```json
{
  "id": "manufacturer-unique-device-id",
  "name": "Device Name",
  "type": "DMX Node",
  "dimensionsMm": {
    "width": null,
    "height": null,
    "depth": null
  },
  "weightKg": null,
  "rack": {
    "mountable": true,
    "heightU": 1,
    "widthFraction": 1
  },
  "ports": [
    {
      "quantity": 1,
      "connector": "XLR-5",
      "direction": "output",
      "facing": "front"
    }
  ],
  "power": {
    "connectors": [
      "powerCON TRUE1"
    ],
    "poeIn": false
  },
  "protocols": [
    "sACN"
  ],
  "processingEngines": null,
  "imageUrl": "images/manufacturer/device.png",
  "lineImageUrl": "images/manufacturer/device_line.png",
  "lineImageUrlFront": null,
  "lineImageUrlRear": null
}
```

Use `rack.widthFraction: 0.5` for a half-width device. Keep its physical rack height in `rack.heightU`; a half-width 1U device therefore uses:

```json
"rack": {
  "mountable": true,
  "heightU": 1,
  "widthFraction": 0.5
}
```

Dimensions use millimetres and weight uses kilograms. Use `null` for information that has not been confirmed rather than guessing.

Use `lineImageUrl` when the device has one general line image. When separate front and rear diagrams are available, use `lineImageUrlFront` and `lineImageUrlRear` instead. Either front or rear may be omitted when that view is unavailable.

For a device that cannot be mounted in a rack, use:

```json
"rack": {
  "mountable": false,
  "heightU": null,
  "widthFraction": null
}
```
