import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "../lib/auth";

type Props = {
  children: React.ReactNode;
};

/** Redirects to /login when there is no JWT in memory/localStorage. */
export function ProtectedRoute({ children }: Props) {
  const location = useLocation();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
