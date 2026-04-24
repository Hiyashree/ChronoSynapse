# Quick Setup Guide

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Set Up Database

1. Make sure MySQL is running
2. Create the database:
```sql
CREATE DATABASE timetable_titan;
```

3. Import the schema:
```bash
mysql -u root -p timetable_titan < backend/schema.sql
```

## Step 3: Configure Environment

1. Copy the example env file:
```bash
cd backend
cp .env.example .env
```

2. Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=timetable_titan
JWT_SECRET=your_secret_key_here
PORT=3000
```

## Step 4: Start the Server

```bash
cd backend
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

## Step 5: Open in Browser

Navigate to: `http://localhost:3000`

## Step 6: Get Started

1. **As Guest**: Click "Continue as Guest" → Create a school → Start adding data
2. **As User**: Sign up → Sign in → Create schools → Manage everything

## Troubleshooting

### Database Connection Error
- Check MySQL is running: `mysql -u root -p`
- Verify credentials in `.env`
- Ensure database exists: `SHOW DATABASES;`

### Port Already in Use
- Change `PORT` in `.env` to a different port (e.g., 3001)
- Or kill the process: `lsof -ti:3000 | xargs kill`

### Module Not Found
- Run `npm install` again in the `backend` directory
- Check `package.json` exists

## Next Steps

- Add a background image to `public/assets/bg.jpeg` (optional)
- Customize the school name in the dashboard
- Start adding teachers, subjects, classes, etc.
- Generate your first timetable!

