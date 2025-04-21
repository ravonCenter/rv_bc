const fs = require("fs");
const path = require("path");
const multer = require("multer");

const newsFilePath = path.join(__dirname, "DB", "news.json");
const publicNewsFolderPath = path.join(__dirname, "..","public", "news");

// Ensure the public/news directory exists
if (!fs.existsSync(publicNewsFolderPath)) {
    fs.mkdirSync(publicNewsFolderPath, { recursive: true });
}

// Multer storage setup - saving to public/news
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, publicNewsFolderPath),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Helper function to construct image URL
const getImageUrl = (req, filename) => {
    if (!filename) return null;
    return `${req.protocol}://${req.get('host')}/public/news/${filename}`;
};

// GET request - Fetch all news
const handleGetNewsController = (req, res) => {
    console.log("req came")
    fs.readFile(newsFilePath, "utf8", (error, data) => {
        if (error) {
            return res.status(500).json({ error: "Error reading database file." });
        }

        try {
            const newsJSON = JSON.parse(data);
            const updatedData = newsJSON.map((item) => ({
                ...item,
                imageUrl: item.imageUrl ? getImageUrl(req, item.imageUrl) : null,
            }));

            res.json(updatedData);
        } catch (error) {
            res.status(500).json({ error: "Error parsing JSON data." });
        }
    });
};

// POST request - Add new news entry
const handlePostNewsController = (req, res) => {
    console.log("req came for deleting the news")
    upload.single("image")(req, res, (err) => {
        if (err) {
            return res.status(500).json({ error: "Image upload failed." });
        }

        const { title, content } = req.body;
        const imageUrl = req.file ? req.file.filename : null;

        fs.readFile(newsFilePath, "utf8", (error, data) => {
            let newsJSON = [];

            if (!error) {
                try {
                    newsJSON = JSON.parse(data);
                } catch (parseError) {
                    return res.status(500).json({ error: "Error parsing JSON file." });
                }
            }

            const newEntry = {
                id: newsJSON.length > 0 ? Math.max(...newsJSON.map(n => n.id)) + 1 : 1,
                title,
                content,
                imageUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            newsJSON.push(newEntry);

            fs.writeFile(newsFilePath, JSON.stringify(newsJSON, null, 2), (writeError) => {
                if (writeError) {
                    // Clean up uploaded image if DB write fails
                    if (imageUrl) {
                        fs.unlink(path.join(publicNewsFolderPath, imageUrl), () => {});
                    }
                    return res.status(500).json({ error: "Error saving data." });
                }
                res.status(201).json({ 
                    message: "News added successfully!", 
                    newEntry: {
                        ...newEntry,
                        imageUrl: getImageUrl(req, newEntry.imageUrl)
                    }
                });
            });
        });
    });
};

// DELETE request - Delete news entry
const handleDeleteNewsController = (req, res) => {
    const { id } = req.params;
    
    fs.readFile(newsFilePath, "utf8", (readError, data) => {
        if (readError) {
            return res.status(500).json({ error: "Error reading news data." });
        }

        try {
            let newsEntries = JSON.parse(data);
            const entryIndex = newsEntries.findIndex(n => n.id === parseInt(id));

            if (entryIndex === -1) {
                return res.status(404).json({ error: "News entry not found" });
            }

            const [deletedEntry] = newsEntries.splice(entryIndex, 1);
            
            fs.writeFile(newsFilePath, JSON.stringify(newsEntries, null, 2), (writeError) => {
                if (writeError) {
                    return res.status(500).json({ error: "Error saving news data." });
                }

                // Delete associated image file if exists
                if (deletedEntry.imageUrl) {
                    const imagePath = path.join(publicNewsFolderPath, deletedEntry.imageUrl);
                    fs.unlink(imagePath, (unlinkError) => {
                        if (unlinkError) {
                            console.error("Error deleting image:", unlinkError);
                        }
                        // Still return success even if image deletion fails
                        res.json({ 
                            message: "News entry deleted successfully",
                            deletedEntry: {
                                ...deletedEntry,
                                imageUrl: getImageUrl(req, deletedEntry.imageUrl)
                            }
                        });
                    });
                } else {
                    res.json({ 
                        message: "News entry deleted successfully",
                        deletedEntry
                    });
                }
            });
        } catch (parseError) {
            res.status(500).json({ error: "Error processing news data." });
        }
    });
};

module.exports = { 
    handleGetNewsController, 
    handlePostNewsController,
    handleDeleteNewsController
};