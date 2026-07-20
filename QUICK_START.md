# Quick Start Guide - AI Awards for Creativity Recognition

## 🚀 Getting Started in 5 Minutes

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 12+
- Redis 6+

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Copy the template
cp .env.template .env

# Edit .env with your settings
# CRITICAL: At minimum, configure:
# - DATABASE_URL
# - REDIS_URL
# - JIRA_BASE_URL and JIRA_API_TOKEN
# - GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_API_KEY
```

### Step 3: Set Up Databases
```bash
# PostgreSQL
createdb ai_awards_db

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### Step 4: Start Development Server
```bash
npm run dev
```

Visit: http://localhost:3000/health

## 📋 Common Commands

### Development
```bash
npm run dev         # Start dev server
npm run lint        # Check code quality
npm run lint:fix    # Fix linting issues
npm run format      # Format code
```

### Testing
```bash
npm run test        # Run all tests
npm run test:watch  # Watch mode
npm run test:pbt    # Property-based tests
```

### Production
```bash
npm run build       # Build TypeScript
npm start           # Start server
```

## 🔧 Project Structure

```
src/
├── index.ts              # Application entry point
├── config/
│   └── environment.ts    # Configuration management
├── types/                # TypeScript definitions (create)
├── models/               # Data models (create)
├── services/             # Business logic (create)
├── repositories/         # Data access (create)
├── api/                  # Routes (create)
├── middleware/           # Middleware (create)
└── utils/
    └── logger.ts         # Logging utility
```

## 🗂️ Configuration Files

| File | Purpose |
|------|---------|
| `.env.template` | Environment variables template |
| `.eslintrc.json` | Code style rules |
| `.prettierrc.json` | Code formatting |
| `tsconfig.json` | TypeScript settings |
| `vitest.config.ts` | Test configuration |
| `.npmrc` | NPM settings |

## 📊 Key Features Configured

✅ **Express.js** - Web framework  
✅ **PostgreSQL** - Data persistence  
✅ **Redis** - Caching layer  
✅ **Google Cloud Vision API** - AI evaluation  
✅ **TypeScript** - Type safety  
✅ **ESLint** - Code quality  
✅ **Prettier** - Code formatting  
✅ **Vitest** - Testing framework  
✅ **Property-based Testing** - Universal properties  

## 🐛 Troubleshooting

### npm install fails
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### PostgreSQL connection error
```bash
# Verify connection string in .env
psql "postgresql://user:password@localhost:5432/ai_awards_db"

# Check PostgreSQL is running
pg_isready -h localhost -p 5432
```

### Redis connection error
```bash
# Verify Redis is running
redis-cli ping

# Start Redis if needed
redis-server
# Or with Homebrew: brew services start redis
```

### Linting/Formatting errors
```bash
# Auto-fix most issues
npm run lint:fix
npm run format
```

## 📚 Documentation

- **SETUP_GUIDE.md** - Comprehensive setup instructions
- **TASK_1_1_COMPLETION_SUMMARY.md** - Full task details
- **TASK_1_1_CHECKLIST.md** - Implementation checklist

## 🔐 Security Notes

1. **Never commit `.env`** - It contains secrets
   - `.env.template` is safe to commit
   - `.env` is in `.gitignore`

2. **Protect API keys** - Store in `.env`, not in code

3. **Use strong passwords** - Database and Redis

4. **Review JWT_SECRET** - Change from default in production

## 🎯 Next Steps

1. **Task 1.2**: Create database schemas
   ```
   Define PostgreSQL tables and indexes
   ```

2. **Task 1.3**: Define TypeScript types
   ```
   Create type definitions and interfaces
   ```

3. **Task 2.1**: Implement Jira API client
   ```
   Build submission detection service
   ```

## 📞 Support

For detailed configuration instructions, see `.env.template` comments.

For setup issues, refer to SETUP_GUIDE.md troubleshooting section.

---

**Project Status**: ✅ Ready to develop

**Next Task**: Task 1.2 - Database Schema Creation
