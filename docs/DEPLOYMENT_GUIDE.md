# Production Deployment Guide — ProjectShelf

This guide describes how to deploy ProjectShelf to production using Docker Compose on any standard Linux VPS (Ubuntu 22.04 / 24.04 LTS, Debian, or cloud host).

---

## 1. Production Architecture with Docker Compose

```
Internet (Port 80/443)
       |
  [Nginx / Caddy SSL Reverse Proxy]
       |
       +---> Port 3000: Next.js Frontend (Node.js standalone)
                |
                +---> Port 8080: Spring Boot Backend (Internal network)
                         |
                         +---> Port 8000: AI Microservice (Internal network)
                         |
                         +---> Port 3306: MySQL 8.4 (Internal volume)
```

---

## 2. Step-by-Step Production Deployment

### 1. Clone Repository & Setup Environment
```bash
git clone <repo-url> /opt/projectshelf
cd /opt/projectshelf
cp .env.example .env
```
Edit `.env` to configure production passwords, domain names, and external API keys:
```bash
nano .env
```

### 2. Launch Containers
```bash
docker compose up -d --build
```

### 3. Verify Health
Check container logs and health statuses:
```bash
docker compose ps
docker compose logs -f backend
```

---

## 3. Reverse Proxy & SSL Configuration (Nginx Example)

```nginx
server {
    server_name projectshelf.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable SSL using Certbot:
```bash
sudo certbot --nginx -d projectshelf.yourdomain.com
```

