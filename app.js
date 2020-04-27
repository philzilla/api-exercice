const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const methodeOverride = require("method-override");
const path = require("path");
const sharp = require("sharp");


//////////////////////////////////////////////////////// Express
const port = 3000;
const app = express();

// Express Static
app.use(express.static("public"));

// Method-override
app.use(methodeOverride("_method"));

// Ejs Templating
app.set("view engine", "ejs");

// BodyParser
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);




////////////////////////////////////////////////////////// Upload image
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const date = Date.now();

    cb(null, date + "-" + file.originalname);
    // cb(null, file.originalname + '-' + date + ext)
  },
});

// Upload Mutler
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 8 * 2048 * 2048,
    files: 1,
  },
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype === "image/png" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/gif"
    ) {
      cb(null, true);
    } else
      cb(new Error("Le fichier doit être au format png, jpg, jpeg ou gif."));
  },
});



//////////////////////////////////////////////////////////////////////////// MongoDB
mongoose.connect("mongodb://localhost:27017/boutiqueGame", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const productSchema = new mongoose.Schema({
  title: String,
  content: String,
  price: Number,
  category: { type: mongoose.Schema.Types.ObjectId, ref: "category" },
  cover: {
    name: String,
    originalName: String,
    path: String,
    urlSharp: String,
    createAt: Date,
  },
});

const categorySchema = new mongoose.Schema({
  title: String,
});

const Product = mongoose.model("product", productSchema);
const Category = mongoose.model("category", categorySchema);

////////////////////////////////////////////////////////////////////////// Routes
// Category
app
  .route("/category")
  .get((req, res) => {
    Category.find((err, category) => {
      if (!err) {
        res.render("category", {
          categorie: category,
        });
      } else {
        res.send(err);
      }
    });
  })
  .post((req, res) => {
    const newCategory = new Category({
      title: req.body.title,
    });
    newCategory.save(function (err) {
      if (!err) {
        res.send("Category save");
      } else {
        res.send(err);
      }
    });
  });


// Page accueil
app
  .route("/")
  .get((req, res) => {
    Product.find()
      .populate("category")
      .exec(function (err, produit) {
        if (!err) {
          Category.find(function (err, category) {
            res.render("index", {
              products: produit,
              categorie: category,
            });
          });
        } else {
          res.send(err);
        }
      });
  })
  .post(upload.single("cover"), (req, res) => {
    const file = req.file;
    console.log(file);

    sharp(file.path)
      .resize(200)
      .webp({ quality: 80 })
      //  .rotate(90)
      .toFile(
        "./public/uploads/web/" +
          file.originalname.split(".").slice(0, -1).join(".") +
          ".webp",
        (err, info) => {}
      );

    const newProduct = new Product({
      title: req.body.title,
      content: req.body.content,
      price: req.body.price,
      category: req.body.category,
    });

    if (file) {
      newProduct.cover = {
        name: file.filename,
        originalName: file.originalname,
        //path: "uploads/" + filename
        path: file.path.replace("public", ""),
        urlSharp:
          "/uploads/web/" +
          file.originalname.split(".").slice(0, -1).join(".") +
          ".webp",
        createAt: Date.now(),
      };
    }

    newProduct.save(function (err) {
      if (!err) {
        res.send("save ok !");
      } else {
        res.send(err);
      }
    });
  })
  .delete(function (req, res) {
    Product.deleteMany(function (err) {
      if (!err) {
        res.send("All delete");
      } else {
        res.send(err);
      }
    });
  });


// Page d'un produit
app
  .route("/:id")
  .get(function (req, res) {
    // Adventure.findOne({ type: 'iphone' }, function (err, adventure) {});
    Product.findOne({ _id: req.params.id }, function (err, produit) {
      if (!err) {
        res.render("edition", {
          _id: produit.id,
          title: produit.title,
          content: produit.content,
          price: produit.price,
          cover: produit.cover.urlSharp,
        });
      } else {
        res.send("err");
      }
    });
  })
  .put(upload.single("cover"), function (req, res) {
    const file = req.file;
    sharp(file.path)
      .resize(200)
      .webp({ quality: 80 })
      .rotate(90)
      .toFile(
        "./public/uploads/web/" +
          file.originalname.split(".").slice(0, -1).join(".") +
          ".webp",
        (err, info) => {}
      );

    Product.update(
      //condition
      { _id: req.params.id },
      // update
      {
        title: req.body.title,
        content: req.body.content,
        price: req.body.price,
        cover: {
          name: file.filename,
          originalName: file.originalname,
          //path: "uploads/" + filename
          path: file.path.replace("public", ""),
          urlSharp:
            "/uploads/web/" +
            file.originalname.split(".").slice(0, -1).join(".") +
            ".webp",
          createAt: Date.now(),
        },
      },
      // option
      { multi: true },
      // exec
      function (err) {
        if (!err) {
          res.send("Update OK !");
        } else {
          res.send(err);
        }
      }
    );
  })
  .delete(function (req, res) {
    Product.deleteOne({ _id: req.params.id }, function (err) {
      if (!err) {
        res.send("product delete");
      } else {
        res.send(err);
      }
    });
  });



// App listen
app.listen(port, function () {
  console.log(`Ecoute le port ${port}`);
});
