import { useAuth } from "@/lib/auth"
import { Navigate, Outlet, useLocation } from "react-router-dom"

export function RequireAuth() {
	const { session, loading } = useAuth()
	const location = useLocation()

	if (loading) {
		return (
			<div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
				Loading…
			</div>
		)
	}

	if (!session) {
		return <Navigate to="/login" replace state={{ from: location }} />
	}

	return <Outlet />
}
