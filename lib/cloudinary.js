// utils/cloudinary.js
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a single image (base64 or URL)
 */
const uploadSingleImage = async (imageData, folder = "portfolio") => {
  return await cloudinary.uploader.upload(imageData, {
    folder,
  });
};

/**
 * Upload multiple images (returns array of uploaded URLs)
 */
const uploadMultipleImages = async (images, folder = "portfolio") => {
  const uploaded = await Promise.all(
    images.map((img) => uploadSingleImage(img, folder))
  );
  return uploaded.map((file) => file.secure_url);
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
};
