/**
 * Tipo padrão para retorno de Server Actions.
 * Usado com useActionState em forms client.
 */
export type ActionState = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
}

export const INITIAL_ACTION_STATE: ActionState = {
  success: false,
  message: '',
}
