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

/**
 * Delete an image from Cloudinary using its URL
 */
const deleteImageByUrl = async (imageUrl) => {
  try {
    if (!imageUrl) return;

    // Extract public ID from Cloudinary URL
    // Example: https://res.cloudinary.com/demo/image/upload/v1234567/foldername/abcd123.jpg
    const parts = imageUrl.split("/upload/");
    if (parts.length < 2) return;

    const publicIdWithExtension = parts[1].split(".")[0]; // "foldername/abcd123"
    await cloudinary.uploader.destroy(publicIdWithExtension);
  } catch (err) {
    console.error("Failed to delete image from Cloudinary:", err.message);
  }
};

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImageByUrl
};
