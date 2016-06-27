import ColorDominanceCalculator from "../lib/ColorDominanceCalculator.es6"

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

  let calc = new ColorDominanceCalculator()
  let colors = calc.calculate(data)

  image.style.background = toRGBString(colors[0])
  image.getElementsByClassName("secondary")[0].style.background = toRGBString(colors[1])
  image.getElementsByClassName("secondary")[0].style.color = toBrightnessCoefficient(colors[1]) >= 0.5 ? "black" : "white"

  image.getElementsByClassName("tertiary")[0].style.background = toRGBString(colors[2])
  image.getElementsByClassName("tertiary")[0].style.color = toBrightnessCoefficient(colors[2]) >= 0.5 ? "black" : "white"
}
