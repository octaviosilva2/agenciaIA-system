'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Compass,
  Target,
  CheckSquare,
  Users,
  Briefcase,
  BarChart3,
  Hammer,
  Wrench,
  DollarSign,
  Receipt,
  Settings,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

/**
 * Constante única de navegação do sistema.
 * Ordem e agrupamento conforme 01-produto.md.
 */
const NAV_GROUPS = [
  {
    items: [
      { title: 'Dashboard', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Estratégia', href: '/estrategia', icon: Compass },
      { title: 'NCT', href: '/nct', icon: Target },
      { title: 'Tarefas', href: '/tarefas', icon: CheckSquare },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { title: 'Contatos', href: '/contatos', icon: Users },
      { title: 'Oportunidades', href: '/oportunidades', icon: Briefcase },
      { title: 'Funil', href: '/funil', icon: BarChart3 },
    ],
  },
  {
    label: 'Operacional',
    items: [
      { title: 'Implementação', href: '/implementacao', icon: Hammer },
      { title: 'Manutenção', href: '/manutencao', icon: Wrench },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { title: 'Visão Geral', href: '/financeiro', icon: DollarSign },
      { title: 'Contas', href: '/financeiro/contas', icon: Receipt },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Config', href: '/config', icon: Settings },
    ],
  },
]

/**
 * Verifica se uma rota está ativa.
 * Rotas raiz (/, /financeiro, /nct) casam exato; demais por prefixo.
 */
function isActive(pathname: string, href: string): boolean {
  // Rotas que devem casar exatamente (raiz ou que têm sub-rotas com paths próprios)
  const exactRoutes = ['/', '/financeiro', '/nct']
  if (exactRoutes.includes(href)) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(href + '/')
}

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white text-sm font-bold">
            IA
          </div>
          <span className="text-lg font-semibold">CRM Agência</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group, i) => (
          <SidebarGroup key={i}>
            {group.label && (
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive(pathname, item.href)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
