# 💬 Real-Time Chat Application

<p align="center">
  <b>Fast • Scalable • Real-time communication powered by WebSockets ⚡</b>
</p>

---

## ✨ Overview

A modern real-time chat application enabling instant messaging using persistent WebSocket connections over TCP.
Built with performance, scalability, and clean UI principles.

---

## 🚀 Features

* ⚡ Real-time messaging
* 🔁 Persistent connection (WebSockets)
* 📎 File & attachment sharing
* 🎤 Voice message support
* 💬 Responsive chat UI

---

## 🖼️ Preview

### 💬 Chat Interface (Sender & Receiver)

```
<img width="1448" height="847" alt="Screenshot 2026-04-20 150630" src="https://github.com/user-attachments/assets/2df6c811-3cfe-4350-8764-97b0cf51ed6a" />
<img width="866" height="461" alt="Screenshot 2026-04-20 150624" src="https://github.com/user-attachments/assets/4fbe9dc2-98e5-43c3-a44f-5c356e82d421" />
---

### ✏️ Message Input Bar

<img width="614" height="81" alt="Screenshot 2026-04-20 152119" src="https://github.com/user-attachments/assets/de0bc324-75fb-492b-b81c-0185e72bb0e1" />


---

### 📎 Attachment UI

<img width="1106" height="350" alt="Screenshot 2026-04-20 150910" src="https://github.com/user-attachments/assets/489e0673-987c-426e-b4db-da4ccad37a40" />


---

### 🎤 Voice Message UI

<img width="1103" height="336" alt="Screenshot 2026-04-20 150617" src="https://github.com/user-attachments/assets/47e80821-5720-47fa-9f6c-d882773ae44d" />


---

## 🧠 How It Works

* Client establishes WebSocket connection
* Server keeps connection open
* Messages are exchanged instantly without polling

---

## ⚙️ Tech Stack

* Frontend: React.js
* Backend: Node.js
* WebSockets: Socket.IO
* Protocol: TCP
* Scaling: Redis (Pub/Sub)

---

## 📦 Installation

```bash id="install123"
git clone https://github.com/your-username/your-repo.git
cd your-repo
npm install
npm start
```

---

## 📊 Architecture

Client ⇄ WebSocket Server ⇄ Redis ⇄ Database

---

## 🔐 Security

* Secure WebSockets (WSS)
* Authentication (JWT)
* Input validation

---

## 🚀 Future Improvements

* Group chats
* Typing indicators
* Read receipts
* Cloud deployment (AWS)

---

## 👨‍💻 Author

**Uday Sharma**

---

<p align="center">
  ⭐ Star this repo if you like it!
</p>
