const fs = require("fs");
const path = require("path");
const multer = require("multer");

const tripsFilePath = path.join(__dirname, "DB", "trips.json");
const publicDir = path.join(process.cwd(), "public");
const tripsImgDir = path.join(publicDir, "trips");

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(tripsImgDir)) {
    fs.mkdirSync(tripsImgDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, tripsImgDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Error: Images only!'));
        }
    }
});

// Helper function to construct image URL
const getImageUrl = (req, filename) => {
    if (!filename) return null;
    return `${req.protocol}://${req.get('host')}/public/trips/${filename}`;
};

// GET request - Fetch trip data (unchanged)
const handleGetTrips = (req, res) => {
    fs.readFile(tripsFilePath, "utf8", (error, data) => {
        if (error) {
            return res.status(500).json({ error: "Error reading database file." });
        }

        try {
            const tripsJSON = JSON.parse(data);
            const updatedData = tripsJSON.map((item) => ({
                ...item,
                imageUrl: item.imageUrl ? getImageUrl(req, item.imageUrl) : null
            }));

            res.json(updatedData);
        } catch (error) {
            res.status(500).json({ error: "Error parsing JSON data." });
        }
    });
};

// POST request - Add new trip entry (unchanged)
const handlePostTripsController = (req, res) => {
    upload.single("image")(req, res, (err) => {
        if (err) {
            return res.status(400).json({ 
                error: err.message || "Image upload failed." 
            });
        }

        const { destination, date, description } = req.body;
        const imageUrl = req.file ? req.file.filename : null;

        fs.readFile(tripsFilePath, "utf8", (error, data) => {
            let tripsJSON = [];

            if (!error) {
                try {
                    tripsJSON = JSON.parse(data);
                } catch (parseError) {
                    return res.status(500).json({ error: "Error parsing JSON file." });
                }
            }

            const newEntry = {
                id: tripsJSON.length > 0 ? Math.max(...tripsJSON.map(t => t.id)) + 1 : 1,
                destination,
                date,
                description,
                imageUrl,
                createdAt: new Date().toISOString(),
            };

            tripsJSON.push(newEntry);

            fs.writeFile(tripsFilePath, JSON.stringify(tripsJSON, null, 2), (writeError) => {
                if (writeError) {
                    // Clean up uploaded image if DB write fails
                    if (imageUrl) {
                        fs.unlink(path.join(tripsImgDir, imageUrl), () => {});
                    }
                    return res.status(500).json({ error: "Error saving data." });
                }
                res.status(201).json({ 
                    message: "Trip added successfully!", 
                    newEntry: {
                        ...newEntry,
                        imageUrl: getImageUrl(req, newEntry.imageUrl)
                    }
                });
            });
        });
    });
};

// DELETE request - Delete trip entry (updated)
const handleDeleteTrip = (req, res) => {
    const { id } = req.params;
    
    // Read trips data
    fs.readFile(tripsFilePath, "utf8", (readError, data) => {
        if (readError) {
            return res.status(500).json({ error: "Error reading trips data." });
        }

        try {
            const trips = JSON.parse(data);
            const tripIndex = trips.findIndex(t => t.id === parseInt(id));

            if (tripIndex === -1) {
                return res.status(404).json({ error: "Trip not found" });
            }

            const [deletedTrip] = trips.splice(tripIndex, 1);
            
            // Write updated trips data
            fs.writeFile(tripsFilePath, JSON.stringify(trips, null, 2), (writeError) => {
                if (writeError) {
                    return res.status(500).json({ error: "Error saving trips data." });
                }

                // Delete associated image file if exists
                if (deletedTrip.imageUrl) {
                    const imagePath = path.join(tripsImgDir, deletedTrip.imageUrl);
                    fs.unlink(imagePath, (unlinkError) => {
                        if (unlinkError) {
                            console.error("Error deleting image:", unlinkError);
                        }
                        // Still return success even if image deletion fails
                        res.json({ 
                            message: "Trip deleted successfully",
                            deletedTrip: {
                                ...deletedTrip,
                                imageUrl: getImageUrl(req, deletedTrip.imageUrl)
                            }
                        });
                    });
                } else {
                    res.json({ 
                        message: "Trip deleted successfully",
                        deletedTrip
                    });
                }
            });
        } catch (parseError) {
            res.status(500).json({ error: "Error processing trips data." });
        }
    });
};

module.exports = { 
    handleGetTrips, 
    handlePostTripsController,
    handleDeleteTrip
};