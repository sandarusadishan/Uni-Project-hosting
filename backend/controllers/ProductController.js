import Product from "../models/product.js";
import multer from "multer";
import path from "path";
import fs from "fs"; // file system module

// Define the storage configuration for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create the 'uploads' directory if it doesn't exist
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir); // Files will be saved in the 'uploads/' directory
  },
  filename: (req, file, cb) => {
    // Save file with a unique name and timestamp
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Multer instance for single file upload, expecting the field name 'imageFile'
export const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5000000 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: File upload only supports the following filetypes - " + filetypes));
  }
}).single('imageFile'); 

// ✅ Utility to delete the old image file if it exists
const deleteOldImage = async (productId) => {
    try {
        const product = await Product.findById(productId);
        if (product && product.image) {
            // Use path.join(process.cwd(), ...) to get the absolute path
            const oldImagePath = path.join(process.cwd(), product.image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlink(oldImagePath, (err) => {
                    if (err) console.error("Error deleting old image file:", err);
                });
            }
        }
    } catch (error) {
        console.error("Error finding product to delete old image:", error);
    }
};


// ✅ Get all products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Add new product (Uses Multer 'upload' internally)
export const addProduct = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({ message: err.message || "File upload failed" });
    }

    const { name, price, description, category } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null; // Save the relative path

    if (!name || !price || !imagePath) {
      // If validation fails, and a file was uploaded, delete it
      if (req.file) {
          fs.unlink(req.file.path, (unlinkErr) => {
              if (unlinkErr) console.error("Error deleting file:", unlinkErr);
          });
      }
      return res.status(400).json({ message: "Name, Price, and Image are required" });
    }

    try {
      const newProduct = new Product({ 
        name, 
        price, 
        description, 
        category, 
        image: imagePath // Save the path to the DB
      });
      await newProduct.save();
      res.status(201).json({ message: "Product added successfully", product: newProduct });
    } catch (error) {
      // If DB fails, and a file was uploaded, delete it
      if (req.file) {
          fs.unlink(req.file.path, (unlinkErr) => {
              if (unlinkErr) console.error("Error deleting file on DB fail:", unlinkErr);
          });
      }
      console.error("DB Save Error:", error);
      if (error.code === 11000) { 
        return res.status(409).json({ message: "Product name already exists" });
      }
      res.status(500).json({ message: error.message });
    }
  });
};


// ✅ Update product (Uses Multer 'upload' internally)
export const updateProduct = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error for update:", err);
      return res.status(400).json({ message: err.message || "File upload failed" });
    }
    
    const productId = req.params.id;
    const { name, price, description, category } = req.body;
    let updateData = { name, price, description, category };
    
    // If a new file is uploaded, update the image field and delete the old file
    if (req.file) {
      await deleteOldImage(productId);
      updateData.image = `/uploads/${req.file.filename}`;
    } 
    
    if (!name || !price) {
        // If validation fails, and a new file was uploaded, delete the new file
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error("Error deleting new file:", unlinkErr);
            });
        }
        return res.status(400).json({ message: "Name and Price are required" });
    }

    try {
      const updated = await Product.findByIdAndUpdate(productId, updateData, { new: true });
      if (!updated) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(200).json({ message: "Product updated", product: updated });
    } catch (error) {
      // If DB fails, and a new file was uploaded, delete the new file
      if (req.file) {
          fs.unlink(req.file.path, (unlinkErr) => {
              if (unlinkErr) console.error("Error deleting new file on DB fail:", unlinkErr);
          });
      }
      console.error("Update error:", error);
      if (error.code === 11000) { 
        return res.status(409).json({ message: "Product name already exists" });
      }
      res.status(500).json({ message: error.message });
    }
  });
};


// ✅ Delete product
export const deleteProduct = async (req, res) => {
  try {
    const productToDelete = await Product.findById(req.params.id);
    if (!productToDelete) {
        return res.status(404).json({ message: "Product not found" });
    }

    // Delete the image file from the disk
    if (productToDelete.image) {
        const imagePath = path.join(process.cwd(), productToDelete.image);
        if (fs.existsSync(imagePath)) {
            fs.unlink(imagePath, (err) => {
                if (err) console.error("Error deleting product image file:", err);
            });
        }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};