import express from "express";
import { getProducts, addProduct, deleteProduct, updateProduct } from "../controllers/ProductController.js";

const router = express.Router();

// ✅ GET All Products
router.get("/", getProducts);

// ✅ POST Add New Product (Controller handles Multer/FormData processing)
router.post("/", addProduct); 

// ✅ PUT Update Product by ID (Controller handles Multer/FormData processing)
router.put("/:id", updateProduct);

// ✅ DELETE Delete Product by ID (Controller handles image file deletion)
router.delete("/:id", deleteProduct);

export default router;