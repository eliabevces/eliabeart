# 🎨 Eliabeart - Personal Gallery API

A modern, high-performance API designed for sharing personal photo galleries with advanced image optimization and backend authentication. This project serves as a comprehensive learning platform for exploring cutting-edge technologies including Redis caching, Celery task queues, Keycloak authentication, and optimized image processing techniques.

## 🎯 Project Purpose

This API was built with three main objectives:

1. **Personal Gallery Sharing**: A robust backend system for managing and sharing personal photo collections
2. **Technology Learning Platform**: Hands-on experience with modern backend technologies and architectural patterns
3. **Image Optimization Research**: Exploring best practices for efficient image storage, processing, and delivery

## 🔐 Authentication & Access

**Important**: This API is **not designed for frontend user authentication**. Instead, it implements a **private authentication flow** using Keycloak for secure backend access control. The system is intended for controlled access to personal galleries rather than public user registration.

## 🛠️ Technologies & Learning Focus

This project incorporates several modern technologies for educational and practical purposes:

### **Backend Framework**
- **FastAPI**: High-performance, async web framework
- **Python 3.12+**: Modern Python with type hints and async support

### **Caching & Performance**
- **Redis**: In-memory data structure store for caching and session management
- **Async operations**: Non-blocking I/O for improved performance

### **Task Queue & Background Processing**
- **Celery**: Distributed task queue for handling image processing
- **Flower**: Web-based tool for monitoring Celery tasks
- **Background image processing**: Async image optimization and metadata extraction

### **Authentication & Authorization**
- **Keycloak**: Enterprise-grade identity and access management
- **JWT tokens**: Secure token-based authentication
- **Private auth flow**: Backend-controlled access without frontend registration

### **Database & ORM**
- **PostgreSQL**: Robust relational database
- **SQLAlchemy**: Modern Python SQL toolkit and ORM
- **Alembic**: Database migration tool

### **Image Processing & Optimization**
- **Pillow (PIL)**: Advanced image processing capabilities
- **BlurHash**: Compact image placeholders for better UX
- **Image metadata extraction**: Width, height, and other properties
- **Optimized file storage**: Efficient image serving strategies

### **Containerization & Deployment**
- **Docker**: Containerized deployment
- **Docker Compose**: Multi-service orchestration
- **Production-ready setup**: Scalable architecture

## 📁 Project Structure

```
eliabeart/
├── api/                          # Main API application
│   ├── src/                      # Source code
│   │   ├── album/               # Album management
│   │   ├── auth/                # Authentication logic
│   │   ├── celery/              # Task queue configuration
│   │   ├── core/                # Core settings and Keycloak
│   │   ├── database/            # Database models and connection
│   │   ├── dependencies/        # Redis and other dependencies
│   │   ├── imagem/              # Image processing and CRUD
│   │   ├── lib/                 # Utility libraries
│   │   └── routes/              # API endpoints
│   ├── alembic/                 # Database migrations
│   ├── imagens/                 # Image storage directory
│   ├── Dockerfile               # Container configuration
│   ├── pyproject.toml           # Python dependencies
│   └── poetry.lock              # Locked dependencies
└── docker-compose.yml           # Service orchestration
```

## 🚀 Features

### **Gallery Management**
- Create and manage photo albums
- Bulk image upload and processing
- Metadata extraction and storage
- Organized file structure

### **Image Optimization**
- Automatic image processing via Celery tasks
- BlurHash generation for smooth loading placeholders
- Dimension extraction and storage
- Optimized file serving

### **Performance & Scalability**
- Redis caching for fast data retrieval
- Async processing for non-blocking operations
- Background task processing
- Containerized deployment ready for scaling

### **Security**
- Keycloak integration for enterprise-grade authentication
- JWT token validation
- Private access control
- Secure API endpoints

## 🔧 Getting Started

### Prerequisites
- Docker and Docker Compose
- Python 3.12+ (for local development)
- PostgreSQL (handled by Docker)
- Redis (handled by Docker)
- Keycloak server (for authentication)

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/eliabevces/eliabeart.git
   cd eliabeart
   ```

2. **Environment Configuration**
   ```bash
   # Create environment file
   cp api/.env.example api/.env
   # Configure your Keycloak, database, and Redis settings
   ```

3. **Start the application**
   ```bash
   # Build and start all services
   docker-compose up --build
   ```

4. **Access the services**
   - API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Flower (Celery monitoring): http://localhost:5555

### Development Setup

1. **Install dependencies**
   ```bash
   cd api
   poetry install
   ```

2. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

3. **Start development server**
   ```bash
   poetry run uvicorn src.main:app --reload
   ```

## 📚 Learning Outcomes

This project demonstrates practical implementation of:

- **Microservices Architecture**: Separation of concerns with specialized services
- **Async Programming**: FastAPI's async capabilities for better performance
- **Task Queues**: Background processing with Celery for time-consuming operations
- **Caching Strategies**: Redis integration for improved response times
- **Authentication Patterns**: Enterprise-grade auth with Keycloak
- **Image Processing**: Efficient handling and optimization of media files
- **Database Design**: Relational modeling with SQLAlchemy
- **Containerization**: Docker best practices for deployment
- **API Design**: RESTful endpoints with comprehensive documentation

## 🔍 API Endpoints

- `GET /` - Welcome message and API info
- `GET /albuns` - List all albums
- `POST /albuns` - Create new album
- `GET /albuns/{id}` - Get specific album
- `GET /images` - List images with filtering
- `POST /images` - Upload new images
- `GET /images/{id}` - Get specific image

Full API documentation available at `/docs` when running the application.

## 🤝 Contributing

This is a personal learning project, but feedback and suggestions are welcome! Feel free to open issues or submit pull requests.

## 📄 License

This project is for educational purposes. Please respect the learning nature of this codebase.

---

**Built with ❤️ for learning and sharing personal memories through technology**
