# Environment Variables

This application uses environment variables for configuration. Here's a guide to setting them up:

## Server-Side Variables (Secure)

These variables are only accessible on the server and should be added to your `.env.local` file:

### PHP Integration
\`\`\`
PHP_API_KEY=your-php-api-key-here
PHP_ENDPOINT=http://localhost:8080
\`\`\`

### Database (if using)
\`\`\`
DATABASE_URL=your-database-connection-string
\`\`\`

## Client-Side Variables (Public)

These variables are exposed to the client and should be prefixed with `NEXT_PUBLIC_`:

### API Configuration
\`\`\`
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
NEXT_PUBLIC_ENVIRONMENT=production
\`\`\`

## Development Setup

1. Copy the example environment file:
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

2. Fill in your actual values in `.env.local`

3. Restart your development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## Production Deployment

For Vercel deployment:

1. Add environment variables in your Vercel dashboard
2. Go to Project Settings > Environment Variables
3. Add each variable with appropriate values for your environment

## Security Notes

- Never commit `.env.local` or `.env` files to version control
- Server-side variables (without `NEXT_PUBLIC_` prefix) are secure and not exposed to the client
- Client-side variables (with `NEXT_PUBLIC_` prefix) are bundled with your application and visible to users
- Use server actions or API routes for sensitive operations requiring API keys
