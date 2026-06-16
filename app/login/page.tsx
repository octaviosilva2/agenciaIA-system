'use client'

import { useActionState } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Hexagon } from 'lucide-react'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, { message: '' })

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Hexagon className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">CRM Agência</CardTitle>
          <CardDescription>Entre com suas credenciais</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            {state.message && (
              <p className="text-sm text-red-600 dark:text-red-400" aria-live="polite">
                {state.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
