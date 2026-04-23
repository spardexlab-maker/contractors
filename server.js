const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const shortid = require("shortid");
const path = require("path");
const { products: seedProducts } = require("./src/data.json");

const app = express();
app.use(bodyParser.json());

app.use("/", express.static(path.join(__dirname, "build")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "build", "index.html")));

let useMongo = false;
let Product;
let Order;
let memoryProducts = seedProducts.map((product) => ({ ...product }));
let memoryOrders = [];

const productSchema = new mongoose.Schema({
  _id: { type: String, default: shortid.generate },
  title: String,
  description: String,
  image: String,
  price: Number,
  availableSizes: [String],
});

const orderSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: shortid.generate,
    },
    email: String,
    name: String,
    address: String,
    total: Number,
    cartItems: [
      {
        _id: String,
        title: String,
        price: Number,
        count: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const initDataStore = async () => {
  if (!process.env.MONGODB_URL) {
    console.log("MONGODB_URL is not set, using in-memory sample data.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 3000,
    });

    Product = mongoose.model("products", productSchema);
    Order = mongoose.model("order", orderSchema);
    useMongo = true;
    console.log("Connected to MongoDB.");
  } catch (error) {
    console.warn("MongoDB unavailable, falling back to in-memory data.");
    console.warn(error.message);
  }
};

app.get("/api/products", async (req, res) => {
  if (useMongo) {
    const products = await Product.find({});
    return res.send(products);
  }

  return res.send(memoryProducts);
});

app.post("/api/products", async (req, res) => {
  if (useMongo) {
    const newProduct = new Product(req.body);
    const savedProduct = await newProduct.save();
    return res.send(savedProduct);
  }

  const newProduct = { _id: shortid.generate(), ...req.body };
  memoryProducts.push(newProduct);
  return res.send(newProduct);
});

app.delete("/api/products/:id", async (req, res) => {
  if (useMongo) {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    return res.send(deletedProduct);
  }

  const deletedProduct = memoryProducts.find((product) => product._id === req.params.id);
  memoryProducts = memoryProducts.filter((product) => product._id !== req.params.id);
  return res.send(deletedProduct);
});

app.post("/api/orders", async (req, res) => {
  if (
    !req.body.name ||
    !req.body.email ||
    !req.body.address ||
    !req.body.total ||
    !req.body.cartItems
  ) {
    return res.send({ message: "Data is required." });
  }

  if (useMongo) {
    const order = await Order(req.body).save();
    return res.send(order);
  }

  const order = {
    _id: shortid.generate(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  memoryOrders.push(order);
  return res.send(order);
});
app.get("/api/orders", async (req, res) => {
  if (useMongo) {
    const orders = await Order.find({});
    return res.send(orders);
  }

  return res.send(memoryOrders);
});
app.delete("/api/orders/:id", async (req, res) => {
  if (useMongo) {
    const order = await Order.findByIdAndDelete(req.params.id);
    return res.send(order);
  }

  const order = memoryOrders.find((item) => item._id === req.params.id);
  memoryOrders = memoryOrders.filter((item) => item._id !== req.params.id);
  return res.send(order);
});

const port = process.env.PORT || 5000;
initDataStore().finally(() => {
  app.listen(port, () => console.log(`serve at http://localhost:${port}`));
});
