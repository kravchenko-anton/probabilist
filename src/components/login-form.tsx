import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { authRedirectTo, supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Eye, EyeOff, Mail } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

/** Centered auth card adapted from screens/Application/authentication kits. */
export function LoginForm({
	className,
	...props
}: React.ComponentProps<"div">) {
	const navigate = useNavigate()
	const [searchParams, setSearchParams] = useSearchParams()
	const reduceMotion = useReducedMotion()
	const [mode, setMode] = useState<"login" | "signup">("login")
	const [emailStep, setEmailStep] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
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
				navigate("/", { replace: true })
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
				navigate("/", { replace: true })
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

	const variants = {
		visible: { opacity: 1, y: 0 },
		hidden: { opacity: 0, y: reduceMotion ? 0 : 10 },
	}

	const orDivider = (
		<div className="flex items-center gap-4 py-2">
			<Separator className="flex-1" />
			<p className="shrink-0 text-tiny text-default-500">OR</p>
			<Separator className="flex-1" />
		</div>
	)

	return (
		<div
			className={cn(
				"flex w-full max-w-sm flex-col gap-4 rounded-large bg-content1 px-8 pt-6 pb-10 ring-1 ring-foreground/8",
				className,
			)}
			{...props}
		>
			<div className="flex flex-col gap-1">
				<p className="font-logo text-small font-semibold tracking-tight text-foreground">
					loopy
				</p>
				<h1 className="text-lg font-medium text-foreground">
					{mode === "login" ? "Sign in to your account" : "Create an account"}
				</h1>
				<p className="text-small text-default-500">
					{mode === "login"
						? "Run tiny experiments. Predict. Learn what works."
						: "Start tracking goals and experiments."}
				</p>
			</div>

			<AnimatePresence initial={false} mode="popLayout">
				{emailStep ? (
					<motion.div
						key="email-form"
						initial="hidden"
						animate="visible"
						exit="hidden"
						variants={variants}
						transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
						className="flex flex-col gap-3"
					>
						<form className="flex flex-col gap-3" onSubmit={onSubmit}>
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="email"
									className="text-tiny font-medium text-default-600"
								>
									Email Address
								</label>
								<Input
									id="email"
									autoFocus
									type="email"
									autoComplete="email"
									placeholder="Enter your email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="h-11 rounded-large"
								/>
							</div>
							<div className="flex flex-col gap-1.5">
								<label
									htmlFor="password"
									className="text-tiny font-medium text-default-600"
								>
									Password
								</label>
								<div className="relative">
									<Input
										id="password"
										type={showPassword ? "text" : "password"}
										autoComplete={
											mode === "login" ? "current-password" : "new-password"
										}
										placeholder="Enter your password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										minLength={6}
										required
										className="h-11 rounded-large pr-10"
									/>
									<button
										type="button"
										onClick={() => setShowPassword((v) => !v)}
										className="absolute top-1/2 right-2.5 -translate-y-1/2 text-default-400 hover:text-foreground"
										aria-label={
											showPassword ? "Hide password" : "Show password"
										}
									>
										{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>
							</div>

							{error && (
								<p className="text-small text-destructive" role="alert">
									{error}
								</p>
							)}
							{message && (
								<p className="text-small text-default-500" role="status">
									{message}
								</p>
							)}

							<Button
								type="submit"
								disabled={submitting || oauthLoading}
								className="h-11 w-full rounded-large"
							>
								{submitting
									? mode === "login"
										? "Signing in…"
										: "Creating account…"
									: mode === "login"
										? "Sign In"
										: "Sign Up"}
							</Button>
						</form>

						{orDivider}

						<Button
							type="button"
							variant="secondary"
							className="h-11 w-full justify-start gap-2 rounded-large"
							onClick={() => {
								setEmailStep(false)
								setError(null)
								setMessage(null)
							}}
						>
							Other login options
						</Button>
					</motion.div>
				) : (
					<motion.div
						key="options"
						initial="hidden"
						animate="visible"
						exit="hidden"
						variants={variants}
						transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
						className="flex flex-col gap-2"
					>
						{error && (
							<p className="text-small text-destructive" role="alert">
								{error}
							</p>
						)}
						{message && (
							<p className="text-small text-default-500" role="status">
								{message}
							</p>
						)}

						<Button
							type="button"
							className="h-11 w-full gap-2 rounded-large"
							disabled={submitting || oauthLoading}
							onClick={() => setEmailStep(true)}
						>
							<Mail size={18} />
							Continue with Email
						</Button>

						{orDivider}

						<Button
							type="button"
							variant="outline"
							className="h-11 w-full gap-2 rounded-large"
							disabled={submitting || oauthLoading}
							onClick={signInWithGoogle}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								className="size-5"
								aria-hidden
							>
								<path
									d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
									fill="currentColor"
								/>
							</svg>
							{oauthLoading ? "Redirecting to Google…" : "Continue with Google"}
						</Button>

						<p className="mt-3 text-center text-small text-foreground">
							{mode === "login" ? (
								<>
									Need to create an account?{" "}
									<button
										type="button"
										className="text-primary underline-offset-2 hover:underline"
										onClick={() => {
											setMode("signup")
											setEmailStep(true)
											setError(null)
											setMessage(null)
										}}
									>
										Sign Up
									</button>
								</>
							) : (
								<>
									Already have an account?{" "}
									<button
										type="button"
										className="text-primary underline-offset-2 hover:underline"
										onClick={() => {
											setMode("login")
											setError(null)
											setMessage(null)
										}}
									>
										Log In
									</button>
								</>
							)}
						</p>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
