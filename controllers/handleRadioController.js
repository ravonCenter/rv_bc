const fs = require("fs");
const path = require("path");
const multer = require("multer");

const radioFilePath = path.join(__dirname, "DB", "radio.json");
const publicRadioFolderPath = path.join(__dirname,"../", "public", "radio");
// Ensure the public/radio directory exists
if (!fs.existsSync(publicRadioFolderPath)) {
    fs.mkdirSync(publicRadioFolderPath, { recursive: true });
}
    
// Multer storage setup - now saving to public/radio
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, publicRadioFolderPath),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Helper function to construct image URL
const getImageUrl = (req, filename) => {
    if (!filename) return null;
    return `${req.protocol}://${req.get('host')}/public/radio/${filename}`;
};

// GET request - Fetch radio data
const handleRadioController = (req, res) => {
    fs.readFile(radioFilePath, "utf8", (error, data) => {
        if (error) {
            return res.status(500).json({ error: "Error reading database file." });
        }

        try {
            const radioJSON = JSON.parse(data);
            const updatedData = radioJSON.map((item) => ({
                ...item,
                imageUrl: item.imageUrl ? getImageUrl(req, item.imageUrl) : null,
            }));

            res.json(updatedData);
        } catch (error) {
            res.status(500).json({ error: "Error parsing JSON data." });
        }
    });
};

// POST request - Add new radio entry
const handlePostRadioController = (req, res) => {
    upload.single("image")(req, res, (err) => {
        if (err) {
            return res.status(500).json({ error: "Image upload failed." });
        }

        const { title, description } = req.body;
        const imageUrl = req.file ? req.file.filename : null;

        fs.readFile(radioFilePath, "utf8", (error, data) => {
            let radioJSON = [];

            if (!error) {
                try {
                    radioJSON = JSON.parse(data);
                } catch (parseError) {
                    return res.status(500).json({ error: "Error parsing JSON file." });
                }
            }

            const newEntry = {
                id: radioJSON.length + 1,
                title,
                description,
                imageUrl,
                createdAt: new Date().toISOString(),
            };

            radioJSON.push(newEntry);

            fs.writeFile(radioFilePath, JSON.stringify(radioJSON, null, 2), (writeError) => {
                if (writeError) {
                    // Clean up uploaded image if DB write fails
                    if (imageUrl) {
                        fs.unlink(path.join(publicRadioFolderPath, imageUrl), () => {});
                    }
                    return res.status(500).json({ error: "Error saving data." });
                }
                res.status(201).json({ 
                    message: "Radio entry added successfully!", 
                    newEntry: {
                        ...newEntry,
                        imageUrl: getImageUrl(req, newEntry.imageUrl)
                    }
                });
            });
        });
    });
};

// DELETE request - Delete radio entry
const handleDeleteRadio = (req, res) => {
    const { id } = req.params;
    
    fs.readFile(radioFilePath, "utf8", (readError, data) => {
        if (readError) {
            return res.status(500).json({ error: "Error reading radio data." });
        }

        try {
            const radioEntries = JSON.parse(data);
            const entryIndex = radioEntries.findIndex(r => r.id === parseInt(id));

            if (entryIndex === -1) {
                return res.status(404).json({ error: "Radio entry not found" });
            }

            const [deletedEntry] = radioEntries.splice(entryIndex, 1);
            
            fs.writeFile(radioFilePath, JSON.stringify(radioEntries, null, 2), (writeError) => {
                if (writeError) {
                    return res.status(500).json({ error: "Error saving radio data." });
                }

                if (deletedEntry.imageUrl) {
                    const imagePath = path.join(publicRadioFolderPath, deletedEntry.imageUrl);
                    fs.unlink(imagePath, (unlinkError) => {
                        if (unlinkError) {
                            console.error("Error deleting image:", unlinkError);
                        }
                        res.json({ 
                            message: "Radio entry deleted successfully",
                            deletedEntry: {
                                ...deletedEntry,
                                imageUrl: getImageUrl(req, deletedEntry.imageUrl)
                            }
                        });
                    });
                } else {
                    res.json({ 
                        message: "Radio entry deleted successfully",
                        deletedEntry
                    });
                }
            });
        } catch (parseError) {
            res.status(500).json({ error: "Error processing radio data." });
        }
    });
};

module.exports = { 
    handleRadioController, 
    handlePostRadioController,
    handleDeleteRadio
};