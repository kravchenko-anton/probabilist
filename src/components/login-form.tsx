import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authRedirectTo, supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const [mode, setMode] = useState<"login" | "signup">("login")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [message, setMessage] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)
	const [oauthLoading, setOauthLoading] = useState(false)

	useEffect(() => {
		const oauthError =
			searchParams.get("error_description") ?? searchParams.get("error")
		if (!oauthError) return
		setError(oauthError.replace(/\+/g, " "))
		const next = new URLSearchParams(searchParams)
		next.delete("error")
		next.delete("error_description")
		next.delete("error_code")
		setSearchParams(next, { replace: true })
	}, [searchParams, setSearchParams])

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setError(null)
		setMessage(null)
		setSubmitting(true)

		try {
			if (mode === "login") {
				const { error: signInError } = await supabase.auth.signInWithPassword({
					email,
					password,
				})
				if (signInError) {
					setError(signInError.message)
					return
				}
				navigate("/inbox", { replace: true })
				return
			}

			const { data, error: signUpError } = await supabase.auth.signUp({
				email,
				password,
			})
			if (signUpError) {
				setError(signUpError.message)
				return
			}

			if (data.session) {
				navigate("/inbox", { replace: true })
				return
			}

			setMessage("Check your email to confirm your account, then log in.")
			setMode("login")
		} finally {
			setSubmitting(false)
		}
	}

	async function signInWithGoogle() {
		setError(null)
		setMessage(null)
		setOauthLoading(true)

		const { error: oauthError } = await supabase.auth.signInWithOAuth({
			provider: "google",
			options: {
				redirectTo: authRedirectTo(),
				queryParams: {
					access_type: "offline",
					prompt: "select_account",
				},
			},
		})

		if (oauthError) {
			setError(oauthError.message)
			setOauthLoading(false)
		}
	}

	return (
		<div className={cn("flex flex-col gap-6", className)} {...props}>
			<Card className="overflow-hidden p-0">
				<CardContent className="grid p-0 md:grid-cols-2">
					<form className="p-6 md:p-8" onSubmit={onSubmit}>
						<FieldGroup>
							<div className="flex flex-col items-center gap-2 text-center">
								<h1 className="text-2xl font-bold">
									{mode === "login" ? "Welcome back" : "Create an account"}
								</h1>
								<p className="text-balance text-muted-foreground">
									{mode === "login"
										? "Log in to loopy"
										: "Sign up to start using loopy"}
								</p>
							</div>
							<Field>
								<FieldLabel htmlFor="email">Email</FieldLabel>
								<Input
									id="email"
									type="email"
									autoComplete="email"
									placeholder="m@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<Input
									id="password"
									type="password"
									autoComplete={
										mode === "login" ? "current-password" : "new-password"
									}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									minLength={6}
									required
								/>
							</Field>
							{error && (
								<p className="text-sm text-destructive" role="alert">
									{error}
								</p>
							)}
							{message && (
								<p className="text-sm text-muted-foreground" role="status">
									{message}
								</p>
							)}
							<Field>
								<Button type="submit" disabled={submitting || oauthLoading}>
									{submitting
										? mode === "login"
											? "Logging in…"
											: "Creating account…"
										: mode === "login"
											? "Login"
											: "Sign up"}
								</Button>
							</Field>
							<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
								Or continue with
							</FieldSeparator>
							<Field>
								<Button
									variant="outline"
									type="button"
									disabled={submitting || oauthLoading}
									onClick={signInWithGoogle}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										className="size-4"
										aria-hidden
									>
										<path
											d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
											fill="currentColor"
										/>
									</svg>
									{oauthLoading ? "Redirecting to Google…" : "Continue with Google"}
								</Button>
							</Field>
							<FieldDescription className="text-center">
								{mode === "login" ? (
									<>
										Don&apos;t have an account?{" "}
										<button
											type="button"
											className="underline underline-offset-2"
											onClick={() => {
												setMode("signup")
												setError(null)
												setMessage(null)
											}}
										>
											Sign up
										</button>
									</>
								) : (
									<>
										Already have an account?{" "}
										<button
											type="button"
											className="underline underline-offset-2"
											onClick={() => {
												setMode("login")
												setError(null)
												setMessage(null)
											}}
										>
											Log in
										</button>
									</>
								)}
							</FieldDescription>
						</FieldGroup>
					</form>
					<div className="relative hidden bg-muted md:block">
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-3  p-8 text-center">
							<p className="font-logo text-3xl font-medium text-white">loopy</p>
							<p className="max-w-xs text-sm text-white/60">
								Goals, experiments, and the habits that stick.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
