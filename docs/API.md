# TimeTask API Documentation

## Base URL
- Development: `http://localhost:3000/api`
- Production: `https://api.timetask.com`

## Authentication

All API requests (except login/register) require JWT authentication.

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Rate Limiting

- General: 100 requests per 15 minutes per IP
- Login: 5 attempts per 15 minutes per IP/email
- File upload: 10 requests per hour

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message in Hebrew",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5
    }
  }
}
```

---

## Authentication Endpoints

### POST /auth/login
Login to the system.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "התחברות בוצעה בהצלחה",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "EMPLOYEE"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

**Status Codes:**
- `200`: Success
- `401`: Invalid credentials
- `429`: Too many attempts

### POST /auth/register
Register first admin user (subsequent users created via /users endpoint).

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "Admin123!",
  "firstName": "Admin",
  "lastName": "User",
  "phone": "050-1234567"
}
```

### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "refresh_token"
}
```

### GET /auth/profile
Get current user profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "EMPLOYEE",
      "joinDate": "2024-01-01T00:00:00Z",
      "emailNotifications": true,
      "timerAlerts": true,
      "language": "he"
    }
  }
}
```

### PUT /auth/profile
Update current user profile.

**Request:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "phone": "050-9876543",
  "emailNotifications": false,
  "timerAlerts": true,
  "language": "en"
}
```

### PUT /auth/change-password
Change password.

**Request:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "NewPassword123!"
}
```

---

## User Management (Admin Only)

### GET /users
Get all users.

**Query Parameters:**
- `role`: Filter by role (ADMIN|EMPLOYEE|CLIENT)
- `isActive`: Filter by active status
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

### POST /users
Create new user.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "Password123!",
  "firstName": "New",
  "lastName": "User",
  "role": "EMPLOYEE",
  "phone": "050-1234567"
}
```

### PUT /users/:id
Update user.

**Request:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "role": "ADMIN",
  "isActive": true
}
```

### DELETE /users/:id
Delete user (soft delete).

---

## Client Management

### GET /clients
Get all clients.

**Query Parameters:**
- `isActive`: Filter by active status
- `search`: Search by name or contact

### POST /clients
Create new client.

**Request:**
```json
{
  "name": "חברת לקוח בע\"מ",
  "contactPerson": "איש קשר",
  "phone": "03-1234567",
  "email": "contact@client.co.il",
  "address": "רחוב הרצל 1, תל אביב",
  "notes": "הערות על הלקוח"
}
```

### GET /clients/:id
Get client details with projects.

### PUT /clients/:id
Update client.

---

## Project Management

### GET /projects
Get all projects.

**Query Parameters:**
- `clientId`: Filter by client
- `status`: Filter by status (ACTIVE|ON_HOLD|COMPLETED)
- `isTemplate`: Get templates only

### POST /projects
Create new project.

**Request:**
```json
{
  "name": "פרויקט חדש",
  "description": "תיאור הפרויקט",
  "clientId": "client-uuid",
  "startDate": "2024-01-01",
  "targetDate": "2024-12-31",
  "hoursBudget": 120,
  "isTemplate": false
}
```

### GET /projects/:id
Get project with tasks.

### PUT /projects/:id
Update project.

### POST /projects/:id/from-template
Create project from template.

---

## Task Management

### GET /tasks
Get tasks.

**Query Parameters:**
- `projectId`: Filter by project
- `status`: Filter by status (NEW|IN_PROGRESS|WAITING_CLIENT|COMPLETED)
- `priority`: Filter by priority (URGENT_IMPORTANT|IMPORTANT|NORMAL|LOW)
- `assignedTo`: Filter by assigned user
- `search`: Search in title/description
- `page`: Page number
- `limit`: Items per page

### POST /tasks
Create new task.

**Request:**
```json
{
  "title": "משימה חדשה",
  "description": "תיאור המשימה",
  "projectId": "project-uuid",
  "priority": "IMPORTANT",
  "deadline": "2024-02-01T00:00:00Z",
  "timeEstimate": 8,
  "parentTaskId": null,
  "assignedUserIds": ["user-uuid"],
  "assignedClientIds": []
}
```

### GET /tasks/:id
Get task details with subtasks, comments, and files.

### PUT /tasks/:id
Update task.

**Request:**
```json
{
  "title": "כותרת מעודכנת",
  "status": "IN_PROGRESS",
  "priority": "URGENT_IMPORTANT",
  "deadline": "2024-02-15T00:00:00Z"
}
```

### DELETE /tasks/:id
Delete task (with subtasks).

---

## Time Tracking

### GET /time
Get time records.

**Query Parameters:**
- `taskId`: Filter by task
- `employeeId`: Filter by employee (admin only)
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)
- `page`: Page number
- `limit`: Items per page
- `timezone`: User timezone (default: Asia/Jerusalem)

### POST /time/start
Start timer.

**Request:**
```json
{
  "taskId": "task-uuid",
  "description": "תיאור העבודה",
  "timezone": "Asia/Jerusalem"
}
```

### POST /time/stop/:id
Stop timer.

**Request:**
```json
{
  "description": "תיאור מעודכן (אופציונלי)"
}
```

### GET /time/active
Get active timers for current user.

