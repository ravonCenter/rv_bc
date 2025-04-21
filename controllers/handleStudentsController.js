const fs = require("fs");
const path = require("path");
const multer = require("multer");

const studentsFilePath = path.join(__dirname, "DB", "students.json");
const publicDir = path.join(process.cwd(), "public");
const imgFolderPath = path.join(publicDir, "students");

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(imgFolderPath)) {
    fs.mkdirSync(imgFolderPath, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, imgFolderPath),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Helper functions
const readStudentsData = async () => {
    try {
        const data = await fs.promises.readFile(studentsFilePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeStudentsData = async (data) => {
    await fs.promises.writeFile(studentsFilePath, JSON.stringify(data, null, 2));
};

const getImageUrl = (req, filename) => {
    if (!filename) return null;
    return `${req.protocol}://${req.get('host')}/public/students/${filename}`;
};

// GET all students
const handleStudentController = async (req, res) => {
    try {
        const students = await readStudentsData();
        const responseData = students.map(student => ({
            ...student,
            imageUrl: student.imageUrl ? getImageUrl(req, student.imageUrl) : null
        }));
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ error: "Error fetching students" });
    }
};

// POST new student
const handlePostStudentsController = async (req, res) => {
    try {
        upload.single("image")(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            const { name, grade, achievements } = req.body;
            const imageUrl = req.file?.filename || null;

            const students = await readStudentsData();
            const newId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 1;

            const newStudent = {
                id: newId,
                name,
                grade,
                achievements: Array.isArray(achievements) ? achievements : [achievements].filter(Boolean),
                imageUrl,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            students.push(newStudent);
            await writeStudentsData(students);

            res.status(201).json({
                message: "Student added successfully",
                student: {
                    ...newStudent,
                    imageUrl: getImageUrl(req, newStudent.imageUrl)
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: "Error adding student" });
    }
};

// DELETE student
const handleDeleteStudentReq = async (req, res) => {
    console.log("req came for deleting")
    try {
        const { id } = req.params;
        const students = await readStudentsData();
        const studentIndex = students.findIndex(s => s.id === parseInt(id));

        if (studentIndex === -1) {
            return res.status(404).json({ error: "Student not found" });
        }

        const [deletedStudent] = students.splice(studentIndex, 1);
        
        // Delete image file if exists
        if (deletedStudent.imageUrl) {
            const imagePath = path.join(imgFolderPath, deletedStudent.imageUrl);
            fs.unlink(imagePath, err => {
                if (err) console.error("Error deleting image:", err);
            });
        }

        await writeStudentsData(students);
        res.json({ message: "Student deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Error deleting student" });
    }
};

module.exports = {
    handleStudentController,
    handlePostStudentsController,
    handleDeleteStudentReq
};