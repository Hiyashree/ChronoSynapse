# Troubleshooting Guide

## Schools Not Being Created

If schools aren't being created, follow these steps:

### Step 1: Check if Backend is Running

1. Open your browser and go to: `http://localhost:3000/api/test`
2. You should see a JSON response like:
   ```json
   {
     "status": "ok",
     "message": "Backend is running",
     "database": "connected"
   }
   ```

If you get an error or "Cannot connect", the server isn't running.

**Fix**: 
```bash
cd backend
npm start
```

### Step 2: Check Database Connection

If the test endpoint shows `"database": "error"`, your database isn't connected.

**Check:**
1. Is MySQL running?
   ```bash
   # Windows
   # Check Services or run: net start MySQL
   
   # Linux/Mac
   sudo systemctl status mysql
   ```

2. Does the database exist?
   ```sql
   mysql -u root -p
   SHOW DATABASES;
   ```
   
   If `timetable_titan` doesn't exist:
   ```sql
   CREATE DATABASE timetable_titan;
   ```

3. Is the schema imported?
   ```bash
   mysql -u root -p timetable_titan < backend/schema.sql
   ```

4. Check `.env` file in `backend/` directory:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=timetable_titan
   JWT_SECRET=your_secret_key
   PORT=3000
   ```

### Step 3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try creating a school
4. Look for error messages

Common errors:
- `Cannot connect to server` → Backend not running
- `NetworkError` → CORS issue or server down
- `Database connection error` → Check MySQL and .env

### Step 4: Check Server Logs

Look at the terminal where you ran `npm start`. You should see:
- `✅ Database connected successfully`
- `🚀 Server running on http://localhost:3000`

If you see errors, they will tell you what's wrong.

### Step 5: Test API Directly

Use curl or Postman to test:

```bash
# Test endpoint
curl http://localhost:3000/api/test

# Create school (guest mode)
curl -X POST http://localhost:3000/api/schools \
  -H "Content-Type: application/json" \
  -d '{"schoolName": "Test School"}'
```

### Common Issues

#### Issue: "Cannot connect to server"
**Solution**: 
- Make sure backend is running: `cd backend && npm start`
- Check port 3000 isn't used by another app
- Change PORT in .env if needed

#### Issue: "Database connection error"
**Solution**:
- Start MySQL service
- Create database: `CREATE DATABASE timetable_titan;`
- Import schema: `mysql -u root -p timetable_titan < backend/schema.sql`
- Check .env credentials

#### Issue: "School created but not showing"
**Solution**:
- Check browser console for errors
- Check if userId is being passed correctly
- For guest mode, backend creates a user automatically
- Refresh the page

#### Issue: "Module not found"
**Solution**:
```bash
cd backend
npm install
```

#### Issue: Port already in use
**Solution**:
- Change PORT in .env to 3001 or another port
- Or kill the process: 
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```

### Debug Mode

Add this to your browser console to see all API calls:

```javascript
// In browser console
localStorage.setItem('debug', 'true');
```

Then check the Network tab in DevTools to see all requests.

### Still Not Working?

1. Check all files are in the right place
2. Make sure you're in the `backend` directory when running `npm start`
3. Verify Node.js version: `node --version` (should be 14+)
4. Check MySQL version: `mysql --version`
5. Try restarting MySQL and the Node server



