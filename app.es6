import http from "http"
import express from "express"
import ejs from "ejs"

const PORT = 9898

let app = express()

app.set("views", "./templates")
app.set("view engine", "html")
app.engine("html", ejs.renderFile)

app.use(express.static("dist"))

app.get("/", function(req, res) {
  res.render("index")
})

app.listen(PORT, ()=> {
  console.log("Server listening on: http://localhost:%s", PORT)
})