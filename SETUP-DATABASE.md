# Database Setup Instructions

## Option 1: Using MySQL Command Line (Recommended)

1. **Open MySQL Command Line Client** or **Command Prompt**

2. **Login to MySQL:**
   ```bash
   mysql -u root -p
   ```
   (Enter your MySQL password when prompted)

3. **Create the database:**
   ```sql
   CREATE DATABASE timetable_titan;
   ```

4. **Exit MySQL:**
   ```sql
   EXIT;
   ```

5. **Import the schema:**
   ```bash
   mysql -u root -p timetable_titan < backend/schema.sql
   ```

## Option 2: Using MySQL Workbench (GUI)

1. Open MySQL Workbench
2. Connect to your MySQL server
3. Click on "Server" → "Data Import"
4. Select "Import from Self-Contained File"
5. Browse to `backend/schema.sql`
6. Select "New" under "Default Target Schema" and name it `timetable_titan`
7. Click "Start Import"

## Option 3: Using phpMyAdmin (Web Interface)

1. Open phpMyAdmin in your browser
2. Click on "New" to create a database
3. Name it `timetable_titan`
4. Click "Create"
5. Select the database
6. Go to "Import" tab
7. Choose `backend/schema.sql` file
8. Click "Go"

## Verify Setup

After setting up, run:
```bash
cd backend
npm run check
```

You should see:
- ✅ Database 'timetable_titan' exists
- ✅ Found X tables in database

## If MySQL is not in PATH

If you get "mysql is not recognized", you need to:

1. **Find MySQL installation:**
   - Usually at: `C:\Program Files\MySQL\MySQL Server 8.0\bin\`
   - Or: `C:\xampp\mysql\bin\` (if using XAMPP)
   - Or: `C:\wamp64\bin\mysql\mysql8.0.xx\bin\` (if using WAMP)

2. **Add to PATH:**
   - Right-click "This PC" → Properties
   - Advanced System Settings → Environment Variables
   - Edit "Path" → Add MySQL bin folder

3. **Or use full path:**
   ```bash
   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
   ```



