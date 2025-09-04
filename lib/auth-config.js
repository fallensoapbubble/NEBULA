import GitHubProvider from 'next-auth/providers/github';

/**
 * NextAuth configuration options for GitHub OAuth
 */
export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || 'dummy-client-id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'dummy-client-secret',
      authorization: {
        params: {
          scope: 'public_repo repo user:email',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Persist the OAuth access_token to the token right after signin
      if (account && user) {
        token.accessToken = account.access_token;
        // Ensure user has required properties
        token.user = {
          id: user.id || user.sub,
          login: user.login || user.name,
          name: user.name,
          email: user.email,
          image: user.image || user.avatar_url,
          html_url: user.html_url || user.profile_url,
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken;
      
      // Ensure we have a valid user object
      if (token.user && session.user) {
        session.user = {
          ...session.user,
          ...token.user,
        };
      } else if (token.user) {
        session.user = token.user;
      } else if (!session.user) {
        // If no user data is available, return null session
        return null;
      }
      
      return session;
    },
  },
  pages: {
    error: '/auth/error',
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-development',
  debug: process.env.NODE_ENV === 'development',
};