# PDF Annotation and Collaboration Tool

A full-stack web application that allows users to upload, view, and annotate PDF documents. Users can highlight text, make drawings, search through documents, and integrate with cloud storage. The application is built with React on the frontend and Node.js/Express on the backend, using MongoDB for data persistence.

![Project Demo GIF](https://your-gif-url-here.com/demo.gif)
*(Optional: You can add a GIF or screenshot of your application here)*

---

## ✨ Features

### Core Features
- **User Authentication**: Secure registration and login system using JWT for session management.
- **PDF Upload & Management**: Upload PDF files from your local system. Files are stored securely on the server.
- **Interactive PDF Viewer**: A feature-rich viewer with pagination, zoom controls, and smooth rendering.
- **Text Highlighting**: Select and highlight text on any page. Highlights are saved and automatically restored when you reopen a document.
- **My Library Dashboard**: A personal dashboard to view, open, rename, and delete all your uploaded PDFs.

### Extra Features
- **Advanced Search**: Full-text search within a single PDF or across all your uploaded documents.
- **Drawing Tools**: Go beyond highlighting with freehand drawing tools to add notes, shapes, and other visual annotations.
- **Cloud Storage Integration**: Seamlessly import PDFs from and export annotated files to your Google Drive account.

---

## 🛠️ Tech Stack

- **Frontend**: React, Axios, React-PDF
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JSON Web Tokens (JWT)
- **File Handling**: Multer for file uploads
- **Security**: Helmet, CORS, express-rate-limit
- **Cloud Integration**: Google Drive API

---

## 📂 Project Structure

### Backend (`pdf-annotation-backend`)
```
pdf-annotation-backend/
├── src/
│   ├── controllers/    # Request handling logic
│   ├── middlewares/    # Auth, validation, error handling
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API endpoint definitions
│   └── services/       # Business logic (e.g., cloud integration)
├── uploads/            # Stored PDF files
├── .env                # Environment variables
├── package.json
└── server.js           # Main server entry point
```

### Frontend (`pdf-annotation-frontend`)
```
pdf-annotation-frontend/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # Global state management
│   ├── hooks/          # Custom React hooks
│   ├── pages/          # Top-level page components
│   ├── routes/         # Client-side routing
│   ├── services/       # API call definitions (api.js)
│   ├── App.js          # Main application component
│   ├── index.js        # Application entry point
│   └── index.css       # Global styles
├── public/
├── .env                # Environment variables
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

---

## 🚀 Getting Started

Follow these instructions to get the project running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/try/download/community) instance (local or cloud)

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd pdf-annotation-backend

# Install dependencies
npm install

# Create a .env file in the root of the backend directory
touch .env
```

**`pdf-annotation-backend/.env`**

```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pdf-annotator
JWT_SECRET=YOUR_SUPER_SECRET_KEY
FRONTEND_URL=http://localhost:3000

# For Google Drive Integration (Optional)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:5000/api/cloud-storage/auth/callback
```

```bash
# Start MongoDB (if running locally)
mongod

# Run the backend server
npm start
```

The backend server will be running on `http://localhost:5000`.

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd pdf-annotation-frontend

# Install dependencies
npm install

# Create a .env file in the root of the frontend directory
touch .env
```

**`pdf-annotation-frontend/.env`**

```bash
REACT_APP_API_URL=http://localhost:5000/api
```

```bash
# Run the frontend development server
npm start
```

The React application will open in your browser at `http://localhost:3000`.

---

## 🔌 API Endpoints

A summary of the available API routes. All protected routes require a `Bearer <token>` in the Authorization header.

### Authentication (`/api/auth`)

| Method | Endpoint             | Description                      | Protected |
| :----- | :------------------- | :------------------------------- | :-------- |
| `POST` | `/register`          | Register a new user              | No        |
| `POST` | `/login`             | Log in an existing user          | No        |
| `GET`  | `/me`                | Get current user details         | Yes       |
| `POST` | `/verify`            | Verify the current auth token    | Yes       |
| `POST` | `/logout`            | Logout user                      | Yes       |
| `POST` | `/refresh`           | Refresh authentication token     | Yes       |

### PDF Management (`/api/pdf`)

| Method  | Endpoint            | Description                      | Protected |
| :------ | :------------------ | :------------------------------- | :-------- |
| `POST`  | `/upload`           | Upload a new PDF file            | Yes       |
| `GET`   | `/list`             | Get a list of the user's PDFs    | Yes       |
| `GET`   | `/stats`            | Get PDF statistics               | Yes       |
| `GET`   | `/:uuid`            | Download a specific PDF file     | Yes       |
| `GET`   | `/:uuid/metadata`   | Get PDF metadata                 | Yes       |
| `DELETE`| `/:uuid`            | Delete a PDF and its data        | Yes       |
| `PATCH` | `/:uuid/rename`     | Rename a PDF file                | Yes       |

### Highlights (`/api/highlights`)

| Method  | Endpoint            | Description                      | Protected |
| :------ | :------------------ | :------------------------------- | :-------- |
| `POST`  | `/`                 | Create a new highlight           | Yes       |
| `GET`   | `/`                 | Get all user highlights          | Yes       |
| `GET`   | `/stats`            | Get highlight statistics         | Yes       |
| `GET`   | `/pdf/:pdfUuid`     | Get all highlights for a PDF     | Yes       |
| `GET`   | `/:uuid`            | Get a specific highlight         | Yes       |
| `PATCH` | `/:uuid`            | Update an existing highlight     | Yes       |
| `DELETE`| `/:uuid`            | Delete a specific highlight      | Yes       |
| `POST`  | `/bulk-delete`      | Delete multiple highlights       | Yes       |

### Drawings (`/api/drawings`)

| Method  | Endpoint                      | Description                      | Protected |
| :------ | :---------------------------- | :------------------------------- | :-------- |
| `POST`  | `/`                           | Create a new drawing             | Yes       |
| `GET`   | `/`                           | Get all user drawings            | Yes       |
| `GET`   | `/pdf/:pdfUuid`               | Get all drawings for a PDF       | Yes       |
| `GET`   | `/pdf/:pdfUuid/page/:pageNumber` | Get drawings for specific page | Yes       |
| `PATCH` | `/:uuid`                      | Update an existing drawing       | Yes       |
| `DELETE`| `/:uuid`                      | Delete a specific drawing        | Yes       |
| `DELETE`| `/pdf/:pdfUuid`               | Delete all drawings for a PDF    | Yes       |

### Search (`/api/search`)

| Method | Endpoint                | Description                         | Protected |
| :----- | :---------------------- | :---------------------------------- | :-------- |
| `GET`  | `/search`               | Perform a basic text search         | Yes       |
| `POST` | `/advanced-search`      | Perform advanced search             | Yes       |
| `GET`  | `/suggestions`          | Get search suggestions              | Yes       |
| `POST` | `/index-pdf/:uuid`      | Index a PDF for searching           | Yes       |

### Cloud Storage (`/api/cloud-storage`)

| Method | Endpoint                | Description                         | Protected |
| :----- | :---------------------- | :---------------------------------- | :-------- |
| `GET`  | `/auth/url`             | Get Google Drive auth URL           | Yes       |
| `GET`  | `/auth/callback`        | Handle OAuth callback               | No        |
| `GET`  | `/user-pdfs`            | Get user's cloud PDFs               | Yes       |
| `POST` | `/upload/:pdfUuid`      | Upload a PDF to Google Drive        | Yes       |
| `POST` | `/import`               | Import a PDF from Google Drive      | Yes       |
| `GET`  | `/files`                | List files in the user's Drive      | Yes       |
| `GET`  | `/files/:pdfUuid`       | Get cloud files for specific PDF    | Yes       |
| `POST` | `/share/:cloudFileUuid` | Create shareable link               | Yes       |
| `DELETE`|`/files/:cloudFileUuid`| Delete a file from Google Drive     | Yes       |

### Health Check

| Method | Endpoint    | Description         | Protected |
| :----- | :---------- | :------------------ | :-------- |
| `GET`  | `/health`   | Server health check | No        |

---

## 📁 Key Data Models

### User
- `_id`: MongoDB ObjectId
- `email`: String (unique)
- `password`: String (hashed)
- `name`: String
- `createdAt`: Date

### PDF
- `uuid`: String (unique identifier)
- `filename`: String
- `originalName`: String
- `userId`: ObjectId (reference to User)
- `filePath`: String
- `fileSize`: Number
- `createdAt`: Date

### Highlight
- `uuid`: String (unique identifier)
- `pdfUuid`: String (reference to PDF)
- `userId`: ObjectId (reference to User)
- `pageNumber`: Number
- `text`: String (highlighted text)
- `position`: Object (coordinates/bounding box)
- `color`: String
- `createdAt`: Date

### Drawing
- `uuid`: String (unique identifier)
- `pdfUuid`: String (reference to PDF)
- `userId`: ObjectId (reference to User)
- `pageNumber`: Number
- `drawingData`: Object (path/stroke data)
- `createdAt`: Date

---

## 🔧 Configuration

### Environment Variables

#### Backend
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/pdf-annotator
JWT_SECRET=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000

# Google Drive Integration (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/cloud-storage/auth/callback
```

#### Frontend
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

### MongoDB Setup

#### Local MongoDB
1. Install MongoDB Community Edition
2. Start MongoDB service: `mongod`
3. Database will be created automatically when the application starts

#### MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string and update `MONGODB_URI`

### Google Drive Integration Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API
4. Create OAuth 2.0 credentials
5. Add your redirect URI: `http://localhost:5000/api/cloud-storage/auth/callback`
6. Copy Client ID and Client Secret to your `.env` file

---

## 🚀 Deployment

### Backend Deployment
1. Set production environment variables
2. Update CORS origin to your frontend domain
3. Use a process manager like PM2
4. Set up reverse proxy with Nginx

### Frontend Deployment
1. Build the production version: `npm run build`
2. Deploy to platforms like Netlify, Vercel, or serve with Nginx
3. Update `REACT_APP_API_URL` to your backend URL

---

## 🤝 Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🛠️ Troubleshooting

### Common Issues

**MongoDB Connection Error**
- Ensure MongoDB is running locally or check your Atlas connection string
- Verify network access and authentication credentials

**PDF Upload Failed**
- Check file size limits (default: 50MB)
- Ensure uploads directory exists and has write permissions
- Verify CORS settings for file uploads

**Google Drive Integration Not Working**
- Verify OAuth credentials and redirect URI
- Check API quotas and enable Google Drive API
- Ensure proper scopes are requested

**Frontend Build Issues**
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for port conflicts

---

## 📧 Support

For questions, issues, or contributions, please:
- Open an issue on GitHub
- Contact the development team
- Check the documentation and troubleshooting guide

---

## 🙏 Acknowledgments

- [PDF.js](https://mozilla.github.io/pdf.js/) for PDF rendering
- [React-PDF](https://github.com/wojtekmaj/react-pdf) for React PDF integration
- [Multer](https://github.com/expressjs/multer) for file upload handling
- [Mongoose](https://mongoosejs.com/) for MongoDB object modeling
