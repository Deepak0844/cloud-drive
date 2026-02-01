## Getting Started

### Prerequisites

- Node.js >= 18
- npm 10.9.4 or later

### Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd cloud-drive

# Install dependencies
npm install

# Start development servers
npm run dev           # All apps
npm run web:dev       # Web app only
npm run server:dev    # Server only
```

## Development Workflow

### Code Quality Standards

This project enforces strict code quality standards through automated tooling:

#### ESLint Rules

- **No `var`**: Use `let` or `const` only
- **No unused variables**: Remove or prefix with `_`
- **No undefined variables**: Import all dependencies
- **Import ordering**: Imports are automatically organized
- **React Hooks**: Follow hooks rules strictly
- **Accessibility**: Follow a11y best practices

#### Prettier Formatting

- **Print width**: 100 characters
- **Semicolons**: Required
- **Quotes**: Double quotes
- **Trailing commas**: ES5 style

### Pre-commit Hooks

Git hooks automatically run before each commit:

1. **ESLint** - Fixes auto-fixable issues
2. **Prettier** - Formats code
3. **Type checking** - Validates JavaScript types

If any checks fail, the commit will be blocked.

### Available Scripts

```bash
# Development
npm run dev                 # Start all dev servers
npm run web:dev            # Start web app only
npm run server:dev         # Start server only

# Code Quality
npm run lint               # Run ESLint on all packages
npm run format             # Format all files with Prettier
npm run format:check       # Check formatting without changes
npm run type-check         # Run type checking

# Build
npm run build              # Build all packages
```

## Project Structure

```
cloud-drive/
├── apps/
│   ├── web/              # Vite + React web application
│   └── server/           # Node.js server
├── shared/
│   ├── components/       # Shared React components
│   ├── eslint-config/    # ESLint configurations
│   └── js-config/        # JavaScript/TypeScript configs
└── .vscode/              # VS Code workspace settings
```

## Code Style Guide

### JavaScript/React

```javascript
// ✅ Good
import { useState } from "react";
import Button from "@shared-components/button/Button";

const MyComponent = () => {
  const [count, setCount] = useState(0);

  return <Button onClick={() => setCount(count + 1)}>Click me</Button>;
};

export default MyComponent;

// ❌ Bad
var count = 0; // Use const or let
import { Button } from "@shared-components"; // Use nested imports
```

### Import Order

Imports are automatically organized in this order:

1. React (always first)
2. External packages
3. Internal packages (`@shared-components`)
4. Relative imports

### Component Structure

```javascript
// Default export for components
export default function ComponentName({ prop1 = "", prop2 = null }) {
  // Component logic
  return <div>...</div>;
}
```

## VS Code Setup

### Recommended Extensions

- ESLint
- Prettier
- Error Lens
- Path Intellisense
- ES7+ React/Redux/React-Native snippets

Install all recommended extensions when prompted by VS Code.

### Settings

The workspace is pre-configured with:

- ESLint auto-fix on save
- Prettier formatting on save
- Type checking enabled
- Import suggestions

## Troubleshooting

### ESLint not showing errors

1. Reload VS Code: `Cmd+Shift+P` → "Developer: Reload Window"
2. Check ESLint output: View → Output → ESLint
3. Verify `eslint.config.js` exists at root

### Prettier not formatting

1. Check `.prettierrc` exists
2. Verify Prettier extension is installed
3. Check file is not in `.prettierignore`

### Pre-commit hook failing

1. Run `npm run lint` to see errors
2. Run `npm run format` to fix formatting
3. Fix remaining errors manually
4. Try commit again

## Questions?

If you have questions or need help, please open an issue on GitHub.
