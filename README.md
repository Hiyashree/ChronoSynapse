# Timetable Titan

A comprehensive timetable generator application for schools that automatically creates conflict-free schedules using AI-powered algorithms.

## Features

- 🔐 **User Authentication**: Sign up, sign in, or continue as guest
- 🏫 **School Management**: Create and manage multiple schools
- 👨‍🏫 **Teacher Management**: Add teachers with qualifications, subjects, and availability
- 📚 **Subject Management**: Define subjects with codes
- 🏛️ **Class & Section Management**: Organize classes and sections with constraints
- 🏛️ **Classroom Management**: Manage classrooms with capacity and type
- ⏰ **Timeslot Management**: Define available time slots
- 📅 **Automatic Timetable Generation**: AI-powered algorithm that prevents conflicts
- 📥 **Export to CSV**: Download timetables for offline use
- 🎨 **Beautiful Dark Theme UI**: Modern, responsive design

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)

## Project Structure

```
timetable/
├── backend/                     # Node.js + Express + MySQL API
│   ├── server.js                # Main server file
│   ├── package.json             # Backend dependencies
│   ├── .env                     # DB credentials, JWT secret
│   ├── schema.sql               # MySQL tables
│   ├── controllers/             # API logic
│   │    ├── auth.controller.js
│   │    ├── school.controller.js
│   │    ├── teacher.controller.js
│   │    ├── subject.controller.js
│   │    ├── class.controller.js
│   │    ├── section.controller.js
│   │    ├── classroom.controller.js
│   │    ├── timeslot.controller.js
│   │    └── timetable.controller.js
│   ├── routes/                  # Express routes mapping
│   │    ├── auth.routes.js
│   │    ├── school.routes.js
│   │    ├── teacher.routes.js
│   │    ├── subject.routes.js
│   │    ├── class.routes.js
│   │    ├── section.routes.js
│   │    ├── classroom.routes.js
│   │    ├── timeslot.routes.js
│   │    └── timetable.routes.js
│   └── utils/
│        ├── db.js               # MySQL connection
│        └── auth.js             # JWT handling
│
├── public/                      # Frontend
│   ├── index.html               # Landing page
│   ├── login.html                 # Login
│   ├── signup.html               # Registration
│   ├── dashboard.html            # List schools
│   ├── school.html               # Manage one school
│   ├── css/
│   │    └── style.css           # UI styling
│   ├── js/
│   │    ├── common.js           # Shared functions / auth / helpers
│   │    ├── auth.js             # Signup/Login logic
│   │    ├── schools.js          # Dashboard school list/create/delete
│   │    └── school-dashboard.js  # Teachers/Subjects/etc CRUD
│   └── assets/
│        └── bg.jpeg             # Background image (add your own)
│
└── database/                    # OPTIONAL: SQL-only references
    └── schema.sql               # Same as backend/schema.sql
```

## Installation

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd timetable
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Set up MySQL database**
   ```bash
   # Login to MySQL
   mysql -u root -p
   
   # Create database
   CREATE DATABASE timetable_titan;
   
   # Exit MySQL and import schema
   mysql -u root -p timetable_titan < schema.sql
   ```

4. **Configure environment variables**
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=timetable_titan
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   PORT=3000
   ```

5. **Add background image** (optional)
   - Place a background image at `public/assets/bg.jpeg`
   - Or update the path in `public/index.html`

6. **Start the server**
   ```bash
   cd backend
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

7. **Open in browser**
   ```
   http://localhost:3000
   ```

## Usage

### As a Guest

1. Click "Continue as Guest" on the landing page
2. Create a new school
3. Start adding teachers, subjects, classes, etc.
4. Generate timetables

### As a Registered User

1. Sign up for an account
2. Sign in
3. Create schools (multiple schools per user)
4. Manage all entities
5. Generate and export timetables

## Database Schema

### Entities

- **Users**: Authentication and user management
- **Schools**: School instances (one user can have multiple schools)
- **Teachers**: Teacher information with qualifications and salary
- **Subjects**: Subject definitions with codes
- **Classes**: Class definitions with class teachers
- **Sections**: Sections belonging to classes
- **Classrooms**: Room information with capacity
- **Timeslots**: Available time periods
- **Timetable**: Generated schedule entries

### Relationships

