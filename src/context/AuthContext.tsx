import { useMutation } from "@tanstack/react-query";
import { UseMutationResult } from "@tanstack/react-query/build/lib/types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import axios, { AxiosResponse } from 'axios';
import { useNavigate } from "react-router";
import { StreamChat } from "stream-chat";

type AuthContext = {
    user?: User
    streamChat?: StreamChat
    signup: UseMutationResult<AxiosResponse, unknown, User>
    login: UseMutationResult<{ token: string, user: User }, unknown, string>
}
type User = {
    id: string
    name: string
    image?: string
}

const Context = createContext<AuthContext | null>(null);

export function useAuth() {
    return useContext(Context) as AuthContext;
}

type AuthProviderProps = {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const navigate = useNavigate()
    const [user, setUser] = useState<User>()
    const [token, setToken] = useState<string>()
    const [streamChat, setStreamChat] = useState<string>()
    const signup = useMutation({
        mutationFn: (user: User) => {
            return axios.post(`${import.meta.env.VITE_SERVER_URL}/signup`, user)
        },
        onSuccess() {
            navigate("/login")
        }
    })
    const login = useMutation({
        mutationFn: (id: string) => {
            return axios
                .post(`${import.meta.env.VITE_SERVER_URL}/login`, { id })
                .then(res => {
                    return res.data as { token: string; user: User }
                })
        },
        onSuccess(data) {
            setUser(data.user)
            setToken(data.token)
        }
    })
    useEffect(() => {
        if (token == null || user == null) return
        const chat = new StreamChat(import.meta.env.VITE_STREAM_API_KEY!)

        if (chat.tokenManager.token === token && chat.userID === user.id) return

        let isInterrupted = false

        const connectPromise = chat.connectUser(user, token).then(() => {
            if (isInterrupted) return
            setStreamChat(chat)
        })
        return () => {
            isInterrupted = true   
            setStreamChat(undefined)

            connectPromise.then(() => {
                chat.disconnectUser()
            })
        }
    }, [token, user])
    return (
        <Context.Provider value={{ signup, login, user , streamChat}}>
            {children}
        </Context.Provider>
    )
}
