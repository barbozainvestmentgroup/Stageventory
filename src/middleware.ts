import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inventory/:path*",
    "/projects/:path*",
    "/calendar/:path*",
    "/clients/:path*",
    "/proposals/:path*",
    "/invoicing/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
