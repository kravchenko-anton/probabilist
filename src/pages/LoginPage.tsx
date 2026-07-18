import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/lib/auth"
import { Navigate } from "react-router-dom"

export function LoginPage() {
	const { session, loading } = useAuth()

	if (loading) {
		return (
			<div className="flex h-dvh w-full items-center justify-center bg-background text-sm text-muted-foreground">
				Loading…
			</div>
		)
	}

	if (session) {
		return <Navigate to="/" replace />
	}

	return (
		<div className="flex min-h-dvh w-full items-center justify-center bg-background p-6 md:p-10">
			<div className="w-full max-w-sm md:max-w-4xl">
				<LoginForm />
			</div>
		</div>
	)
}