### POST /time/manual
Manual time entry.

**Request:**
```json
{
  "taskId": "task-uuid",
  "date": "2024-01-15",
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T17:00:00Z",
  "description": "תיאור העבודה",
  "timezone": "Asia/Jerusalem"
}
```

### DELETE /time/:id
Delete time record (own records or admin).

---

## Comments

### GET /comments
Get comments.

**Query Parameters:**
- `taskId`: Get comments for task
- `projectId`: Get comments for project

### POST /comments
Create comment.

**Request:**
```json
{
  "content": "תוכן התגובה",
  "taskId": "task-uuid",
  "projectId": null
}
```

### PUT /comments/:id
Update comment (own comments only).

### DELETE /comments/:id
Delete comment (own comments or admin).

---

## File Management

### POST /files/upload
Upload file.

**Request:** `multipart/form-data`
- `file`: File to upload (max 50MB)
- `taskId`: Task ID (optional)
- `commentId`: Comment ID (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "file-uuid",
      "filename": "unique-filename.pdf",
      "originalName": "document.pdf",
      "mimeType": "application/pdf",
      "size": 1024000,
      "path": "/uploads/unique-filename.pdf"
    }
  }
}
```

### GET /files/download/:id
Download file.

### DELETE /files/:id
Delete file (own uploads or admin).

---

## Alerts/Notifications

### GET /alerts
Get user alerts.

**Query Parameters:**
- `unread`: Get unread alerts only (true/false)

### PUT /alerts/:id/read
Mark alert as read.

### PUT /alerts/mark-all-read
Mark all alerts as read.

---

## Reports

### GET /reports/hours
Get hours summary report.

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date
- `employeeId`: Filter by employee
- `projectId`: Filter by project
- `format`: Export format (json|csv|pdf|excel)

### GET /reports/project-status
Get project status report.

**Query Parameters:**
- `projectId`: Specific project (optional)
- `includeArchived`: Include completed projects

### GET /reports/employee-performance
Get employee performance report.

**Query Parameters:**
- `employeeId`: Specific employee (optional)
- `startDate`: Start date
- `endDate`: End date

---

## WebSocket Events

Connect to WebSocket for real-time updates.

### Connection
```javascript
const socket = io('https://api.timetask.com', {
  auth: {
    token: 'jwt_token'
  }
});
```

### Events

#### Client to Server
- `join`: Join user room
- `join_project`: Join project room
- `leave_project`: Leave project room
- `timer_start`: Broadcast timer started
- `timer_stop`: Broadcast timer stopped
- `task_update`: Broadcast task update
- `new_comment`: Broadcast new comment

#### Server to Client
- `timer_started`: Timer started by another user
- `timer_stopped`: Timer stopped by another user
- `task_updated`: Task updated
- `comment_added`: New comment added
- `new_notification`: New notification

---

## Error Codes

| Code | Description | Status |
|------|-------------|--------|
| `AUTH_REQUIRED` | Authentication required | 401 |
| `AUTH_INVALID` | Invalid credentials | 401 |
| `AUTH_EXPIRED` | Token expired | 401 |
| `PERMISSION_DENIED` | No permission | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `DUPLICATE_ENTRY` | Duplicate resource | 409 |
| `VALIDATION_ERROR` | Validation failed | 400 |
| `RATE_LIMIT` | Too many requests | 429 |
| `SERVER_ERROR` | Internal error | 500 |

---

## Pagination

All list endpoints support pagination:

```http
GET /api/tasks?page=2&limit=20
```

Default: `page=1`, `limit=20`, max `limit=100`

---

## Search

Search endpoints support full-text search:

```http
GET /api/tasks?search=משימה חשובה
```

---

## Filtering

Multiple filters can be combined:

```http
GET /api/tasks?projectId=uuid&status=IN_PROGRESS&priority=URGENT_IMPORTANT
```

---

## Sorting

Most endpoints support sorting:

```http
GET /api/tasks?sortBy=createdAt&order=desc
```

---

## Date Format

All dates use ISO 8601 format:
- Date: `2024-01-15`
- DateTime: `2024-01-15T10:30:00Z`
- With timezone: `2024-01-15T10:30:00+02:00`

---

## Health Check

### GET /health

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:00:00Z",
  "uptime": 3600,
  "memory": {
    "rss": 104857600,
    "heapTotal": 52428800,
    "heapUsed": 26214400
  },
  "database": "connected"
}
```

---

## Testing

Use the provided Postman collection: `/docs/TimeTask.postman_collection.json`

### Test Accounts
- Admin: `admin@timetask.com` / `admin123`
- Employee: `employee@timetask.com` / `employee123`
- Client: `client@timetask.com` / `client123`

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.timetask.com',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Get tasks
const tasks = await api.get('/tasks');

// Create task
const newTask = await api.post('/tasks', {
  title: 'New Task',
  projectId: 'project-uuid'
});
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Get tasks
response = requests.get(
    'https://api.timetask.com/tasks',
    headers=headers
)
tasks = response.json()
```

### cURL
```bash
# Get tasks
curl -X GET https://api.timetask.com/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Create task
curl -X POST https://api.timetask.com/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Task","projectId":"uuid"}'
```

---

## Support

For API support, contact: api-support@timetask.com