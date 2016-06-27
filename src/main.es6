class ColourDominanceCalculator {

  constructor() {
    this.bucketCount = 32
    this.granularity = 128
    this.variations = 3

    this.smoothingPasses = 5
    this.smoothingValue = 0.5

    this.minChroma = 45
    this.maxChroma = 245

    this.minBrightness = 0.2
    this.maxBrightness = 0.9

    this.minSaturation = 0.1
    this.maxSaturation = 0.5
  }

  calculate(imageData) {
    this.colourBuckets = new Array(Math.pow(this.bucketCount, 3)).fill(0)
    this.smootheningBuckets = new Array(Math.pow(this.bucketCount, 3)).fill(0)

    var length = imageData.data.length

    // Create a color map of x and y coordinates
    for (let y = 0; y < 1; y += 1 / this.granularity) {
      for (let x = 0; x < 1; x += 1 / this.granularity) {

        // Translate map pixel coordinates to actual image pixel coordinates
        let xx = Math.floor(x * imageData.width)
        let yy = Math.floor(y * imageData.height)

        // Extrapolate r, g and b values from the x and y coordinates
        let r = imageData.data[(imageData.width * yy + xx) * 4]
        let g = imageData.data[(imageData.width * yy + xx) * 4 + 1]
        let b = imageData.data[(imageData.width * yy + xx) * 4 + 2]

        let [h, s, l] = this.rgbToHsl(r, g, b)

        // Avoid colors that are too dark, bright or saturated
        let tooWhite = (r < this.minChroma && g < this.minChroma && b < this.minChroma)
        let tooBlack = (r > this.maxChroma && g > this.maxChroma && b > this.maxChroma)

        let tooBright = (l < this.minBrightness)
        let tooDark = (l > this.maxBrightness)

        let tooSaturated = (s < this.minSaturation)
        let tooUnsaturated = (s > this.maxSaturation)

        if (!(tooWhite || tooBlack || tooBright || tooDark || tooSaturated || tooUnsaturated)) {
          this.addToBucket(r, g, b)
        }

      }
    }

    // Run several passes of smoothing
    for (let pass = 0; pass < this.smoothingPasses; pass++) {
      for (let b = 0; b < this.bucketCount; b++) {
        for (let g = 0; g < this.bucketCount; g++) {
          for (let r = 0; r < this.bucketCount; r++) {
            let index = b * Math.pow(this.bucketCount, 2) + g * this.bucketCount + r

            let total = this.getAtPoint(r + 0, g + 0, b + 0)
            total += this.getAtPoint(r + 1, g + 1, b + 1) * this.smoothingValue
            total += this.getAtPoint(r + 1, g + 1, b - 1) * this.smoothingValue
            total += this.getAtPoint(r + 1, g - 1, b + 1) * this.smoothingValue
            total += this.getAtPoint(r + 1, g - 1, b - 1) * this.smoothingValue
            total += this.getAtPoint(r - 1, g + 1, b + 1) * this.smoothingValue
            total += this.getAtPoint(r - 1, g + 1, b - 1) * this.smoothingValue
            total += this.getAtPoint(r - 1, g - 1, b + 1) * this.smoothingValue
            total += this.getAtPoint(r - 1, g - 1, b - 1) * this.smoothingValue

            // Divide the total by the total of all coefficients
            this.smootheningBuckets[index] = total /= (8 * this.smoothingValue + 1)
          }
        }
      }

      // Replace the regular bucket with the smoothened one
      for (let i = 0; i < Math.pow(this.bucketCount, 3); i++ ) {
        this.colourBuckets[i] = this.smootheningBuckets[i]
      }
    }

    var variations = []

    for (let variation = 0; variation < this.variations; variation++) {
      let topBucket = -1
      for (let i = 0; i < Math.pow(this.bucketCount, 3); i++) {
        if (topBucket == -1 || this.colourBuckets[i] > this.colourBuckets[topBucket]) {
          if (variation > 0) {
            let valid = true
            for (let pass = 0; pass < variation; pass++) {
              let coords = this.convertBucketIDToCoords(i)
              let coordsLastCol = this.convertBucketIDToCoords(variations[pass])
              let magnitude = Math.sqrt(Math.pow(coords[0] - coordsLastCol[0], 2) + Math.pow(coords[1] - coordsLastCol[1], 2) + Math.pow(coords[2] - coordsLastCol[2], 2))
              if (magnitude < this.bucketCount / 2) {
                valid = false
              }
            }
            if (valid) { topBucket = i }
          } else {
            topBucket = i
          }
        }
      }
      variations.push(topBucket)
    }

    let colors = []
    for (let variation of variations) {
      colors.push(this.convertBucketIDToRGB(variation))
    }
    return colors
  }

  addToBucket(r, g, b) {
    r = this.convertColourToBucket(r)
    g = this.convertColourToBucket(g)
    b = this.convertColourToBucket(b)

    let index = (b * Math.pow(this.bucketCount, 2)) + (g * this.bucketCount) + r
    this.colourBuckets[index]++
  }

  getAtPoint(r,g,b) {
    if (r < 0 || r > this.bucketCount - 1) { return 0 }
    if (g < 0 || g > this.bucketCount - 1) { return 0 }
    if (b < 0 || b > this.bucketCount - 1) { return 0 }

    r = Math.max(Math.min(this.bucketCount - 1, r), 0)
    g = Math.max(Math.min(this.bucketCount - 1, g), 0)
    b = Math.max(Math.min(this.bucketCount - 1, b), 0)

    let index = b * Math.pow(this.bucketCount, 2) + g * this.bucketCount + r
    return this.colourBuckets[index]
  }

  convertBucketIDToCoords(bucketId) {
    let r = bucketId % this.bucketCount
    let g = Math.floor(bucketId / this.bucketCount)  % this.bucketCount
    let b = Math.floor(bucketId / (Math.pow(this.bucketCount, 2))) % this.bucketCount
    return [r, g, b]
  }

  convertBucketIDToRGB(bucketId) {
    let r = bucketId % this.bucketCount;
    let g = Math.floor(bucketId / this.bucketCount)  % this.bucketCount;
    let b = Math.floor(bucketId / (Math.pow(this.bucketCount, 2))) % this.bucketCount
    return {
      r: parseInt(r * 255 / this.bucketCount),
      g: parseInt(g * 255 / this.bucketCount),
      b: parseInt(b * 255 / this.bucketCount)
    }
  }

  convertColourToBucket(color) {
    return Math.floor(color / 256 * this.bucketCount)
  }

  rgbToHsl(r, g, b) {
      r /= 255
      g /= 255
      b /= 255

      let max = Math.max(r, g, b)
      let min = Math.min(r, g, b)
      let l = (max + min) / 2

      let h, s

      if (max == min) {
        h = s = 0
      } else {
          var d = max - min
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
          switch(max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0)
                break
              case g:
                h = (b - r) / d + 2
                break
              case b:
                h = (r - g) / d + 4
                break
          }
          h /= 6
      }

      return [h, s, l]
  }

  hslToRgb(h, s, l) {
      let r, g, b

      if (s == 0) {
          r = g = b = l
      } else {
          var hue2rgb = function hue2rgb(p, q, t) {
              if(t < 0) t += 1
              if(t > 1) t -= 1
              if(t < 1/6) return p + (q - p) * 6 * t
              if(t < 1/2) return q
              if(t < 2/3) return p + (q - p) * (2/3 - t) * 6
              return p
          }

          var q = l < 0.5 ? l * (1 + s) : l + s - l * s
          var p = 2 * l - q
          r = hue2rgb(p, q, h + 1/3)
          g = hue2rgb(p, q, h)
          b = hue2rgb(p, q, h - 1/3)
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
  }
}