- Teacher ↔ Subject: Many-to-Many (teachers can teach multiple subjects)
- Class ↔ Subject: Many-to-Many (classes can have multiple subjects)
- Class ↔ Section: One-to-Many (one class has many sections)
- Teacher ↔ Class: One-to-Many (one teacher can be class teacher of many classes)
- Section ↔ Timetable: One-to-One (one section has one timetable)
- Timetable ↔ Teacher, Subject, Classroom, Timeslot: Many-to-Many

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login
- `GET /api/auth/me` - Get current user (authenticated)

### Schools
- `GET /api/schools` - Get all schools for user
- `GET /api/schools/:schoolId` - Get single school
- `POST /api/schools` - Create school
- `DELETE /api/schools/:schoolId` - Delete school

### Teachers
- `GET /api/teachers/:schoolId` - Get all teachers
- `GET /api/teachers/:schoolId/:teacherId` - Get single teacher
- `POST /api/teachers/:schoolId` - Create teacher
- `PUT /api/teachers/:schoolId/:teacherId` - Update teacher
- `DELETE /api/teachers/:schoolId/:teacherId` - Delete teacher

### Subjects
- `GET /api/subjects/:schoolId` - Get all subjects
- `POST /api/subjects/:schoolId` - Create subject
- `PUT /api/subjects/:schoolId/:subjectId` - Update subject
- `DELETE /api/subjects/:schoolId/:subjectId` - Delete subject

### Classes
- `GET /api/classes/:schoolId` - Get all classes
- `POST /api/classes/:schoolId` - Create class
- `PUT /api/classes/:schoolId/:classId` - Update class
- `DELETE /api/classes/:schoolId/:classId` - Delete class

### Sections
- `GET /api/sections/:classId` - Get all sections for a class
- `POST /api/sections/:classId` - Create section
- `PUT /api/sections/:classId/:sectionId` - Update section
- `DELETE /api/sections/:classId/:sectionId` - Delete section

### Classrooms
- `GET /api/classrooms/:schoolId` - Get all classrooms
- `POST /api/classrooms/:schoolId` - Create classroom
- `PUT /api/classrooms/:schoolId/:classroomId` - Update classroom
- `DELETE /api/classrooms/:schoolId/:classroomId` - Delete classroom

### Timeslots
- `GET /api/timeslots/:schoolId` - Get all timeslots
- `POST /api/timeslots/:schoolId` - Create timeslot
- `PUT /api/timeslots/:schoolId/:timeslotId` - Update timeslot
- `DELETE /api/timeslots/:schoolId/:timeslotId` - Delete timeslot

### Timetable
- `GET /api/timetable/:schoolId/stats` - Get statistics
- `GET /api/timetable/:schoolId` - Get timetable
- `POST /api/timetable/:schoolId/generate` - Generate timetable
- `DELETE /api/timetable/:schoolId` - Delete timetable

## Timetable Generation Algorithm

The timetable generation algorithm:

1. **Prevents Section Conflicts**: Each section can only have one class per timeslot (enforced by unique constraint)
2. **Respects Teacher Availability**: Checks teacher unavailability timeslots
3. **Prevents Teacher Conflicts**: One teacher can't teach multiple classes at the same time
4. **Prevents Classroom Conflicts**: One classroom can't be used by multiple classes simultaneously
5. **Respects Subject Constraints**: Only assigns subjects that are allowed for the class
6. **Respects Section Timeslots**: Only uses timeslots allowed for the section

## Features in Detail

### Conflict Prevention

- **Section Overlap Prevention**: Database unique constraint on `(sec_id, timeslot_id)`
- **Teacher Conflict Detection**: Checks if teacher is already scheduled
- **Classroom Conflict Detection**: Checks if classroom is already booked
- **Teacher Unavailability**: Respects teacher's unavailable timeslots

### Sample Data

When creating a new school, sample data is automatically added:
- 5 sample subjects (MIL, Social Science, Science, MATHS, ENGLISH)
- 3 sample teachers
- 2 sample classrooms
- 6 sample timeslots (Monday schedule)
- 1 sample class with 2 sections

## Development

### Running in Development Mode

```bash
cd backend
npm run dev
```

This uses `nodemon` to automatically restart the server on file changes.

### Database Migrations

To reset the database:
```bash
mysql -u root -p timetable_titan < backend/schema.sql
```

## Troubleshooting

### Database Connection Issues

- Verify MySQL is running
- Check `.env` file has correct credentials
- Ensure database exists: `CREATE DATABASE timetable_titan;`

### Port Already in Use

- Change `PORT` in `.env` file
- Or kill the process using port 3000

### CORS Issues

- CORS is enabled for all origins in development
- For production, configure CORS in `backend/server.js`

## License

This project is open source and available for educational purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

