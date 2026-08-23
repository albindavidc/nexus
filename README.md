<div align="center">
  <img src="../assets/logo/nexus-logo.svg" alt="Nexus Logo" width="200"/>
  <h1>Nexus Frontend Client</h1>
  <p><em>The intuitive and responsive user interface for the Nexus Communication Ecosystem</em></p>
  
  <p>
    <img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white" alt="Sass" />
    <img src="https://img.shields.io/badge/RxJS-B7178C?style=for-the-badge&logo=reactivex&logoColor=white" alt="RxJS" />
    <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="Socket.io Client" />
  </p>
</div>

---

## 📖 Project Overview

The **Nexus Frontend** is a cutting-edge web application designed to provide users with a seamless, real-time communication experience. Built on **Angular 19**, it utilizes an advanced reactive architecture powered by **RxJS** and state-of-the-art WebSockets via **Socket.io**. The application features an aesthetically pleasing, custom design system built with SCSS, prioritizing performance, accessibility, and modern UI/UX principles.

### ✨ Key Features

- **⚡ Real-Time Reactivity:** Instant messaging, typing indicators, and presence updates utilizing Socket.io.
- **🎨 Custom Design System:** A robust SCSS architecture (`design-system.scss`) ensuring consistent, beautiful, and responsive layouts across all devices.
- **🛡️ Secure Authentication Flow:** Integrated JWT-based authentication guards, interceptors, and intuitive login/registration interfaces.
- **🤖 Smart AI Interactions:** Clean and dynamic UI components for interacting with the generative AI chatbot, featuring markdown rendering (`marked`) and HTML sanitization (`dompurify`).
- **📁 Advanced Media Handling:** Drag-and-drop file upload capabilities powered by `filepond` and `ngx-filepond`, complete with type and size validation.
- **🧩 Modular Architecture:** Strongly enforced domain-driven modularity, separating Core, Shared, and Feature modules for unparalleled maintainability.

---

## 🛠️ Tech Stack & Dependencies

- **Framework:** Angular 19 (Standalone Components)
- **Language:** TypeScript
- **Styling:** SCSS (Custom Design System)
- **State & Reactivity:** RxJS
- **Real-Time Communication:** `socket.io-client`
- **Media Uploads:** `filepond`, `ngx-filepond`
- **Markdown & Security:** `marked`, `dompurify`
- **Testing:** Jasmine & Karma
- **Linting:** ESLint & Angular ESLint

---

## 📁 Project Structure

```text
front-end/
├── src/
│   ├── app/
│   │   ├── core/           # Singleton services, interceptors, guards
│   │   ├── shared/         # Reusable UI components, pipes, directives
│   │   ├── features/       # Lazy-loaded domain features
│   │   │   ├── auth/       # Login, Registration views & logic
│   │   │   └── chat/       # Messaging interface, contact list, chatbot UI
│   │   ├── app.config.ts   # Application wide providers & config
│   │   ├── app.routes.ts   # Global route definitions
│   │   └── app.component.* # Root application component
│   ├── assets/             # Static files (images, icons)
│   ├── design-system.scss  # Global design tokens (colors, typography, spacing)
│   └── main.ts             # Application entry point
├── angular.json            # Angular CLI configuration
└── package.json            # Dependencies and scripts
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
Ensure you have the following installed:
- Node.js (v18+)
- Angular CLI (`npm install -g @angular/cli`)

### 2. Clone & Install
```bash
# Navigate to the frontend directory
cd front-end

# Install dependencies
npm install
```

### 3. Environment Configuration
Create or configure the `src/environments/environment.ts` and `environment.development.ts` files with your backend API URL and Socket connection details.

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  socketUrl: 'http://localhost:3000'
};
```

### 4. Running the Application

```bash
# Start the development server (runs on http://localhost:4200)
npm run start

# Build the application for production deployment
npm run build

# Run unit tests
npm run test
```

---

## 👨‍💻 Usage Guidelines

1. **Component Design:** Utilize Standalone components. Maintain a strict separation between Smart (Container) and Dumb (Presentational) components.
2. **Styling:** Always use the variables and mixins defined in `design-system.scss`. Avoid hardcoded colors or spacing values to maintain visual consistency.
3. **State Management:** Use RxJS `BehaviorSubject` for local state and Angular Services for cross-component data sharing.
4. **Code Quality:** Ensure your code passes all linting rules by running `npm run lint` before committing. Follow standard Angular naming conventions.

---
<div align="center">
  <sub>Built with ❤️ for the Nexus Ecosystem</sub>
</div>
