# Cloud Drive Monorepo

A modern, production-ready monorepo for Cloud Drive application built with Vite, React, and Node.js.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Start specific apps
npm run web:dev      # Web app (http://localhost:3000)
npm run server:dev   # Server
```

## 📦 Project Structure

```
cloud-drive/
├── apps/
│   ├── web/              # React web application (Vite)
│   └── server/           # Node.js backend server
├── shared/
│   ├── components/       # Shared React components (@shared-components)
│   ├── eslint-config/    # ESLint configurations
│   └── js-config/        # JavaScript/TypeScript configurations
```

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 7
- **Backend**: Node.js (ES Modules)
- **Monorepo**: npm workspaces, Turbo
- **Code Quality**: ESLint 9, Prettier, Husky
- **Type Checking**: JSConfig with strict checking

## 📋 Available Scripts

### Development

- `npm run dev` - Start all development servers
- `npm run web:dev` - Start web app only
- `npm run server:dev` - Start server only

### Code Quality

- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run type checking

### Build

- `npm run build` - Build all packages for production

## 🎯 Code Quality

This project enforces strict code quality standards:

### Automated Checks

- ✅ **ESLint** - Catches errors, enforces best practices
- ✅ **Prettier** - Consistent code formatting
- ✅ **Type Checking** - JavaScript type validation
- ✅ **Pre-commit Hooks** - Automatic linting and formatting

### Key Rules

- No `var` declarations (use `let`/`const`)
- No unused variables or imports
- Strict import ordering
- React Hooks compliance
- Accessibility (a11y) standards

## 🔧 Configuration

### Import Aliases

```javascript
// Shared components
import Button from "@shared-components/button/Button";

// App-specific
import Component from "@/components/Component";
```

### VS Code Setup

Install recommended extensions when prompted. The workspace is pre-configured for optimal development experience.

## 📚 Documentation

- [Contributing Guide](./CONTRIBUTING.md) - Development workflow and guidelines
- [Code Style Guide](./CONTRIBUTING.md#code-style-guide) - Coding standards

## 🤝 Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details on our code of conduct and development process.

## 📄 License

ISC
