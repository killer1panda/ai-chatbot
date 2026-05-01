import Google from "next-auth/providers/google"

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/sign-in",
  },
}