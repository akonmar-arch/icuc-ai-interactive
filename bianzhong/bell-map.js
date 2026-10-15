/* Measured model-space regions; X horizontal, Y up, Z depth. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BIANZHONG_MODEL = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const model = {
  "url": "assets/models/default-bianzhong.glb",
  "name": "双层编钟",
  "sha256": "f0d3f74b2bb3d3edfeb59b204a0f9f38666db1dca753d286d4cebb9a936539e3",
  "byteLength": 76451544,
  "bells": [
    {
      "id": "lower-1",
      "label": "下层第4只",
      "noteIndex": 0,
      "min": [
        -0.340881,
        0.12263,
        -0.055828
      ],
      "max": [
        -0.162267,
        0.369972,
        0.056137
      ],
      "anchor": [
        -0.251574,
        0.246301,
        -0.058828
      ]
    },
    {
      "id": "lower-2",
      "label": "下层第3只",
      "noteIndex": 1,
      "min": [
        -0.123306,
        0.138346,
        -0.053232
      ],
      "max": [
        0.032231,
        0.369987,
        0.053592
      ],
      "anchor": [
        -0.045538,
        0.254167,
        -0.056232
      ]
    },
    {
      "id": "lower-3",
      "label": "下层第2只",
      "noteIndex": 2,
      "min": [
        0.067717,
        0.16674,
        -0.049558
      ],
      "max": [
        0.212458,
        0.369988,
        0.050072
      ],
      "anchor": [
        0.140088,
        0.268364,
        -0.052558
      ]
    },
    {
      "id": "lower-4",
      "label": "下层第1只",
      "noteIndex": 3,
      "min": [
        0.25473,
        0.196236,
        -0.044344
      ],
      "max": [
        0.366839,
        0.369989,
        0.044815
      ],
      "anchor": [
        0.310784,
        0.283112,
        -0.047344
      ]
    },
    {
      "id": "upper-7",
      "label": "上层第1只",
      "noteIndex": 4,
      "min": [
        0.27132,
        0.472601,
        -0.037301
      ],
      "max": [
        0.359315,
        0.600707,
        0.037446
      ],
      "anchor": [
        0.315318,
        0.536654,
        -0.040301
      ]
    },
    {
      "id": "upper-6",
      "label": "上层第2只",
      "noteIndex": 5,
      "min": [
        0.142742,
        0.473221,
        -0.03653
      ],
      "max": [
        0.224334,
        0.600787,
        0.036921
      ],
      "anchor": [
        0.183538,
        0.537004,
        -0.03953
      ]
    },
    {
      "id": "upper-5",
      "label": "上层第3只",
      "noteIndex": 6,
      "min": [
        0.044922,
        0.477623,
        -0.036462
      ],
      "max": [
        0.126442,
        0.600994,
        0.036589
      ],
      "anchor": [
        0.085682,
        0.539308,
        -0.039462
      ]
    },
    {
      "id": "upper-4",
      "label": "上层第4只",
      "noteIndex": 7,
      "min": [
        -0.061099,
        0.482301,
        -0.036578
      ],
      "max": [
        0.020854,
        0.600846,
        0.036898
      ],
      "anchor": [
        -0.020123,
        0.541574,
        -0.039578
      ]
    },
    {
      "id": "upper-3",
      "label": "上层第5只",
      "noteIndex": 8,
      "min": [
        -0.160772,
        0.488762,
        -0.035727
      ],
      "max": [
        -0.082412,
        0.600863,
        0.03567
      ],
      "anchor": [
        -0.121592,
        0.544813,
        -0.038727
      ]
    },
    {
      "id": "upper-2",
      "label": "上层第6只",
      "noteIndex": 9,
      "min": [
        -0.243672,
        0.506255,
        -0.03087
      ],
      "max": [
        -0.179202,
        0.60069,
        0.031545
      ],
      "anchor": [
        -0.211437,
        0.553473,
        -0.03387
      ]
    },
    {
      "id": "upper-1",
      "label": "上层第7只",
      "noteIndex": 10,
      "min": [
        -0.332004,
        0.512956,
        -0.030183
      ],
      "max": [
        -0.268594,
        0.600762,
        0.030807
      ],
      "anchor": [
        -0.300299,
        0.556859,
        -0.033183
      ]
    }
  ]
};

  // Ray hits stay in model coordinates while the camera rotates or zooms.
  // Exclude the two wooden beams before applying small shell tolerances.
  function bellIndexFromPoint(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) return -1;
    const {x, y, z} = point;
    if (y >= 0.600 || (y >= 0.370 && y <= 0.470) || y <= 0.115) return -1;
    for (const bell of model.bells) {
      const lo = bell.min;
      const hi = bell.max;
      if (x >= lo[0] - 0.004 && x <= hi[0] + 0.004 &&
          y >= lo[1] - 0.001 && y <= hi[1] + 0.001 &&
          z >= lo[2] - 0.004 && z <= hi[2] + 0.004) return bell.noteIndex;
    }
    return -1;
  }

  model.bellIndexFromPoint = bellIndexFromPoint;
  return model;
});
