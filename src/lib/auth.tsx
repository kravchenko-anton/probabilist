import { useGoalsStore } from "@/lib/goals-store"
import { supabase } from "@/lib/supabase"
import { useTasksStore } from "@/lib/tasks-store"
import type { Session, User } from "@supabase/supabase-js"
import {
	createContext,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from "react"

type AuthContextValue = {
	session: Session | null
	user: User | null
	loading: boolean
	dataReady: boolean
	signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function hydrateStores() {
	await Promise.all([
		useTasksStore.getState().hydrate(),
		useGoalsStore.getState().hydrate(),
	])
}

function resetStores() {
	useTasksStore.getState().reset()
	useGoalsStore.getState().reset()
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Session | null>(null)
	const [loading, setLoading] = useState(true)
	const [dataReady, setDataReady] = useState(false)

	useEffect(() => {
		let mounted = true

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, nextSession) => {
			if (!mounted) return
			setSession(nextSession)

			if (!nextSession) {
				resetStores()
				setDataReady(false)
				setLoading(false)
				return
			}

			// Defer Supabase data calls — awaiting inside this callback can deadlock
			// the auth client lock.
			if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
				setDataReady(false)
				setTimeout(() => {
					void (async () => {
						await hydrateStores()
						if (!mounted) return
						setDataReady(true)
						setLoading(false)
					})()
				}, 0)
				return
			}

			setLoading(false)
		})

		return () => {
			mounted = false
			subscription.unsubscribe()
		}
	}, [])

	async function signOut() {
		resetStores()
		setDataReady(false)
		await supabase.auth.signOut()
	}

	return (
		<AuthContext.Provider
			value={{
				session,
				user: session?.user ?? null,
				loading,
				dataReady,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const value = useContext(AuthContext)
	if (!value) {
		throw new Error("useAuth must be used within AuthProvider")
	}
	return value
}
