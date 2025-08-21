# AI Painting Generator - Real-Time System

A web application that generates AI paintings based on custom instructions and reference images, with real-time progress tracking and background processing.

## Features

- **Real-time Progress Tracking**: See live updates as paintings are generated
- **Background Processing**: Generation continues even if you close the browser
- **Two-Stage Generation**: 
  1. AI generates unique painting ideas (sequential)
  2. AI creates images based on those ideas (parallel)
- **Reference Image Support**: Use reference images to guide the generation
- **User Authentication**: Secure login/register system
- **Responsive Design**: Works on desktop and mobile devices

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=my_mysql_password
DB_NAME=ai_painting_generator

# Server Configuration
PORT=3000
SERVER_IP=localhost

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here

# JWT Secret
JWT_SECRET=your_jwt_secret_here
```

### 2. Database Setup

1. Create a MySQL database named `ai_painting_generator`
2. The application will automatically create the required tables on startup

### 3. API Keys

You'll need to obtain API keys from:

- **OpenAI**: For image generation using GPT-Image-1 model
  - Sign up at https://platform.openai.com/
  - Get your API key from the dashboard

- **OpenRouter**: For idea generation using Gemini 2.5 Pro
  - Sign up at https://openrouter.ai/
  - Get your API key from the dashboard

### 4. Installation

```bash
# Install dependencies
npm install

# Start the server
npm start

# For development with auto-restart
npm run dev
```

### 5. Usage

1. Open your browser and go to `http://localhost:3000`
2. Register a new account or login
3. Create a title and add custom instructions
4. Upload reference images (optional)
5. Click "Generate Paintings" to start the process
6. Watch real-time progress as ideas are generated and images are created

## How It Works

### Generation Process

1. **Idea Generation**: The system uses OpenRouter (Gemini 2.5 Pro) to generate unique painting ideas based on your title and instructions
2. **Image Creation**: Each idea is then used to generate an actual image using OpenAI's GPT-Image-1 model
3. **Reference Integration**: If reference images are provided, they're used to guide the image generation

### Real-Time Updates

The system uses Server-Sent Events (SSE) to provide real-time updates:

- **Generation Started**: Shows when the process begins
- **Idea Progress**: Shows progress of idea generation
- **Image Processing**: Shows when each image starts processing
- **Completion**: Shows when images are completed or failed

### Background Processing

The generation process runs on the server and continues even if:
- You close the browser
- You navigate away from the page
- You refresh the page

You can always return to see the current status and completed images.

## Technical Details

### Backend Technologies
- Node.js with Express
- MySQL database
- Server-Sent Events for real-time updates
- JWT authentication
- Multer for file uploads

### Frontend Technologies
- Vanilla JavaScript (ES6 modules)
- CSS3 with animations
- HTML5
- Server-Sent Events for real-time updates

### API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/titles` - Get user's titles
- `POST /api/titles` - Create new title
- `POST /api/paintings/generate` - Start painting generation
- `GET /api/paintings/:titleId` - Get paintings for a title
- `GET /api/events/:userId` - SSE endpoint for real-time updates

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MySQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **API Key Errors**
   - Ensure OpenAI and OpenRouter API keys are valid
   - Check API key permissions and quotas

3. **Image Generation Fails**
   - Check OpenAI API quota
   - Verify reference images are valid
   - Check server logs for detailed error messages

4. **Real-time Updates Not Working**
   - Ensure you're logged in
   - Check browser console for SSE connection errors
   - Verify server is running on the correct port

### Logs

Check the server console for detailed logs about:
- Database operations
- API calls to OpenAI and OpenRouter
- Image generation progress
- Error messages

## Security Notes

- Never commit your `.env` file to version control
- Use strong JWT secrets in production
- Implement rate limiting for production use
- Consider using HTTPS in production

## License

This project is for educational and personal use.
