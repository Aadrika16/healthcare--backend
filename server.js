const express = require('express');
const cors = require("cors"); 
const sqlite3 = require('sqlite3');
const path = require('path');
const {open} = require('sqlite');
const bcrypt = require('bcrypt');


const dbPath = path.join(__dirname , 'healthdata.db');
const app=express();
app.use(cors({
  origin: 'https://healthcare-backend-og2g.onrender.com', // or use "*" for public APIs
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

let db=null;
const initializeDbAndServer = async () =>{ 
    try{
        db=await open({
            filename : dbPath,
            driver:sqlite3.Database
        });
        app.listen(3000 , ()=>console.log("Server Running AT http://localhost:3000/"));
    }catch(e){
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
       
    }

};
initializeDbAndServer();
//Get all doctors 
app.get("/doctors",async (request,response) =>{
    const getDoctorsQuery = `
        SELECT * FROM doctors;
    `;
    const doctors = await db.all(getDoctorsQuery);
    response.send(doctors);
}
)

//Get Each Doctor
app.get("/doctors/:id", async (request, response) => {
  const { id } = request.params;
  const getDoctorQuery = `SELECT * FROM doctors WHERE id = ?;`;
  const doctor = await db.get(getDoctorQuery, [id]);

  if (!doctor) {
    return response.status(404).json({ error: "Doctor not found" });
  }
  console.log('Fetched Doctor:', doctor);
  response.json(doctor);
});

// POST: Book an appointment
app.post('/appointments', async (req, res) => {
  const { doctorId, name, email, datetime } = req.body;
  console.log('Received appointment data:', req.body);

  if (!doctorId || !name || !email || !datetime) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const query = `
    INSERT INTO appointments (doctor_id, name, email, datetime)
    VALUES (?, ?, ?, ?)
  `;

  try {
    const result = await db.run(query, [doctorId, name, email, datetime]);
    res.send({
      message: 'Appointment booked successfully',
      appointmentId: result.lastID,
    });
  } catch (err) {
    console.error('Error inserting appointment:', err.message);
    res.status(500).json({ error: 'Failed to book appointment' });
  }
});


// GET: List all appointments (for admin or testing)
app.get('/appointments', (req, res) => {
  db.all('SELECT * FROM appointments', [], (err, rows) => {
    if (err) {
      console.error('Error fetching appointments:', err.message);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }
    res.json(rows);
  });
});
// GET: List appointments for a specific doctor
// GET: Fetch Appointment by ID
app.get("/appointments/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  console.log("Looking up appointment with ID:", id);

  try {
    const query = `
      SELECT 
        a.id AS appointmentId,
        a.name AS patientName,
        a.email AS patientEmail,
        a.datetime,
        d.id AS doctorId,
        d.name AS doctorName,
        d.profession,
        d.experience,
        d.phone_number,
        d.availability
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.id = ?;
    `;

    const result = await db.get(query, [id]);

    if (result) {
      res.json(result);
    } else {
      console.log("No appointment found with id:", id);
      res.status(404).json({ message: "Appointment not found" });
    }
  } catch (error) {
    console.error("Error fetching appointment with doctor:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