function deriveImageData(img) {
  let canvas = document.createElement("canvas")
  let height = canvas.height = img.naturalHeight || img.offsetHeight || img.height
  let width = canvas.width = img.naturalWidth || img.offsetWidth || img.width
  let context = canvas.getContext && canvas.getContext("2d")
  context.drawImage(img, 0, 0)
  return context.getImageData(0, 0, width, height)
}

function toRGBString(rgb) {
  return "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")"
}

function toBrightnessCoefficient(rgb) {
  return (rgb.r * 0.39 + rgb.g * 0.5 + rgb.b * 0.11) / 255
}

let images = document.getElementsByClassName("image")
for (let image of images) {
  let el = image.getElementsByTagName("IMG")
  let data = deriveImageData(el[0])

  let calc = new ColourDominanceCalculator()
  let colors = calc.calculate(data)

  image.style.background = toRGBString(colors[0])
  image.getElementsByClassName("secondary")[0].style.background = toRGBString(colors[1])
  image.getElementsByClassName("secondary")[0].style.color = toBrightnessCoefficient(colors[1]) >= 0.5 ? "black" : "white"

  image.getElementsByClassName("tertiary")[0].style.background = toRGBString(colors[2])
  image.getElementsByClassName("tertiary")[0].style.color = toBrightnessCoefficient(colors[2]) >= 0.5 ? "black" : "white"
}
