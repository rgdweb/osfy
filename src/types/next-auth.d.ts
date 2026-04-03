import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      lojaId?: string
      tipo?: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    lojaId?: string
    tipo?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    lojaId?: string
    tipo?: string
  }
}
