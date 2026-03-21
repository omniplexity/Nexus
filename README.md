<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

# ✨ Nexus

### Intelligent AI Chat with Autonomous Cognition

_A full-stack AI chat application featuring advanced cognitive capabilities — planning, memory, retrieval, reflection, and tool execution — running entirely on your local machine._

[![License: MIT](https://img.shields.io/badge/License-MIT-%23FF6B6B.svg?style=flat-square)](#license)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&style=flat-square)](#)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react&style=flat-square)](#)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&style=flat-square)](#)
[![Express](https://img.shields.io/badge/Express-4.x-%23000000?logo=express&style=flat-square)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql&style=flat-square)](#)
[![Docker](https://img.shields.io/badge/Docker-24+-2496ED?logo=docker&style=flat-square)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwind-css&style=flat-square)](#)

</div>

---

## 🚀 Features

<div align="center">

| 🤖 AI Chat | 🧠 Cognition | 🔐 Security | 💻 Developer Experience |
|:----------:|:------------:|:-----------:|:-----------------------:|
| Real-time streaming responses | Autonomous planning & reasoning | JWT authentication | Docker Compose deployment |
| Model selection via LM Studio | Persistent memory system | bcrypt password hashing | Hot module replacement |
| Chat history & persistence | Semantic retrieval | Rate limiting (Redis) | Circuit breaker pattern |
| Dark/Light theme support | Self-reflection & revision | CSRF protection | Retry with exponential backoff |

</div>

### 🧠 Cognition System

Nexus implements a sophisticated cognitive architecture that enables autonomous reasoning:

| Component | Description |
|-----------|-------------|
| **📝 Planner** | Breaks complex tasks into executable sub-tasks |
| **🧠 Memory** | Maintains conversation history with summarization |
| **🔍 Retrieval** | Semantic search through past conversations |
| **💭 Reflection** | Self-critique and response revision |
| **🛠️ Tools** | Built-in tools for math, time, and system operations |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Nexus Architecture                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐   │
│   │   Frontend   │────▶│   Backend    │────▶│     LM Studio       │   │
│   │   (React)    │     │  (Express)   │     │  (Local AI Models)   │   │
│   └──────────────┘     └──────────────┘     └──────────────────────┘   │
│          │                    │                                               │
│          │              ┌─────┴─────┐                                       │
│          │              │           │                                       │
│          │         ┌────▼────┐  ┌───▼────┐                                  │
│          │         │PostgreSQL│  │ Redis  │                                  │
│          │         │ Database │  │ Cache  │                                  │
│          │         └──────────┘  └────────┘                                  │
│          │                                                                   │
│   ┌──────▼──────┐                                                           │
│   │   Zustand   │                                                           │
│   │    Store    │                                                           │
│   └─────────────┘                                                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| [React 18](https://react.dev/) | UI framework with concurrent rendering |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Vite](https://vitejs.dev/) | Next-generation build tool |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS framework |
| [Zustand](https://github.com/pmndrs/zustand) | Lightweight state management |
| [React Router](https://reactrouter.com/) | Client-side routing |

### Backend

| Technology | Purpose |
|------------|---------|
| [Node.js 20](https://nodejs.org/) | JavaScript runtime |
| [Express](https://expressjs.com/) | Web application framework |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [PostgreSQL](https://www.postgresql.org/) | Primary database |
| [JWT](https://jwt.io/) | Secure authentication |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | Password hashing |
| [Redis](https://redis.io/) | Rate limiting & caching |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| [Docker](https://www.docker.com/) | Container platform |
| [LM Studio](https://lmstudio.ai/) | Local AI model inference |

---

## ⚡ Quick Start

### Prerequisites

| Tool | Version | Installation |
|------|---------|--------------|
| Node.js | 20.x+ | [nodejs.org](https://nodejs.org/) |
| Docker | 24.x+ | [docker.com](https://www.docker.com/) |
| LM Studio | Latest | [lmstudio.ai](https://lmstudio.ai/) |
| PostgreSQL | 15+ | [postgresql.org](https://www.postgresql.org/download/) |

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/nexus.git
cd nexus
```

### 2. Configure Environment

Create the required environment files:

```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env
```

### 3. Start with Docker Compose

```bash
# Production
docker-compose up -d

# Development (with hot reload)
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Access the Application

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:5173](http://localhost:5173) |
| Backend API | [http://localhost:3001](http://localhost:3001) |

---

## 🔧 Manual Setup

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run in development mode
npm run dev

# Or build and run for production
npm run build
npm start
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run in development mode
npm run dev

# Build for production
npm run build
npm run preview
```

### LM Studio Setup

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Open LM Studio and download your preferred model
3. Start the local server (default: `http://localhost:1234`)
4. Select the model in Nexus' model selector

---

## ⚙️ Environment Variables

### Backend Variables

| Variable | Default | Required | Description |
|----------|---------|:--------:|-------------|
| `PORT` | `3001` | No | Server port number |
| `NODE_ENV` | `development` | No | Environment (development/production) |
| `DATABASE_URL` | — | ✅ | PostgreSQL connection string |
| `REDIS_URL` | — | ❌ | Redis connection string (optional) |
| `JWT_SECRET` | — | ✅ | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | `24h` | No | JWT token expiration |
| `LM_STUDIO_URL` | `http://localhost:1234` | No | LM Studio API endpoint |
| `RATE_LIMIT_WINDOW_MS` | `60000` | No | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | No | Max requests per window |

### Frontend Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | Backend API URL |
| `VITE_WS_URL` | `ws://localhost:3001` | WebSocket URL (for streaming) |

---

## 📚 API Overview

### Authentication Endpoints

| Method | Endpoint | Description |
|:------:|-----------|-------------|
| `POST` | `/api/auth/register` | Create a new user account |
| `POST` | `/api/auth/login` | Authenticate and receive JWT |
| `POST` | `/api/auth/logout` | Invalidate current session |
| `GET` | `/api/auth/verify` | Verify JWT token validity |

### Chat Endpoints

| Method | Endpoint | Description |
|:------:|-----------|-------------|
| `GET` | `/api/chats` | List all conversations |
| `POST` | `/api/chats` | Create a new conversation |
| `GET` | `/api/chats/:id` | Get conversation messages |
| `PATCH` | `/api/chats/:id` | Rename conversation |
| `DELETE` | `/api/chats/:id` | Delete conversation |
| `POST` | `/api/chats/:id/messages` | Send message (streaming) |

### Model Endpoints

| Method | Endpoint | Description |
|:------:|-----------|-------------|
| `GET` | `/api/models` | List available models |
| `GET` | `/api/models/:id` | Get model details |
| `POST` | `/api/models/:id/load` | Load model into memory |
| `POST` | `/api/models/:id/unload` | Unload model from memory |

### Dashboard Endpoints

| Method | Endpoint | Description |
|:------:|-----------|-------------|
| `GET` | `/api/dashboard/status` | System status |
| `GET` | `/api/dashboard/config` | Application configuration |
| `POST` | `/api/dashboard/config` | Update configuration |
| `GET` | `/api/dashboard/stats` | Usage statistics |

> 📖 **Full API Documentation**: See [`backend/src/routes/README.md`](backend/src/routes/README.md)

---

## 📁 Project Structure

```
nexus/
├── backend/                          # Express.js API server
│   ├── src/
│   │   ├── cognition/               # 🤖 Cognitive processing
│   │   │   ├── context/             #   Context building & compression
│   │   │   ├── memory/              #   Persistent memory management
│   │   │   ├── pipeline/            #   Processing pipeline
│   │   │   ├── planning/            #   Task planning
│   │   │   ├── reflection/          #   Self-reflection & revision
│   │   │   ├── retrieval/           #   Semantic retrieval
│   │   │   └── tools/               #   Tool execution
│   │   ├── db/                       #   Database layer
│   │   ├── errors/                  #   Error handling
│   │   ├── lib/                      #   Utilities
│   │   ├── middleware/               #   Express middleware
│   │   ├── routes/                   #   API endpoints
│   │   ├── services/                 #   Business logic
│   │   └── types/                    #   TypeScript definitions
│   ├── tests/                        #   Unit & integration tests
│   └── package.json
│
├── frontend/                         # React application
│   ├── src/
│   │   ├── components/              #   UI components
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ...
│   │   ├── pages/                   #   Route pages
│   │   │   └── Dashboard.tsx
│   │   ├── services/                #   API client
│   │   ├── stores/                  #   Zustand state
│   │   └── types/                    #   TypeScript definitions
│   ├── tests/                       #   E2E tests (Playwright)
│   └── package.json
│
├── plans/                            # Project planning docs
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_ROADMAP.md
│   └── UI_UPGRADE_PLAN.md
│
├── docker-compose.yml               # Production compose
├── docker-compose.dev.yml           # Development compose
├── package.json                     # Root workspace config
└── README.md                        # This file
```

---

## 🔒 Security

Nexus implements multiple layers of security:

| Feature | Implementation |
|---------|----------------|
| **Authentication** | JWT tokens with HTTP-only cookies |
| **Password Storage** | bcrypt with salt rounds |
| **Rate Limiting** | Redis-backed with in-memory fallback |
| **Input Validation** | Zod schema validation |
| **API Security** | Helmet.js headers, CORS configuration |
| **Error Handling** | Safe error messages, no stack traces in production |
| **Circuit Breaker** | Prevents cascade failures from LM Studio |

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report

# Frontend tests
cd ../frontend
npm test             # Run Playwright tests
```

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

> 📋 For detailed guidelines, see [`CONTRIBUTING.md`](CONTRIBUTING.md)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Nexus AI Chat

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

<div align="center">

| | |
|:--|:--|
| **[LM Studio](https://lmstudio.ai/)** | Local AI model inference |
| **[React](https://react.dev/)** | UI framework |
| **[Express](https://expressjs.com/)** | Web framework |
| **[PostgreSQL](https://www.postgresql.org/)** | Database |
| **[Tailwind CSS](https://tailwindcss.com/)** | Styling |

**Built with ❤️ for the local AI community**

</div>

---

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/yourusername/nexus?style=social)](https://github.com/yourusername/nexus/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/nexus?style=social)](https://github.com/yourusername/nexus/network)
[![GitHub issues](https://img.shields.io/github/issues/yourusername/nexus?style=social)](https://github.com/yourusername/nexus/issues)

</div>

<!-- markdownlint-enable MD033 MD041 -->
