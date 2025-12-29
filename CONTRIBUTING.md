# Contributing to RocketRAM

First off, thank you for considering contributing to RocketRAM! It's people like you that make RocketRAM such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs if applicable**
- **List your OS and version (Windows 10/11, macOS version, Linux distro)**
- **Include system information if relevant (CPU, RAM, etc.)**

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the steps**
- **Describe the current behavior and explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**
- **List some other applications where this enhancement exists, if applicable**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code follows the existing style
5. Write a clear commit message
6. Submit the pull request

#### Pull Request Guidelines

- **Update the README.md with details of changes if applicable**
- **Update the CHANGELOG.md with your changes**
- **Follow the existing code style**
- **Add comments to complex logic**
- **Test on Windows 10/11, macOS, and/or Linux as applicable**
- **Ensure all new features work without breaking existing functionality**

## Development Process

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/rocketram.git
   cd rocketram
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Making Changes

1. **Make your changes** in your local repository
2. **Test your changes** thoroughly:
   ```bash
   npm run dev
   ```
3. **Build the application** to ensure it compiles:
   ```bash
   npm run build
   ```

### Code Style

- **JavaScript:** Use ES6+ features
- **Indentation:** 2 spaces (no tabs)
- **Line length:** Keep lines under 100 characters when possible
- **Naming:** Use camelCase for variables and functions, PascalCase for classes
- **Comments:** Add comments for complex logic or non-obvious code
- **Formatting:** Follow existing code style in the project

### Commit Messages

Write clear commit messages that describe what and why:

```
feat: Add dark mode toggle
fix: Resolve memory leak in process list
docs: Update installation instructions
style: Format code according to style guide
refactor: Simplify CPU monitoring logic
test: Add tests for cleanup functionality
chore: Update dependencies
```

### Testing

Before submitting your pull request, please:

- Test on your target platform(s)
- Test new features thoroughly
- Test edge cases
- Ensure no console errors
- Verify UI looks correct
- Test that existing features still work

### Submitting Changes

1. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. **Open a Pull Request** on GitHub
3. **Fill out the PR template** with details about your changes
4. **Wait for review** - maintainers will review your PR

## Project Structure

```
rocketram/
├── main.js           # Electron main process
├── renderer.js       # Renderer process logic
├── index.html        # UI structure
├── styles.css        # Styling
├── package.json      # Dependencies and scripts
└── README.md         # Documentation
```

## Questions?

If you have questions about contributing, please:

- Open an issue for discussion
- Check existing issues and pull requests
- Contact maintainers (see README.md for contact info)

## Recognition

Contributors will be:

- Listed in the README.md (if desired)
- Credited in release notes
- Appreciated by the community!

Thank you for contributing to RocketRAM! 🚀


