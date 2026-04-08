# Authentication Tests

This directory contains Playwright end-to-end tests for the POS application's authentication system, focusing on login and registration flows.

## Test Files

- `auth_flow.spec.ts` - Comprehensive authentication tests including:
  - Organization registration
  - User login with credentials and PIN
  - Error handling and validation
  - Rate limiting and security features

## Running Tests

### Prerequisites

1. Ensure the application is properly set up with all dependencies installed
2. Playwright browsers must be installed:
   ```bash
   npx playwright install
   ```

### Running All Tests

```bash
npm test
```

### Running Authentication Tests Only

```bash
npm run test:auth
```

### Running Tests with UI Mode

```bash
npm run test:ui
```

### Running Tests in Headed Mode (visible browser)

```bash
npm run test:headed
```

### Debug Mode

```bash
npm run test:debug
```

## Test Scenarios Covered

### Registration Tests
- ✅ Successful organization registration
- ✅ Password mismatch validation
- ✅ Password length validation
- ✅ Required field validation
- ✅ Email format validation
- ✅ Loading state handling

### Login Tests
- ✅ Valid credentials login flow
- ✅ Invalid credentials error handling
- ✅ PIN authentication
- ✅ Invalid PIN error handling
- ✅ PIN attempt limits and lockout
- ✅ Organization switching
- ✅ Forgot password navigation

### Security Tests
- ✅ Rate limiting for PIN attempts
- ✅ Lockout mechanism after failed attempts
- ✅ Input validation and sanitization

## Configuration

Tests are configured in `playwright.config.ts` with:
- Base URL: `http://localhost:3000`
- Automatic dev server startup
- Chromium browser by default
- HTML reporting
- Trace collection on failures

## Test Data

Tests use dynamic test data to avoid conflicts:
- Unique organization names and emails for each test
- Default PIN: `1234`
- Default password: `password123`

## Troubleshooting

### Common Issues

1. **Tests failing due to existing data**: Tests clear localStorage before each run
2. **Slow test execution**: Ensure your machine has sufficient resources
3. **Browser not found**: Run `npx playwright install` to install browsers
4. **Port conflicts**: Ensure port 3000 is available

### Debugging

- Use `--debug` flag for step-by-step execution
- Use `--headed` to see browser actions
- Check HTML reports in `playwright-report/` directory
- Enable traces for detailed failure analysis

## CI/CD Integration

For CI/CD pipelines, add the following to your workflow:

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run Authentication Tests
  run: npm run test:auth
```