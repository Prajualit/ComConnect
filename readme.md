
# ✨ **COMCONNECT** ✨  
## 🏆 *An Event Organizing Application*  

## 📌 Project Overview
This is a **scalable, real-time workspace collaboration and event tracking system** built with **MariaDB, MongoDB, Redis, Kafka, WebSockets, Firebase**, and **Dockerized microservices**.  

### **Key Features**
- ✅ **Real-time chat** via WebSockets
- ✅ **Workspace management** with granular roles
- ✅ **Task tracking** integrated with MongoDB
- ✅ **Geolocation tracking** for event organizers
- ✅ **Job fetching** via Google Auth & Gmail API
- ✅ **Event streaming** with Kafka
- ✅ **High Availability & Scalability** using Docker

- ## 🚀 Live Demo  
🔗 **Check out the deployed application here:** [Com Connect](https://com-connect.vercel.app/)  

🔥 Experience real-time collaboration, seamless chat, and powerful workspace management right in your browser!  


---

## 🏗 High-Level Architecture

### **📌 System Architecture Diagram**
```
                           ┌──────────────────────────┐
                           │     Frontend (React)     │
                           └──────────┬──────────────┘
                                      │
                ┌───────────────────────────────────────┐
                │          Backend (Node.js)           │
                └──────────┬───────────────┬──────────┘
                           │               │
        ┌─────────────────┴───┐     ┌──────┴─────────────┐
        │    MariaDB (SQL)    │     │   MongoDB (NoSQL)  │
        └─────────────────────┘     └────────────────────┘
                           │
        ┌─────────────────┴──────────────────┐
        │           Redis (Elasticache)      │
        └────────────────────────────────────┘
                           │
        ┌─────────────────┴──────────────────┐
        │       Kafka + Zookeeper (EC2)      │
        └────────────────────────────────────┘
                           │
        ┌─────────────────┴──────────────────┐
        │       WebSockets                   │
        └────────────────────────────────────┘
```

---

## 🏛 Database Design
The system uses **MariaDB for relational data** and **MongoDB for real-time operations**.  
**MariaDB** ensures **ACID compliance**, while **MongoDB** supports **flexible, fast data access**.

### **📌 RDBMS Schema (MariaDB)**
#### **Users Table**
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    profile_pic VARCHAR(255) DEFAULT 'https://icon-library.com/images/anonymous-avatar-icon/anonymous-avatar-icon-25.jpg',
    is_admin BOOLEAN DEFAULT FALSE,
    fcm_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_uuid (uuid)
);
```

#### **Workspaces Table**
```sql
CREATE TABLE workspaces (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    uuid VARCHAR(36) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_uuid (uuid)
);
```

### **📌 ER Diagram**
```
┌──────────────┐       ┌──────────────┐
│   users      │ 1    *│ workspaces   │
└──────────────┘       └──────────────┘
       │                    │
       │ *                * │
       │                    │
┌──────────────┐       ┌──────────────┐
│workspace_roles│ 1    *│workspace_members│
└──────────────┘       └──────────────┘
```

---

## 📉 Low-Level Design
Each microservice is designed for modularity and **separation of concerns**.

### **📌 Microservices Overview**
| Service            | Technology Stack                | Functionality |
|--------------------|--------------------------------|--------------|
| **Auth Service**   | Node.js, JWT, MariaDB          | Handles authentication & authorization |
| **Chat Service**   | Node.js, WebSockets, MongoDB   | Real-time messaging |
| **Geo Service**    | Node.js, WebSockets,           | Tracks organizers in real-time |
| **Job Service**    | Node.js, Gmail API, MongoDB    | Fetches job listings |
| **Notification Service** | Firebase, Kafka ,Redis    | Push notifications & real-time updates |

---

## ⚙️ Tech Stack
| Component           | Technology Used |
|---------------------|----------------|
| **Frontend**       | React, Tailwind |
| **Backend**        | Node.js, Express.js |
| **Database (SQL)** | MariaDB (ACID) |
| **Database (NoSQL)** | MongoDB (Flexible) |
| **Cache**         | Redis (Elasticache) |
| **Message Queue** | Kafka (on EC2) |
| **Real-Time**    | WebSockets |
| **Notifications** | Firebase |
| **Containerization** | Docker |
| **Deployment** | AWS EC2, Elasticache |

---

## 🚀 Deployment Strategy
### **📌 Using Docker Compose**
```yaml
version: "3.9"
services:
  mariadb:
    image: mariadb:latest
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: workspace_db
    ports:
      - "3306:3306"
  
  mongodb:
    image: mongo:latest
    restart: always
    ports:
      - "27017:27017"
  
  redis:
    image: redis:latest
    restart: always
    ports:
      - "6379:6379"

  backend:
    build: .
    restart: always
    depends_on:
      - mariadb
      - mongodb
      - redis
```

---

## 📡 WebSocket Implementation
### **📌 Real-Time Location Tracking**
```js
socket.on('location-update', (data) => {
    console.log(`User ${data.userId} moved to ${data.latitude}, ${data.longitude}`);
    redisClient.set(`location:${data.userId}`, JSON.stringify(data));
});
```

---

## 💻 How to Run Locally
```bash
# Clone the repository
git clone https://github.com/your-repo/workspace-system.git

# Navigate to the project
cd comconnect

# Start services using Docker
1>npm install in frontend , backend directories

using docker : docker-compose up --build 
or 
cd frontend --> npm run start
cd backend --> npm run start

 
```

---



## 📄 License
This project is licensed under **MIT License**.

---

 

