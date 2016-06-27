export default class ColorDominanceCalculator {

  constructor(args={}) {
    const defaults = {
      colorDensity: 32,
      variations: 3,
      granularity: 16384,

      blurPasses: 3,
      blurValue: 0.5,

      minLuminosity: 0.15,
      maxLuminosity: 0.95,

      minSaturation: 0.05,
      maxSaturation: 0.4,
    }

    let opts = Object.assign({}, defaults, args)

    this.variations = opts.variations

    this.colorDensity = opts.colorDensity
    this.granularity = opts.granularity

    this.blurPasses = opts.blurPasses
    this.blurValue = opts.blurValue

    this.minLuminosity = opts.minLuminosity
    this.maxLuminosity = opts.maxLuminosity

    this.minIntensity = Math.floor(this.minLuminosity * 256)
    this.maxIntensity = Math.floor(this.maxLuminosity * 256)

    this.minSaturation = opts.minSaturation
    this.maxSaturation = opts.maxSaturation
  }

  calculate(imageData) {
    this.colorBuckets = new Array(Math.pow(this.colorDensity, 3)).fill(0)
    this.blurBuckets = new Array(Math.pow(this.colorDensity, 3)).fill(0)

    // Create a color map matrix with the same aspect ratio as the image
    let sqr = Math.sqrt(this.granularity)
    let mapX = Math.floor(sqr * imageData.width / imageData.height)
    let mapY = Math.floor(sqr * imageData.height / imageData.width)

    for (let y = 0; y < 1; y += 1 / mapY)
    for (let x = 0; x < 1; x += 1 / mapX) {

      // Translate map pixel coordinates to actual image pixel coordinates
      let xx = Math.floor(x * imageData.width)
      let yy = Math.floor(y * imageData.height)

      // Extrapolate r, g and b values from the x and y coordinates
      let r = imageData.data[(imageData.width * yy + xx) * 4]
      let g = imageData.data[(imageData.width * yy + xx) * 4 + 1]
      let b = imageData.data[(imageData.width * yy + xx) * 4 + 2]

      let [h, s, l] = this.rgbToHsl(r, g, b)

      // Avoid colors that are too dark, bright or saturated
      let tooWhite = (r < this.minIntensity && g < this.minIntensity && b < this.minIntensity)
      let tooBlack = (r > this.maxIntensity && g > this.maxIntensity && b > this.maxIntensity)

      // Add color to bucket if inside the chromatic value constraints
      if (!(tooWhite || tooBlack)) {
        this.addToBucket(r, g, b)

        // Amplify color by adding it to the bucket again if within saturation and brightness constraints
        let tooBright = (l < this.minLuminosity)
        let tooDark = (l > this.maxLuminosity)

        let tooSaturated = (s < this.minSaturation)
        let tooUnsaturated = (s > this.maxSaturation)

        if (!(tooBright || tooDark || tooSaturated || tooUnsaturated)) {
          this.addToBucket(r, g, b)
        }
      }
    }

    // Run several passes of smoothing
    for (let pass = 0; pass < this.blurPasses; pass++) {

      // Iterate over all colors in the bit map
      for (let b = 0; b < this.colorDensity; b++)
      for (let g = 0; g < this.colorDensity; g++)
      for (let r = 0; r < this.colorDensity; r++) {
        let index = b * Math.pow(this.colorDensity, 2) + g * this.colorDensity + r

        let total = this.getAtPoint(r + 0, g + 0, b + 0)
        total += this.getAtPoint(r + 1, g + 1, b + 1) * this.blurValue
        total += this.getAtPoint(r + 1, g + 1, b - 1) * this.blurValue
        total += this.getAtPoint(r + 1, g - 1, b + 1) * this.blurValue
        total += this.getAtPoint(r + 1, g - 1, b - 1) * this.blurValue
        total += this.getAtPoint(r - 1, g + 1, b + 1) * this.blurValue
        total += this.getAtPoint(r - 1, g + 1, b - 1) * this.blurValue
        total += this.getAtPoint(r - 1, g - 1, b + 1) * this.blurValue
        total += this.getAtPoint(r - 1, g - 1, b - 1) * this.blurValue

        // Divide the total by the total of all coefficients
        this.blurBuckets[index] = total /= (8 * this.blurValue + 1)
      }

      // Replace the regular bucket with the smoothened one
      for (let i = 0; i < Math.pow(this.colorDensity, 3); i++ ) {
        this.colorBuckets[i] = this.blurBuckets[i]
      }
    }

    var variations = []

    for (let variation = 0; variation < this.variations; variation++) {
      let topBucket = -1
      for (let i = 0; i < Math.pow(this.colorDensity, 3); i++) {
        if (topBucket == -1 || this.colorBuckets[i] > this.colorBuckets[topBucket]) {
          if (variation > 0) {
            let valid = true
            for (let pass = 0; pass < variation; pass++) {
              let coords = this.convertBucketIDToCoords(i)
              let coordsLastCol = this.convertBucketIDToCoords(variations[pass])

              let magnitude = Math.sqrt(Math.pow(coords[0] - coordsLastCol[0], 2) + Math.pow(coords[1] - coordsLastCol[1], 2) + Math.pow(coords[2] - coordsLastCol[2], 2))
              if (magnitude < this.colorDensity / 2) {
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
    r = this.convertcolorToBucket(r)
    g = this.convertcolorToBucket(g)
    b = this.convertcolorToBucket(b)

    let index = (b * Math.pow(this.colorDensity, 2)) + (g * this.colorDensity) + r
    this.colorBuckets[index]++
  }

  getAtPoint(r,g,b) {
    if (r < 0 || r > this.colorDensity - 1) { return 0 }
    if (g < 0 || g > this.colorDensity - 1) { return 0 }
    if (b < 0 || b > this.colorDensity - 1) { return 0 }

    r = Math.max(Math.min(this.colorDensity - 1, r), 0)
    g = Math.max(Math.min(this.colorDensity - 1, g), 0)
    b = Math.max(Math.min(this.colorDensity - 1, b), 0)

    let index = b * Math.pow(this.colorDensity, 2) + g * this.colorDensity + r
    return this.colorBuckets[index]
  }

  convertBucketIDToCoords(bucketId) {
    let r = bucketId % this.colorDensity
    let g = Math.floor(bucketId / this.colorDensity)  % this.colorDensity
    let b = Math.floor(bucketId / (Math.pow(this.colorDensity, 2))) % this.colorDensity
    return [r, g, b]
  }

  convertBucketIDToRGB(bucketId) {
    let r = bucketId % this.colorDensity;
    let g = Math.floor(bucketId / this.colorDensity)  % this.colorDensity;
    let b = Math.floor(bucketId / (Math.pow(this.colorDensity, 2))) % this.colorDensity
    return {
      r: parseInt(r * 255 / this.colorDensity),
      g: parseInt(g * 255 / this.colorDensity),
      b: parseInt(b * 255 / this.colorDensity)
    }
  }

  convertcolorToBucket(color) {
    return Math.floor(color / 256 * this.colorDensity)
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
}
