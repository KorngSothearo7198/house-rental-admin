export const uploadToCloudinary = async (file, resourceType = "image") => {
  const cloudName = "dxqkcp1hu";
  const uploadPreset = "rentease_images";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    if (response.ok) {
      return data.secure_url;
    } else {
      console.error("Cloudinary Error:", data);
      return null;
    }
  } catch (error) {
    console.error("Cloudinary Upload Exception:", error);
    return null;
  }
};